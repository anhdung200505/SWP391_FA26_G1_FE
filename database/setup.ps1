# Dung lai database AnhDuySport tu dau tren (localdb)\MSSQLLocalDB.
# CANH BAO: 01_schema.sql XOA database cu, du lieu se mat.
# Chi muon cap nhat database dang co len ban moi nhat (giu du lieu) thi chay update.ps1.
#   powershell -ExecutionPolicy Bypass -File database\setup.ps1
. (Join-Path $PSScriptRoot '_common.ps1')

Invoke-SqlFile '01_schema.sql' $null
Invoke-SqlFile '02_seed.sql' 'AnhDuySport'
foreach ($script in $migrations) {
    Invoke-SqlFile $script 'AnhDuySport'
}

Write-Output 'AnhDuySport is ready on (localdb)\MSSQLLocalDB'
