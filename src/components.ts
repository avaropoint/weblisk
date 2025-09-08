/**
 * Weblisk Component System - Better than React/Preact
 * Server-first, real-time, zero-build philosophy
 */

import type { RouteContext } from "./types.ts";
import { html } from "./helpers.ts";

export interface WebliskComponentConfig<
  TProps = Record<string, unknown>,
  TData = Record<string, unknown>,
> {
  // Server-rendered template (server-first, no virtual DOM needed)
  template: (
    props: TProps & TData,
    context?: RouteContext,
  ) => string | Promise<string>;

  // Server-side styles with access to props and context
  styles?: (props: TProps & TData, context?: RouteContext) => string;

  // Server-side data fetching (no useEffect needed)
  data?: (props: TProps, context: RouteContext) => Promise<TData> | TData;

  // Real-time event handlers (no useState/setState needed)
  events?: Record<
    string,
    (data: unknown, context: RouteContext) => Promise<unknown> | unknown
  >;

  // Optional client enhancement (progressive enhancement)
  clientCode?: (props: TProps & TData) => string;

  // Component metadata
  name?: string;
  version?: string;

  // Props validation (runtime type checking)
  propTypes?: Record<keyof TProps, PropTypeDefinition>;
}

interface PropTypeDefinition {
  type: "string" | "number" | "boolean" | "object" | "array" | "function";
  required?: boolean;
  default?: unknown;
  validator?: (value: unknown) => boolean;
}

