/**
 * Weblisk Framework - Core Library (Refactored)
 * A minimal HTML-over-WebSocket framework for Deno with single-file routes
 */

import type {
  ComponentDefinition,
  RouteContext,
  ServerEventMessage,
  WebSocketConnection,
} from "./types.ts";
import { logger } from "./logger.ts";
import {
  type DeepPartial,
  type WebliskConfig,
  WebliskConfigManager,
} from "./config.ts";
import { frameworkMonitor } from "./monitor.ts";
import { type RateLimitConfig, security } from "./security.ts";
import {
  type RouteConfig,
  type WebliskAppConfig,
  type WebliskFrameworkRouteConfig,
  WebliskRoute,
} from "./routes.ts";
import { staticFileManager } from "./static.ts";
import { CookieManager } from "./cookies.ts";
import { webSocketManager } from "./websockets.ts";
import {
  routeHelpers,
  type TypedRouteConfig,
  typedRouteRegistry,
} from "./route-types.ts";

// Re-export route functionality for convenience
export {
  type RouteConfig,
  type WebliskAppConfig,
  type WebliskFrameworkRouteConfig,
  WebliskRoute,
};

// Re-export typed route functionality
export {
  routeHelpers,
  type RouteType,
  type TypedRouteConfig,
  typedRouteRegistry,
} from "./route-types.ts";

/**
 * Main Weblisk Framework class
 */
export class WebliskFramework {
  private routes = new Map<string, WebliskRoute>();
  private components = new Map<string, ComponentDefinition>();
  private config: WebliskConfig;
  private server?: Deno.HttpServer;
  private cookieManager: CookieManager;
  private startTime: number;

  constructor(config?: DeepPartial<WebliskConfig>) {
    this.startTime = Date.now();

    // Initialize configuration
    const configManager = new WebliskConfigManager(config);
    this.config = configManager.get();

    // Initialize cookie manager
    this.cookieManager = new CookieManager({
      cookieName: this.config.session.cookieName,
      cookieMaxAge: this.config.session.cookieMaxAge,
      cookieSecure: this.config.session.cookieSecure,
      cookieSameSite: this.config.session.cookieSameSite,
    });

    // Set up WebSocket route message handler
    webSocketManager.setRouteMessageHandler(
      this.handleWebSocketRouteMessage.bind(this),
    );

    logger.info("Weblisk framework initialized", {
      port: this.config.server.port,
      hostname: this.config.server.hostname,
      environment: this.config.development.debugMode
        ? "development"
        : "production",
      securityEnabled: this.config.security.securityHeadersEnabled,
      rateLimitEnabled: this.config.security.rateLimitEnabled,
    });

    // Start security cleanup timer
    if (this.config.security.rateLimitEnabled) {
      setInterval(() => {
        security.cleanupRateLimit();
      }, 60000); // Cleanup every minute
    }

    // Start framework monitoring (only if enabled)
    if (this.config.monitoring.healthCheckEnabled) {
      frameworkMonitor.startPeriodicChecks();
    }
  }

  /**
   * Get the server URL for display purposes
   */
  getServerUrl(): string {
    const protocol = this.config.server.enableHttps ? "https" : "http";
    return `${protocol}://${this.config.server.hostname}:${this.config.server.port}`;
  }

  /**
   * Get the current environment name
   */
  getEnvironment(): string {
    return this.config.development.debugMode ? "development" : "production";
  }

  /**
   * Add a static file (robots.txt, ads.txt, sitemap.xml, etc.)
   */
  addStaticFile(path: string, content: string, contentType?: string): void {
    staticFileManager.addFile(path, content, { contentType });
    this.updateFrameworkStats();
  }

  /**
   * Load static files from a directory
   */
  async loadStaticFiles(directory: string): Promise<void> {
    await staticFileManager.loadFromDirectory(directory);
    this.updateFrameworkStats();
  }

