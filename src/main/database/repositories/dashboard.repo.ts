/**
 * Dashboard Repository
 * Handles all database operations for dashboard statistics and analytics
 */

import sql from 'mssql';
import { getConnectionPool } from '../connection';
import { Logger } from '../../utils/Logger';

const logger = new Logger('DashboardRepo');

export interface DashboardStats {
  todaysSales: number;
  yesterdaysSales: number;
  totalInventoryValue: number;
  transactionsToday: number;
  transactionsYesterday: number;
  activeCustomers: number;
  lowStockItemsCount: number;
  monthlyRevenue: number;
  lastMonthRevenue: number;
}

export interface TopSellingProduct {
  id: string;
  name: string;
  category: string;
  sales: number;
  revenue: number;
  trend: 'up' | 'down' | 'stable';
}

export interface WeeklySalesData {
  day: string;
  sales: number;
  transactions: number;
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const pool = getConnectionPool();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get today's sales
    const todaySalesResult = await pool
      .request()
      .input('today', sql.DateTime, today)
      .input('tomorrow', sql.DateTime, new Date(today.getTime() + 24 * 60 * 60 * 1000))
      .query(`
        SELECT 
          ISNULL(SUM(Total), 0) AS TotalSales,
          COUNT(*) AS TransactionCount
        FROM [Transaction]
        WHERE Time >= @today AND Time < @tomorrow
      `);

    // Get yesterday's sales
    const yesterdaySalesResult = await pool
      .request()
      .input('yesterday', sql.DateTime, yesterday)
      .input('today', sql.DateTime, today)
      .query(`
        SELECT 
          ISNULL(SUM(Total), 0) AS TotalSales,
          COUNT(*) AS TransactionCount
        FROM [Transaction]
        WHERE Time >= @yesterday AND Time < @today
      `);

    // Get total inventory value (Cost * Quantity)
    const inventoryValueResult = await pool
      .request()
      .query(`
        SELECT ISNULL(SUM(Cost * Quantity), 0) AS TotalValue
        FROM Item
        WHERE Inactive = 0 OR Inactive IS NULL
      `);

    // Get active customers count
    const customersResult = await pool
      .request()
      .query(`
        SELECT COUNT(*) AS CustomerCount
        FROM Customer
      `);

    // Get low stock items count
    const lowStockResult = await pool
      .request()
      .query(`
        SELECT COUNT(*) AS LowStockCount
        FROM Item
        WHERE (Inactive = 0 OR Inactive IS NULL)
          AND Quantity <= ReorderPoint
          AND ReorderPoint > 0
      `);

    // Get monthly revenue
    const monthlyRevenueResult = await pool
      .request()
      .input('startOfMonth', sql.DateTime, startOfMonth)
      .input('startOfNextMonth', sql.DateTime, new Date(today.getFullYear(), today.getMonth() + 1, 1))
      .query(`
        SELECT ISNULL(SUM(Total), 0) AS MonthlyRevenue
        FROM [Transaction]
        WHERE Time >= @startOfMonth AND Time < @startOfNextMonth
      `);

    // Get last month's revenue
    const lastMonthRevenueResult = await pool
      .request()
      .input('startOfLastMonth', sql.DateTime, startOfLastMonth)
      .input('endOfLastMonth', sql.DateTime, new Date(endOfLastMonth.getTime() + 24 * 60 * 60 * 1000))
      .query(`
        SELECT ISNULL(SUM(Total), 0) AS LastMonthRevenue
        FROM [Transaction]
        WHERE Time >= @startOfLastMonth AND Time < @endOfLastMonth
      `);

    const stats: DashboardStats = {
      todaysSales: parseFloat(todaySalesResult.recordset[0]?.TotalSales || '0'),
      yesterdaysSales: parseFloat(yesterdaySalesResult.recordset[0]?.TotalSales || '0'),
      totalInventoryValue: parseFloat(inventoryValueResult.recordset[0]?.TotalValue || '0'),
      transactionsToday: parseInt(todaySalesResult.recordset[0]?.TransactionCount || '0', 10),
      transactionsYesterday: parseInt(yesterdaySalesResult.recordset[0]?.TransactionCount || '0', 10),
      activeCustomers: parseInt(customersResult.recordset[0]?.CustomerCount || '0', 10),
      lowStockItemsCount: parseInt(lowStockResult.recordset[0]?.LowStockCount || '0', 10),
      monthlyRevenue: parseFloat(monthlyRevenueResult.recordset[0]?.MonthlyRevenue || '0'),
      lastMonthRevenue: parseFloat(lastMonthRevenueResult.recordset[0]?.LastMonthRevenue || '0'),
    };

