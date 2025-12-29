# Technical Brief: SQL Server Connection Timeout (ETIMEOUT)

## Executive Summary
The Electron application is experiencing a connection timeout (ETIMEOUT) when attempting to establish a connection pool to SQL Server Express. The connection attempt fails after exactly 15 seconds (the configured `connectTimeout`), indicating the TCP handshake is not completing. The application gracefully degrades and continues running, but all database-dependent features are non-functional.

## Error Details

### Error Signature
```
Error: Failed to connect to localhost\SQLEXPRESS in 15000ms
Error Code: ETIMEOUT
Location: src/main/database/connection.ts:110 (sql.connect())
Stack: ConnectionError → ConnectionError2 (nested timeout)
```

### Error Flow
1. **Initialization Trigger**: `src/main/app/main.ts:41` calls `initializeDatabase()`
2. **Connection Attempt**: `connection.ts:110` executes `await sql.connect(poolConfig)`
3. **Timeout**: After 15 seconds, `mssql` library throws `ConnectionError` with code `ETIMEOUT`
4. **Error Handling**: Error is caught at `connection.ts:126`, logged, and re-thrown
5. **Application Continuation**: `main.ts:61-74` catches error, logs warning, continues startup
6. **IPC Impact**: All IPC handlers check `isDatabaseReady()` and return errors (see `IpcManager.ts`)

## Technical Architecture

### Connection Configuration
**File**: `src/main/database/connection.ts`

```typescript
// Configuration source (lines 31-47)
getDatabaseConfig() returns:
  - server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS'
  - database: process.env.DB_DATABASE || 'rmhsample'
  - user: process.env.DB_USER || 'sa'
  - password: process.env.DB_PASSWORD || ''  // ⚠️ EMPTY STRING
  - encrypt: process.env.DB_ENCRYPT === 'true'  // defaults to false
  - trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== 'false'  // defaults to true

// Pool configuration (lines 52-80)
createPoolConfig() returns sql.config:
  {
    server: config.server,  // "localhost\\SQLEXPRESS"
    database: config.database,  // "rmhsample"
    authentication: {
      type: 'default',
      options: {
        userName: config.user,  // "sa"
        password: config.password,  // "" (empty)
      },
    },
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 15000,  // 15 seconds - THIS IS WHERE TIMEOUT OCCURS
      requestTimeout: 30000,
      enableImplicitTransactions: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }
```

### Library Version
- **mssql**: `^12.2.0` (package.json:54)
- **@types/mssql**: `^9.1.8` (package.json:65)
- **Node.js**: Not specified, but Electron 32.1.2 suggests Node.js 20.x

### Environment State
**Critical Finding**: No `.env` file exists in the project root. Only `.env.example` is present.

This means:
- All configuration uses hardcoded defaults from `getDatabaseConfig()`
- `DB_PASSWORD` is an empty string `''`
- `DB_SERVER` is `'localhost\\SQLEXPRESS'` (literal backslash, not escaped)

### Connection String Format
The `mssql` v12 library accepts the server name in multiple formats:
- `localhost\SQLEXPRESS` (backslash - Windows instance)
- `localhost\\SQLEXPRESS` (escaped backslash in code)
- `localhost,1433` (with port)
- `.\\SQLEXPRESS` (local instance)
- `(local)\\SQLEXPRESS` (alternative local syntax)

**Current format**: `localhost\\SQLEXPRESS` (as string literal in code, becomes `localhost\SQLEXPRESS` at runtime)

## Root Cause Analysis

### Primary Hypothesis: Network Layer Failure
The `ETIMEOUT` error occurs at the TCP connection level, before authentication. This suggests:

1. **SQL Server Service Not Running**
   - Service: `SQL Server (SQLEXPRESS)` or `MSSQL$SQLEXPRESS`
   - Status: Likely stopped or not installed
   - Evidence: Timeout occurs before any authentication attempt

2. **TCP/IP Protocol Disabled**
   - SQL Server Configuration Manager → Protocols for SQLEXPRESS
   - TCP/IP must be enabled and restarted
   - Default port: 1433 (or dynamic port in IPAll section)

3. **Instance Name Resolution Failure**
   - `localhost\SQLEXPRESS` may not resolve to the correct instance
   - SQL Browser service may be stopped (required for named instances)
   - Alternative: Use port-based connection if SQL Browser is unavailable

4. **Firewall Blocking**
   - Windows Firewall blocking port 1433 (or dynamic port)
   - Outbound connection from Electron process blocked
   - Inbound connection to SQL Server blocked

5. **Network Interface Binding**
   - SQL Server may only be listening on specific IP addresses
   - `localhost` may not be bound to the correct interface
   - Check SQL Server Configuration Manager → TCP/IP → IP Addresses

### Secondary Hypothesis: Authentication Configuration
Even if connection establishes, authentication will likely fail:
- Password is empty string `''`
- `sa` account may be disabled (default in modern SQL Server)
- SQL Server Authentication mode may be disabled (Windows-only mode)

## Technical Investigation Steps

### 1. Verify SQL Server Service Status
```powershell
Get-Service | Where-Object {$_.Name -like "*SQL*"}
# Look for: SQL Server (SQLEXPRESS) or MSSQL$SQLEXPRESS
# Status should be "Running"
```

### 2. Check SQL Server Error Log
```sql
-- In SSMS, check SQL Server Error Log
-- Look for startup errors, port binding issues
```

### 3. Verify TCP/IP Protocol
```powershell
# SQL Server Configuration Manager
# SQL Server Network Configuration → Protocols for SQLEXPRESS
# TCP/IP should be "Enabled"
# After enabling, restart SQL Server service
```

