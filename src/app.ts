import Weblisk from "../lib/weblisk.ts";

// Create the Weblisk app
const app = new Weblisk(3000, "localhost");

// Register the main app component
app.component("app", {
  server: (context) => {
    console.log("App component server logic executing...");

    context.data = {
      title: "Weblisk HTML over Websocket Framework",
      message: "Welcome to Weblisk!",
      version: "0.1",
      timestamp: new Date().toISOString(),
      features: [
        "Lightning-fast Deno runtime",
        "Security by default",
        "Zero dependencies",
        "Built-in TypeScript",
        "Native WebSocket support",
        "Hot reload ready",
      ],
    };

    context.events = {
      sayHello: async (data: any, connection) => {
        const name = data.name || "World";
        console.log(`Saying hello to: ${name} from connection ${connection.id} (session: ${connection.sessionId?.slice(-8) || 'unknown'})`);

        return {
          success: true,
          message: `Hello, ${name}!!`,
          timestamp: new Date().toISOString(),
          connectionId: connection.id,
          sessionId: connection.sessionId?.slice(-8) || 'unknown',
        };
      },

      testBroadcast: async (data: any, connection) => {
        const message = data.message || "Test broadcast";
        console.log(`Broadcasting message: ${message} from session ${connection.sessionId?.slice(-8) || 'unknown'}`);

        // Broadcast to all connected clients
        app.broadcast({
          type: "broadcast-message",
          data: {
            message,
            from: `User-${connection.sessionId?.slice(-8) || connection.id.slice(-4)}`,
            timestamp: new Date().toISOString(),
          },
        });

        return {
          success: true,
          message: "Broadcast sent to all connected clients!",
        };
      },

      getFrameworkInfo: async () => {
        return {
          success: true,
          info: {
            framework: "Weblisk",
            version: "2.0.0",
            runtime: "Deno",
            features: context.data.features,
            timestamp: new Date().toISOString(),
          },
        };
      },
    };
  },

  client: () => {
    console.log("App component client logic executing...");

    const data = (window as any).getServerData();

    // Create the app UI
    document.getElementById("app")!.innerHTML = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: system-ui, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: white;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          text-align: center;
        }
        .header {
          margin-bottom: 3rem;
        }
        .title {
          font-size: 3.5rem;
          margin-bottom: 1rem;
        }
        .subtitle {
          font-size: 1.5rem;
          opacity: 0.9;
          margin-bottom: 1rem;
        }
        .version-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 1rem;
        }
        .main-content {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
        }
        .demo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .demo-card {
          background: rgba(255,255,255,0.1);
          padding: 1.5rem;
          border-radius: 15px;
        }
        .demo-input {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 1rem;
        }
        .demo-button {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s;
          color: white;
        }
        .btn-primary { background: #007acc; }
        .btn-primary:hover { background: #0056b3; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #1e7e34; }
        .btn-info { background: #6f42c1; }
        .btn-info:hover { background: #5a2d8b; }
        .output-area {
          background: rgba(0,0,0,0.3);
          padding: 1.5rem;
          border-radius: 15px;
          min-height: 150px;
          font-family: monospace;
          text-align: left;
          white-space: pre-wrap;
          overflow-y: auto;
          max-height: 300px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          text-align: left;
        }
        .feature-item {
          background: rgba(255,255,255,0.1);
          padding: 1rem;
          border-radius: 10px;
        }
        .footer {
          background: rgba(255,255,255,0.05);
          padding: 1.5rem;
          border-radius: 15px;
        }
      </style>

      <div class="container">
        <header class="header">
          <h1 class="title">${data.title}</h1>
          <p class="subtitle">${data.message}</p>
          <div class="version-badge">
            v${data.version} • ${new Date(data.timestamp).toLocaleTimeString()}
          </div>
          <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
            🆔 Session ID: <span id="session-display">${(window as any).getSessionId()?.slice(-8) || 'Loading...'}</span>
          </div>
        </header>

        <main class="main-content">
          <h2 style="margin-bottom: 1.5rem;">🎯 Interactive Demo</h2>

          <div class="demo-grid">
            <div class="demo-card">
              <h3 style="margin-bottom: 1rem;">👋 Say Hello</h3>
              <input id="nameInput" type="text" placeholder="Enter your name" class="demo-input">
              <button onclick="sayHello()" class="demo-button btn-primary">
                Say Hello! 👋
              </button>
            </div>

            <div class="demo-card">
              <h3 style="margin-bottom: 1rem;">📢 Broadcast</h3>
              <input id="broadcastInput" type="text" placeholder="Enter message to broadcast" class="demo-input">
              <button onclick="testBroadcast()" class="demo-button btn-success">
                Broadcast Message 📢
              </button>
            </div>

            <div class="demo-card">
              <h3 style="margin-bottom: 1rem;">ℹ️ Framework Info</h3>
              <button onclick="getFrameworkInfo()" class="demo-button btn-info">
                Get Framework Info ℹ️
              </button>
            </div>
          </div>

          <div id="output" class="output-area">Try the interactive demo above! Messages will appear here.</div>
        </main>

        <footer class="footer">
          <h3 style="margin-bottom: 1rem;">🚀 Framework Features</h3>
          <div class="features-grid">
            ${data.features.map((feature: string) => `
              <div class="feature-item">${feature}</div>
            `).join('')}
          </div>
        </footer>
      </div>
    `;

    // Event handlers
    (window as any).sayHello = () => {
      const nameInput = document.getElementById("nameInput") as HTMLInputElement;
      const name = nameInput?.value.trim();
      if (!name) {
        render("Please enter a name first!");
        return;
      }

      (window as any).send("server-event", {
        component: "app",
        event: "sayHello",
        payload: { name }
      });
    };

    (window as any).testBroadcast = () => {
      const broadcastInput = document.getElementById("broadcastInput") as HTMLInputElement;
      const message = broadcastInput?.value.trim();
      if (!message) {
        render("Please enter a message to broadcast!");
        return;
      }

      (window as any).send("server-event", {
        component: "app",
        event: "testBroadcast",
        payload: { message }
      });
    };

    (window as any).getFrameworkInfo = () => {
      (window as any).send("server-event", {
        component: "app",
        event: "getFrameworkInfo",
        payload: {}
      });
    };

    function render(message: string) {
      const output = document.getElementById("output");
      if (output) {
        const timestamp = new Date().toLocaleTimeString();
        output.textContent += `[${timestamp}] ${message}\n`;
        output.scrollTop = output.scrollHeight;
      }
    }

    // Event listeners
    (window as any).on("event-result", (data: any) => {
      if (data.success) {
        render(`${JSON.stringify(data.result, null, 2)}`);
      } else {
        render(`Error: ${data.error}`);
      }
    });

    (window as any).on("broadcast-message", (data: any) => {
      render(`Broadcast from ${data.data.from}: "${data.data.message}"`);
    });

    render("Weblisk app loaded successfully!");
    render(`Weblisk session ID: ${(window as any).getSessionId()?.slice(-8) || 'Loading...'}`);
    console.log("Weblisk component ready for interaction!");
  },
});
await app.start();
