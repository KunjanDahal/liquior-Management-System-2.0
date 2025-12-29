# Database Backup Guide: rmhSample.bck

## 📋 Facts About the Database Backup

### File Information
- **File Name**: `rmhSample.bck`
- **File Size**: ~16.1 MB (16,881,152 bytes)
- **Database Name**: `rmhsample`
- **Backup Type**: Full Database Backup
- **Database System**: Microsoft SQL Server 2016 (MSSQL13.SQL2016)
- **Format**: SQL Server native backup format (binary)

### Database Details
- **Original Server Instance**: `ADITI\SQL2016`
- **Original Data File Path**: `C:\Program Files\Microsoft SQL Server\MSSQL13.SQL2016\MSSQL\DATA\rmhsample.mdf`
- **Original Log File Path**: `C:\Program Files\Microsoft SQL Server\MSSQL13.SQL2016\MSSQL\DATA\rmhsample.ldf`
- **Backup Created For**: Retail/shop management system (likely "Rakshi Pasal Management" or similar)

### Database Schema Overview

This is a comprehensive retail/point-of-sale database with the following main entities:

#### Core Business Objects
- **Items/Products**: Product catalog, inventory management
- **Orders**: Purchase orders, order entries
- **Receipts**: Sales receipts, receipt entries
- **Customers**: Customer management with loyalty programs
- **Suppliers**: Supplier/vendor management
- **Tax**: Tax configuration and calculations
- **Batches**: Transaction batching for POS operations
- **Stores**: Multi-store support

#### Key Tables Identified
- `Item` / `Items` - Product catalog
- `Order` / `OrderEntry` - Purchase orders and order entries
- `Receipt` / `ReceiptEntry` - Sales receipts and transactions
- `Customer` - Customer information
- `Supplier` - Supplier/vendor information
- `Tax` / `TaxEntry` - Tax rates and calculations
- `Batch` - Transaction batches
- `Store` - Store locations
- `ItemTax` - Product tax associations
- `OrderHistory` - Historical order data
- `CustomerLoyalty` - Customer loyalty tracking
- `ItemMessage` - Product messages/notes
- `LowStock` / `ReorderPoint` - Inventory alerts

#### Business Features
- Multi-store support (Store management)
- Customer loyalty programs
- Tax bracket system with multiple tax rates
- Purchase order management (POD, POA, POC, POE prefixes)
- Item classes and matrix attributes
- Barcode/Lookup code support
- Inventory tracking with reorder points
- Receipt templates for different transaction types

---

## 🔧 How to Restore the Database

### Prerequisites
1. **SQL Server 2016 or later** installed on your system
   - SQL Server Express (free) works fine for development
   - Download: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
2. **SQL Server Management Studio (SSMS)** (optional but recommended)
   - Download: https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms

### Method 1: Using SQL Server Management Studio (GUI)

1. **Open SQL Server Management Studio**
   - Connect to your SQL Server instance
   - Default: `localhost` or `.\SQLEXPRESS` for Express

2. **Restore Database**
   - Right-click on **Databases** → **Restore Database...**
   - Select **Device** as source
   - Click **Browse...** and add `rmhSample.bck`
   - Choose destination: `rmhsample` (or rename if needed)
   - Review file paths (adjust if necessary)
   - Click **OK** to restore

3. **Verify Restoration**
   - Expand **Databases** → `rmhsample` → **Tables**
   - You should see all the tables listed

### Method 2: Using SQL Server Command Line (T-SQL)

```sql
-- Connect to SQL Server instance
USE master;
GO

-- Restore the database
RESTORE DATABASE rmhsample
FROM DISK = 'C:\Users\krist\OneDrive\Desktop\Rakshi_Pasal_Management-master\rmhSample.bck'
WITH 
    MOVE 'QSDB_Data' TO 'C:\Program Files\Microsoft SQL Server\MSSQL13.SQL2016\MSSQL\DATA\rmhsample.mdf',
    MOVE 'QSDB_Log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL13.SQL2016\MSSQL\DATA\rmhsample.ldf',
    REPLACE;  -- Use REPLACE if database already exists
GO

-- Verify
SELECT name FROM sys.databases WHERE name = 'rmhsample';
GO
```

**Note**: Adjust the file paths based on your SQL Server installation location.

### Method 3: Using sqlcmd (Command Line)

```powershell
# For SQL Server Express (default instance)
sqlcmd -S localhost\SQLEXPRESS -E -Q "RESTORE DATABASE rmhsample FROM DISK='C:\Users\krist\OneDrive\Desktop\Rakshi_Pasal_Management-master\rmhSample.bck' WITH REPLACE"

# Or for default SQL Server instance
sqlcmd -S localhost -E -Q "RESTORE DATABASE rmhsample FROM DISK='C:\Users\krist\OneDrive\Desktop\Rakshi_Pasal_Management-master\rmhSample.bck' WITH REPLACE"
```

---

## 🔌 How to Use the Database with Your Application

