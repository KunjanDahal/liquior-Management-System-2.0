-- =============================================
-- Database Exploration Script for rmhsample
-- =============================================
-- This script helps you explore the database structure and sample data
-- Run this in SQL Server Management Studio after restoring the database

USE rmhsample;
GO

-- =============================================
-- 1. List All Tables
-- =============================================
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO

-- =============================================
-- 2. Get Row Counts for All Tables
-- =============================================
SELECT 
    t.name AS TableName,
    p.rows AS RowCount
FROM sys.tables t
INNER JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id IN (0, 1)  -- Only heap or clustered index
ORDER BY p.rows DESC;
GO

-- =============================================
-- 3. Explore Key Tables Structure
-- =============================================

-- Items/Products Table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Item'
ORDER BY ORDINAL_POSITION;
GO

-- Customers Table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Customer'
ORDER BY ORDINAL_POSITION;
GO

-- Receipts Table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Receipt'
ORDER BY ORDINAL_POSITION;
GO

-- Orders Table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Order'
ORDER BY ORDINAL_POSITION;
GO

-- Suppliers Table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Supplier'
ORDER BY ORDINAL_POSITION;
GO

-- =============================================
-- 4. Sample Data from Key Tables
-- =============================================

-- Sample Items
SELECT TOP 20 
    ItemID,
    ItemLookupCode,
    ItemDescription,
    Price,
    Quantity,
    ItemType
FROM Item
ORDER BY ItemID;
GO

-- Sample Customers
SELECT TOP 20 
    CustomerID,
    FirstName,
    LastName,
    PhoneNumber,
    EmailAddress,
    DateCreated
FROM Customer
ORDER BY CustomerID;
GO

-- Sample Receipts
SELECT TOP 20 
    ReceiptID,
    TransactionDate,
    Total,
    CustomerID,
    StoreID
FROM Receipt
ORDER BY TransactionDate DESC;
GO

-- Sample Orders
SELECT TOP 20 
    OrderID,
    OrderDate,
    SupplierID,
    Total,
    Status
FROM [Order]
ORDER BY OrderDate DESC;
GO

-- Sample Suppliers
SELECT TOP 20 
    SupplierID,
    SupplierName,
    ContactName,
    PhoneNumber,
    EmailAddress
FROM Supplier
ORDER BY SupplierID;
GO

-- =============================================
-- 5. Check Relationships (Foreign Keys)
-- =============================================
SELECT 
    fk.name AS ForeignKeyName,
    OBJECT_NAME(fk.parent_object_id) AS ParentTable,
    COL_NAME(fc.parent_object_id, fc.parent_column_id) AS ParentColumn,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
    COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ReferencedColumn
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fc 
    ON fk.object_id = fc.constraint_object_id
ORDER BY ParentTable, ForeignKeyName;
GO

-- =============================================
-- 6. Check Indexes
-- =============================================
SELECT 
    OBJECT_NAME(i.object_id) AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique,
    i.is_primary_key
FROM sys.indexes i
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
ORDER BY TableName, IndexName;
GO

-- =============================================
-- 7. Database Size Information
-- =============================================
SELECT 
    name AS DatabaseName,
    CAST(SIZE * 8.0 / 1024 AS DECIMAL(10, 2)) AS SizeMB
FROM sys.database_files;
GO

-- =============================================
-- 8. Check for Stored Procedures
-- =============================================
SELECT 
    ROUTINE_SCHEMA,
    ROUTINE_NAME,
    ROUTINE_TYPE,
    CREATED,
    LAST_ALTERED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_TYPE = 'PROCEDURE'
ORDER BY ROUTINE_NAME;
GO

-- =============================================
-- 9. Check for Views
-- =============================================
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    VIEW_DEFINITION
FROM INFORMATION_SCHEMA.VIEWS
ORDER BY TABLE_NAME;
GO

-- =============================================
-- 10. Common Business Queries
-- =============================================

-- Low Stock Items (if ReorderPoint column exists)
-- SELECT 
--     ItemID,
--     ItemDescription,
--     Quantity,
--     ReorderPoint
-- FROM Item
-- WHERE Quantity <= ReorderPoint
-- ORDER BY Quantity ASC;
-- GO

-- Recent Sales Summary
-- SELECT 
--     COUNT(*) AS TotalReceipts,
--     SUM(Total) AS TotalSales,
--     AVG(Total) AS AverageSale
-- FROM Receipt
-- WHERE TransactionDate >= DATEADD(day, -30, GETDATE());
-- GO

-- Top Selling Items (if OrderEntry exists)
-- SELECT TOP 10
--     i.ItemDescription,
--     SUM(oe.Quantity) AS TotalQuantitySold,
--     SUM(oe.Price * oe.Quantity) AS TotalRevenue
-- FROM OrderEntry oe
-- INNER JOIN Item i ON oe.ItemID = i.ItemID
-- GROUP BY i.ItemDescription
-- ORDER BY TotalQuantitySold DESC;
-- GO

