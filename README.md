# Weblisk Framework v1.0

A minimal, lightning-fast HTML-over-WebSocket framework for Deno that enables real-time applications with native TypeScript support and zero dependencies.

## Features

- **Lightning Fast**: Built on Deno's native runtime with zero dependencies
- **Secure by Default**: Deno's permission-based security model
- **Zero Dependencies**: No external packages required
- **TypeScript Native**: Full TypeScript support out of the box
- **Real-time**: Native WebSocket support for instant communication
- **Minimal**: Clean separation between framework library and your app
- **Hot Reload Ready**: Built-in development workflow
- **Session Management**: Automatic cookie-based session persistence

## Project Structure

```
your-project/
├── lib/
│   └── weblisk.ts     # Core framework library (minimal, no HTML/CSS)
├── src/
│   └── app.ts         # Your application code
├── deno.json          # Deno configuration
└── README.md          # This file
```

## Quick Start

### 1. Create your app

```typescript
// src/app.ts
import Weblisk from "../lib/weblisk.ts";

const app = new Weblisk(3000, "localhost");

app.component("app", {
  server: (context) => {
    context.data = {
      message: "Hello Weblisk!",
      timestamp: new Date().toISOString(),
    };

    context.events = {
      sayHello: async (data: any, connection) => {
        console.log(`Session: ${connection.sessionId}`);
        return {
          message: `Hello, ${data.name}!`,
          sessionId: connection.sessionId,
        };
      },
    };
  },

  client: () => {
    const data = (window as any).__WEBLISK_CONTEXT__;

    document.getElementById("weblisk-app")!.innerHTML = `
      <h1>${data.message}</h1>
      <p>Session: ${(window as any).getSessionId()?.slice(-8)}</p>
      <input id="nameInput" placeholder="Your name">
      <button onclick="sayHello()">Say Hello</button>
      <div id="output"></div>
    `;

    (window as any).sayHello = () => {
      const name = (document.getElementById("nameInput") as HTMLInputElement)
        .value;
      (window as any).send("server-event", {
        component: "app",
        event: "sayHello",
        payload: { name },
      });
    };

    (window as any).on("event-result", (result: any) => {
      document.getElementById("output")!.textContent = result.result.message;
    });
  },
});

await app.start();
```

### 2. Run your application

```bash
# Development with hot reload
deno task dev

# Production
deno task start
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

## Core Concepts

### Session Management

Weblisk automatically manages user sessions using cookies:

- **Persistent Sessions**: Each user gets a unique session ID stored in a `weblisk-session-id` cookie
- **Cross-Refresh Persistence**: Session IDs persist across browser refreshes and page reloads
- **30-Day Expiration**: Cookies automatically expire after 30 days
- **Server Access**: Session IDs are available on both client and server sides

```typescript
// Server-side: Access session ID from connection
context.events = {
  myEvent: async (data, connection) => {
    console.log(`Session: ${connection.sessionId}`);

    // Broadcast to specific session
    app.broadcastToSession(connection.sessionId!, {
      type: "personal-message",
      data: { message: "Hello just for you!" },
    });

    return { sessionId: connection.sessionId };
  },
};

// Client-side: Access session ID
const sessionId = getSessionId();
console.log(`My session: ${sessionId}`);
```

### Components

Components are the building blocks of Weblisk applications. Each component has:

- **Server Logic**: Handles data preparation and server-side events
- **Client Logic**: Manages UI rendering and client-side interactions

```typescript
app.component("myComponent", {
  server: (context) => {
    // Prepare data for the client
    context.data = {
      /* your data */
    };

    // Define server-side event handlers
    context.events = {
      myEvent: async (data, connection) => {
        // Handle server event
        return { success: true, sessionId: connection.sessionId };
      },
    };
  },

  client: () => {
    // Access server data
    const data = (window as any).__WEBLISK_CONTEXT__;

    // Render UI
    document.getElementById("weblisk-app")!.innerHTML = "...";

    // Send events to server
    (window as any).send("server-event", {
      component: "myComponent",
      event: "myEvent",
      payload: {
        /* data */
      },
    });
  },
});
```

### Real-time Communication

Weblisk provides seamless client-server communication:

```typescript
// Client to Server
(window as any).send("server-event", {
  component: "app",
  event: "eventName",
  payload: data,
});

// Server to Client (broadcast to all)
app.broadcast({
  type: "custom-event",
  data: { message: "Hello everyone!" },
});

// Server to Client (broadcast to specific session)
app.broadcastToSession(sessionId, {
  type: "personal-event",
  data: { message: "Hello just for you!" },
});

// Listen for events on client
(window as any).on("custom-event", (data) => {
  console.log(data.message);
});
```

## Framework Philosophy

### Minimal Library

The Weblisk library (`lib/weblisk.ts`) contains:

- ✅ Core WebSocket handling
- ✅ Component registration system
- ✅ Event management
- ✅ Session management with cookies
- ✅ Minimal HTML shell (just the container)
- ❌ No styling or design decisions
- ❌ No configuration complexity
- ❌ No HTML content beyond the shell

### App-Focused Development

Your application (`src/app.ts`) contains:

- ✅ All your HTML, CSS, and styling
- ✅ Business logic and data
- ✅ Component definitions
- ✅ Custom interactions
- ✅ Full control over the user experience

## Development

### Prerequisites

- [Deno](https://deno.land/) v1.0 or higher

### Clone and Run

```bash
git clone <your-repo>
cd <your-project>
deno task dev
```

### File Permissions

Weblisk requires minimal permissions:

- `--allow-net`: For WebSocket server
- `--allow-read`: For serving files (dev mode only)

## 📦 Deployment

### Deno Deploy

```bash
# Deploy directly to Deno Deploy
deployctl deploy --project=your-project src/app.ts
```

### Docker

```dockerfile
FROM denoland/deno:1.37.0
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["deno", "run", "--allow-net", "src/app.ts"]
```

### Traditional VPS

```bash
# Install Deno
curl -fsSL https://deno.land/x/install/install.sh | sh

# Run your app
deno run --allow-net src/app.ts
```

## 🎯 Examples

Check out the included demo in `src/app.ts` for a full-featured example with:

- Interactive forms
- Real-time broadcasting
- Server-client communication
- Session persistence across refreshes
- Modern responsive design

## 📄 License

MIT License - feel free to use in your projects!

---

**Weblisk** - Built with ❤️ for the Deno ecosystem
