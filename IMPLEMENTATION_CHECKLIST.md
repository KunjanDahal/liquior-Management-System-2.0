# Implementation Checklist

## 📋 Complete Step-by-Step Checklist

Use this checklist to track your progress syncing the frontend with the database.

---

## Phase 1: Database Setup ⏱️ ~2 hours

### Step 1.1: Install SQL Server
- [ ] Download SQL Server 2016+ or SQL Server Express (free)
- [ ] Install SQL Server on your machine
- [ ] Note the server instance name (e.g., `localhost\SQLEXPRESS`)
- [ ] Download and install SQL Server Management Studio (SSMS)

### Step 1.2: Restore Database
- [ ] Open SQL Server Management Studio
- [ ] Connect to your SQL Server instance
- [ ] Right-click **Databases** → **Restore Database**
- [ ] Select **Device** as source
- [ ] Click **Browse** and select `rmhSample.bck`
- [ ] Set database name to `rmhsample`
- [ ] Click **OK** to restore
- [ ] Verify: Expand **Databases** → `rmhsample` → **Tables**

**Alternative (Command Line):**
```powershell
sqlcmd -S localhost\SQLEXPRESS -E -Q "RESTORE DATABASE rmhsample FROM DISK='C:\path\to\rmhSample.bck' WITH REPLACE"
```

### Step 1.3: Explore Database
- [ ] Open `database_explore.sql` in SSMS
- [ ] Run: `SELECT * FROM INFORMATION_SCHEMA.TABLES`
- [ ] Run: `SELECT TOP 10 * FROM Item`
- [ ] Run: `SELECT TOP 10 * FROM Customer`
- [ ] Run: `SELECT TOP 10 * FROM Receipt`
- [ ] Note: Check if data exists and looks correct

### Step 1.4: Extend Database Schema
- [ ] Run the following SQL commands:

```sql
USE rmhsample;
GO

-- Add missing columns to Item table
ALTER TABLE Item ADD ImagePath NVARCHAR(500) NULL;
ALTER TABLE Item ADD Description NVARCHAR(MAX) NULL;
ALTER TABLE Item ADD RequiresAgeVerification BIT DEFAULT 0;

-- Add missing column to Customer table
ALTER TABLE Customer ADD IsAgeVerified BIT DEFAULT 0;

-- Add missing columns for timestamps
ALTER TABLE Supplier ADD LastUpdated DATETIME DEFAULT GETDATE();
ALTER TABLE Receipt ADD LastUpdated DATETIME DEFAULT GETDATE();

-- Verify columns were added
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Item';
```

### Step 1.5: Create Database Views
- [ ] Create `vw_Products` view (see FRONTEND_DATABASE_SYNC_GUIDE.md)
- [ ] Create `vw_Transactions` view
- [ ] Create `vw_Customers` view
- [ ] Create `vw_Suppliers` view
- [ ] Test views: `SELECT TOP 5 * FROM vw_Products`

**Quick View Creation:**
```sql
CREATE VIEW vw_Products AS
SELECT 
    CAST(i.ItemID AS VARCHAR(50)) AS id,
    i.ItemDescription AS name,
    i.ItemLookupCode AS sku,
    i.ItemLookupCode AS barcode,
    ISNULL(ic.ClassName, 'Uncategorized') AS category,
    i.Price AS price,
    i.Cost AS cost,
    i.Quantity AS stock,
    ISNULL(i.ItemMinimum, i.ReorderPoint) AS minStock,
    ISNULL(i.ItemMaximum, 100) AS maxStock,
    s.SupplierName AS supplier,
    i.ImagePath AS image,
    i.Description AS description,
    ISNULL(i.RequiresAgeVerification, 0) AS requiresAgeVerification,
    i.DateCreated AS createdAt,
    i.LastUpdated AS updatedAt
FROM Item i
LEFT JOIN Supplier s ON i.SupplierID = s.SupplierID
LEFT JOIN ItemClass ic ON i.ItemType = ic.ItemClassID;
```

