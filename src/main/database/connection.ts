/**
 * SQL Server Connection Pool Manager
 * 
 * Professional database connection management following industry best practices:
 * - Configuration validation with fail-fast errors
 * - Connection pooling with configurable limits
 * - Retry logic with exponential backoff
 * - Health monitoring and connection state tracking
 * - Support for both Windows and SQL Server authentication
 * 
 * Manages database connections in the Electron main process only
 */

import sql from 'mssql';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { Logger } from '../utils/Logger';
import { getValidatedDatabaseConfig, DatabaseConfig as ValidatedConfig } from './config/validation';
import { retryConnection } from './config/retry';
import { performHealthCheck, HealthMonitor, HealthStatus } from './config/health';

// Load environment variables
dotenv.config();

const logger = new Logger('Database');

// Import msnodesqlv8 for Windows Authentication support
// This driver supports Windows Authentication, unlike the default tedious driver
// Using createRequire for ES modules compatibility
let sqlWindowsAuth: typeof sql;
const require = createRequire(import.meta.url);
try {
  sqlWindowsAuth = require('mssql/msnodesqlv8');
  logger.info('msnodesqlv8 driver loaded successfully for Windows Authentication');
} catch (e) {
  // If msnodesqlv8 is not available, fall back to regular sql
  logger.warn('msnodesqlv8 driver not available, falling back to default driver. Windows Auth may not work properly.');
  logger.warn('Error loading msnodesqlv8:', e instanceof Error ? e.message : String(e));
  sqlWindowsAuth = sql;
}
const healthMonitor = new HealthMonitor();

let pool: sql.ConnectionPool | null = null;
let isInitialized = false;
let initializationError: Error | null = null;

// Legacy interface for backward compatibility (deprecated, use ValidatedConfig)
export interface DatabaseConfig {
  server: string;
  database: string;
  user?: string;
  password?: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  useWindowsAuth?: boolean;
}

/**
 * Get database configuration (legacy - use getValidatedDatabaseConfig from validation module)
 * @deprecated Use getValidatedDatabaseConfig() from './config/validation' instead
 */
export function getDatabaseConfig(): DatabaseConfig {
  const validatedConfig = getValidatedDatabaseConfig();
  
  return {
    server: validatedConfig.port ? `${validatedConfig.server},${validatedConfig.port}` : validatedConfig.server,
    database: validatedConfig.database,
    user: validatedConfig.authentication.user,
    password: validatedConfig.authentication.password,
    encrypt: validatedConfig.connection.encrypt,
    trustServerCertificate: validatedConfig.connection.trustServerCertificate,
    useWindowsAuth: validatedConfig.authentication.type === 'windows',
  };
}

/**
 * Create SQL Server connection pool configuration from validated config
 * Uses professional configuration patterns with proper type safety
 */
function createPoolConfig(config: ValidatedConfig): sql.config {
  // Build server string: if port is specified, use "server,port" format
  // mssql library supports this format directly
  const serverString = config.port ? `${config.server},${config.port}` : config.server;

  const poolConfig: sql.config = {
    server: serverString,
    database: config.database,
    options: {
      encrypt: config.connection.encrypt,
      trustServerCertificate: config.connection.trustServerCertificate,
      enableArithAbort: true,
      connectTimeout: config.connection.connectTimeout,
      requestTimeout: config.connection.requestTimeout,
      enableImplicitTransactions: false,
    },
    pool: {
      max: config.pool.max,
      min: config.pool.min,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
    },
  };

  // Use Windows Authentication if configured, otherwise SQL Server Authentication
  if (config.authentication.type === 'sql') {
    // SQL Server Authentication
    poolConfig.authentication = {
      type: 'default',
      options: {
        userName: config.authentication.user!,
        password: config.authentication.password!,
      },
    };
  }
  // Windows Authentication: omit authentication object to use integrated security
  // The mssql library will use the current Windows user credentials

  return poolConfig;
}

/**
 * Create Windows Authentication config object for msnodesqlv8
 * Used when connection string format fails
 */
function createWindowsAuthConfig(config: ValidatedConfig): any {
  // For msnodesqlv8, build server string with port if needed
  let serverString = config.server;
  if (config.port) {
    // msnodesqlv8 format: "server,port"
    serverString = `${config.server},${config.port}`;
  }
  
  const windowsAuthConfig: any = {
    server: serverString,
    database: config.database,
    driver: 'ODBC Driver 17 for SQL Server', // Specify ODBC driver at top level for msnodesqlv8
    options: {
      encrypt: config.connection.encrypt,
      trustServerCertificate: config.connection.trustServerCertificate,
      enableArithAbort: true,
      connectTimeout: config.connection.connectTimeout,
      requestTimeout: config.connection.requestTimeout,
      trustedConnection: true, // For msnodesqlv8, trustedConnection in options
    },
    pool: {
      max: config.pool.max,
      min: config.pool.min,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
    },
  };

  return windowsAuthConfig;
}

