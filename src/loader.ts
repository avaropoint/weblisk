/**
 * Weblisk Framework Loader
 * Convention-based automatic discovery and registration system
 */

import { join, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import { WebliskFramework } from "./weblisk.ts";
import { type RouteConfig, type RouteContext, WebliskRoute } from "./routes.ts";
import { WebliskLogger } from "./logger.ts";
// import type { webSocketManager } from "./websockets.ts";
import {
  componentRegistry,
  type WebliskComponentConfig,
} from "./components.ts";

interface PageModule {
  default?: RouteConfig;
  config?: RouteConfig;
  template?:
    | string
    | ((data: Record<string, unknown>) => string | Promise<string>);
  styles?: string | ((data: Record<string, unknown>) => string);
  clientCode?: string | ((data: Record<string, unknown>) => string);
  data?: Record<string, unknown> | (() => Record<string, unknown>);
  events?: Record<string, (event: Event) => void>;
  layout?: string;
}

interface ComponentModule {
  // Support multiple component export patterns
  default?: WebliskComponentConfig;
  component?: WebliskComponentConfig;
  config?: WebliskComponentConfig;

  // Legacy support for old pattern
  template?:
    | string
    | ((props: Record<string, unknown>) => string | Promise<string>);
  styles?: string | ((props: Record<string, unknown>) => string);
  clientCode?: string | ((props: Record<string, unknown>) => string);
  props?: Record<string, unknown>;
}

export interface LoaderConfig {
  basePath?: string;
  staticPath?: string;
  componentsPath?: string;
  pagesPath?: string;
  layoutComponent?: string;
}

export class WebliskLoader {
  private app: WebliskFramework;
  private config: LoaderConfig;
  private logger: WebliskLogger;
  private components: Map<string, ComponentModule> = new Map();

  constructor(app: WebliskFramework, config: LoaderConfig = {}) {
    this.app = app;
    this.config = {
      basePath: "./src",
      staticPath: "./public",
      componentsPath: "components",
      pagesPath: "pages",
      ...config,
    };
    this.logger = new WebliskLogger();

    // Make component registry globally available for helper functions
    (globalThis as { componentRegistry?: typeof componentRegistry })
      .componentRegistry = componentRegistry;
  }

  /**
   * Load and register all application resources
   */
  async load() {
    this.logger.info("Loading Weblisk application...");

    try {
      // Load in optimal order for dependency resolution
      await this.loadComponents();
      await this.loadPages();
      await this.loadStatic();

      this.logger.info("Application loading complete!");
    } catch (error) {
      this.logger.error(
        "Application loading failed:",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Load all components from both components and layouts directories
   */
  async loadComponents() {
    this.logger.info("Loading components...");

    // Load regular components
    await this.loadComponentsFromDirectory(
      this.config.componentsPath!,
      "Component",
    );

    // Load layout components
    try {
      await this.loadComponentsFromDirectory("layouts", "Layout");
    } catch (_error) {
      this.logger.warn(
        "No layouts directory found, skipping layout loading...",
      );
    }

    this.logger.info(`Loaded ${componentRegistry.list().length} components`);
  }

  /**
   * Load components from a specific directory
   */
  private async loadComponentsFromDirectory(
    dirPath: string,
    _suffix: string = "",
  ) {
    try {
      const componentFiles = await this.discoverFiles(dirPath, ".ts");

      for (const filePath of componentFiles) {
        // Skip index files
        if (filePath.includes("/index.ts")) continue;

        await this.loadComponent(filePath);
      }
    } catch (_error) {
      // Directory doesn't exist, that's okay
    }
  }

  /**
   * Load all pages from the pages directory and auto-register them as routes
   */
  async loadPages() {
    this.logger.info("Loading pages...");

    const _pagesPath = join(this.config.basePath!, this.config.pagesPath!);

    try {
      const pageFiles = await this.discoverFiles(this.config.pagesPath!, ".ts");

      // Load globals first to make them available to pages
      // TODO: Implement globals auto-injection later
      const _globals: Record<string, unknown> = {};

      for (const filePath of pageFiles) {
        try {
          const routePath = this.filePathToRoute(filePath);

          // Import the page module
          const absolutePath = resolve(filePath);
          const module: PageModule = await import(`file://${absolutePath}`);

          const routeConfig = module.default || module.config ||
            this.buildRouteConfig(module);

          await this.app.route(routePath, routeConfig);

          this.logger.info(`Route registered: ${routePath}`, {
            hasStyles: !!routeConfig.styles,
            hasTemplate: !!routeConfig.template,
            hasClientCode: !!routeConfig.clientCode,
            hasData: !!routeConfig.data,
            hasLayout: !!routeConfig.layout,
            eventCount: routeConfig.events
              ? Object.keys(routeConfig.events).length
              : 0,
          });
        } catch (error) {
          this.logger.error(
            `Failed to load page: ${filePath}`,
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      }
    } catch (_error) {
      this.logger.warn("No pages directory found, skipping page loading...");
    }
  }

  /**
   * Load static files using framework's built-in static file manager
   */
  async loadStatic() {
    this.logger.info("Loading static files...");

    try {
      // Use framework's built-in static file loading from public/ directory
      await this.app.loadStaticFiles(this.config.staticPath!);
      this.logger.info("Static files loaded from public directory");
    } catch (_error) {
      this.logger.warn("No public directory found, skipping static files...");
    }
  }

  /**
   * Load a single component and automatically register it
   */
  private async loadComponent(filePath: string) {
    try {
      const absolutePath = resolve(filePath);
      const module: ComponentModule = await import(`file://${absolutePath}`);
      const componentName = this.filePathToComponentName(filePath);

      // Auto-register component with multiple export patterns
      let componentConfig: WebliskComponentConfig | null = null;

      // Try different export patterns
      if (module.default && typeof module.default === "object") {
        componentConfig = module.default;
      } else if (module.component) {
        componentConfig = module.component;
      } else if (module.config) {
        componentConfig = module.config;
      } else {
        // Build config from legacy exports
        componentConfig = {
          template: typeof module.template === "function"
            ? async (
              props: Record<string, unknown>,
              context?: RouteContext,
            ) => {
              const templateFn = module.template as (
                props: Record<string, unknown>,
                context?: RouteContext,
              ) => string | Promise<string>;
              const result = templateFn(props, context);
              return result instanceof Promise ? await result : result;
            }
            : () => (typeof module.template === "string"
              ? module.template
              : "<div>&nbsp;</div>"),
          styles: typeof module.styles === "function"
            ? module.styles as (
              props: Record<string, unknown>,
              context?: RouteContext,
            ) => string
            : () => (typeof module.styles === "string" ? module.styles : ""),
          clientCode: typeof module.clientCode === "function"
            ? module.clientCode as (props: Record<string, unknown>) => string
            : () => (typeof module.clientCode === "string"
              ? module.clientCode
              : ""),
        };
      }

      if (componentConfig) {
        // Set the component name in the config for style tracking
        componentConfig.name = componentName;

        // Automatically register the component
        componentRegistry.register(componentName, componentConfig);
        this.logger.info(`Component auto-registered: ${componentName}`);
      }

      // Legacy: Store component for backwards compatibility
      this.components.set(componentName, module);

      // Legacy: Make components globally available
      const globalWithComponents = globalThis as {
        webliskComponents?: Record<string, ComponentModule>;
      };
      if (!globalWithComponents.webliskComponents) {
        globalWithComponents.webliskComponents = {};
      }
      globalWithComponents.webliskComponents[componentName] = module;

      this.logger.debug(`Component: ${componentName}`);
    } catch (error) {
      this.logger.error(
        `Failed to load component ${filePath}:`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Load a single page with full framework integration
   */
  private async loadPage(filePath: string) {
    try {
      const absolutePath = resolve(filePath);
      const module: PageModule = await import(`file://${absolutePath}`);
      const routePath = this.filePathToRoute(filePath);

      // Build route config using framework capabilities
      const config = module.default || module.config ||
        this.buildRouteConfig(module);

      // Register route with the framework
      this.app.route(routePath, config);

      this.logger.debug(`Route: ${routePath} -> ${filePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to load page ${filePath}:`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Build route config from module exports
   */
  private buildRouteConfig(module: PageModule): RouteConfig {
    const clientCode = typeof module.clientCode === "function"
      ? module.clientCode as (data: Record<string, unknown>) => string
      : (() => (typeof module.clientCode === "string"
        ? module.clientCode
        : ""));

    return {
      template: typeof module.template === "function"
        ? async (data: Record<string, unknown>) => {
          const templateFn = module.template as (
            data: Record<string, unknown>,
          ) => string | Promise<string>;
          const result = templateFn(data);
          return result instanceof Promise ? await result : result;
        }
        : (() => (typeof module.template === "string"
          ? module.template
          : "<div>&nbsp;</div>")),
      styles: typeof module.styles === "function"
        ? module.styles as (data: Record<string, unknown>) => string
        : (() => (typeof module.styles === "string" ? module.styles : "")),
      clientCode,
      data: typeof module.data === "function"
        ? module.data as (context: RouteContext) => Record<string, unknown> | Promise<Record<string, unknown>>
        : (module.data ? () => module.data as Record<string, unknown> : undefined),
      events: (module.events || {}) as unknown as Record<
        string,
        (data: Record<string, unknown>, context: RouteContext) => unknown
      >,
      layout: module.layout, // Include layout property
    };
  }

  /**
   * Discover files in a directory recursively
   */
  private async discoverFiles(
    dirPath: string,
    extension?: string,
  ): Promise<string[]> {
    const files: string[] = [];
    const fullPath = join(this.config.basePath!, dirPath);

    const walkDir = async (currentPath: string) => {
      try {
        for await (const entry of Deno.readDir(currentPath)) {
          const entryPath = join(currentPath, entry.name);

          if (entry.isDirectory) {
            await walkDir(entryPath);
          } else if (entry.isFile) {
            if (!extension || entry.name.endsWith(extension)) {
              files.push(entryPath);
            }
          }
        }
      } catch (error) {
        throw error;
      }
    };

    await walkDir(fullPath);
    return files.sort();
  }

  /**
   * Convert file path to route path
   * Examples:
   * - pages/index.ts -> /
   * - pages/about.ts -> /about
   * - pages/blog/post.ts -> /blog/post
   * - pages/api/users/[id].ts -> /api/users/:id
   */
  private filePathToRoute(filePath: string): string {
    const basePath = join(this.config.basePath!, this.config.pagesPath!);
    let route = filePath
      .replace(basePath, "")
      .replace(/\.ts$/, "")
      .replace(/\.js$/, "");

    // Handle index files
    if (route.endsWith("/index") || route === "/index") {
      route = route.replace("/index", "") || "/";
    }

    // Handle dynamic routes [param] -> :param
    route = route.replace(/\[([^\]]+)\]/g, ":$1");

    // Ensure leading slash
    if (!route.startsWith("/")) {
      route = "/" + route;
    }

    // Fix double slashes
    route = route.replace(/\/+/g, "/");

    return route;
  }

  /**
   * Convert file path to component name
   */
  private filePathToComponentName(filePath: string): string {
    // Handle layout components specially
    if (filePath.includes("/layouts/")) {
      return filePath
        .split("/layouts/")[1]
        .replace(/\.ts$/, "")
        .replace(/\.js$/, "");
    }

    // Handle regular components
    const basePath = join(
      this.config.basePath!,
      this.config.componentsPath!,
    );
    return filePath
      .replace(basePath + "/", "")
      .replace(/\.ts$/, "")
      .replace(/\.js$/, "")
      .replace(/\//g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "_");
  }
}

/**
 * Helper function to create and load a Weblisk application
 */
export async function createApp(
  frameworkConfig?: Record<string, unknown>,
  loaderConfig?: LoaderConfig,
): Promise<WebliskFramework> {
  const logger = new WebliskLogger();

  logger.info("Creating Weblisk application...");

  const app = new WebliskFramework(frameworkConfig);

  // Set up global app configuration - NO STYLES from framework
  WebliskRoute.setAppConfig({
    appName: "Weblisk Application",
    appDescription: "Built with Weblisk Framework",
    layoutComponent: "Layout", // Use the Layout component globally
    // NO globalStyles - let developers handle all styling
  });
  const loader = new WebliskLoader(app, loaderConfig);

  await loader.load();

  logger.info("Weblisk application ready!");

  return app;
}
