-- Check SQL Server Authentication Mode
-- Run this in SSMS to verify Mixed Mode is enabled

-- Method 1: Check authentication mode
SELECT 
    CASE SERVERPROPERTY('IsIntegratedSecurityOnly')
        WHEN 0 THEN 'Mixed Mode (SQL Server and Windows Authentication) ✅'
        WHEN 1 THEN 'Windows Authentication Only ❌ - NEEDS TO BE CHANGED'
    END AS AuthenticationMode;

-- Method 2: Check if your Windows user has a login
SELECT 
    name AS LoginName,
    type_desc AS LoginType,
    is_disabled AS IsDisabled,
    create_date AS CreatedDate
FROM sys.server_principals 
WHERE name = 'laptop-63tin71k\krist'
   OR name = 'LAPTOP-63TIN71K\krist';

-- Method 3: Check database user
USE [rmhsample];
GO

SELECT 
    dp.name AS DatabaseUser,
    dp.type_desc AS UserType,
    ISNULL(sp.name, 'N/A') AS ServerLogin,
    dp.create_date AS CreatedDate
FROM sys.database_principals dp
LEFT JOIN sys.server_principals sp ON dp.sid = sp.sid
WHERE dp.name LIKE '%krist%';

-- If AuthenticationMode shows "Windows Authentication Only", you need to:
-- 1. Right-click server → Properties → Security
-- 2. Select "SQL Server and Windows Authentication mode"
-- 3. Click OK
-- 4. Restart SQL Server service