---

## Phase 2: Backend API Setup ⏱️ ~4-6 hours

### Step 2.1: Create Backend Project Structure
- [ ] Create `backend` folder in project root
- [ ] Navigate to backend folder: `cd backend`
- [ ] Initialize npm: `npm init -y`
- [ ] Install dependencies:

```bash
npm install express mssql cors dotenv
npm install -D typescript @types/express @types/node @types/mssql @types/cors ts-node nodemon
```

- [ ] Initialize TypeScript: `npx tsc --init`
- [ ] Create folder structure:

```
backend/
├── src/
│   ├── db/
│   ├── services/
│   ├── routes/
│   ├── utils/
│   └── server.ts
├── .env
├── package.json
└── tsconfig.json
```

### Step 2.2: Configure TypeScript
- [ ] Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Step 2.3: Configure Package.json Scripts
- [ ] Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### Step 2.4: Create Environment File
- [ ] Create `.env` file:

```env
PORT=5000
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=rmhsample
DB_USER=sa
DB_PASSWORD=your_password_here
NODE_ENV=development
```

- [ ] Add `.env` to `.gitignore`

### Step 2.5: Create Database Connection
- [ ] Create `src/db/connection.ts`:

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
    encrypt: false,
    trustServerCertificate: true,
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
    console.log('✅ Connected to SQL Server');
  }
  return pool;
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('❌ SQL Server connection closed');
  }
}
```

- [ ] Test connection by running: `ts-node src/db/connection.ts`

### Step 2.6: Create Product Service
- [ ] Create `src/services/productService.ts`
- [ ] Implement `getAllProducts()`
- [ ] Implement `getProductById(id)`
- [ ] Implement `createProduct(product)`
- [ ] Implement `updateProduct(id, product)`
- [ ] Implement `deleteProduct(id)`
- [ ] Add data transformation logic

### Step 2.7: Create Product Routes
- [ ] Create `src/routes/products.ts`
- [ ] Add GET `/api/products` route
- [ ] Add GET `/api/products/:id` route
- [ ] Add POST `/api/products` route
- [ ] Add PUT `/api/products/:id` route
- [ ] Add DELETE `/api/products/:id` route
- [ ] Add error handling

### Step 2.8: Create Main Server
- [ ] Create `src/server.ts`:

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/products', productRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});
```

### Step 2.9: Test Backend API
- [ ] Start server: `npm run dev`
- [ ] Test health endpoint: `http://localhost:5000/health`
- [ ] Test products endpoint: `http://localhost:5000/api/products`
- [ ] Use Postman or Thunder Client to test
- [ ] Verify JSON response format matches frontend expectations

---

## Phase 3: Frontend Integration ⏱️ ~4-6 hours

### Step 3.1: Update API Configuration
- [ ] Verify `src/shared/config.ts` has correct API URL
- [ ] Ensure `apiUrl: 'http://localhost:5000/api'`

### Step 3.2: Create API Hooks
- [ ] Create `src/renderer/hooks/useProducts.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { Product } from '../../shared/types';

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await apiClient.get<Product[]>('/products');
      return response.data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await apiClient.get<Product>(`/products/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}
