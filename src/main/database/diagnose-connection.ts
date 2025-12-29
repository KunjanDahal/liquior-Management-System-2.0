/**
 * Comprehensive Database Connection Diagnostic Script
 * Answers all diagnostic questions to narrow down the exact issue
 * 
 * Usage: npx ts-node src/main/database/diagnose-connection.ts
 */

import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { getDatabaseConfig } from './connection';

// Load environment variables
dotenv.config();

interface DiagnosticResult {
  question: string;
  answer: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'MANUAL_CHECK';
  details?: string;
}

const results: DiagnosticResult[] = [];

function addResult(question: string, answer: string, status: DiagnosticResult['status'], details?: string) {
  results.push({ question, answer, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : status === 'WARNING' ? '⚠️' : '🔍';
  console.log(`${icon} ${question}`);
  console.log(`   Answer: ${answer}`);
  if (details) console.log(`   ${details}`);
  console.log('');
}

console.log('\n' + '='.repeat(70));
console.log('DATABASE CONNECTION DIAGNOSTIC TOOL');
console.log('='.repeat(70) + '\n');

// ============================================================================
// A. SQL Server Reality Check
// ============================================================================
console.log('A. SQL SERVER REALITY CHECK');
console.log('-'.repeat(70));

// A1: Check if SQL Server service exists
try {
  const services = execSync('sc query type= service state= all', { encoding: 'utf-8' });
  const sqlexpressRunning = services.includes('MSSQL$SQLEXPRESS') || services.includes('SQL Server (SQLEXPRESS)');
  const sqlexpressStopped = services.match(/MSSQL\$SQLEXPRESS|SQL Server \(SQLEXPRESS\)/);
  
  if (sqlexpressRunning || sqlexpressStopped) {
    addResult(
      'A1. Is SQL Server Express installed?',
      'Yes',
      'PASS',
      'Found SQL Server (SQLEXPRESS) or MSSQL$SQLEXPRESS service'
    );
  } else {
    addResult(
      'A1. Is SQL Server Express installed?',
      'No',
      'FAIL',
      'SQL Server Express service not found. Install SQL Server Express first.'
    );
  }
} catch (error) {
  addResult(
    'A1. Is SQL Server Express installed?',
    'MANUAL CHECK REQUIRED',
    'MANUAL_CHECK',
    'Could not query services. Please check Services (services.msc) manually.'
  );
}

// A2: Check if SQL Server service is running
try {
  const sqlexpressStatus = execSync('sc query MSSQL$SQLEXPRESS', { encoding: 'utf-8' }).includes('RUNNING') 
    ? 'Running' 
    : execSync('sc query "SQL Server (SQLEXPRESS)"', { encoding: 'utf-8' }).includes('RUNNING')
    ? 'Running'
    : 'Stopped';
  
  if (sqlexpressStatus === 'Running') {
    addResult(
      'A2. Is SQL Server service running?',
      'Running',
      'PASS',
      'Service is running'
    );
  } else {
    addResult(
      'A2. Is SQL Server service running?',
      'Stopped',
      'FAIL',
      'Service is stopped. Start it: net start MSSQL$SQLEXPRESS'
    );
  }
} catch (error) {
  try {
    const status = execSync('sc query "SQL Server (SQLEXPRESS)"', { encoding: 'utf-8' });
    if (status.includes('RUNNING')) {
      addResult('A2. Is SQL Server service running?', 'Running', 'PASS', 'Service is running');
    } else {
      addResult('A2. Is SQL Server service running?', 'Stopped', 'FAIL', 'Service is stopped');
    }
  } catch {
    addResult(
      'A2. Is SQL Server service running?',
      'MANUAL CHECK REQUIRED',
      'MANUAL_CHECK',
      'Open Services (services.msc) and check status of "SQL Server (SQLEXPRESS)"'
    );
  }
}

// A3: Test SSMS connection (manual check)
addResult(
  'A3. Can you connect using SSMS?',
  'MANUAL CHECK REQUIRED',
  'MANUAL_CHECK',
  'Open SQL Server Management Studio (SSMS)\n' +
  '  Server: localhost\\SQLEXPRESS\n' +
  '  Authentication: SQL Server Authentication\n' +
  '  Login: sa\n' +
  '  Password: [your password]\n' +
  'Answer: Yes / No / I don\'t have SSMS'
);

// ============================================================================
// B. Network Layer (ETIMEOUT Eliminator)
// ============================================================================
console.log('\nB. NETWORK LAYER');
console.log('-'.repeat(70));

// B1: TCP/IP Protocol (manual check)
addResult(
  'B1. Is TCP/IP enabled in SQL Server Configuration Manager?',
  'MANUAL CHECK REQUIRED',
  'MANUAL_CHECK',
  '1. Open SQL Server Configuration Manager\n' +
  '2. SQL Server Network Configuration → Protocols for SQLEXPRESS\n' +
  '3. Check if TCP/IP is "Enabled"\n' +
  '4. If disabled, right-click → Enable, then restart SQL Server service\n' +
  'Answer: Enabled / Disabled / Not sure'
);

// B2: SQL Server Browser service
try {
  const browserStatus = execSync('sc query "SQL Browser"', { encoding: 'utf-8' });
  if (browserStatus.includes('RUNNING')) {
    addResult(
      'B2. Is SQL Server Browser service running?',
      'Running',
      'PASS',
      'SQL Browser is running (needed for named instance resolution)'
    );
  } else {
    addResult(
      'B2. Is SQL Server Browser service running?',
      'Stopped',
      'WARNING',
      'SQL Browser is stopped. Start it: net start "SQL Browser"\n' +
      'Note: Required for named instance (SQLEXPRESS) resolution'
    );
  }
} catch (error) {
  addResult(
    'B2. Is SQL Server Browser service running?',
    'Not found',
    'WARNING',
    'SQL Browser service not found or cannot be queried'
  );
}

// B3: Test port connectivity
try {
  const portTest = execSync('Test-NetConnection -ComputerName localhost -Port 1433 -InformationLevel Quiet', { 
    encoding: 'utf-8',
    shell: 'powershell.exe'
  });
  
  if (portTest.trim() === 'True') {
    addResult(
      'B3. Can we connect to port 1433?',
      'TcpTestSucceeded: True',
      'PASS',
      'Port 1433 is open and accepting connections'
    );
  } else {
    addResult(
      'B3. Can we connect to port 1433?',
      'TcpTestSucceeded: False',
      'FAIL',
      'Port 1433 is not accessible. Check:\n' +
      '  1. TCP/IP is enabled in SQL Server Configuration Manager\n' +
      '  2. Firewall allows port 1433\n' +
      '  3. SQL Server is listening on port 1433 (check IPAll in TCP/IP properties)'
    );
  }
} catch (error) {
  addResult(
    'B3. Can we connect to port 1433?',
    'TEST FAILED',
    'WARNING',
    'Could not test port. Run manually: Test-NetConnection localhost -Port 1433'
  );
}

// ============================================================================
// C. Authentication Facts
// ============================================================================
console.log('\nC. AUTHENTICATION FACTS');
console.log('-'.repeat(70));

const config = getDatabaseConfig();

// C1: Check if password is set
if (config.password && config.password.trim() !== '') {
  addResult(
    'C1. Does sa have a non-empty password?',
    'Yes',
    'PASS',
    `Password is set (length: ${config.password.length} characters)`
  );
} else {
  addResult(
    'C1. Does sa have a non-empty password?',
    'No',
    'FAIL',
    'Password is empty or not set in .env file.\n' +
    'This will cause authentication failure even if connection succeeds.'
  );
}

// C2 & C3: Manual checks for SQL Server settings
addResult(
  'C2. Is sa login enabled in SQL Server?',
  'MANUAL CHECK REQUIRED',
  'MANUAL_CHECK',
  'In SSMS:\n' +
  '  1. Connect to server\n' +
  '  2. Security → Logins → sa\n' +
  '  3. Right-click → Properties\n' +
  '  4. Check "Status" → Login: Enabled\n' +
  'Answer: Enabled / Disabled / Not sure'
);

addResult(
  'C3. Is SQL Server in Mixed Mode?',
  'MANUAL CHECK REQUIRED',
  'MANUAL_CHECK',
  'In SSMS:\n' +
  '  1. Right-click server → Properties\n' +
  '  2. Security tab\n' +
  '  3. Server authentication: "SQL Server and Windows Authentication mode"\n' +
  '  4. Restart SQL Server service after changing\n' +
  'Answer: Yes / No / Not sure'
);

// ============================================================================
// D. Runtime Context
// ============================================================================
console.log('\nD. RUNTIME CONTEXT');
console.log('-'.repeat(70));

// D1: Check if running as administrator
try {
  execSync('net session', { encoding: 'utf-8', stdio: 'ignore' });
  addResult(
    'D1. Are you running as Administrator?',
    'Yes',
    'PASS',
    'Running with administrator privileges'
  );
} catch (error) {
  addResult(
    'D1. Are you running as Administrator?',
    'No',
    'WARNING',
    'Not running as administrator. Some checks may fail.\n' +
    'Try running: npm run test:db (as administrator if needed)'
  );
}

// D2: Check if SQL Server is local
addResult(
  'D2. Is SQL Server on local machine?',
  'Assuming Local',
  'PASS',
  'Configuration shows localhost\\SQLEXPRESS (local instance)'
);

// ============================================================================
// E. Environment Loading
// ============================================================================
console.log('\nE. ENVIRONMENT LOADING');
console.log('-'.repeat(70));

// E1: Check if .env file exists
import { existsSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  addResult(
    'E1. Do you have a real .env file?',
    'Yes',
    'PASS',
    `.env file found at: ${envPath}`
  );
} else {
  addResult(
    'E1. Do you have a real .env file?',
    'No',
    'FAIL',
    'No .env file found! Only .env.example exists.\n' +
    'Create .env file from .env.example and set your actual values.'
  );
}

// E2: Check if DB_SERVER is loaded
if (process.env.DB_SERVER) {
  addResult(
    'E2. Is DB_SERVER loaded from .env?',
    'Value printed',
    'PASS',
    `DB_SERVER = "${process.env.DB_SERVER}"`
  );
} else {
  addResult(
    'E2. Is DB_SERVER loaded from .env?',
    'undefined',
    'WARNING',
    'DB_SERVER is undefined. Using default: "localhost\\SQLEXPRESS"'
  );
}

// Show current configuration
console.log('\nCURRENT CONFIGURATION:');
console.log('-'.repeat(70));
console.log(`  Server: ${config.server}`);
console.log(`  Database: ${config.database}`);
console.log(`  User: ${config.user}`);
console.log(`  Password: ${config.password ? '***' + '*'.repeat(Math.min(config.password.length, 10)) : 'NOT SET'}`);
console.log(`  Encrypt: ${config.encrypt}`);
console.log(`  Trust Certificate: ${config.trustServerCertificate}`);
console.log('');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('DIAGNOSTIC SUMMARY');
console.log('='.repeat(70));

const fails = results.filter(r => r.status === 'FAIL').length;
const warnings = results.filter(r => r.status === 'WARNING').length;
const passes = results.filter(r => r.status === 'PASS').length;
const manual = results.filter(r => r.status === 'MANUAL_CHECK').length;

console.log(`\n✅ Passed: ${passes}`);
console.log(`❌ Failed: ${fails}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`🔍 Manual Checks Required: ${manual}`);

if (fails > 0) {
  console.log('\n❌ CRITICAL ISSUES FOUND:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  - ${r.question}: ${r.answer}`);
  });
}

if (warnings > 0) {
  console.log('\n⚠️  WARNINGS:');
  results.filter(r => r.status === 'WARNING').forEach(r => {
    console.log(`  - ${r.question}: ${r.answer}`);
  });
}

if (manual > 0) {
  console.log('\n🔍 MANUAL CHECKS NEEDED:');
  results.filter(r => r.status === 'MANUAL_CHECK').forEach(r => {
    console.log(`  - ${r.question}`);
  });
}

console.log('\n' + '='.repeat(70));
console.log('NEXT STEPS:');
console.log('='.repeat(70));
console.log('1. Answer all MANUAL CHECK questions above');
console.log('2. Fix all FAILED items');
console.log('3. Address WARNINGS if applicable');
console.log('4. Run this diagnostic again to verify fixes');
console.log('5. Once all checks pass, test connection: npm run test:db');
console.log('');

// Export results for programmatic use
export { results };
export type { DiagnosticResult };

