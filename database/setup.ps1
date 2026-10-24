# Dung lai database AnhDuySport tu dau: 01_schema.sql, 02_seed.sql roi 03_seed_extra_coaches.sql (khong con file migration rieng).
# CANH BAO: 01_schema.sql XOA database cu, du lieu se mat.
#   powershell -ExecutionPolicy Bypass -File database\setup.ps1
#   powershell -ExecutionPolicy Bypass -File database\setup.ps1 -Server "localhost"
param([string]$Server)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

foreach ($script in '01_schema.sql', '02_seed.sql', '03_seed_extra_coaches.sql', '04_seed_extra_members.sql') {
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

$extra = @()
if ($Server) {
    # SQL Server cai rieng (khong phai LocalDB): -C tin chung chi tu ky
    $extra = @('-C')
} else {
    $Server = '(localdb)\MSSQLLocalDB'
    $localdb = Find-Tool 'SqlLocalDB.exe' @('C:\Program Files\Microsoft SQL Server\*\Tools\Binn\SqlLocalDB.exe')
    if ($localdb) {
        & $localdb start MSSQLLocalDB | Out-Null
        # sqlcmd ban cu khong hieu ten (localdb), nen ket noi qua dia chi pipe cua LocalDB
        $pipe = & $localdb info MSSQLLocalDB | Select-String 'pipe name'
        if ($pipe) { $Server = ($pipe.ToString() -split ':', 2)[1].Trim() }
    }
}
Write-Output "sqlcmd: $sqlcmd"
Write-Output "Server: $Server"

function Invoke-SqlFile([string]$file, [string]$database) {
    Write-Output "Chay $file"
    # -I: bat QUOTED_IDENTIFIER (filtered index va trigger can)
    $target = if ($database) { @('-d', $database) } else { @() }
    & $sqlcmd -S $Server -E -b -I -f 65001 @extra @target -i (Join-Path $root $file)
    if ($LASTEXITCODE -ne 0) { throw "Loi o $file" }
}

Invoke-SqlFile '01_schema.sql' $null
Invoke-SqlFile '02_seed.sql' 'AnhDuySport'
Invoke-SqlFile '03_seed_extra_coaches.sql' 'AnhDuySport'
Invoke-SqlFile '04_seed_extra_members.sql' 'AnhDuySport'

Write-Output "AnhDuySport san sang tren $Server"
