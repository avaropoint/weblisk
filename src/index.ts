/**
 * Weblisk Framework - Main Library Interface
 * A minimal, developer-friendly HTML-over-WebSocket framework for Deno
 *
 * @example
 * ```typescript
 * import { Weblisk } from "https://deno.land/x/weblisk/mod.ts";
 *
 * const app = new Weblisk();
 *
 * app.route("/", {
 *   template: () => `<h1>Hello World!</h1>`,
 *   events: {
 *     "click": () => ({ message: "Button clicked!" })
 *   }
 * });
 *
 * app.start();
 * ```
 */

// Import RouteConfig type for internal use
import type { RouteConfig } from "./routes.ts";

// Core framework
export { WebliskFramework as Weblisk } from "./weblisk.ts";
export { WebliskFramework } from "./weblisk.ts";

// Auto-loader for convention-based apps
export { createApp, WebliskLoader } from "./loader.ts";
export type { LoaderConfig } from "./loader.ts";

// Route system
export {
  type RouteConfig,
  type WebliskAppConfig,
  type WebliskFrameworkRouteConfig,
  WebliskRoute,
} from "./routes.ts";

// Helper utilities
export { css, html, js } from "./helpers.ts";

// Enhanced form processing
export {
  type FileUploadConfig,
  FileUploadProcessor,
  fileUploadProcessor,
  type FormProcessorConfig,
  type FormValidationResult,
  type FormValidationRule,
  type FormValidationRules,
  generateFormClientCode,
} from "./forms.ts";

// Advanced Route Type System (16 route types)
export {
  type AdvancedRouteConfig,
  type APIManagementConfig,
  type ComplianceConfig,
  type MonitoringConfig,
  ROUTE_OPTIMIZATIONS as ADVANCED_ROUTE_OPTIMIZATIONS,
  RouteOptimizer,
  type RouteType,
  type SecurityConfig,
  type SLAConfig,
} from "./route-types.ts";

// Type-based routing system (enhanced with advanced features)
export {
  createTypedRoute,
  ROUTE_OPTIMIZATION_PRESETS as ROUTE_OPTIMIZATIONS,
  routeHelpers,
  type RouteOptimization,
  type TypedRouteConfig,
  TypedRouteRegistry,
  typedRouteRegistry,
} from "./route-types.ts";

// Real-time database integration
export {
  createDatabase,
  DatabaseAdapter,
  type DatabaseConfig,
  // DenoKVAdapter removed - too opinionated for framework
  type QueryOptions,
  realtimeHelpers,
  type StreamOptions,
  WebliskDatabase,
} from "./database.ts";

// Performance caching system
export {
  type CacheConfig,
  type CachedStructure,
  WebliskCache,
  webliskCache,
} from "./cache.ts";

// Configuration
export { type WebliskConfig, WebliskConfigManager } from "./config.ts";

// Types
export type {
  ComponentContext,
  ComponentDefinition,
  IWebliskFramework,
  RouteContext,
  ServerEventMessage,
  WebliskMessage,
  WebSocketConnection,
} from "./types.ts";

// Specialized modules (for advanced usage)
export { StaticFileManager, staticFileManager } from "./static.ts";
export { CookieManager } from "./cookies.ts";
export { WebSocketManager, webSocketManager } from "./websockets.ts";
export { FrameworkMonitor, frameworkMonitor } from "./monitor.ts";

// Security and logging
export { security } from "./security.ts";
export { logger } from "./logger.ts";

// Errors
export { ComponentError, WebliskError } from "./types.ts";

/**
 * Quick start function for simple applications
 *
 * @example
 * ```typescript
 * import { quickStart } from "https://deno.land/x/weblisk/mod.ts";
 *
 * quickStart({
 *   "/": {
 *     template: () => `<h1>Hello World!</h1>`,
 *     events: {
 *       "click": () => ({ message: "Clicked!" })
 *     }
 *   }
 * });
 * ```
 */
export async function quickStart(
  routes: Record<string, RouteConfig>,
  port = 3000,
): Promise<void> {
  const { WebliskFramework } = await import("./weblisk.ts");
  const app = new WebliskFramework({
    server: {
      port,
      hostname: "localhost",
      enableHttps: false,
    },
  });

  for (const [path, config] of Object.entries(routes)) {
    app.route(path, config);
  }

  return app.start();
}

/**
 * Create a new Weblisk framework instance with sensible defaults
 *
 * @example
 * ```typescript
 * import { createFramework } from "https://deno.land/x/weblisk/mod.ts";
 *
 * const app = createFramework({
 *   port: 8000,
 *   development: true
 * });
 *
 * app.route("/", {
 *   template: () => `<h1>Hello!</h1>`
 * });
 *
 * app.start();
 * ```
 */
export async function createFramework(options: {
  port?: number;
  development?: boolean;
  https?: boolean;
  hostname?: string;
} = {}): Promise<import("./weblisk.ts").WebliskFramework> {
  const { WebliskFramework } = await import("./weblisk.ts");

  const config = {
    server: {
      port: options.port || 3000,
      hostname: options.hostname || "localhost",
      enableHttps: options.https || false,
    },
    development: {
      debugMode: options.development || false,
      enableDevTools: options.development || false,
    },
  };

  return new WebliskFramework(config);
}

/**
 * Framework version
 */
export const VERSION = "1.0.0";

/**
 * Framework information
 */
export const FRAMEWORK_INFO = {
  name: "Weblisk",
  version: VERSION,
  description: "A minimal HTML-over-WebSocket framework for Deno",
  homepage: "https://weblisk.dev",
  repository: "https://github.com/avaropoint/weblisk",
} as const;