export class WebliskComponent<
  TProps extends Record<string, unknown> = Record<string, unknown>,
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  public config: WebliskComponentConfig<TProps, TData>;
  public _registeredStyles?: string; // Used to store styles for deduplication

  constructor(config: WebliskComponentConfig<TProps, TData>) {
    this.config = config;
  }

  /**
   * Validate props against propTypes definition
   */
  private validateProps(
    props: Record<string, unknown>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.propTypes) {
      return { valid: true, errors: [] };
    }

    for (const [propName, propType] of Object.entries(this.config.propTypes)) {
      const typedPropType = propType as PropTypeDefinition;
      const value = props[propName];

      // Check required props
      if (typedPropType.required && (value === undefined || value === null)) {
        errors.push(`Required prop '${propName}' is missing`);
        continue;
      }

      // Apply default value
      if (value === undefined && typedPropType.default !== undefined) {
        props[propName] = typedPropType.default;
        continue;
      }

      // Skip type checking for undefined optional props
      if (value === undefined) continue;

      // Type checking
      const actualType = Array.isArray(value) ? "array" : typeof value;
      if (actualType !== typedPropType.type) {
        errors.push(
          `Prop '${propName}' expected ${typedPropType.type}, got ${actualType}`,
        );
      }

      // Custom validation
      if (typedPropType.validator && !typedPropType.validator(value)) {
        errors.push(`Prop '${propName}' failed custom validation`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Render component with server-side data
   * This is what makes us better than React - true SSR with no hydration
   */
  async render(
    props: TProps,
    data: TData = {} as TData,
    context?: RouteContext,
  ): Promise<string> {
    this.validateProps(props);

    const renderProps = { ...props, ...data };

    const templateResult = this.config.template(renderProps, context);
    const template = templateResult instanceof Promise
      ? await templateResult
      : templateResult;

    // Register styles if present (but don't include them here)
    if (this.config.styles) {
      const styles = this.config.styles(renderProps, context);
      const componentName = this.config.name || "anonymous-component";
      registerComponentStyle(componentName, styles);
    }

    return template;
  }

  /**
   * Handle real-time events
   * This is what makes us better than React - real server-side state
   */
  async handleEvent(
    eventName: string,
    data: unknown,
    context: RouteContext,
  ): Promise<unknown> {
    const handler = this.config.events?.[eventName];
    if (!handler) {
      throw new Error(`Event handler '${eventName}' not found on component`);
    }

    return await handler(data, context);
  }

  /**
   * Get client-side code for this component with type safety
   */
  getClientCode(props: TProps & TData = {} as TProps & TData): string {
    return this.config.clientCode ? this.config.clientCode(props) : "";
  }

  hasEvent(eventName: string): boolean {
    return !!(this.config.events && eventName in this.config.events);
  }
}

/**
 * Component Registry - Global component management
 */
class ComponentRegistry {
  private components = new Map<string, WebliskComponent>();
  private namespaces = new Map<string, Map<string, WebliskComponent>>();

  register(
    name: string,
    component: WebliskComponent | WebliskComponentConfig,
  ): void {
    const comp = component instanceof WebliskComponent
      ? component
      : new WebliskComponent(component);

    // Handle namespaced components (e.g., "ui:button", "forms:input")
    const [namespace, localName] = name.includes(":")
      ? name.split(":", 2)
      : [null, name];

    if (namespace) {
      if (!this.namespaces.has(namespace)) {
        this.namespaces.set(namespace, new Map());
      }
      this.namespaces.get(namespace)!.set(localName, comp);
    }

    this.components.set(name, comp);
  }

  get(name: string): WebliskComponent | undefined {
    return this.components.get(name);
  }

  has(name: string): boolean {
    return this.components.has(name);
  }

  list(): string[] {
    return Array.from(this.components.keys());
  }

  listNamespace(namespace: string): string[] {
    const ns = this.namespaces.get(namespace);
    return ns ? Array.from(ns.keys()) : [];
  }

  getNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  unregister(name: string): boolean {
    const [namespace, localName] = name.includes(":")
      ? name.split(":", 2)
      : [null, name];

    if (namespace) {
      const ns = this.namespaces.get(namespace);
      if (ns) {
        ns.delete(localName);
        if (ns.size === 0) {
          this.namespaces.delete(namespace);
        }
      }
    }

    return this.components.delete(name);
  }

  clear(): void {
    this.components.clear();
    this.namespaces.clear();
  }

  // Debug and development helpers
  inspect(
    name: string,
  ):
    | { config: WebliskComponentConfig; metadata: Record<string, unknown> }
    | null {
    const comp = this.get(name);
    if (!comp) return null;

    return {
      config: comp.config,
      metadata: {
        hasData: !!comp.config.data,
        hasStyles: !!comp.config.styles,
        hasClientCode: !!comp.config.clientCode,
        eventCount: comp.config.events
          ? Object.keys(comp.config.events).length
          : 0,
        events: comp.config.events ? Object.keys(comp.config.events) : [],
      },
    };
  }
}

// Global registry instance
export const componentRegistry = new ComponentRegistry();

// Track which component styles have been registered for the current request
const componentStylesRegistry = new Map<string, string>();

/**
 * Register a component style to be included once in the page
 */
export function registerComponentStyle(componentName: string, styles: string) {
  if (!componentStylesRegistry.has(componentName)) {
    componentStylesRegistry.set(componentName, styles);
  }
}

/**
 * Get all registered component styles and clear the registry for next request
 */
export function getComponentStyles(): string {
  const styles: string[] = [];
  for (const [_componentName, componentStyles] of componentStylesRegistry) {
    styles.push(componentStyles);
  }
  componentStylesRegistry.clear();
  return styles.join("\n\n");
}

/**
 * Component helper function - makes using components easy
 * This is our alternative to JSX - but better because it's server-first
 */
export async function component(
  name: string,
  props: Record<string, unknown> = {},
  context?: RouteContext,
): Promise<string> {
  const comp = componentRegistry.get(name);
  if (!comp) {
    throw new Error(
      `Component '${name}' not found. Available: ${
        componentRegistry.list().join(", ")
      }`,
    );
  }

  return await comp.render(props, context);
}

/**
 * Synchronous component helper for simple components without data fetching
 */
export async function componentSync(
  name: string,
  props: Record<string, unknown> = {},
): Promise<string> {
  const comp = componentRegistry.get(name);
  if (!comp) {
    throw new Error(
      `Component '${name}' not found. Available: ${
        componentRegistry.list().join(", ")
      }`,
    );
  }

  // For sync rendering, we skip data fetching and context
  return await comp.config.template(props);
}

/**
 * Layout helper - special component for page layouts
 */
export async function layout(
  layoutName: string,
  sections: Record<string, string>,
  context?: RouteContext,
): Promise<string> {
  return await component(layoutName, sections, context);
}

/**
 * Component composition helper - render multiple components
 */
export async function compose(
  components: Array<{ name: string; props?: Record<string, unknown> }>,
  context?: RouteContext,
): Promise<string> {
  const rendered = await Promise.all(
    components.map(({ name, props }) => component(name, props, context)),
  );
  return rendered.join("");
}

/**
 * Conditional component rendering
 */
export async function when(
  condition: boolean,
  componentName: string,
  props: Record<string, unknown> = {},
  context?: RouteContext,
  fallback?: string,
): Promise<string> {
  if (condition) {
    return await component(componentName, props, context);
  }
  return fallback || "";
}

/**
 * Loop component rendering
 */
export async function forEach<T>(
  items: T[],
  componentName: string,
  itemPropName: string = "item",
  context?: RouteContext,
): Promise<string> {
  const rendered = await Promise.all(
    items.map((item, index) =>
      component(componentName, { [itemPropName]: item, index }, context)
    ),
  );
  return rendered.join("");
}

/**
 * Render component with error boundary
 */
export async function safe(
  componentName: string,
  props: Record<string, unknown> = {},
  context?: RouteContext,
  fallback?: string,
): Promise<string> {
  try {
    return await component(componentName, props, context);
  } catch (error) {
    console.error(`Component '${componentName}' failed to render:`, error);

    if (fallback) {
      return fallback;
    }

    // Development error display
    if (context?.framework.getEnvironment() === "development") {
      return html`
        <div
          style="border: 2px solid red; padding: 1rem; margin: 1rem; background: #ffe6e6;"
        >
          <h3>Component Error: ${componentName}</h3>
          <p><strong>Error:</strong> ${error instanceof Error
            ? error.message
            : String(error)}</p>
          <details>
            <summary>Stack Trace</summary>
            <pre style="font-size: 12px; overflow: auto;">${error instanceof
                Error
              ? error.stack
              : "No stack trace available"}</pre>
          </details>
        </div>
      `;
    }

    // Production fallback
    return `<!-- Component '${componentName}' failed to render -->`;
  }
}

/**
 * Lazy component loading with placeholder
 */
export async function lazy(
  componentName: string,
  props: Record<string, unknown> = {},
  context?: RouteContext,
  placeholder: string = "Loading...",
): Promise<string> {
  // Check if component is registered
  if (!componentRegistry.has(componentName)) {
    // In a real implementation, this could trigger dynamic loading
    return placeholder;
  }

  return await component(componentName, props, context);
}

/**
 * Slot-based component composition
 */
export async function slot(
  componentName: string,
  slots: Record<string, string>,
  props: Record<string, unknown> = {},
  context?: RouteContext,
): Promise<string> {
  const mergedProps = { ...props, slots };
  return await component(componentName, mergedProps, context);
}

/**
 * Component memoization for expensive renders
 */
class ComponentCache {
  private cache = new Map<
    string,
    { result: string; timestamp: number; ttl: number }
  >();

  private generateKey(
    componentName: string,
    props: Record<string, unknown>,
  ): string {
    return `${componentName}:${JSON.stringify(props)}`;
  }

  async get(
    componentName: string,
    props: Record<string, unknown>,
    context?: RouteContext,
    ttl: number = 300000, // 5 minutes default
  ): Promise<string> {
    const key = this.generateKey(componentName, props);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }

    const result = await component(componentName, props, context);
    this.cache.set(key, { result, timestamp: Date.now(), ttl });

    return result;
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const componentCache = new ComponentCache();

/**
 * Memoized component rendering
 */
export async function memo(
  componentName: string,
  props: Record<string, unknown> = {},
  context?: RouteContext,
  ttl?: number,
): Promise<string> {
  return await componentCache.get(componentName, props, context, ttl);
}

/**
 * Batch component rendering for performance
 */
export async function batch(
  components: Array<{
    name: string;
    props?: Record<string, unknown>;
    key?: string;
  }>,
  context?: RouteContext,
): Promise<Record<string, string>> {
  const results = await Promise.all(
    components.map(async ({ name, props, key }) => ({
      key: key || `${name}_${Math.random()}`,
      result: await component(name, props, context),
    })),
  );

  return results.reduce((acc, { key, result }) => {
    acc[key] = result;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Fragment helper for grouping components without wrapper
 */
export async function fragment(
  ...components: Array<string | Promise<string>>
): Promise<string> {
  const resolved = await Promise.all(components);
  return resolved.join("");
}

/**
 * Component development helpers
 */
export const dev = {
  /**
   * List all registered components with details
   */
  list(): Array<{ name: string; metadata: Record<string, unknown> }> {
    return componentRegistry.list().map((name) => ({
      name,
      metadata: componentRegistry.inspect(name)?.metadata || {},
    }));
  },

  /**
   * Test render a component with mock data
   */
  async test(
    componentName: string,
    props: Record<string, unknown> = {},
    mockContext?: Partial<RouteContext>,
  ): Promise<{ html: string; error?: string }> {
    try {
      const html = await component(
        componentName,
        props,
        mockContext as RouteContext,
      );
      return { html };
    } catch (error) {
      return {
        html: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * Get component performance stats
   */
  async benchmark(
    componentName: string,
    props: Record<string, unknown> = {},
    iterations: number = 100,
  ): Promise<{ avgTime: number; minTime: number; maxTime: number }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await component(componentName, props);
      const end = performance.now();
      times.push(end - start);
    }

    return {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
    };
  },
};

// Export types for external use
export type { PropTypeDefinition };
