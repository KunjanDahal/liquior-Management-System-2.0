-- ============================================
-- Create Admin User Script
-- Run this AFTER creating the authentication schema
-- ============================================

-- IMPORTANT: This script creates a default admin user
-- Username: admin
-- Password: Admin@123 (CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN!)
-- 
-- You MUST change the password after first login for security!

-- First, ensure Roles table has Administrator role
IF NOT EXISTS (SELECT * FROM [dbo].[Roles] WHERE [RoleName] = 'Administrator')
BEGIN
    INSERT INTO [dbo].[Roles] ([RoleName], [Description], [Permissions])
    VALUES ('Administrator', 'Full system access', '{"*":"*"}');
END
GO

-- Get Administrator RoleID
DECLARE @AdminRoleID INT;
SELECT @AdminRoleID = [RoleID] FROM [dbo].[Roles] WHERE [RoleName] = 'Administrator';

-- Default admin user (password will be hashed by the application)
-- Username: admin
-- Default Password: Admin@123 (MUST BE CHANGED!)
-- 
-- NOTE: The PasswordHash here is a placeholder.
-- The application will hash the password when creating the user.
-- For security, it's recommended to create users through the application interface.

-- Check if admin user already exists
IF NOT EXISTS (SELECT * FROM [dbo].[Users] WHERE [Username] = 'admin')
BEGIN
    -- Insert admin user with placeholder hash
    -- The application should create users properly with bcrypt hashing
    INSERT INTO [dbo].[Users] (
        [Username],
        [Email],
        [PasswordHash],
        [FirstName],
        [LastName],
        [RoleID],
        [IsActive],
        [MustChangePassword],
        [CreatedAt],
        [UpdatedAt]
    )
    VALUES (
        'admin',
        'admin@store.local',
        'PLACEHOLDER_HASH_MUST_BE_REPLACED', -- This MUST be replaced with bcrypt hash by the application
        'System',
        'Administrator',
        @AdminRoleID,
        1,
        1, -- Force password change on first login
        GETDATE(),
        GETDATE()
    );
    
    PRINT 'Admin user created (username: admin)';
    PRINT 'IMPORTANT: You must create users through the application interface to properly hash passwords!';
    PRINT 'This placeholder user will not work until properly created with password hashing.';
END
ELSE
BEGIN
    PRINT 'Admin user already exists.';
END
GO

PRINT '';
PRINT 'To create users properly:';
PRINT '1. Use the application''s user management interface';
PRINT '2. Or use the authentication API/service methods that handle password hashing';
PRINT '3. Never store plain text passwords in the database!';

