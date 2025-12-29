# SQL Server Connection Troubleshooting Guide

This guide helps you diagnose and fix SQL Server connection issues in the Liquor Store Management System.

## Quick Diagnosis

Run the standalone database test script:
```bash
npx ts-node src/main/database/test-db.ts
```

This will test your connection and provide specific error messages.

## Common Issues and Solutions

### 1. Connection Timeout (ETIMEOUT)

**Symptoms:**
- Error: `Failed to connect to localhost\SQLEXPRESS in 15000ms (ETIMEOUT)`
- App logs show connection timeout

**Solutions:**

#### A. Verify SQL Server Service is Running

1. Press `Win + R`, type `services.msc`, press Enter
2. Find one of these services:
   - `SQL Server (SQLEXPRESS)` - for named instance
   - `SQL Server (MSSQLSERVER)` - for default instance
3. Check Status column:
   - If **Stopped**: Right-click > Start
   - If **Starting**: Wait for it to become "Running"
4. Verify it stays running (not immediately stopping)

#### B. Verify Instance Name

The instance name in your `.env` file must match exactly. Common formats:

- **Named instance (SQLEXPRESS):**
  - `localhost\SQLEXPRESS`
  - `.\SQLEXPRESS`
  - `(local)\SQLEXPRESS`
  - `COMPUTERNAME\SQLEXPRESS` (replace COMPUTERNAME with your PC name)

- **Default instance:**
  - `localhost`
  - `.`
  - `(local)`
  - `COMPUTERNAME`

**To find your exact instance name:**
1. Open SQL Server Configuration Manager
2. Navigate to: SQL Server Services
3. Look for running SQL Server services
4. The name in parentheses is your instance name

**Update `.env` file:**
```env
DB_SERVER=localhost\SQLEXPRESS  # Use your exact instance name
```

#### C. Enable TCP/IP Protocol

TCP/IP must be enabled for remote/local connections:

1. **Open SQL Server Configuration Manager:**
   - Press `Win + R`
   - Type `SQLServerManagerXX.msc` (XX = version, e.g., 20 for SQL Server 2022)
   - Or search "SQL Server Configuration Manager" in Start menu

2. **Enable TCP/IP:**
   - Navigate to: `SQL Server Network Configuration` > `Protocols for SQLEXPRESS` (or your instance)
   - Right-click `TCP/IP` > **Enable**
   - If already enabled, right-click > **Properties**

3. **Configure TCP/IP Properties:**
   - Double-click `TCP/IP`
   - Go to `IP Addresses` tab
   - Scroll to bottom to `IPAll` section
   - Note the `TCP Port` (usually 1433)
   - If `TCP Dynamic Ports` is set, note that port instead
   - Click **OK**

4. **Restart SQL Server Service:**
   - Go back to `SQL Server Services`
   - Right-click `SQL Server (SQLEXPRESS)` > **Restart**

#### D. Check Windows Firewall

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules"
4. Look for rules allowing SQL Server (port 1433 or your dynamic port)
5. If missing, create a new rule:
   - New Rule > Port > TCP > Specific local ports: `1433` (or your port)
   - Allow the connection
   - Apply to all profiles
   - Name: "SQL Server"

### 2. Authentication Failed

**Symptoms:**
- Error: `Login failed for user 'sa'`
- Error: `Authentication failed`

**Solutions:**

#### A. Verify Credentials in .env

Check your `.env` file (create from `.env.example` if missing):
```env
DB_USER=sa
DB_PASSWORD=your_actual_password
```

**Important:** 
- Use the exact password you set during SQL Server installation
- If you forgot the password, you may need to reset it

#### B. Enable SQL Server Authentication

By default, SQL Server may only allow Windows Authentication:

1. **Open SQL Server Management Studio (SSMS):**
   - If not installed, download from Microsoft
   - Connect using Windows Authentication

2. **Enable Mixed Mode Authentication:**
   - Right-click server name > **Properties**
   - Go to **Security** page
   - Select **"SQL Server and Windows Authentication mode"**
   - Click **OK**
   - **Restart SQL Server service** (required!)

3. **Verify SA Account:**
   - In SSMS, expand: `Security` > `Logins`
   - Find `sa` account
   - Right-click > **Properties**
   - Go to **Status** page
   - Ensure **Login** is set to **Enabled**
   - Go to **General** page
   - Set password if needed
   - Click **OK**

#### C. Create/Verify Database User

1. In SSMS, expand: `Security` > `Logins`
2. Right-click > **New Login**
3. Enter login name (e.g., `sa` or create new user)
4. Select **SQL Server authentication**
5. Enter password
6. Go to **User Mapping** page
7. Check `rmhsample` database
8. Assign `db_owner` role (or appropriate permissions)
9. Click **OK**

### 3. Database Not Found

**Symptoms:**
- Error: `Cannot open database "rmhsample"`
- Error: `Database 'rmhsample' does not exist`

**Solutions:**

#### A. Verify Database Exists

1. Open SQL Server Management Studio
2. Connect to your server
3. Expand **Databases**
4. Look for `rmhsample` database

#### B. Restore Database from Backup

