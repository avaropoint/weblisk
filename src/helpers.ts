/**
 * Weblisk Template Helpers - Generic & Flexible
 * Provides IDE support without enforcing specific patterns
 */

import type { RouteContext } from "./types.ts";

// Type for component registry access
type GlobalWithRegistry = typeof globalThis & {
  componentRegistry?: typeof import("./components.ts").componentRegistry;
};

/**
 * Component helper functions - work with auto-registered components
 * These use the global component registry that's populated during app startup
 */
export async function component(
  name: string,
  props: Record<string, unknown> = {},
  context?: RouteContext,
): Promise<string> {
  // Use the global component registry
  const registry = (globalThis as GlobalWithRegistry).componentRegistry;
  if (!registry) {
    throw new Error(
      "Component registry not initialized. Make sure the app has loaded components first.",
    );
  }

  const comp = registry.get(name);
  if (!comp) {
    const available = registry.list();
    throw new Error(
      `Component '${name}' not found. Available: ${available.join(", ")}`,
    );
  }

  return await comp.render(props, context);
}

export function componentSync(
  name: string,
  props: Record<string, unknown> = {},
): string {
  // Use the global component registry for sync usage
  const registry = (globalThis as GlobalWithRegistry).componentRegistry;
  if (!registry) {
    throw new Error(
      "Component registry not initialized. Components must be loaded first.",
    );
  }

  const comp = registry.get(name);
  if (!comp) {
    const available = registry.list();
    throw new Error(
      `Component '${name}' not found. Available: ${available.join(", ")}`,
    );
  }

  const result = comp.config.template(props);
  // Handle both sync and async templates
  if (result instanceof Promise) {
    throw new Error(
      `Component '${name}' has async template. Use 'component()' instead of 'componentSync()'.`,
    );
  }
  return result;
}

export async function layout(
  layoutName: string,
  sections: Record<string, string>,
  context?: RouteContext,
): Promise<string> {
  return await component(layoutName, sections, context);
}

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
 * HTML template literal helper - enables syntax highlighting in IDEs
 * Usage: html`<div>Hello ${name}</div>`
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] ?? "");
  }, "");
}

/**
 * CSS template literal helper - enables syntax highlighting in IDEs
 * Usage: css`body { color: red; }`
 */
export function css(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] ?? "");
  }, "");
}

/**
 * JavaScript template literal helper - enables syntax highlighting in IDEs
 * Usage: js`console.log('Hello')`
 */
export function js(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] ?? "");
  }, "");
}

/**
 * Generic element builder - works with ANY HTML element
 * Usage: element('div', { class: 'container' }, 'content')
 *        element('custom-element', { 'data-id': 123 }, child1, child2)
 */
export function element(
  tag: string,
  attributes?:
    | Record<string, string | number | boolean | null | undefined>
    | null,
  ...children: (string | number | null | undefined)[]
): string {
  const attrs = attributes
    ? Object.entries(attributes)
      .filter(([_, value]) => value != null)
      .map(([key, value]) => `${key}="${String(value)}"`)
      .join(" ")
    : "";

  const attrString = attrs ? ` ${attrs}` : "";
  const content = children.filter((child) => child != null).join("");

  // Handle self-closing tags
  const selfClosingTags = [
    "input",
    "img",
    "br",
    "hr",
    "meta",
    "link",
    "area",
    "base",
    "col",
    "embed",
    "source",
    "track",
    "wbr",
  ];
  if (selfClosingTags.includes(tag.toLowerCase())) {
    return `<${tag}${attrString}>`;
  }

  return `<${tag}${attrString}>${content}</${tag}>`;
}

/**
 * Generic style builder - create any CSS without pre-defined patterns
 * Usage: style({ selector: '.my-class', rules: { color: 'red', fontSize: '16px' } })
 *        style({ selector: '@media (max-width: 768px)', rules: { '.container': { padding: '1rem' } } })
 */
