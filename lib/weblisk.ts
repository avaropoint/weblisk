/**
 * Weblisk Framework - Core Library (Refactored)
 * A minimal HTML-over-WebSocket framework for Deno with single-file routes
 */

import {
  type ComponentDefinition,
  type ComponentContext,
  type WebSocketConnection,
  type IWebliskFramework,
  type WebliskMessage,
  type ServerEventMessage,
  type RouteConfig as IRouteConfig,
  type RouteContext,
  ComponentError,
  WebliskError,
} from "./types.ts";
import { logger } from "./logger.ts";
import { WebliskConfigManager, type WebliskConfig } from "./config.ts";
import { HealthMonitor } from "./health.ts";
import { security, type RateLimitConfig } from "./security.ts";
import {
  WebliskRoute,
  type WebliskFrameworkRouteConfig,
  type WebliskAppConfig,
  type RouteConfig
} from "./routes.ts";

// Re-export route functionality for convenience
export { WebliskRoute, type WebliskFrameworkRouteConfig, type WebliskAppConfig, type RouteConfig };

/**
 * Main Weblisk Framework class
 */
export class WebliskFramework implements IWebliskFramework {
  private routes: Map<string, WebliskRoute> = new Map();
  private components: Map<string, ComponentDefinition> = new Map();
  private connections: Map<string, WebSocketConnection> = new Map();
  private staticFiles: Map<string, { content: string; contentType: string; isBase64?: boolean }> = new Map();
  private config: WebliskConfig;
  private server?: Deno.HttpServer;
  private healthMonitor: HealthMonitor;

  constructor(config?: Partial<WebliskConfig>) {
    // Initialize configuration with proper type
    const configManager = new WebliskConfigManager(config);
    this.config = configManager.get();
    this.healthMonitor = new HealthMonitor();

    logger.info("Weblisk framework initialized", {
      port: this.config.server.port,
      hostname: this.config.server.hostname,
      environment: this.config.development.debugMode ? 'development' : 'production',
      securityEnabled: this.config.security.securityHeadersEnabled,
      rateLimitEnabled: this.config.security.rateLimitEnabled
    });

    // Start security cleanup timer
    if (this.config.security.rateLimitEnabled) {
      setInterval(() => {
        security.cleanupRateLimit();
      }, 60000); // Cleanup every minute
    }
  }

  /**
   * Get the server URL for display purposes
   */
  getServerUrl(): string {
    const protocol = this.config.server.enableHttps ? 'https' : 'http';
    return `${protocol}://${this.config.server.hostname}:${this.config.server.port}`;
  }

  /**
   * Get the current environment name
   */
  getEnvironment(): string {
    return this.config.development.debugMode ? 'development' : 'production';
  }

  /**
   * Add a static file (robots.txt, ads.txt, sitemap.xml, etc.)
   */
  addStaticFile(path: string, content: string, contentType?: string, isBase64?: boolean): void {
    // Auto-detect content type if not provided
    if (!contentType) {
      const ext = path.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'txt': contentType = 'text/plain'; break;
        case 'xml': contentType = 'application/xml'; break;
        case 'json': contentType = 'application/json'; break;
        case 'html': contentType = 'text/html'; break;
        case 'css': contentType = 'text/css'; break;
        case 'js': contentType = 'application/javascript'; break;
        case 'ico': contentType = 'image/x-icon'; break;
        case 'png': contentType = 'image/png'; break;
        case 'jpg': case 'jpeg': contentType = 'image/jpeg'; break;
        case 'gif': contentType = 'image/gif'; break;
        case 'svg': contentType = 'image/svg+xml'; break;
        default: contentType = 'application/octet-stream';
      }
    }

    // Convert base64 to Uint8Array if needed
    const finalContent = isBase64 ? content : content;

