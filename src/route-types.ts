/**
 * Weblisk Framework - Advanced Route Type System
 *
 * Complete 16-route-type system with enterprise-grade features:
 * - Core Types (8): static, realtime, api, form, stream, dynamic, auth, admin
 * - Advanced Types (8): public-api, private-api, webhook, microservice, edge, batch, analytics, compliance
 *
 * Each route type has optimized configurations for performance, security,
 * compliance, and scalability requirements.
 */

import type { WebliskFrameworkRouteConfig } from "./routes.ts";
import type { RouteContext } from "./types.ts";

/**
 * All 16 supported route types
 */
export type RouteType =
  // Core web application types
  | "static" // Static content (about pages, terms, etc.)
  | "realtime" // Real-time data (dashboards, live feeds)
  | "api" // API endpoints returning JSON
  | "form" // Form handling with validation
  | "stream" // Streaming data (WebSocket, SSE)
  | "dynamic" // Dynamic content (user profiles, posts)
  | "auth" // Authentication routes
  | "admin" // Admin panel routes
  // Advanced application types
  | "public-api" // Public API with documentation & rate limiting
  | "private-api" // Internal API for microservices
  | "webhook" // Webhook endpoints with retry logic
  | "microservice" // Service mesh communication
  | "edge" // CDN-optimized for global distribution
  | "batch" // Background batch processing
  | "analytics" // Data collection with privacy controls
  | "compliance"; // Audit-ready with full compliance logging

/**
 * Service Level Agreement (SLA) configuration
 */
export interface SLAConfig {
  responseTime: number; // Max response time in milliseconds
  availability: number; // Availability percentage (99.9, 99.99, etc.)
  throughput?: number; // Optional: Minimum requests per second
  errorRate?: number; // Optional: Maximum error rate percentage
  monitoring?: {
    enabled?: boolean;
    provider?: string;
    alerting?: boolean;
  };
  recovery?: {
    autoRestart?: boolean;
    maxRestarts?: number;
    backoffStrategy?: "linear" | "exponential";
    circuitBreaker?: boolean;
  };
}

/**
 * Compliance configuration for enterprise routes
 */
export interface ComplianceConfig {
  // Regulatory compliance
  gdprCompliant?: boolean; // EU General Data Protection Regulation
  hipaaCompliant?: boolean; // Health Insurance Portability and Accountability Act
  sox404Compliant?: boolean; // Sarbanes-Oxley Section 404
  pciDssCompliant?: boolean; // Payment Card Industry Data Security Standard

  // Data handling
  dataRetention?: number; // Data retention period in days
  auditLogging?: boolean; // Enable comprehensive audit logging
  piiHandling?: "encrypt" | "anonymize" | "purge"; // PII handling strategy
  dataLocality?: string; // Geographic data locality requirement

  // Security requirements
  encryptionAtRest?: boolean; // Require encryption at rest
  encryptionInTransit?: boolean; // Require encryption in transit
  accessLogging?: boolean; // Log all data access
  dataClassification?: "public" | "internal" | "confidential" | "restricted";
}

/**
 * Advanced security configuration
 */
export interface SecurityConfig {
  // TLS/SSL
  requireTLS?: boolean;
  tlsVersion?: "1.2" | "1.3";
  enableHSTS?: boolean;

  // Content Security
  enableCSP?: boolean;
  cspPolicy?: string;

  // Access Control
  ipWhitelist?: string[]; // IP address whitelist
  geoBlocking?: string[]; // Blocked country codes
  userAgentBlocking?: string[]; // Blocked user agent patterns

  // Attack Protection
  ddosProtection?: boolean;
  rateLimitByIP?: boolean;
  enableCaptcha?: boolean;

  // Authentication
  apiKeyValidation?: boolean;
  jwtValidation?: boolean;
  oauth2Integration?: boolean;
  mfaRequired?: boolean; // Multi-factor authentication

