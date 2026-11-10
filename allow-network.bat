@echo off
rem Lets the tablet and phones reach Roundkeeper: removes firewall rules that block it (Roundkeeper.exe, the older TableInitiative.exe, or Python)
rem and opens ports 8765 and 8766 in the Windows firewall. Needs administrator rights.
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs" & exit /b)

echo Removing firewall rules that block Roundkeeper...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$r = Get-NetFirewallRule -Direction Inbound -Action Block -ErrorAction SilentlyContinue | Where-Object { ($_ | Get-NetFirewallApplicationFilter).Program -match 'python|TableInitiative|Roundkeeper' };" ^
  "if ($r) { $r | ForEach-Object { Write-Host ('  removed: ' + $_.DisplayName) }; $r | Remove-NetFirewallRule } else { Write-Host '  no blocking rules found' }"

echo Opening ports 8765 and 8766...
netsh advfirewall firewall delete rule name="Stolni Initiative Tracker" >nul 2>&1
netsh advfirewall firewall delete rule name="Table Initiative Tracker" >nul 2>&1
netsh advfirewall firewall delete rule name="Roundkeeper" >nul 2>&1
netsh advfirewall firewall add rule name="Roundkeeper" dir=in action=allow protocol=TCP localport=8765,8766 profile=any >nul && echo   ports 8765 and 8766 are open

echo.
echo Done. Close the Roundkeeper window and start it again.
pause
