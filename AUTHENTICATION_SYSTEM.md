# Professional Authentication System Documentation

## Overview

This POS (Point of Sale) system now includes a **production-ready, professional authentication system** with the following features:

- ✅ **Secure password hashing** using bcrypt (12 rounds)
- ✅ **JWT token-based authentication** (24-hour access tokens, 7-day refresh tokens)
- ✅ **Role-Based Access Control (RBAC)** with configurable permissions
- ✅ **Session management** with database tracking
- ✅ **Password policies** (minimum 8 characters, uppercase, lowercase, numbers, special characters)
- ✅ **Account lockout** after 5 failed login attempts (30-minute lockout)
- ✅ **Audit logging** for all authentication events
- ✅ **Password change functionality** with validation

## Architecture

### Database Schema

The authentication system uses 4 main tables:

1. **Users** - User accounts with hashed passwords
2. **Roles** - Role definitions (Administrator, Manager, Cashier, Inventory)
3. **UserSessions** - Active session tracking
4. **AuditLog** - Security and activity audit trail

### Component Structure

```
src/main/
├── auth/
│   ├── jwt.service.ts          # JWT token generation and validation
│   └── auth.service.ts         # Main authentication logic
├── database/
│   ├── repositories/
│   │   └── users.repo.ts       # User repository with password hashing
│   └── types/
│       ├── database.types.ts   # User/Role/Session entity types
│       └── dto.types.ts        # Authentication DTOs
└── ipc/
    └── IpcManager.ts           # IPC handlers for authentication
```

## Setup Instructions

### Step 1: Create Database Schema

Run the SQL migration script to create the authentication tables:

```sql
-- Run this script in SQL Server Management Studio
-- File: database-auth-schema.sql
```

This creates:
- `Users` table
- `Roles` table (with default roles)
- `UserSessions` table
- `AuditLog` table
- Stored procedures and triggers

### Step 2: Create Admin User

**IMPORTANT**: Users must be created through the application interface to properly hash passwords.

The `create-admin-user.sql` script is provided as a reference, but **passwords must be hashed using bcrypt**. You have two options:

#### Option A: Use the Application (Recommended)

1. First, create a setup script or admin interface to create the first admin user
2. The application will properly hash the password using bcrypt

#### Option B: Temporary Admin Creation Script

For initial setup, you can temporarily modify the application code to create an admin user on first run, or use a setup utility.

### Step 3: Configure JWT Secret

**CRITICAL FOR PRODUCTION**: Update the JWT secret in `src/main/auth/jwt.service.ts`:

```typescript
// Generate a strong secret (32+ characters):
// openssl rand -base64 32

const JWT_SECRET = process.env.JWT_SECRET || 'your-actual-production-secret-here-minimum-32-characters';
```

**Better approach**: Use environment variables:

1. Add to `.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-generated-with-openssl-rand-base64-32
JWT_REFRESH_SECRET=your-refresh-token-secret-different-from-access-token
```

2. Update `jwt.service.ts`:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  throw new Error('JWT_SECRET environment variable is required');
})();
```

## Usage

### Frontend Integration

The authentication API is exposed through the Electron IPC system:

```typescript
// Login
const response = await window.electronAPI.login({
  username: 'admin',
  password: 'YourPassword123!'
});

if (response.success) {
  const { user, token, expiresAt } = response.data;
  localStorage.setItem('authToken', token);
  // Redirect to dashboard
}

// Get current user
const token = localStorage.getItem('authToken');
const userResponse = await window.electronAPI.getCurrentUser(token!);

// Logout
await window.electronAPI.logout(token!, user.id);
localStorage.removeItem('authToken');
```

### Backend Usage

The authentication service can be used directly in the main process:

```typescript
import { login, logout, getCurrentUser } from './auth/auth.service';

// Login
const loginResponse = await login(
  { username: 'admin', password: 'password' },
  '192.168.1.1', // IP address (optional)
  'Mozilla/5.0...' // User agent (optional)
);

