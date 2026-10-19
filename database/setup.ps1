$ErrorActionPreference = 'Stop'
$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
$server = 'localhost\SQLEXPRESS'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

& $sqlcmd -S $server -E -b -f 65001 -i (Join-Path $root '01_schema.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S $server -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '02_seed.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S $server -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '03_payment_class_id.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S $server -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '04_support_request.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S $server -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '05_guest_role.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S $server -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '06_remove_guest_role.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S $server -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '07_pending_registration.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output 'AnhDuySport is ready on localhost\SQLEXPRESS'
