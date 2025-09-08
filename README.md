# Weblisk Framework v1.0

A minimal HTML-over-WebSocket framework for Deno featuring **flexible route configuration** with JavaScript-powered CSS, true SSR, and real-time capabilities.

## 🚀 What's New in v1.0

- **🏗️ Modular Architecture**: Clean separation of concerns with dedicated modules for static files, WebSockets, monitoring, and more
- **🎯 Type-Based Routing (NEW)**: Intelligent route optimization based on usage patterns (static, realtime, api, form, stream)
- **📄 Flexible Routes**: Choose between object-based configuration, WebliskRoute class, or typed routes
- **🎨 JavaScript-Powered CSS**: Dynamic styling with server data access (like SASS but runtime)
- **⚡ True SSR + WebSocket**: Server-side rendering with real-time enhancement
- **🔧 Zero Build Tools**: No compilation, bundling, or build steps needed
- **💎 TypeScript Native**: Full type safety throughout the framework
- **🛡️ Production Ready**: Comprehensive security, monitoring, and configuration management

## 🎯 Type-Based Routing System

Weblisk now features an intelligent routing system that automatically optimizes routes based on their type and usage patterns:

### Route Types & Automatic Optimizations

| Route Type | Cache Strategy | WebSocket | Prerender | Use Case |
|------------|---------------|-----------|-----------|----------|
| `static` | Full caching | Disabled | ✅ | About pages, documentation |
| `realtime` | Structure only | Required | ❌ | Dashboards, live feeds |
| `api` | No caching | Disabled | ❌ | JSON endpoints |
| `form` | Template caching | Required | ❌ | Contact forms, submissions |
| `stream` | No caching | Streaming | ❌ | Live logs, data streams |
| `dynamic` | Structure only | Optional | ❌ | User profiles, content |
| `auth` | No caching | Optional | ❌ | Login, registration |
| `admin` | Structure caching | Required | ❌ | Admin panels |

### Quick Typed Route Examples

```typescript
import { Weblisk } from "./mod.ts";

const app = new Weblisk({ port: 3000 });

// Static route - automatically optimized for caching & SEO
app.static("/about", {
  template: () => `<h1>About Us</h1><p>Fully cached content</p>`,
});

// Real-time route - WebSocket streaming enabled
app.realtime("/dashboard", {
  template: () => `<div id="metrics">Loading live data...</div>`,
  clientCode: () => {
    setInterval(() => updateMetrics(), 1000);
  },
  events: {
    "metric:update": (data) => console.log("Live update:", data),
  },
});

// API route - optimized for JSON responses
app.api("/api/users", {
  data: async () => ({ users: await getUsers() }),
});

// Form route - enhanced with WebSocket validation
app.form("/contact", {
  template: () => `<form id="contact">...</form>`,
  events: {
    "form:submit": (data) => processForm(data),
  },
});

// Stream route - continuous data streaming
app.stream("/logs", {
  template: () => `<div id="log-stream">Live logs...</div>`,
  events: {
    "stream:data": (chunk) => appendLog(chunk),
  },
});
```

### Route Statistics & Monitoring

```typescript
// Get optimization insights
console.log(app.getTypedRouteStats());
// {
//   totalRoutes: 5,
//   routesByType: { static: 1, realtime: 1, api: 1, form: 1, stream: 1 },
//   prerenderableRoutes: 1,
//   websocketRoutes: 3,
//   realtimeRoutes: 2
// }

// Get prerenderable routes for SEO
const prerenderRoutes = app.getPrerenderableRoutes();

// Get WebSocket-enabled routes
const wsRoutes = app.getWebSocketRoutes();
```

## ✨ Features

- **Lightning Fast**: Built on Deno's native runtime with modular design
- **Secure by Default**: Deno's permission-based security model with built-in CSRF protection
- **WebSocket First**: Real-time communication built into every route
- **Flexible Architecture**: Choose simple objects or powerful route classes
- **Dynamic CSS**: JavaScript-powered styling with server data access
- **True SSR**: Server-side rendering with client-side enhancement
- **Session Management**: Automatic cookie-based session persistence
- **Health Monitoring**: Built-in health checks and metrics
- **Static File Management**: Efficient static file serving with ETag caching
- **Auto-Reload Ready**: Built-in development workflow

## 🏗️ Project Structure

```
your-project/
├── src/
│   ├── weblisk.ts       # Core framework
│   ├── routes.ts        # Route system and WebliskRoute class
│   ├── route-types.ts   # Typed routing system with optimizations
│   ├── static.ts        # Static file management
│   ├── websockets.ts    # WebSocket connection management
│   ├── monitor.ts       # Health monitoring and metrics
│   ├── security.ts      # Security middleware
│   ├── cookies.ts       # Cookie and session management
│   ├── config.ts        # Configuration management
│   ├── types.ts         # TypeScript definitions
│   ├── logger.ts        # Logging system
│   ├── helpers.ts       # Template helpers
│   └── index.ts         # Main exports
├── tests/
│   └── weblisk.test.ts  # Comprehensive test suite
├── mod.ts               # Framework entry point
├── deno.json            # Deno configuration
└── README.md            # This file
```

## 🚀 Quick Start

### 1. Simple Object-Based Route

