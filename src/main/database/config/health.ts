/**
 * Database Connection Health Check
 * 
 * Professional health monitoring following industry best practices:
 * - Periodic health checks
 * - Connection state tracking
 * - Health status reporting
 * - Automatic recovery detection
 */

export enum HealthStatus {
  Healthy = 'healthy',
  Degraded = 'degraded',
  Unhealthy = 'unhealthy',
  Unknown = 'unknown',
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface HealthMetrics {
  status: HealthStatus;
  lastCheck: Date | null;
  consecutiveFailures: number;
  totalChecks: number;
  successfulChecks: number;
  averageLatency: number;
  lastError: Error | null;
}

/**
 * Create a simple health check query
 * Uses a lightweight query that exercises the connection
 */
export function createHealthCheckQuery(): string {
  // Use a simple system query that doesn't require table access
  // This is faster and safer than SELECT 1
  return 'SELECT @@VERSION as version, DB_NAME() as current_db, GETDATE() as server_time';
}

/**
 * Perform a health check on a connection pool
 * Returns health status with latency measurement
 */
export async function performHealthCheck(
  pool: any,
  query: string = createHealthCheckQuery()
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const result = await pool.request().query(query);

    const latency = Date.now() - startTime;
    const recordset = result.recordset?.[0];

    // Determine health status based on latency
    let status = HealthStatus.Healthy;
    if (latency > 5000) {
      status = HealthStatus.Degraded;
    }
    if (latency > 15000) {
      status = HealthStatus.Unhealthy;
    }

    return {
      status,
      timestamp: new Date(),
      latency,
      details: {
        serverTime: recordset?.server_time,
        database: recordset?.current_db,
        versionInfo: recordset?.version?.substring(0, 50),
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      status: HealthStatus.Unhealthy,
      timestamp: new Date(),
      latency,
      error: errorMessage,
    };
  }
}

/**
 * Health metrics tracker
 * Tracks connection health over time for monitoring
 */
export class HealthMonitor {
  private metrics: HealthMetrics = {
    status: HealthStatus.Unknown,
    lastCheck: null,
    consecutiveFailures: 0,
    totalChecks: 0,
    successfulChecks: 0,
    averageLatency: 0,
    lastError: null,
  };

  private latencyHistory: number[] = [];
  private readonly maxHistorySize = 10;

  /**
   * Update metrics after a health check
   */
  updateMetrics(result: HealthCheckResult): void {
    this.metrics.lastCheck = result.timestamp;
    this.metrics.totalChecks++;
    this.metrics.status = result.status;

    if (result.status === HealthStatus.Healthy || result.status === HealthStatus.Degraded) {
      this.metrics.consecutiveFailures = 0;
      this.metrics.successfulChecks++;
      this.metrics.lastError = null;

      if (result.latency !== undefined) {
        this.latencyHistory.push(result.latency);
        if (this.latencyHistory.length > this.maxHistorySize) {
          this.latencyHistory.shift();
        }

        // Calculate average latency
        const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
        this.metrics.averageLatency = sum / this.latencyHistory.length;
      }
    } else {
      this.metrics.consecutiveFailures++;
      if (result.error) {
        this.metrics.lastError = new Error(result.error);
      }
    }
  }

  /**
   * Get current health metrics
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if connection is considered healthy
   */
  isHealthy(): boolean {
    return (
      this.metrics.status === HealthStatus.Healthy ||
      (this.metrics.status === HealthStatus.Degraded && this.metrics.consecutiveFailures < 3)
    );
  }

  /**
   * Get health status summary for logging/monitoring
   */
  getStatusSummary(): string {
    const { status, totalChecks, successfulChecks, consecutiveFailures, averageLatency } = this.metrics;
    const successRate = totalChecks > 0 ? ((successfulChecks / totalChecks) * 100).toFixed(1) : '0';
    const avgLatencyStr = averageLatency > 0 ? `${averageLatency.toFixed(0)}ms` : 'N/A';

    return `Status: ${status} | Success Rate: ${successRate}% | Consecutive Failures: ${consecutiveFailures} | Avg Latency: ${avgLatencyStr}`;
  }

  /**
   * Reset metrics (useful for testing or after reconnection)
   */
  reset(): void {
    this.metrics = {
      status: HealthStatus.Unknown,
      lastCheck: null,
      consecutiveFailures: 0,
      totalChecks: 0,
      successfulChecks: 0,
      averageLatency: 0,
      lastError: null,
    };
    this.latencyHistory = [];
  }
}

