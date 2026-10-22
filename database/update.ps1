# Cap nhat database AnhDuySport dang co len cau truc moi nhat, GIU NGUYEN du lieu.
# Chay moi khi pull code co file migration moi. Database chua co thi chay setup.ps1 truoc.
#   powershell -ExecutionPolicy Bypass -File database\update.ps1
. (Join-Path $PSScriptRoot '_common.ps1')

$exists = & $sqlcmd -S $server -E -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID(N'AnhDuySport') IS NULL THEN 0 ELSE 1 END"
if ($LASTEXITCODE -ne 0) { throw 'Khong ket noi duoc LocalDB.' }
if (($exists | Select-Object -Last 1).Trim() -ne '1') { throw 'Chua co database AnhDuySport. Chay setup.ps1 truoc.' }

foreach ($script in $migrations) {
    Invoke-SqlFile $script 'AnhDuySport'
}

Write-Output 'AnhDuySport da cap nhat len cau truc moi nhat.'