```

- [ ] Create similar hooks for transactions, customers, suppliers

### Step 3.3: Update Product Catalog Page
- [ ] Open `src/renderer/pages/Inventory/ProductCatalog.tsx`
- [ ] Import `useProducts` hook
- [ ] Replace mock data with `const { data: products, isLoading, error } = useProducts()`
- [ ] Add loading state: `if (isLoading) return <LoadingSpinner />`
- [ ] Add error state: `if (error) return <ErrorMessage />`
- [ ] Test page loads with real data

### Step 3.4: Update Dashboard Page
- [ ] Open `src/renderer/pages/Dashboard/Dashboard.tsx`
- [ ] Create hooks for dashboard stats
- [ ] Replace hardcoded values with real data
- [ ] Update KPI cards with real numbers
- [ ] Test dashboard displays correctly

### Step 3.5: Update POS Page
- [ ] Open `src/renderer/pages/POS/PointOfSale.tsx`
- [ ] Update product search to use real data
- [ ] Update cart functionality
- [ ] Test adding products to cart
- [ ] Test checkout flow

### Step 3.6: Create Loading Components
- [ ] Create `src/renderer/components/LoadingSpinner.tsx`
- [ ] Create `src/renderer/components/ErrorMessage.tsx`
- [ ] Use throughout application

### Step 3.7: Add Error Handling
- [ ] Add try-catch blocks in API calls
- [ ] Display user-friendly error messages
- [ ] Add retry logic for failed requests
- [ ] Log errors to console

---

## Phase 4: Additional Features ⏱️ ~4-8 hours

### Step 4.1: Implement Transactions/Receipts
- [ ] Create transaction service in backend
- [ ] Create transaction routes
- [ ] Create `useTransactions` hook
- [ ] Update RecentTransactions component
- [ ] Test transaction creation (checkout)

### Step 4.2: Implement Customers
- [ ] Create customer service in backend
- [ ] Create customer routes
- [ ] Create `useCustomers` hook
- [ ] Update Customer components
- [ ] Test customer CRUD operations

### Step 4.3: Implement Suppliers
- [ ] Create supplier service in backend
- [ ] Create supplier routes
- [ ] Create `useSuppliers` hook
- [ ] Update Suppliers page
- [ ] Test supplier management

### Step 4.4: Implement Low Stock Alerts
- [ ] Create low stock endpoint in backend
- [ ] Query products where `stock <= minStock`
- [ ] Update LowStockAlerts component
- [ ] Test alerts display correctly

### Step 4.5: Implement Search & Filters
- [ ] Add search parameter to products endpoint
- [ ] Add category filter
- [ ] Add status filter
- [ ] Update frontend to use filters
- [ ] Test search and filtering

### Step 4.6: Implement Dashboard Statistics
- [ ] Create stats endpoint in backend
- [ ] Calculate today's sales
- [ ] Calculate inventory value
- [ ] Calculate transaction count
- [ ] Update dashboard with real stats

---

## Phase 5: Testing & Polish ⏱️ ~2-4 hours

### Step 5.1: End-to-End Testing
- [ ] Test complete product lifecycle (create, read, update, delete)
- [ ] Test complete transaction flow (add to cart, checkout)
- [ ] Test customer management
- [ ] Test supplier management
- [ ] Test search and filters
- [ ] Test dashboard statistics

### Step 5.2: Error Scenarios
- [ ] Test with database disconnected
- [ ] Test with invalid data
- [ ] Test with network errors
- [ ] Test with empty results
- [ ] Verify error messages are user-friendly

### Step 5.3: Performance Testing
- [ ] Test with large datasets (1000+ products)
- [ ] Check API response times
- [ ] Check page load times
- [ ] Optimize slow queries
- [ ] Add pagination if needed

### Step 5.4: UI/UX Polish
- [ ] Ensure loading states are smooth
- [ ] Ensure error messages are clear
- [ ] Ensure success messages appear
- [ ] Test on different screen sizes
- [ ] Fix any visual bugs

### Step 5.5: Code Quality
- [ ] Run linter: `npm run lint`
- [ ] Fix linting errors
- [ ] Run type check: `npm run type-check`
- [ ] Fix type errors
- [ ] Add comments to complex code

---

## Phase 6: Documentation & Deployment ⏱️ ~2 hours

### Step 6.1: Update Documentation
- [ ] Update README.md with setup instructions
- [ ] Document API endpoints
- [ ] Document environment variables
- [ ] Add troubleshooting section

### Step 6.2: Create Setup Scripts
- [ ] Create database setup script
- [ ] Create backend setup script
- [ ] Create frontend setup script
- [ ] Test on fresh machine

### Step 6.3: Prepare for Production
- [ ] Set up production database
- [ ] Configure production environment variables
- [ ] Build frontend: `npm run build`
- [ ] Build backend: `npm run build`
- [ ] Test production build

### Step 6.4: Create Backup Strategy
- [ ] Set up automated database backups
- [ ] Document backup restore process
- [ ] Test backup and restore

---

## 🎯 Verification Checklist

After completing all phases, verify:

### Database
- [ ] ✅ Database is restored and accessible
- [ ] ✅ All required columns exist
- [ ] ✅ Views are created and working
- [ ] ✅ Sample data is present

### Backend API
- [ ] ✅ Server starts without errors
- [ ] ✅ All endpoints return correct data
- [ ] ✅ Data transformation works correctly
- [ ] ✅ Error handling works
- [ ] ✅ CORS is configured

### Frontend
- [ ] ✅ All pages load without errors
- [ ] ✅ Real data displays correctly
- [ ] ✅ Loading states work
- [ ] ✅ Error states work
- [ ] ✅ CRUD operations work

### Integration
- [ ] ✅ Frontend connects to backend
- [ ] ✅ Backend connects to database
- [ ] ✅ Data flows end-to-end
- [ ] ✅ No console errors
- [ ] ✅ Performance is acceptable

---

## 📊 Progress Tracking

Track your overall progress:

```
Phase 1: Database Setup          [ ] 0% [ ] 25% [ ] 50% [ ] 75% [✅] 100%
Phase 2: Backend API Setup       [ ] 0% [ ] 25% [ ] 50% [ ] 75% [✅] 100%
Phase 3: Frontend Integration    [ ] 0% [ ] 25% [ ] 50% [ ] 75% [✅] 100%
Phase 4: Additional Features     [ ] 0% [ ] 25% [ ] 50% [ ] 75% [✅] 100%
Phase 5: Testing & Polish        [ ] 0% [ ] 25% [ ] 50% [ ] 75% [✅] 100%
Phase 6: Documentation           [ ] 0% [ ] 25% [ ] 50% [ ] 75% [✅] 100%

