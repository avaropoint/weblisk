/**
 * WebSocket Management Module for Weblisk
 * Handles WebSocket connections, messaging, and real-time communication
 */

import { logger } from "./logger.ts";
import { security } from "./security.ts";
import type {
  ComponentContext,
  ComponentDefinition,
  ServerEventMessage,
  WebSocketConnection,
  WebliskFramework,
} from "./types.ts";

export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
}

export interface BroadcastOptions {
  includeSessionId?: string;
  excludeSessionId?: string;
  includeConnectionIds?: string[];
  excludeConnectionIds?: string[];
}

export class WebSocketManager {
  private connections = new Map<string, WebSocketConnection>();
  private sessionConnections = new Map<string, Set<string>>(); // sessionId -> connectionIds
  private components = new Map<string, ComponentDefinition>();
  private stats: WebSocketStats = {
    totalConnections: 0,
    activeConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
  };

  /**
   * Handle WebSocket upgrade request
   */
  handleUpgrade(request: Request, sessionId: string): Response {
    const { socket, response } = Deno.upgradeWebSocket(request);
    const connectionId = crypto.randomUUID();

    logger.debug("WebSocket upgrade initiated", { connectionId, sessionId });

    const connection: WebSocketConnection = {
      id: connectionId,
      sessionId,
      socket,
      send: (data: unknown) => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify(data));
            this.stats.messagesSent++;
          } catch (error) {
            logger.error("Failed to send WebSocket message", error as Error, {
              connectionId,
              sessionId,
            });
            this.stats.errors++;
          }
        }
      },
    };

    this.setupConnectionHandlers(connection);
    return response;
  }

  /**
   * Setup event handlers for a WebSocket connection
   */
  private setupConnectionHandlers(connection: WebSocketConnection): void {
    const { socket, id: connectionId, sessionId } = connection;

    socket.onopen = () => {
      this.addConnection(connection);
      logger.info("WebSocket connected", { connectionId, sessionId });

      // Send welcome message with session ID
      connection.send({
        type: "connection-established",
        sessionId,
        connectionId,
        timestamp: new Date().toISOString(),
      });
    };

    socket.onmessage = async (event) => {
      try {
        this.stats.messagesReceived++;
        const message = JSON.parse(event.data) as ServerEventMessage;
        await this.handleMessage(message, connection);
      } catch (error) {
        logger.error("WebSocket message handling failed", error as Error, {
          connectionId,
          sessionId,
          message: event.data,
        });
        this.stats.errors++;

        connection.send({
          type: "error",
          error: "Invalid message format",
          timestamp: new Date().toISOString(),
        });
      }
    };

    socket.onclose = (event) => {
      this.removeConnection(connectionId);
      logger.info("WebSocket disconnected", {
        connectionId,
        sessionId,
        code: event.code,
        reason: event.reason,
      });
    };

    socket.onerror = (event) => {
      this.stats.errors++;
      logger.error("WebSocket error", new Error("WebSocket error occurred"), {
        connectionId,
        sessionId,
        event,
      });
    };
  }

  /**
   * Add a connection to the manager
   */
  private addConnection(connection: WebSocketConnection): void {
    this.connections.set(connection.id, connection);

    // Track session connections
    if (!this.sessionConnections.has(connection.sessionId)) {
      this.sessionConnections.set(connection.sessionId, new Set());
    }
    this.sessionConnections.get(connection.sessionId)!.add(connection.id);

    this.stats.totalConnections++;
    this.stats.activeConnections = this.connections.size;
  }

  /**
   * Remove a connection from the manager
   */
  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.connections.delete(connectionId);

    // Remove from session tracking
    const sessionConnections = this.sessionConnections.get(
      connection.sessionId,
    );
    if (sessionConnections) {
      sessionConnections.delete(connectionId);
      if (sessionConnections.size === 0) {
        this.sessionConnections.delete(connection.sessionId);
      }
    }

    this.stats.activeConnections = this.connections.size;
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(
    message: ServerEventMessage,
    connection: WebSocketConnection,
  ): Promise<void> {
    try {
      // Sanitize input to prevent injection attacks
      const sanitizedMessage = {
        ...message,
        payload: security.sanitizeInput(message.payload),
      };

      let result: unknown;
      let handlerFound = false;

      // Handle component events
      if (
        message.component && message.component !== "route" &&
        message.component !== "app"
      ) {
        const component = this.components.get(message.component);
        if (component?.server) {
          const componentContext: ComponentContext = {
            data: message.payload as Record<string, unknown>,
            events: {},
            framework: {} as WebliskFramework, // Will be injected by framework
          };
          result = await component.server(componentContext);
          handlerFound = true;
        }
      }

      // If no component handler found, delegate to route handler
      if (!handlerFound) {
        // This will be handled by the framework's route system
        // The framework should provide a callback for route message handling
        const routeHandler = this.routeMessageHandler;
        if (routeHandler) {
          result = await routeHandler(sanitizedMessage, connection);
          handlerFound = true;
        }
      }

      if (handlerFound) {
        // Send success response
        connection.send({
          type: "event-result",
          event: message.event,
          success: true,
          result,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Send error for unhandled events
        connection.send({
          type: "event-result",
          event: message.event,
          success: false,
          error: `No handler found for component: ${message.component}`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.error("WebSocket message processing error", error as Error, {
        connectionId: connection.id,
        sessionId: connection.sessionId,
        event: message.event,
        component: message.component,
      });

      connection.send({
        type: "event-result",
        event: message.event,
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Route message handler (to be set by framework)
   */
  private routeMessageHandler?: (
    message: ServerEventMessage,
    connection: WebSocketConnection,
  ) => Promise<unknown>;

  /**
   * Set route message handler
   */
  setRouteMessageHandler(
    handler: (
      message: ServerEventMessage,
      connection: WebSocketConnection,
    ) => Promise<unknown>,
  ): void {
    this.routeMessageHandler = handler;
  }

  /**
   * Register a component
   */
  registerComponent(name: string, definition: ComponentDefinition): void {
    this.components.set(name, definition);
    logger.info("WebSocket component registered", { name });
  }

  /**
   * Unregister a component
   */
  unregisterComponent(name: string): void {
    this.components.delete(name);
    logger.info("WebSocket component unregistered", { name });
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: unknown, options: BroadcastOptions = {}): number {
    let sentCount = 0;

    for (const connection of this.connections.values()) {
      if (this.shouldSendToConnection(connection, options)) {
        connection.send(message);
        sentCount++;
      }
    }

    logger.debug("Broadcast message sent", {
      sentCount,
      totalConnections: this.connections.size,
    });

    return sentCount;
  }

  /**
   * Broadcast to specific session
   */
  broadcastToSession(sessionId: string, message: unknown): number {
    const connectionIds = this.sessionConnections.get(sessionId);
    if (!connectionIds) return 0;

    let sentCount = 0;
    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.send(message);
        sentCount++;
      }
    }

    logger.debug("Session broadcast sent", { sessionId, sentCount });
    return sentCount;
  }

  /**
   * Send message to specific connection
   */
  sendToConnection(connectionId: string, message: unknown): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.send(message);
    return true;
  }

  /**
   * Determine if message should be sent to connection based on options
   */
  private shouldSendToConnection(
    connection: WebSocketConnection,
    options: BroadcastOptions,
  ): boolean {
    // Check session inclusion/exclusion
    if (
      options.includeSessionId &&
      connection.sessionId !== options.includeSessionId
    ) {
      return false;
    }
    if (
      options.excludeSessionId &&
      connection.sessionId === options.excludeSessionId
    ) {
      return false;
    }

    // Check connection ID inclusion/exclusion
    if (
      options.includeConnectionIds &&
      !options.includeConnectionIds.includes(connection.id)
    ) {
      return false;
    }
    if (
      options.excludeConnectionIds &&
      options.excludeConnectionIds.includes(connection.id)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): WebSocketConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get connections by session ID
   */
  getConnectionsBySession(sessionId: string): WebSocketConnection[] {
    const connectionIds = this.sessionConnections.get(sessionId);
    if (!connectionIds) return [];

    const connections: WebSocketConnection[] = [];
    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connections.push(connection);
      }
    }

    return connections;
  }

  /**
   * Get all active connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection statistics
   */
  getStats(): WebSocketStats {
    return { ...this.stats };
  }

  /**
   * Get detailed connection info
   */
  getConnectionInfo(): {
    totalSessions: number;
    connectionsPerSession: Record<string, number>;
    connectionsBySession: Record<string, string[]>;
  } {
    const connectionsPerSession: Record<string, number> = {};
    const connectionsBySession: Record<string, string[]> = {};

    for (const [sessionId, connectionIds] of this.sessionConnections) {
      connectionsPerSession[sessionId] = connectionIds.size;
      connectionsBySession[sessionId] = Array.from(connectionIds);
    }

    return {
      totalSessions: this.sessionConnections.size,
      connectionsPerSession,
      connectionsBySession,
    };
  }

  /**
   * Close connection by ID
   */
  closeConnection(
    connectionId: string,
    code = 1000,
    reason = "Closed by server",
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    connection.socket.close(code, reason);
    return true;
  }

  /**
   * Close all connections for a session
   */
  closeSession(
    sessionId: string,
    code = 1000,
    reason = "Session closed",
  ): number {
    const connections = this.getConnectionsBySession(sessionId);
    for (const connection of connections) {
      connection.socket.close(code, reason);
    }
    return connections.length;
  }

  /**
   * Close all connections
   */
  closeAllConnections(code = 1000, reason = "Server shutdown"): number {
    const count = this.connections.size;
    for (const connection of this.connections.values()) {
      connection.socket.close(code, reason);
    }
    return count;
  }

  /**
   * Ping all connections (keep-alive)
   */
  pingAllConnections(): number {
    const pingMessage = {
      type: "ping",
      timestamp: new Date().toISOString(),
    };

    return this.broadcast(pingMessage);
  }

  /**
   * Clean up closed connections
   */
  cleanup(): number {
    let cleanedUp = 0;
    const toRemove: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      if (connection.socket.readyState === WebSocket.CLOSED) {
        toRemove.push(connectionId);
      }
    }

    for (const connectionId of toRemove) {
      this.removeConnection(connectionId);
      cleanedUp++;
    }

    if (cleanedUp > 0) {
      logger.info("Cleaned up closed WebSocket connections", { cleanedUp });
    }

    return cleanedUp;
  }
}

// Export singleton instance
export const webSocketManager: WebSocketManager = new WebSocketManager();
