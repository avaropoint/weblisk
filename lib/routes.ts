/**
 * Weblisk Framework - Routes Module
 * Contains all route-related classes, interfaces, and functionality
 */

import { type RouteContext, WebliskError } from "./types.ts";
import { css, html, js } from "./helpers.ts";

// Re-export helpers for convenience
export { css, html, js };

/**
 * Comprehensive meta configuration for production web applications
 */
export interface WebliskMeta {
  // Basic meta
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  language?: string;
  charset?: string;

  // SEO meta
  canonical?: string;
  robots?: string;

  // Open Graph (Facebook)
  og?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    locale?: string;
  };

  // Twitter Cards
  twitter?: {
    card?: string;
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
  };

  // Additional meta tags
  viewport?: string;
  themeColor?: string;
  manifest?: string;
  appleTouchIcon?: string;
  favicon?: string;

  // Custom meta tags
  custom?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
}

/**
 * HTML document configuration
 */
export interface WebliskHtmlConfig {
  lang?: string;
  dir?: "ltr" | "rtl";
  meta?: WebliskMeta;
  bodyClass?: string;
  bodyId?: string;
  appContainerId?: string;
  appContainerClass?: string;
}
/**
 * Weblisk Framework Route Configuration Interface
 */
export interface WebliskFrameworkRouteConfig {
  // Server-rendered HTML template
  template?: (data: Record<string, unknown>) => string;

  // Dynamic styles with server data access
  styles?: (data: Record<string, unknown>) => string;

  // Client-side enhancement code
  clientCode?: (data: Record<string, unknown>) => string;

  // Server-side data preparation
  data?: (context: RouteContext) => Promise<Record<string, unknown>> | Record<string, unknown>;

  // WebSocket event handlers
  events?: Record<string, (data: Record<string, unknown>, context: RouteContext) => Promise<unknown> | unknown>;

  // Route metadata and HTML configuration
  meta?: WebliskMeta;
  html?: WebliskHtmlConfig;
}

/**
 * Global application configuration interface
 */
export interface WebliskAppConfig {
  // Global app settings
  appName?: string;
  appDescription?: string;
  defaultTitle?: string;
  defaultDescription?: string;

  // Global template overrides
  htmlTemplate?: (
    content: string,
    data: Record<string, unknown>,
    meta: WebliskMeta,
    htmlConfig: WebliskHtmlConfig,
  ) => string;
  globalStyles?: (data: Record<string, unknown>) => string;
  globalClientCode?: (data: Record<string, unknown>) => string;
  globalData?: (context: RouteContext) => Promise<Record<string, unknown>> | Record<string, unknown>;
  globalEvents?: Record<
    string,
    (data: Record<string, unknown>, context: RouteContext) => Promise<unknown> | unknown
  >;

  // Global defaults
  defaultMeta?: WebliskMeta;
  defaultHtml?: WebliskHtmlConfig;

  // Static file configuration
  staticRoutes?: Record<string, string>; // path -> file content or file path
}

/**
 * WebliskRoute - Single-file route class with proper inheritance
 */
export class WebliskRoute {
  protected config: WebliskFrameworkRouteConfig;
  protected userConfig: Partial<WebliskFrameworkRouteConfig>;
  protected static appConfig: WebliskAppConfig = {};

  constructor(config: Partial<WebliskFrameworkRouteConfig> = {}) {
    // Store user config to avoid circular references
    this.userConfig = config;

    // Merge with framework defaults
    this.config = {
      // Framework default template structure - ALWAYS use defaultHtmlTemplate
      template: (data) => this.defaultHtmlTemplate(data),

      // Framework default styles
      styles: (data) => this.buildStyles(data),

      // Framework default client code
      clientCode: (data) => this.buildClientCode(data),

      // Framework default data
      data: (context) => this.buildData(context),

      // Framework default events - safe initialization
      events: {},

      // Framework default meta
      meta: {},

      // Override with user config (but NOT template - that's handled in defaultHtmlTemplate)
      ...Object.fromEntries(
        Object.entries(this.userConfig).filter(([key]) => key !== "template"),
      ),
    };

    // Now build events and meta properly after config is set
    this.config.events = this.buildEvents();
    this.config.meta = this.buildMeta();
  }

