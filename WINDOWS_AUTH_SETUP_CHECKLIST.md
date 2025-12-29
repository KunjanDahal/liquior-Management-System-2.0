# Windows Authentication Setup Checklist

## ✅ What I've Done Automatically

- [x] Updated `.env` file to enable Windows Authentication
- [x] Created SQL setup script (`setup-windows-auth.sql`) with your username pre-filled
- [x] Identified your Windows username: `laptop-63tin71k\krist`

---

## 📋 What YOU Need to Do (Manual Steps)

### Step 1: Enable Mixed Mode Authentication in SQL Server ⚠️ REQUIRED

**Why:** SQL Server must allow both Windows and SQL Authentication.

**Steps:**
1. Open **SQL Server Management Studio (SSMS)**
   - If you don't have it: Download from https://aka.ms/ssmsfullsetup
2. Connect to your SQL Server:
   - Server: `localhost\SQLEXPRESS` (or your instance name)
   - Authentication: **Windows Authentication** (use your Windows login)
3. Right-click your server name → **Properties** → **Security** tab
4. Under "Server authentication", select:
   - ✅ **"SQL Server and Windows Authentication mode"**
5. Click **OK**
6. **IMPORTANT:** Restart SQL Server service:
   ```powershell
   Restart-Service -Name "SQL Server (SQLEXPRESS)"
   ```
   Or use Services app: `services.msc` → Find "SQL Server (SQLEXPRESS)" → Right-click → Restart

---

### Step 2: Run the SQL Setup Script ⚠️ REQUIRED

**File:** `setup-windows-auth.sql` (already created with your username)

**Steps:**
1. In SSMS, open the file: `setup-windows-auth.sql`
2. Make sure you're connected to your SQL Server
3. Click **Execute** (F5) or click the Execute button
4. Check the **Messages** tab for success messages:
   - ✅ "Windows login created successfully"
   - ✅ "Database user created"
   - ✅ "Granted db_owner role"

**If you see errors:**
- "Login failed" → Make sure you're connected with Windows Authentication in SSMS
- "Database does not exist" → Make sure `rmhsample` database exists
- "Already exists" messages → That's fine, means it's already set up

---

### Step 3: Verify Windows Authentication Works ⚠️ REQUIRED

**Test in SSMS:**
1. Close and reopen SSMS
2. Try to connect with:
   - Server: `localhost\SQLEXPRESS`
   - Authentication: **Windows Authentication**
3. If it connects → ✅ Windows Auth is working!

**Test with Application:**
```bash
npm run test:db
```

**Expected output:**
- ✅ "Connected to SQL Server successfully"
- ✅ "Authentication: Windows Authentication"

---

### Step 4: Start Your Application

```bash
npm run dev:electron
```

**Check the logs for:**
- ✅ "Authentication: Windows Authentication"
- ✅ "Database connection pool initialized and verified"
- ✅ No password-related errors

---

## 🔍 Troubleshooting

### Issue: "Login failed for user ''"

**Causes:**
- SQL Server not set to Mixed Mode → Do Step 1
- Windows user doesn't have SQL Server login → Do Step 2
- SQL Server service not restarted after Mixed Mode change → Restart service

**Fix:**
1. Verify Mixed Mode is enabled (Step 1)
2. Run the SQL script again (Step 2)
3. Restart SQL Server service

---

### Issue: "Cannot open database 'rmhsample'"

**Cause:** Windows user doesn't have database permissions

**Fix:**
1. Run the SQL script again (Step 2)
2. Check the verification section at the end of the script output

---

### Issue: Connection timeout

**Causes:**
- SQL Server service not running
- TCP/IP not enabled
- Firewall blocking connection

**Fix:**
1. Check SQL Server service is running:
   ```powershell
   Get-Service "SQL Server (SQLEXPRESS)"
   ```
2. Enable TCP/IP in SQL Server Configuration Manager
3. Check firewall settings

---

## ✅ Final Verification Checklist

Before considering setup complete, verify:

- [ ] Mixed Mode Authentication is enabled in SQL Server
- [ ] SQL Server service was restarted after enabling Mixed Mode
- [ ] SQL script (`setup-windows-auth.sql`) ran successfully
- [ ] Can connect to SQL Server in SSMS using Windows Authentication
- [ ] `npm run test:db` shows successful connection
- [ ] Application starts without database errors
- [ ] `.env` file has `DB_USE_WINDOWS_AUTH=true`

---

## 📝 Quick Reference

**Your Windows Username:** `laptop-63tin71k\krist`

**SQL Script:** `setup-windows-auth.sql`

**Configuration File:** `.env` (already updated)

**Test Command:** `npm run test:db`

---

## 🆘 Still Having Issues?

1. Check the SQL script output messages for specific errors
2. Verify your Windows username is correct: `whoami` in PowerShell
3. Make sure you're running SSMS as administrator (if needed)
4. Check SQL Server error logs: `C:\Program Files\Microsoft SQL Server\[Version]\MSSQL\Log\`

---

**You're almost there! Follow the steps above and you'll be set up with Windows Authentication.** 🎯

