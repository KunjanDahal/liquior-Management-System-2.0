-- =============================================
-- Windows Authentication Setup Script
-- For User: laptop-63tin71k\krist
-- =============================================
-- 
-- INSTRUCTIONS:
-- 1. Open SQL Server Management Studio (SSMS)
-- 2. Connect using Windows Authentication
-- 3. Run this entire script (F5)
-- 4. Check the output messages for success/errors
--
-- =============================================

USE master;
GO

PRINT '========================================';
PRINT 'Windows Authentication Setup';
PRINT 'User: laptop-63tin71k\krist';
PRINT '========================================';
PRINT '';

-- Step 1: Verify current Windows user
PRINT 'Step 1: Checking current Windows user...';
SELECT SYSTEM_USER AS CurrentWindowsUser;
PRINT '';

-- Step 2: Create Windows login (if it doesn't exist)
PRINT 'Step 2: Creating Windows login...';
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'laptop-63tin71k\krist')
BEGIN
    BEGIN TRY
        CREATE LOGIN [laptop-63tin71k\krist] FROM WINDOWS;
        PRINT '✅ Windows login created successfully: laptop-63tin71k\krist';
    END TRY
    BEGIN CATCH
        PRINT '❌ Error creating Windows login:';
        PRINT ERROR_MESSAGE();
    END CATCH
END
ELSE
BEGIN
    PRINT 'ℹ️  Windows login already exists: laptop-63tin71k\krist';
END
GO

-- Step 3: Grant server-level permissions
PRINT '';
PRINT 'Step 3: Granting server-level permissions...';
BEGIN TRY
    -- For development: Grant sysadmin (full access)
    -- For production: Use more restrictive roles (see comments below)
    ALTER SERVER ROLE sysadmin ADD MEMBER [laptop-63tin71k\krist];
    PRINT '✅ Granted sysadmin role (full server access)';
    
    -- PRODUCTION ALTERNATIVE (uncomment for production):
    -- ALTER SERVER ROLE dbcreator ADD MEMBER [laptop-63tin71k\krist];
    -- PRINT '✅ Granted dbcreator role (can create databases)';
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 15151 -- Already a member
    BEGIN
        PRINT 'ℹ️  User already has sysadmin role';
    END
    ELSE
    BEGIN
        PRINT '❌ Error granting server permissions:';
        PRINT ERROR_MESSAGE();
    END
END CATCH
GO

-- Step 4: Switch to target database and create database user
PRINT '';
PRINT 'Step 4: Setting up database access for rmhsample...';
USE [rmhsample];
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'laptop-63tin71k\krist')
BEGIN
    BEGIN TRY
        CREATE USER [laptop-63tin71k\krist] FOR LOGIN [laptop-63tin71k\krist];
        PRINT '✅ Database user created: laptop-63tin71k\krist';
    END TRY
    BEGIN CATCH
        PRINT '❌ Error creating database user:';
        PRINT ERROR_MESSAGE();
    END CATCH
END
ELSE
BEGIN
    PRINT 'ℹ️  Database user already exists: laptop-63tin71k\krist';
END
GO

-- Step 5: Grant database permissions
PRINT '';
PRINT 'Step 5: Granting database permissions...';
BEGIN TRY
    -- For development: Grant db_owner (full database access)
    ALTER ROLE db_owner ADD MEMBER [laptop-63tin71k\krist];
    PRINT '✅ Granted db_owner role (full database access)';
    
    -- PRODUCTION ALTERNATIVE (uncomment for production):
    -- ALTER ROLE db_datareader ADD MEMBER [laptop-63tin71k\krist];
    -- ALTER ROLE db_datawriter ADD MEMBER [laptop-63tin71k\krist];
    -- ALTER ROLE db_ddladmin ADD MEMBER [laptop-63tin71k\krist];
    -- PRINT '✅ Granted read/write/DDL permissions (production-safe)';
END TRY
BEGIN CATCH
    IF ERROR_NUMBER() = 15151 -- Already a member
    BEGIN
        PRINT 'ℹ️  User already has db_owner role';
    END
    ELSE
    BEGIN
        PRINT '❌ Error granting database permissions:';
        PRINT ERROR_MESSAGE();
    END
END CATCH
GO

-- Step 6: Verify the setup
PRINT '';
PRINT '========================================';
PRINT 'Verification: Checking setup...';
PRINT '========================================';

-- Check server login
PRINT '';
PRINT 'Server Login Status:';
SELECT 
    name AS LoginName,
    type_desc AS LoginType,
    is_disabled AS IsDisabled,
    create_date AS CreatedDate
FROM sys.server_principals 
WHERE name = 'laptop-63tin71k\krist';

-- Check database user
PRINT '';
PRINT 'Database User Status:';
SELECT 
    dp.name AS DatabaseUser,
    dp.type_desc AS UserType,
    ISNULL(sp.name, 'N/A') AS ServerLogin,
    dp.create_date AS CreatedDate
FROM sys.database_principals dp
LEFT JOIN sys.server_principals sp ON dp.sid = sp.sid
WHERE dp.name = 'laptop-63tin71k\krist';

-- Check role memberships
PRINT '';
PRINT 'Database Role Memberships:';
SELECT 
    r.name AS RoleName,
    m.name AS MemberName
FROM sys.database_role_members rm
INNER JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
INNER JOIN sys.database_principals m ON rm.member_principal_id = m.principal_id
WHERE m.name = 'laptop-63tin71k\krist';

PRINT '';
PRINT '========================================';
PRINT 'Setup Complete!';
PRINT '========================================';
PRINT '';
PRINT 'Next Steps:';
PRINT '1. Ensure SQL Server is set to Mixed Mode Authentication';
PRINT '2. Restart SQL Server service if you just enabled Mixed Mode';
PRINT '3. Test connection in SSMS with Windows Authentication';
PRINT '4. Run: npm run test:db';
PRINT '';