Overall Progress: ____%
```

---

## 🆘 Troubleshooting

### Issue: Can't connect to database
**Solutions:**
- [ ] Verify SQL Server is running
- [ ] Check server name in `.env`
- [ ] Check username/password
- [ ] Try Windows Authentication (remove user/pass)
- [ ] Check firewall settings

### Issue: API returns 500 error
**Solutions:**
- [ ] Check backend console for errors
- [ ] Verify database connection
- [ ] Check SQL query syntax
- [ ] Verify data transformation logic
- [ ] Check for null values

### Issue: Frontend shows no data
**Solutions:**
- [ ] Check browser console for errors
- [ ] Verify API URL in config
- [ ] Check CORS settings
- [ ] Verify API is running
- [ ] Check network tab in DevTools

### Issue: Type errors in TypeScript
**Solutions:**
- [ ] Verify types match between frontend and backend
- [ ] Check for null/undefined values
- [ ] Add proper type guards
- [ ] Use optional chaining (`?.`)

---

## 🎓 Learning Resources

- [ ] Read DATABASE_GUIDE.md
- [ ] Read FRONTEND_DATABASE_SYNC_GUIDE.md
- [ ] Read FIELD_MAPPING_REFERENCE.md
- [ ] Read ARCHITECTURE_DIAGRAM.md
- [ ] Review database_explore.sql

---

## ✅ Final Checklist

Before considering the project complete:

- [ ] All pages display real data
- [ ] All CRUD operations work
- [ ] Error handling is implemented
- [ ] Loading states are implemented
- [ ] Code is linted and type-checked
- [ ] Documentation is updated
- [ ] Backup strategy is in place
- [ ] Performance is acceptable
- [ ] Security is considered
- [ ] Ready for production

---

**Estimated Total Time**: 18-28 hours (1-2 weeks part-time)

**Start Date**: _______________
**Target Completion**: _______________
**Actual Completion**: _______________

---

Good luck with your implementation! 🚀

