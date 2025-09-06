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

  clientCode: () => js`
    // Use Weblisk's built-in safe functions for XSS protection
    let clickCount = 0;
    
    function updateDisplay() {
      const displayElement = document.getElementById('display');
      const input = document.getElementById('userInput');
      const userText = input.value.trim();
      
      clickCount++;
      
      // Input validation
      if (userText.length > 100) {
        webliskSafe.safeInnerHTML(displayElement, 
          '<span style="color: red;">Input too long (max 100 characters)</span>'
        );
        return;
      }
      
      // Use framework's safe HTML function to prevent XSS
      webliskSafe.safeInnerHTML(displayElement, 
        '<div style="padding: 10px; background: #f0f8ff; border-radius: 5px; margin: 10px 0;">' +
          '<strong>Click #' + clickCount + ':</strong><br>' +
          'User said: "<span style="color: #333;">' + (userText || 'Nothing yet!') + '</span>"<br>' +
          '<small style="color: #666;">Time: ' + new Date().toLocaleTimeString() + '</small>' +
        '</div>'
      );
      
      // Send to server via WebSocket (framework handles sanitization)
      if (window.weblisk && userText) {
        window.weblisk.sendEvent('route', 'user_action', {
          message: userText,
          clickCount: clickCount
        });
      }
    }
    
    // Handle server responses
    window.weblisk?.on('user_action', (data) => {
      console.log('Server response:', data);
      const responseDiv = document.getElementById('serverResponse') || 
                         document.createElement('div');
      responseDiv.id = 'serverResponse';
      
      // Safe display of server response
      webliskSafe.safeInnerHTML(responseDiv, 
        '<div style="padding: 8px; background: #e8f5e8; border-radius: 4px; margin-top: 10px;">' +
          '<strong>Server Echo:</strong> ' + data.echo + '<br>' +
          '<small>Processed at: ' + data.timestamp + '</small>' +
        '</div>'
      );
      
      document.body.appendChild(responseDiv);
    });
    
    // Add event listener for the button
    document.getElementById('actionButton').addEventListener('click', updateDisplay);
    
    // Handle Enter key in input
    document.getElementById('userInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        updateDisplay();
      }
    });
    
    console.log('Secure Weblisk example initialized with framework XSS protection');
  `,

  data: () => ({
    appName: "Weblisk Framework",
  }),

  events: {
    test: (data) => {
      // Validate and sanitize input data to prevent security issues
      const message = typeof data.message === 'string' 
        ? data.message.slice(0, 200) // Limit length to prevent DoS
        : 'Invalid message format';
      
      return {
        echo: 'Received: ' + message + ' - Response from server!',
        timestamp: new Date().toISOString(),
      };
    },
  },
});

// Add static files
app.addStaticFile("/robots.txt", "User-agent: *\nAllow: /");

// Start the server
await app.start();

console.log('🚀 Weblisk app running on ' + app.getServerUrl());
