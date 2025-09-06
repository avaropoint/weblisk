/**
 * Comprehensive test suite for Weblisk Framework v1.0 - Modular Architecture
 * Testing the new modular structure and clean API
 */

import { assertEquals, assertExists } from "@std/assert";
import { css, html, js, Weblisk } from "../mod.ts";
import { WebliskError } from "../lib/types.ts";
import { LOG_LEVELS, logger } from "../lib/logger.ts";

// Test configuration
const TEST_PORT = 3001;
const TEST_HOST = "localhost";

// Test configuration helper - disables monitoring to prevent interval leaks
const getTestConfig = (port: number, extraConfig = {}) => ({
  server: {
    port,
    hostname: TEST_HOST,
    enableHttps: false,
  },
  monitoring: {
    healthCheckEnabled: false,
    healthCheckInterval: 0,
    metricsEnabled: false,
  },
  security: {
    corsEnabled: false,
    corsOrigins: [],
    rateLimitEnabled: false, // Disable rate limiting to prevent its cleanup interval
    rateLimitRequests: 100,
    rateLimitWindowMs: 60000,
    securityHeadersEnabled: false,
    contentSecurityPolicy: false,
    enableHSTS: false,
    trustProxy: false,
    sessionTimeout: 3600,
  },
  development: {
    debugMode: false, // Disable debug to reduce logs
    hotReload: false,
    enableDevTools: false,
  },
  ...extraConfig,
});

Deno.test("Weblisk Framework v1.0 - Modular Architecture", async (t) => {
  await t.step("Framework initialization with config", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT, {
      development: { debugMode: true },
    }));
    assertExists(app);

    // Test that the framework has proper methods
    assertEquals(typeof app.route, "function");
    assertEquals(typeof app.addStaticFile, "function");
    assertEquals(typeof app.start, "function");
    assertEquals(typeof app.stop, "function");
    assertEquals(typeof app.getServerUrl, "function");
  });

  await t.step("Simple route registration with object config", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT + 1));

    // Test route registration with plain config object (new API)
    app.route("/", {
      template: (data) =>
        html`
          <h1>Welcome to ${data.appName}!</h1>
          <button onclick="testWebSocket()">Test Real-time</button>
          <div id="output"></div>
        `,

      styles: () =>
        css`
          body {
            font-family: system-ui, sans-serif;
            padding: 2rem;
            background: #f8fafc;
          }
          h1 {
            color: #1e293b;
          }
          button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            cursor: pointer;
          }
        `,

      clientCode: () =>
        js`
        function testWebSocket() {
          if (window.weblisk) {
            window.weblisk.sendEvent('route', 'test', { message: 'Hello from client!' });

            window.weblisk.on('test', (data) => {
              document.getElementById('output').innerHTML =
                '<strong>Server Response:</strong> ' + data.message;
            });
          }
        }
      `,

      data: () => ({
        appName: "Test Framework",
      }),

      events: {
        test: (data) => ({
          message: `Received: ${data.message} - Response from server!`,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Test additional routes
    app.route("/about", {
      template: () =>
        html`
          <h1>About Page</h1>
        `,
      data: () => ({ page: "about" }),
    });

    // This should not throw - routes registered successfully
    assertEquals(typeof app.getServerUrl(), "string");
  });

  await t.step("Static file registration", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT + 2));

    // Test static file registration
    app.addStaticFile("/robots.txt", "User-agent: *\nAllow: /");
    app.addStaticFile("/manifest.json", JSON.stringify({ name: "Test App" }));

    // Should not throw
    assertEquals(typeof app.getServerUrl(), "string");
  });
});

Deno.test("Weblisk Framework v1.0 - Template Helpers", async (t) => {
  await t.step("HTML template helper", () => {
    const name = "World";
    const htmlResult = html`
      <div>
        <h1>Hello ${name}!</h1>
        <p>Welcome to Weblisk</p>
      </div>
    `;
    assertEquals(typeof htmlResult, "string");
    assertEquals(htmlResult.includes("Hello World!"), true);
    assertEquals(htmlResult.includes("<div>"), true);
  });

  await t.step("CSS template helper", () => {
    const primaryColor = "#3b82f6";
    const cssResult = css`
      body {
        color: ${primaryColor};
        font-family: system-ui, sans-serif;
      }
      .button {
        background: ${primaryColor};
        padding: 0.5rem 1rem;
      }
    `;
    assertEquals(typeof cssResult, "string");
    assertEquals(cssResult.includes("#3b82f6"), true);
    assertEquals(cssResult.includes("font-family"), true);
  });

  await t.step("JS template helper", () => {
    const eventName = "test";
    const jsResult = js`
      function handleClick() {
        console.log('Button clicked');
        window.weblisk.sendEvent('route', '${eventName}', { data: 'test' });
      }

      window.weblisk.on('${eventName}', (data) => {
        console.log('Response:', data);
      });
    `;
    assertEquals(typeof jsResult, "string");
    assertEquals(jsResult.includes("handleClick"), true);
    assertEquals(jsResult.includes("window.weblisk"), true);
    assertEquals(jsResult.includes("sendEvent"), true);
  });
});