If database doesn't exist:

1. In SSMS, right-click **Databases** > **Restore Database**
2. Select **Device** radio button
3. Click **Browse** (...)
4. Click **Add**
5. Navigate to `rmhSample.bck` file in project root
6. Click **OK**
7. In **Destination** section:
   - Database name: `rmhsample`
8. Click **OK** to restore

### 4. SQL Server Browser Service

**Symptoms:**
- Can connect with instance name but not with server name only
- Dynamic ports not working

**Solutions:**

1. Open Services (`services.msc`)
2. Find `SQL Server Browser`
3. Right-click > **Start** (set to Automatic if needed)
4. This service helps resolve instance names

### 5. Port Configuration Issues

**Symptoms:**
- Connection works sometimes but not always
- Timeout with specific ports

**Solutions:**

#### Find Your SQL Server Port:

1. Open SQL Server Configuration Manager
2. Navigate to: `SQL Server Network Configuration` > `Protocols for SQLEXPRESS`
3. Double-click `TCP/IP`
4. Go to `IP Addresses` tab
5. Scroll to `IPAll` section
6. Note:
   - `TCP Dynamic Ports` (if set, this is your port)
   - `TCP Port` (if dynamic is empty, use this)

#### Use Specific Port in Connection:

If using a non-standard port, you can specify it:
```env
DB_SERVER=localhost\SQLEXPRESS,1433
# or for dynamic port:
DB_SERVER=localhost\SQLEXPRESS,49152
```

## Testing Your Connection

### Method 1: Standalone Test Script

```bash
npx ts-node src/main/database/test-db.ts
```

This will:
- Test connection
- Verify database exists
- Test Item table access
- List all required tables
- Provide specific error messages

### Method 2: SQL Server Management Studio

1. Open SSMS
2. Connect using:
   - Server name: `localhost\SQLEXPRESS` (or your instance)
   - Authentication: SQL Server Authentication
   - Login: `sa` (or your user)
   - Password: Your password
3. If connection succeeds, your credentials are correct

### Method 3: Command Line (sqlcmd)

```bash
sqlcmd -S localhost\SQLEXPRESS -U sa -P your_password -Q "SELECT @@VERSION"
```

If this works, SQL Server is accessible.

## Environment Variables Reference

Create a `.env` file in the project root:

```env
# SQL Server instance (use exact instance name)
DB_SERVER=localhost\SQLEXPRESS

# Database name
DB_DATABASE=rmhsample

# SQL Server authentication
DB_USER=sa
DB_PASSWORD=your_password_here

# Connection options
DB_ENCRYPT=false
DB_TRUST_CERTIFICATE=true
```

## Verification Checklist

Before reporting issues, verify:

- [ ] SQL Server service is running (check Services)
- [ ] Instance name in `.env` matches actual instance name
- [ ] TCP/IP is enabled in SQL Server Configuration Manager
- [ ] SQL Server service was restarted after enabling TCP/IP
- [ ] SQL Server Authentication mode is enabled
- [ ] User credentials in `.env` are correct
- [ ] `rmhsample` database exists
- [ ] User has permissions on `rmhsample` database
- [ ] Windows Firewall allows SQL Server port
- [ ] SQL Server Browser service is running (if using named instances)

## Still Having Issues?

1. **Check Application Logs:**
   - Look for detailed error messages in console output
   - Errors will indicate specific issues (timeout, auth, database, etc.)

2. **Run Test Script:**
   ```bash
   npx ts-node src/main/database/test-db.ts
   ```
   This provides the most detailed diagnostics.

3. **Verify SQL Server Installation:**
   - Ensure SQL Server is properly installed
   - Check SQL Server error logs: `C:\Program Files\Microsoft SQL Server\MSSQLXX.MSSQLSERVER\MSSQL\Log\ERRORLOG`

4. **Check Network Configuration:**
   - Ensure you're not using VPN that blocks localhost
   - Try using `127.0.0.1` instead of `localhost`
   - Try using your computer name instead of localhost

## Common Instance Names

- **SQL Server Express:** `SQLEXPRESS`
- **SQL Server Developer:** `MSSQLSERVER` (default) or custom name
- **SQL Server Standard/Enterprise:** Usually `MSSQLSERVER` (default)

## Quick Fix Commands

### Start SQL Server Service (PowerShell as Admin):
```powershell
Start-Service "MSSQL$SQLEXPRESS"  # For SQLEXPRESS
# or
Start-Service "MSSQLSERVER"  # For default instance
```

### Check SQL Server Status:
```powershell
Get-Service | Where-Object {$_.Name -like "*SQL*"}
```

### Test Connection with sqlcmd:
```powershell
sqlcmd -S localhost\SQLEXPRESS -U sa -P your_password -Q "SELECT 1"
```

## Success Indicators

When everything is working, you should see:

```
✅ Connected to SQL Server successfully
✅ Database connection pool initialized and verified
✅ Item table accessible
✅ Database verified successfully
✅ Database is ready for use
```

And in the application:
- Products load in POS
- Low stock alerts appear
- Dashboard shows data
- No database errors in console

