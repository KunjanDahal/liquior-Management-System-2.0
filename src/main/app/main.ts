import { app, BrowserWindow } from 'electron';
import { IpcManager } from '../ipc/IpcManager';
import { Logger } from '../utils/Logger';
import { WindowManager } from '../windows/WindowManager';
import { initializeDatabase, closeDatabase, testItemTableAccess, isDatabaseReady } from '../database/connection';
import { verifyDatabase } from '../database/verify';

// Initialize logger
const logger = new Logger('Main');

// Production-level error handling
process.on('uncaughtException', error => {
  logger.error('Uncaught exception:', error);
  // In production, you might want to save to file or send to monitoring service
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled rejection:', reason);
});

class LiquorStoreApp {
  private windowManager: WindowManager;
  private ipcManager: IpcManager;

  constructor() {
    this.windowManager = new WindowManager();
    this.ipcManager = new IpcManager();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Liquor Store Management System...');

      // Wait for Electron to be ready
      await app.whenReady();

      // Initialize database connection
      let dbInitialized = false;
      try {
        logger.info('Starting database initialization...');
        await initializeDatabase();
        dbInitialized = true;
        
        // Test Item table access (critical for POS)
        logger.info('Testing Item table access...');
        const itemTest = await testItemTableAccess();
        if (itemTest.success) {
          logger.info(`✅ Item table accessible (${itemTest.rowCount || 0} row(s) returned)`);
        } else {
          logger.warn(`⚠️ Item table access test failed: ${itemTest.error}`);
        }
        
        // Verify database structure
        const verification = await verifyDatabase();
        if (!verification.success) {
          logger.warn('Database verification failed:', verification.errors);
          logger.warn('Some features may not work correctly. Please check database setup.');
        } else {
          logger.info('✅ Database verified successfully');
        }
      } catch (error) {
        dbInitialized = false;
        logger.error('='.repeat(60));
        logger.error('❌ Database initialization failed');
        logger.error('='.repeat(60));
        logger.error('Error details:', error);
        logger.error('');
        logger.error('The application will continue to start, but data features will be unavailable.');
        logger.error('Please fix SQL Server connection issues and restart the application.');
        logger.error('');
        logger.error('To test database connection, run:');
        logger.error('  npx ts-node src/main/database/test-db.ts');
        logger.error('='.repeat(60));
      }
      
      // Log final database status
      if (dbInitialized && isDatabaseReady()) {
        logger.info('✅ Database is ready for use');
      } else {
        logger.warn('⚠️ Database is NOT ready - IPC data handlers will return errors');
      }

      // Initialize IPC handlers
      this.ipcManager.initialize();

      // Create main window
      await this.windowManager.createMainWindow();

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  public setupAppEvents(): void {
    // Quit when all windows are closed (except on macOS)
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // On macOS, re-create window when dock icon is clicked
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createMainWindow();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        logger.warn('Prevented new window creation to:', url);
        return { action: 'deny' };
      });
    });

    // Close database connection on app quit
    app.on('will-quit', async () => {
      try {
        await closeDatabase();
      } catch (error) {
        logger.error('Error closing database on app quit:', error);
      }
    });
  }
}

// Create and initialize the application
const liquorStoreApp = new LiquorStoreApp();

// Setup app events
liquorStoreApp.setupAppEvents();

// Initialize the application
liquorStoreApp.initialize().catch(error => {
  logger.error('Application startup failed:', error);
  app.quit();
});

export default liquorStoreApp;
