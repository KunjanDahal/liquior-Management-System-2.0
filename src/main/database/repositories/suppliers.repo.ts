/**
 * Suppliers Repository
 * Handles all database operations for suppliers
 */

import sql from 'mssql';
import { getConnectionPool } from '../connection';
import { SupplierEntity } from '../types/database.types';
import { Supplier } from '../../../shared/types';
import { Logger } from '../../utils/Logger';

const logger = new Logger('SuppliersRepo');

/**
 * Get all suppliers from the database
 */
export async function getAllSuppliers(): Promise<Supplier[]> {
  try {
    const pool = getConnectionPool();
    const result = await pool.request().query(`
      SELECT 
        ID AS SupplierID,
        SupplierName,
        ContactName,
        PhoneNumber AS Phone,
        EmailAddress AS Email,
        Address,
        City,
        State,
        ZipCode,
        PaymentTerms,
        Active AS IsActive,
        DateCreated,
        LastUpdated
      FROM Supplier
      WHERE Active = 1 OR Active IS NULL
      ORDER BY SupplierName
    `);

    const suppliers: Supplier[] = result.recordset.map((row: SupplierEntity & { IsActive?: boolean; DateCreated?: Date; LastUpdated?: Date }) => ({
      id: String(row.SupplierID),
      name: row.SupplierName || '',
      contactPerson: row.ContactName || '',
      email: row.Email || '',
      phone: row.Phone || '',
      address: {
        street: row.Address || '',
        city: row.City || '',
        state: row.State || '',
        zipCode: row.ZipCode || '',
        country: 'USA',
      },
      paymentTerms: row.PaymentTerms || '',
      isActive: row.IsActive ?? true,
      createdAt: row.DateCreated || new Date(),
      updatedAt: row.LastUpdated || row.DateCreated || new Date(),
    }));

    logger.info(`Retrieved ${suppliers.length} suppliers from database`);
    return suppliers;
  } catch (error) {
    logger.error('Error getting all suppliers:', error);
    throw error;
  }
}

/**
 * Get supplier by ID
 */
