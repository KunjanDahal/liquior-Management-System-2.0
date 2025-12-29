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
import { checkItemStock, updateItemQuantity } from './items.repo';

const logger = new Logger('ReceiptsRepo');

/**
 * Create a new receipt with full transaction support
 * This is a CRITICAL function that must use SQL transactions
 */
export async function createReceipt(payload: CreateSalePayload): Promise<number> {
  const transaction = new sql.Transaction(getConnectionPool());

  try {
    await transaction.begin();

    logger.info('Starting receipt creation transaction');

    // Step 1: Validate stock availability for all items (before transaction)
    // We check stock before starting the transaction to avoid unnecessary rollbacks
    for (const item of payload.items) {
      const hasStock = await checkItemStock(item.itemId, item.quantity);
      if (!hasStock) {
        throw new Error(`Insufficient stock for item ${item.itemId}`);
      }
    }

    // Step 2: Insert Transaction record (not Receipt - Receipt is for templates)
    const receiptRequest = new sql.Request(transaction);
    const receiptResult = await receiptRequest
      .input('total', sql.Decimal(18, 2), payload.total)
      .input('salesTax', sql.Decimal(18, 2), payload.tax)
      .input('customerId', sql.Int, payload.customerId || null)
      .query(`
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
        OUTPUT INSERTED.TransactionNumber
        VALUES (
          GETDATE(),
          @total,
          @salesTax,
          @customerId,
          0,
          0,
          0,
          0
        )
      `);

    const transactionNumber = receiptResult.recordset[0].TransactionNumber;
    logger.info(`Created transaction (TransactionNumber: ${transactionNumber})`);

    // Step 3: Insert TransactionEntry for each item and update Item.Quantity
    for (const item of payload.items) {
      // Insert TransactionEntry (not ReceiptEntry)
      const entryRequest = new sql.Request(transaction);
      await entryRequest
        .input('transactionNumber', sql.Int, transactionNumber)
        .input('itemId', sql.Int, item.itemId)
        .input('quantity', sql.Decimal(18, 2), item.quantity)
        .input('price', sql.Decimal(18, 2), item.price)
        .input('total', sql.Decimal(18, 2), item.price * item.quantity)
        .query(`
          INSERT INTO TransactionEntry (
            TransactionNumber,
            ItemID,
            Quantity,
            Price,
            FullPrice,
            TransactionTime
          )
          VALUES (
            @transactionNumber,
            @itemId,
            @quantity,
            @price,
            @total,
            GETDATE()
          )
        `);

      // Update Item.Quantity (decrease by quantity sold)
      await updateItemQuantity(item.itemId, -item.quantity, transaction);
    }

    // Step 4: Insert TenderEntry (payment method)
    const tenderRequest = new sql.Request(transaction);
    const tenderType = payload.paymentMethod === 'cash' ? 0 : payload.paymentMethod === 'card' ? 1 : 2;
    
    await tenderRequest
      .input('transactionNumber', sql.Int, transactionNumber)
      .input('tenderType', sql.Int, tenderType)
      .input('amount', sql.Decimal(18, 2), payload.tenderAmount)
      .input('change', sql.Decimal(18, 2), payload.change || 0)
      .query(`
        INSERT INTO TenderEntry (
          TransactionNumber,
          TenderType,
          Amount,
          Change
        )
        VALUES (
          @transactionNumber,
          @tenderType,
          @amount,
          @change
        )
      `);

    // Step 5: Tax is already stored in Transaction.SalesTax, so no separate TaxEntry needed
    // (TaxEntry table may exist but is not required for basic functionality)

    // Commit transaction
    await transaction.commit();
    logger.info(`Transaction ${transactionNumber} created successfully`);

    return transactionNumber;
  } catch (error) {
    // Rollback transaction on any error
    await transaction.rollback();
    logger.error('Error creating receipt, transaction rolled back:', error);
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
