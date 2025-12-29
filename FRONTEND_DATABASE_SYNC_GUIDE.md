# Frontend-Database Synchronization Guide

## 📊 Executive Summary

Your frontend was built months ago with **mock data structures**, while the database backup (`rmhSample.bck`) contains a **real retail POS system** with different table structures and naming conventions. This guide explains the gaps, mapping strategy, and implementation plan to sync them.

---

## 🔍 Current State Analysis

### Frontend Data Structures (What You Built)

Your React/TypeScript frontend expects:

```typescript
// Product Interface (Frontend)
interface Product {
  id: string;              // UUID or string ID
  name: string;            // Product name
  sku: string;             // Stock Keeping Unit
  barcode?: string;        // Barcode number
  category: string;        // Product category
  price: number;           // Selling price
  cost: number;            // Cost price
  stock: number;           // Current quantity
  minStock: number;        // Minimum stock threshold
  maxStock: number;        // Maximum stock threshold
  supplier: string;        // Supplier name (string)
  image?: string;          // Image URL
  description?: string;    // Product description
  requiresAgeVerification: boolean;  // Age verification flag
  createdAt: Date;
  updatedAt: Date;
}

// Transaction Interface (Frontend)
interface Transaction {
  id: string;
  customerName: string;
  customerId?: string;
  items: TransactionItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'check';
  status: 'completed' | 'pending' | 'refunded' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// Customer Interface (Frontend)
interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: Address;
  isAgeVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Supplier Interface (Frontend)
interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: Address;
  paymentTerms: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Tables (What You Have)

The SQL Server backup contains these main tables:

```sql
-- Item Table (Database)
Item
  - ItemID (int, primary key)
  - ItemLookupCode (varchar) -- Similar to SKU
  - ItemDescription (varchar) -- Product name
  - Price (decimal)
  - Quantity (int) -- Current stock
  - ItemType (int) -- Product type/category
  - Cost (decimal)
  - ReorderPoint (int) -- Similar to minStock
  - SupplierID (int) -- Foreign key to Supplier
  - Taxable (bit)
  - ItemMaximum (int) -- Similar to maxStock
  - ItemMinimum (int) -- Similar to minStock
  - DateCreated (datetime)
  - LastUpdated (datetime)

-- Receipt Table (Database) - Similar to Transaction
Receipt
  - ReceiptID (int, primary key)
  - TransactionDate (datetime)
  - Total (decimal)
  - Subtotal (decimal)
  - Tax (decimal)
  - CustomerID (int, foreign key)
  - StoreID (int, foreign key)
  - BatchNumber (int)
  - Status (int) -- Status code

-- ReceiptEntry Table (Database) - Similar to TransactionItem
ReceiptEntry
  - ReceiptEntryID (int, primary key)
  - ReceiptID (int, foreign key)
  - ItemID (int, foreign key)
  - Quantity (decimal)
  - Price (decimal)
  - Total (decimal)

-- Customer Table (Database)
Customer
  - CustomerID (int, primary key)
  - FirstName (varchar)
  - LastName (varchar)
  - PhoneNumber (varchar)
  - EmailAddress (varchar)
  - DateOfBirth (datetime)
  - Address (varchar)
  - City (varchar)
  - State (varchar)
  - ZipCode (varchar)
  - DateCreated (datetime)
  - LastUpdated (datetime)

-- Supplier Table (Database)
Supplier
  - SupplierID (int, primary key)
  - SupplierName (varchar)
  - ContactName (varchar)
  - PhoneNumber (varchar)
  - EmailAddress (varchar)
  - Address (varchar)
  - City (varchar)
  - State (varchar)
  - ZipCode (varchar)
  - PaymentTerms (varchar)
  - Active (bit)
  - DateCreated (datetime)

-- Order Table (Database) - Purchase Orders
[Order]
  - OrderID (int, primary key)
  - OrderDate (datetime)
  - SupplierID (int, foreign key)
  - Total (decimal)
  - Status (int)
  - StoreID (int, foreign key)

-- OrderEntry Table (Database)
OrderEntry
  - OrderEntryID (int, primary key)
  - OrderID (int, foreign key)
  - ItemID (int, foreign key)
  - Quantity (decimal)
  - Price (decimal)
  - Cost (decimal)

-- Tax Table (Database)
Tax
  - TaxID (int, primary key)
  - TaxName (varchar)
  - TaxRate (decimal)
  - Active (bit)