Your current application (`Rakshi_Pasal_Management`) is built with:
- **Frontend**: Electron + React + TypeScript
- **API Layer**: Currently configured to use HTTP REST API (see `src/renderer/services/apiClient.ts`)
- **Database**: Not yet integrated (marked as TODO in roadmap)

### Option 1: Connect Directly from Electron (Not Recommended)

**Pros**: Simple, no backend needed
**Cons**: Security risk, difficult to manage, no API abstraction

```typescript
// Example using mssql package (NOT RECOMMENDED for production)
import sql from 'mssql';

const config = {
  server: 'localhost',
  database: 'rmhsample',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'yourpassword'
    }
  }
};
```

**⚠️ Security Warning**: Direct database connections from client apps expose credentials and create security vulnerabilities.

### Option 2: Build a Backend API (Recommended)

This is the recommended approach for production applications.

#### Step 1: Create a Node.js/Express Backend

Create a new directory for your backend:

```bash
mkdir backend
cd backend
npm init -y
npm install express mssql cors dotenv
npm install -D @types/express @types/node typescript ts-node nodemon
```

#### Step 2: Create Database Connection Module

**backend/src/db/connection.ts**:
```typescript
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'rmhsample',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || ''
    }
  },
  options: {
    encrypt: false, // Use true for Azure
    trustServerCertificate: true, // Use for local dev
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('Connected to SQL Server');
  }
  return pool;
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('SQL Server connection closed');
  }
}
```

#### Step 3: Create API Routes

**backend/src/routes/products.ts**:
```typescript
import express from 'express';
import { getConnection } from '../db/connection';
import sql from 'mssql';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM Item');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Item WHERE ItemID = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

export default router;
```

#### Step 4: Create Main Server File

**backend/src/server.ts**:
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productRoutes from './routes/products';
import { closeConnection } from './db/connection';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/products', productRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});
```

#### Step 5: Create Environment File

**backend/.env**:
```env
PORT=5000
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=rmhsample
DB_USER=sa
DB_PASSWORD=your_password_here
NODE_ENV=development
```

#### Step 6: Update Frontend API Client

Your existing `apiClient.ts` is already set up correctly. Just ensure the API URL is configured:

**src/shared/config.ts** (already exists):
```typescript
apiUrl: process.env.VITE_API_URL || 'http://localhost:5000/api'
```

#### Step 7: Update Package.json Scripts

**backend/package.json**:
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### Option 3: Use an ORM (Sequelize/TypeORM)

For better type safety and easier database management, consider using an ORM:

```bash
npm install sequelize
npm install -D @types/sequelize
npm install tedious  # SQL Server driver for Sequelize
```

**Example with Sequelize**:
```typescript
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('rmhsample', 'sa', 'password', {
  host: 'localhost',
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  }
});

// Define models
const Item = sequelize.define('Item', {
  ItemID: { type: DataTypes.INTEGER, primaryKey: true },
  ItemLookupCode: DataTypes.STRING,
  // ... other fields
});
```

---

## 🔍 Exploring the Database

### Useful SQL Queries to Explore the Database

```sql
-- Get all tables
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Get table structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Item'
ORDER BY ORDINAL_POSITION;

-- Get row counts for all tables
SELECT 
    t.name AS TableName,
    p.rows AS RowCount
FROM sys.tables t
INNER JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id IN (0, 1)
ORDER BY p.rows DESC;

-- Sample data from key tables
SELECT TOP 10 * FROM Item;
SELECT TOP 10 * FROM Customer;
SELECT TOP 10 * FROM Receipt;
SELECT TOP 10 * FROM [Order];
```

---

## 🚀 Next Steps

1. **Restore the database** using one of the methods above
2. **Explore the schema** using the SQL queries provided
3. **Choose integration approach**:
   - Option 2 (Backend API) is recommended for production
   - Option 3 (ORM) is best for larger applications with complex queries
4. **Create API endpoints** for your application's needs:
   - Products/Inventory management
   - Point of Sale (Receipts)
   - Customer management
   - Reports and analytics
5. **Update frontend** to use the new API endpoints
6. **Test thoroughly** before deploying

---

## 📚 Additional Resources

- [SQL Server Documentation](https://docs.microsoft.com/en-us/sql/sql-server/)
- [Node.js mssql Package](https://github.com/tediousjs/node-mssql)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Sequelize Documentation](https://sequelize.org/docs/v6/)

---

## ⚠️ Important Notes

1. **Security**: Never commit database credentials to version control. Use environment variables.
2. **Backup**: Always backup your database before making changes.
3. **Connection Pooling**: Use connection pooling for better performance.
4. **Error Handling**: Implement proper error handling and logging.
5. **Testing**: Test database connections and queries thoroughly before integrating with frontend.
6. **Performance**: Use indexes and optimize queries for better performance.

---

**Last Updated**: 2024
**Database Backup File**: `rmhSample.bck`
**Application**: Rakshi Pasal Management System