```typescript
// src/app.ts
import { css, html, js, Weblisk } from "../mod.ts";

const app = new Weblisk({
  server: { port: 3000 },
  development: { debugMode: true },
});

app.route("/", {
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

        <button class="btn" onclick="sendEvent('greet')">Say Hello</button>
        <button class="btn" onclick="sendEvent('time')">Get Time</button>

        <div id="output" style="margin-top: 2rem;"></div>
      </div>
    `,

  // ⚡ Client-side enhancement
  clientCode: (data) =>
    js`
    console.log('Route enhanced with data:', ${JSON.stringify(data)});

    // Setup interactions
    function sendEvent(action) {
      if (window.Weblisk) {
        window.Weblisk.sendEvent(action, {
          timestamp: Date.now(),
          user: ${JSON.stringify(data.user)}
        });
      }
    }

    // Make function globally available
    window.sendEvent = sendEvent;
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
      "A demonstration of flexible route configuration with embedded everything",
    keywords: ["weblisk", "routes", "websocket", "ssr"],
  },
});

// Start the server
app.start();
```

### 2. Advanced Route with WebliskRoute Class

For more complex routes, you can use the `WebliskRoute` class:

```typescript
// src/routes/advanced.ts
import { css, html, js, WebliskRoute } from "../../mod.ts";

export default new WebliskRoute({
  // Same configuration options as above, but with additional class methods
  template: (data) =>
    html`
      <h1>Advanced Route: ${data.title}</h1>
    `,
  // Class-based routes support inheritance and method overrides
});

const app = new Weblisk();

// Register single-file route
app.route("/hello", helloRoute);

// Register the advanced route
app.route("/advanced", advancedRoute);

// Add static files
app.addStaticFile("/robots.txt", "User-agent: *\nAllow: /");

// Start the server
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

### Flexible Route Configuration

Routes can be configured using simple objects or the powerful `WebliskRoute` class:

- **Dynamic CSS**: JavaScript-powered styling with server data access
- **HTML Templates**: Server-rendered with data injection
- **Client Enhancement**: Progressive enhancement with WebSocket integration
- **Server Logic**: Data preparation and business logic
- **Event Handlers**: Real-time WebSocket event processing
- **Modular Architecture**: Separate concerns with dedicated modules

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
window.Weblisk.sendEvent('eventName', data);

// Server to Client (in events)
events: {
  'eventName': async (data, context) => {
    return { message: 'Hello from server!' };
  }
}
```

### Modular Architecture

Weblisk v1.0 features a clean modular design:

- **Static Files**: Efficient serving with ETag caching via `StaticFileManager`
- **WebSockets**: Real-time communication via `WebSocketManager`
- **Monitoring**: Health checks and metrics via `FrameworkMonitor`
- **Security**: CSRF protection and rate limiting via `security`
- **Configuration**: Environment-based config via `WebliskConfigManager`

## 📋 Available Commands

```bash
# Development server with auto-reload
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

## �️ Framework Features

| Feature             | Description                                    |
| ------------------- | ---------------------------------------------- |
| Route Configuration | Object-based or class-based routes             |
| CSS                 | JavaScript-powered, server data access         |
| HTML                | True server-side rendering with data injection |
| Real-time           | Built-in WebSocket integration                 |
| Session Management  | Automatic cookie-based sessions                |
| Static Files        | ETag caching and efficient serving             |
| Health Monitoring   | Built-in health checks and metrics             |
| Security            | CSRF protection and rate limiting              |
| Type Safety         | Full TypeScript support throughout             |
| Development         | Auto-reload and comprehensive dev tools        |

## 🎨 Template Helpers

Weblisk v1.0 includes powerful template helpers:

```typescript
import { css, html, js } from "./mod.ts";

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

````
## 🌟 Production Features

### Development Tools
- **Auto-Reload**: Automatic server restart on file changes
- **Debug Mode**: Comprehensive logging and error reporting
- **Type Safety**: Full TypeScript support with strict checking
- **Testing**: Comprehensive test suite with 18 test scenarios

### Production Ready
- **Health Monitoring**: Built-in `/health` endpoint with metrics
- **Static File Serving**: Efficient ETag caching and MIME type detection
- **Session Management**: Secure cookie-based sessions
- **Security**: CSRF protection, rate limiting, and security headers
- **Configuration**: Environment-based configuration management

### Performance
- **True SSR**: Server-side rendering for fast initial page loads
- **WebSocket Optimization**: Efficient real-time communication
- **Static Caching**: ETag-based caching for static assets
- **Modular Architecture**: Clean separation of concerns for maintainability

## 📦 Deployment

### Deno Deploy

```bash
deployctl deploy --project=your-project src/app.ts
````

### Traditional VPS

```bash
# Install Deno
curl -fsSL https://deno.land/x/install/install.sh | sh

# Run your app with production settings
WEBLISK_ENV=production deno run --allow-net --allow-read --allow-env src/app.ts
```

## 🎯 Why Weblisk v1.0?

1. **🧠 Minimal Cognitive Load**: Simple object-based or class-based routes
2. **🏗️ Modular Architecture**: Clean separation with dedicated modules
3. **♻️ Code Reuse**: Copy configurations, extend with classes
4. **🚀 Zero Build Tools**: No compilation or bundling required
5. **👥 Team Collaboration**: Clear module ownership and responsibilities
6. **🎨 Dynamic Styling**: CSS that responds to server data in real-time
7. **⚡ Performance**: True SSR with progressive WebSocket enhancement
8. **🛡️ Production Ready**: Built-in security, monitoring, and configuration
9. **💎 Type Safety**: Full TypeScript support throughout the framework
10. **🔧 Developer Experience**: Auto-reload, comprehensive testing, and excellent tooling

## 📄 License

MIT License - feel free to use in your projects!

---

**Weblisk v1.0** - A minimal, production-ready HTML-over-WebSocket framework for Deno 🚀