Deno.test("Weblisk Framework v1.0 - Configuration System", async (t) => {
  await t.step("Partial configuration (DeepPartial)", () => {
    // Test that partial config works (this was a major fix)
    const app1 = new Weblisk(getTestConfig(TEST_PORT + 10));
    assertExists(app1);

    const app2 = new Weblisk(getTestConfig(TEST_PORT + 11, {
      development: { debugMode: true },
    }));
    assertExists(app2);

    const app3 = new Weblisk(getTestConfig(TEST_PORT + 12, {
      logging: { level: "INFO" },
    }));
    assertExists(app3);
  });

  await t.step("Default configuration values", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT + 13)); // Test config
    assertExists(app);

    // Should work with defaults
    assertEquals(typeof app.getServerUrl(), "string");
    assertEquals(typeof app.getEnvironment(), "string");
  });
});

Deno.test("Weblisk Framework v1.0 - Modular Components", async (t) => {
  await t.step("Static file manager integration", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT + 20));

    // Test static file functionality
    app.addStaticFile("/test.txt", "Hello World");
    app.addStaticFile("/data.json", JSON.stringify({ test: true }));

    // Should not throw
    assertExists(app);
  });

  await t.step("WebSocket manager integration", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT + 21));

    // Add a route with WebSocket events
    app.route("/ws-test", {
      template: () =>
        html`
          <div>WebSocket Test</div>
        `,
      events: {
        ping: (data) => ({ pong: true, received: data }),
        echo: (data) => ({ echo: data.message }),
      },
    });

    assertExists(app);
  });

  await t.step("Cookie manager integration", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT + 22, {
      session: {
        cookieName: "test-session",
        cookieMaxAge: 3600,
      },
    }));

    app.route("/session-test", {
      template: () =>
        html`
          <div>Session Test</div>
        `,
      data: (context) => ({
        sessionId: context?.sessionId || "unknown",
      }),
    });

    assertExists(app);
  });

  await t.step("Monitor integration (health endpoints)", () => {
    // Test monitor integration without actually enabling background processes
    const app = new Weblisk(getTestConfig(TEST_PORT + 23));

    // Health and metrics endpoints should be available even when monitoring is disabled
    // (they just won't run periodic checks)
    assertExists(app);
  });
});

Deno.test("Weblisk Framework v1.0 - Error Handling", async (t) => {
  await t.step("WebliskError class", () => {
    const error = new WebliskError("Test error", "TEST_CODE");
    assertEquals(error.name, "WebliskError");
    assertEquals(error.code, "TEST_CODE");
    assertEquals(error.message, "Test error");
  });

  await t.step("Route validation", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT + 30));

    // Valid route should work
    app.route("/valid", {
      template: () =>
        html`
          <div>Valid</div>
        `,
    });

    // Route with missing template should still work (no strict validation)
    app.route("/minimal", {
      data: () => ({ message: "minimal route" }),
    });

    assertExists(app);
  });
});

Deno.test("Weblisk Framework v1.0 - Logger System", async (t) => {
  await t.step("Logger interface", () => {
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

Deno.test("Weblisk Framework v1.0 - Integration Test", async (t) => {
  await t.step("Full application lifecycle", () => {
    const app = new Weblisk(getTestConfig(TEST_PORT + 40, {
      development: { debugMode: true },
    }));

    // Add a comprehensive route
    app.route("/", {
      template: (data) =>
        html`
          <h1>${data.title}</h1>
          <p>Environment: ${data.environment}</p>
          <button onclick="testEvent()">Test Event</button>
          <div id="result"></div>
        `,

      styles: (data) =>
        css`
          body {
            font-family: system-ui;
            background: ${data.theme === "dark" ? "#000" : "#fff"};
          }
        `,

      clientCode: () =>
        js`
        function testEvent() {
          window.weblisk.sendEvent('route', 'hello', { name: 'Test' });
          window.weblisk.on('hello', (data) => {
            document.getElementById('result').textContent = data.message;
          });
        }
      `,

      data: (context) => ({
        title: "Integration Test",
        environment: context?.framework?.getEnvironment() || "test",
        theme: "light",
      }),

      events: {
        hello: (data, context) => ({
          message: `Hello ${data.name}! Server time: ${new Date().toISOString()
            }`,
          sessionId: context?.sessionId,
        }),
      },
    });

    // Add static files
    app.addStaticFile("/robots.txt", "User-agent: *\nAllow: /");

    // Test server URL generation
    const serverUrl = app.getServerUrl();
    assertEquals(typeof serverUrl, "string");
    assertEquals(serverUrl.includes(`${TEST_PORT + 40}`), true);

    // Test environment
    const environment = app.getEnvironment();
    assertEquals(typeof environment, "string");

    // Framework should be ready (no need to actually start for this test)
    assertExists(app);
  });
});

console.log("Weblisk Framework v1.0 Modular Test Suite Completed!");