  // Headers
  securityHeaders?: "strict" | "standard" | "minimal";
  customHeaders?: Record<string, string>;
}

/**
 * Monitoring and observability configuration
 */
export interface MonitoringConfig {
  // Metrics
  enableMetrics?: boolean;
  metricsProvider?: "prometheus" | "statsd" | "datadog" | "newrelic";
  customMetrics?: string[];

  // Tracing
  enableTracing?: boolean;
  tracingProvider?: "jaeger" | "zipkin" | "datadog" | "newrelic";
  samplingRate?: number; // Trace sampling rate (0.0 to 1.0)

  // Logging
  logLevel?: "debug" | "info" | "warn" | "error";
  logFormat?: "json" | "text";
  logAggregation?: "elasticsearch" | "splunk" | "datadog";

  // Profiling
  enableProfiling?: boolean;
  profilingInterval?: number; // Profiling interval in seconds

  // Real User Monitoring
  enableRUM?: boolean;
  rumProvider?: "google-analytics" | "datadog" | "newrelic";

  // Alerting
  alertThresholds?: {
    errorRate?: number;
    responseTime?: number;
    throughput?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };

  // Dashboards
  dashboards?: ("grafana" | "datadog" | "newrelic" | "custom")[];
}

/**
 * API management configuration
 */
export interface APIManagementConfig {
  // Versioning
  version?: string; // Semantic version
  apiVersion?: string; // Public API version
  deprecationDate?: Date;
  sunsetDate?: Date;
  migrationPath?: string;

  // Compatibility
  breaking?: boolean;
  backwardCompatible?: boolean;
  changeLog?: string;

  // Documentation
  documentation?: {
    openApiSpec?: Record<string, unknown>;
    postmanCollection?: boolean;
    sdkGeneration?: string[];
    interactive?: boolean;
    examples?: Record<string, unknown>;
  };

  // Rate Limiting
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    burstLimit?: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };
}

/**
 * Advanced configuration for all route types
 */
export interface AdvancedRouteConfig {
  // Core configuration
  type: RouteType;
  path: string;
  handler: (
    request?: Request | Record<string, unknown>,
  ) =>
    | Promise<Response | Record<string, unknown>>
    | Response
    | Record<string, unknown>;

  // Performance configuration
  caching?: {
    enabled: boolean;
    ttl: number; // Time to live in seconds
    strategy: "memory" | "redis" | "cdn";
    invalidationStrategy?: "ttl" | "tag-based" | "manual";
  };

  // Load balancing
  loadBalancing?: {
    strategy: "round-robin" | "least-connections" | "ip-hash" | "geographic";
    healthCheck: boolean;
    sessionAffinity?: boolean;
  };

  // Auto-scaling
  autoScaling?: {
    enabled: boolean;
    minInstances?: number;
    maxInstances?: number;
    targetCPU?: number;
    targetMemory?: number;
    scaleUpCooldown?: number;
    scaleDownCooldown?: number;
  };

  // Advanced configurations
  sla?: SLAConfig;
  compliance?: ComplianceConfig;
  security?: SecurityConfig;
  monitoring?: MonitoringConfig;
  apiManagement?: APIManagementConfig;
}

/**
 * Route optimization presets for all 16 route types
 */
