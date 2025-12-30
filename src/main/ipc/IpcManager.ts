import { BrowserWindow, ipcMain } from 'electron';
import { IpcMessage } from '../../shared/types';
import { Logger } from '../utils/Logger';
import { getAllItems, getLowStockItems } from '../database/repositories/items.repo';
import { getRecentReceipts, createReceipt } from '../database/repositories/receipts.repo';
import { getDashboardStats, getTopSellingProducts, getWeeklySalesData } from '../database/repositories/dashboard.repo';
import { getAllSuppliers, createSupplier, updateSupplier, CreateSupplierPayload, UpdateSupplierPayload } from '../database/repositories/suppliers.repo';
import { getSoldItemsBySupplier, createPurchaseOrder, CreatePurchaseOrderPayload } from '../database/repositories/purchase-orders.repo';
import { CreateSalePayload, LoginRequest, ChangePasswordRequest } from '../database/types/dto.types';
import { isDatabaseReady, getInitializationError } from '../database/connection';
import { login, logout, getCurrentUser, changePassword } from '../auth/auth.service';

export class IpcManager {
  private logger = new Logger('IpcManager');

  initialize(): void {
    this.logger.info('Initializing IPC handlers...');

    // Register IPC handlers
    this.registerAppHandlers();
    this.registerWindowHandlers();
    this.registerAuthHandlers();
    this.registerDataHandlers();

    this.logger.info('IPC handlers initialized successfully');
  }

  private registerAppHandlers(): void {
    // App info
    ipcMain.handle('app:get-info', () => {
      return {
        name: 'Liquor Store Management System',
        version: '1.0.1',
        platform: process.platform,
        arch: process.arch,
      };
    });

    // App version
    ipcMain.handle('app:get-version', () => {
      return '1.0.1';
    });

    // Platform info
    ipcMain.handle('app:get-platform', () => {
      return process.platform;
    });
  }

  private registerAuthHandlers(): void {
    // User login
    ipcMain.handle('auth:login', async (_, loginRequest: LoginRequest, ipAddress?: string, userAgent?: string) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for auth:login');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        // Extract IP and user agent from event if available
        const loginResponse = await login(loginRequest, ipAddress, userAgent);
        return {
          success: true,
          data: loginResponse,
          message: 'Login successful',
        };
      } catch (error) {
        this.logger.error('Login failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Login failed';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Get current user
    ipcMain.handle('auth:get-current-user', async (_, token: string) => {
      if (!isDatabaseReady()) {
        return {
          success: false,
          data: null,
          error: 'Database connection not ready',
        };
      }

      try {
        const user = await getCurrentUser(token);
        if (!user) {
          return {
            success: false,
            data: null,
            error: 'Invalid or expired token',
          };
        }
        return {
          success: true,
          data: user,
          message: 'User retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get current user:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get current user';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Validate token
    ipcMain.handle('auth:validate-token', async (_, token: string) => {
      if (!isDatabaseReady()) {
        return {
          success: false,
          data: null,
          error: 'Database connection not ready',
        };
      }

      try {
        const user = await getCurrentUser(token);
        return {
          success: !!user,
          data: user,
          message: user ? 'Token is valid' : 'Token is invalid or expired',
        };
      } catch (error) {
        this.logger.error('Token validation failed:', error);
        return {
          success: false,
          data: null,
          error: 'Token validation failed',
        };
      }
    });

    // Logout
    ipcMain.handle('auth:logout', async (_, token: string, userId?: number) => {
      if (!isDatabaseReady()) {
        return {
          success: false,
          error: 'Database connection not ready',
        };
      }

      try {
        await logout(token, userId);
        return {
          success: true,
          message: 'Logged out successfully',
        };
      } catch (error) {
        this.logger.error('Logout failed:', error);
        // Logout should always succeed
        return {
          success: true,
          message: 'Logged out',
        };
      }
    });

    // Change password
    ipcMain.handle('auth:change-password', async (_, userId: number, changeRequest: ChangePasswordRequest, ipAddress?: string, userAgent?: string) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for auth:change-password');
        return {
          success: false,
          error: errorMsg,
        };
      }

      try {
        await changePassword(userId, changeRequest, ipAddress, userAgent);
        return {
          success: true,
          message: 'Password changed successfully',
        };
      } catch (error) {
        this.logger.error('Password change failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
        return {
          success: false,
          error: errorMessage,
        };
      }
    });
  }

  private registerWindowHandlers(): void {
    // Minimize window
    ipcMain.handle('window:minimize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.minimize();
      }
    });

    // Maximize/Restore window
    ipcMain.handle('window:toggle-maximize', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        if (focusedWindow.isMaximized()) {
          focusedWindow.unmaximize();
        } else {
          focusedWindow.maximize();
        }
      }
    });

    // Close window
    ipcMain.handle('window:close', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.close();
      }
    });

