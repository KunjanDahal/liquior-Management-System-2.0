# Database Connection Setup Instructions

## Step 1: Create .env File ✅

**DONE**: A `.env` file has been created in the project root.

**ACTION REQUIRED**: Edit `.env` and replace `PUT_REAL_PASSWORD_HERE` with your actual SQL Server sa password.

```env
DB_PASSWORD=YourActualPasswordHere
```

---

## Step 2: Configure SQL Server Authentication

### Option A: Enable sa Login (Recommended for Development)

1. **Open SQL Server Management Studio (SSMS)**
   - If you don't have SSMS, download it from: https://aka.ms/ssmsfullsetup

2. **Connect to SQL Server**
   - Server name: `localhost\SQLEXPRESS`
   - Authentication: **Windows Authentication** (use your Windows login)

3. **Run the Setup Script**
   - Open the file: `setup-sql-server.sql`
   - **IMPORTANT**: Replace `'YourStrongPasswordHere'` with your actual password
   - Execute the script (F5 or Execute button)

4. **Enable Mixed Mode Authentication**
   - In SSMS: Right-click server → **Properties** → **Security** tab
   - Select: **"SQL Server and Windows Authentication mode"**
   - Click **OK**
   - **Restart SQL Server service**:
     ```powershell
     Restart-Service -Name "SQL Server (SQLEXPRESS)"
     ```
     Or use Services (services.msc) → Right-click "SQL Server (SQLEXPRESS)" → Restart

5. **Verify sa Login**
   - In SSMS: Security → Logins → sa
   - Right-click → Properties → Status
   - Ensure "Login" is set to **Enabled**

### Option B: Use Windows Authentication (More Secure)

If you prefer Windows Authentication instead of sa:

1. The code needs to be modified to use integrated authentication
2. Tell me if you want this option and I'll provide the exact code changes

---

## Step 3: Verify TCP/IP Protocol

1. **Open SQL Server Configuration Manager**
   - Press `Win + R`, type: `SQLServerManagerXX.msc` (XX = version, e.g., 16 for SQL Server 2022)
   - Or search "SQL Server Configuration Manager" in Start menu

2. **Enable TCP/IP**
   - Navigate to: **SQL Server Network Configuration** → **Protocols for SQLEXPRESS**
   - Right-click **TCP/IP** → **Enable**
   - If it was disabled, **restart SQL Server service** after enabling

3. **Check Port Configuration**
   - Double-click **TCP/IP** → **IP Addresses** tab
   - Scroll to bottom → **IPAll** section
   - Note the **TCP Port** (usually 1433) or **TCP Dynamic Ports**
   - If using dynamic port, note the port number

4. **If Port is NOT 1433**
   - Update `.env` file:
     ```env
     DB_SERVER=localhost,<PORT_NUMBER>
     ```
     Example: `DB_SERVER=localhost,1434` if port is 1434

---

## Step 4: Test Connection

### A. Test in SSMS (Definitive Test)

1. Open SSMS
2. Connect with:
   - Server: `localhost\SQLEXPRESS`
   - Authentication: **SQL Server Authentication**
   - Login: `sa`
   - Password: [the password you set in Step 2]
3. Click **Connect**

**If this works**: Your Electron app will work too.
**If this fails**: Fix the SQL Server configuration first.

### B. Test with Diagnostic Script

```bash
npm run diagnose:db
```

This will verify:
- ✅ .env file exists
- ✅ Password is set
- ✅ SQL Server service is running
- ✅ Port is accessible

### C. Test Database Connection

```bash
npm run test:db
```

This will attempt a full connection and show detailed results.

### D. Test in Electron App

1. **Restart the Electron app completely**
   - Stop the current process (Ctrl+C)
   - Start fresh: `npm run dev:electron`

2. **Check the logs** for:
   ```
   Environment Configuration Check
   DB_SERVER from env: localhost\SQLEXPRESS (not "undefined")
   DB_PASSWORD set: Yes (length: X)
   ```

3. **Look for connection success**:
   ```
   ✅ Connected to SQL Server successfully
   ✅ Database connection pool initialized and verified
   ```

---

## Troubleshooting

### If connection still times out:

1. **Check SQL Browser Service**
   ```powershell
   Get-Service "SQL Browser"
   ```
   If stopped, start it:
   ```powershell
   Start-Service "SQL Browser"
   ```

2. **Try port-based connection**
   - If SQL Browser is not available, use port directly
   - Update `.env`:
     ```env
     DB_SERVER=localhost,1433
     ```

3. **Check Firewall**
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 1433
   ```
   Should return: `TcpTestSucceeded: True`

4. **Verify SQL Server is listening**
   ```powershell
   netstat -an | findstr 1433
   ```
   Should show `LISTENING` on port 1433

### If authentication fails:

1. **Verify sa is enabled**:
   ```sql
   SELECT name, is_disabled FROM sys.sql_logins WHERE name = 'sa';
   ```
   `is_disabled` should be `0`

2. **Verify Mixed Mode**:
   ```sql
   SELECT SERVERPROPERTY('IsIntegratedSecurityOnly');
   ```
   Should return `0` (Mixed Mode enabled)

3. **Check password**:
   - Ensure `.env` has the correct password
   - No extra spaces or quotes
   - Password matches what you set in SQL Server

---

## Quick Verification Checklist

After completing all steps, verify:

- [ ] `.env` file exists with real password
- [ ] sa login is enabled in SQL Server
- [ ] sa has a password set
- [ ] Mixed Mode authentication is enabled
- [ ] SQL Server service restarted after Mixed Mode change
- [ ] TCP/IP protocol is enabled
- [ ] Can connect in SSMS with SQL Authentication (sa + password)
- [ ] Port 1433 is accessible (or using correct port in .env)
- [ ] Electron app logs show `.env` values loaded (not "undefined")

---

## Next Steps

Once you've completed the setup:

1. **Answer these 4 questions**:
   - I set sa password: **Yes / No**
   - Mixed Mode: **Yes / No**
   - TCP/IP: **Enabled / Disabled**
   - Can connect in SSMS with sa: **Yes / No**

2. **Run diagnostic**:
   ```bash
   npm run diagnose:db
   ```

3. **Test connection**:
   ```bash
   npm run test:db
   ```

4. **Start Electron app**:
   ```bash
   npm run dev:electron
   ```

If everything passes, the connection should work! 🎉



