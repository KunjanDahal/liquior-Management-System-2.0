/**
 * Purchase Orders Repository
 * Handles all database operations for purchase orders
 */

import sql from 'mssql';
import { getConnectionPool } from '../connection';
import { Logger } from '../../utils/Logger';

const logger = new Logger('PurchaseOrdersRepo');

/**
 * Sold Item for Purchase Order
 */
export interface SoldItem {
  itemId: number;
  description: string;
  currentQuantity: number;
  soldQuantity: number;
  reorderPoint?: number;
  cost?: number;
  price?: number;
}

/**
 * Get sold items by date range and supplier
 * Based on the user's SQL query
 */
export async function getSoldItemsBySupplier(
  supplierId: number | null,
  startDate: string,
  endDate: string
): Promise<SoldItem[]> {
  try {
    const pool = getConnectionPool();
    let query = `
      SELECT
        b.ID AS ItemID,
        b.Description,
        b.Quantity AS CurrentQuantity,
        SUM(a.Quantity) AS SoldQuantity,
        b.ReorderPoint,
        b.Cost,
        b.Price
      FROM TransactionEntry a
      INNER JOIN Item b ON b.ID = a.ItemID
      INNER JOIN Supplier c ON c.ID = b.SupplierID
      WHERE FORMAT(a.TransactionTime, 'yyyy-MM-dd') >= @startDate
        AND FORMAT(a.TransactionTime, 'yyyy-MM-dd') <= @endDate
    `;

    const request = pool.request();
    request.input('startDate', sql.VarChar, startDate);
    request.input('endDate', sql.VarChar, endDate);

    if (supplierId !== null) {
      query += ` AND c.ID = @supplierId`;
      request.input('supplierId', sql.Int, supplierId);
    }

    query += `
      GROUP BY b.ID, b.Description, b.Quantity, b.ReorderPoint, b.Cost, b.Price
      ORDER BY b.Description ASC
    `;

    const result = await request.query(query);

    const soldItems: SoldItem[] = result.recordset.map((row: any) => ({
      itemId: row.ItemID,
      description: row.Description || '',
      currentQuantity: row.CurrentQuantity || 0,
      soldQuantity: row.SoldQuantity || 0,
      reorderPoint: row.ReorderPoint || 0,
      cost: row.Cost || 0,
      price: row.Price || 0,
    }));

    logger.info(`Retrieved ${soldItems.length} sold items for supplier ${supplierId || 'all'}`);
    return soldItems;
  } catch (error) {
    logger.error('Error getting sold items:', error);
    throw error;
  }
}

/**
 * Purchase Order Item
 */
export interface PurchaseOrderItem {
  itemId: number;
  quantity: number;
  cost: number;
  price?: number;
}

/**
 * Create Purchase Order
 */
export interface CreatePurchaseOrderPayload {
  supplierId: number;
  items: PurchaseOrderItem[];
  orderDate?: Date;
}

/**
 * Create a purchase order
 * Uses the Order and OrderEntry tables
 */
export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload
): Promise<number> {
  try {
    const pool = getConnectionPool();
    const request = pool.request();

    // Calculate total
    const total = payload.items.reduce(
      (sum, item) => sum + item.cost * item.quantity,
      0
    );

    // Insert Order
    const orderResult = await request
      .input('supplierId', sql.Int, payload.supplierId)
      .input('orderDate', sql.DateTime, payload.orderDate || new Date())
      .input('total', sql.Decimal(18, 2), total)
      .input('status', sql.Int, 0) // 0 = pending
      .input('storeId', sql.Int, 0) // Default store
      .query(`
        INSERT INTO [Order] (
          OrderDate,
          SupplierID,
          Total,
          Status,
          StoreID
        )
        OUTPUT INSERTED.OrderID
        VALUES (
          @orderDate,
          @supplierId,
          @total,
          @status,
          @storeId
        )
      `);

    const orderId = orderResult.recordset[0].OrderID;

    // Insert OrderEntry for each item
    for (const item of payload.items) {
      const entryRequest = pool.request();
      await entryRequest
        .input('orderId', sql.Int, orderId)
        .input('itemId', sql.Int, item.itemId)
        .input('quantity', sql.Decimal(18, 2), item.quantity)
        .input('price', sql.Decimal(18, 2), item.price || item.cost)
        .input('cost', sql.Decimal(18, 2), item.cost)
        .query(`
          INSERT INTO OrderEntry (
            OrderID,
            ItemID,
            Quantity,
            Price,
            Cost
          )
          VALUES (
            @orderId,
            @itemId,
            @quantity,
            @price,
            @cost
          )
        `);
    }

    logger.info(`Created purchase order ${orderId} for supplier ${payload.supplierId}`);
    return orderId;
  } catch (error) {
    logger.error('Error creating purchase order:', error);
    throw error;
  }
}

