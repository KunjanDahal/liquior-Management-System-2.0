/**
 * Receipts Repository
 * Handles all database operations for POS sales/receipts
 * CRITICAL: All sales operations use SQL transactions for data integrity
 */

import sql from 'mssql';
import { getConnectionPool } from '../connection';
import {
  ReceiptEntity,
  ReceiptEntryEntity,
} from '../types/database.types';
import { receiptToTransactionDto, CreateSalePayload } from '../types/dto.types';
import { Transaction } from '../../../shared/types';
import { Logger } from '../../utils/Logger';
import { checkItemStock } from './items.repo';
import { getValidatedDatabaseConfig } from '../config/validation';
import { createRequire } from 'module';

const logger = new Logger('ReceiptsRepo');

/**
 * Create a new receipt with full transaction support
 * This is a CRITICAL function that must use SQL transactions
 * Uses a single SQL batch to ensure all operations use the same connection
 * Compatible with msnodesqlv8 driver
 */
export async function createReceipt(payload: CreateSalePayload): Promise<number> {
  const pool = getConnectionPool();

  try {
    logger.info('Starting receipt creation transaction');

    // Step 1: Validate stock availability for all items (before transaction)
    // We check stock before starting the transaction to avoid unnecessary rollbacks
    for (const item of payload.items) {
      const hasStock = await checkItemStock(item.itemId, item.quantity);
      if (!hasStock) {
        throw new Error(`Insufficient stock for item ${item.itemId}`);
      }
    }

    // Use 0 as default for CustomerID if not provided (database doesn't allow NULL)
    const customerId = payload.customerId || 0;
    const tenderType = payload.paymentMethod === 'cash' ? 0 : payload.paymentMethod === 'card' ? 1 : 2;

    // Build a single SQL batch that executes all operations in one transaction
    // This ensures all queries use the same connection
    const request = pool.request();
    
    // Set all input parameters
    request.input('total', sql.Decimal(18, 2), payload.total);
    request.input('salesTax', sql.Decimal(18, 2), payload.tax);
    request.input('customerId', sql.Int, customerId);
    request.input('tenderType', sql.Int, tenderType);
    request.input('tenderAmount', sql.Decimal(18, 2), payload.tenderAmount);
    request.input('change', sql.Decimal(18, 2), payload.change || 0);

    // Build the SQL batch with all operations
    let sqlBatch = `
      BEGIN TRANSACTION;
      
      DECLARE @TransactionNumber INT;
      
      -- Insert Transaction record and capture TransactionNumber
      INSERT INTO [Transaction] (
        Time,
        Total,
        SalesTax,
        CustomerID,
        Status,
        BatchNumber,
        CashierID,
        StoreID
      )
      VALUES (
        GETDATE(),
        @total,
        @salesTax,
        @customerId,
        0,
        0,
        0,
        0
      );
      
      SET @TransactionNumber = SCOPE_IDENTITY();
    `;

    // Add TransactionEntry inserts and Item updates for each item
    payload.items.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      request.input(`itemId${index}`, sql.Int, item.itemId);
      request.input(`quantity${index}`, sql.Decimal(18, 2), item.quantity);
      request.input(`price${index}`, sql.Decimal(18, 2), item.price);
      request.input(`itemTotal${index}`, sql.Decimal(18, 2), itemTotal);

      sqlBatch += `
        -- Insert TransactionEntry for item ${index}
        INSERT INTO TransactionEntry (
          TransactionNumber,
          ItemID,
          Quantity,
          Price,
          FullPrice,
          TransactionTime
        )
        VALUES (
          @TransactionNumber,
          @itemId${index},
          @quantity${index},
          @price${index},
          @itemTotal${index},
          GETDATE()
        );
        
        -- Update Item.Quantity
        UPDATE Item
        SET Quantity = Quantity - @quantity${index},
            LastUpdated = GETDATE()
        WHERE ID = @itemId${index};
      `;
    });

    // Add TenderEntry insert
    // Note: Using minimal columns - TenderEntry may have different schema
    // Try with just TransactionNumber and Amount first
    sqlBatch += `
      -- Insert TenderEntry (payment method)
      INSERT INTO TenderEntry (
        TransactionNumber,
        Amount
      )
      VALUES (
        @TransactionNumber,
        @tenderAmount
      );
      
      COMMIT TRANSACTION;
      
      SELECT @TransactionNumber AS TransactionNumber;
    `;

    // Execute the batch
    const result = await request.query(sqlBatch);
    
    // Extract the transaction number from the result
    // The SELECT at the end returns the TransactionNumber
    const transactionNumber = result.recordset[0]?.TransactionNumber;
    
    if (!transactionNumber) {
      throw new Error('Failed to retrieve transaction number');
    }

    logger.info(`Transaction ${transactionNumber} created successfully`);
    return transactionNumber;
  } catch (error) {
    logger.error('Error creating receipt:', error);
    throw error;
  }
}

