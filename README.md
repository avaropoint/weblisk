# Weblisk Framework v1.0

A revolutionary HTML-over-WebSocket framework for Deno featuring **single-file routes** with JavaScript-powered CSS, true SSR, and real-time capabilities.

## 🚀 What's New in v1.0

- **📄 Single-File Routes**: Everything in one place - CSS, HTML, JavaScript, and WebSocket handlers
- **🎨 JavaScript-Powered CSS**: Dynamic styling with server data access (like SASS but runtime)
- **⚡ True SSR + WebSocket**: Server-side rendering with real-time enhancement
- **🔧 Zero Build Tools**: No compilation, bundling, or build steps needed
- **💎 TypeScript Native**: Full type safety throughout the framework

## ✨ Features

- **Lightning Fast**: Built on Deno's native runtime with zero dependencies
- **Secure by Default**: Deno's permission-based security model
- **WebSocket First**: Real-time communication built into every route
- **Single-File Architecture**: Eliminate file sprawl with embedded everything
- **Dynamic CSS**: JavaScript-powered styling with server data access
- **True SSR**: Server-side rendering with client-side enhancement
- **Session Management**: Automatic cookie-based session persistence
- **Hot Reload Ready**: Built-in development workflow

## 🏗️ Project Structure

```
your-project/
├── lib/
│   ├── weblisk.ts       # Core framework (now with single-file routes)
│   ├── types.ts         # TypeScript definitions
│   ├── config.ts        # Configuration management
│   ├── logger.ts        # Logging system
│   └── helpers.ts       # Template helpers
├── src/
│   ├── app.ts           # Main application
│   └── routes/          # Single-file routes
│       ├── demo.ts      # Example route
│       └── ...          # Your routes
├── deno.json            # Deno configuration
└── README.md            # This file
```

## 🚀 Quick Start

### 1. Create a Single-File Route

```typescript
// src/routes/hello.ts
import { css, html, js, WebliskRoute } from "../../lib/weblisk.ts";

export default new WebliskRoute({
  // 🎨 Dynamic CSS with JavaScript power
  styles: (data) =>
    css`
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: linear-gradient(
          135deg,
          ${data.theme.primary},
          ${data.theme.secondary}
        );
        color: white;
        padding: 2rem;
        min-height: 100vh;
      }

      .container {
        max-width: 600px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.1);
        padding: 2rem;
        border-radius: 12px;
        backdrop-filter: blur(20px);
      }

      .btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }
    `,

  // 🏗️ Server-rendered HTML template
  template: (data) =>
    html`
      <div class="container">
        <h1>🚀 ${data.title}</h1>
        <p>Welcome ${data.user.name}! Current time: ${data.currentTime}</p>

        <button class="btn" data-action="greet">Say Hello</button>
        <button class="btn" data-action="time">Get Time</button>

        <div id="output" style="margin-top: 2rem;"></div>
      </div>
    `,

  // ⚡ Client-side enhancement
  clientCode: (data) =>
    js`
    console.log('Route enhanced with data:', ${JSON.stringify(data)});

    // Setup interactions
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;

        if (window.weblisk) {
          window.weblisk.sendEvent('hello', action, {
            timestamp: Date.now(),
            user: ${JSON.stringify(data.user)}
          });
        }
      });
    });

    // Listen for responses
    if (window.weblisk) {
      window.weblisk.on('hello-response', (response) => {
        document.getElementById('output').innerHTML =
          '<div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 6px;">' +
          '<h3>' + response.action + '</h3>' +
          '<p>' + response.message + '</p>' +
          '</div>';
      });
    }
  `,

  // 📊 Server-side data preparation
  data: async (context) => {
    return {
      title: "Hello Weblisk v1.0!",
      currentTime: new Date().toLocaleString(),
      user: {
        name: "Developer",
        id: crypto.randomUUID().slice(-8),
      },
      theme: {
        primary: "#667eea",
        secondary: "#764ba2",
      },
    };
  },

  // 🎯 WebSocket event handlers
  events: {
    greet: async (data, context) => {
      return {
        action: "Greeting",
        message: `Hello ${data.user.name}! Server time: ${
          new Date().toLocaleString()
        }`,
        success: true,
      };
    },

    time: async (data, context) => {
      return {
        action: "Time Check",
        message: `Current server time is ${new Date().toLocaleString()}`,
        serverTime: Date.now(),
      };
    },
  },

  meta: {
    title: "Hello Weblisk v1.0",
    description:
      "A demonstration of single-file routes with embedded everything",
    keywords: ["weblisk", "single-file", "websocket", "ssr"],
  },
});
```

### 2. Register the Route

```typescript
// src/app.ts
import Weblisk from "../lib/weblisk.ts";
import helloRoute from "./routes/hello.ts";

const app = new Weblisk();

// Register single-file route
app.route("/hello", helloRoute);

// Or auto-discover all routes in a directory
await app.discoverRoutes("./src/routes");

await app.start();
```

### 3. Run Your Application

```bash
# Development
deno task dev

# Production
deno task start
```

