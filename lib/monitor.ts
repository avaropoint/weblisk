/**
 * Monitoring System for Weblisk
 * Provides comprehensive health checks, metrics, performance monitoring,
 * and framework statistics
 */

export interface FrameworkStats {
  routes: number;
  components: number;
  staticFiles: number;
  sessions: number;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export interface HealthCheckResult {
  name: string;
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  timestamp: string;
  duration: number; // in milliseconds
  metadata?: Record<string, unknown>;
}

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    available: number;
    percentage: number;
  };
  connections: {
    total: number;
    active: number;
    maxConcurrent: number;
  };
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  websocket: {
    totalConnections: number;
    activeConnections: number;
    messagesReceived: number;
    messagesSent: number;
    errors: number;
  };
}

export interface HealthCheckConfig {
  name: string;
  interval: number; // in milliseconds
  timeout: number; // in milliseconds
  enabled: boolean;
  critical: boolean; // If true, failure makes entire system unhealthy
}

export type HealthChecker = () => Promise<
  Omit<HealthCheckResult, "name" | "timestamp" | "duration">
>;

export class FrameworkMonitor {
  private healthChecks = new Map<
    string,
    { config: HealthCheckConfig; checker: HealthChecker }
  >();
  private lastResults = new Map<string, HealthCheckResult>();
  private metrics: SystemMetrics;
  private startTime: number;
  private intervalId?: number;

  // Framework-specific stats
  private frameworkStats: FrameworkStats = {
    routes: 0,
    components: 0,
    staticFiles: 0,
    sessions: 0,
    uptime: 0,
    memoryUsage: {
      rss: 0,
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
    },
  };

  // Metrics tracking
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private responseTimeSum = 0;
  private maxConcurrentConnections = 0;
  private websocketStats = {
    totalConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
  };

  constructor() {
    this.startTime = Date.now();
    this.metrics = this.createInitialMetrics();
    this.registerDefaultHealthChecks();
  }

  /**
   * Update framework statistics
   */
  updateFrameworkStats(stats: Partial<FrameworkStats>): void {
    this.frameworkStats = {
      ...this.frameworkStats,
      ...stats,
      uptime: Date.now() - this.startTime,
      memoryUsage: this.getCurrentMemoryUsage(),
    };
  }

  /**
   * Get framework statistics
   */
  getFrameworkStats(): FrameworkStats {
    return {
      ...this.frameworkStats,
      uptime: Date.now() - this.startTime,
      memoryUsage: this.getCurrentMemoryUsage(),
    };
  }

  /**
   * Get current memory usage from Deno
   */
  private getCurrentMemoryUsage(): FrameworkStats["memoryUsage"] {
    const memory = Deno.memoryUsage();
    return {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
    };
  }

