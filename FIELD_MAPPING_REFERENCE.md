# Quick Field Mapping Reference

## 🔄 Frontend ↔ Database Field Mapping

### Products / Items

| Frontend Field | Type | Database Table | Database Field | Type | Transformation |
|----------------|------|----------------|----------------|------|----------------|
| `id` | string | `Item` | `ItemID` | int | `String(ItemID)` |
| `name` | string | `Item` | `ItemDescription` | varchar | Direct |
| `sku` | string | `Item` | `ItemLookupCode` | varchar | Direct |
| `barcode` | string? | `Item` | `ItemLookupCode` | varchar | Direct (or separate field) |
| `category` | string | `ItemClass` | `ClassName` | varchar | JOIN ItemClass |
| `price` | number | `Item` | `Price` | decimal | `parseFloat(Price)` |
| `cost` | number | `Item` | `Cost` | decimal | `parseFloat(Cost)` |
| `stock` | number | `Item` | `Quantity` | int | Direct |
| `minStock` | number | `Item` | `ItemMinimum` or `ReorderPoint` | int | Direct |
| `maxStock` | number | `Item` | `ItemMaximum` | int | Direct |
| `supplier` | string | `Supplier` | `SupplierName` | varchar | JOIN Supplier |
| `image` | string? | `Item` | `ImagePath` | varchar | **ADD COLUMN** |
| `description` | string? | `Item` | `Description` | nvarchar | **ADD COLUMN** |
| `requiresAgeVerification` | boolean | `Item` | `RequiresAgeVerification` | bit | **ADD COLUMN** + `Boolean()` |
| `createdAt` | Date | `Item` | `DateCreated` | datetime | `new Date()` |
| `updatedAt` | Date | `Item` | `LastUpdated` | datetime | `new Date()` |

**SQL to get Products:**
```sql
SELECT 
    CAST(i.ItemID AS VARCHAR) AS id,
    i.ItemDescription AS name,
    i.ItemLookupCode AS sku,
    i.ItemLookupCode AS barcode,
    ic.ClassName AS category,
    i.Price AS price,
    i.Cost AS cost,
    i.Quantity AS stock,
    i.ItemMinimum AS minStock,
    i.ItemMaximum AS maxStock,
    s.SupplierName AS supplier,
    i.ImagePath AS image,
    i.Description AS description,
    i.RequiresAgeVerification AS requiresAgeVerification,
    i.DateCreated AS createdAt,
    i.LastUpdated AS updatedAt
FROM Item i
LEFT JOIN Supplier s ON i.SupplierID = s.SupplierID
LEFT JOIN ItemClass ic ON i.ItemType = ic.ItemClassID
```

---

### Transactions / Receipts

| Frontend Field | Type | Database Table | Database Field | Type | Transformation |
|----------------|------|----------------|----------------|------|----------------|
| `id` | string | `Receipt` | `ReceiptID` | int | `String(ReceiptID)` |
| `customerName` | string | `Customer` | `FirstName + LastName` | varchar | `CONCAT(FirstName, ' ', LastName)` |
| `customerId` | string? | `Receipt` | `CustomerID` | int | `String(CustomerID)` |
| `items` | array | `ReceiptEntry` | Multiple rows | - | Fetch separately + map |
| `subtotal` | number | `Receipt` | `Subtotal` | decimal | `parseFloat(Subtotal)` |
| `tax` | number | `Receipt` | `Tax` | decimal | `parseFloat(Tax)` |
| `total` | number | `Receipt` | `Total` | decimal | `parseFloat(Total)` |
| `paymentMethod` | enum | `TenderEntry` | Multiple fields | - | Map from TenderEntry |
| `status` | enum | `Receipt` | `Status` | int | Map: 0→completed, 1→pending, etc. |
| `createdAt` | Date | `Receipt` | `TransactionDate` | datetime | `new Date()` |
| `updatedAt` | Date | `Receipt` | `LastUpdated` | datetime | **ADD COLUMN** + `new Date()` |

**SQL to get Transactions:**
```sql
SELECT 
    CAST(r.ReceiptID AS VARCHAR) AS id,
    CONCAT(c.FirstName, ' ', c.LastName) AS customerName,
    CAST(r.CustomerID AS VARCHAR) AS customerId,
    r.Subtotal AS subtotal,
    r.Tax AS tax,
    r.Total AS total,
    r.TransactionDate AS createdAt,
    CASE r.Status
        WHEN 0 THEN 'completed'
        WHEN 1 THEN 'pending'
        WHEN 2 THEN 'refunded'
        WHEN 3 THEN 'cancelled'
        ELSE 'completed'
    END AS status
FROM Receipt r
LEFT JOIN Customer c ON r.CustomerID = c.CustomerID
```

