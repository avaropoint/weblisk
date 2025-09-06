/**
 * Type definitions for Weblisk Framework
 * Production-grade type safety with single-file routes
 */

// Core message types for WebSocket communication
export interface WebliskMessage {
  type: string;
  [key: string]: unknown;
}

export interface ServerEventMessage extends WebliskMessage {
  type: "server-event";
  component: string;
  event: string;
  payload: unknown;
}

export interface ComponentInitMessage extends WebliskMessage {
  type: "component-init";
  component: string;
  context: Record<string, unknown>;
  clientCode: string | null;
}

export interface EventResultMessage extends WebliskMessage {
  type: "event-result";
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface BroadcastMessage extends WebliskMessage {
  type: string;
  data: Record<string, unknown>;
}

export interface SetSessionMessage extends WebliskMessage {
  type: "set-session-id";
  sessionId: string;
}

// Union type for all possible WebSocket messages
export type WebSocketMessage = 
  | ServerEventMessage 
  | ComponentInitMessage 
  | EventResultMessage 
  | BroadcastMessage
  | SetSessionMessage;

// 📄 Single-file route configuration
export interface RouteConfig {
  // Dynamic styles with server data access
  styles?: (data: any) => string;
  
  // Server-rendered HTML template
  template: (data: any) => string;
  
  // Client-side enhancement code
  clientCode?: (data: any) => string;
  
  // Server-side data preparation
  data?: (context: RouteContext) => Promise<any> | any;
  
  // WebSocket event handlers
  events?: Record<string, (data: any, context: any) => Promise<any> | any>;
  
  // Route metadata
  meta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
}

// Route rendering context
export interface RouteContext {
  request: Request;
  url: URL;
  framework: any; // WebliskFramework interface
  sessionId?: string;
}

// Event handler types with proper typing
export interface ComponentEventHandler {
  (data: unknown, connection: WebSocketConnection): Promise<unknown> | unknown;
}

export interface ComponentContext {
  data: Record<string, unknown>;
  events: Record<string, ComponentEventHandler>;
  framework: WebliskFramework;
}

export interface ComponentDefinition {
  server?: (context: ComponentContext) => void | Promise<void>;
  client?: () => void;
}

export interface WebSocketConnection {
  id: string;
  sessionId?: string;
  socket: WebSocket;
  send(data: unknown): void;
}

// Framework interface for better separation
export interface WebliskFramework {
  component(name: string, definition: ComponentDefinition): WebliskFramework;
  route(path: string, routeConfig: RouteConfig): WebliskFramework;
  discoverRoutes(routesDir: string): Promise<WebliskFramework>;
  start(): Promise<void>;
  broadcast(message: unknown): void;
  broadcastToSession(sessionId: string, message: unknown): void;
  getConnectionsBySessionId(sessionId: string): WebSocketConnection[];
  getRouteInfo(): Record<string, any>;
}

// Client-side window extensions
export interface WebliskWindow {
  __WEBLISK_CONTEXT__?: Record<string, unknown>;
  __WEBLISK_SESSION_ID__?: string;
  __WEBLISK_DATA__?: Record<string, unknown>;
  getContext(): Record<string, unknown>;
  getSessionId(): string;
  getData(key: string): unknown;
  setData(key: string, value: unknown): void;
  sendEvent(component: string, event: string, data: Record<string, unknown>): void;
  onEvent(event: string, handler: (data: unknown) => void): void;
  css(strings: TemplateStringsArray, ...values: any[]): string;
  html(strings: TemplateStringsArray, ...values: any[]): string;
  js(strings: TemplateStringsArray, ...values: any[]): string;
  weblisk: WebliskClient;
}

export interface WebliskClient {
  ws: WebSocket | null;
  eventHandlers: Record<string, Array<(data: unknown) => void>>;
  isConnected: boolean;
  sessionId: string;
  connect(): void;
  send(type: string, data: Record<string, unknown>): void;
  on(event: string, handler: (data: unknown) => void): void;
}

// Error types
export class WebliskError extends Error {
  constructor(
    message: string,
    public code?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WebliskError";
  }
}

export class ComponentError extends WebliskError {
  constructor(
    message: string,
    public componentName: string,
    context?: Record<string, unknown>
  ) {
    super(message, "COMPONENT_ERROR", { componentName, ...context });
    this.name = "ComponentError";
  }
}

export class ConnectionError extends WebliskError {
  constructor(
    message: string,
    public connectionId: string,
    context?: Record<string, unknown>
  ) {
    super(message, "CONNECTION_ERROR", { connectionId, ...context });
    this.name = "ConnectionError";
  }
}

export class ServerError extends WebliskError {
  constructor(
    message: string,
    public port?: number,
    context?: Record<string, unknown>
  ) {
    super(message, "SERVER_ERROR", { port, ...context });
    this.name = "ServerError";
  }
}

// Framework interface
export interface IWebliskFramework {
  route(path: string, routeConfig: IRouteConfig | any): IWebliskFramework;
  addStaticFile(path: string, content: string, contentType?: string): void;
  loadStaticFiles(directory: string): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  getServerUrl(): string;
  getEnvironment(): string;
}

// Logging interface
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}