-- Store Table (Database) - Multi-store support
Store
  - StoreID (int, primary key)
  - StoreName (varchar)
  - StoreCode (varchar)
  - Address (varchar)
  - PhoneNumber (varchar)
```

---

## 🔄 Field Mapping: Frontend ↔ Database

### 1. Product Mapping

| Frontend Field | Database Field | Transformation Required | Notes |
|----------------|----------------|-------------------------|-------|
| `id` (string) | `ItemID` (int) | Convert int to string | Frontend uses string IDs |
| `name` | `ItemDescription` | Direct mapping | ✅ |
| `sku` | `ItemLookupCode` | Direct mapping | ✅ |
| `barcode` | `ItemLookupCode` or separate field | May need custom field | Database might use same field |
| `category` | `ItemType` (int) or `ItemClass` | Lookup table needed | Database uses numeric codes |
| `price` | `Price` | Direct mapping | ✅ |
| `cost` | `Cost` | Direct mapping | ✅ |
| `stock` | `Quantity` | Direct mapping | ✅ |
| `minStock` | `ItemMinimum` or `ReorderPoint` | Direct mapping | ✅ |
| `maxStock` | `ItemMaximum` | Direct mapping | ✅ |
| `supplier` (string) | `SupplierID` (int) | JOIN with Supplier table | Need to fetch supplier name |
| `image` | Not in database | Store separately | Add new field or use file system |
| `description` | Not in database | Add new field | Extend database schema |
| `requiresAgeVerification` | `Taxable` or custom field | Add new field | Extend database schema |
| `createdAt` | `DateCreated` | Direct mapping | ✅ |
| `updatedAt` | `LastUpdated` | Direct mapping | ✅ |

### 2. Transaction (Receipt) Mapping

| Frontend Field | Database Field | Transformation Required | Notes |
|----------------|----------------|-------------------------|-------|
| `id` (string) | `ReceiptID` (int) | Convert int to string | ✅ |
| `customerName` | JOIN `Customer` table | Combine FirstName + LastName | Need JOIN |
| `customerId` (string) | `CustomerID` (int) | Convert int to string | ✅ |
| `items[]` | `ReceiptEntry` table | JOIN and map | One-to-many relationship |
| `subtotal` | `Subtotal` | Direct mapping | ✅ |
| `tax` | `Tax` | Direct mapping | ✅ |
| `total` | `Total` | Direct mapping | ✅ |
| `paymentMethod` | `TenderEntry` table | JOIN needed | Separate table for payment |
| `status` | `Status` (int) | Map int to enum | Need status code mapping |
| `createdAt` | `TransactionDate` | Direct mapping | ✅ |
| `updatedAt` | Not in database | Add or use TransactionDate | May need to extend |

### 3. Customer Mapping

| Frontend Field | Database Field | Transformation Required | Notes |
|----------------|----------------|-------------------------|-------|
| `id` (string) | `CustomerID` (int) | Convert int to string | ✅ |
| `firstName` | `FirstName` | Direct mapping | ✅ |
| `lastName` | `LastName` | Direct mapping | ✅ |
| `email` | `EmailAddress` | Direct mapping | ✅ |
| `phone` | `PhoneNumber` | Direct mapping | ✅ |
| `dateOfBirth` | `DateOfBirth` | Direct mapping | ✅ |
| `address` (object) | Multiple fields | Combine Address, City, State, ZipCode | Need to restructure |
| `isAgeVerified` | Not in database | Add new field | Extend database schema |
| `createdAt` | `DateCreated` | Direct mapping | ✅ |
| `updatedAt` | `LastUpdated` | Direct mapping | ✅ |

### 4. Supplier Mapping

| Frontend Field | Database Field | Transformation Required | Notes |
|----------------|----------------|-------------------------|-------|
| `id` (string) | `SupplierID` (int) | Convert int to string | ✅ |
| `name` | `SupplierName` | Direct mapping | ✅ |
| `contactPerson` | `ContactName` | Direct mapping | ✅ |
| `email` | `EmailAddress` | Direct mapping | ✅ |
| `phone` | `PhoneNumber` | Direct mapping | ✅ |
| `address` (object) | Multiple fields | Combine Address, City, State, ZipCode | Need to restructure |
| `paymentTerms` | `PaymentTerms` | Direct mapping | ✅ |
| `isActive` | `Active` (bit) | Convert bit to boolean | ✅ |
| `createdAt` | `DateCreated` | Direct mapping | ✅ |
| `updatedAt` | Not in database | Add or use DateCreated | May need to extend |

---

## ⚠️ Key Gaps & Mismatches

### 1. **ID Type Mismatch**
- **Frontend**: Uses `string` IDs (UUID-style)
- **Database**: Uses `int` auto-increment IDs
- **Solution**: Convert database IDs to strings in API layer

### 2. **Missing Fields in Database**
Fields your frontend expects but database doesn't have:
- `Product.image` - Product images
- `Product.description` - Detailed descriptions
- `Product.requiresAgeVerification` - Age verification flag
- `Customer.isAgeVerified` - Age verification status
- `Supplier.updatedAt` - Last update timestamp

**Solutions**:
- Add new columns to database (ALTER TABLE)
- Store images in file system and save paths
- Use default values for missing fields

### 3. **Missing Fields in Frontend**
Database has fields your frontend doesn't use:
- `Store` information (multi-store support)
- `Batch` information (transaction batching)
- `OrderHistory` (purchase order history)
- `ItemTax` (tax associations)
- `TenderEntry` (payment details)
- `CustomerLoyalty` (loyalty programs)

**Solutions**:
- Extend frontend types to include these
- Ignore if not needed for MVP
- Add gradually as features are built

### 4. **Relationship Complexity**
- **Database**: Uses foreign keys and JOINs
- **Frontend**: Expects denormalized data (e.g., supplier name as string)
- **Solution**: Create API views that JOIN and flatten data

### 5. **Enum vs. Integer Codes**
- **Frontend**: Uses TypeScript enums (`'cash' | 'card' | 'check'`)
- **Database**: Uses integer status codes
- **Solution**: Create mapping tables/constants

### 6. **Address Structure**
- **Frontend**: Expects nested `Address` object
- **Database**: Stores as separate columns
- **Solution**: Transform in API layer

---

## 🎯 Synchronization Strategy

### Phase 1: Database Schema Extensions (Optional but Recommended)

Add missing fields to match frontend expectations:

```sql
-- Add missing columns to Item table
ALTER TABLE Item
ADD 
  ImagePath NVARCHAR(500) NULL,
  Description NVARCHAR(MAX) NULL,
  RequiresAgeVerification BIT DEFAULT 0;

