/**
 * Data Transfer Object Types
 * DTOs for transforming database entities to frontend-compatible types
 */

import { Product, Customer, Transaction, TransactionItem, StockAlert } from '../../../shared/types';
import {
  ItemEntity,
  ReceiptEntity,
  ReceiptEntryEntity,
  CustomerEntity,
} from './database.types';

/**
 * Transform ItemEntity to Product DTO
 */
export function itemToProductDto(item: ItemEntity, supplierName?: string): Product {
  return {
    id: item.ItemID.toString(),
    name: item.ItemDescription || 'Unknown Product',
    sku: item.ItemLookupCode || '',
    barcode: item.ItemLookupCode || undefined,
    category: 'Uncategorized', // Will need to join with Category table if available
    price: item.Price || 0,
    cost: item.Cost || 0,
    stock: item.Quantity || 0,
    minStock: item.ReorderPoint || 0,
    maxStock: item.RestockLevel || 0,
    supplier: supplierName || 'Unknown Supplier',
    image: undefined, // Not in database
    description: item.ExtendedDescription || undefined,
    requiresAgeVerification: false, // Will need business logic to determine
    createdAt: item.DateCreated || new Date(),
    updatedAt: item.DateModified || new Date(),
  };
}

/**
 * Transform CustomerEntity to Customer DTO
 */
export function customerToDto(customer: CustomerEntity): Customer {
  return {
    id: customer.CustomerID.toString(),
    firstName: customer.FirstName || '',
    lastName: customer.LastName || '',
    email: customer.Email || undefined,
    phone: customer.Phone || undefined,
    dateOfBirth: customer.DateOfBirth || undefined,
    address: customer.Address || customer.City || customer.State || customer.ZipCode
      ? {
          street: customer.Address || '',
          city: customer.City || '',
          state: customer.State || '',
          zipCode: customer.ZipCode || '',
          country: 'USA', // Default
        }
      : undefined,
    isAgeVerified: false, // Business logic needed
    createdAt: customer.DateCreated || new Date(),
    updatedAt: customer.DateModified || new Date(),
  };
}

/**
 * Transform ReceiptEntity and ReceiptEntryEntity[] to Transaction DTO
 */
export function receiptToTransactionDto(
  receipt: ReceiptEntity,
  entries: ReceiptEntryEntity[],
  items: Array<{ ItemID: number; ItemDescription: string }>
): Transaction {
  const transactionItems: TransactionItem[] = entries.map(entry => {
    const item = items.find(i => i.ItemID === entry.ItemID);
    return {
      productId: entry.ItemID.toString(),
      productName: item?.ItemDescription || 'Unknown Product',
      quantity: entry.Quantity || 0,
      unitPrice: entry.Price || 0,
      totalPrice: entry.Total || 0,
    };
  });

  // Map TenderType to payment method (business logic needed)
  const paymentMethod: 'cash' | 'card' | 'check' = 'cash'; // Default

  // Map Status to transaction status
  const status: 'completed' | 'pending' | 'refunded' | 'cancelled' =
    receipt.Status === 0 ? 'completed' : 'pending';

  return {
    id: receipt.ReceiptID.toString(),
    customerName: 'Walk-in Customer', // Will need to join with Customer table
    customerId: receipt.CustomerID?.toString(),
    items: transactionItems,
    subtotal: receipt.SubTotal || 0,
    tax: receipt.Tax || 0,
    total: receipt.Total || 0,
    paymentMethod,
    status,
    createdAt: receipt.TransactionTime || receipt.DateCreated || new Date(),
    updatedAt: receipt.DateCreated || new Date(),
  };
}

/**
 * Create StockAlert DTO from ItemEntity
 */
export function itemToStockAlertDto(item: ItemEntity, supplierName?: string): StockAlert {
  const currentStock = item.Quantity || 0;
  const minStock = item.ReorderPoint || 0;
  const isOutOfStock = currentStock === 0;
  const isLowStock = currentStock > 0 && currentStock <= minStock;

  let priority: 'low' | 'medium' | 'high' | 'critical';
  if (isOutOfStock) {
    priority = 'critical';
  } else if (isLowStock && currentStock <= minStock * 0.5) {
    priority = 'high';
  } else if (isLowStock) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  return {
    id: item.ItemID.toString(),
    productId: item.ItemID.toString(),
    productName: item.ItemDescription || 'Unknown Product',
    sku: item.ItemLookupCode || '',
    category: 'Uncategorized',
    currentStock,
    minStock,
    maxStock: item.RestockLevel || 0,
    priority,
    supplier: supplierName || 'Unknown Supplier',
    lastRestockDate: new Date(), // Will need to track this
    daysUntilOut: isOutOfStock ? 0 : Math.ceil(currentStock / 10), // Rough estimate
    isOutOfStock,
    createdAt: item.DateCreated || new Date(),
    updatedAt: item.DateModified || new Date(),
  };
}

/**
 * Sale payload for creating a new receipt
 */
export interface CreateSalePayload {
  items: Array<{
    itemId: number;
    quantity: number;
    price: number;
  }>;
  customerId?: number;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'check';
  tenderAmount: number;
  change?: number;
}

/**
 * Authentication DTOs
 */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserDTO;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface UserDTO {
  id: number;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: RoleDTO;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
}

export interface RoleDTO {
  id: number;
  name: string;
  description?: string;
  permissions?: Record<string, string>;
}

export interface CreateUserRequest {
  username: string;
  email?: string;
  password: string;
  firstName: string;
  lastName: string;
  roleID: number;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  roleID?: number;
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