  /**
   * Register a route with the framework (enhanced with typed-routes support)
   */
  route(
    path: string,
    routeConfig: RouteConfig | WebliskRoute | TypedRouteConfig,
  ): WebliskFramework {
    // Handle typed route configuration
    if ("type" in routeConfig && !("getUserConfig" in routeConfig)) {
      // This is a TypedRouteConfig
      const typedConfig = routeConfig as TypedRouteConfig;

      // Register with typed route registry for optimization
      typedRouteRegistry.register(path, typedConfig);

      // Validate the route configuration
      const validationErrors = typedRouteRegistry.validateRoute(
        path,
        typedConfig,
      );
      if (validationErrors.length > 0) {
        logger.warn(`Route validation warnings for ${path}:`, {
          errors: validationErrors,
        });
      }

      // Create WebliskRoute instance (TypedRouteConfig extends WebliskFrameworkRouteConfig)
      const routeHandler = new WebliskRoute(typedConfig);
      this.routes.set(path, routeHandler);

      // Get optimization settings for logging
      const optimization = typedRouteRegistry.getOptimization(path);

      logger.info(`Typed route registered: ${path}`, {
        type: typedConfig.type,
        hasStyles: !!typedConfig.styles,
        hasTemplate: !!typedConfig.template,
        hasClientCode: !!typedConfig.clientCode,
        hasData: !!typedConfig.data,
        eventCount: Object.keys(typedConfig.events || {}).length,
        optimization: optimization
          ? {
            cacheStrategy: optimization.cacheStrategy,
            websocketBehavior: optimization.websocketBehavior,
            updateFrequency: optimization.updateFrequency,
            priority: optimization.priority,
          }
          : undefined,
      });
    } else {
      // Handle existing route configuration (backward compatibility)
      const routeHandler = routeConfig instanceof WebliskRoute
        ? routeConfig
        : new WebliskRoute(routeConfig);
      this.routes.set(path, routeHandler);

      const config = routeConfig instanceof WebliskRoute
        ? routeConfig.getUserConfig()
        : routeConfig;
      logger.info(`Route registered: ${path}`, {
        hasStyles: !!config.styles,
        hasTemplate: !!config.template,
        hasClientCode: !!config.clientCode,
        hasData: !!config.data,
        eventCount: Object.keys(config.events || {}).length,
      });
    }

    this.updateFrameworkStats();
    return this;
  }

  /**
   * Register a component with the framework
   */
  component(name: string, definition: ComponentDefinition): WebliskFramework {
    this.components.set(name, definition);
    webSocketManager.registerComponent(name, definition);
    logger.info(`Component registered: ${name}`);
    this.updateFrameworkStats();
    return this;
  }

  /**
   * Typed route helper methods for common patterns
   */