**SQL to get Transaction Items:**
```sql
SELECT 
    CAST(re.ReceiptEntryID AS VARCHAR) AS id,
    CAST(re.ItemID AS VARCHAR) AS productId,
    i.ItemDescription AS productName,
    re.Quantity AS quantity,
    re.Price AS unitPrice,
    re.Total AS totalPrice
FROM ReceiptEntry re
INNER JOIN Item i ON re.ItemID = i.ItemID
WHERE re.ReceiptID = @receiptId
```

---

### Customers

| Frontend Field | Type | Database Table | Database Field | Type | Transformation |
|----------------|------|----------------|----------------|------|----------------|
| `id` | string | `Customer` | `CustomerID` | int | `String(CustomerID)` |
| `firstName` | string | `Customer` | `FirstName` | varchar | Direct |
| `lastName` | string | `Customer` | `LastName` | varchar | Direct |
| `email` | string? | `Customer` | `EmailAddress` | varchar | Direct |
| `phone` | string? | `Customer` | `PhoneNumber` | varchar | Direct |
| `dateOfBirth` | Date? | `Customer` | `DateOfBirth` | datetime | `new Date()` |
| `address` | object | `Customer` | Multiple fields | - | Combine fields |
| `address.street` | string | `Customer` | `Address` | varchar | Direct |
| `address.city` | string | `Customer` | `City` | varchar | Direct |
| `address.state` | string | `Customer` | `State` | varchar | Direct |
| `address.zipCode` | string | `Customer` | `ZipCode` | varchar | Direct |
| `address.country` | string | - | - | - | Default: 'USA' |
| `isAgeVerified` | boolean | `Customer` | `IsAgeVerified` | bit | **ADD COLUMN** + `Boolean()` |
| `createdAt` | Date | `Customer` | `DateCreated` | datetime | `new Date()` |
| `updatedAt` | Date | `Customer` | `LastUpdated` | datetime | `new Date()` |

**SQL to get Customers:**
```sql
SELECT 
    CAST(CustomerID AS VARCHAR) AS id,
    FirstName AS firstName,
    LastName AS lastName,
    EmailAddress AS email,
    PhoneNumber AS phone,
    DateOfBirth AS dateOfBirth,
    IsAgeVerified AS isAgeVerified,
    DateCreated AS createdAt,
    LastUpdated AS updatedAt,
    Address AS street,
    City AS city,
    State AS state,
    ZipCode AS zipCode
FROM Customer
```

**TypeScript transformation:**
```typescript
const customer = {
  ...row,
  address: {
    street: row.street,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    country: 'USA'
  }
};
```

---

### Suppliers

| Frontend Field | Type | Database Table | Database Field | Type | Transformation |
|----------------|------|----------------|----------------|------|----------------|
| `id` | string | `Supplier` | `SupplierID` | int | `String(SupplierID)` |
| `name` | string | `Supplier` | `SupplierName` | varchar | Direct |
| `contactPerson` | string | `Supplier` | `ContactName` | varchar | Direct |
| `email` | string | `Supplier` | `EmailAddress` | varchar | Direct |
| `phone` | string | `Supplier` | `PhoneNumber` | varchar | Direct |
| `address` | object | `Supplier` | Multiple fields | - | Combine fields |
| `address.street` | string | `Supplier` | `Address` | varchar | Direct |
| `address.city` | string | `Supplier` | `City` | varchar | Direct |
| `address.state` | string | `Supplier` | `State` | varchar | Direct |
| `address.zipCode` | string | `Supplier` | `ZipCode` | varchar | Direct |
| `address.country` | string | - | - | - | Default: 'USA' |
| `paymentTerms` | string | `Supplier` | `PaymentTerms` | varchar | Direct |
| `isActive` | boolean | `Supplier` | `Active` | bit | `Boolean(Active)` |
| `createdAt` | Date | `Supplier` | `DateCreated` | datetime | `new Date()` |
| `updatedAt` | Date | `Supplier` | `LastUpdated` | datetime | **ADD COLUMN** + `new Date()` |

**SQL to get Suppliers:**
```sql
SELECT 
    CAST(SupplierID AS VARCHAR) AS id,
    SupplierName AS name,
    ContactName AS contactPerson,
    EmailAddress AS email,
    PhoneNumber AS phone,
    PaymentTerms AS paymentTerms,
    Active AS isActive,
    DateCreated AS createdAt,
    LastUpdated AS updatedAt,
    Address AS street,
    City AS city,
    State AS state,
    ZipCode AS zipCode
FROM Supplier
```

---

## 🔢 Status Code Mappings

### Transaction Status

```typescript
// Database → Frontend
const statusMap: Record<number, string> = {
  0: 'completed',
  1: 'pending',
  2: 'refunded',
  3: 'cancelled'
};

// Frontend → Database
const reverseStatusMap: Record<string, number> = {
  'completed': 0,
  'pending': 1,
  'refunded': 2,
  'cancelled': 3
};
```

### Payment Method

