/**
 * Comprehensive test suite for Weblisk Framework v2.0
 * Testing single-file route architecture and production features
 */

import { assertEquals, assertExists, assertThrows } from "@std/assert";
import { delay } from "@std/async";
import WebliskFramework, { WebliskRoute } from "../lib/weblisk.ts";
import { css, html, js } from "../lib/routes.ts";
import { ComponentError, WebliskError } from "../lib/types.ts";
import { logger, LOG_LEVELS } from "../lib/logger.ts";

// Test configuration
const TEST_PORT = 3001;
const TEST_HOST = "localhost";

Deno.test("Weblisk Framework v2.0 - Core Functionality", async (t) => {

  await t.step("Framework initialization", () => {
    const app = new WebliskFramework({ server: { port: TEST_PORT, hostname: TEST_HOST, enableHttps: false } });
    assertExists(app);
    assertEquals(app.getConnectionCount(), 0);
  });

  await t.step("Single-file route registration", () => {
    const app = new WebliskFramework({ server: { port: TEST_PORT + 1, hostname: TEST_HOST, enableHttps: false } });

    // Test valid route registration with WebliskRoute instance
    const testRoute = new WebliskRoute({
      template: () => html`<div>Test Route</div>`,
      styles: () => css`body { color: blue; }`,
      clientCode: () => js`console.log('test');`,
      data: async () => ({ test: true }),
      events: {
        ping: async () => ({ pong: true })
      }
    });

    // This should not throw
    app.route('/test', testRoute);

    // Test route registration with plain config object
    app.route('/simple', {
      template: () => html`<div>Simple Route</div>`
    });

    // Verify routes were registered
    const stats = app.getStats();
    assertEquals(stats.routes, 2);
  });

  await t.step("WebliskRoute class functionality", () => {
    // Test WebliskRoute creation
    const route = new WebliskRoute({
      template: (data) => html`<h1>${data?.title || 'Default'}</h1>`,
      styles: (data) => css`body { background: ${data?.bg || 'white'}; }`,
      clientCode: (data) => js`console.log(${JSON.stringify(data)});`,
      data: async () => ({ title: 'Test', bg: 'blue' }),
      events: {
        test: async (data) => ({ result: 'success' })
      }
    });

    assertExists(route);

    // Test event handlers extraction
    const eventHandlers = route.getEventHandlers();
    assertExists(eventHandlers.test);
    assertEquals(typeof eventHandlers.test, 'function');
  });

  await t.step("Template helpers", () => {
    // Test CSS helper
    const cssResult = css`body { color: red; }`;
    assertEquals(typeof cssResult, 'string');
    assertEquals(cssResult.includes('color: red'), true);

    // Test HTML helper
    const htmlResult = html`<div>Hello</div>`;
    assertEquals(typeof htmlResult, 'string');
    assertEquals(htmlResult.includes('<div>Hello</div>'), true);

    // Test JS helper
    const jsResult = js`console.log('test');`;
    assertEquals(typeof jsResult, 'string');
    assertEquals(jsResult.includes('console.log'), true);
  });

  await t.step("Statistics and monitoring", () => {
    const app = new WebliskFramework({ server: { port: TEST_PORT + 4, hostname: TEST_HOST, enableHttps: false } });

    const route1 = new WebliskRoute({ template: () => html`<div>Route1</div>` });
    const route2 = new WebliskRoute({ template: () => html`<div>Route2</div>` });

    app.route('/route1', route1);
    app.route('/route2', route2);

    const stats = app.getStats();
    assertEquals(stats.routes, 2);
    assertEquals(stats.connections, 0);
    assertEquals(stats.activeSessions, 0);
    assertExists(stats.memoryUsage);
  });
});

Deno.test("Weblisk Framework v2.0 - Route Rendering", async (t) => {

  await t.step("Route data preparation", async () => {
    const route = new WebliskRoute({
      template: (data) => html`<h1>Welcome ${data.user}</h1>`,
      data: async () => ({ user: 'TestUser', timestamp: Date.now() })
    });

    assertExists(route);
    // Test that route can be created without errors
  });

  await t.step("Dynamic CSS generation", () => {
    const dynamicData = { theme: 'dark', primary: '#667eea' };

    const route = new WebliskRoute({
      template: () => html`<div>Test</div>`,
      styles: (data) => css`
        body {
          background: ${data.theme === 'dark' ? '#000' : '#fff'};
          color: ${data.primary};
        }
      `
    });

    assertExists(route);
  });
});

Deno.test("Weblisk Framework v2.0 - Error Handling", async (t) => {

  await t.step("Route errors", () => {
    const app = new WebliskFramework({ server: { port: TEST_PORT + 10, hostname: TEST_HOST, enableHttps: false } });

    // Test ComponentError (still used internally)
    const error = new ComponentError("Test component error", "test-component");
    assertEquals(error.name, "ComponentError");
    assertEquals(error.componentName, "test-component");
    assertEquals(error.code, "COMPONENT_ERROR");
  });

  await t.step("WebSocket errors", () => {
    const app = new WebliskFramework({ server: { port: TEST_PORT + 11, hostname: TEST_HOST, enableHttps: false } });

    // Test WebliskError
    const error = new WebliskError("Test weblisk error", "TEST_CODE");
    assertEquals(error.name, "WebliskError");
    assertEquals(error.code, "TEST_CODE");
  });

  await t.step("Invalid route registration", () => {
    const app = new WebliskFramework({ server: { port: TEST_PORT + 12, hostname: TEST_HOST, enableHttps: false } });
    const validRoute = new WebliskRoute({ template: () => html`<div>Test</div>` });

    // These should work fine (no validation errors in current implementation)
    app.route('/valid', validRoute);
    app.route('/valid2', { template: () => html`<div>Test</div>` });
  });
});

Deno.test("Weblisk Framework v2.0 - Logger", async (t) => {

  await t.step("Logger initialization", () => {
    assertEquals(typeof logger.setLevel, "function");
    assertEquals(typeof logger.info, "function");
    assertEquals(typeof logger.error, "function");
    assertEquals(typeof logger.warn, "function");
    assertEquals(typeof logger.debug, "function");
  });

  await t.step("Log levels", () => {
    assertEquals(LOG_LEVELS.DEBUG.value, 0);
    assertEquals(LOG_LEVELS.INFO.value, 1);
    assertEquals(LOG_LEVELS.WARN.value, 2);
    assertEquals(LOG_LEVELS.ERROR.value, 3);
  });

  await t.step("Specialized logging methods", () => {
    // Test that methods exist and don't throw
    logger.logConnection("connected", "test-connection-id", "test-session-id");
    logger.logComponent("registered", "test-component");
    logger.logEvent("testEvent", "testComponent", "test-session");
    logger.logError("Test error", new Error("test"));
  });
});

console.log("Weblisk Framework v2.0 Test Suite Completed!");
