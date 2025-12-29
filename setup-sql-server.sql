-- SQL Server Setup Script
-- Run this in SQL Server Management Studio (SSMS) to configure sa login
-- 
-- Instructions:
-- 1. Connect to: localhost\SQLEXPRESS using Windows Authentication
-- 2. Open a new query window
-- 3. Replace 'YourStrongPasswordHere' with your actual password
-- 4. Execute this script
-- 5. Restart SQL Server service after enabling Mixed Mode

-- ============================================================
-- Step 1: Enable sa login
-- ============================================================
ALTER LOGIN sa ENABLE;
GO

-- ============================================================
-- Step 2: Set password for sa
-- IMPORTANT: Replace 'YourStrongPasswordHere' with your actual password
-- ============================================================
ALTER LOGIN sa WITH PASSWORD = 'YourStrongPasswordHere';
GO

-- ============================================================
-- Step 3: Verify sa is enabled
-- ============================================================
SELECT 
    name AS LoginName,
    is_disabled AS IsDisabled,
    type_desc AS LoginType
FROM sys.sql_logins
WHERE name = 'sa';
GO

-- Expected result: IsDisabled should be 0 (enabled)

-- ============================================================
-- Step 4: Check current authentication mode
-- ============================================================
SELECT 
    CASE 
        WHEN SERVERPROPERTY('IsIntegratedSecurityOnly') = 1 THEN 'Windows Authentication only'
        ELSE 'Mixed Mode (SQL Server and Windows Authentication)'
    END AS AuthenticationMode;
GO

-- If result shows "Windows Authentication only", you need to:
-- 1. SSMS → Right-click server → Properties → Security
-- 2. Select "SQL Server and Windows Authentication mode"
-- 3. Click OK
-- 4. Restart SQL Server service

-- ============================================================
-- Step 5: Test sa connection (optional)
-- ============================================================
-- After enabling Mixed Mode and restarting, test with:
-- Server: localhost\SQLEXPRESS
-- Authentication: SQL Server Authentication
-- Login: sa
-- Password: [the password you set above]

