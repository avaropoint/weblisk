/**
 * Weblisk Security Module
 * Enhanced security features and middleware
 */

export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: Request) => string;
}

export class WebliskSecurity {
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  /**
   * Get security headers based on environment
   */
  getSecurityHeaders(isProduction: boolean): SecurityHeaders {
    const baseHeaders: SecurityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };

    if (isProduction) {
      const headers: SecurityHeaders = {
        ...baseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'", // Note: 'unsafe-inline' needed for framework JS
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' ws: wss:",
          "img-src 'self' data: https:",
          "font-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'"
        ].join('; ')
      };

      // Only add HSTS over HTTPS
      // Note: This should be controlled by the server configuration
      return headers;
    }

    // Development headers (more permissive)
    return {
      ...baseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self' ws: wss:",
        "img-src 'self' data: https: http:",
        "font-src 'self'",
        "object-src 'none'"
      ].join('; ')
    };
  }

  /**
   * Rate limiting middleware
   */
  checkRateLimit(request: Request, config: RateLimitConfig): boolean {
    const key = config.keyGenerator ? 
      config.keyGenerator(request) : 
      this.getClientIP(request);

    const now = Date.now();
    const entry = this.rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      // Reset or create new entry
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return true;
    }

    if (entry.count >= config.maxRequests) {
      return false; // Rate limit exceeded
    }

    entry.count++;
    return true;
  }

  /**
   * Extract client IP for rate limiting
   */
  private getClientIP(request: Request): string {
    // Check various headers for real IP
    const forwardedFor = request.headers.get('X-Forwarded-For');
    const realIP = request.headers.get('X-Real-IP');
    const cfConnectingIP = request.headers.get('CF-Connecting-IP');

    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback to connection info (may not be available in all environments)
    return 'unknown';
  }

  /**
   * Validate CORS origin
   */
  validateCorsOrigin(origin: string | null, allowedOrigins: string[]): boolean {
    if (!origin) return false;
    if (allowedOrigins.includes('*')) return true;
    return allowedOrigins.includes(origin);
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Basic HTML encoding
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Generate secure session ID
   */
  generateSecureSessionId(): string {
    // Use crypto.randomUUID() for secure random IDs
    return crypto.randomUUID();
  }

  /**
   * Validate session ID format
   */
  isValidSessionId(sessionId: string): boolean {
    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

export const security = new WebliskSecurity();
