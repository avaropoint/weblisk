/**
 * Simple Weblisk Application Example
 * Demonstrates the clean library interface for developers
 */

import { css, html, js, Weblisk } from "../mod.ts";

// Create a new Weblisk application
const app = new Weblisk({
  server: { port: 3000 },
  development: { debugMode: true },
});

// Add a simple route
app.route("/", {
  template: (data) =>
    html`
      <h1>Welcome to ${data.appName}!</h1>
      <p>A minimal HTML-over-WebSocket framework for Deno</p>
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
      button:hover {
        background: #2563eb;
      }
      #output {
        margin-top: 1rem;
        padding: 1rem;
        background: white;
        border-radius: 0.25rem;
        border: 1px solid #e2e8f0;
      }
    `,

  clientCode: () =>
    js`
    function testWebSocket() {
      if (window.weblisk) {
        window.weblisk.sendEvent('route', 'test', { message: 'Hello from client!' });

        window.weblisk.on('test', (data) => {
          const outputElement = document.getElementById('output');
          if (outputElement) {
            // Use framework's proper DOM-based methods for maximum security
            const strongElement = webliskSafe.createSafeElement('strong', 'Server Response: ');
            const messageText = document.createTextNode(data.message || '');

            // Clear and append safely
            webliskSafe.clearAndAppend(outputElement, strongElement, messageText);
          }
        });
      }
    }
  `,

  data: () => ({
    appName: "Weblisk Framework",
  }),

  events: {
    test: (data) => {
      // Validate and sanitize input data
      const message = typeof data.message === "string"
        ? data.message.slice(0, 200) // Limit length
        : "Invalid message";

      return {
        message: "Received: " + message + " - Response from server!",
        timestamp: new Date().toISOString(),
      };
    },
  },
});

// Add static files
app.addStaticFile("/robots.txt", "User-agent: *\nAllow: /");
app.addStaticFile("/favicon.ico", "", "image/x-icon");

// Start the server
await app.start();

console.log("Weblisk app running on " + app.getServerUrl());