/**
 * Create Windows Authentication connection string
 */
function createWindowsAuthConnectionString(config: ValidatedConfig): string {
  const serverPart = config.port ? `${config.server},${config.port}` : config.server;
  // msnodesqlv8 connection string format - try without explicit driver first, then fallback
  // The driver should be auto-detected, but we can specify it if needed
  return `Server=${serverPart};Database=${config.database};Trusted_Connection=yes;Encrypt=${config.connection.encrypt ? 'yes' : 'no'};TrustServerCertificate=${config.connection.trustServerCertificate ? 'yes' : 'no'};Connection Timeout=${Math.round(config.connection.connectTimeout / 1000)};`;
}

/**
 * Initialize database connection pool with professional error handling and retry logic
 * 
 * Implements:
 * - Configuration validation (fail-fast)
 * - Retry logic with exponential backoff for transient errors
 * - Connection health verification
 * - Comprehensive error reporting
 */
export async function initializeDatabase(): Promise<void> {
  try {
    if (pool && isInitialized) {
      logger.info('Database connection pool already exists');
      return;
    }

    // Reset state
    isInitialized = false;
    initializationError = null;
    healthMonitor.reset();

    // Validate configuration (fail-fast pattern)
    let config: ValidatedConfig;
    try {
      config = getValidatedDatabaseConfig();
    } catch (validationError) {
      const error = validationError instanceof Error ? validationError : new Error(String(validationError));
      initializationError = error;
      logger.error('Configuration validation failed:', error.message);
      throw error;
    }

    // Log configuration (without sensitive data)
    logger.info('='.repeat(60));
    logger.info('Initializing SQL Server Connection');
    logger.info(`Server: ${config.server}${config.port ? `:${config.port}` : ''} ${config.port ? '(port-based)' : '(named instance)'}`);
    logger.info(`Database: ${config.database}`);
    logger.info(`Authentication: ${config.authentication.type === 'windows' ? 'Windows Authentication' : 'SQL Server Authentication'}`);
    if (config.authentication.type === 'sql') {
      logger.info(`User: ${config.authentication.user}`);
      logger.info(`Password: ${config.authentication.password ? 'Set' : 'NOT SET'}`);
    }
    logger.info(`Encrypt: ${config.connection.encrypt}`);
    logger.info(`Trust Certificate: ${config.connection.trustServerCertificate}`);
    logger.info(`Pool: max=${config.pool.max}, min=${config.pool.min}, idleTimeout=${config.pool.idleTimeoutMillis}ms`);
    logger.info(`Timeouts: connect=${config.connection.connectTimeout}ms, request=${config.connection.requestTimeout}ms`);
    logger.info('='.repeat(60));
    // Attempt connection with retry logic for transient errors
    try {
      await retryConnection(
        async () => {
          if (config.authentication.type === 'windows') {
            // Windows Authentication - use msnodesqlv8 driver
            // Try connection string first (more reliable for port-based), fallback to config object
            const connectionString = createWindowsAuthConnectionString(config);
            
            try {
              logger.info('Attempting Windows Authentication with connection string');
              pool = await sqlWindowsAuth.connect(connectionString);
            } catch (connStrError) {
              // Fallback to config object format if connection string fails
              logger.warn('Connection string failed, trying config object format');
              const windowsAuthConfig = createWindowsAuthConfig(config);
              pool = await sqlWindowsAuth.connect(windowsAuthConfig);
            }
          } else {
            // SQL Server Authentication - use standard driver
            logger.info('Attempting SQL Server Authentication');
            const poolConfig = createPoolConfig(config);
            pool = await sql.connect(poolConfig);
          }

          // Verify connection with health check
          const healthResult = await performHealthCheck(pool);
          healthMonitor.updateMetrics(healthResult);

          if (healthResult.status === HealthStatus.Unhealthy) {
            throw new Error(`Connection health check failed: ${healthResult.error || 'Unknown error'}`);
          }

          if (healthResult.details) {
            logger.info('✅ Connected to SQL Server successfully');
            logger.info(`SQL Server Version: ${healthResult.details.versionInfo || 'N/A'}...`);
            logger.info(`Current Database: ${healthResult.details.database || 'N/A'}`);
            logger.info(`Connection Latency: ${healthResult.latency}ms`);
          }
        },
        'Database Connection',
        {
          maxAttempts: config.connection.retryAttempts,
          baseDelayMs: config.connection.retryDelay,
        }
      );

      isInitialized = true;
      logger.info('✅ Database connection pool initialized and verified');
      logger.info(`Health Status: ${healthMonitor.getStatusSummary()}`);
      logger.info('='.repeat(60));
    } catch (connectError) {
      const error = connectError as Error;
      initializationError = error;
      isInitialized = false;

      logger.error('='.repeat(60));
      logger.error('❌ Failed to connect to SQL Server');
      logger.error(`Error: ${error.message}`);
      logger.error(`Error Code: ${(error as any).code || 'UNKNOWN'}`);

      // Provide specific troubleshooting guidance based on error type
      if (error.message.includes('ETIMEOUT') || error.message.includes('timeout')) {
        logger.error('');
        logger.error('🔧 TROUBLESHOOTING: Connection Timeout');
        logger.error('');
        logger.error('⚠️  Check SQL Server connectivity');
        logger.error(`   Server: ${config.server}${config.port ? `:${config.port}` : ''}`);
        logger.error('   → Verify SQL Server service is running');
        logger.error('   → Check firewall settings');
        if (!config.port) {
          logger.error('   → For named instances, SQL Browser service must be running');
          logger.error('   → Consider using port-based connection (DB_SERVER=server,port)');
        }
      } else if (error.message.includes('Login failed') || error.message.includes('authentication') || (error as any).code === 'ELOGIN') {
        logger.error('');
        logger.error('🔧 TROUBLESHOOTING: Authentication Failed');
        logger.error('');
        logger.error('✅ Connection reached SQL Server - authentication issue');
        logger.error('');
        if (config.authentication.type === 'sql') {
          logger.error('1. Verify credentials in .env file:');
          logger.error(`   - DB_USER: ${config.authentication.user}`);
          logger.error(`   - DB_PASSWORD: ${config.authentication.password ? 'Set' : 'NOT SET'}`);
          logger.error('');
          logger.error('2. Verify SQL Server Authentication is enabled:');
          logger.error('   - SSMS: Server Properties > Security > Authentication mode');
          logger.error('   - Select "SQL Server and Windows Authentication mode"');
          logger.error('   - Restart SQL Server service');
          logger.error('');
          logger.error('3. Verify user account is enabled:');
          logger.error(`   - SSMS: Security > Logins > ${config.authentication.user}`);
          logger.error('   - Properties > Status > Login: Enabled');
        } else {
          logger.error('Windows Authentication failed:');
          logger.error('   - Verify current Windows user has SQL Server login permissions');
          logger.error('   - Check SQL Server authentication mode includes Windows Authentication');
          logger.error('   - Verify user has access to database');
        }
      } else if (error.message.includes('Cannot open database')) {
        logger.error('');
        logger.error('🔧 TROUBLESHOOTING: Database Not Found');
        logger.error(`   Database: "${config.database}"`);
        logger.error('   → Verify database exists');
        logger.error('   → Check user has access permissions');
        logger.error('   → Restore database if needed');
      }

      logger.error('='.repeat(60));

      // Clean up failed connection
      if (pool) {
        try {
          await pool.close();
        } catch {
          // Ignore cleanup errors
        }
        pool = null;
      }

      throw error;
    }
  } catch (error) {
    logger.error('Failed to initialize database connection:', error);
    throw error;
  }
}