  /**
   * Set global application configuration - called once from app.ts
   */
  static setAppConfig(config: WebliskAppConfig): void {
    WebliskRoute.appConfig = { ...WebliskRoute.appConfig, ...config };
  }

  /**
   * Get the default HTML template structure
   */
  protected defaultHtmlTemplate(data: Record<string, unknown>): string {
    const meta = this.buildMeta();
    const htmlConfig = this.buildHtmlConfig();

    // Use app config HTML template if available
    if (WebliskRoute.appConfig.htmlTemplate) {
      const userContent = this.userConfig.template
        ? this.userConfig.template(data)
        : "<h1>Welcome to Weblisk</h1>";
      return WebliskRoute.appConfig.htmlTemplate(
        userContent,
        data,
        meta,
        htmlConfig,
      );
    }

    // Default framework template with comprehensive meta support
    return html`
      <!DOCTYPE html>
      <html lang="${htmlConfig.lang || "en"}" ${htmlConfig.dir
        ? `dir="${htmlConfig.dir}"`
        : ""}>
        <head>
          <meta charset="${meta.charset || "UTF-8"}">
          <meta name="viewport" content="${meta.viewport ||
            "width=device-width, initial-scale=1.0"}">

          <title>${meta.title || data.title || "Weblisk App"}</title>
          <meta name="description" content="${meta.description ||
            data.description || "Built with Weblisk Framework"}">
          ${meta.keywords
            ? `<meta name="keywords" content="${
              Array.isArray(meta.keywords)
                ? meta.keywords.join(", ")
                : meta.keywords
            }">`
            : ""} ${meta.author
            ? `<meta name="author" content="${meta.author}">`
            : ""} ${meta.robots
            ? `<meta name="robots" content="${meta.robots}">`
            : ""} ${meta.canonical
            ? `<link rel="canonical" href="${meta.canonical}">`
            : ""} ${meta.themeColor
            ? `<meta name="theme-color" content="${meta.themeColor}">`
            : ""} ${meta.manifest
            ? `<link rel="manifest" href="${meta.manifest}">`
            : ""}
          ${meta.favicon
            ? `<link rel="icon" href="${meta.favicon}">`
            : ""} ${meta.appleTouchIcon
            ? `<link rel="apple-touch-icon" href="${meta.appleTouchIcon}">`
            : ""} ${this.buildOpenGraphMeta(meta.og)} ${this.buildTwitterMeta(
              meta.twitter,
            )} ${this.buildCustomMeta(meta.custom)}

          <style>
          ${this.buildStyles(data)}
          </style>
        </head>
        <body ${htmlConfig.bodyClass
          ? `class="${htmlConfig.bodyClass}"`
          : ""} ${htmlConfig.bodyId ? `id="${htmlConfig.bodyId}"` : ""}>
          <div ${htmlConfig.appContainerId
            ? `id="${htmlConfig.appContainerId}"`
            : 'id="app"'} ${htmlConfig.appContainerClass
            ? `class="${htmlConfig.appContainerClass}"`
            : ""}>
            ${this.userConfig.template
              ? this.userConfig.template(data)
              : "<h1>Welcome to Weblisk</h1>"}
          </div>
          <script>
          ${this.buildClientCode(data)}
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Build Open Graph meta tags
   */
  protected buildOpenGraphMeta(og?: WebliskMeta["og"]): string {
    if (!og) return "";

    const tags = [];
    if (og.title) tags.push(`<meta property="og:title" content="${og.title}">`);
    if (og.description) {
      tags.push(`<meta property="og:description" content="${og.description}">`);
    }
    if (og.image) tags.push(`<meta property="og:image" content="${og.image}">`);
    if (og.url) tags.push(`<meta property="og:url" content="${og.url}">`);
    if (og.type) tags.push(`<meta property="og:type" content="${og.type}">`);
    if (og.siteName) {
      tags.push(`<meta property="og:site_name" content="${og.siteName}">`);
    }
    if (og.locale) {
      tags.push(`<meta property="og:locale" content="${og.locale}">`);
    }

    return tags.join("\n        ");
  }

  /**
   * Build Twitter meta tags
   */
  protected buildTwitterMeta(twitter?: WebliskMeta["twitter"]): string {
    if (!twitter) return "";

    const tags = [];
    if (twitter.card) {
      tags.push(`<meta name="twitter:card" content="${twitter.card}">`);
    }
    if (twitter.site) {
      tags.push(`<meta name="twitter:site" content="${twitter.site}">`);
    }
    if (twitter.creator) {
      tags.push(`<meta name="twitter:creator" content="${twitter.creator}">`);
    }
    if (twitter.title) {
      tags.push(`<meta name="twitter:title" content="${twitter.title}">`);
    }
    if (twitter.description) {
      tags.push(
        `<meta name="twitter:description" content="${twitter.description}">`,
      );
    }
    if (twitter.image) {
      tags.push(`<meta name="twitter:image" content="${twitter.image}">`);
    }

    return tags.join("\n        ");
  }

  /**
   * Build custom meta tags
   */
  protected buildCustomMeta(custom?: WebliskMeta["custom"]): string {
    if (!custom || !Array.isArray(custom)) return "";

    return custom.map((tag) => {
      if (tag.name) {
        return `<meta name="${tag.name}" content="${tag.content}">`;
      } else if (tag.property) {
        return `<meta property="${tag.property}" content="${tag.content}">`;
      }
      return "";
    }).filter(Boolean).join("\n        ");
  }

  /**
   * Build HTML configuration by merging framework → app → route config
   */
  protected buildHtmlConfig(): WebliskHtmlConfig {
    const frameworkHtml: WebliskHtmlConfig = {
      lang: "en",
      appContainerId: "app",
    };

    const appHtml = WebliskRoute.appConfig.defaultHtml || {};
    const userRouteHtml = this.userConfig.html || {};

    return { ...frameworkHtml, ...appHtml, ...userRouteHtml };
  }
  protected buildStyles(data: Record<string, unknown>): string {
    const frameworkStyles = css`
    `; // empty

    const appStyles = WebliskRoute.appConfig.globalStyles
      ? WebliskRoute.appConfig.globalStyles(data)
      : "";

    // Get user route-specific styles (only if not the default framework styles)
    const userRouteConfig = this.getUserConfig();
    const routeStyles = userRouteConfig.styles
      ? userRouteConfig.styles(data)
      : "";

    return [frameworkStyles, appStyles, routeStyles].filter(Boolean).join(
      "\n\n",
    );
  }

  /**
   * Build the complete client code by combining framework → app → route code
   */
  protected buildClientCode(data: Record<string, unknown>): string {
    const frameworkClientCode = js`
      // Weblisk Framework initialization
      console.log('Weblisk Framework initialized');

      window.WebliskApp = {
        data: ${JSON.stringify(data)},

        sendEvent(event, payload = {}) {
          if (window.weblisk) {
            window.weblisk.sendEvent('route', event, payload);
          }
        },

        notify(message, type = 'info') {
          console.log(\`[\${type.toUpperCase()}] \${message}\`);
        }
      };

      // Initialize WebSocket client
      if (typeof WebSocket !== 'undefined') {
        window.weblisk = {
          ws: null,
          eventHandlers: {},
          isConnected: false,

          connect() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
              this.isConnected = true;
              console.log('WebSocket connected');
            };

            this.ws.onmessage = (event) => {
              try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
              } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
              }
            };

            this.ws.onclose = () => {
              this.isConnected = false;
              console.log('WebSocket disconnected');
              // Attempt to reconnect after 3 seconds
              setTimeout(() => this.connect(), 3000);
            };

            this.ws.onerror = (error) => {
              console.error('WebSocket error:', error);
            };
          },

          sendEvent(component, event, data) {
            if (this.ws && this.isConnected) {
              this.ws.send(JSON.stringify({
                type: 'server-event',
                component,
                event,
                payload: data
              }));
            }
          },

          on(event, handler) {
            if (!this.eventHandlers[event]) {
              this.eventHandlers[event] = [];
            }
            this.eventHandlers[event].push(handler);
          },

          handleMessage(message) {
            if (message.type === 'event-result' && this.eventHandlers[message.event]) {
              this.eventHandlers[message.event].forEach(handler => handler(message.result));
            }
          }
        };

        // Auto-connect when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            window.weblisk.connect();
          });
        } else {
          // DOM is already ready
          window.weblisk.connect();
        }
      }
    `;

    const appClientCode = WebliskRoute.appConfig.globalClientCode
      ? WebliskRoute.appConfig.globalClientCode(data)
      : "";

    // Get user route-specific client code (only if not the default framework client code)
    const userRouteClientCode = this.userConfig.clientCode
      ? this.userConfig.clientCode(data)
      : "";

    return [frameworkClientCode, appClientCode, userRouteClientCode].filter(
      Boolean,
    ).join("\n\n");
  }

  /**
   * Build the complete data by merging framework → app → route data
   */
  protected async buildData(context: RouteContext): Promise<Record<string, unknown>> {
    const frameworkData = {
      timestamp: new Date().toLocaleString(),
      sessionId: context.sessionId || "",
      environment: context.framework.getEnvironment(),
    };

    const appData = WebliskRoute.appConfig.globalData
      ? await WebliskRoute.appConfig.globalData(context)
      : {};

    // Get user route-specific data (only if not the default framework data)
    const userRouteData = this.userConfig.data
      ? await this.userConfig.data(context)
      : {};

    return { ...frameworkData, ...appData, ...userRouteData };
  }

  /**
   * Build the complete events by merging framework → app → route events
   */
  protected buildEvents(): Record<string, (data: Record<string, unknown>, context: RouteContext) => Promise<unknown> | unknown> {
    const frameworkEvents = {
      "ping": () => ({ pong: true, timestamp: Date.now() }),
    };

    const appEvents = WebliskRoute.appConfig.globalEvents || {};
    const userRouteEvents = this.userConfig.events || {};

    return { ...frameworkEvents, ...appEvents, ...userRouteEvents };
  }

  /**
   * Build the complete meta by merging framework → app → route meta
   */
  protected buildMeta(): WebliskMeta {
    const frameworkMeta: WebliskMeta = {
      title: "Weblisk App",
      description: "Built with Weblisk Framework",
      keywords: ["weblisk", "web-app"],
      charset: "UTF-8",
      viewport: "width=device-width, initial-scale=1.0",
    };

    const appMeta = WebliskRoute.appConfig.defaultMeta || {};
    const userRouteMeta = this.userConfig.meta || {};

    // Deep merge for nested objects
    const merged = { ...frameworkMeta, ...appMeta, ...userRouteMeta };

    // Merge nested objects properly
    if (appMeta.og || userRouteMeta.og) {
      merged.og = { ...appMeta.og, ...userRouteMeta.og };
    }
    if (appMeta.twitter || userRouteMeta.twitter) {
      merged.twitter = { ...appMeta.twitter, ...userRouteMeta.twitter };
    }
    if (appMeta.custom || userRouteMeta.custom) {
      merged.custom = [
        ...(appMeta.custom || []),
        ...(userRouteMeta.custom || []),
      ];
    }

    return merged;
  }

  /**
   * Get the original user configuration without framework defaults
   */
  getUserConfig(): Partial<WebliskFrameworkRouteConfig> {
    // This should be stored during construction to avoid circular references
    return this.userConfig || {};
  }

  /**
   * Render the complete route by building the final HTML
   */
  async render(context: RouteContext): Promise<string> {
    const data = await this.buildData(context);
    return this.config.template!(data);
  }

  /**
   * Handle WebSocket events for this route
   */
  async handleEvent(eventName: string, data: Record<string, unknown>, context: RouteContext): Promise<unknown> {
    const events = this.buildEvents();
    const handler = events[eventName];

    if (!handler) {
      throw new WebliskError(`Event handler '${eventName}' not found`);
    }

    return await handler(data, context);
  }

  /**
   * Get event handlers (for testing/debugging)
   */
  getEventHandlers(): Record<string, (data: Record<string, unknown>, context: RouteContext) => Promise<unknown> | unknown> {
    return this.buildEvents();
  }
}

// Single-file route configuration (kept for backward compatibility)
export interface RouteConfig extends WebliskFrameworkRouteConfig {}