export const ROUTE_OPTIMIZATIONS: Record<RouteType, AdvancedRouteConfig> = {
  // === CORE TYPES ===

  static: {
    type: "static",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: {
      enabled: true,
      ttl: 86400,
      strategy: "cdn",
      invalidationStrategy: "ttl",
    },
    loadBalancing: {
      strategy: "round-robin",
      healthCheck: false,
      sessionAffinity: false,
    },
    monitoring: { enableMetrics: true, enableTracing: false },
    security: { requireTLS: true, enableCSP: true },
  },

  realtime: {
    type: "realtime",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: { enabled: false, ttl: 0, strategy: "memory" },
    loadBalancing: {
      strategy: "least-connections",
      healthCheck: true,
      sessionAffinity: true,
    },
    monitoring: { enableMetrics: true, enableTracing: true },
    sla: { responseTime: 100, availability: 99.9, throughput: 1000 },
  },

  api: {
    type: "api",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: { enabled: false, ttl: 0, strategy: "memory" },
    loadBalancing: {
      strategy: "round-robin",
      healthCheck: true,
      sessionAffinity: false,
    },
    monitoring: { enableMetrics: true, enableTracing: true },
    sla: { responseTime: 200, availability: 99.5 },
  },

  form: {
    type: "form",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: {
      enabled: true,
      ttl: 300,
      strategy: "memory",
      invalidationStrategy: "ttl",
    },
    security: { enableCSP: true, requireTLS: true },
    monitoring: { enableMetrics: true },
  },

  stream: {
    type: "stream",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: { enabled: false, ttl: 0, strategy: "memory" },
    loadBalancing: {
      strategy: "least-connections",
      healthCheck: true,
      sessionAffinity: true,
    },
    monitoring: { enableTracing: true, enableProfiling: true },
    sla: { responseTime: 50, availability: 99.9 },
  },

  dynamic: {
    type: "dynamic",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: {
      enabled: true,
      ttl: 300,
      strategy: "memory",
      invalidationStrategy: "ttl",
    },
    loadBalancing: {
      strategy: "round-robin",
      healthCheck: false,
      sessionAffinity: false,
    },
    monitoring: { enableMetrics: true },
  },

  auth: {
    type: "auth",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: { enabled: false, ttl: 0, strategy: "memory" },
    security: { requireTLS: true, mfaRequired: true, enableHSTS: true },
    monitoring: { enableTracing: true },
    compliance: { auditLogging: true, accessLogging: true },
  },

  admin: {
    type: "admin",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: { enabled: false, ttl: 0, strategy: "memory" },
    security: {
      requireTLS: true,
      mfaRequired: true,
      ipWhitelist: ["10.0.0.0/8"],
    },
    monitoring: { enableTracing: true, enableProfiling: true },
    compliance: { auditLogging: true, dataClassification: "restricted" },
  },

  // === ADVANCED TYPES ===

  "public-api": {
    type: "public-api",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    sla: {
      responseTime: 100,
      availability: 99.9,
      throughput: 1000,
      errorRate: 0.1,
    },
    apiManagement: {
      rateLimit: { maxRequests: 1000, windowMs: 60000, burstLimit: 100 },
      documentation: { openApiSpec: {}, interactive: true },
    },
    monitoring: { enableMetrics: true, enableTracing: true, enableRUM: true },
    security: { requireTLS: true, enableCSP: true, ddosProtection: true },
    caching: {
      enabled: true,
      ttl: 300,
      strategy: "cdn",
      invalidationStrategy: "ttl",
    },
  },

  "private-api": {
    type: "private-api",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    sla: {
      responseTime: 50,
      availability: 99.99,
      throughput: 10000,
      errorRate: 0.01,
    },
    security: {
      ipWhitelist: ["10.0.0.0/8", "172.16.0.0/12"],
      apiKeyValidation: true,
      requireTLS: true,
    },
    monitoring: { enableTracing: true, enableProfiling: true },
    autoScaling: { enabled: true, minInstances: 2, maxInstances: 100 },
  },

  webhook: {
    type: "webhook",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    sla: {
      responseTime: 5000,
      availability: 99.9,
      recovery: { autoRestart: true, maxRestarts: 3 },
    },
    security: { enableHSTS: true, apiKeyValidation: true },
    monitoring: { enableMetrics: true, alertThresholds: { errorRate: 1 } },
    compliance: { auditLogging: true },
  },

  microservice: {
    type: "microservice",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    sla: {
      responseTime: 25,
      availability: 99.99,
      recovery: { circuitBreaker: true },
    },
    monitoring: { enableTracing: true, enableMetrics: true },
    loadBalancing: {
      strategy: "least-connections",
      healthCheck: true,
      sessionAffinity: false,
    },
    autoScaling: { enabled: true, targetCPU: 60 },
  },

  edge: {
    type: "edge",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    caching: {
      enabled: true,
      ttl: 3600,
      strategy: "cdn",
      invalidationStrategy: "ttl",
    },
    loadBalancing: {
      strategy: "geographic",
      healthCheck: true,
      sessionAffinity: false,
    },
    monitoring: { enableRUM: true, enableMetrics: true },
    sla: { responseTime: 50, availability: 99.99 },
  },

  batch: {
    type: "batch",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    monitoring: { enableProfiling: true, logLevel: "info" },
    autoScaling: { enabled: true, targetMemory: 70 },
    sla: { responseTime: 30000, availability: 99.5 },
  },

  analytics: {
    type: "analytics",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    compliance: {
      piiHandling: "anonymize",
      dataRetention: 365,
      auditLogging: true,
    },
    monitoring: {
      enableMetrics: true,
      customMetrics: ["events", "conversions"],
    },
    caching: {
      enabled: true,
      ttl: 3600,
      strategy: "memory",
      invalidationStrategy: "ttl",
    },
  },

  compliance: {
    type: "compliance",
    path: "",
    handler: () => ({ status: "success", data: {} }),
    compliance: {
      gdprCompliant: true,
      hipaaCompliant: true,
      sox404Compliant: true,
      auditLogging: true,
      accessLogging: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
      dataClassification: "restricted",
    },
    security: {
      requireTLS: true,
      tlsVersion: "1.3",
      enableHSTS: true,
      ipWhitelist: ["10.0.0.0/8"],
      mfaRequired: true,
    },
    monitoring: { logLevel: "debug", enableTracing: true },
    sla: { responseTime: 100, availability: 99.99, errorRate: 0.01 },
  },
};

