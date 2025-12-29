# 🍷 Rakshi Pasal Management System

A comprehensive, production-ready desktop application for managing liquor store operations. Built with modern web technologies, this system provides a complete solution for inventory management, point-of-sale transactions, customer management, and business analytics.

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Database Setup](#database-setup)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Development Guide](#-development-guide)
- [Building for Production](#-building-for-production)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

## 🎯 Overview

**Rakshi Pasal Management System** is an Electron-based desktop application designed specifically for liquor store operations. It combines the power of modern web technologies with native desktop capabilities to deliver a fast, secure, and user-friendly experience.

### What This System Does

- **Point of Sale (POS)**: Process sales transactions quickly with age verification
- **Inventory Management**: Track products, stock levels, suppliers, and receive low stock alerts
- **Customer Management**: Maintain customer database with purchase history
- **Analytics & Reporting**: Real-time dashboards, sales reports, and business insights
- **User Management**: Secure authentication with role-based access control
- **Receipt Generation**: Professional receipt printing and management

### Why This Technology Stack?

- **Electron**: Cross-platform desktop app with native OS integration
- **React**: Modern, component-based UI with excellent developer experience
- **TypeScript**: Type safety and improved code maintainability
- **SQL Server**: Robust relational database with enterprise-grade features
- **JWT Authentication**: Secure, stateless authentication system

## ✨ Key Features

### 📊 Dashboard
- Real-time analytics and key performance indicators (KPIs)
- Sales trends and revenue tracking
- Top-selling products visualization
- Low stock alerts summary
- Recent transaction history
- Weekly/monthly sales charts

### 🛒 Point of Sale (POS)
- Fast, intuitive checkout interface
- Shopping cart management
- Age verification for restricted products
- Multiple payment methods support
- Receipt generation and printing
- Customer lookup and management
- Product search and barcode scanning

### 📦 Inventory Management
- **Product Catalog**: Complete product database with categories, pricing, and descriptions
- **Stock Management**: Real-time stock level tracking and updates
- **Low Stock Alerts**: Automated notifications when products are running low
- **Supplier Management**: Track suppliers and purchase orders
- **Barcode Scanning**: Quick product lookup using barcode scanner integration
- **Bulk Operations**: Import/export product data

### 👥 Customer Management
- Customer database with contact information
- Purchase history tracking
- Age verification records
- Customer search and filtering

### 🔐 Authentication & Security
- **JWT-based Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: 
  - Administrator: Full system access
  - Manager: Operations and reporting
  - Cashier: POS and basic operations
  - Inventory: Stock management only
- **Password Security**: bcrypt hashing with strong password policies
- **Session Management**: Track active user sessions
- **Audit Logging**: Comprehensive activity logging for security
- **Account Lockout**: Protection against brute force attacks

### 📈 Reports & Analytics
- Sales reports by date range
- Product performance analysis
- Revenue and profitability tracking
- Customer purchasing patterns
- Exportable report formats

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern UI library with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript for better code quality
- **TailwindCSS**: Utility-first CSS framework for rapid UI development
- **React Router**: Client-side routing
- **Zustand**: Lightweight state management
- **TanStack Query**: Server state management and caching
- **Recharts**: Data visualization and charting
- **Lucide React**: Modern icon library

### Backend (Electron Main Process)
- **Node.js**: JavaScript runtime
- **Electron**: Desktop application framework
- **TypeScript**: Type-safe backend code
- **IPC (Inter-Process Communication)**: Secure communication between main and renderer processes

### Database
- **Microsoft SQL Server**: Relational database management system
- **mssql**: Official SQL Server driver for Node.js
- **msnodesqlv8**: Native Windows authentication support
- **Connection Pooling**: Efficient database connection management
- **Retry Logic**: Automatic retry with exponential backoff for transient failures

### Security & Authentication
- **bcrypt**: Secure password hashing (12 rounds)
- **jsonwebtoken**: JWT token generation and validation
- **Role-Based Access Control**: Granular permission system

### Development Tools
- **Vite**: Fast build tool and dev server
- **ESLint**: Code linting and quality checks
- **Prettier**: Code formatting
- **Vitest**: Fast unit testing framework
- **Husky**: Git hooks for quality assurance
- **Electron Builder**: Application packaging and distribution

## 🏗️ System Architecture

This application follows professional Electron architecture patterns with clear separation of concerns:

```
src/
├── main/                      # Electron Main Process (Backend)
│   ├── app/                   # Core application logic and initialization
│   ├── auth/                  # Authentication services
│   │   ├── auth.service.ts    # Login, logout, session management
│   │   └── jwt.service.ts     # JWT token generation and validation
│   ├── database/              # Database layer
│   │   ├── connection.ts      # Database connection pool
│   │   ├── config/            # Database configuration
│   │   │   ├── validation.ts  # Config validation
│   │   │   ├── retry.ts       # Retry logic with exponential backoff
│   │   │   └── health.ts      # Connection health monitoring
│   │   ├── repositories/      # Data access layer
│   │   │   ├── users.repo.ts      # User CRUD operations
│   │   │   ├── items.repo.ts      # Product/Item operations
│   │   │   ├── customers.repo.ts  # Customer management
│   │   │   └── receipts.repo.ts   # Receipt and transaction management
│   │   └── types/             # Database type definitions
│   ├── ipc/                   # Inter-Process Communication
│   │   └── IpcManager.ts      # IPC handlers for renderer process
│   ├── windows/               # Window management
│   │   └── WindowManager.ts   # Create and manage app windows
│   └── utils/                 # Utilities
│       └── Logger.ts          # Logging service
│
├── renderer/                  # React Frontend (UI)
│   ├── components/            # Reusable UI components
│   │   ├── Layout/            # Layout components (Header, Sidebar, etc.)
│   │   ├── User/              # User-related components
│   │   └── Notifications/     # Notification components
│   ├── pages/                 # Page components
│   │   ├── Dashboard/         # Dashboard page with analytics
│   │   ├── POS/               # Point of Sale interface
│   │   └── Inventory/         # Inventory management pages
│   ├── hooks/                 # Custom React hooks
│   │   ├── useProducts.ts     # Product data fetching
│   │   ├── useReceipts.ts     # Receipt management
│   │   └── useLowStock.ts     # Low stock alerts
│   ├── services/              # API and service layers
│   │   └── apiClient.ts       # IPC communication wrapper
│   ├── stores/                # State management (Zustand)
│   └── styles/                # Global styles
│
├── preload/                   # Preload scripts
│   └── preload.ts             # Secure bridge between main and renderer
│
└── shared/                    # Shared code between processes
    ├── config.ts              # Shared configuration
    └── types/                 # Shared TypeScript types
```

### Architecture Principles

- **Separation of Concerns**: Clear boundaries between main and renderer processes
- **Security**: Context isolation and secure IPC communication
- **Type Safety**: Full TypeScript coverage across the application
- **Error Handling**: Comprehensive error handling and logging
- **Performance**: Connection pooling, lazy loading, and optimized builds
- **Scalability**: Repository pattern for easy database access expansion

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **yarn**
- **Git** for version control
- **SQL Server** (Express edition or higher)
  - SQL Server Management Studio (SSMS) - [Download](https://aka.ms/ssmsfullsetup)
- **Windows** (for Windows development and builds)

### Database Setup

The application requires SQL Server to be installed and configured. Follow these steps:

#### Step 1: Install SQL Server

If you don't have SQL Server installed:
1. Download [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (free)
2. Install with default settings
3. Note your SQL Server instance name (e.g., `SQLEXPRESS`)

#### Step 2: Restore Database

The project includes a database backup file (`rmhSample.bck`). Restore it using one of these methods:

**Option A: Using SQL Server Management Studio (Recommended)**
1. Open SSMS
2. Connect to your SQL Server instance
3. Right-click "Databases" → "Restore Database"
4. Select "Device" and browse to `rmhSample.bck`
5. Click "OK" to restore

**Option B: Using sqlcmd**
```powershell
sqlcmd -S localhost\SQLEXPRESS -E -Q "RESTORE DATABASE rmhsample FROM DISK='<path-to-rmhSample.bck>' WITH REPLACE"
```

#### Step 3: Configure Authentication

The application supports both Windows Authentication and SQL Server Authentication.

**For Windows Authentication (Development - Recommended):**
1. Ensure your Windows user has SQL Server login permissions
2. Run `setup-windows-auth.sql` in SSMS to configure permissions
3. Set in `.env`: `DB_USE_WINDOWS_AUTH=true`

**For SQL Server Authentication (Production):**
1. Run `setup-sql-server.sql` in SSMS to enable mixed mode and create `sa` user
2. Set a strong password for `sa`
3. Update `.env` with SQL Server credentials

For detailed database setup instructions, see [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) and [DATABASE_GUIDE.md](DATABASE_GUIDE.md).

#### Step 4: Configure Database Connection

Create a `.env` file in the project root:

```env
# SQL Server Configuration
DB_SERVER=localhost,53056          # Format: server,port (find port using find-sql-port.ps1)
DB_DATABASE=rmhsample              # Database name

# Authentication (choose one)
DB_USE_WINDOWS_AUTH=true           # For Windows Authentication
# OR
# DB_USER=sa                       # For SQL Authentication
# DB_PASSWORD=YourPasswordHere     # Replace with actual password

# Connection Options
DB_ENCRYPT=false                   # Set true for production
DB_TRUST_CERTIFICATE=true          # Set false for production

# Optional: Connection Pool Settings
DB_POOL_MAX=10                     # Maximum pool size
DB_CONNECT_TIMEOUT=15000          # Connection timeout (ms)
DB_REQUEST_TIMEOUT=30000          # Request timeout (ms)

# JWT Authentication (Required)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-token-secret-different-from-access

# Application
NODE_ENV=development
```

**Important Security Notes:**
- Generate a strong JWT secret: `openssl rand -base64 32`
- Never commit `.env` to version control
- Use strong passwords in production
- Enable encryption (`DB_ENCRYPT=true`) for production deployments

#### Step 5: Verify Database Connection

Test your database connection:

```bash
# Run diagnostic script
npm run diagnose:db

# Test database connection
npm run test:db
```

For troubleshooting database issues, see [SQL_SERVER_TROUBLESHOOTING.md](SQL_SERVER_TROUBLESHOOTING.md).

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Rakshi_Pasal_Management-master
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env` (if available) or create `.env` manually
   - Update database connection settings as described above

4. **Setup database schema** (if needed)
   - Run `database-auth-schema.sql` for authentication tables
   - Run `setup-windows-auth.sql` for Windows Authentication setup

5. **Start development server**
   ```bash
   npm run dev:electron
   ```

The application will launch in development mode with hot-reload enabled.

### Configuration

#### Environment Variables

Key environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DB_SERVER` | SQL Server address (format: `host,port`) | Yes | - |
| `DB_DATABASE` | Database name | Yes | `rmhsample` |
| `DB_USE_WINDOWS_AUTH` | Use Windows Authentication | No | `false` |
| `DB_USER` | SQL Server username | If SQL Auth | - |
| `DB_PASSWORD` | SQL Server password | If SQL Auth | - |
| `JWT_SECRET` | Secret for JWT tokens | Yes | - |
| `NODE_ENV` | Environment mode | No | `development` |

For all configuration options, see [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md).

## 🏗️ Architecture

This application follows professional Electron architecture patterns:

```
src/
├── main/                 # Main process (Electron backend)
│   ├── app/             # Core application logic
│   ├── ipc/             # Inter-process communication
│   ├── windows/         # Window management
│   └── utils/           # Main process utilities
├── renderer/            # Renderer process (React frontend)
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services
│   ├── stores/          # State management
│   └── utils/           # Utility functions
├── preload/             # Preload scripts
├── shared/              # Shared code between processes
└── types/               # TypeScript definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Liquor_Management_System
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev:electron
   ```

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server (frontend only) |
| `npm run dev:electron` | Start Electron application in development mode with hot-reload |
| `npm run build` | Build entire application for production (type-check + lint + build) |
| `npm run build:renderer` | Build React frontend only |
| `npm run build:main` | Build Electron main process only |
| `npm run build:electron` | Build Electron app structure |
| `npm run build:installer` | Build Windows installer (NSIS + Portable) |
| `npm run build:win` | Build Windows executable |
| `npm run build:mac` | Build macOS application (requires Mac) |
| `npm run build:linux` | Build Linux application |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Automatically fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting without fixing |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:db` | Test database connection |
| `npm run diagnose:db` | Run database connection diagnostics |
| `npm run setup:db` | Run database setup helper |
| `npm run type-check` | Run TypeScript type checking |
| `npm run type-check:main` | Type-check main process only |
| `npm run clean` | Clean all build directories |
| `npm run clean:release` | Clean release directory |

## 📁 Project Structure

### Main Directories

- **`src/main/`**: Electron main process (backend logic)
  - Database connections, IPC handlers, authentication
- **`src/renderer/`**: React frontend (UI layer)
  - Pages, components, hooks, state management
- **`src/preload/`**: Preload scripts
  - Secure bridge between main and renderer processes
- **`src/shared/`**: Shared code
  - Types, utilities, and configuration used by both processes

### Key Files

- **`src/main/app/main.ts`**: Electron app entry point
- **`src/main/ipc/IpcManager.ts`**: All IPC communication handlers
- **`src/main/database/connection.ts`**: Database connection management
- **`src/renderer/App.tsx`**: React app root component
- **`package.json`**: Project dependencies and scripts
- **`vite.config.ts`**: Vite build configuration
- **`tsconfig.json`**: TypeScript configuration

For detailed architecture documentation, see [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md).

## 🛠️ Development Guide

### Code Quality Standards

This project maintains high code quality through:

- **ESLint**: TypeScript-aware linting with strict rules
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for quality checks
- **lint-staged**: Run linters only on changed files
- **TypeScript**: Strict type checking enabled

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev:electron
   ```
   This starts both Vite dev server and Electron app with hot-reload.

2. **Make Changes**
   - Frontend changes in `src/renderer/` will hot-reload automatically
   - Main process changes require Electron restart (Ctrl+R or restart app)

3. **Run Quality Checks**
   ```bash
   npm run lint          # Check code quality
   npm run type-check    # Verify TypeScript types
   npm run format:check  # Check formatting
   ```

4. **Fix Issues Automatically**
   ```bash
   npm run lint:fix      # Fix linting issues
   npm run format        # Format code
   ```

### Database Development

- **Test Connection**: `npm run test:db`
- **Diagnose Issues**: `npm run diagnose:db`
- **Setup Helper**: `npm run setup:db`

See [DATABASE_GUIDE.md](DATABASE_GUIDE.md) for detailed database development information.

### Testing

The project uses Vitest for fast, efficient testing:

- **Vitest**: Modern, Vite-native testing framework
- **React Testing Library**: Component testing utilities
- **jsdom**: Browser environment simulation
- **Coverage Reports**: Track code coverage

Run tests:
```bash
npm run test              # Run all tests
npm run test:ui           # Interactive test UI
npm run test:coverage     # Generate coverage report
```

### IPC Communication

Communication between main and renderer processes:

1. **Renderer** calls IPC via `apiClient.ts`
2. **Preload** script exposes safe IPC methods
3. **Main process** handles requests in `IpcManager.ts`
4. **Database** operations execute in main process
5. **Results** returned to renderer through IPC

Example IPC handler registration:
```typescript
// In IpcManager.ts
ipcMain.handle('products:getAll', async () => {
  return await itemsRepository.getAll();
});
```

For authentication IPC handlers, see [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md).

## 📦 Building for Production

### Development Build

For development and testing:
```bash
npm run dev:electron
```

### Production Build Process

The build process includes multiple steps:

1. **Type Checking**: Ensures TypeScript types are correct
2. **Linting**: Validates code quality
3. **Renderer Build**: Compiles React frontend with Vite
4. **Main Build**: Compiles Electron main process
5. **Electron Packaging**: Packages app with Electron Builder

Run full production build:
```bash
npm run build
```

### Platform-Specific Builds

#### Windows Build

Build Windows installer and portable version:
```bash
npm run build:installer
```

This creates:
- **NSIS Installer**: `Liquor Store Management System 1.0.1.exe` (installer)
- **Portable**: `Liquor Store Management System 1.0.1 Portable.exe` (no installation)

Output location: `release/` directory

#### macOS Build

⚠️ **Important**: macOS builds require a Mac computer. For Windows users, use GitHub Actions.

**Local macOS Build:**
```bash
npm run build:mac
```

This creates:
- **DMG**: `Liquor Store Management System 1.0.1.dmg`

**Using GitHub Actions (Recommended for Windows users):**
1. Push code to GitHub
2. Go to Actions tab in your repository
3. Download built DMG files from artifacts
4. No Mac required!

#### Linux Build

```bash
npm run build:linux
```

Creates AppImage format for Linux distribution.

### Automated Builds with GitHub Actions

This project includes CI/CD workflows for automated builds:

- **Triggers**: Runs on every push to `main`/`master` branch
- **Multi-platform**: Builds Windows and macOS simultaneously
- **Artifacts**: Built applications available for download
- **Releases**: Tag commits with `v*` (e.g., `v1.0.1`) to create GitHub Releases

**Workflow File**: `.github/workflows/build-release.yml`

For detailed build instructions, see [BUILD.md](BUILD.md) and [GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md).

## 🧪 Testing

### Running Tests

**All Tests:**
```bash
npm run test
```

**Interactive UI:**
```bash
npm run test:ui
```
Opens Vitest UI in browser for debugging and test exploration.

**With Coverage:**
```bash
npm run test:coverage
```
Generates coverage reports showing code coverage percentages.

### Database Testing

**Test Database Connection:**
```bash
npm run test:db
```

**Diagnose Connection Issues:**
```bash
npm run diagnose:db
```
Helps troubleshoot database connection problems.

### Writing Tests

Tests are located alongside source files or in `src/test/`:

```typescript
// Example test
import { describe, it, expect } from 'vitest';
import { calculateTotal } from './utils';

describe('calculateTotal', () => {
  it('should sum all items', () => {
    expect(calculateTotal([10, 20, 30])).toBe(60);
  });
});
```

For component testing, use React Testing Library:
```typescript
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';

test('renders dashboard title', () => {
  render(<Dashboard />);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});
```

## 📚 Documentation

This project includes comprehensive documentation:

- **[SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)**: Step-by-step setup guide
- **[DATABASE_GUIDE.md](DATABASE_GUIDE.md)**: Database setup and usage
- **[DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)**: Database architecture details
- **[AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md)**: Authentication system documentation
- **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)**: System architecture overview
- **[BUILD.md](BUILD.md)**: Building and distribution guide
- **[SQL_SERVER_TROUBLESHOOTING.md](SQL_SERVER_TROUBLESHOOTING.md)**: Database troubleshooting
- **[GITHUB_ACTIONS_GUIDE.md](GITHUB_ACTIONS_GUIDE.md)**: CI/CD setup guide
- **[FRONTEND_DATABASE_SYNC_GUIDE.md](FRONTEND_DATABASE_SYNC_GUIDE.md)**: Frontend-database integration

For field mapping and database schema details:
- **[FIELD_MAPPING_REFERENCE.md](FIELD_MAPPING_REFERENCE.md)**: Database field mappings
- **[complete_tables_list.txt](complete_tables_list.txt)**: Complete database schema

## 🐛 Troubleshooting

### Common Issues

**Database Connection Fails:**
1. Verify SQL Server is running: `Get-Service "SQL Server (SQLEXPRESS)"`
2. Check port number: Run `find-sql-port.ps1` or check SQL Configuration Manager
3. Verify `.env` configuration matches your SQL Server setup
4. Test connection in SSMS first
5. See [SQL_SERVER_TROUBLESHOOTING.md](SQL_SERVER_TROUBLESHOOTING.md) for detailed help

**Build Fails:**
1. Ensure all dependencies installed: `npm install`
2. Run type checking: `npm run type-check`
3. Check for linting errors: `npm run lint`
4. Clean build directories: `npm run clean` then rebuild

**Authentication Issues:**
1. Verify database schema is created (run `database-auth-schema.sql`)
2. Check JWT_SECRET is set in `.env`
3. Ensure user exists in database
4. See [AUTHENTICATION_SYSTEM.md](AUTHENTICATION_SYSTEM.md) for details

**Electron App Won't Start:**
1. Check Node.js version (requires 18+): `node --version`
2. Verify database connection (app may fail silently if DB unavailable)
3. Check console for error messages
4. Review logs in application directory

### Getting Help

- Check documentation files listed above
- Search existing GitHub issues
- Create a new issue with:
  - Error messages and logs
  - Steps to reproduce
  - Environment details (OS, Node version, SQL Server version)

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Write clean, well-documented code
   - Follow existing code style
   - Add tests for new features
   - Update documentation as needed

4. **Run quality checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
   Follow conventional commit messages when possible.

6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Provide clear description of changes
   - Reference any related issues
   - Ensure all checks pass

### Code Style Guidelines

- **TypeScript**: Use TypeScript for all new code
- **Naming**: Use descriptive names, follow camelCase conventions
- **Comments**: Document complex logic and business rules
- **Formatting**: Run `npm run format` before committing
- **Testing**: Write tests for new features and bug fixes
- **Error Handling**: Implement proper error handling and logging

## 🔒 Security


### Security Features

- **Password Hashing**: bcrypt with 12 rounds for secure password storage
- **JWT Authentication**: Token-based authentication with configurable expiration
- **Role-Based Access Control**: Granular permissions per user role
- **Account Lockout**: Protection against brute force attacks
- **Audit Logging**: Comprehensive logging of security events
- **Secure IPC**: Context isolation and secure inter-process communication
- **SQL Injection Protection**: Parameterized queries throughout

### Security Best Practices

- **Never commit `.env` file**: Contains sensitive credentials
- **Use strong JWT secrets**: Generate with `openssl rand -base64 32`
- **Enable encryption in production**: Set `DB_ENCRYPT=true` for production
- **Regular updates**: Keep dependencies updated for security patches
- **Strong passwords**: Enforce password policies for all users

### Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of using the public issue tracker.

## 🗺️ Roadmap

### Completed ✅
- [x] Database integration with SQL Server
- [x] User authentication system
- [x] JWT-based authentication
- [x] Role-based access control
- [x] Point of Sale system
- [x] Inventory management
- [x] Dashboard with analytics
- [x] Receipt management

### In Progress 🚧
- [ ] Advanced reporting features
- [ ] Enhanced analytics dashboard
- [ ] Barcode scanner hardware integration

### Planned 📋
- [ ] Backup and restore functionality
- [ ] Multi-store support
- [ ] Mobile companion app
- [ ] Cloud synchronization
- [ ] Offline mode support
- [ ] Advanced inventory forecasting
- [ ] Customer loyalty program
- [ ] Email notifications
- [ ] API for third-party integrations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://react.dev/) and [TailwindCSS](https://tailwindcss.com/)
- Database: [Microsoft SQL Server](https://www.microsoft.com/sql-server)
- Icons: [Lucide React](https://lucide.dev/)

## 📞 Support

For support and questions:

- **Documentation**: Check the documentation files in the repository
- **Issues**: Create an issue on GitHub for bugs or feature requests
- **Email**: support@example.com (replace with your support email)

---

**Built with ❤️ using Electron, React, and TypeScript**

*Rakshi Pasal Management System - Professional Liquor Store Management Solution*
