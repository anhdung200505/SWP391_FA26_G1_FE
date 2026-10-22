# Giu lai cho ai quen lenh cu: giong het setup.ps1 (setup.ps1 tu tim sqlcmd tren moi may).
#   powershell -ExecutionPolicy Bypass -File database\setup2.ps1
& (Join-Path $PSScriptRoot 'setup.ps1')