-- Add missing column to Customer table
ALTER TABLE Customer
ADD IsAgeVerified BIT DEFAULT 0;

-- Add missing column to Supplier table
ALTER TABLE Supplier
ADD LastUpdated DATETIME DEFAULT GETDATE();

-- Add missing column to Receipt table (if needed)
ALTER TABLE Receipt
ADD LastUpdated DATETIME DEFAULT GETDATE();
```

### Phase 2: Create Database Views for Easy Querying

Create SQL views that match your frontend structure:

```sql
-- View for Products with Supplier Name
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

-- View for Transactions (Receipts)
CREATE VIEW vw_Transactions AS
SELECT 
    CAST(r.ReceiptID AS VARCHAR(50)) AS id,
    CONCAT(c.FirstName, ' ', c.LastName) AS customerName,
    CAST(r.CustomerID AS VARCHAR(50)) AS customerId,
    r.Subtotal AS subtotal,
    r.Tax AS tax,
    r.Total AS total,
    r.TransactionDate AS createdAt,
    ISNULL(r.LastUpdated, r.TransactionDate) AS updatedAt,
    -- Status mapping (you'll need to define your status codes)
    CASE r.Status
        WHEN 0 THEN 'completed'
        WHEN 1 THEN 'pending'
        WHEN 2 THEN 'refunded'
        WHEN 3 THEN 'cancelled'
        ELSE 'completed'
    END AS status
FROM Receipt r
LEFT JOIN Customer c ON r.CustomerID = c.CustomerID;

-- View for Customers with Address Object
CREATE VIEW vw_Customers AS
SELECT 
    CAST(CustomerID AS VARCHAR(50)) AS id,
    FirstName AS firstName,
    LastName AS lastName,
    EmailAddress AS email,
    PhoneNumber AS phone,
    DateOfBirth AS dateOfBirth,
    ISNULL(IsAgeVerified, 0) AS isAgeVerified,
    DateCreated AS createdAt,
    LastUpdated AS updatedAt,
    -- Address fields (will be combined in API)
    Address AS street,
    City AS city,
    State AS state,
    ZipCode AS zipCode,
    'USA' AS country
FROM Customer;

-- View for Suppliers
CREATE VIEW vw_Suppliers AS
SELECT 
    CAST(SupplierID AS VARCHAR(50)) AS id,
    SupplierName AS name,
    ContactName AS contactPerson,
    EmailAddress AS email,
    PhoneNumber AS phone,
    PaymentTerms AS paymentTerms,
    CAST(Active AS BIT) AS isActive,
    DateCreated AS createdAt,
    ISNULL(LastUpdated, DateCreated) AS updatedAt,
    -- Address fields
    Address AS street,
    City AS city,
    State AS state,
    ZipCode AS zipCode,
    'USA' AS country
FROM Supplier;
```

### Phase 3: Create Backend API with Data Transformation

Create Node.js/Express API endpoints that transform database data to match frontend:

```typescript
// backend/src/services/productService.ts
import { getConnection } from '../db/connection';
import sql from 'mssql';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  image?: string;
  description?: string;
  requiresAgeVerification: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getAllProducts(): Promise<Product[]> {
  const pool = await getConnection();
  
  // Use the view we created
  const result = await pool.request().query(`
    SELECT * FROM vw_Products
    ORDER BY name
  `);
  
  return result.recordset.map(row => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    category: row.category,
    price: parseFloat(row.price),
    cost: parseFloat(row.cost),
    stock: row.stock,
    minStock: row.minStock,
    maxStock: row.maxStock,
    supplier: row.supplier || 'Unknown',
    image: row.image,
    description: row.description,
    requiresAgeVerification: Boolean(row.requiresAgeVerification),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const pool = await getConnection();
  
  const result = await pool
    .request()
    .input('id', sql.Int, parseInt(id))
    .query(`SELECT * FROM vw_Products WHERE id = @id`);
  
  if (result.recordset.length === 0) return null;
  
  const row = result.recordset[0];
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    category: row.category,
    price: parseFloat(row.price),
    cost: parseFloat(row.cost),
    stock: row.stock,
    minStock: row.minStock,
    maxStock: row.maxStock,
    supplier: row.supplier || 'Unknown',
    image: row.image,
    description: row.description,
    requiresAgeVerification: Boolean(row.requiresAgeVerification),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

// Similar services for customers, transactions, suppliers...
```

### Phase 4: Create API Routes

```typescript
// backend/src/routes/products.ts
import express from 'express';
import { getAllProducts, getProductById } from '../services/productService';

const router = express.Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

export default router;
```

### Phase 5: Update Frontend to Use Real API

Replace mock data with API calls:

```typescript
// src/renderer/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
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

Update ProductCatalog component:

```typescript
// src/renderer/pages/Inventory/ProductCatalog.tsx
import { useProducts } from '../../hooks/useProducts';

export const ProductCatalog: React.FC = () => {
  const { data: products, isLoading, error } = useProducts();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  // Rest of your component using real data
  return (
    // ... your existing UI
  );
};
```

---

## 📋 Implementation Checklist

### ✅ Must Do (Critical)

- [ ] **Restore database** from `rmhSample.bck`
- [ ] **Explore database schema** using `database_explore.sql`
- [ ] **Create database views** (vw_Products, vw_Transactions, etc.)
- [ ] **Build backend API** (Node.js + Express + mssql)
- [ ] **Create data transformation layer** (map database → frontend types)
- [ ] **Update frontend hooks** to use real API instead of mock data
- [ ] **Test data flow** end-to-end

### 🔧 Should Do (Important)

- [ ] **Extend database schema** (add missing columns)
- [ ] **Create status code mappings** (int → enum)
- [ ] **Handle image uploads** (file storage system)
- [ ] **Implement error handling** (API + frontend)
- [ ] **Add data validation** (backend + frontend)
- [ ] **Create migration scripts** (for schema changes)

### 💡 Nice to Have (Enhancement)

- [ ] **Add database indexes** for performance
- [ ] **Implement caching** (Redis or in-memory)
- [ ] **Add database triggers** for audit trails
- [ ] **Create stored procedures** for complex queries
- [ ] **Add full-text search** for products
- [ ] **Implement real-time updates** (WebSockets)
- [ ] **Add data export/import** features
- [ ] **Create backup automation**

### ❌ Unnecessary (Skip for Now)

- [ ] Rewriting entire frontend to match database exactly
- [ ] Changing all frontend IDs from string to number
- [ ] Implementing all database features at once
- [ ] Building custom ORM from scratch
- [ ] Migrating to different database system

---

## 🚨 Critical Facts About This Process

### 1. **Data Type Conversions Are Essential**
- Database uses `int` IDs, frontend uses `string` IDs
- Database uses `bit` for booleans, frontend uses `boolean`
- Database uses `decimal` for money, frontend uses `number`
- **Always convert in API layer, never change frontend types**

### 2. **JOINs Are Required**
- Frontend expects denormalized data (supplier name as string)
- Database stores normalized data (supplier ID as foreign key)
- **Use SQL views or API-level JOINs to flatten data**

### 3. **Missing Fields Need Handling**
- Some frontend fields don't exist in database
- Some database fields aren't used by frontend
- **Options**: Extend schema, use defaults, or ignore

### 4. **Status Codes Need Mapping**
- Database uses integer codes (0, 1, 2, 3)
- Frontend uses string enums ('completed', 'pending', etc.)
- **Create constant mapping objects**

### 5. **Address Structure Differs**
- Frontend expects nested object: `{ street, city, state, zipCode }`
- Database stores as flat columns
- **Transform in API layer**

### 6. **Date Handling**
- SQL Server returns dates as strings
- Frontend expects Date objects
- **Convert using `new Date()` in API**

### 7. **Multi-Store Support**
- Database has `StoreID` in many tables
- Frontend doesn't account for multiple stores
- **Decision needed**: Single store or multi-store?

### 8. **Transaction Items Relationship**
- Frontend expects `items[]` array in Transaction
- Database stores in separate `ReceiptEntry` table
- **Fetch and combine in API**

### 9. **Payment Method Complexity**
- Frontend expects simple enum
- Database has separate `TenderEntry` table
- **Simplify or extend frontend**

### 10. **Performance Considerations**
- Database has 16MB of data (potentially thousands of records)
- Frontend expects paginated results
- **Implement pagination in API**

---

## 🎯 Recommended Approach

### **Option A: Minimal Changes (Fastest)**
1. Keep frontend types as-is
2. Create database views that match frontend
3. Build thin API layer for transformation
4. Use default values for missing fields
5. **Time**: 2-3 days

### **Option B: Balanced Approach (Recommended)**
1. Extend database with missing columns
2. Create comprehensive views
3. Build robust API with validation
4. Update frontend to use real data
5. Add error handling
6. **Time**: 1-2 weeks

### **Option C: Full Integration (Most Complete)**
1. Extend database schema completely
2. Create stored procedures
3. Build comprehensive API
4. Extend frontend types for all database features
5. Implement all relationships
6. Add advanced features (multi-store, loyalty, etc.)
7. **Time**: 3-4 weeks

---

## 📝 Next Steps

1. **Restore the database** (see DATABASE_GUIDE.md)
2. **Run exploration queries** (use database_explore.sql)
3. **Choose your approach** (A, B, or C above)
4. **Create database views** (start with products)
5. **Build backend API** (start with GET endpoints)
6. **Test with Postman** before connecting frontend
7. **Update one frontend page** at a time
8. **Test thoroughly** at each step

---

## 🆘 Common Issues & Solutions

### Issue: "Column doesn't exist"
**Solution**: Check exact column names in database using:
```sql
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Item'
```

### Issue: "Type conversion error"
**Solution**: Always cast database types explicitly:
```typescript
parseInt(row.id)  // string → number
Boolean(row.active)  // bit → boolean
parseFloat(row.price)  // decimal → number
```

### Issue: "Null values breaking frontend"
**Solution**: Use default values:
```typescript
supplier: row.supplier || 'Unknown'
description: row.description || ''
```

### Issue: "Performance is slow"
**Solution**: 
- Add database indexes
- Implement pagination
- Use database views
- Cache frequently accessed data

### Issue: "Frontend expects array, database returns null"
**Solution**: Always return empty array:
```typescript
items: result.recordset || []
```

---

## 📚 Additional Resources

- See `DATABASE_GUIDE.md` for restore instructions
- See `database_explore.sql` for exploration queries
- See `src/renderer/services/apiClient.ts` for API client
- See `src/shared/types/index.ts` for frontend types

---

**Created**: December 2024  
**Database**: rmhSample.bck (SQL Server 2016)  
**Frontend**: Electron + React + TypeScript  
**Status**: Ready for implementation

