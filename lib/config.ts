/**
 * Configuration Manager for Weblisk
 * Provides environment-based configuration with validation
 */

// Deep partial type for nested config objects
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface WebliskConfig {
  // Server configuration
  server: {
    port: number;
    hostname: string;
    enableHttps: boolean;
    certificatePath?: string;
    keyPath?: string;
  };

  // Logging configuration
  logging: {
    level: "DEBUG" | "INFO" | "WARN" | "ERROR";
    format: "json" | "text";
    enableColors: boolean;
    enableTimestamp: boolean;
    logFile?: string;
  };

  // WebSocket configuration
  websocket: {
    pingInterval: number;
    pongTimeout: number;
    maxConnections: number;
    compressionEnabled: boolean;
    reconnectInterval: number;
  };

  // Session configuration
  session: {
    cookieMaxAge: number;
    cookieName: string;
    cookieSecure: boolean;
    cookieSameSite: "Strict" | "Lax" | "None";
  };

  // Security configuration
  security: {
    corsEnabled: boolean;
    corsOrigins: string[];
    rateLimitEnabled: boolean;
    rateLimitRequests: number;
    rateLimitWindowMs: number;
    securityHeadersEnabled: boolean;
    contentSecurityPolicy: boolean;
    enableHSTS: boolean;
    trustProxy: boolean;
    sessionTimeout: number; // in seconds
  };

  // Monitoring configuration
  monitoring: {
    healthCheckEnabled: boolean;
    healthCheckInterval: number;
    metricsEnabled: boolean;
    metricsEndpoint: string;
  };

  // Development configuration
  development: {
    hotReload: boolean;
    debugMode: boolean;
    enableDevTools: boolean;
  };
}

export const defaultConfig: WebliskConfig = {
  server: {
    port: 3000,
    hostname: "localhost",
    enableHttps: false,
  },

  logging: {
    level: "INFO",
    format: "text",
    enableColors: true,
    enableTimestamp: true,
  },

  websocket: {
    pingInterval: 30000, // 30 seconds
    pongTimeout: 5000, // 5 seconds
    maxConnections: 1000,
    compressionEnabled: true,
    reconnectInterval: 3000, // 3 seconds for client reconnection
  },

  session: {
    cookieMaxAge: 60 * 60 * 24 * 7, // 7 days instead of 30
    cookieName: "weblisk-session-id",
    cookieSecure: false, // Auto-enabled when HTTPS is enabled
    cookieSameSite: "Lax",
  },

  security: {
    corsEnabled: false,
    corsOrigins: [], // Empty array = no CORS by default
    rateLimitEnabled: true, // Enable by default
    rateLimitRequests: 100,
    rateLimitWindowMs: 60000, // 1 minute
    securityHeadersEnabled: true,
    contentSecurityPolicy: true,
    enableHSTS: false, // Only enable with HTTPS
    trustProxy: false,
    sessionTimeout: 60 * 60 * 24 * 7, // 7 days instead of 30
  },

  monitoring: {
    healthCheckEnabled: true,
    healthCheckInterval: 30000, // 30 seconds
    metricsEnabled: false,
    metricsEndpoint: "/metrics",
  },

  development: {
    hotReload: false,
    debugMode: false,
    enableDevTools: false,
  },
};

export class WebliskConfigManager {
  private config: WebliskConfig;

  constructor(userConfig: DeepPartial<WebliskConfig> = {}) {
    this.config = this.mergeConfig(defaultConfig, userConfig);
    this.loadEnvironmentOverrides();
    // Single validation after all configuration is loaded
    this.validateConfig();
  }