export function style(config: {
  selector: string;
  rules: Record<string, string | number | Record<string, string | number>>;
}): string {
  const { selector, rules } = config;

  const formatRules = (
    ruleSet: Record<string, string | number | Record<string, string | number>>,
    indent = "",
  ): string => {
    return Object.entries(ruleSet)
      .map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          // Nested rules (like media queries or nested selectors)
          return `${indent}${key} {\n${
            formatRules(value as Record<string, string | number>, indent + "  ")
          }\n${indent}}`;
        } else {
          // Convert camelCase to kebab-case for CSS properties
          const cssKey = key.replace(
            /[A-Z]/g,
            (letter) => `-${letter.toLowerCase()}`,
          );
          return `${indent}  ${cssKey}: ${value};`;
        }
      })
      .join("\n");
  };

  return `${selector} {\n${formatRules(rules)}\n}`;
}

/**
 * Legacy component template helper (for backward compatibility)
 * Usage: componentTemplate({ styles: cssString, template: htmlString })
 * Note: Use the new component system from components.ts for advanced features
 */
export interface ComponentTemplate {
  styles?: string;
  template: string;
}

export function componentTemplate(template: ComponentTemplate): string {
  const styles = template.styles ? `<style>${template.styles}</style>` : "";
  return `${styles}${template.template}`;
}

/**
 * Dynamic HTML element creator using Proxy - supports ANY element
 * Usage: tag.div({ class: 'container' }, 'content')
 *        tag.customElement({ 'data-id': 123 }, 'content')
 *        tag.h1({ class: 'title' }, 'My Title')
 */
type TagFunction = (
  attributes?:
    | Record<string, string | number | boolean | null | undefined>
    | string
    | number
    | null,
  ...children: (string | number | null | undefined)[]
) => string;

export const tag = new Proxy({} as Record<string, TagFunction>, {
  get: (_, tagName: string) => {
    return (
      attributes?:
        | Record<string, string | number | boolean | null | undefined>
        | string
        | number
        | null,
      ...children: (string | number | null | undefined)[]
    ) => {
      // If first argument is a string/number, treat it as content with no attributes
      if (
        typeof attributes === "string" || typeof attributes === "number" ||
        attributes == null
      ) {
        return element(tagName, null, attributes, ...children);
      }
      return element(tagName, attributes, ...children);
    };
  },
});

/**
 * Utility for chaining multiple styles together
 * Usage: styles(style1, style2, style3)
 */
export function styles(...styleStrings: (string | null | undefined)[]): string {
  return styleStrings.filter(Boolean).join("\n\n");
}

/**
 * Generic event handler helper for ANY DOM event
 * Usage: on('click', js`console.log('clicked')`)
 *        on('mouseover', 'handleHover()')
 *        on('customEvent', js`handleCustom(event)`)
 */
export function on(eventName: string, jsCode: string): Record<string, string> {
  const eventAttr = eventName.startsWith("on") ? eventName : `on${eventName}`;
  return {
    [eventAttr]: jsCode.replace(/"/g, "&quot;"),
  };
}

/**
 * Multiple event handlers helper
 * Usage: events({ click: 'handleClick()', mouseover: 'handleHover()' })
 */
export function events(
  handlers: Record<string, string>,
): Record<string, string> {
  return Object.entries(handlers).reduce((acc, [event, handler]) => {
    const eventAttr = event.startsWith("on") ? event : `on${event}`;
    acc[eventAttr] = handler.replace(/"/g, "&quot;");
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Data attribute helper
 * Usage: data({ id: 123, name: 'test' }) -> 'data-id="123" data-name="test"'
 */
export function data(
  attributes: Record<string, string | number | boolean>,
): Record<string, string> {
  return Object.entries(attributes).reduce((acc, [key, value]) => {
    acc[`data-${key}`] = String(value);
    return acc;
  }, {} as Record<string, string>);
}

/**
 * CSS class helper for conditional classes
 * Usage: classes('base-class', condition && 'conditional-class', { 'active': isActive })
 */
export function classes(
  ...args: (string | null | undefined | false | Record<string, boolean>)[]
): string {
  return args
    .filter(Boolean)
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (typeof arg === "object" && arg !== null) {
        return Object.entries(arg)
          .filter(([_, condition]) => condition)
          .map(([className]) => className)
          .join(" ");
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

// Re-export component types and registry for convenience
export type { WebliskComponentConfig } from "./components.ts";
export {
  batch,
  componentCache,
  componentRegistry,
  compose,
  dev,
  forEach,
  fragment,
  lazy,
  memo,
  safe,
  slot,
  WebliskComponent,
} from "./components.ts";
