import { contextBridge, ipcRenderer } from 'electron';
import { IpcMessage, Product, StockAlert, Transaction, ApiResponse } from '../shared/types';

/**
 * Professional preload script that securely exposes APIs to the renderer process
 */

// Sale payload for creating receipts
export interface SalePayload {
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

// Authentication types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: number;
    username: string;
    email?: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: {
      id: number;
      name: string;
      description?: string;
      permissions?: Record<string, string>;
    };
    mustChangePassword: boolean;
    lastLoginAt?: Date;
  };
  token: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: {
    id: number;
    name: string;
    description?: string;
    permissions?: Record<string, string>;
  };
  mustChangePassword: boolean;
  lastLoginAt?: Date;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Define the API interface
interface ElectronAPI {
  // App information
  getAppInfo: () => Promise<{
    name: string;
    version: string;
    platform: string;
  }>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;

  // Window controls
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;

  // Data operations
  getProducts: () => Promise<ApiResponse<Product[]>>;
  getLowStockProducts: () => Promise<ApiResponse<StockAlert[]>>;
  getRecentReceipts: (limit?: number) => Promise<ApiResponse<Transaction[]>>;
  createSale: (payload: SalePayload) => Promise<ApiResponse<{ id: string }>>;

  // Authentication operations
  login: (request: LoginRequest) => Promise<ApiResponse<LoginResponse>>;
  logout: (token: string, userId?: number) => Promise<ApiResponse<void>>;
  getCurrentUser: (token: string) => Promise<ApiResponse<User>>;
  validateToken: (token: string) => Promise<ApiResponse<User | null>>;
  changePassword: (userId: number, request: ChangePasswordRequest) => Promise<ApiResponse<void>>;

  // Legacy (deprecated)
  saveTransaction: (transactionData: unknown) => Promise<unknown>;

  // Generic message handler
  sendMessage: <T>(message: IpcMessage<T>) => Promise<unknown>;
}

// Create the API object
const electronAPI: ElectronAPI = {
  // App information
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Data operations
  getProducts: () => ipcRenderer.invoke('data:get-products'),
  getLowStockProducts: () => ipcRenderer.invoke('data:get-low-stock'),
  getRecentReceipts: (limit?: number) => ipcRenderer.invoke('data:get-recent-receipts', limit),
  createSale: (payload: SalePayload) => ipcRenderer.invoke('data:create-receipt', payload),

  // Authentication operations
  login: (request: LoginRequest) => ipcRenderer.invoke('auth:login', request),
  logout: (token: string, userId?: number) => ipcRenderer.invoke('auth:logout', token, userId),
  getCurrentUser: (token: string) => ipcRenderer.invoke('auth:get-current-user', token),
  validateToken: (token: string) => ipcRenderer.invoke('auth:validate-token', token),
  changePassword: (userId: number, request: ChangePasswordRequest) =>
    ipcRenderer.invoke('auth:change-password', userId, request),

  // Legacy (deprecated)
  saveTransaction: (transactionData: unknown) =>
    ipcRenderer.invoke('data:save-transaction', transactionData),

  // Generic message handler
  sendMessage: <T>(message: IpcMessage<T>) =>
    ipcRenderer.invoke('message:send', message),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Log successful preload
console.log('Preload script loaded successfully');