export async function getSupplierById(supplierId: number): Promise<Supplier | null> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('supplierId', sql.Int, supplierId)
      .query(`
        SELECT 
          ID AS SupplierID,
          SupplierName,
          ContactName,
          PhoneNumber AS Phone,
          EmailAddress AS Email,
          Address,
          City,
          State,
          ZipCode,
          PaymentTerms,
          Active AS IsActive,
          DateCreated,
          LastUpdated
        FROM Supplier
        WHERE ID = @supplierId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0] as SupplierEntity & { IsActive?: boolean; DateCreated?: Date; LastUpdated?: Date };
    return {
      id: String(row.SupplierID),
      name: row.SupplierName || '',
      contactPerson: row.ContactName || '',
      email: row.Email || '',
      phone: row.Phone || '',
      address: {
        street: row.Address || '',
        city: row.City || '',
        state: row.State || '',
        zipCode: row.ZipCode || '',
        country: 'USA',
      },
      paymentTerms: row.PaymentTerms || '',
      isActive: row.IsActive ?? true,
      createdAt: row.DateCreated || new Date(),
      updatedAt: row.LastUpdated || row.DateCreated || new Date(),
    };
  } catch (error) {
    logger.error(`Error getting supplier ${supplierId}:`, error);
    throw error;
  }
}

/**
 * Create Supplier Payload
 */
export interface CreateSupplierPayload {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  paymentTerms?: string;
  isActive?: boolean;
}

/**
 * Update Supplier Payload
 */
export interface UpdateSupplierPayload {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  paymentTerms?: string;
  isActive?: boolean;
}

/**
 * Create a new supplier
 */
export async function createSupplier(payload: CreateSupplierPayload): Promise<number> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('supplierName', sql.NVarChar, payload.name)
      .input('contactName', sql.NVarChar, payload.contactPerson || null)
      .input('phoneNumber', sql.NVarChar, payload.phone || null)
      .input('emailAddress', sql.NVarChar, payload.email || null)
      .input('address', sql.NVarChar, payload.address?.street || null)
      .input('city', sql.NVarChar, payload.address?.city || null)
      .input('state', sql.NVarChar, payload.address?.state || null)
      .input('zipCode', sql.NVarChar, payload.address?.zipCode || null)
      .input('paymentTerms', sql.NVarChar, payload.paymentTerms || null)
      .input('active', sql.Bit, payload.isActive !== undefined ? payload.isActive : true)
      .query(`
        INSERT INTO Supplier (
          SupplierName,
          ContactName,
          PhoneNumber,
          EmailAddress,
          Address,
          City,
          State,
          ZipCode,
          PaymentTerms,
          Active,
          DateCreated,
          LastUpdated
        )
        OUTPUT INSERTED.ID
        VALUES (
          @supplierName,
          @contactName,
          @phoneNumber,
          @emailAddress,
          @address,
          @city,
          @state,
          @zipCode,
          @paymentTerms,
          @active,
          GETDATE(),
          GETDATE()
        )
      `);

    const supplierId = result.recordset[0].ID;
    logger.info(`Created supplier: ${payload.name} (ID: ${supplierId})`);
    return supplierId;
  } catch (error) {
    logger.error('Error creating supplier:', error);
    throw error;
  }
}

/**
 * Update an existing supplier
 */
export async function updateSupplier(
  supplierId: number,
  payload: UpdateSupplierPayload
): Promise<void> {
  try {
    const pool = getConnectionPool();
    
    // Build dynamic update query
    const updates: string[] = [];
    const request = pool.request();
    
    if (payload.name !== undefined) {
      updates.push('SupplierName = @supplierName');
      request.input('supplierName', sql.NVarChar, payload.name);
    }
    if (payload.contactPerson !== undefined) {
      updates.push('ContactName = @contactName');
      request.input('contactName', sql.NVarChar, payload.contactPerson || null);
    }
    if (payload.phone !== undefined) {
      updates.push('PhoneNumber = @phoneNumber');
      request.input('phoneNumber', sql.NVarChar, payload.phone || null);
    }
    if (payload.email !== undefined) {
      updates.push('EmailAddress = @emailAddress');
      request.input('emailAddress', sql.NVarChar, payload.email || null);
    }
    if (payload.address?.street !== undefined) {
      updates.push('Address = @address');
      request.input('address', sql.NVarChar, payload.address.street || null);
    }
    if (payload.address?.city !== undefined) {
      updates.push('City = @city');
      request.input('city', sql.NVarChar, payload.address.city || null);
    }
    if (payload.address?.state !== undefined) {
      updates.push('State = @state');
      request.input('state', sql.NVarChar, payload.address.state || null);
    }
    if (payload.address?.zipCode !== undefined) {
      updates.push('ZipCode = @zipCode');
      request.input('zipCode', sql.NVarChar, payload.address.zipCode || null);
    }
    if (payload.paymentTerms !== undefined) {
      updates.push('PaymentTerms = @paymentTerms');
      request.input('paymentTerms', sql.NVarChar, payload.paymentTerms || null);
    }
    if (payload.isActive !== undefined) {
      updates.push('Active = @active');
      request.input('active', sql.Bit, payload.isActive);
    }
    
    // Always update LastUpdated
    updates.push('LastUpdated = GETDATE()');
    
    if (updates.length === 1) {
      // Only LastUpdated, nothing to update
      return;
    }
    
    request.input('supplierId', sql.Int, supplierId);
    
    await request.query(`
      UPDATE Supplier
      SET ${updates.join(', ')}
      WHERE ID = @supplierId
    `);
    
    logger.info(`Updated supplier ${supplierId}`);
  } catch (error) {
    logger.error(`Error updating supplier ${supplierId}:`, error);
    throw error;
  }
}

