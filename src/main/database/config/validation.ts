/**
 * Database Configuration Validation
 * 
 * Professional configuration validation following industry best practices:
 * - Runtime validation of environment variables
 * - Type-safe configuration objects
 * - Clear error messages for missing/invalid configuration
 * - Support for multiple environments (dev, staging, production)
 */

export interface DatabaseConfig {
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

export interface ConfigValidationResult {
  valid: boolean;
  config?: DatabaseConfig;
  errors: string[];
  warnings: string[];
}

/**
 * Validate and parse database configuration from environment variables
 * Follows professional patterns: fail-fast, clear error messages, type safety
 */
export function validateDatabaseConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required configuration
  const server = process.env.DB_SERVER;
  const database = process.env.DB_DATABASE;

  if (!server) {
    errors.push('DB_SERVER environment variable is required');
  }

  if (!database) {
    errors.push('DB_DATABASE environment variable is required');
  }

  // Authentication configuration
  const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!useWindowsAuth) {
    if (!user) {
      errors.push('DB_USER is required when DB_USE_WINDOWS_AUTH is not set to "true"');
    }
    if (!password || password === 'PUT_REAL_PASSWORD_HERE' || password.trim() === '') {
      errors.push(
        'DB_PASSWORD is required and must not be empty or placeholder when using SQL Server Authentication.\n' +
        '   To fix this:\n' +
        '   1. Open your .env file\n' +
        '   2. Find the line: DB_PASSWORD=PUT_REAL_PASSWORD_HERE\n' +
        '   3. Replace PUT_REAL_PASSWORD_HERE with your actual SQL Server password\n' +
        '   4. If you don\'t know your password:\n' +
        '      - Open SQL Server Management Studio (SSMS)\n' +
        '      - Connect using Windows Authentication\n' +
        '      - Go to: Security → Logins → sa → Properties\n' +
        '      - You can view/reset the password there\n' +
        '   OR switch to Windows Authentication:\n' +
        '   - Change DB_USE_WINDOWS_AUTH=false to DB_USE_WINDOWS_AUTH=true\n' +
        '   - Then ensure your Windows user has SQL Server permissions (see documentation)'
      );
    }
  } else {
    // Windows Auth: user/password not needed, but warn if they're set (might be confusing)
    if (user || password) {
      warnings.push('DB_USER and DB_PASSWORD are ignored when using Windows Authentication (DB_USE_WINDOWS_AUTH=true)');
    }
  }

  // Parse server and port
  let parsedServer = server || 'localhost';
  let parsedPort: number | undefined;

  if (server) {
    // Support formats: "server,port" or "server\instance" or "server"
    if (server.includes(',') && !server.includes('\\')) {
      const parts = server.split(',');
      if (parts.length === 2) {
        parsedServer = parts[0].trim();
        const port = parseInt(parts[1].trim(), 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          errors.push(`Invalid port number in DB_SERVER: "${parts[1].trim()}" (must be 1-65535)`);
        } else {
          parsedPort = port;
        }
      } else {
        errors.push(`Invalid DB_SERVER format: "${server}" (expected "server,port" or "server\\instance")`);
      }
    }
  }

  // Connection options with defaults
  const encrypt = process.env.DB_ENCRYPT === 'true';
  const trustServerCertificate = process.env.DB_TRUST_CERTIFICATE !== 'false';

  // Connection timeouts (configurable, with safe defaults)
  const connectTimeout = parseInt(process.env.DB_CONNECT_TIMEOUT || '15000', 10);
  const requestTimeout = parseInt(process.env.DB_REQUEST_TIMEOUT || '30000', 10);
  const retryAttempts = parseInt(process.env.DB_RETRY_ATTEMPTS || '3', 10);
  const retryDelay = parseInt(process.env.DB_RETRY_DELAY || '1000', 10);

  if (isNaN(connectTimeout) || connectTimeout < 1000) {
    warnings.push(`DB_CONNECT_TIMEOUT must be at least 1000ms, using default: 15000`);
  }
  if (isNaN(requestTimeout) || requestTimeout < 1000) {
    warnings.push(`DB_REQUEST_TIMEOUT must be at least 1000ms, using default: 30000`);
  }
  if (isNaN(retryAttempts) || retryAttempts < 1 || retryAttempts > 10) {
    warnings.push(`DB_RETRY_ATTEMPTS should be 1-10, using default: 3`);
  }

  // Pool configuration (configurable, with safe defaults)
  const poolMax = parseInt(process.env.DB_POOL_MAX || '10', 10);
  const poolMin = parseInt(process.env.DB_POOL_MIN || '0', 10);
  const poolIdleTimeout = parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10);

  if (isNaN(poolMax) || poolMax < 1 || poolMax > 100) {
    warnings.push(`DB_POOL_MAX should be 1-100, using default: 10`);
  }
  if (isNaN(poolMin) || poolMin < 0 || poolMin >= poolMax) {
    warnings.push(`DB_POOL_MIN should be 0 and less than DB_POOL_MAX, using default: 0`);
  }

  // Environment-specific warnings
  if (process.env.NODE_ENV === 'production') {
    if (!encrypt) {
      warnings.push('DB_ENCRYPT is false in production - consider enabling encryption for security');
    }
    if (trustServerCertificate) {
      warnings.push('DB_TRUST_CERTIFICATE is true in production - consider using proper SSL certificates');
    }
    if (useWindowsAuth === false && user === 'sa') {
      warnings.push('Using sa account in production is not recommended - create a dedicated application user');
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
    };
  }

  const config: DatabaseConfig = {
    server: parsedServer,
    port: parsedPort,
    database: database!,
    authentication: {
      type: useWindowsAuth ? 'windows' : 'sql',
      user: useWindowsAuth ? undefined : user,
      password: useWindowsAuth ? undefined : password,
    },
    connection: {
      encrypt,
      trustServerCertificate,
      connectTimeout: isNaN(connectTimeout) ? 15000 : connectTimeout,
      requestTimeout: isNaN(requestTimeout) ? 30000 : requestTimeout,
      retryAttempts: isNaN(retryAttempts) || retryAttempts < 1 || retryAttempts > 10 ? 3 : retryAttempts,
      retryDelay: isNaN(retryDelay) || retryDelay < 100 ? 1000 : retryDelay,
    },
    pool: {
      max: isNaN(poolMax) || poolMax < 1 || poolMax > 100 ? 10 : poolMax,
      min: isNaN(poolMin) || poolMin < 0 || poolMin >= poolMax ? 0 : poolMin,
      idleTimeoutMillis: isNaN(poolIdleTimeout) || poolIdleTimeout < 1000 ? 30000 : poolIdleTimeout,
    },
  };

  return {
    valid: true,
    config,
    errors: [],
    warnings,
  };
}

/**
 * Get validated database configuration
 * Throws error if configuration is invalid (fail-fast pattern)
 */
export function getValidatedDatabaseConfig(): DatabaseConfig {
  const validation = validateDatabaseConfig();

  if (!validation.valid || !validation.config) {
    const errorMessage = [
      'Database configuration validation failed:',
      ...validation.errors.map(e => `  - ${e}`),
      '',
      '💡 Quick Fix Options:',
      '   Option 1 (Recommended): Use SQL Server Authentication',
      '     1. Get your SQL Server sa password',
      '     2. Update .env: DB_PASSWORD=your_actual_password',
      '     3. Ensure DB_USE_WINDOWS_AUTH=false',
      '',
      '   Option 2: Use Windows Authentication',
      '     1. Update .env: DB_USE_WINDOWS_AUTH=true',
      '     2. Ensure your Windows user has SQL Server login permissions',
      '     3. See QUICK_FIX_INSTRUCTIONS.md for detailed steps',
      '',
      '   For detailed instructions, see: QUICK_FIX_INSTRUCTIONS.md',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings if any
  if (validation.warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('Database configuration warnings:');
    validation.warnings.forEach(w => console.warn(`  ⚠ ${w}`));
  }

  return validation.config;
}

