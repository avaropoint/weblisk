/**
 * Cookie Management Module for Weblisk
 * Handles session cookies, security, and cookie parsing/generation
 */

import { security } from "./security.ts";
import { logger } from "./logger.ts";

export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface SessionCookieConfig {
  cookieName: string;
  cookieMaxAge: number;
  cookieSecure: boolean;
  cookieSameSite: "Strict" | "Lax" | "None";
}

export class CookieManager {
  private config: SessionCookieConfig;

  constructor(config: SessionCookieConfig) {
    this.config = config;
  }

  /**
   * Parse cookies from request headers
   */
  parseCookies(request: Request): Record<string, string> {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) {
      return {};
    }

    const cookies: Record<string, string> = {};
    const pairs = cookieHeader.split(";");

    for (const pair of pairs) {
      const [name, ...valueParts] = pair.trim().split("=");
      if (name && valueParts.length > 0) {
        const value = valueParts.join("=");
        cookies[name] = decodeURIComponent(value);
      }
    }

    return cookies;
  }

  /**
   * Get session ID from request
   */
  getSessionId(request: Request): string | null {
    const cookies = this.parseCookies(request);
    const sessionId = cookies[this.config.cookieName];

    if (sessionId && security.isValidSessionId(sessionId)) {
      return sessionId;
    }

    return null;
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return security.generateSecureSessionId();
  }

  /**
   * Create session cookie header
   */
  createSessionCookie(
    sessionId: string,
    options: Partial<CookieOptions> = {},
  ): string {
    const cookieOptions: CookieOptions = {
      maxAge: this.config.cookieMaxAge,
      secure: this.config.cookieSecure,
      httpOnly: true,
      sameSite: this.config.cookieSameSite,
      path: "/",
      ...options,
    };

    return this.formatCookie(this.config.cookieName, sessionId, cookieOptions);
  }

  /**
   * Create a cookie header string
   */
  createCookie(
    name: string,
    value: string,
    options: CookieOptions = {},
  ): string {
    return this.formatCookie(name, value, options);
  }

  /**
   * Format cookie with options
   */
  private formatCookie(
    name: string,
    value: string,
    options: CookieOptions,
  ): string {
    const parts = [`${name}=${encodeURIComponent(value)}`];

    if (options.maxAge !== undefined) {
      parts.push(`Max-Age=${options.maxAge}`);
    }

    if (options.expires) {
      parts.push(`Expires=${options.expires.toUTCString()}`);
    }

    if (options.domain) {
      parts.push(`Domain=${options.domain}`);
    }

    if (options.path) {
      parts.push(`Path=${options.path}`);
    }

    if (options.secure) {
      parts.push("Secure");
    }

    if (options.httpOnly) {
      parts.push("HttpOnly");
    }

    if (options.sameSite) {
      parts.push(`SameSite=${options.sameSite}`);
    }

    return parts.join("; ");
  }

  /**
   * Handle session for request/response
   */
  handleSession(request: Request): {
    sessionId: string;
    isNewSession: boolean;
    cookieHeader?: string;
  } {
    let sessionId = this.getSessionId(request);
    let isNewSession = false;
    let cookieHeader: string | undefined;

    if (!sessionId) {
      sessionId = this.generateSessionId();
      isNewSession = true;
      cookieHeader = this.createSessionCookie(sessionId);

      logger.debug("Generated new session", {
        sessionId: sessionId.slice(-8), // Log only last 8 chars for security
      });
    } else {
      logger.debug("Using existing session", {
        sessionId: sessionId.slice(-8),
      });
    }

    return {
      sessionId,
      isNewSession,
      cookieHeader,
    };
  }

  /**
   * Create delete cookie header (for logout)
   */
  createDeleteCookie(
    name: string,
    options: Partial<CookieOptions> = {},
  ): string {
    return this.formatCookie(name, "", {
      ...options,
      maxAge: 0,
      expires: new Date(0),
    });
  }

  /**
   * Delete session cookie
   */
  deleteSessionCookie(): string {
    return this.createDeleteCookie(this.config.cookieName, {
      path: "/",
      secure: this.config.cookieSecure,
      httpOnly: true,
      sameSite: this.config.cookieSameSite,
    });
  }

  /**
   * Validate cookie name (prevent injection)
   */
  static isValidCookieName(name: string): boolean {
    // Cookie names should not contain special characters
    return /^[a-zA-Z0-9_-]+$/.test(name);
  }

  /**
   * Validate cookie value (prevent injection)
   */
  static isValidCookieValue(value: string): boolean {
    // Cookie values should not contain control characters or semicolons
    // deno-lint-ignore no-control-regex
    return !/[\x00-\x1F\x7F;]/.test(value);
  }

  /**
   * Get cookie configuration
   */
  getConfig(): SessionCookieConfig {
    return { ...this.config };
  }

  /**
   * Update cookie configuration
   */
  updateConfig(config: Partial<SessionCookieConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get secure cookie defaults based on environment
   */
  static getSecureDefaults(
    isHttps: boolean,
    isProduction: boolean,
  ): Partial<CookieOptions> {
    return {
      secure: isHttps || isProduction,
      httpOnly: true,
      sameSite: isProduction ? "Strict" : "Lax",
      path: "/",
    };
  }

  /**
   * Extract all cookies as key-value pairs
   */
  getAllCookies(request: Request): Record<string, string> {
    return this.parseCookies(request);
  }

  /**
   * Check if request has specific cookie
   */
  hasCookie(request: Request, name: string): boolean {
    const cookies = this.parseCookies(request);
    return name in cookies;
  }

  /**
   * Get specific cookie value
   */
  getCookie(request: Request, name: string): string | null {
    const cookies = this.parseCookies(request);
    return cookies[name] || null;
  }
}
