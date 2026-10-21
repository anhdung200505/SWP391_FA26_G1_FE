$ErrorActionPreference = 'Stop'
$sqlcmd = 'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
$server = '(localdb)\MSSQLLocalDB'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$scripts = @(
    '02_seed.sql',
    '03_payment_class_id.sql',
    '04_support_request.sql',
    '05_guest_role.sql',
    '06_remove_guest_role.sql',
    '05_payment_pending_unique.sql',
    '06_payment_payos.sql',
    '07_payment_qr.sql',
    '08_payment_cancel_history.sql',
    '07_membership_renewal.sql',
    '07_pending_registration.sql',
    '08_ai_workout_recommendation.sql',
    '10_password_reset.sql'
)

& $sqlcmd -S $server -E -b -f 65001 -i (Join-Path $root '01_schema.sql')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

foreach ($script in $scripts) {
    & $sqlcmd -S $server -E -b -f 65001 -d AnhDuySport -i (Join-Path $root $script)
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Output "AnhDuySport is ready on $server"