  /**
   * Register a static content route (optimized for caching)
   */
  static(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.static(config));
  }

  /**
   * Register a real-time route (optimized for WebSocket streaming)
   */
  realtime(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.realtime(config));
  }

  /**
   * Register an API endpoint route (optimized for JSON responses)
   */
  api(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.api(config));
  }

  /**
   * Register a form handling route (optimized for form processing)
   */
  form(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.form(config));
  }

  /**
   * Register a streaming data route (optimized for continuous data flow)
   */
  stream(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.stream(config));
  }

  // Advanced Route Helpers

  /**
   * Register a public API route (with documentation and rate limiting)
   */
  publicApi(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.publicApi(config));
  }

  /**
   * Register a private API route (high-performance internal microservice API)
   */
  privateApi(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.privateApi(config));
  }

  /**
   * Register a webhook handler (idempotent with retry logic)
   */
  webhook(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.webhook(config));
  }

  /**
   * Register a microservice communication route (service mesh optimized)
   */
  microservice(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.microservice(config));
  }

  /**
   * Register an edge-optimized route (CDN and global distribution ready)
   */
  edge(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.edge(config));
  }

  /**
   * Register a batch processing route (job queuing and long-running tasks)
   */
  batch(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.batch(config));
  }

  /**
   * Register an analytics route (data collection with privacy controls)
   */
  analytics(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.analytics(config));
  }

  /**
   * Register a compliance route (audit-ready with full logging)
   */
  compliance(
    path: string,
    config: Omit<TypedRouteConfig, "type">,
  ): WebliskFramework {
    return this.route(path, routeHelpers.compliance(config));
  }

  /**
   * Get typed route registry statistics
   */
  getTypedRouteStats(): {
    totalRoutes: number;
    routesByType: Record<string, number>;
    prerenderableRoutes: number;
    websocketRoutes: number;
    realtimeRoutes: number;
  } {
    return typedRouteRegistry.getStats();
  }

  /**
   * Get routes that require prerendering
   */
  getPrerenderableRoutes(): string[] {
    return typedRouteRegistry.getPrerenderableRoutes();
  }

  /**
   * Get routes that require WebSocket connections
   */
  getWebSocketRoutes(): string[] {
    return typedRouteRegistry.getWebSocketRoutes();
  }

  /**
   * Update framework statistics for monitoring
   */
  private updateFrameworkStats(): void {
    const webSocketStats = webSocketManager.getStats();
    const staticFileStats = staticFileManager.getStats();
    const _typedRouteStats = typedRouteRegistry.getStats();

    frameworkMonitor.updateFrameworkStats({
      routes: this.routes.size,
      components: this.components.size,
      staticFiles: staticFileStats.totalFiles,
      sessions: webSocketStats.activeConnections, // Approximate session count
    });
  }

  /**
   * Start the framework server
   */
  async start(): Promise<void> {
    const handler = (request: Request): Response | Promise<Response> => {
      return this.handleRequest(request);
    };

    // Configure server options
    interface ServerOptions extends Deno.ServeOptions {
      cert?: string;
      key?: string;
    }

    const serverOptions: ServerOptions = {
      port: this.config.server.port,
      hostname: this.config.server.hostname,
      onListen: (_localAddr: Deno.NetAddr) => {
        const protocol = this.config.server.enableHttps ? "https" : "http";
        console.log(
          `Weblisk server listening on ${protocol}://${this.config.server.hostname}:${this.config.server.port}/`,
        );
        console.log(
          `Security: ${
            this.config.security.securityHeadersEnabled ? "Enabled" : "Disabled"
          }`,
        );
        console.log(
          `Rate limiting: ${
            this.config.security.rateLimitEnabled ? "Enabled" : "Disabled"
          }`,
        );
        console.log(
          `Secure cookies: ${
            this.config.session.cookieSecure ? "Enabled" : "Disabled"
          }`,
        );
      },
    } as Deno.ServeOptions;

    // Add HTTPS configuration if enabled
    if (this.config.server.enableHttps) {
      if (!this.config.server.certificatePath || !this.config.server.keyPath) {
        throw new Error(
          "HTTPS is enabled but certificate or key path is missing",
        );
      }

      try {
        const cert = await Deno.readTextFile(
          this.config.server.certificatePath,
        );
        const key = await Deno.readTextFile(this.config.server.keyPath);
        serverOptions.cert = cert;
        serverOptions.key = key;
        logger.info("HTTPS enabled with provided certificates");
      } catch (error) {
        throw new Error(`Failed to load HTTPS certificates: ${error}`);
      }
    }

    logger.info(
      `Starting server on ${
        this.config.server.enableHttps ? "https" : "http"
      }://${this.config.server.hostname}:${this.config.server.port}`,
    );

    this.server = Deno.serve(serverOptions, handler);

    // Set up graceful shutdown
    let shuttingDown = false;
    const shutdownHandler = async () => {
      if (shuttingDown) return; // Prevent multiple shutdown attempts
      shuttingDown = true;

      logger.info("Shutting down Weblisk server...");

      // Use a timeout to ensure we don't hang indefinitely
      const shutdownPromise = this.stop();
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          logger.info("Shutdown timeout reached, forcing exit...");
          resolve();
        }, 2000); // 2 second timeout
      });

      await Promise.race([shutdownPromise, timeoutPromise]);
      Deno.exit(0);
    };

    Deno.addSignalListener("SIGINT", shutdownHandler);
    Deno.addSignalListener("SIGTERM", shutdownHandler);
  } /**
   * Handle incoming HTTP requests
   */

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      // Health check endpoint
      if (url.pathname === "/health") {
        const healthResults = await frameworkMonitor.runAllHealthChecks();
        const overallStatus = healthResults.every((result) =>
            result.status === "healthy"
          )
          ? "healthy"
          : "unhealthy";
        return new Response(
          JSON.stringify({
            status: overallStatus,
            results: healthResults,
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: overallStatus === "healthy" ? 200 : 503,
          },
        );
      }

      // Metrics endpoint for monitoring
      if (url.pathname === "/metrics") {
        const metrics = frameworkMonitor.exportPrometheusMetrics();
        return new Response(metrics, {
          headers: { "Content-Type": "text/plain" },
        });
      }

      // Handle CORS preflight requests
      if (request.method === "OPTIONS" && this.config.security.corsEnabled) {
        const origin = request.headers.get("Origin");
        if (
          origin &&
          security.validateCorsOrigin(origin, this.config.security.corsOrigins)
        ) {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Access-Control-Allow-Credentials": "true",
              "Access-Control-Max-Age": "86400", // 24 hours
            },
          });
        }
        return new Response("CORS not allowed", { status: 403 });
      }

      // WebSocket upgrade
      if (url.pathname === "/ws") {
        const sessionId = this.cookieManager.getSessionId(request) ||
          this.cookieManager.generateSessionId();
        return webSocketManager.handleUpgrade(request, sessionId);
      }

      // Static file serving
      const staticResponse = staticFileManager.handleRequest(
        url.pathname,
        request,
      );
      if (staticResponse) {
        return staticResponse;
      }

      // Route handling - try exact match first, then dynamic routes
      let route = this.routes.get(url.pathname);
      let routeParams: Record<string, string> = {};

      if (!route) {
        // Try to match dynamic routes
        const matchResult = this.matchDynamicRoute(url.pathname);
        if (matchResult) {
          route = matchResult.route;
          routeParams = matchResult.params;
        }
      }

      if (route) {
        return await this.handleRoute(route, request, routeParams);
      }

      // 404 Not Found
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      logger.error(
        "Request handling failed",
        error instanceof Error ? error : new Error(String(error)),
        {
          url: request.url,
        },
      );

      return new Response("Internal Server Error", { status: 500 });
    }
  }

  /**
   * Match a URL path against dynamic routes
   */
  private matchDynamicRoute(
    pathname: string,
  ): { route: WebliskRoute; params: Record<string, string> } | null {
    for (const [routePath, route] of this.routes) {
      // Skip exact matches (already tried)
      if (routePath === pathname) continue;

      // Only check routes with parameters
      if (!routePath.includes(":")) continue;

      const params = this.matchRoutePattern(routePath, pathname);
      if (params) {
        return { route, params };
      }
    }
    return null;
  }

  /**
   * Match a specific route pattern against a pathname
   */
  private matchRoutePattern(
    pattern: string,
    pathname: string,
  ): Record<string, string> | null {
    const patternParts = pattern.split("/");
    const pathnameParts = pathname.split("/");

    // Must have same number of parts
    if (patternParts.length !== pathnameParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathnamePart = pathnameParts[i];

      if (patternPart.startsWith(":")) {
        // Dynamic parameter
        const paramName = patternPart.slice(1);
        params[paramName] = decodeURIComponent(pathnamePart);
      } else if (patternPart !== pathnamePart) {
        // Static part doesn't match
        return null;
      }
    }

    return params;
  }

  /**
   * Handle route requests
   */
  private async handleRoute(
    route: WebliskRoute,
    request: Request,
    routeParams: Record<string, string> = {},
  ): Promise<Response> {
    const url = new URL(request.url);
    const startTime = performance.now();

    // Security checks
    if (this.config.security.rateLimitEnabled) {
      // Skip rate limiting for HEAD requests in development (used by auto-reload)
      const isDevelopment = Deno.env.get("WEBLISK_ENV") === "development";
      const isHeadRequest = request.method === "HEAD";

      if (!isDevelopment || !isHeadRequest) {
        const rateLimitConfig: RateLimitConfig = {
          windowMs: this.config.security.rateLimitWindowMs,
          maxRequests: this.config.security.rateLimitRequests,
        };

        if (!security.checkRateLimit(request, rateLimitConfig)) {
          logger.warn("Rate limit exceeded", {
            path: url.pathname,
            ip: request.headers.get("X-Forwarded-For") || "unknown",
          });

          // Track failed request
          frameworkMonitor.trackRequest(performance.now() - startTime, false);

          return new Response("Rate limit exceeded", {
            status: 429,
            headers: { "Retry-After": "60" },
          });
        }
      }
    }

    // CORS check
    const origin = request.headers.get("Origin");
    if (this.config.security.corsEnabled && origin) {
      if (
        !security.validateCorsOrigin(origin, this.config.security.corsOrigins)
      ) {
        logger.warn("CORS violation", { origin, path: url.pathname });
        frameworkMonitor.trackRequest(performance.now() - startTime, false);
        return new Response("CORS not allowed", { status: 403 });
      }
    }

    // Handle session using cookie manager
    const sessionData = this.cookieManager.handleSession(request);
    const { sessionId, isNewSession, cookieHeader } = sessionData;

    logger.debug("HTTP Request session handling", {
      path: url.pathname,
      sessionId: sessionId.slice(-8), // Log only last 8 chars for security
      isNewSession,
    });

    const context: RouteContext = {
      request,
      url,
      framework: this,
      sessionId,
      params: routeParams,
    };

    const html = await route.render(context);

    // Build response headers with security headers
    const headers: Record<string, string> = {
      "Content-Type": "text/html",
    };

    // Add security headers
    if (this.config.security.securityHeadersEnabled) {
      const securityHeaders = security.getSecurityHeaders(
        !this.config.development.debugMode,
      );
      Object.assign(headers, securityHeaders);

      // Only add HSTS over HTTPS
      if (this.config.server.enableHttps && this.config.security.enableHSTS) {
        headers["Strict-Transport-Security"] =
          "max-age=31536000; includeSubDomains";
      }
    }

    // Add CORS headers if enabled
    if (this.config.security.corsEnabled && origin) {
      if (
        security.validateCorsOrigin(origin, this.config.security.corsOrigins)
      ) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Credentials"] = "true";
        headers["Access-Control-Allow-Methods"] =
          "GET, POST, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
      }
    }

    // Set session cookie if new session
    if (isNewSession && cookieHeader) {
      headers["Set-Cookie"] = cookieHeader;
      logger.debug("Set new session cookie", {
        path: url.pathname,
        sessionId: sessionId.slice(-8),
      });
    }

    // Track successful request
    frameworkMonitor.trackRequest(performance.now() - startTime, true);

    return new Response(html, { headers });
  }

  /**
   * Handle WebSocket route messages (callback for WebSocket manager)
   */
  private async handleWebSocketRouteMessage(
    message: ServerEventMessage,
    connection: WebSocketConnection,
  ): Promise<unknown> {
    // Try to find a route that has the requested event handler
    for (const route of this.routes.values()) {
      if (route.hasEvent(message.event)) {
        const url = new URL("http://localhost/"); // Default URL for route events
        const context: RouteContext = {
          request: new Request("http://localhost/"),
          url,
          framework: this,
          sessionId: connection.sessionId,
        };

        return await route.handleEvent(
          message.event,
          message.payload as Record<string, unknown>,
          context,
        );
      }
    }

    throw new Error(`No route found with event handler for: ${message.event}`);
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(message: unknown): void {
    webSocketManager.broadcast(message);
  }

  /**
   * Broadcast message to connections in a specific session
   */
  broadcastToSession(sessionId: string, message: unknown): void {
    webSocketManager.broadcastToSession(sessionId, message);
  }

  /**
   * Get connections by session ID
   */
  getConnectionsBySessionId(sessionId: string): WebSocketConnection[] {
    return webSocketManager.getConnectionsBySession(sessionId);
  }

  /**
   * Get route information for debugging
   */
  getRouteInfo(): Record<string, Record<string, unknown>> {
    const routeInfo: Record<string, Record<string, unknown>> = {};
    for (const [path] of this.routes) {
      routeInfo[path] = { registered: true };
    }
    return routeInfo;
  }

  /**
   * Auto-discover routes from a directory
   */
  async discoverRoutes(routesDir: string): Promise<WebliskFramework> {
    try {
      for await (const entry of Deno.readDir(routesDir)) {
        if (entry.isFile && entry.name.endsWith(".ts")) {
          const routePath = `${routesDir}/${entry.name}`;
          const routeName = `/${entry.name.replace(".ts", "")}`;

          try {
            const module = await import(routePath);
            if (module.default) {
              this.route(routeName, module.default);
            }
          } catch (error) {
            logger.error(
              `Failed to load route: ${routePath}`,
              error instanceof Error ? error : new Error(String(error)),
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        `Failed to discover routes in ${routesDir}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    return this;
  }

  /**
   * Get connection count (for testing/monitoring)
   */
  getConnectionCount(): number {
    return webSocketManager.getStats().activeConnections;
  }

  /**
   * Get framework statistics
   */
  getStats(): Record<string, number | Record<string, unknown>> {
    const webSocketStats = webSocketManager.getStats();
    const staticFileStats = staticFileManager.getStats();
    const frameworkStats = frameworkMonitor.getFrameworkStats();

    return {
      routes: this.routes.size,
      components: this.components.size,
      staticFiles: staticFileStats.totalFiles,
      websocketConnections: webSocketStats.activeConnections,
      activeSessions: webSocketStats.activeConnections, // Approximate
      memoryUsage: frameworkStats.memoryUsage,
      uptime: Date.now() - this.startTime,
      performance: {
        totalRequests: webSocketStats.messagesReceived,
        totalResponses: webSocketStats.messagesSent,
        errors: webSocketStats.errors,
      },
    };
  }

  /**
   * Stop the framework server gracefully
   */
  async stop(): Promise<void> {
    if (this.server) {
      logger.info("Gracefully shutting down server...");

      // Close all WebSocket connections
      webSocketManager.closeAllConnections(1000, "Server shutdown");

      // Stop monitoring
      frameworkMonitor.stopPeriodicChecks();

      // Shutdown the server
      await this.server.shutdown();
      this.server = undefined;

      logger.info("Server shutdown complete");
    }
  }
}

// Export the main framework class as default
export default WebliskFramework;
export { WebliskFramework as Weblisk }; // Convenient alias
export { type WebliskConfig, WebliskConfigManager } from "./config.ts";
export { logger } from "./logger.ts";
export { frameworkMonitor } from "./monitor.ts";
export { staticFileManager } from "./static.ts";
export { webSocketManager } from "./websockets.ts";
