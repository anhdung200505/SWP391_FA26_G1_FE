# Giu lai cho ai quen lenh cu: giong het setup.ps1.
#   powershell -ExecutionPolicy Bypass -File database\setup2.ps1
& (Join-Path $PSScriptRoot 'setup.ps1') @args