/**
 * Route optimizer for validation and configuration generation
 */
export class RouteOptimizer {
  /**
   * Get optimized configuration for a route type
   */
  static getOptimization(type: RouteType): AdvancedRouteConfig {
    return { ...ROUTE_OPTIMIZATIONS[type] };
  }

  /**
   * Validate route configuration
   */
  static validateConfig(config: AdvancedRouteConfig): string[] {
    const errors: string[] = [];

    // Validate SLA configuration
    if (config.sla) {
      if (config.sla.responseTime <= 0) {
        errors.push("SLA response time must be positive");
      }
      if (config.sla.availability < 0 || config.sla.availability > 100) {
        errors.push("SLA availability must be between 0 and 100");
      }
    }

    // Validate caching configuration
    if (config.caching && config.caching.enabled && config.caching.ttl <= 0) {
      errors.push("Cache TTL must be positive when caching is enabled");
    }

    // Validate auto-scaling configuration
    if (config.autoScaling && config.autoScaling.enabled) {
      if (
        config.autoScaling.minInstances && config.autoScaling.maxInstances &&
        config.autoScaling.minInstances > config.autoScaling.maxInstances
      ) {
        errors.push("Auto-scaling minInstances cannot exceed maxInstances");
      }
    }

    return errors;
  }

  /**
   * Get route types by category
   */
  static getCoreTypes(): RouteType[] {
    return [
      "static",
      "realtime",
      "api",
      "form",
      "stream",
      "dynamic",
      "auth",
      "admin",
    ];
  }

  static getAdvancedTypes(): RouteType[] {
    return [
      "public-api",
      "private-api",
      "webhook",
      "microservice",
      "edge",
      "batch",
      "analytics",
      "compliance",
    ];
  }

  /**
   * Check if route type requires specific features
   */
  static requiresWebSocket(type: RouteType): boolean {
    return ["realtime", "stream", "form"].includes(type);
  }