  private mergeConfig(
    defaultConf: WebliskConfig,
    userConf: DeepPartial<WebliskConfig>,
  ): WebliskConfig {
    const result = structuredClone(defaultConf); // Deep clone the default config

    // Deep merge user config over default
    this.deepMerge(
      result as unknown as Record<string, unknown>,
      userConf as unknown as Record<string, unknown>,
    );

    return result;
  }

  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): void {
    for (const key in source) {
      if (source[key] !== undefined) {
        if (Array.isArray(source[key])) {
          target[key] = [...(source[key] as unknown[])];
        } else if (source[key] && typeof source[key] === "object") {
          if (!target[key] || typeof target[key] !== "object") {
            target[key] = {};
          }
          this.deepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>,
          );
        } else {
          target[key] = source[key];
        }
      }
    }
  }

  private validateConfig(): void {
    const errors: string[] = [];

    // Validate port
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push("Server port must be between 1 and 65535");
    }

    // Validate hostname
    if (
      !this.config.server.hostname || this.config.server.hostname.trim() === ""
    ) {
      errors.push("Server hostname cannot be empty");
    }

    // Validate HTTPS configuration
    if (this.config.server.enableHttps) {
      if (!this.config.server.certificatePath || !this.config.server.keyPath) {
        errors.push("HTTPS requires both certificatePath and keyPath");
      }
    }

    // Validate WebSocket configuration
    if (this.config.websocket.maxConnections < 1) {
      errors.push("Maximum connections must be at least 1");
    }

    if (this.config.websocket.pingInterval < 1000) {
      errors.push("Ping interval must be at least 1000ms");
    }

    // Validate session configuration
    if (this.config.session.cookieMaxAge < 1) {
      errors.push("Cookie max age must be positive");
    }

    // Validate rate limiting
    if (this.config.security.rateLimitEnabled) {
      if (this.config.security.rateLimitRequests < 1) {
        errors.push("Rate limit requests must be at least 1");
      }
      if (this.config.security.rateLimitWindowMs < 1000) {
        errors.push("Rate limit window must be at least 1000ms");
      }
    }

    // Validate CORS configuration
    if (this.config.security.corsEnabled) {
      if (this.config.security.corsOrigins.length === 0) {
        errors.push("CORS origins cannot be empty when CORS is enabled");
      }
      if (
        this.config.security.corsOrigins.includes("*") &&
        this.config.security.corsOrigins.length > 1
      ) {
        errors.push(
          "Wildcard CORS origin '*' cannot be mixed with specific origins",
        );
      }
    }

    // Validate HTTPS configuration for production
    if (!this.config.development.debugMode) {
      if (!this.config.server.enableHttps) {
        console.warn(
          "WARNING: HTTPS is disabled in production mode - this is insecure!",
        );
      }
      if (this.config.session.cookieSecure && !this.config.server.enableHttps) {
        errors.push("Secure cookies require HTTPS to be enabled");
      }
    } else {
      // Development mode - less strict validation
      if (this.config.server.enableHttps) {
        console.log("HTTPS enabled for development");
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
    }
  }

  private loadEnvironmentOverrides(): void {
    // Load configuration from environment variables
    const env = Deno.env.toObject();

    // Environment detection
    const environment = env.WEBLISK_ENV || env.NODE_ENV || "production";
    const isDebug = env.WEBLISK_DEBUG === "true";

    // Auto-configure development settings
    if (environment === "development" || isDebug) {
      this.config.development.debugMode = true;
      this.config.development.enableDevTools = true;
      this.config.logging.level = "DEBUG";
      console.log("Development mode enabled");
    }

    // Server configuration
    if (env.WEBLISK_PORT) {
      this.config.server.port = parseInt(env.WEBLISK_PORT, 10);
    }
    if (env.WEBLISK_HOSTNAME) {
      this.config.server.hostname = env.WEBLISK_HOSTNAME;
    }
    if (env.WEBLISK_HTTPS === "true") {
      this.config.server.enableHttps = true;
    }
    if (env.WEBLISK_CERT_PATH) {
      this.config.server.certificatePath = env.WEBLISK_CERT_PATH;
    }
    if (env.WEBLISK_KEY_PATH) {
      this.config.server.keyPath = env.WEBLISK_KEY_PATH;
    }

    // Logging configuration
    if (env.WEBLISK_LOG_LEVEL) {
      this.config.logging.level = env.WEBLISK_LOG_LEVEL as
        | "DEBUG"
        | "INFO"
        | "WARN"
        | "ERROR";
    }
    if (env.WEBLISK_LOG_FORMAT) {
      this.config.logging.format = env.WEBLISK_LOG_FORMAT as "json" | "text";
    }
    if (env.WEBLISK_LOG_FILE) {
      this.config.logging.logFile = env.WEBLISK_LOG_FILE;
    }

    // Development configuration
    if (env.WEBLISK_HOT_RELOAD === "true") {
      this.config.development.hotReload = true;
    }

    // Security configuration
    if (env.WEBLISK_CORS_ENABLED === "true") {
      this.config.security.corsEnabled = true;
    }
    if (env.WEBLISK_CORS_ORIGINS) {
      this.config.security.corsOrigins = env.WEBLISK_CORS_ORIGINS.split(",");
    }

    // Auto-enable secure cookies when HTTPS is enabled
    if (this.config.server.enableHttps) {
      this.config.session.cookieSecure = true;
      if (environment === "production") {
        this.config.security.enableHSTS = true;
      }
    }

    // No need to re-validate here since constructor will validate after this completes
  }

  get(): WebliskConfig {
    return { ...this.config };
  }

  getServer(): WebliskConfig["server"] {
    return { ...this.config.server };
  }

  getLogging(): WebliskConfig["logging"] {
    return { ...this.config.logging };
  }

  getWebSocket(): WebliskConfig["websocket"] {
    return { ...this.config.websocket };
  }

  getSession(): WebliskConfig["session"] {
    return { ...this.config.session };
  }

  getSecurity(): WebliskConfig["security"] {
    return { ...this.config.security };
  }

  getMonitoring(): WebliskConfig["monitoring"] {
    return { ...this.config.monitoring };
  }

  getDevelopment(): WebliskConfig["development"] {
    return { ...this.config.development };
  }

  isProduction(): boolean {
    return !this.config.development.debugMode &&
      !this.config.development.hotReload;
  }

  isDevelopment(): boolean {
    return this.config.development.debugMode ||
      this.config.development.hotReload;
  }

  updateConfig(updates: Partial<WebliskConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.validateConfig();
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  static fromFile(configPath: string): WebliskConfigManager {
    try {
      const configText = Deno.readTextFileSync(configPath);
      const userConfig = JSON.parse(configText) as Partial<WebliskConfig>;
      return new WebliskConfigManager(userConfig);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new Error(
        `Failed to load configuration from ${configPath}: ${errorMessage}`,
      );
    }
  }

  saveToFile(configPath: string): void {
    try {
      Deno.writeTextFileSync(configPath, this.exportConfig());
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new Error(
        `Failed to save configuration to ${configPath}: ${errorMessage}`,
      );
    }
  }
}

// Export singleton instance factory
let configInstance: WebliskConfigManager | null = null;

export function getDefaultConfig(): WebliskConfigManager {
  if (!configInstance) {
    configInstance = new WebliskConfigManager();
  }
  return configInstance;
}

// Export types
export type { DeepPartial };
