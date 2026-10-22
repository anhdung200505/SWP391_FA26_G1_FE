$ErrorActionPreference = 'Stop'
$sqlcmd = 'C:\Program Files\Microsoft SQL Server\100\Tools\Binn\SQLCMD.EXE'
$localdb = 'C:\Program Files\Microsoft SQL Server\170\Tools\Binn\SqlLocalDB.exe'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($tool in @($sqlcmd, $localdb)) {
    if (-not (Test-Path $tool)) { throw "Khong tim thay $tool. Sua duong dan o dau file." }
}

# Thu tu theo ghi chu "Chay sau ..." trong tung file.
# 01_schema.sql XOA va tao lai database AnhDuySport, du lieu cu se mat.
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
    '08_unique_phone.sql',
    '08_ai_workout_recommendation.sql',
    '09_class_slots.sql',
    '10_password_reset.sql',
    '11_membership_pending.sql',
    '12_membership_package_discount.sql',
    '13_class_registration_log.sql',
    '14_class_membership_bonus.sql',
    '10_support_request_guest.sql'
)

foreach ($script in $scripts) {
    if (-not (Test-Path (Join-Path $root $script))) { throw "Thieu file $script trong $root" }
}

& $localdb start MSSQLLocalDB
# sqlcmd ban cu khong hieu ten (localdb), nen ket noi qua dia chi pipe cua LocalDB
$server = ((& $localdb info MSSQLLocalDB | Select-String 'pipe name').ToString() -split ':', 2)[1].Trim()
Write-Output "Server: $server"

# -I: bat QUOTED_IDENTIFIER (09_class_slots.sql va cac filtered index can)
Write-Output 'Chay 01_schema.sql'
& $sqlcmd -S $server -E -b -I -f 65001 -i (Join-Path $root '01_schema.sql')
if ($LASTEXITCODE -ne 0) { Write-Output 'Loi o 01_schema.sql'; exit $LASTEXITCODE }

foreach ($script in $scripts) {
    Write-Output "Chay $script"
    & $sqlcmd -S $server -E -b -I -f 65001 -d AnhDuySport -i (Join-Path $root $script)
    if ($LASTEXITCODE -ne 0) { Write-Output "Loi o $script"; exit $LASTEXITCODE }
}

Write-Output 'AnhDuySport is ready on (localdb)\MSSQLLocalDB'