    this.staticFiles.set(path.startsWith('/') ? path : `/${path}`, {
      content: finalContent,
      contentType,
      isBase64: isBase64 || false
    });
  }

  /**
   * Load static files from a directory
   */
  async loadStaticFiles(directory: string): Promise<void> {
    try {
      for await (const entry of Deno.readDir(directory)) {
        if (entry.isFile) {
          const filePath = `${directory}/${entry.name}`;
          const content = await Deno.readTextFile(filePath);
          this.addStaticFile(`/${entry.name}`, content);
        }
      }
    } catch (error) {
      logger.warn(`Failed to load static files from ${directory}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Handle static file requests
   */
  private handleStaticFile(pathname: string): Response | null {
    const staticFile = this.staticFiles.get(pathname);
    if (!staticFile) {
      return null;
    }

    // Handle base64 content
    if (staticFile.isBase64) {
      try {
        const binaryString = atob(staticFile.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Response(bytes, {
          headers: {
            'Content-Type': staticFile.contentType,
            'Cache-Control': 'public, max-age=86400' // 24 hours cache
          }
        });
      } catch {
        return new Response('Invalid base64 content', { status: 500 });
      }
    }

    return new Response(staticFile.content, {
      headers: {
        'Content-Type': staticFile.contentType,
        'Cache-Control': 'public, max-age=86400' // 24 hours cache
      }
    });
  }

  /**
   * Register a route with the framework
   */
  route(path: string, routeConfig: IRouteConfig | WebliskRoute): IWebliskFramework {
    const routeHandler = routeConfig instanceof WebliskRoute
      ? routeConfig
      : new WebliskRoute(routeConfig);
    this.routes.set(path, routeHandler);

    const config = routeConfig instanceof WebliskRoute ? routeConfig.getUserConfig() : routeConfig;
    logger.info(`Route registered: ${path}`, {
      hasStyles: !!config.styles,
      hasTemplate: !!config.template,
      hasClientCode: !!config.clientCode,
      hasData: !!config.data,
      eventCount: Object.keys(config.events || {}).length
    });

    return this;
  }

  /**
   * Register a component with the framework
   */
  component(name: string, definition: ComponentDefinition): IWebliskFramework {
    this.components.set(name, definition);
    logger.info(`Component registered: ${name}`);
    return this;
  }

  /**
   * Start the framework server
   */
  async start(): Promise<void> {
    const handler = (request: Request): Response | Promise<Response> => {
      return this.handleRequest(request);
    };

    // Configure server options
    const serverOptions: any = {
      port: this.config.server.port,
      hostname: this.config.server.hostname,
      onListen: ({ port, hostname }: { port: number; hostname: string }) => {
        const protocol = this.config.server.enableHttps ? 'https' : 'http';
        console.log(`Weblisk server listening on ${protocol}://${hostname}:${port}/`);
        console.log(`Security: ${this.config.security.securityHeadersEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`Rate limiting: ${this.config.security.rateLimitEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`Secure cookies: ${this.config.session.cookieSecure ? 'Enabled' : 'Disabled'}`);
      }
    };

    // Add HTTPS configuration if enabled
    if (this.config.server.enableHttps) {
      if (!this.config.server.certificatePath || !this.config.server.keyPath) {
        throw new Error("HTTPS is enabled but certificate or key path is missing");
      }

      try {
        const cert = await Deno.readTextFile(this.config.server.certificatePath);
        const key = await Deno.readTextFile(this.config.server.keyPath);
        serverOptions.cert = cert;
        serverOptions.key = key;
        logger.info("HTTPS enabled with provided certificates");
      } catch (error) {
        throw new Error(`Failed to load HTTPS certificates: ${error}`);
      }
    }

    logger.info(`Starting server on ${this.config.server.enableHttps ? 'https' : 'http'}://${this.config.server.hostname}:${this.config.server.port}`);

    this.server = Deno.serve(serverOptions, handler);

    // Set up graceful shutdown
    const shutdownHandler = () => {
      logger.info("Shutting down Weblisk server...");
      this.server?.shutdown();
      Deno.exit(0);
    };

    Deno.addSignalListener("SIGINT", shutdownHandler);
    Deno.addSignalListener("SIGTERM", shutdownHandler);
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      // Health check endpoint
      if (url.pathname === '/health') {
        const healthResults = await this.healthMonitor.runAllHealthChecks();
        const overallStatus = healthResults.every(result => result.status === 'healthy') ? 'healthy' : 'unhealthy';
        return new Response(JSON.stringify({
          status: overallStatus,
          results: healthResults,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: overallStatus === 'healthy' ? 200 : 503
        });
      }

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS' && this.config.security.corsEnabled) {
        const origin = request.headers.get('Origin');
        if (origin && security.validateCorsOrigin(origin, this.config.security.corsOrigins)) {
          return new Response(null, {
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Allow-Credentials': 'true',
              'Access-Control-Max-Age': '86400' // 24 hours
            }
          });
        }
        return new Response('CORS not allowed', { status: 403 });
      }

      // WebSocket upgrade
      if (url.pathname === '/ws') {
        return this.handleWebSocketUpgrade(request);
      }

      // Route handling
      const route = this.routes.get(url.pathname);
      if (route) {
        return await this.handleRoute(route, request);
      }

      // Static file handling (robots.txt, ads.txt, sitemap.xml, etc.)
      const staticResponse = this.handleStaticFile(url.pathname);
      if (staticResponse) {
        return staticResponse;
      }

      // 404 Not Found
      return new Response('Not Found', { status: 404 });

    } catch (error) {
      logger.error("Route rendering failed", error instanceof Error ? error : new Error(String(error)), {
        url: request.url
      });

      return new Response('Internal Server Error', { status: 500 });
    }
  }

  /**
   * Handle route requests
   */
  private async handleRoute(route: any, request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Security checks
    if (this.config.security.rateLimitEnabled) {
      const rateLimitConfig: RateLimitConfig = {
        windowMs: this.config.security.rateLimitWindowMs,
        maxRequests: this.config.security.rateLimitRequests,
      };

      if (!security.checkRateLimit(request, rateLimitConfig)) {
        logger.warn("Rate limit exceeded", {
          path: url.pathname,
          ip: request.headers.get('X-Forwarded-For') || 'unknown'
        });
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: { 'Retry-After': '60' }
        });
      }
    }

    // CORS check
    const origin = request.headers.get('Origin');
    if (this.config.security.corsEnabled && origin) {
      if (!security.validateCorsOrigin(origin, this.config.security.corsOrigins)) {
        logger.warn("CORS violation", { origin, path: url.pathname });
        return new Response('CORS not allowed', { status: 403 });
      }
    }

    const cookies = request.headers.get('Cookie') || '';
    const sessionMatch = cookies.match(new RegExp(`${this.config.session.cookieName}=([^;]+)`));
    let sessionId = sessionMatch ? sessionMatch[1] : null;

    // Validate existing session ID
    if (sessionId && !security.isValidSessionId(sessionId)) {
      logger.warn("Invalid session ID format", { sessionId: sessionId.slice(-8) });
      sessionId = null;
    }

    if (!sessionId) {
      sessionId = security.generateSecureSessionId();
    }

    const isNewSession = !sessionMatch || !security.isValidSessionId(sessionMatch[1]);
    console.log('HTTP Request - Session ID for', url.pathname + ':', sessionMatch ? `Found: ${sessionId}` : `Generated new: ${sessionId}`);

    const context: RouteContext = {
      request,
      url,
      framework: this,
      sessionId
    };

    const html = await route.render(context);

    // Build response headers with security headers
    const headers: Record<string, string> = {
      'Content-Type': 'text/html'
    };

    // Add security headers
    if (this.config.security.securityHeadersEnabled) {
      const securityHeaders = security.getSecurityHeaders(!this.config.development.debugMode);
      Object.assign(headers, securityHeaders);

      // Only add HSTS over HTTPS
      if (this.config.server.enableHttps && this.config.security.enableHSTS) {
        headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
      }
    }

    // Add CORS headers if enabled
    if (this.config.security.corsEnabled && origin) {
      if (security.validateCorsOrigin(origin, this.config.security.corsOrigins)) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Credentials'] = 'true';
        headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      }
    }

    // Only set cookie if it's a new session
    if (isNewSession) {
      console.log('HTTP Response - Setting new cookie for', url.pathname + ':', `${this.config.session.cookieName}=${sessionId}`);
      const cookieFlags = [
        'HttpOnly',
        `SameSite=${this.config.session.cookieSameSite}`,
        'Path=/',
        `Max-Age=${this.config.session.cookieMaxAge}`
      ];

      // Add Secure flag if HTTPS is enabled
      if (this.config.server.enableHttps || this.config.session.cookieSecure) {
        cookieFlags.push('Secure');
      }

      headers['Set-Cookie'] = `${this.config.session.cookieName}=${sessionId}; ${cookieFlags.join('; ')}`;
    } else {
      console.log('HTTP Response - Using existing session for', url.pathname + ', no cookie set');
    }

    return new Response(html, { headers });
  }

  /**
   * Handle WebSocket upgrade
   */
  private handleWebSocketUpgrade(request: Request): Response {
    const { socket, response } = Deno.upgradeWebSocket(request);
    const connectionId = crypto.randomUUID();
    const sessionId = this.extractSessionId(request);
    console.log('WebSocket Upgrade - Session ID:', sessionId);

    const connection: WebSocketConnection = {
      id: connectionId,
      sessionId,
      socket,
      send: (data: unknown) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(data));
        }
      }
    };

    socket.onopen = () => {
      this.connections.set(connectionId, connection);
      logger.info("Client connected", { connectionId, sessionId });

      // Send session ID to client
      connection.send({
        type: "set-session-id",
        sessionId: sessionId
      });
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data) as ServerEventMessage;
        await this.handleWebSocketMessage(message, connection);
      } catch (error) {
        logger.error("WebSocket message handling failed", error instanceof Error ? error : new Error(String(error)), {
          connectionId,
          message: event.data
        });
      }
    };

    socket.onclose = () => {
      this.connections.delete(connectionId);
      logger.info("Client disconnected", { connectionId });
    };

    return response;
  }

  /**
   * Handle WebSocket messages
   */
  private async handleWebSocketMessage(message: ServerEventMessage, connection: WebSocketConnection): Promise<void> {
    try {
      // Sanitize input to prevent injection attacks
      const sanitizedMessage = {
        ...message,
        payload: security.sanitizeInput(message.payload)
      };

      let result: unknown;

      if (message.component === 'route' || message.component === 'app') {
        // Handle route events (both 'route' and 'app' components route to the same handlers)
        const url = new URL('http://localhost/'); // Default URL for route events
        const context: RouteContext = {
          request: new Request('http://localhost/'),
          url,
          framework: this,
          sessionId: connection.sessionId
        };

        // Find the route (for now, use the first registered route)
        const route = this.routes.values().next().value;
        if (route) {
          result = await route.handleEvent(sanitizedMessage.event, sanitizedMessage.payload, context);
        }
      } else {
        // Handle component events
        const component = this.components.get(message.component);
        if (component?.server) {
          const componentContext: ComponentContext = {
            data: message.payload as Record<string, unknown>,
            events: {},
            framework: this as IWebliskFramework
          };
          result = await component.server(componentContext);
        }
      }

      // Send result back to client
      connection.send({
        type: "event-result",
        event: `${message.event}-response`,
        success: true,
        result
      });

    } catch (error) {
      connection.send({
        type: "event-result",
        event: `${message.event}-response`,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(request: Request): string {
    const cookies = request.headers.get('Cookie') || '';
    const sessionMatch = cookies.match(new RegExp(`${this.config.session.cookieName}=([^;]+)`));
    const sessionId = sessionMatch ? sessionMatch[1] : crypto.randomUUID();
    return sessionId;
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: unknown): void {
    for (const connection of this.connections.values()) {
      connection.send(message);
    }
  }

  /**
   * Broadcast message to connections in a specific session
   */
  broadcastToSession(sessionId: string, message: unknown): void {
    for (const connection of this.connections.values()) {
      if (connection.sessionId === sessionId) {
        connection.send(message);
      }
    }
  }

  /**
   * Get connections by session ID
   */
  getConnectionsBySessionId(sessionId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.sessionId === sessionId
    );
  }

  /**
   * Get route information for debugging
   */
  getRouteInfo(): Record<string, any> {
    const routeInfo: Record<string, any> = {};
    for (const [path] of this.routes) {
      routeInfo[path] = { registered: true };
    }
    return routeInfo;
  }

  /**
   * Auto-discover routes from a directory
   */
  async discoverRoutes(routesDir: string): Promise<IWebliskFramework> {
    try {
      for await (const entry of Deno.readDir(routesDir)) {
        if (entry.isFile && entry.name.endsWith('.ts')) {
          const routePath = `${routesDir}/${entry.name}`;
          const routeName = `/${entry.name.replace('.ts', '')}`;

          try {
            const module = await import(routePath);
            if (module.default) {
              this.route(routeName, module.default);
            }
          } catch (error) {
            logger.error(`Failed to load route: ${routePath}`, error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to discover routes in ${routesDir}`, error instanceof Error ? error : new Error(String(error)));
    }
    return this;
  }

  /**
   * Get connection count (for testing/monitoring)
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get framework statistics
   */
  getStats(): Record<string, any> {
    return {
      routes: this.routes.size,
      components: this.components.size,
      connections: this.connections.size,
      activeSessions: this.connections.size, // Same as connections for now
      memoryUsage: Deno.memoryUsage(),
      uptime: Date.now() // Simple uptime tracking
    };
  }
}

// Export the main framework class as default
export default WebliskFramework;
export { type WebliskConfig, WebliskConfigManager } from "./config.ts";
export { logger } from "./logger.ts";
export type { HealthMonitor } from "./health.ts";
