/**
 * Customers Repository
 * Handles all database operations for customers
 */

import sql from 'mssql';
import { getConnectionPool } from '../connection';
import { CustomerEntity } from '../types/database.types';
import { customerToDto } from '../types/dto.types';
import { Customer } from '../../../shared/types';
import { Logger } from '../../utils/Logger';

const logger = new Logger('CustomersRepo');

/**
 * Get all customers from the database
 */
export async function getAllCustomers(): Promise<Customer[]> {
  try {
    const pool = getConnectionPool();
    const result = await pool.request().query(`
      SELECT 
        CustomerID,
        FirstName,
        LastName,
        Phone,
        Email,
        Address,
        City,
        State,
        ZipCode,
        DateOfBirth,
        DateCreated,
        DateModified,
        Inactive
      FROM Customer
      WHERE Inactive = 0 OR Inactive IS NULL
      ORDER BY LastName, FirstName
    `);

    const customers: Customer[] = result.recordset.map((row: CustomerEntity) =>
      customerToDto(row)
    );

    logger.info(`Retrieved ${customers.length} customers from database`);
    return customers;
  } catch (error) {
    logger.error('Error getting all customers:', error);
    throw error;
  }
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: number): Promise<Customer | null> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('customerId', sql.Int, customerId)
      .query(`
        SELECT 
          CustomerID,
          FirstName,
          LastName,
          Phone,
          Email,
          Address,
          City,
          State,
          ZipCode,
          DateOfBirth,
          DateCreated,
          DateModified,
          Inactive
        FROM Customer
        WHERE CustomerID = @customerId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0] as CustomerEntity;
    return customerToDto(row);
  } catch (error) {
    logger.error(`Error getting customer ${customerId}:`, error);
    throw error;
  }
}