## 🎯 Core Concepts

### Single-File Routes

Each route is a complete, self-contained file with:

- **Dynamic CSS**: JavaScript-powered styling with server data access
- **HTML Templates**: Server-rendered with data injection
- **Client Enhancement**: Progressive enhancement with WebSocket integration
- **Server Logic**: Data preparation and business logic
- **Event Handlers**: Real-time WebSocket event processing

### JavaScript-Powered CSS

Style your components dynamically using server data:

```typescript
styles: ((data) =>
  css`
    :root {
      --primary: ${data.user.theme.primary};
      --bg: ${data.user.darkMode ? "#1a1a1a" : "#ffffff"};
    }

    .container {
      background: var(--bg);
      border: 2px solid var(--primary);
      display: grid;
      grid-template-columns: ${data.posts.length > 5
        ? "repeat(3, 1fr)"
        : "repeat(2, 1fr)"};
    }

    ${data.user.isVip
      ? css`
        .header {
          background: gold;
        }
      `
      : ""};
  `);
```

### True SSR + WebSocket Enhancement

- **Server-Side Rendering**: Initial HTML is fully rendered on the server
- **Progressive Enhancement**: WebSocket connection enhances the page with real-time features
- **Zero JavaScript Requirement**: Pages work without JavaScript, enhanced with it

### Real-Time Communication

Built-in WebSocket handling in every route:

```typescript
// Client to Server (in clientCode)
window.weblisk.sendEvent('routeName', 'eventName', data);

// Server to Client (in events)
events: {
  'eventName': async (data, context) => {
    return { message: 'Hello from server!' };
  }
}

// Listen for responses (in clientCode)
window.weblisk.on('route-response', (data) => {
  // Handle server response
});
```

## 📋 Available Commands

```bash
# Development server with hot reload
deno task dev

# Start production server
deno task start

# Format code
deno task fmt

# Lint code
deno task lint

# Run tests
deno task test
```

## 🆚 v1.0 vs v1.0 Comparison

| Feature             | v1.0 (Component-Based) | v1.0 (Single-File Routes)         |
| ------------------- | ---------------------- | --------------------------------- |
| Files per feature   | 1 component file       | 1 route file                      |
| CSS                 | Separate or inline     | JavaScript-powered, embedded      |
| HTML                | Client-side rendering  | True server-side rendering        |
| Real-time           | Manual WebSocket setup | Built-in WebSocket integration    |
| Code organization   | Mixed client/server    | Clear separation with enhancement |
| Syntax highlighting | Limited                | Full TypeScript + embedded assets |
| Deployment          | Component bundling     | Single files                      |

## 🎨 Template Helpers

Weblisk v1.0 includes powerful template helpers:

```typescript
import { createTheme, css, html, js, styles } from "../lib/weblisk.ts";

// CSS with JavaScript power
const dynamicStyles = css`
  body {
    background: ${condition ? "dark" : "light"};
  }
`;

// HTML with data injection
const template = html`
  <div>
    <h1>${data.title}</h1>
    ${data.items.map((item) => `<p>${item}</p>`).join("")}
  </div>
`;

// JavaScript with server data
const clientScript = js`
  console.log('Server data:', ${JSON.stringify(data)});
  setupInteractions();
`;

// Pre-built style utilities
const gridSystem = styles.grid({
  columns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "2rem",
});

// Theme system
const theme = createTheme({
  colors: { primary: "#667eea", secondary: "#764ba2" },
  spacing: { sm: "0.5rem", md: "1rem", lg: "2rem" },
  typography: { base: "1rem", lg: "1.25rem" },
});
```

## 🚀 Examples

### Home Page with Live Demos

Visit `http://localhost:3000/` to see:

- Dynamic styling with color changes
- Real-time data fetching via WebSocket
- Live counter updates
- Theme toggling

### Interactive Demo Page

Visit `http://localhost:3000/demo` to experience:

- Multi-theme support with live switching
- Weather data simulation
- Random quote generator
- System information display
- Live statistics updates

## 📦 Deployment

### Deno Deploy

```bash
deployctl deploy --project=your-project src/app.ts
```

### Docker

```dockerfile
FROM denoland/deno:1.37.0
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["deno", "run", "--allow-net", "--allow-read", "src/app.ts"]
```

### Traditional VPS

```bash
# Install Deno
curl -fsSL https://deno.land/x/install/install.sh | sh

# Run your app
deno run --allow-net --allow-read src/app.ts
```

## 🎯 Why Single-File Routes?

1. **🧠 Cognitive Load**: Everything related to a route is in one place
2. **🔧 Refactoring**: Change one file, not four
3. **♻️ Code Reuse**: Copy one file, get the entire feature
4. **🚀 Deployment**: Simple file management
5. **👥 Team Collaboration**: Clear ownership per route
6. **🎨 Dynamic Styling**: CSS that responds to server data
7. **⚡ Performance**: True SSR with progressive enhancement

## 📄 License

MIT License - feel free to use in your projects!

---

**Weblisk v1.0** - Revolutionary single-file routes for the modern web 🚀
