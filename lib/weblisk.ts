/**
 * Weblisk Framework v2.0 - Core Library
 * A minimal HTML-over-WebSocket framework for Deno
 */

export interface ComponentContext {
  data: Record<string, unknown>;
  events: Record<string, ComponentEventHandler>;
  framework: Weblisk;
}

export interface ComponentDefinition {
  server?: (context: ComponentContext) => void | Promise<void>;
  client?: () => void;
}

export interface ComponentEventHandler {
  (data: unknown, connection: WebSocketConnection): Promise<unknown> | unknown;
}

export interface WebSocketConnection {
  id: string;
  sessionId?: string;
  socket: WebSocket;
  send(data: unknown): void;
}

export class Weblisk {
  private components = new Map<string, ComponentDefinition>();
  private connections = new Set<WebSocketConnection>();
  private mainComponent = "app";
  private port: number;
  private hostname: string;

  constructor(port = 3000, hostname = "localhost") {
    this.port = port;
    this.hostname = hostname;
    console.log("Weblisk framework initialized");
  }

  /**
   * Register a component
   */
  component(name: string, definition: ComponentDefinition): this {
    this.components.set(name, definition);
    console.log(`Component registered: ${name}`);
    return this;
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    console.log(`Starting server on http://${this.hostname}:${this.port}`);

    Deno.serve({
      port: this.port,
      hostname: this.hostname,
    }, (request: Request) => this.handleRequest(request));
  }