// Verify token
const user = await getCurrentUser(token);
if (!user) {
  // Token invalid or expired
}
```

## Default Roles

The system comes with 4 default roles:

1. **Administrator** - Full system access (`{"*":"*"}`)
2. **Manager** - Store management (inventory, sales, reports, customers)
3. **Cashier** - Point of sale operations (create sales, view customers)
4. **Inventory** - Inventory management only

### Adding Custom Roles

```sql
INSERT INTO Roles (RoleName, Description, Permissions)
VALUES (
  'CustomRole',
  'Custom role description',
  '{"inventory":"read","sales":"read"}' -- JSON permissions
);
```

## Password Requirements

Passwords must meet the following requirements:
- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*(),.?":{}|<>)

## Security Features

### 1. Password Hashing
- Uses bcrypt with 12 salt rounds
- Passwords are never stored in plain text
- Each password hash is unique (bcrypt includes salt)

### 2. Token Security
- Access tokens expire in 24 hours
- Refresh tokens expire in 7 days
- Tokens are stored in database for revocation capability
- Tokens include user ID, role, and session ID

### 3. Account Protection
- Maximum 5 failed login attempts
- 30-minute account lockout after max attempts
- Failed attempts are logged in audit log

### 4. Session Management
- Sessions tracked in database
- Sessions can be revoked (deactivated)
- Session activity tracking
- Automatic cleanup of expired sessions

### 5. Audit Logging
All authentication events are logged:
- Login attempts (success/failure)
- Logout events
- Password changes
- Account lockouts
- Failed authentication attempts

## Client Deployment Checklist

Before deploying to clients:

- [ ] ✅ Run database migration script (`database-auth-schema.sql`)
- [ ] ✅ Create admin user through application interface
- [ ] ✅ Set strong JWT_SECRET in environment variables (32+ characters)
- [ ] ✅ Set JWT_REFRESH_SECRET (different from JWT_SECRET)
- [ ] ✅ Update `.env` file with secure JWT secrets
- [ ] ✅ Verify password policies are enforced
- [ ] ✅ Test login/logout functionality
- [ ] ✅ Test account lockout after failed attempts
- [ ] ✅ Verify audit logs are being created
- [ ] ✅ Test role-based access control (if implemented)
- [ ] ✅ Ensure `.env` file is not included in production builds
- [ ] ✅ Document default admin credentials for client (separate secure document)

## API Reference

### IPC Handlers

#### `auth:login`
```typescript
// Request
{
  username: string;
  password: string;
}

// Response
{
  success: boolean;
  data: {
    user: UserDTO;
    token: string;
    refreshToken?: string;
    expiresAt: Date;
  };
  error?: string;
}
```

#### `auth:logout`
```typescript
// Request
token: string
userId?: number

// Response
{
  success: boolean;
  message?: string;
  error?: string;
}
```

#### `auth:get-current-user`
```typescript
// Request
token: string

// Response
{
  success: boolean;
  data: UserDTO | null;
  error?: string;
}
```

#### `auth:validate-token`
```typescript
// Request
token: string

// Response
{
  success: boolean;
  data: UserDTO | null;
  message?: string;
}
```

#### `auth:change-password`
```typescript
// Request
userId: number
{
  currentPassword: string;
  newPassword: string;
}

// Response
{
  success: boolean;
  message?: string;
  error?: string;
}
```

## Troubleshooting

### "Database not ready"
- Ensure SQL Server is running
- Check `.env` file configuration
- Verify database connection in main process

### "Invalid username or password"
- Check username is correct (case-sensitive)
- Verify password meets requirements
- Check if account is locked (too many failed attempts)
- Verify user account is active

### "Token is invalid or expired"
- Token may have expired (24 hours)
- Session may have been revoked
- Check if user account is still active
- Try logging in again

### Password hash errors
- Ensure users are created through application interface
- Never insert passwords directly into database
- Always use `hashPassword()` function from users.repo.ts

## Best Practices

1. **Never log passwords** - Not even in development
2. **Use environment variables** for JWT secrets in production
3. **Rotate JWT secrets** periodically (requires all users to re-login)
4. **Monitor audit logs** for suspicious activity
5. **Implement rate limiting** on login endpoint (future enhancement)
6. **Use HTTPS/WSS** for all communication (Electron apps should use secure IPC)
7. **Regular security audits** of authentication logs
8. **Educate users** on password security best practices

## Future Enhancements

Potential improvements for future versions:
- [ ] Multi-factor authentication (MFA)
- [ ] Biometric authentication (fingerprint, face recognition)
- [ ] Password expiration policies
- [ ] Password history (prevent reusing recent passwords)
- [ ] Email verification for password resets
- [ ] "Remember me" functionality
- [ ] Concurrent session management
- [ ] Rate limiting on login attempts
- [ ] IP address whitelisting
- [ ] Two-factor authentication (2FA)

## Support

For issues or questions about the authentication system:
1. Check the audit logs for error details
2. Review the troubleshooting section
3. Check database connection and schema
4. Verify environment variables are set correctly

---

**Security Note**: This authentication system follows industry best practices but should be reviewed by security professionals before deployment in high-security environments. Consider additional security measures based on your specific requirements and compliance needs (PCI DSS, HIPAA, etc.).

