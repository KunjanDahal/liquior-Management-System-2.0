/**
 * Items Repository
 * Handles all database operations for products/items
 */

import sql from 'mssql';
import { getConnectionPool } from '../connection';
import { ItemEntity } from '../types/database.types';
import { itemToProductDto, itemToStockAlertDto } from '../types/dto.types';
import { Product, StockAlert } from '../../../shared/types';
import { Logger } from '../../utils/Logger';

const logger = new Logger('ItemsRepo');

/**
 * Get all items from the database
 */
export async function getAllItems(): Promise<Product[]> {
  try {
    const pool = getConnectionPool();
    const result = await pool.request().query(`
      SELECT 
        i.ID AS ItemID,
        i.ItemLookupCode,
        i.Description AS ItemDescription,
        i.Price,
        i.Quantity,
        i.ReorderPoint,
        i.RestockLevel,
        i.Cost,
        i.ExtendedDescription,
        i.Inactive,
        i.DateCreated,
        i.LastUpdated AS DateModified,
        NULL AS SupplierName
      FROM Item i
      WHERE i.Inactive = 0 OR i.Inactive IS NULL
      ORDER BY i.Description
    `);

    const items: Product[] = result.recordset.map((row: ItemEntity & { SupplierName?: string }) =>
      itemToProductDto(row, row.SupplierName)
    );

    logger.info(`Retrieved ${items.length} items from database`);
    return items;
  } catch (error) {
    logger.error('Error getting all items:', error);
    throw error;
  }
}

/**
 * Get item by ID
 */
export async function getItemById(itemId: number): Promise<Product | null> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT 
          i.ID AS ItemID,
          i.ItemLookupCode,
          i.Description AS ItemDescription,
          i.Price,
          i.Quantity,
          i.ReorderPoint,
          i.RestockLevel,
          i.Cost,
          i.ExtendedDescription,
          i.Inactive,
          i.DateCreated,
          i.LastUpdated AS DateModified,
          NULL AS SupplierName
        FROM Item i
        WHERE i.ID = @itemId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0] as ItemEntity & { SupplierName?: string };
    return itemToProductDto(row, row.SupplierName);
  } catch (error) {
    logger.error(`Error getting item ${itemId}:`, error);
    throw error;
  }
}

/**
 * Get low stock items (items at or below reorder point)
 */
export async function getLowStockItems(): Promise<StockAlert[]> {
  try {
    const pool = getConnectionPool();
    const result = await pool.request().query(`
      SELECT 
        i.ID AS ItemID,
        i.ItemLookupCode,
        i.Description AS ItemDescription,
        i.Price,
        i.Quantity,
        i.ReorderPoint,
        i.RestockLevel,
        i.Cost,
        i.ExtendedDescription,
        i.Inactive,
        i.DateCreated,
        i.LastUpdated AS DateModified,
        NULL AS SupplierName
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
    `);

    const alerts: StockAlert[] = result.recordset.map(
      (row: ItemEntity & { SupplierName?: string }) =>
        itemToStockAlertDto(row, row.SupplierName)
    );

    logger.info(`Retrieved ${alerts.length} low stock items`);
    return alerts;
  } catch (error) {
    logger.error('Error getting low stock items:', error);
    throw error;
  }
}

/**
 * Update item quantity (used in transactions)
 * This should typically be called within a transaction
 */
export async function updateItemQuantity(
  itemId: number,
  quantityChange: number,
  transaction?: sql.Transaction
): Promise<void> {
  try {
    const request = transaction
      ? new sql.Request(transaction)
      : getConnectionPool().request();

    await request
      .input('itemId', sql.Int, itemId)
      .input('quantityChange', sql.Decimal(18, 2), quantityChange)
      .query(`
        UPDATE Item
        SET Quantity = Quantity + @quantityChange,
            LastUpdated = GETDATE()
        WHERE ID = @itemId
      `);

    logger.info(`Updated quantity for item ${itemId} by ${quantityChange}`);
  } catch (error) {
    logger.error(`Error updating item quantity for ${itemId}:`, error);
    throw error;
  }
}

/**
 * Check if item has sufficient stock
 */
export async function checkItemStock(itemId: number, requestedQuantity: number): Promise<boolean> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT Quantity
        FROM Item
        WHERE ID = @itemId
      `);

    if (result.recordset.length === 0) {
      return false;
    }

    const currentQuantity = result.recordset[0].Quantity || 0;
    return currentQuantity >= requestedQuantity;
  } catch (error) {
    logger.error(`Error checking stock for item ${itemId}:`, error);
    throw error;
  }
}