  private async handleRequest(request: Request): Promise<Response> {
    // Handle WebSocket upgrade
    if (request.headers.get("upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    // Return minimal HTML shell - app provides all content
    return this.renderShell();
  }

  private handleWebSocketUpgrade(request: Request): Response {
    const { socket, response } = Deno.upgradeWebSocket(request);

    // Extract session ID from cookies if available
    const cookieHeader = request.headers.get("cookie");
    let initialSessionId: string | undefined;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const sessionCookie = cookies.find(c => c.startsWith('weblisk-session-id='));
      if (sessionCookie) {
        initialSessionId = sessionCookie.split('=')[1];
      }
    }

    const connection: WebSocketConnection = {
      id: crypto.randomUUID(),
      sessionId: initialSessionId, // Set from cookie if available
      socket,
      send: (data: unknown) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(data));
        }
      },
    };

    socket.onopen = () => {
      this.connections.add(connection);
      console.log(`Client connected: ${connection.id}${connection.sessionId ? ` (session: ${connection.sessionId.slice(-8)})` : ''}`);
      this.initializeComponent(this.mainComponent, connection);
    };

    socket.onmessage = (event) => {
      this.handleWebSocketMessage(event.data, connection);
    };

    socket.onclose = () => {
      this.connections.delete(connection);
      console.log(`Client disconnected: ${connection.id}${connection.sessionId ? ` (session: ${connection.sessionId.slice(-8)})` : ''}`);
    };

    return response;
  }

  private async handleWebSocketMessage(data: string, connection: WebSocketConnection): Promise<void> {
    try {
      const message = JSON.parse(data);
      if (message.type === "server-event") {
        await this.handleServerEvent(message, connection);
      } else if (message.type === "set-session-id") {
        connection.sessionId = message.sessionId;
        console.log(`Session ID set for connection ${connection.id}: ${message.sessionId.slice(-8)}`);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  private async handleServerEvent(message: any, connection: WebSocketConnection): Promise<void> {
    const { component: componentName, event: eventName, payload } = message;
    const component = this.components.get(componentName);

    if (!component || !component.server) {
      connection.send({
        type: "event-result",
        success: false,
        error: `Component or event not found: ${componentName}.${eventName}`,
      });
      return;
    }

    try {
      const context: ComponentContext = {
        data: {},
        events: {},
        framework: this,
      };

      await component.server(context);

      const eventHandler = context.events[eventName];
      if (!eventHandler) {
        connection.send({
          type: "event-result",
          success: false,
          error: `Event not found: ${eventName}`,
        });
        return;
      }

      const result = await eventHandler(payload, connection);

      connection.send({
        type: "event-result",
        success: true,
        result,
      });
    } catch (error) {
      connection.send({
        type: "event-result",
        success: false,
        error: error.message,
      });
    }
  }

  private async initializeComponent(componentName: string, connection: WebSocketConnection): Promise<void> {
    const component = this.components.get(componentName);
    if (!component) {
      console.warn(`⚠️  Component not found: ${componentName}`);
      return;
    }

    try {
      const context: ComponentContext = {
        data: {},
        events: {},
        framework: this,
      };

      if (component.server) {
        await component.server(context);
      }

      connection.send({
        type: "component-init",
        component: componentName,
        context: context.data,
        clientCode: component.client ? component.client.toString() : null,
      });

      console.log(`Component initialized: ${componentName}`);
    } catch (error) {
      console.error(`Error initializing component ${componentName}:`, error);
    }
  }

  private renderShell(): Response {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weblisk</title>
</head>
<body>
    <div id="app"></div>

    <script>
        class WebliskClient {
            constructor() {
                this.ws = null;
                this.eventHandlers = {};
                this.isConnected = false;
                this.sessionId = this.getOrCreateSessionId();
                this.connect();
            }

            getOrCreateSessionId() {
                // Get session ID from cookie
                const cookies = document.cookie.split(';').map(c => c.trim());
                const sessionCookie = cookies.find(c => c.startsWith('weblisk-session-id='));

                if (sessionCookie) {
                    return sessionCookie.split('=')[1];
                }

                // Create new session ID and set cookie
                const sessionId = crypto.randomUUID();
                const maxAge = 60 * 60 * 24 * 30; // 30 days
                document.cookie = 'weblisk-session-id=' + sessionId + '; path=/; max-age=' + maxAge + '; SameSite=Strict';
                return sessionId;
            }

            connect() {
                const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
                this.ws = new WebSocket(protocol + '//' + location.host);

                this.ws.onopen = () => {
                    this.isConnected = true;
                    console.log('Connected to Weblisk');

                    // Send session ID to server
                    this.ws.send(JSON.stringify({
                        type: 'set-session-id',
                        sessionId: this.sessionId
                    }));
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                };

                this.ws.onclose = () => {
                    this.isConnected = false;
                    console.log('Disconnected');
                    setTimeout(() => this.connect(), 1000);
                };
            }

            handleMessage(data) {
                if (data.type === 'component-init') {
                    this.initializeComponent(data.component, data.context, data.clientCode);
                } else if (data.type === 'event-result') {
                    this.trigger('event-result', data);
                } else {
                    this.trigger(data.type, data);
                }
            }

            initializeComponent(componentName, context, clientCode) {
                console.log('Initializing: ' + componentName);
                window.__WEBLISK_CONTEXT__ = context;
                window.__WEBLISK_SESSION_ID__ = this.sessionId;

                if (clientCode) {
                    try {
                        const clientFn = new Function('return (' + clientCode + ')')();
                        clientFn();
                    } catch (error) {
                        console.error('Error executing client code:', error);
                    }
                }
            }

            send(type, data) {
                if (this.isConnected && this.ws) {
                    this.ws.send(JSON.stringify({ type, ...data }));
                }
            }

            on(event, handler) {
                if (!this.eventHandlers[event]) {
                    this.eventHandlers[event] = [];
                }
                this.eventHandlers[event].push(handler);
            }

            trigger(event, data) {
                if (this.eventHandlers[event]) {
                    this.eventHandlers[event].forEach(handler => handler(data));
                }
            }
        }

        const weblisk = new WebliskClient();
        window.getServerData = () => window.__WEBLISK_CONTEXT__ || {};
        window.getSessionId = () => window.__WEBLISK_SESSION_ID__ || weblisk.sessionId;
        window.send = (type, data) => weblisk.send(type, data);
        window.on = (event, handler) => weblisk.on(event, handler);
        window.weblisk = weblisk;
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  broadcast(message: unknown): void {
    for (const connection of this.connections) {
      connection.send(message);
    }
  }

  /**
   * Find connections by session ID
   */
  getConnectionsBySessionId(sessionId: string): WebSocketConnection[] {
    return Array.from(this.connections).filter(conn => conn.sessionId === sessionId);
  }

  /**
   * Broadcast to a specific session ID
   */
  broadcastToSession(sessionId: string, message: unknown): void {
    const connections = this.getConnectionsBySessionId(sessionId);
    for (const connection of connections) {
      connection.send(message);
    }
  }
}

export default Weblisk;
