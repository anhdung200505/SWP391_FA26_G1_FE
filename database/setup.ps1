$ErrorActionPreference = 'Stop'
$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
$localdb = 'C:\Program Files\Microsoft SQL Server\170\Tools\Binn\SqlLocalDB.exe'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

& $localdb start MSSQLLocalDB
& $sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -f 65001 -i (Join-Path $root '01_schema.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '02_seed.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '03_payment_class_id.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '04_support_request.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '05_payment_pending_unique.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $sqlcmd -S '(localdb)\MSSQLLocalDB' -E -b -f 65001 -d AnhDuySport -i (Join-Path $root '07_membership_renewal.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Output 'AnhDuySport is ready on (localdb)\MSSQLLocalDB'