/**
 * Get recent receipts for dashboard
 */
export async function getRecentReceipts(limit: number = 10): Promise<Transaction[]> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          t.TransactionNumber AS ReceiptID,
          t.TransactionNumber AS ReceiptNumber,
          t.Time AS TransactionTime,
          (t.Total - t.SalesTax) AS SubTotal,
          t.SalesTax AS Tax,
          t.Total,
          t.CustomerID,
          t.Status,
          t.Time AS DateCreated
        FROM [Transaction] t
        ORDER BY t.Time DESC
      `);

    const receipts: Transaction[] = [];

    for (const receiptRow of result.recordset) {
      // Get transaction entries (not ReceiptEntry)
      const entriesResult = await pool
        .request()
        .input('transactionNumber', sql.Int, receiptRow.ReceiptNumber)
        .query(`
          SELECT 
            te.ID AS ReceiptEntryID,
            te.TransactionNumber AS ReceiptID,
            te.ItemID,
            te.Quantity,
            te.Price,
            te.FullPrice AS Total
          FROM TransactionEntry te
          WHERE te.TransactionNumber = @transactionNumber
        `);

      // Get item descriptions
      const itemIds = entriesResult.recordset.map((e: any) => e.ItemID);
      let items: Array<{ ItemID: number; ItemDescription: string }> = [];

      if (itemIds.length > 0) {
        const itemsResult = await pool
          .request()
          .query(`
            SELECT ID AS ItemID, Description AS ItemDescription
            FROM Item
            WHERE ID IN (${itemIds.join(',')})
          `);
        items = itemsResult.recordset;
      }

      const transaction = receiptToTransactionDto(
        receiptRow as ReceiptEntity,
        entriesResult.recordset as ReceiptEntryEntity[],
        items
      );

      receipts.push(transaction);
    }

    logger.info(`Retrieved ${receipts.length} recent transactions`);
    return receipts;
  } catch (error) {
    logger.error('Error getting recent receipts:', error);
    throw error;
  }
}

/**
 * Get receipt by ID
 */
export async function getReceiptById(receiptId: number): Promise<Transaction | null> {
  try {
    const pool = getConnectionPool();
    const receiptResult = await pool
      .request()
      .input('receiptId', sql.Int, receiptId)
      .query(`
        SELECT 
          t.TransactionNumber AS ReceiptID,
          t.TransactionNumber AS ReceiptNumber,
          t.Time AS TransactionTime,
          (t.Total - t.SalesTax) AS SubTotal,
          t.SalesTax AS Tax,
          t.Total,
          t.CustomerID,
          t.Status,
          t.Time AS DateCreated
        FROM [Transaction] t
        WHERE t.TransactionNumber = @receiptId
      `);

    if (receiptResult.recordset.length === 0) {
      return null;
    }

    const receipt = receiptResult.recordset[0] as ReceiptEntity;

    // Get transaction entries (using TransactionNumber as FK)
    const entriesResult = await pool
      .request()
      .input('transactionNumber', sql.Int, receipt.ReceiptNumber)
      .query(`
        SELECT 
          te.ID AS ReceiptEntryID,
          te.TransactionNumber AS ReceiptID,
          te.ItemID,
          te.Quantity,
          te.Price,
          te.FullPrice AS Total
        FROM TransactionEntry te
        WHERE te.TransactionNumber = @transactionNumber
      `);

    // Get item descriptions
    const itemIds = entriesResult.recordset.map((e: ReceiptEntryEntity) => e.ItemID);
    let items: Array<{ ItemID: number; ItemDescription: string }> = [];

    if (itemIds.length > 0) {
      const itemsResult = await pool
        .request()
        .query(`
          SELECT ID AS ItemID, Description AS ItemDescription
          FROM Item
          WHERE ID IN (${itemIds.join(',')})
        `);
      items = itemsResult.recordset;
    }

    return receiptToTransactionDto(
      receipt,
      entriesResult.recordset as ReceiptEntryEntity[],
      items
    );
  } catch (error) {
    logger.error(`Error getting receipt ${receiptId}:`, error);
    throw error;
  }
}
