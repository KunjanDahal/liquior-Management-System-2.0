/**
 * Database Entity Types
 * TypeScript interfaces matching the SQL Server database schema
 */

/**
 * Item table entity (products/inventory)
 */
export interface ItemEntity {
  ItemID: number;
  ItemLookupCode?: string;
  ItemDescription?: string;
  Price?: number;
  Quantity?: number;
  ReorderPoint?: number;
  RestockLevel?: number;
  SupplierID?: number;
  CategoryID?: number;
  TaxID?: number;
  ItemType?: number;
  Cost?: number;
  ExtendedDescription?: string;
  Inactive?: boolean;
  DateCreated?: Date;
  DateModified?: Date;
}

/**
 * Receipt table entity (sales transactions)
 */
export interface ReceiptEntity {
  ReceiptID: number;
  ReceiptNumber?: string;
  TransactionTime?: Date;
  SubTotal?: number;
  Tax?: number;
  Total?: number;
  CustomerID?: number;
  StoreID?: number;
  EmployeeID?: number;
  Status?: number;
  Comment?: string;
  DateCreated?: Date;
}

/**
 * ReceiptEntry table entity (line items in a receipt)
 */
export interface ReceiptEntryEntity {
  ReceiptEntryID: number;
  ReceiptID: number;
  ItemID: number;
  Quantity?: number;
  Price?: number;
  Discount?: number;
  Total?: number;
  TaxID?: number;
  DateCreated?: Date;
}

/**
 * TenderEntry table entity (payment methods)
 */
export interface TenderEntryEntity {
  TenderEntryID: number;
  ReceiptID: number;
  TenderType?: number;
  Amount?: number;
  Change?: number;
  Comment?: string;
  DateCreated?: Date;
}

/**
 * TaxEntry table entity (tax calculations)
 */
export interface TaxEntryEntity {
  TaxEntryID: number;
  ReceiptID: number;
  TaxID?: number;
  TaxName?: string;
  TaxRate?: number;
  TaxAmount?: number;
  DateCreated?: Date;
}

/**
 * Customer table entity
 */
export interface CustomerEntity {
  CustomerID: number;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  Email?: string;
  Address?: string;
  City?: string;
  State?: string;
  ZipCode?: string;
  DateOfBirth?: Date;
  DateCreated?: Date;
  DateModified?: Date;
  Inactive?: boolean;
}

/**
 * Supplier table entity (for reference)
 */
export interface SupplierEntity {
  SupplierID: number;
  SupplierName?: string;
  ContactName?: string;
  Phone?: string;
  Email?: string;
  Address?: string;
  City?: string;
  State?: string;
  ZipCode?: string;
  Inactive?: boolean;
}

/**
 * User table entity (authentication)
 */
export interface UserEntity {
  UserID: number;
  Username: string;
  Email?: string;
  PasswordHash: string;
  FirstName: string;
  LastName: string;
  RoleID: number;
  IsActive: boolean;
  MustChangePassword: boolean;
  PasswordChangedAt?: Date;
  LastLoginAt?: Date;
  FailedLoginAttempts: number;
  LockedUntil?: Date;
  CreatedAt: Date;
  UpdatedAt: Date;
  CreatedBy?: number;
  UpdatedBy?: number;
}

/**
 * Role table entity
 */
export interface RoleEntity {
  RoleID: number;
  RoleName: string;
  Description?: string;
  Permissions?: string; // JSON string
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

/**
 * UserSession table entity
 */
export interface UserSessionEntity {
  SessionID: number;
  UserID: number;
  Token: string;
  RefreshToken?: string;
  IPAddress?: string;
  UserAgent?: string;
  ExpiresAt: Date;
  RefreshExpiresAt?: Date;
  IsActive: boolean;
  LastActivityAt: Date;
  CreatedAt: Date;
}

/**
 * AuditLog table entity
 */
export interface AuditLogEntity {
  AuditLogID: number;
  UserID?: number;
  Action: string;
  EntityType?: string;
  EntityID?: number;
  Description?: string;
  IPAddress?: string;
  UserAgent?: string;
  Success: boolean;
  ErrorMessage?: string;
  CreatedAt: Date;
}


