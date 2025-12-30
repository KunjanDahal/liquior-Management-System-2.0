# Dashboard Data Queries

This document contains SQL queries you can run to explore the data that powers the dashboard.

## Dashboard Statistics

### Today's Sales
```sql
SELECT 
  ISNULL(SUM(Total), 0) AS TotalSales,
  COUNT(*) AS TransactionCount
FROM [Transaction]
WHERE CAST(Time AS DATE) = CAST(GETDATE() AS DATE)
```

### Yesterday's Sales (for comparison)
```sql
SELECT 
  ISNULL(SUM(Total), 0) AS TotalSales,
  COUNT(*) AS TransactionCount
FROM [Transaction]
WHERE CAST(Time AS DATE) = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE)
```

### Total Inventory Value
```sql
SELECT ISNULL(SUM(Cost * Quantity), 0) AS TotalValue
FROM Item
WHERE Inactive = 0 OR Inactive IS NULL
```

### Active Customers Count
```sql
SELECT COUNT(*) AS CustomerCount
FROM Customer
```

### Low Stock Items Count
```sql
SELECT COUNT(*) AS LowStockCount
FROM Item
WHERE (Inactive = 0 OR Inactive IS NULL)
  AND Quantity <= ReorderPoint
  AND ReorderPoint > 0
```

### Monthly Revenue (Current Month)
```sql
SELECT ISNULL(SUM(Total), 0) AS MonthlyRevenue
FROM [Transaction]
WHERE YEAR(Time) = YEAR(GETDATE())
  AND MONTH(Time) = MONTH(GETDATE())
```

### Last Month's Revenue (for comparison)
```sql
SELECT ISNULL(SUM(Total), 0) AS LastMonthRevenue
FROM [Transaction]
WHERE YEAR(Time) = YEAR(DATEADD(MONTH, -1, GETDATE()))
  AND MONTH(Time) = MONTH(DATEADD(MONTH, -1, GETDATE()))
```

## Top Selling Products (Last 30 Days)

```sql
SELECT TOP 5
  i.ID AS ItemID,
  i.Description AS ItemDescription,
  ISNULL(ic.Description, 'Uncategorized') AS Category,
  SUM(te.Quantity) AS TotalSales,
  SUM(te.FullPrice) AS TotalRevenue
FROM TransactionEntry te
INNER JOIN [Transaction] t ON te.TransactionNumber = t.TransactionNumber
INNER JOIN Item i ON te.ItemID = i.ID
LEFT JOIN ItemClass ic ON i.ItemType = ic.ID
WHERE t.Time >= DATEADD(DAY, -30, GETDATE())
GROUP BY i.ID, i.Description, ic.Description
ORDER BY TotalSales DESC
```

**Note:** The `ItemClass` table uses `ID` as the primary key and `Description` for the category name. Items without a matching `ItemType` will show as 'Uncategorized'.

## Weekly Sales Data (Last 7 Days)

```sql
SELECT 
  CAST(t.Time AS DATE) AS SaleDate,
  DATENAME(WEEKDAY, t.Time) AS DayName,
  SUM(t.Total) AS DailySales,
  COUNT(DISTINCT t.TransactionNumber) AS DailyTransactions
FROM [Transaction] t
WHERE t.Time >= DATEADD(DAY, -7, GETDATE())
GROUP BY CAST(t.Time AS DATE), DATENAME(WEEKDAY, t.Time)
ORDER BY SaleDate
```

## Recent Transactions

```sql
SELECT TOP 10
  t.TransactionNumber AS ReceiptID,
  t.Time AS TransactionTime,
  (t.Total - t.SalesTax) AS SubTotal,
  t.SalesTax AS Tax,
  t.Total,
  t.CustomerID,
  t.Status
FROM [Transaction] t
ORDER BY t.Time DESC
```

## Transaction Items for a Specific Receipt

```sql
SELECT 
  te.ID AS ReceiptEntryID,
  te.TransactionNumber AS ReceiptID,
  te.ItemID,
  i.Description AS ItemDescription,
  te.Quantity,
  te.Price,
  te.FullPrice AS Total
FROM TransactionEntry te
INNER JOIN Item i ON te.ItemID = i.ID
WHERE te.TransactionNumber = @transactionNumber
```

## Low Stock Items Details

```sql
SELECT 
  i.ID AS ItemID,
  i.ItemLookupCode,
  i.Description AS ItemDescription,
  i.Quantity AS CurrentStock,
  i.ReorderPoint AS MinStock,
  i.RestockLevel AS MaxStock,
  CASE 
    WHEN i.Quantity = 0 OR i.Quantity IS NULL THEN 'critical'
    WHEN i.Quantity <= i.ReorderPoint * 0.5 THEN 'high'
    WHEN i.Quantity <= i.ReorderPoint THEN 'medium'
    ELSE 'low'
  END AS Priority
FROM Item i
WHERE (i.Inactive = 0 OR i.Inactive IS NULL)
  AND (i.Quantity <= i.ReorderPoint OR i.Quantity IS NULL OR i.Quantity = 0)
ORDER BY 
  CASE 
    WHEN i.Quantity = 0 OR i.Quantity IS NULL THEN 0
    WHEN i.Quantity <= i.ReorderPoint * 0.5 THEN 1
    ELSE 2
  END,
  i.Quantity ASC
```

## Notes

- All queries use the actual table names from your database: `[Transaction]`, `TransactionEntry`, `Item`, `Customer`
- The `ItemClass` table is used for categories, but if it doesn't exist or has no matching records, products will show as "Uncategorized"
- Date comparisons use `CAST(Time AS DATE)` to ensure accurate day-level comparisons
- All monetary values are stored as decimals in the database

