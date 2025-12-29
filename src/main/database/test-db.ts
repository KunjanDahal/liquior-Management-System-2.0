/**
 * Standalone Database Connection Test Script
 * Run this script to verify SQL Server connection before starting the app
 * 
 * Usage: npx ts-node src/main/database/test-db.ts
 */

import dotenv from 'dotenv';
import sql from 'mssql';
import { getDatabaseConfig } from './connection';

// Load environment variables
dotenv.config();

async function testDatabaseConnection(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('SQL Server Connection Test');
  console.log('='.repeat(70) + '\n');

  // Get configuration
  const config = getDatabaseConfig();
  
  console.log('Configuration:');
  console.log(`  Server: ${config.server}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}`);
  console.log(`  Password: ${config.password ? '***' : 'NOT SET'}`);
  console.log(`  Encrypt: ${config.encrypt}`);
  console.log(`  Trust Certificate: ${config.trustServerCertificate}`);
  console.log('');

  // Create connection config
  const poolConfig: sql.config = {
    server: config.server,
    database: config.database,
    authentication: {
      type: 'default',
      options: {
        userName: config.user,
        password: config.password,
      },
    },
    options: {
      encrypt: config.encrypt,
      trustServerCertificate: config.trustServerCertificate,
      enableArithAbort: true,
      connectTimeout: 15000,
      requestTimeout: 30000,
    },
    pool: {
      max: 1,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('Attempting to connect to SQL Server...');
    console.log('');

    pool = await sql.connect(poolConfig);

    console.log('✅ Connection established successfully!\n');

    // Test 1: Server info
    console.log('Test 1: Server Information');
    console.log('-'.repeat(70));
    try {
      const serverInfo = await pool.request().query(`
        SELECT 
          @@VERSION as version,
          @@SERVERNAME as server_name,
          DB_NAME() as current_database,
          SUSER_SNAME() as current_user
      `);
      
      if (serverInfo.recordset.length > 0) {
        const info = serverInfo.recordset[0];
        console.log(`  SQL Server Version: ${(info.version as string).substring(0, 80)}...`);
        console.log(`  Server Name: ${info.server_name}`);
        console.log(`  Current Database: ${info.current_database}`);
        console.log(`  Current User: ${info.current_user}`);
        console.log('  ✅ Server info retrieved successfully\n');
      }
    } catch (error) {
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    // Test 2: Database exists
    console.log('Test 2: Database Verification');
    console.log('-'.repeat(70));
    try {
      const dbCheck = await pool.request().query(`
        SELECT name FROM sys.databases WHERE name = '${config.database}'
      `);
      
      if (dbCheck.recordset.length > 0) {
        console.log(`  ✅ Database "${config.database}" exists\n`);
      } else {
        console.log(`  ❌ Database "${config.database}" not found\n`);
      }
    } catch (error) {
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    // Test 3: Item table access
    console.log('Test 3: Item Table Access');
    console.log('-'.repeat(70));
    try {
      const itemTest = await pool.request().query('SELECT TOP 1 * FROM Item');
      console.log(`  ✅ Item table accessible (${itemTest.recordset.length} row(s) returned)\n`);
    } catch (error) {
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('  This may indicate the table does not exist or permissions are insufficient\n');
    }

    // Test 4: Table list
    console.log('Test 4: Required Tables Check');
    console.log('-'.repeat(70));
    try {
      const tablesCheck = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME IN ('Item', 'Transaction', 'TransactionEntry', 'TenderEntry', 'TaxEntry', 'Customer')
        ORDER BY TABLE_NAME
      `);
      
      const requiredTables = ['Item', 'Transaction', 'TransactionEntry', 'TenderEntry', 'TaxEntry', 'Customer'];
      const foundTables = tablesCheck.recordset.map((row: { TABLE_NAME: string }) => row.TABLE_NAME);
      
      console.log('  Required tables:');
      for (const table of requiredTables) {
        const exists = foundTables.includes(table);
        console.log(`    ${exists ? '✅' : '❌'} ${table}`);
      }
      console.log('');
    } catch (error) {
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }

    console.log('='.repeat(70));
    console.log('✅ All connection tests completed successfully!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.log('='.repeat(70));
    console.log('❌ Connection Failed');
    console.log('='.repeat(70));
    console.log(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log(`Error Code: ${(error as any).code || 'UNKNOWN'}\n`);

    // Provide troubleshooting steps
    if (error instanceof Error) {
      if (error.message.includes('ETIMEOUT') || error.message.includes('timeout')) {
        console.log('🔧 TROUBLESHOOTING: Connection Timeout\n');
        console.log('1. Verify SQL Server service is running:');
        console.log('   - Press Win+R, type "services.msc", press Enter');
        console.log('   - Find "SQL Server (SQLEXPRESS)" or "SQL Server (MSSQLSERVER)"');
        console.log('   - Right-click > Start (if stopped)');
        console.log('');
        console.log('2. Verify instance name:');
        console.log(`   - Current: ${config.server}`);
        console.log('   - Common alternatives:');
        console.log('     * localhost');
        console.log('     * .\\SQLEXPRESS');
        console.log('     * (local)\\SQLEXPRESS');
        console.log('     * localhost\\MSSQLSERVER (for default instance)');
        console.log('');
        console.log('3. Enable TCP/IP in SQL Server Configuration Manager:');
        console.log('   - Press Win+R, type "SQLServerManagerXX.msc" (XX = version number)');
        console.log('   - Or search "SQL Server Configuration Manager" in Start menu');
        console.log('   - Navigate to: SQL Server Network Configuration > Protocols for SQLEXPRESS');
        console.log('   - Right-click "TCP/IP" > Enable');
        console.log('   - Double-click TCP/IP > IP Addresses tab');
        console.log('   - Scroll to "IPAll" section');
        console.log('   - Note the "TCP Port" (usually 1433)');
        console.log('   - Click OK and restart SQL Server service');
        console.log('');
        console.log('4. Check Windows Firewall:');
        console.log('   - Open Windows Defender Firewall');
        console.log('   - Ensure port 1433 (or the port from step 3) is allowed');
        console.log('');
      } else if (error.message.includes('Login failed') || error.message.includes('authentication')) {
        console.log('🔧 TROUBLESHOOTING: Authentication Failed\n');
        console.log('1. Verify credentials:');
        console.log(`   - User: ${config.user}`);
        console.log(`   - Password: ${config.password ? 'Set' : 'NOT SET'}`);
        console.log('');
        console.log('2. Enable SQL Server Authentication:');
        console.log('   - Open SQL Server Management Studio (SSMS)');
        console.log('   - Connect to server');
        console.log('   - Right-click server > Properties > Security');
        console.log('   - Select "SQL Server and Windows Authentication mode"');
        console.log('   - Click OK and restart SQL Server service');
        console.log('');
        console.log('3. Verify user exists and has permissions:');
        console.log('   - In SSMS, expand Security > Logins');
        console.log('   - Verify your user exists');
        console.log('   - Right-click user > Properties > User Mapping');
        console.log('   - Ensure "rmhsample" database is checked');
        console.log('');
      } else if (error.message.includes('Cannot open database')) {
        console.log('🔧 TROUBLESHOOTING: Database Not Found\n');
        console.log(`1. Verify database "${config.database}" exists:`);
        console.log('   - Open SQL Server Management Studio');
        console.log('   - Connect to server');
        console.log('   - Expand Databases');
        console.log(`   - Look for "${config.database}"`);
        console.log('');
        console.log('2. Restore database if needed:');
        console.log('   - Right-click Databases > Restore Database');
        console.log('   - Source: Device > Browse > Select rmhSample.bck');
        console.log('   - Click OK to restore');
        console.log('');
      }
    }

    console.log('='.repeat(70) + '\n');
    process.exit(1);
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// Run the test
testDatabaseConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