    logger.info('Dashboard stats retrieved successfully');
    return stats;
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    throw error;
  }
}

/**
 * Get top selling products
 */
export async function getTopSellingProducts(limit: number = 5): Promise<TopSellingProduct[]> {
  try {
    const pool = getConnectionPool();
    
    // Get current period (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get previous period (30-60 days ago)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get top products for current period
    const currentPeriodResult = await pool
      .request()
      .input('startDate', sql.DateTime, thirtyDaysAgo)
      .query(`
        SELECT 
          i.ID AS ItemID,
          i.Description AS ItemDescription,
          ISNULL(ic.Description, 'Uncategorized') AS Category,
          SUM(te.Quantity) AS TotalSales,
          SUM(te.FullPrice) AS TotalRevenue
        FROM TransactionEntry te
        INNER JOIN [Transaction] t ON te.TransactionNumber = t.TransactionNumber
        INNER JOIN Item i ON te.ItemID = i.ID
        LEFT JOIN ItemClass ic ON i.ItemType = ic.ID
        WHERE t.Time >= @startDate
        GROUP BY i.ID, i.Description, ic.Description
        ORDER BY TotalSales DESC
      `);

    // Get previous period data for trend calculation
    const previousPeriodResult = await pool
      .request()
      .input('startDate', sql.DateTime, sixtyDaysAgo)
      .input('endDate', sql.DateTime, thirtyDaysAgo)
      .query(`
        SELECT 
          i.ID AS ItemID,
          SUM(te.Quantity) AS TotalSales
        FROM TransactionEntry te
        INNER JOIN [Transaction] t ON te.TransactionNumber = t.TransactionNumber
        INNER JOIN Item i ON te.ItemID = i.ID
        WHERE t.Time >= @startDate AND t.Time < @endDate
        GROUP BY i.ID
      `);

    // Create a map of previous period sales
    const previousSalesMap = new Map<number, number>();
    previousPeriodResult.recordset.forEach((row: any) => {
      previousSalesMap.set(row.ItemID, parseFloat(row.TotalSales || '0'));
    });

    // Process results and calculate trends
    const topProducts: TopSellingProduct[] = currentPeriodResult.recordset
      .slice(0, limit)
      .map((row: any) => {
        const itemId = row.ItemID;
        const currentSales = parseFloat(row.TotalSales || '0');
        const previousSales = previousSalesMap.get(itemId) || 0;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (currentSales > previousSales * 1.1) {
          trend = 'up';
        } else if (currentSales < previousSales * 0.9) {
          trend = 'down';
        }

        return {
          id: itemId.toString(),
          name: row.ItemDescription || 'Unknown Product',
          category: row.Category || 'Uncategorized',
          sales: Math.round(currentSales),
          revenue: parseFloat(row.TotalRevenue || '0'),
          trend,
        };
      });

    logger.info(`Retrieved ${topProducts.length} top selling products`);
    return topProducts;
  } catch (error) {
    logger.error('Error getting top selling products:', error);
    throw error;
  }
}

/**
 * Get weekly sales data for the last 7 days
 */
export async function getWeeklySalesData(): Promise<WeeklySalesData[]> {
  try {
    const pool = getConnectionPool();
    
    // Get last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const result = await pool
      .request()
      .input('startDate', sql.DateTime, sevenDaysAgo)
      .query(`
        SELECT 
          CAST(t.Time AS DATE) AS SaleDate,
          SUM(t.Total) AS DailySales,
          COUNT(DISTINCT t.TransactionNumber) AS DailyTransactions
        FROM [Transaction] t
        WHERE t.Time >= @startDate
        GROUP BY CAST(t.Time AS DATE)
        ORDER BY SaleDate
      `);

    // Create a map of all 7 days
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData: WeeklySalesData[] = [];
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayName = daysOfWeek[date.getDay()];
      
      // Find matching data
      const dayData = result.recordset.find((row: any) => {
        const rowDate = new Date(row.SaleDate);
        rowDate.setHours(0, 0, 0, 0);
        return rowDate.getTime() === date.getTime();
      });

      weeklyData.push({
        day: dayName,
        sales: dayData ? parseFloat(dayData.DailySales || '0') : 0,
        transactions: dayData ? parseInt(dayData.DailyTransactions || '0', 10) : 0,
      });
    }

    logger.info('Weekly sales data retrieved successfully');
    return weeklyData;
  } catch (error) {
    logger.error('Error getting weekly sales data:', error);
    throw error;
  }
}