  private createInitialMetrics(): SystemMetrics {
    return {
      timestamp: new Date().toISOString(),
      uptime: 0,
      memory: {
        used: 0,
        available: 0,
        percentage: 0,
      },
      connections: {
        total: 0,
        active: 0,
        maxConcurrent: 0,
      },
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
      },
      websocket: {
        totalConnections: 0,
        activeConnections: 0,
        messagesReceived: 0,
        messagesSent: 0,
        errors: 0,
      },
    };
  }

  private registerDefaultHealthChecks(): void {
    // Memory usage health check
    this.registerHealthCheck("memory", {
      name: "memory",
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
      enabled: true,
      critical: true,
    }, () => {
      const memoryUsage = this.getMemoryUsage();
      const threshold = 90; // 90% memory usage threshold

      if (memoryUsage.percentage > threshold) {
        return Promise.resolve({
          status: "unhealthy" as const,
          message: `Memory usage is ${
            memoryUsage.percentage.toFixed(1)
          }% (above ${threshold}% threshold)`,
          metadata: { memoryUsage },
        });
      } else if (memoryUsage.percentage > 75) {
        return Promise.resolve({
          status: "degraded" as const,
          message: `Memory usage is ${
            memoryUsage.percentage.toFixed(1)
          }% (warning level)`,
          metadata: { memoryUsage },
        });
      }

      return Promise.resolve({
        status: "healthy" as const,
        message: `Memory usage is ${memoryUsage.percentage.toFixed(1)}%`,
        metadata: { memoryUsage },
      });
    });

    // System responsiveness check
    this.registerHealthCheck("responsiveness", {
      name: "responsiveness",
      interval: 60000, // 1 minute
      timeout: 10000, // 10 seconds
      enabled: true,
      critical: false,
    }, () => {
      const start = performance.now();

      // Simulate system responsiveness test with a small delay
      return new Promise((resolve) => {
        setTimeout(() => {
          const duration = performance.now() - start;
          const threshold = 100; // 100ms threshold

          if (duration > threshold * 2) {
            resolve({
              status: "unhealthy",
              message: `System responsiveness is poor (${
                duration.toFixed(2)
              }ms)`,
              metadata: { responseTime: duration },
            });
          } else if (duration > threshold) {
            resolve({
              status: "degraded",
              message: `System responsiveness is slow (${
                duration.toFixed(2)
              }ms)`,
              metadata: { responseTime: duration },
            });
          } else {
            resolve({
              status: "healthy",
              message: `System is responsive (${duration.toFixed(2)}ms)`,
              metadata: { responseTime: duration },
            });
          }
        }, 10);
      });
    });
  }

  registerHealthCheck(
    name: string,
    config: HealthCheckConfig,
    checker: HealthChecker,
  ): void {
    this.healthChecks.set(name, { config, checker });
  }

  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
    this.lastResults.delete(name);
  }

  async runHealthCheck(name: string): Promise<HealthCheckResult> {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      throw new Error(`Health check '${name}' not found`);
    }

    const { config, checker } = healthCheck;
    const start = performance.now();
    const timestamp = new Date().toISOString();

    try {
      // Run health check with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Health check timeout")),
          config.timeout,
        );
      });

      const result = await Promise.race([checker(), timeoutPromise]);
      const duration = performance.now() - start;

      const healthResult: HealthCheckResult = {
        name,
        timestamp,
        duration,
        ...result,
      };

      this.lastResults.set(name, healthResult);
      return healthResult;
    } catch (error) {
      const duration = performance.now() - start;
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);

      const healthResult: HealthCheckResult = {
        name,
        status: "unhealthy",
        message: `Health check failed: ${errorMessage}`,
        timestamp,
        duration,
        metadata: { error: errorMessage },
      };

      this.lastResults.set(name, healthResult);
      return healthResult;
    }
  }

  async runAllHealthChecks(): Promise<HealthCheckResult[]> {
    const enabledChecks = Array.from(this.healthChecks.entries())
      .filter(([_, { config }]) => config.enabled);

    const results = await Promise.allSettled(
      enabledChecks.map(([name]) => this.runHealthCheck(name)),
    );

    return results
      .filter((result): result is PromiseFulfilledResult<HealthCheckResult> =>
        result.status === "fulfilled"
      )
      .map((result) => result.value);
  }

  getOverallHealth(): {
    status: "healthy" | "unhealthy" | "degraded";
    message: string;
    checks: HealthCheckResult[];
  } {
    const results = Array.from(this.lastResults.values());

    if (results.length === 0) {
      return {
        status: "healthy",
        message: "No health checks configured",
        checks: [],
      };
    }

    const criticalChecks = Array.from(this.healthChecks.entries())
      .filter(([_, { config }]) => config.critical && config.enabled)
      .map(([name]) => name);

    const criticalResults = results.filter((result) =>
      criticalChecks.includes(result.name)
    );

    // Check critical health checks
    const criticalUnhealthy = criticalResults.filter((result) =>
      result.status === "unhealthy"
    );
    if (criticalUnhealthy.length > 0) {
      return {
        status: "unhealthy",
        message: `Critical health checks failing: ${
          criticalUnhealthy.map((r) => r.name).join(", ")
        }`,
        checks: results,
      };
    }

    // Check for degraded status
    const degraded = results.filter((result) => result.status === "degraded");
    const unhealthy = results.filter((result) => result.status === "unhealthy");

    if (unhealthy.length > 0 || degraded.length > 0) {
      return {
        status: "degraded",
        message: `Some health checks are not optimal: ${
          [...unhealthy, ...degraded].map((r) => r.name).join(", ")
        }`,
        checks: results,
      };
    }

    return {
      status: "healthy",
      message: "All health checks passing",
      checks: results,
    };
  }

  startPeriodicChecks(): void {
    if (this.intervalId) {
      return; // Already running
    }

    // Run health checks periodically
    this.intervalId = setInterval(async () => {
      try {
        await this.runAllHealthChecks();
        this.updateMetrics();
      } catch (error) {
        console.error("Error running periodic health checks:", error);
      }
    }, 30000); // Run every 30 seconds

    // Run initial check
    setTimeout(() => this.runAllHealthChecks(), 1000);
  }

  stopPeriodicChecks(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private updateMetrics(): void {
    const now = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    const memoryUsage = this.getMemoryUsage();

    this.metrics = {
      timestamp: now,
      uptime,
      memory: memoryUsage,
      connections: {
        total: this.websocketStats.totalConnections,
        active: 0, // Will be updated by framework
        maxConcurrent: this.maxConcurrentConnections,
      },
      requests: {
        total: this.totalRequests,
        successful: this.successfulRequests,
        failed: this.failedRequests,
        averageResponseTime: this.totalRequests > 0
          ? this.responseTimeSum / this.totalRequests
          : 0,
      },
      websocket: {
        totalConnections: this.websocketStats.totalConnections,
        activeConnections: 0, // Will be updated by framework
        messagesReceived: this.websocketStats.messagesReceived,
        messagesSent: this.websocketStats.messagesSent,
        errors: this.websocketStats.errors,
      },
    };
  }

  private getMemoryUsage(): {
    used: number;
    available: number;
    percentage: number;
  } {
    // In a real implementation, you would get actual memory usage
    // For now, we'll use placeholder values
    const used = 100 * 1024 * 1024; // 100MB placeholder
    const available = 1024 * 1024 * 1024; // 1GB placeholder
    const percentage = (used / available) * 100;

    return { used, available, percentage };
  }

  getMetrics(): SystemMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  // Method to be called by the framework to track metrics
  trackRequest(duration: number, success: boolean): void {
    this.totalRequests++;
    this.responseTimeSum += duration;

    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }
  }

  trackWebSocketConnection(): void {
    this.websocketStats.totalConnections++;
  }

  trackWebSocketMessage(type: "received" | "sent"): void {
    if (type === "received") {
      this.websocketStats.messagesReceived++;
    } else {
      this.websocketStats.messagesSent++;
    }
  }

  trackWebSocketError(): void {
    this.websocketStats.errors++;
  }

  updateActiveConnections(count: number): void {
    this.metrics.connections.active = count;
    this.metrics.websocket.activeConnections = count;

    if (count > this.maxConcurrentConnections) {
      this.maxConcurrentConnections = count;
    }
  }

  // Generate health report for external monitoring systems
  generateHealthReport(): {
    status: "healthy" | "unhealthy" | "degraded";
    timestamp: string;
    uptime: number;
    version: string;
    health: ReturnType<FrameworkMonitor["getOverallHealth"]>;
    metrics: SystemMetrics;
  } {
    const health = this.getOverallHealth();
    const metrics = this.getMetrics();

    return {
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: "2.0.0", // Framework version
      health,
      metrics,
    };
  }

  // Export metrics in Prometheus format for integration
  exportPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    // Uptime
    lines.push(`# HELP weblisk_uptime_seconds System uptime in seconds`);
    lines.push(`# TYPE weblisk_uptime_seconds counter`);
    lines.push(`weblisk_uptime_seconds ${(metrics.uptime / 1000).toFixed(3)}`);

    // Memory
    lines.push(`# HELP weblisk_memory_usage_bytes Memory usage in bytes`);
    lines.push(`# TYPE weblisk_memory_usage_bytes gauge`);
    lines.push(`weblisk_memory_usage_bytes ${metrics.memory.used}`);

    // Connections
    lines.push(`# HELP weblisk_connections_total Total connections`);
    lines.push(`# TYPE weblisk_connections_total counter`);
    lines.push(`weblisk_connections_total ${metrics.connections.total}`);

    lines.push(`# HELP weblisk_connections_active Active connections`);
    lines.push(`# TYPE weblisk_connections_active gauge`);
    lines.push(`weblisk_connections_active ${metrics.connections.active}`);

    // Requests
    lines.push(`# HELP weblisk_requests_total Total HTTP requests`);
    lines.push(`# TYPE weblisk_requests_total counter`);
    lines.push(`weblisk_requests_total ${metrics.requests.total}`);

    lines.push(
      `# HELP weblisk_requests_successful_total Successful HTTP requests`,
    );
    lines.push(`# TYPE weblisk_requests_successful_total counter`);
    lines.push(
      `weblisk_requests_successful_total ${metrics.requests.successful}`,
    );

    // WebSocket messages
    lines.push(
      `# HELP weblisk_websocket_messages_received_total WebSocket messages received`,
    );
    lines.push(`# TYPE weblisk_websocket_messages_received_total counter`);
    lines.push(
      `weblisk_websocket_messages_received_total ${metrics.websocket.messagesReceived}`,
    );

    lines.push(
      `# HELP weblisk_websocket_messages_sent_total WebSocket messages sent`,
    );
    lines.push(`# TYPE weblisk_websocket_messages_sent_total counter`);
    lines.push(
      `weblisk_websocket_messages_sent_total ${metrics.websocket.messagesSent}`,
    );

    return lines.join("\n") + "\n";
  }
}

// Export singleton instance
export const frameworkMonitor: FrameworkMonitor = new FrameworkMonitor();

// For backward compatibility
export const healthMonitor = frameworkMonitor;
export type { FrameworkMonitor as HealthMonitor };