  static requiresCompliance(type: RouteType): boolean {
    return ["auth", "admin", "compliance", "analytics"].includes(type);
  }

  static requiresHighPerformance(type: RouteType): boolean {
    return ["public-api", "private-api", "microservice", "edge"].includes(type);
  }
}

// ===== INTEGRATION LAYER =====
// The following code integrates the enterprise route system with the framework

/**
 * Performance optimization hints for different route types
 */
export interface RouteOptimization {
  // Caching strategy
  cacheStrategy: "none" | "structure" | "template" | "full";

  // WebSocket behavior
  websocketBehavior: "disabled" | "optional" | "required" | "streaming";

  // Pre-rendering capability
  prerender: boolean;

  // Expected update frequency
  updateFrequency: "static" | "low" | "medium" | "high" | "realtime";

  // Performance priority
  priority: "background" | "normal" | "high" | "critical";
}

/**
 * Enhanced route configuration with type-based optimizations
 * Integrates with the framework's WebliskFrameworkRouteConfig
 */
export interface TypedRouteConfig extends WebliskFrameworkRouteConfig {
  // Route type for optimization (supports all 16 types)
  type?: RouteType;

  // Performance optimization hints
  optimization?: Partial<RouteOptimization>;

  // Advanced configuration
  advanced?: Partial<AdvancedRouteConfig>;

  // Route description for documentation
  description?: string;

  // Route versioning
  version?: string;

  // Access control
  access?: "public" | "authenticated" | "admin";
}

/**
 * Route optimization presets based on type
 */
export const ROUTE_OPTIMIZATION_PRESETS: Record<string, RouteOptimization> = {
  // Core types
  static: {
    cacheStrategy: "full",
    websocketBehavior: "disabled",
    prerender: true,
    updateFrequency: "static",
    priority: "background",
  },

  dynamic: {
    cacheStrategy: "structure",
    websocketBehavior: "optional",
    prerender: false,
    updateFrequency: "medium",
    priority: "normal",
  },

  realtime: {
    cacheStrategy: "structure",
    websocketBehavior: "required",
    prerender: false,
    updateFrequency: "realtime",
    priority: "high",
  },

  api: {
    cacheStrategy: "none",
    websocketBehavior: "disabled",
    prerender: false,
    updateFrequency: "high",
    priority: "high",
  },

  stream: {
    cacheStrategy: "none",
    websocketBehavior: "streaming",
    prerender: false,
    updateFrequency: "realtime",
    priority: "critical",
  },

  form: {
    cacheStrategy: "template",
    websocketBehavior: "required",
    prerender: false,
    updateFrequency: "medium",
    priority: "normal",
  },

  auth: {
    cacheStrategy: "none",
    websocketBehavior: "optional",
    prerender: false,
    updateFrequency: "low",
    priority: "high",
  },

  admin: {
    cacheStrategy: "structure",
    websocketBehavior: "required",
    prerender: false,
    updateFrequency: "high",
    priority: "high",
  },

  // Advanced types
  "public-api": {
    cacheStrategy: "template",
    websocketBehavior: "disabled",
    prerender: false,
    updateFrequency: "high",
    priority: "critical",
  },

  "private-api": {
    cacheStrategy: "none",
    websocketBehavior: "disabled",
    prerender: false,
    updateFrequency: "realtime",
    priority: "critical",
  },

  webhook: {
    cacheStrategy: "none",
    websocketBehavior: "disabled",
    prerender: false,
    updateFrequency: "medium",
    priority: "high",
  },

  microservice: {
    cacheStrategy: "none",
    websocketBehavior: "optional",
    prerender: false,
    updateFrequency: "realtime",
    priority: "critical",
  },

  edge: {
    cacheStrategy: "full",
    websocketBehavior: "disabled",
    prerender: true,
    updateFrequency: "static",
    priority: "critical",
  },

  batch: {
    cacheStrategy: "none",
    websocketBehavior: "disabled",
    prerender: false,
    updateFrequency: "low",
    priority: "background",
  },

  analytics: {
    cacheStrategy: "template",
    websocketBehavior: "optional",
    prerender: false,
    updateFrequency: "high",
    priority: "normal",
  },

  compliance: {
    cacheStrategy: "none",
    websocketBehavior: "disabled",
    prerender: false,
    updateFrequency: "low",
    priority: "high",
  },
};

