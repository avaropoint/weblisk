/**
 * Weblisk Framework - Entry Point
 *
 * The main export file for the Weblisk framework.
 * Import this file to get access to all framework functionality.
 *
 * @example
 * ```typescript
 * import { Weblisk, html, css } from "https://deno.land/x/weblisk/mod.ts";
 *
 * const app = new Weblisk();
 *
 * app.route("/", {
 *   template: (data) => html`
 *     <h1>Welcome to ${data.appName}!</h1>
 *     <button onclick="handleClick()">Click me</button>
 *   `,
 *   styles: () => css`
 *     h1 { color: blue; }
 *     button { padding: 10px; }
 *   `,
 *   data: () => ({ appName: "My App" }),
 *   events: {
 *     "click": () => ({ message: "Hello from server!" })
 *   }
 * });
 *
 * app.start();
 * ```
 */

// Re-export everything from the lib index
export * from "./lib/index.ts";

// Default export for convenience
export { WebliskFramework as default } from "./lib/weblisk.ts";
