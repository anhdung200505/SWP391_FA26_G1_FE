# Dùng chung cho setup.ps1 và update.ps1. Không chạy file này trực tiếp.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Thứ tự chạy sau 01_schema.sql và 02_seed.sql (theo ghi chú "Chạy sau ..." trong từng file).
# Mọi file ở đây chạy lại nhiều lần không lỗi. Thêm migration mới vào CUỐI danh sách.
$migrations = @(
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
    '10_support_request_guest.sql',
    '15_training_plan_sport.sql'
)

foreach ($script in @('01_schema.sql', '02_seed.sql') + $migrations) {
    if (-not (Test-Path (Join-Path $root $script))) { throw "Thieu file $script trong $root" }
}

function Find-Tool([string]$name, [string[]]$patterns) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    foreach ($pattern in $patterns) {
        $found = Get-ChildItem $pattern -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return $null
}

$sqlcmd = Find-Tool 'sqlcmd.exe' @(
    'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\*\Tools\Binn\SQLCMD.EXE',
    'C:\Program Files\Microsoft SQL Server\*\Tools\Binn\SQLCMD.EXE')
if (-not $sqlcmd) { throw 'Khong tim thay sqlcmd. Cai "Microsoft Command Line Utilities for SQL Server" roi chay lai.' }

$localdb = Find-Tool 'SqlLocalDB.exe' @('C:\Program Files\Microsoft SQL Server\*\Tools\Binn\SqlLocalDB.exe')
$server = '(localdb)\MSSQLLocalDB'
if ($localdb) {
    & $localdb start MSSQLLocalDB | Out-Null
    # sqlcmd ban cu khong hieu ten (localdb), nen ket noi qua dia chi pipe cua LocalDB
    $pipe = & $localdb info MSSQLLocalDB | Select-String 'pipe name'
    if ($pipe) { $server = ($pipe.ToString() -split ':', 2)[1].Trim() }
}
Write-Output "sqlcmd: $sqlcmd"
Write-Output "Server: $server"

function Invoke-SqlFile([string]$file, [string]$database) {
    Write-Output "Chay $file"
    # -I: bat QUOTED_IDENTIFIER (09_class_slots.sql va cac filtered index can)
    if ($database) {
        & $sqlcmd -S $server -E -b -I -f 65001 -d $database -i (Join-Path $root $file)
    } else {
        & $sqlcmd -S $server -E -b -I -f 65001 -i (Join-Path $root $file)
    }
    if ($LASTEXITCODE -ne 0) { throw "Loi o $file" }
}