### 4. Check Port Configuration
```powershell
# In SQL Server Configuration Manager → TCP/IP → Properties → IP Addresses
# Scroll to "IPAll" section
# Note "TCP Port" (usually 1433) or "TCP Dynamic Ports"
```

### 5. Test Port Connectivity
```powershell
Test-NetConnection -ComputerName localhost -Port 1433
# Or use telnet: telnet localhost 1433
```

### 6. Verify SQL Browser Service
```powershell
Get-Service "SQL Browser"
# Should be running for named instance resolution
```

### 7. Test Connection with Alternative Formats
The code should test multiple server name formats:
- `localhost`
- `.\\SQLEXPRESS`
- `(local)\\SQLEXPRESS`
- `localhost,1433` (if port is known)

## Code-Level Issues

### Issue 1: No Environment File
**Problem**: `.env` file doesn't exist, so defaults are used.
**Impact**: Cannot configure server name, password, or other settings without code changes.
**Solution**: Create `.env` file from `.env.example` and populate with actual values.

### Issue 2: Empty Password
**Problem**: `DB_PASSWORD` defaults to empty string `''`.
**Impact**: Authentication will fail even if connection succeeds.
**Solution**: Set actual password in `.env` or use Windows Authentication.

### Issue 3: Hardcoded Instance Name
**Problem**: Server name is hardcoded as `localhost\\SQLEXPRESS`.
**Impact**: Won't work if instance name differs or if using default instance.
**Solution**: Make configurable via environment variable with fallback detection.

### Issue 4: No Connection Retry Logic
**Problem**: Single connection attempt, fails immediately on timeout.
**Impact**: No recovery from transient network issues.
**Solution**: Implement exponential backoff retry mechanism.

### Issue 5: No Alternative Connection Methods
**Problem**: Only tries one server name format.
**Impact**: Fails if instance name format is incorrect.
**Solution**: Try multiple server name formats sequentially.

## Recommended Fixes

### Fix 1: Create .env File
```env
DB_SERVER=localhost\SQLEXPRESS
DB_DATABASE=rmhsample
DB_USER=sa
DB_PASSWORD=YourActualPasswordHere
DB_ENCRYPT=false
DB_TRUST_CERTIFICATE=true
```

### Fix 2: Add Connection Retry Logic
```typescript
async function initializeDatabaseWithRetry(maxRetries = 3, delay = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await initializeDatabase();
      return;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      logger.warn(`Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}
```

### Fix 3: Try Multiple Server Name Formats
```typescript
const serverNameVariants = [
  config.server,  // Original
  'localhost',
  '.\\SQLEXPRESS',
  '(local)\\SQLEXPRESS',
  'localhost,1433',  // If port is known
];

for (const serverName of serverNameVariants) {
  try {
    poolConfig.server = serverName;
    pool = await sql.connect(poolConfig);
    logger.info(`✅ Connected using server name: ${serverName}`);
    break;
  } catch (error) {
    logger.warn(`Failed with server name "${serverName}": ${error.message}`);
    continue;
  }
}
```

### Fix 4: Add Pre-Connection Diagnostics
```typescript
async function diagnoseConnection(): Promise<void> {
  // Check if SQL Server service is running
  // Check if port is open
  // Check if SQL Browser is running
  // Provide actionable error messages
}
```

## Testing Strategy

### Unit Test Connection Logic
1. Mock `sql.connect()` to simulate timeout
2. Test retry logic
3. Test multiple server name formats
4. Test error handling

### Integration Test
1. Run `test-db.ts` script: `npx ts-node src/main/database/test-db.ts`
2. Verify connection with actual SQL Server
3. Test with different server name formats
4. Test with correct vs incorrect credentials

### Manual Verification
1. Start SQL Server service
2. Enable TCP/IP protocol
3. Verify firewall rules
4. Test connection from SSMS
5. Test connection from Node.js script
6. Test connection from Electron app

## Expected Outcome After Fix

1. **Connection Established**: `sql.connect()` completes within timeout period
2. **Authentication Success**: Login with provided credentials
3. **Query Execution**: Test query `SELECT @@VERSION` succeeds
4. **Pool Initialization**: Connection pool created and ready
5. **IPC Handlers Functional**: All `data:*` IPC handlers can execute queries
6. **Application Features**: POS, inventory, transactions all functional

## Additional Context

### Application Architecture
- **Framework**: Electron 32.1.2
- **Main Process**: TypeScript, uses `mssql` library
- **Renderer Process**: React, communicates via IPC
- **IPC Layer**: `IpcManager` checks `isDatabaseReady()` before handling requests

### Error Propagation
```
sql.connect() [ETIMEOUT]
  → ConnectionError thrown
  → Caught in initializeDatabase()
  → Logged and re-thrown
  → Caught in main.ts initialize()
  → Application continues with database unavailable
  → IPC handlers return errors when called
```

### Current Workaround
Application continues running but shows error messages in UI:
- "Error loading products"
- "Database not ready: Failed to connect to localhost\SQLEXPRESS in 15000ms"

All data operations fail gracefully but provide no functionality.

## Priority Actions

1. **IMMEDIATE**: Verify SQL Server service is running
2. **IMMEDIATE**: Check TCP/IP protocol is enabled
3. **HIGH**: Create `.env` file with correct configuration
4. **HIGH**: Set actual database password
5. **MEDIUM**: Add connection retry logic
6. **MEDIUM**: Try multiple server name formats
7. **LOW**: Add pre-connection diagnostics
8. **LOW**: Improve error messages with actionable steps

---

**End of Technical Brief**