```typescript
// Assuming TenderEntry.TenderType codes
const paymentMethodMap: Record<number, string> = {
  0: 'cash',
  1: 'card',
  2: 'check',
  3: 'credit',
  // Add more as needed
};
```

---

## 🛠️ Required Database Schema Changes

### Add Missing Columns

```sql
-- Products
ALTER TABLE Item ADD ImagePath NVARCHAR(500) NULL;
ALTER TABLE Item ADD Description NVARCHAR(MAX) NULL;
ALTER TABLE Item ADD RequiresAgeVerification BIT DEFAULT 0;

-- Customers
ALTER TABLE Customer ADD IsAgeVerified BIT DEFAULT 0;

-- Suppliers
ALTER TABLE Supplier ADD LastUpdated DATETIME DEFAULT GETDATE();

-- Receipts
ALTER TABLE Receipt ADD LastUpdated DATETIME DEFAULT GETDATE();
```

---

## 📊 Common Query Patterns

### Get Product with Low Stock
```sql
SELECT * FROM vw_Products 
WHERE stock <= minStock 
ORDER BY stock ASC
```

### Get Today's Transactions
```sql
SELECT * FROM vw_Transactions 
WHERE CAST(createdAt AS DATE) = CAST(GETDATE() AS DATE)
ORDER BY createdAt DESC
```

### Get Customer Purchase History
```sql
SELECT * FROM vw_Transactions 
WHERE customerId = @customerId 
ORDER BY createdAt DESC
```

### Search Products
```sql
SELECT * FROM vw_Products 
WHERE name LIKE '%' + @search + '%' 
   OR sku LIKE '%' + @search + '%' 
   OR barcode LIKE '%' + @search + '%'
```

---

## 🎯 TypeScript Helper Functions

### Convert Database Row to Frontend Type

```typescript
// Product converter
function dbToProduct(row: any): Product {
  return {
    id: String(row.ItemID),
    name: row.ItemDescription,
    sku: row.ItemLookupCode,
    barcode: row.ItemLookupCode,
    category: row.category || 'Uncategorized',
    price: parseFloat(row.Price),
    cost: parseFloat(row.Cost),
    stock: row.Quantity,
    minStock: row.ItemMinimum || row.ReorderPoint,
    maxStock: row.ItemMaximum || 100,
    supplier: row.SupplierName || 'Unknown',
    image: row.ImagePath,
    description: row.Description,
    requiresAgeVerification: Boolean(row.RequiresAgeVerification),
    createdAt: new Date(row.DateCreated),
    updatedAt: new Date(row.LastUpdated || row.DateCreated)
  };
}

// Customer converter
function dbToCustomer(row: any): Customer {
  return {
    id: String(row.CustomerID),
    firstName: row.FirstName,
    lastName: row.LastName,
    email: row.EmailAddress,
    phone: row.PhoneNumber,
    dateOfBirth: row.DateOfBirth ? new Date(row.DateOfBirth) : undefined,
    address: {
      street: row.Address || '',
      city: row.City || '',
      state: row.State || '',
      zipCode: row.ZipCode || '',
      country: 'USA'
    },
    isAgeVerified: Boolean(row.IsAgeVerified),
    createdAt: new Date(row.DateCreated),
    updatedAt: new Date(row.LastUpdated || row.DateCreated)
  };
}

// Transaction converter
function dbToTransaction(row: any, items: TransactionItem[]): Transaction {
  return {
    id: String(row.ReceiptID),
    customerName: row.customerName,
    customerId: row.CustomerID ? String(row.CustomerID) : undefined,
    items: items,
    subtotal: parseFloat(row.Subtotal),
    tax: parseFloat(row.Tax),
    total: parseFloat(row.Total),
    paymentMethod: mapPaymentMethod(row.paymentType),
    status: mapStatus(row.Status),
    createdAt: new Date(row.TransactionDate),
    updatedAt: new Date(row.LastUpdated || row.TransactionDate)
  };
}
```

---

## ⚡ Quick Start Commands

### 1. Restore Database
```powershell
sqlcmd -S localhost\SQLEXPRESS -E -Q "RESTORE DATABASE rmhsample FROM DISK='C:\path\to\rmhSample.bck' WITH REPLACE"
```

### 2. Add Missing Columns
```sql
USE rmhsample;
-- Run ALTER TABLE commands from above
```

### 3. Create Views
```sql
-- Run CREATE VIEW commands from FRONTEND_DATABASE_SYNC_GUIDE.md
```

### 4. Test Query
```sql
SELECT TOP 10 * FROM vw_Products;
```

### 5. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 6. Test API
```bash
curl http://localhost:5000/api/products
```

### 7. Update Frontend
```typescript
// Replace mock data with API calls
const { data: products } = useProducts();
```

---

**Quick Reference Created**: December 2024  
**For**: Rakshi Pasal Management System  
**Database**: rmhSample.bck (SQL Server 2016)