/**
 * Get the database connection pool
 * @throws Error if pool is not initialized
 */
export function getConnectionPool(): sql.ConnectionPool {
  if (!pool || !isInitialized) {
    if (initializationError) {
      throw new Error(
        `Database connection pool not initialized. Previous error: ${initializationError.message}. ` +
        `Please check SQL Server configuration and ensure the service is running.`
      );
    }
    throw new Error(
      'Database connection pool not initialized. Call initializeDatabase() first. ' +
      'If this error persists, check SQL Server service status and connection settings.'
    );
  }
  return pool;
}

/**
 * Check if database is initialized and ready
 */
export function isDatabaseReady(): boolean {
  return isInitialized && pool !== null;
}

/**
 * Get initialization error if any
 */
export function getInitializationError(): Error | null {
  return initializationError;
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      isInitialized = false;
      initializationError = null;
      logger.info('Database connection pool closed');
    }
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
}

/**
 * Test database connection with health check
 * Returns detailed health status
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (!isDatabaseReady()) {
      logger.error('Database connection test failed: Pool not initialized');
      return false;
    }
    const connectionPool = getConnectionPool();
    const healthResult = await performHealthCheck(connectionPool);
    healthMonitor.updateMetrics(healthResult);
    return healthResult.status !== HealthStatus.Unhealthy;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Get current connection health status
 */
export function getHealthStatus(): string {
  return healthMonitor.getStatusSummary();
}

/**
 * Get health metrics for monitoring
 */
export function getHealthMetrics() {
  return healthMonitor.getMetrics();
}

/**
 * Test database connection with a simple query to Item table
 * This verifies both connection and table access
 */
export async function testItemTableAccess(): Promise<{ success: boolean; error?: string; rowCount?: number }> {
  try {
    if (!isDatabaseReady()) {
      return {
        success: false,
        error: 'Database connection pool not initialized',
      };
    }
    
    const connectionPool = getConnectionPool();
    const result = await connectionPool.request().query('SELECT TOP 1 * FROM Item');
    
    return {
      success: true,
      rowCount: result.recordset.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Item table access test failed:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