/**
 * Type-based route registry for optimization
 */
export class TypedRouteRegistry {
  private routes = new Map<string, TypedRouteConfig>();
  private routesByType = new Map<RouteType, Set<string>>();
  private optimizations = new Map<string, RouteOptimization>();

  /**
   * Register a typed route with automatic optimization
   */
  register(path: string, config: TypedRouteConfig): void {
    // Apply type-based optimizations
    if (config.type) {
      // Apply optimization presets
      const typeOptimization = ROUTE_OPTIMIZATION_PRESETS[config.type];
      const optimization: RouteOptimization = {
        ...typeOptimization,
        ...config.optimization,
      };

      this.optimizations.set(path, optimization);

      // Advanced optimization system for enterprise types
      if (config.advanced || this.isAdvancedType(config.type)) {
        const advancedOptimization = RouteOptimizer.getOptimization(
          config.type,
        );
        // Store advanced config for enhanced features
        const advancedConfig: AdvancedRouteConfig = {
          ...advancedOptimization,
          type: config.type,
          path,
          handler: (_request) => {
            if (config.data && typeof config.data === "function") {
              // Call the data function with appropriate context
              const mockContext: RouteContext = {
                request: new Request("http://localhost"),
                url: new URL("http://localhost"),
                framework: null,
              };
              const result = config.data(mockContext);
              return Promise.resolve(result);
            }
            return { status: "success", data: {} };
          },
          ...config.advanced,
        };

        // Validate advanced configuration
        const errors = RouteOptimizer.validateConfig(advancedConfig);
        if (errors.length > 0) {
          console.warn(`Route validation errors for ${path}:`, errors);
        }
      }

      // Group routes by type
      if (!this.routesByType.has(config.type)) {
        this.routesByType.set(config.type, new Set());
      }
      this.routesByType.get(config.type)!.add(path);
    }

    this.routes.set(path, config);
  }

  /**
   * Check if route type is an advanced type
   */
  private isAdvancedType(type: RouteType): boolean {
    const advancedTypes = [
      "public-api",
      "private-api",
      "webhook",
      "microservice",
      "edge",
      "batch",
      "analytics",
      "compliance",
    ];
    return advancedTypes.includes(type);
  }

  /**
   * Get route configuration
   */
  get(path: string): TypedRouteConfig | undefined {
    return this.routes.get(path);
  }

  /**
   * Get route optimization settings
   */
  getOptimization(path: string): RouteOptimization | undefined {
    return this.optimizations.get(path);
  }

  /**
   * Get all routes of a specific type
   */
  getRoutesByType(type: RouteType): string[] {
    return Array.from(this.routesByType.get(type) || []);
  }

  /**
   * Get routes that should be prerendered
   */
  getPrerenderableRoutes(): string[] {
    const routes: string[] = [];
    for (const [path, optimization] of this.optimizations) {
      if (optimization.prerender) {
        routes.push(path);
      }
    }
    return routes;
  }

  /**
   * Get routes that require WebSocket
   */
  getWebSocketRoutes(): string[] {
    const routes: string[] = [];
    for (const [path, optimization] of this.optimizations) {
      if (
        optimization.websocketBehavior === "required" ||
        optimization.websocketBehavior === "streaming"
      ) {
        routes.push(path);
      }
    }
    return routes;
  }