    // Check if window is maximized
    ipcMain.handle('window:is-maximized', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      return focusedWindow ? focusedWindow.isMaximized() : false;
    });
  }

  private registerDataHandlers(): void {
    // Get all products
    ipcMain.handle('data:get-products', async () => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:get-products');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        const products = await getAllItems();
        return {
          success: true,
          data: products,
          message: 'Products retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get products:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve products';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Get low stock products
    ipcMain.handle('data:get-low-stock', async () => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:get-low-stock');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        const alerts = await getLowStockItems();
        return {
          success: true,
          data: alerts,
          message: 'Low stock items retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get low stock items:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve low stock items';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Get recent receipts
    ipcMain.handle('data:get-recent-receipts', async (_, limit?: number) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:get-recent-receipts');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        const receipts = await getRecentReceipts(limit || 10);
        return {
          success: true,
          data: receipts,
          message: 'Recent receipts retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get recent receipts:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve recent receipts';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Create receipt (POS sale)
    ipcMain.handle('data:create-receipt', async (_, payload: CreateSalePayload) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:create-receipt');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        // Validate payload
        if (!payload.items || payload.items.length === 0) {
          return {
            success: false,
            data: null,
            error: 'Receipt must contain at least one item',
          };
        }

        if (payload.total <= 0) {
          return {
            success: false,
            data: null,
            error: 'Total must be greater than zero',
          };
        }

        this.logger.info('Creating receipt with payload:', payload);
        const receiptId = await createReceipt(payload);
        
        return {
          success: true,
          data: { id: receiptId.toString() },
          message: 'Receipt created successfully',
        };
      } catch (error) {
        this.logger.error('Failed to create receipt:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create receipt';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Legacy handler for backward compatibility (deprecated)
    ipcMain.handle('data:save-transaction', async () => {
      this.logger.warn('data:save-transaction is deprecated, use data:create-receipt instead');
      return {
        success: false,
        data: null,
        error: 'This endpoint is deprecated. Use data:create-receipt instead.',
      };
    });

    // Get dashboard statistics
    ipcMain.handle('data:get-dashboard-stats', async () => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:get-dashboard-stats');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        const stats = await getDashboardStats();
        return {
          success: true,
          data: stats,
          message: 'Dashboard stats retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get dashboard stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve dashboard stats';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Get top selling products
    ipcMain.handle('data:get-top-selling-products', async (_, limit?: number) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:get-top-selling-products');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        const products = await getTopSellingProducts(limit || 5);
        return {
          success: true,
          data: products,
          message: 'Top selling products retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get top selling products:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve top selling products';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Get weekly sales data
    ipcMain.handle('data:get-weekly-sales', async () => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:get-weekly-sales');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        const weeklyData = await getWeeklySalesData();
        return {
          success: true,
          data: weeklyData,
          message: 'Weekly sales data retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get weekly sales data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve weekly sales data';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Get all suppliers
    ipcMain.handle('data:get-suppliers', async () => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:get-suppliers');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        const suppliers = await getAllSuppliers();
        return {
          success: true,
          data: suppliers,
          message: 'Suppliers retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get suppliers:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve suppliers';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Get sold items by supplier and date range
    ipcMain.handle('data:get-sold-items', async (_, supplierId: number | null, startDate: string, endDate: string) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:get-sold-items');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        const soldItems = await getSoldItemsBySupplier(supplierId, startDate, endDate);
        return {
          success: true,
          data: soldItems,
          message: 'Sold items retrieved successfully',
        };
      } catch (error) {
        this.logger.error('Failed to get sold items:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve sold items';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Create purchase order
    ipcMain.handle('data:create-purchase-order', async (_, payload: CreatePurchaseOrderPayload) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:create-purchase-order');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        if (!payload.items || payload.items.length === 0) {
          return {
            success: false,
            data: null,
            error: 'Purchase order must contain at least one item',
          };
        }

        const orderId = await createPurchaseOrder(payload);
        return {
          success: true,
          data: { id: orderId },
          message: 'Purchase order created successfully',
        };
      } catch (error) {
        this.logger.error('Failed to create purchase order:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create purchase order';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Create supplier
    ipcMain.handle('data:create-supplier', async (_, payload: CreateSupplierPayload) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:create-supplier');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        if (!payload.name || payload.name.trim() === '') {
          return {
            success: false,
            data: null,
            error: 'Supplier name is required',
          };
        }

        const supplierId = await createSupplier(payload);
        return {
          success: true,
          data: { id: supplierId },
          message: 'Supplier created successfully',
        };
      } catch (error) {
        this.logger.error('Failed to create supplier:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create supplier';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });

    // Update supplier
    ipcMain.handle('data:update-supplier', async (_, supplierId: number, payload: UpdateSupplierPayload) => {
      if (!isDatabaseReady()) {
        const initError = getInitializationError();
        const errorMsg = initError 
          ? `Database not ready: ${initError.message}`
          : 'Database connection not initialized. Please check SQL Server configuration.';
        this.logger.error('Database not ready for data:update-supplier');
        return {
          success: false,
          data: null,
          error: errorMsg,
        };
      }

      try {
        await updateSupplier(supplierId, payload);
        return {
          success: true,
          data: { id: supplierId },
          message: 'Supplier updated successfully',
        };
      } catch (error) {
        this.logger.error('Failed to update supplier:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update supplier';
        return {
          success: false,
          data: null,
          error: errorMessage,
        };
      }
    });
  }

  // Generic message handler for extensibility
  public handleMessage<T>(message: IpcMessage<T>): unknown {
    this.logger.info('Handling IPC message:', message.type);

    // Add your custom message handling logic here
    switch (message.type) {
      case 'ping':
        return { success: true, data: 'pong' };
      default:
        this.logger.warn('Unknown message type:', message.type);
        return { success: false, error: 'Unknown message type' };
    }
  }
}
