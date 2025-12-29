# Database Connection Architecture

## Overview

This document describes the professional, production-ready database connection architecture implemented in the Liquor Store Management System. The architecture follows industry best practices for scalability, reliability, and maintainability.

## Architecture Components

### 1. Configuration Validation (`src/main/database/config/validation.ts`)

**Purpose**: Validates and normalizes database configuration from environment variables with fail-fast error handling.

**Features**:
- Runtime validation of all environment variables
- Type-safe configuration objects
- Clear, actionable error messages
- Environment-specific warnings (production vs development)
- Support for multiple connection types (Windows Auth, SQL Auth)

**Key Functions**:
- `validateDatabaseConfig()`: Validates configuration and returns detailed results
- `getValidatedDatabaseConfig()`: Returns validated config or throws error (fail-fast)

**Configuration Schema**:
```typescript
interface DatabaseConfig {
  server: string;
  port?: number;
  database: string;
  authentication: {
    type: 'windows' | 'sql';
    user?: string;
    password?: string;
  };
  connection: {
    encrypt: boolean;
    trustServerCertificate: boolean;
    connectTimeout: number;
    requestTimeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
  };
}
```

### 2. Retry Strategy (`src/main/database/config/retry.ts`)

**Purpose**: Implements professional retry logic with exponential backoff for transient failures.

**Features**:
- Exponential backoff with jitter (prevents thundering herd)
- Intelligent error classification (retryable vs non-retryable)
- Configurable retry attempts and delays
- Detailed logging for debugging

**Retryable Errors**:
- Network timeouts
- Connection failures
- Temporary network issues

**Non-Retryable Errors**:
- Authentication failures (ELOGIN)
- Authorization errors
- Invalid credentials

**Key Functions**:
- `retryWithBackoff()`: Generic retry mechanism
- `retryConnection()`: Specialized for database connections with logging
- `isRetryableError()`: Classifies errors for retry decision

### 3. Health Monitoring (`src/main/database/config/health.ts`)

**Purpose**: Monitors connection health and provides metrics for observability.

**Features**:
- Periodic health checks
- Connection latency tracking
- Health status classification (Healthy, Degraded, Unhealthy)
- Metrics aggregation (success rate, average latency, consecutive failures)
- Automatic recovery detection

**Health Status Levels**:
- **Healthy**: Latency < 5s, connection responsive
- **Degraded**: Latency 5-15s, connection slow but functional
- **Unhealthy**: Latency > 15s or connection failures

**Key Classes/Functions**:
- `HealthMonitor`: Tracks health metrics over time
- `performHealthCheck()`: Executes health check query
- `HealthStatus`: Enum for health states

### 4. Connection Manager (`src/main/database/connection.ts`)

**Purpose**: Main connection pool manager orchestrating all components.

**Features**:
- Connection pooling with configurable limits
- Support for Windows Authentication (msnodesqlv8) and SQL Server Authentication
- Automatic connection string fallback
- Health verification on connection
- Comprehensive error handling and troubleshooting guidance

**Key Functions**:
- `initializeDatabase()`: Initializes connection pool with retry logic
- `getConnectionPool()`: Returns active connection pool
- `testConnection()`: Tests connection with health check
- `getHealthStatus()`: Returns current health metrics
- `closeDatabase()`: Gracefully closes connection pool

## Connection Flow

```
1. Application Start
   ↓
2. Load Environment Variables (dotenv)
   ↓
3. Validate Configuration (validation.ts)
   ├─→ Fail: Throw error with clear message
   └─→ Pass: Continue
   ↓
4. Initialize Connection Pool
   ├─→ Retry Logic (retry.ts)
   │   ├─→ Attempt Connection
   │   ├─→ Transient Error? → Retry with backoff
   │   └─→ Permanent Error? → Fail immediately
   ├─→ Health Check (health.ts)
   │   └─→ Update Health Metrics
   └─→ Connection Ready
   ↓
5. Application Operations
   └─→ Use Connection Pool for Queries
```

## Configuration Options

### Environment Variables

#### Required
- `DB_SERVER`: Server address (format: `server,port` or `server\instance`)
- `DB_DATABASE`: Database name

#### Authentication (choose one)
**Windows Authentication**:
- `DB_USE_WINDOWS_AUTH=true`

**SQL Server Authentication**:
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password

#### Optional Connection Settings
- `DB_ENCRYPT`: Enable encryption (`true`/`false`, default: `false`)
- `DB_TRUST_CERTIFICATE`: Trust server certificate (`true`/`false`, default: `true`)
- `DB_CONNECT_TIMEOUT`: Connection timeout in ms (default: `15000`)
- `DB_REQUEST_TIMEOUT`: Request timeout in ms (default: `30000`)

#### Optional Retry Settings
- `DB_RETRY_ATTEMPTS`: Max retry attempts (default: `3`, range: 1-10)
- `DB_RETRY_DELAY`: Base retry delay in ms (default: `1000`)

