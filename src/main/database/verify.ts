/**
 * Database Verification Utility
 * Verifies that the rmhsample database exists and contains required tables
 */

import { getConnectionPool } from './connection';
import { Logger } from '../utils/Logger';

const logger = new Logger('DatabaseVerify');

export interface VerificationResult {
  success: boolean;
  databaseExists: boolean;
  tablesExist: {
    Item: boolean;
    Transaction: boolean;
    TransactionEntry: boolean;
    TenderEntry: boolean;
    TaxEntry: boolean;
    Customer: boolean;
  };
  errors: string[];
}

const REQUIRED_TABLES = ['Item', 'Transaction', 'TransactionEntry', 'TenderEntry', 'TaxEntry', 'Customer'];

/**
 * Verify database exists
 */
async function verifyDatabaseExists(): Promise<boolean> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .query("SELECT name FROM sys.databases WHERE name = 'rmhsample'");
    return result.recordset.length > 0;
  } catch (error) {
    logger.error('Error verifying database existence:', error);
    return false;
  }
}

/**
 * Verify required tables exist
 */
async function verifyTablesExist(): Promise<Record<string, boolean>> {
  const tableStatus: Record<string, boolean> = {};

  try {
    const pool = getConnectionPool();
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME IN (${REQUIRED_TABLES.map(t => `'${t}'`).join(',')})
    `);

    const existingTables = new Set(
      result.recordset.map((row: { TABLE_NAME: string }) => row.TABLE_NAME)
    );

    for (const table of REQUIRED_TABLES) {
      tableStatus[table] = existingTables.has(table);
    }
  } catch (error) {
    logger.error('Error verifying tables:', error);
    for (const table of REQUIRED_TABLES) {
      tableStatus[table] = false;
    }
  }

  return tableStatus;
}

/**
 * Verify database and required tables
 */
export async function verifyDatabase(): Promise<VerificationResult> {
  const errors: string[] = [];
  let databaseExists = false;
  const tablesExist = {
    Item: false,
    Transaction: false,
    TransactionEntry: false,
    TenderEntry: false,
    TaxEntry: false,
    Customer: false,
  };

  try {
    // Verify database exists
    databaseExists = await verifyDatabaseExists();
    if (!databaseExists) {
      errors.push('Database "rmhsample" not found. Please restore the database from rmhSample.bck');
    }

    // Verify tables exist
    if (databaseExists) {
      const tableStatus = await verifyTablesExist();
      Object.assign(tablesExist, tableStatus);

      // Check for missing tables
      for (const [table, exists] of Object.entries(tablesExist)) {
        if (!exists) {
          errors.push(`Required table "${table}" not found in database`);
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Verification failed: ${errorMessage}`);
    logger.error('Database verification error:', error);
  }

  const success = databaseExists && Object.values(tablesExist).every(exists => exists);

  return {
    success,
    databaseExists,
    tablesExist,
    errors,
  };
}

/**
 * Get table row counts for verification
 */
export async function getTableRowCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  try {
    const pool = getConnectionPool();
    const result = await pool.request().query(`
      SELECT 
        t.name AS TableName,
        p.rows AS RowCount
      FROM sys.tables t
      INNER JOIN sys.partitions p ON t.object_id = p.object_id
      WHERE p.index_id IN (0, 1)
        AND t.name IN (${REQUIRED_TABLES.map(t => `'${t}'`).join(',')})
      ORDER BY t.name
    `);

    for (const row of result.recordset) {
      counts[row.TableName] = row.RowCount;
    }
  } catch (error) {
    logger.error('Error getting table row counts:', error);
  }

  return counts;
}


