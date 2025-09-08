/**
 * Weblisk Framework - Routes Module
 * Contains all route-related classes, interfaces, and functionality
 */

import { type RouteContext, WebliskError } from "./types.ts";
import { css, html, js } from "./helpers.ts";
// import type { security } from "./security.ts";
import { getComponentStyles } from "./components.ts";

// Type for component registry access
type GlobalWithRegistry = typeof globalThis & {
  componentRegistry?: typeof import("./components.ts").componentRegistry;
};

// Re-export types
export type { RouteContext };

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
  template?: (data: Record<string, unknown>) => string | Promise<string>;

  // Dynamic styles with server data access
  styles?: (data: Record<string, unknown>) => string | Promise<string>;

  // Client-side enhancement code
  clientCode?: (data: Record<string, unknown>) => string | Promise<string>;

  // Server-side data preparation
  data?: (
    context: RouteContext,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;

  // WebSocket event handlers
  events?: Record<
    string,
    (
      data: Record<string, unknown>,
      context: RouteContext,
    ) => Promise<unknown> | unknown
  >;

  // Layout component for this route (flexible format)
  layout?: string | { component: string; props?: Record<string, unknown> };

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
  globalData?: (
    context: RouteContext,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  globalEvents?: Record<
    string,
    (
      data: Record<string, unknown>,
      context: RouteContext,
    ) => Promise<unknown> | unknown
  >;

  // Global layout component
  layoutComponent?: string;

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
      template: async (data) => await this.defaultHtmlTemplate(data),

      // Framework default styles
      styles: async (data) => await this.buildStyles(data),

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
  protected async defaultHtmlTemplate(
    data: Record<string, unknown>,
  ): Promise<string> {
    const meta = this.buildMeta();
    const htmlConfig = this.buildHtmlConfig();

    // Use app config HTML template if available
    if (WebliskRoute.appConfig.htmlTemplate) {
      const userContent = this.userConfig.template
        ? await this.userConfig.template(data)
        : "<h1>Welcome to Weblisk</h1>";
      return WebliskRoute.appConfig.htmlTemplate(
        userContent,
        data,
        meta,
        htmlConfig,
      );
    }

    // Get user content (handling both sync and async templates)
    let userContent = "<h1>Welcome to Weblisk</h1>";
    if (this.userConfig.template) {
      const templateResult = this.userConfig.template(data);
      userContent = templateResult instanceof Promise
        ? await templateResult
        : templateResult;
    }

    // Wrap user content with layout if configured
    const finalContent = await this.renderWithLayout(userContent, data);

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
          ${await this.buildStyles(data)}
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
            ${finalContent}
          </div>
          <script>
          ${this.buildClientCode(data)}
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Render page content with layout template if configured
   */
  protected async renderWithLayout(
    userContent: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    let layoutComponent: string | undefined;
    let layoutProps: Record<string, unknown> = { ...data };

    // Check route-specific layout configuration
    const userRouteConfig = this.getUserConfig();
    if (userRouteConfig.layout) {
      // Handle new layout system
      if (
        typeof userRouteConfig.layout === "object" &&
        userRouteConfig.layout.component
      ) {
        layoutComponent = userRouteConfig.layout.component;
        layoutProps = { ...layoutProps, ...userRouteConfig.layout.props };
      } else if (typeof userRouteConfig.layout === "string") {
        layoutComponent = userRouteConfig.layout;
      }
    }

    // Fallback to global layout component
    if (!layoutComponent) {
      layoutComponent = WebliskRoute.appConfig.layoutComponent;
    }

    if (layoutComponent) {
      // Try to get layout template from the component registry
      const registry = (globalThis as GlobalWithRegistry).componentRegistry;
      if (registry) {
        const layout = registry.get(layoutComponent);
        if (layout && layout.config.template) {
          // Add the page content to layout props
          layoutProps.content = userContent;
          layoutProps.children = userContent;

          // Render the layout template with props
          const layoutResult = layout.config.template(layoutProps);
          return layoutResult instanceof Promise
            ? await layoutResult
            : layoutResult;
        }
      }
    }

    // No layout found, return content as-is
    return userContent;
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
  protected async buildStyles(data: Record<string, unknown>): Promise<string> {
    // No framework styles - developers control all styling

    // Global app styles (if developer configures them)
    const appStyles = WebliskRoute.appConfig.globalStyles
      ? await WebliskRoute.appConfig.globalStyles(data)
      : "";

    // Layout styles (if layout component is used)
    const layoutStyles = await this.getLayoutStyles(data);

    // Page-specific styles
    const userRouteConfig = this.getUserConfig();
    const pageStyles = userRouteConfig.styles
      ? await userRouteConfig.styles(data)
      : "";

    // Component styles (highest priority)
    const componentStyles = getComponentStyles();

    // CSS Cascade Order: App → Layout → Page → Components
    // Framework provides NO styles - all styling is developer-controlled
    // Filter out empty styles and trim whitespace
    const allStyles = await Promise.all([
      Promise.resolve(appStyles),
      Promise.resolve(layoutStyles),
      Promise.resolve(pageStyles),
      Promise.resolve(componentStyles),
    ]);

    return allStyles
      .map((style) => style?.trim())
      .filter((style) => style && style.length > 0)
      .join("\n\n");
  }

  /**
   * Get layout component styles if a layout is configured
   */
  protected async getLayoutStyles(
    data: Record<string, unknown>,
  ): Promise<string> {
    let layoutComponent: string | undefined;

    // Check route-specific layout configuration
    const userRouteConfig = this.getUserConfig();
    if (userRouteConfig.layout) {
      // Handle new layout system
      if (
        typeof userRouteConfig.layout === "object" &&
        userRouteConfig.layout.component
      ) {
        layoutComponent = userRouteConfig.layout.component;
      } else if (typeof userRouteConfig.layout === "string") {
        layoutComponent = userRouteConfig.layout;
      }
    }

    // Fallback to global layout component
    if (!layoutComponent) {
      layoutComponent = WebliskRoute.appConfig.layoutComponent;
    }

    if (layoutComponent) {
      // Try to get layout styles from the component registry
      const registry = (globalThis as GlobalWithRegistry).componentRegistry;
      if (registry) {
        const layout = registry.get(layoutComponent);
        if (layout && layout.config.styles) {
          // Merge layout props if available
          const layoutProps = typeof userRouteConfig.layout === "object"
            ? { ...userRouteConfig.layout.props, ...data }
            : data;

          // Handle both sync and async styles
          const styles = layout.config.styles(layoutProps);
          return typeof styles === "string" ? styles : await styles;
        }
      }
    }

    return "";
  }

  /**
   * Build the complete client code by combining framework → app → route code
   */
  protected buildClientCode(data: Record<string, unknown>): string {
    const frameworkClientCode = js`
      // Weblisk Framework - Unified Client-Side Framework
      console.log('Weblisk Framework initialized');

      window.Weblisk = {
        // App data and state
        data: ${JSON.stringify(data)},

        // Event system
        sendEvent(event, payload = {}) {
          if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
              type: 'server-event',
              component: 'route',
              event,
              payload
            }));
          }
        },

        emit(event, data) {
          if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
              type: 'server-event',
              component: 'route',
              event,
              payload: data
            }));
          }
        },

        notify(message, type = 'info') {
          console.log(\`[\${type.toUpperCase()}] \${message}\`);
        },

        // Real-time Component Updates
        updateComponent(componentId, newProps) {
          const element = document.querySelector(\`[data-component-id="\${componentId}"]\`);
          if (element && window.componentRegistry) {
            const componentName = element.getAttribute('data-component-name');
            const component = window.componentRegistry.get(componentName);
            if (component && component.config.template) {
              const newHtml = component.config.template(newProps);
              element.innerHTML = newHtml;
              
              // Re-run client code if it exists
              if (component.config.clientCode) {
                try {
                  const clientCodeFn = new Function('props', 'element', component.config.clientCode);
                  clientCodeFn(newProps, element);
                } catch (error) {
                  console.error('Error running component client code:', error);
                }
              }
            }
          }
        },

        updatePage(newData) {
          // Update page data
          this.data = { ...this.data, ...newData };
          
          // Trigger custom page update event
          const event = new CustomEvent('weblisk:page-update', { detail: newData });
          document.dispatchEvent(event);
        },

        on(event, handler) {
          if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
          }
          this.eventHandlers[event].push(handler);
        },

        // XSS Protection & Security utilities
        security: {
          escapeHtml: function(text) {
            if (typeof text !== 'string') return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          },
          
          safeInnerHTML: function(element, content) {
            if (typeof content === 'string') {
              element.textContent = content;
            } else {
              element.textContent = String(content || '');
            }
          },
          
          safeAppend: function(element, content) {
            if (typeof content === 'string') {
              const span = document.createElement('span');
              span.textContent = content;
              element.appendChild(span);
            }
          },
          
          createSafeElement: function(tagName, textContent, attributes) {
            if (!this.isSafeTagName(tagName)) {
              throw new Error('Unsafe tag name: ' + tagName);
            }
            
            const element = document.createElement(tagName);
            if (textContent) {
              element.textContent = textContent;
            }
            if (attributes) {
              for (const [key, value] of Object.entries(attributes)) {
                if (this.isSafeAttribute(key, value)) {
                  element.setAttribute(key, String(value));
                }
              }
            }
            return element;
          },
          
          isSafeTagName: function(tagName) {
            const name = tagName.toLowerCase();
            const dangerousTags = [
              'script', 'iframe', 'frame', 'frameset', 'noframes',
              'object', 'embed', 'applet', 'form', 'input', 'button',
              'select', 'textarea', 'option', 'optgroup', 'fieldset',
              'legend', 'label', 'base', 'meta', 'link', 'style',
              'title', 'head', 'html', 'body'
            ];
            
            if (dangerousTags.includes(name)) return false;
            
            const validTagPattern = /^[a-z][a-z0-9-]*$/i;
            return validTagPattern.test(name);
          },
          
          isSafeAttribute: function(attrName, attrValue) {
            const name = attrName.toLowerCase();
            const value = String(attrValue).toLowerCase();
            
            const dangerousAttributes = [
              /^on[a-z]+$/i,
              /^javascript:/i,
              /^vbscript:/i,
              /^data:/i,
              /^formaction$/i,
              /^action$/i,
            ];
            
            const dangerousValues = [
              /javascript:/i,
              /vbscript:/i,
              /data:(?!image\\/)/i,
              /expression\\s*\\(/i,
              /@import/i,
              /binding\\s*:/i,
            ];
            
            for (const pattern of dangerousAttributes) {
              if (pattern.test(name)) return false;
            }
            
            for (const pattern of dangerousValues) {
              if (pattern.test(value)) return false;
            }
            
            if (name === 'href' || name === 'src') {
              const safeUrlPattern = new RegExp('^(https?:\\/\\/|\\/|\\.\\/|#|data:image\\/)', 'i');
              if (!safeUrlPattern.test(value)) return false;
            }
            
            if (name === 'style') {
              const dangerousCss = [
                new RegExp('expression\\\\s*\\\\(', 'i'),
                new RegExp('javascript:', 'i'),
                new RegExp('vbscript:', 'i'),
                new RegExp('@import', 'i'),
                new RegExp('binding\\\\s*:', 'i'),
                new RegExp('url\\\\s*\\\\(\\\\s*["\\']?\\\\s*javascript:', 'i'),
              ];
              
              for (const pattern of dangerousCss) {
                if (pattern.test(value)) return false;
              }
            }
            
            return true;
          },
          
          clearAndAppend: function(parent, ...children) {
            parent.textContent = '';
            children.forEach(child => {
              if (typeof child === 'string') {
                parent.appendChild(document.createTextNode(child));
              } else if (child instanceof Node) {
                parent.appendChild(child);
              }
            });
          },
          
          createSafeFragment: function() {
            return document.createDocumentFragment();
          }
        },

        // Form handling utilities
        forms: {
          // Serialize form data
          serialize: function(form) {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
              if (data[key]) {
                // Handle multiple values (checkboxes, multiple selects)
                if (Array.isArray(data[key])) {
                  data[key].push(value);
                } else {
                  data[key] = [data[key], value];
                }
              } else {
                data[key] = value;
              }
            }
            return data;
          },

          // Submit form via WebSocket
          submit: function(form, options = {}) {
            const data = this.serialize(form);
            const eventName = options.event || 'form-submit';
            
            // Add form identifier if specified
            if (options.formId) {
              data._formId = options.formId;
            }

            // Send via WebSocket
            window.Weblisk.sendEvent(eventName, data);

            // Prevent default form submission
            return false;
          },

          // Handle form validation errors
          showErrors: function(errors, formSelector = 'form') {
            const form = document.querySelector(formSelector);
            if (!form || !errors || typeof errors !== 'object') return;

            // Clear previous errors
            form.querySelectorAll('.form-error').forEach(el => el.remove());
            form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

            // Show new errors
            for (const [field, message] of Object.entries(errors)) {
              const input = form.querySelector(\`[name="\${field}"]\`);
              if (input) {
                input.classList.add('error');
                const errorEl = document.createElement('div');
                errorEl.className = 'form-error';
                errorEl.textContent = message;
                input.parentNode.insertBefore(errorEl, input.nextSibling);
              }
            }
          },

          // Clear form errors
          clearErrors: function(formSelector = 'form') {
            const form = document.querySelector(formSelector);
            if (!form) return;

            form.querySelectorAll('.form-error').forEach(el => el.remove());
            form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
          }
        },

        // WebSocket communication
        ws: null,
        eventHandlers: {},
        isConnected: false,
        
        // Event listener management (alias for eventHandlers)
        on(event, callback) {
          if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
          }
          this.eventHandlers[event].push(callback);
        },
        
        off(event, callback) {
          if (this.eventHandlers[event]) {
            const index = this.eventHandlers[event].indexOf(callback);
            if (index > -1) {
              this.eventHandlers[event].splice(index, 1);
            }
          }
        },

        connect() {
          if (typeof WebSocket === 'undefined') return;
          
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

          this.ws.onclose = (event) => {
            this.isConnected = false;
            console.log('WebSocket disconnected');

            if (event.code === 1006 || event.code === 1001) {
              console.log('[Weblisk] Server restart detected - reloading page...');
              setTimeout(() => location.reload(), 1000);
              return;
            }

            setTimeout(() => this.connect(), 3000);
          };

          this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
          };
        },

        on(event, handler) {
          if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
          }
          this.eventHandlers[event].push(handler);
        },

        handleMessage(message) {
          // Handle event results from server
          if (message.type === 'event-result') {
            // Trigger event handlers for this specific event
            if (this.eventHandlers[message.event]) {
              this.eventHandlers[message.event].forEach(handler => handler(message.result));
            }
            
            // Also trigger handlers listening for the "-result" suffix pattern (for forms)
            const resultEventName = message.event + '-result';
            if (this.eventHandlers[resultEventName]) {
              this.eventHandlers[resultEventName].forEach(handler => handler(message));
            }
          }
          
          // Handle real-time component updates
          if (message.type === 'component-update') {
            this.updateComponent(message.componentId, message.props);
          }
          
          // Handle real-time page updates
          if (message.type === 'page-update') {
            this.updatePage(message.data);
          }
          
          // Handle real-time DOM updates
          if (message.type === 'dom-update') {
            const element = document.querySelector(message.selector);
            if (element) {
              if (message.action === 'innerHTML') {
                element.innerHTML = message.content;
              } else if (message.action === 'textContent') {
                element.textContent = message.content;
              } else if (message.action === 'addClass') {
                element.classList.add(message.content);
              } else if (message.action === 'removeClass') {
                element.classList.remove(message.content);
              }
            }
          }
        }
      };

      // Create convenient aliases for easier usage (avoiding conflicts)
      window.weblisk = window.Weblisk;   // Primary alias - clean and specific
      window.wl = window.Weblisk;        // Short abbreviation for power users
      window.app = window.Weblisk;       // Generic app alias

      // Auto-connect WebSocket when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          window.Weblisk.connect();
        });
      } else {
        window.Weblisk.connect();
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
  protected async buildData(
    context: RouteContext,
  ): Promise<Record<string, unknown>> {
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
  protected buildEvents(): Record<
    string,
    (
      data: Record<string, unknown>,
      context: RouteContext,
    ) => Promise<unknown> | unknown
  > {
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
    const templateResult = this.config.template!(data);

    // Handle both sync and async templates
    if (templateResult instanceof Promise) {
      return await templateResult;
    }
    return templateResult;
  }

  /**
   * Check if this route has a specific event handler
   */
  hasEvent(eventName: string): boolean {
    const events = this.buildEvents();
    return eventName in events;
  }

  /**
   * Handle WebSocket events for this route
   */
  async handleEvent(
    eventName: string,
    data: Record<string, unknown>,
    context: RouteContext,
  ): Promise<unknown> {
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
  getEventHandlers(): Record<
    string,
    (
      data: Record<string, unknown>,
      context: RouteContext,
    ) => Promise<unknown> | unknown
  > {
    return this.buildEvents();
  }
}

// Single-file route configuration (kept for backward compatibility)
export interface RouteConfig extends WebliskFrameworkRouteConfig {}
