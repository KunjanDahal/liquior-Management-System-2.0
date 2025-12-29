# PowerShell script to find SQL Server port
# Run this if localhost,1433 doesn't work

Write-Host "Finding SQL Server SQLEXPRESS port..." -ForegroundColor Cyan
Write-Host ""

# Method 1: Check SQL Server Configuration Manager registry
$regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL"
$instanceName = "SQLEXPRESS"

if (Test-Path $regPath) {
    $instanceId = Get-ItemProperty -Path $regPath -Name $instanceName -ErrorAction SilentlyContinue
    
    if ($instanceId) {
        $instanceIdValue = $instanceId.$instanceName
        Write-Host "Found instance ID: $instanceIdValue" -ForegroundColor Green
        
        # Check TCP/IP port in registry
        $tcpPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instanceIdValue\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"
        
        if (Test-Path $tcpPath) {
            $tcpPort = Get-ItemProperty -Path $tcpPath -Name "TcpPort" -ErrorAction SilentlyContinue
            $tcpDynamicPort = Get-ItemProperty -Path $tcpPath -Name "TcpDynamicPorts" -ErrorAction SilentlyContinue
            
            Write-Host ""
            Write-Host "TCP/IP Configuration:" -ForegroundColor Yellow
            
            if ($tcpDynamicPort) {
                Write-Host "  Dynamic Port: $($tcpDynamicPort.TcpDynamicPorts)" -ForegroundColor Green
                Write-Host ""
                Write-Host "✅ Use this in .env:" -ForegroundColor Green
                Write-Host "   DB_SERVER=localhost,$($tcpDynamicPort.TcpDynamicPorts)" -ForegroundColor White
            } elseif ($tcpPort) {
                Write-Host "  Static Port: $($tcpPort.TcpPort)" -ForegroundColor Green
                Write-Host ""
                Write-Host "✅ Use this in .env:" -ForegroundColor Green
                Write-Host "   DB_SERVER=localhost,$($tcpPort.TcpPort)" -ForegroundColor White
            } else {
                Write-Host "  ⚠️  Port not found in registry" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  TCP/IP configuration path not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  SQLEXPRESS instance not found in registry" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  SQL Server registry path not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Alternative: Check SQL Server Error Log" -ForegroundColor Cyan
Write-Host "  Run in SQL Server Management Studio:" -ForegroundColor White
Write-Host "  SELECT local_net_address, local_tcp_port FROM sys.dm_exec_connections WHERE session_id = @@SPID" -ForegroundColor Gray
Write-Host ""

# Method 2: Try to query SQL Server directly (if it's running)
Write-Host "Attempting to query SQL Server for port..." -ForegroundColor Cyan
try {
    $connectionString = "Server=localhost\SQLEXPRESS;Integrated Security=true;Connection Timeout=5;"
    $connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()
    
    $command = $connection.CreateCommand()
    $command.CommandText = "SELECT local_net_address, local_tcp_port FROM sys.dm_exec_connections WHERE session_id = @@SPID"
    $reader = $command.ExecuteReader()
    
    if ($reader.Read()) {
        $port = $reader["local_tcp_port"]
        Write-Host ""
        Write-Host "✅ Found port via SQL query: $port" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ Use this in .env:" -ForegroundColor Green
        Write-Host "   DB_SERVER=localhost,$port" -ForegroundColor White
    }
    
    $reader.Close()
    $connection.Close()
} catch {
    Write-Host "  ⚠️  Could not query SQL Server (may not be running or accessible)" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "If all methods fail, check SQL Server Configuration Manager manually:" -ForegroundColor Cyan
Write-Host "  1. Open SQL Server Configuration Manager" -ForegroundColor White
Write-Host "  2. SQL Server Network Configuration > Protocols for SQLEXPRESS" -ForegroundColor White
Write-Host "  3. TCP/IP > Properties > IP Addresses tab" -ForegroundColor White
Write-Host "  4. Scroll to IPAll section" -ForegroundColor White
Write-Host "  5. Check 'TCP Dynamic Ports' or 'TCP Port' value" -ForegroundColor White
Write-Host ""