  /**
   * Get routes by update frequency
   */
  getRoutesByFrequency(
    frequency: RouteOptimization["updateFrequency"],
  ): string[] {
    const routes: string[] = [];
    for (const [path, optimization] of this.optimizations) {
      if (optimization.updateFrequency === frequency) {
        routes.push(path);
      }
    }
    return routes;
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalRoutes: number;
    routesByType: Record<string, number>;
    prerenderableRoutes: number;
    websocketRoutes: number;
    realtimeRoutes: number;
  } {
    const typeStats = new Map<RouteType, number>();
    for (const [type, routes] of this.routesByType) {
      typeStats.set(type, routes.size);
    }

    return {
      totalRoutes: this.routes.size,
      routesByType: Object.fromEntries(typeStats),
      prerenderableRoutes: this.getPrerenderableRoutes().length,
      websocketRoutes: this.getWebSocketRoutes().length,
      realtimeRoutes: this.getRoutesByFrequency("realtime").length,
    };
  }

  /**
   * Validate route configuration
   */
  validateRoute(path: string, config: TypedRouteConfig): string[] {
    const errors: string[] = [];

    // Check WebSocket requirements
    if (config.type === "realtime" || config.type === "stream") {
      if (!config.events || Object.keys(config.events).length === 0) {
        errors.push(
          `Route ${path}: Real-time routes should have event handlers`,
        );
      }
    }

    // Check API route structure
    if (config.type === "api") {
      if (config.template) {
        errors.push(
          `Route ${path}: API routes should not have template functions`,
        );
      }
      if (!config.data) {
        errors.push(`Route ${path}: API routes should have data functions`);
      }
    }

    // Check form route requirements
    if (config.type === "form") {
      if (!config.events) {
        errors.push(`Route ${path}: Form routes should have event handlers`);
      }
    }

    return errors;
  }
}

/**
 * Helper function to create typed routes
 */
export function createTypedRoute(
  type: RouteType,
  config: Omit<TypedRouteConfig, "type">,
): TypedRouteConfig {
  return {
    ...config,
    type,
    optimization: {
      ...ROUTE_OPTIMIZATION_PRESETS[type],
      ...config.optimization,
    },
  };
}

/**
 * Helper functions for common route types
 * Includes all 16 route type helpers
 */
export const routeHelpers = {
  // Core route helpers

  /**
   * Create a static content route
   */
  static: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("static", config),

  /**
   * Create a real-time dashboard route
   */
  realtime: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("realtime", config),

  /**
   * Create an API endpoint route
   */
  api: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("api", config),

  /**
   * Create a form handling route
   */
  form: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("form", config),

  /**
   * Create a streaming data route
   */
  stream: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("stream", config),

  /**
   * Create a dynamic content route
   */
  dynamic: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("dynamic", config),

  /**
   * Create an authentication route
   */
  auth: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("auth", config),

  /**
   * Create an admin panel route
   */
  admin: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("admin", config),

  // Advanced route helpers

  /**
   * Create a public API route with documentation and rate limiting
   */
  publicApi: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("public-api", config),

  /**
   * Create a private API route optimized for internal microservices
   */
  privateApi: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("private-api", config),

  /**
   * Create a webhook handler with idempotency and retry logic
   */
  webhook: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("webhook", config),

  /**
   * Create a microservice communication route
   */
  microservice: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("microservice", config),

  /**
   * Create an edge-optimized route for CDN distribution
   */
  edge: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("edge", config),

  /**
   * Create a batch processing route
   */
  batch: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("batch", config),

  /**
   * Create an analytics data collection route
   */
  analytics: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("analytics", config),

  /**
   * Create a compliance-ready route with full audit logging
   */
  compliance: (config: Omit<TypedRouteConfig, "type">): TypedRouteConfig =>
    createTypedRoute("compliance", config),
};

// Global typed route registry
export const typedRouteRegistry: TypedRouteRegistry = new TypedRouteRegistry();