#### Optional Pool Settings
- `DB_POOL_MAX`: Maximum pool size (default: `10`, range: 1-100)
- `DB_POOL_MIN`: Minimum pool size (default: `0`)
- `DB_POOL_IDLE_TIMEOUT`: Idle timeout in ms (default: `30000`)

### Example .env Configuration

**SQL Server Authentication (Production Recommended)**:
```env
DB_SERVER=localhost,1433
DB_DATABASE=rmhsample
DB_USER=app_user
DB_PASSWORD=StrongPassword123!
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=false
DB_POOL_MAX=20
```

**Windows Authentication (Development)**:
```env
DB_SERVER=localhost,53056
DB_DATABASE=rmhsample
DB_USE_WINDOWS_AUTH=true
DB_ENCRYPT=false
DB_TRUST_CERTIFICATE=true
```

## Best Practices

### 1. Authentication Method Selection

**Use SQL Server Authentication when**:
- Deploying to production
- Need service account authentication
- Windows credentials not available
- Cross-platform deployment

**Use Windows Authentication when**:
- Development environment
- All users have domain access
- Single sign-on required
- Windows-only deployment

### 2. Connection Pool Sizing

- **Small Applications**: max=5-10, min=0
- **Medium Applications**: max=10-20, min=2
- **Large Applications**: max=20-50, min=5
- **Rule of thumb**: max = (expected concurrent users) * 1.5

### 3. Timeout Configuration

- **Connect Timeout**: 15-30 seconds (network latency dependent)
- **Request Timeout**: 30-60 seconds (query complexity dependent)
- **Production**: Longer timeouts for reliability
- **Development**: Shorter timeouts for faster failure detection

### 4. Retry Strategy

- **Max Attempts**: 3-5 (balance between reliability and user experience)
- **Base Delay**: 1-2 seconds (prevent server overload)
- **Production**: More aggressive retry (5 attempts, 2s delay)
- **Development**: Fewer retries (3 attempts, 1s delay)

### 5. Health Monitoring

- Monitor health metrics in production
- Set up alerts for consecutive failures > 3
- Track average latency trends
- Log health check results for debugging

## Error Handling

### Configuration Errors
- **Fail-fast**: Invalid configuration throws immediately
- **Clear messages**: Specific guidance for fixing issues
- **Validation warnings**: Non-critical issues logged as warnings

### Connection Errors

**Transient Errors** (automatically retried):
- Network timeouts
- Connection pool exhaustion (temporary)
- Server temporarily unavailable

**Permanent Errors** (fail immediately):
- Authentication failures
- Invalid credentials
- Database not found
- Permission denied

### Error Reporting

All errors include:
- Error message and code
- Troubleshooting guidance
- Suggested fixes
- Configuration values (without sensitive data)

## Security Considerations

### 1. Credential Management
- Never hardcode credentials
- Use environment variables
- Store `.env` securely (not in version control)
- Rotate passwords regularly

### 2. Encryption
- **Production**: Always enable encryption (`DB_ENCRYPT=true`)
- **Development**: Can disable for easier debugging
- Use proper SSL certificates in production

### 3. Connection Security
- Use dedicated application user (not `sa`)
- Grant minimum required permissions
- Regularly audit database access
- Monitor connection logs

### 4. Error Messages
- Never expose sensitive data in errors
- Log full details server-side only
- Return generic messages to clients

## Performance Optimization

### 1. Connection Pooling
- Reuse connections instead of creating new ones
- Configure pool size based on load
- Monitor pool utilization

### 2. Connection Health
- Regular health checks prevent stale connections
- Automatic cleanup of unhealthy connections
- Fast failure detection

### 3. Retry Strategy
- Exponential backoff prevents server overload
- Jitter prevents synchronized retries
- Intelligent retry decisions save resources

## Monitoring and Observability

### Metrics Available
- Connection health status
- Success/failure rates
- Average connection latency
- Consecutive failure count
- Pool utilization

### Logging
- Configuration loading
- Connection attempts
- Retry attempts
- Health check results
- Error details (server-side only)

## Migration Guide

### From Old Connection System

1. **Update .env file**: Add new optional variables (defaults provided)
2. **No code changes required**: Existing code continues to work
3. **Optional enhancements**: Use new health monitoring APIs

### Breaking Changes
- None - fully backward compatible

### New Features Available
- Configuration validation
- Retry logic
- Health monitoring
- Better error messages

## Troubleshooting

See `SQL_SERVER_TROUBLESHOOTING.md` for detailed troubleshooting guides for:
- Connection timeouts
- Authentication failures
- Database not found errors
- Performance issues

## Future Enhancements

Potential improvements for future versions:
- Connection failover (multiple servers)
- Read/write replica support
- Query performance monitoring
- Automatic pool size adjustment
- Circuit breaker pattern integration

