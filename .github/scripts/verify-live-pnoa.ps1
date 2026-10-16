param(
    [Parameter(Mandatory = $true)][string]$Serial,
    [string]$AdbPath = "$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe",
    [string]$OutputDirectory = (Join-Path $env:TEMP ("magina-live-pnoa-" + [guid]::NewGuid().ToString('N')))
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($Serial -notmatch '^emulator-\d+$') { throw 'An explicit emulator serial is required.' }
function Invoke-ProbeAdb([string[]]$Arguments) {
    $result = & $AdbPath -s $Serial @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "adb failed: $($Arguments -join ' '): $result" }
    return ($result -join "`n").Trim()
}
if ((Invoke-ProbeAdb @('shell', 'getprop', 'ro.kernel.qemu')) -ne '1') { throw 'Only an emulator is allowed.' }
if ((Invoke-ProbeAdb @('shell', 'getprop', 'sys.boot_completed')) -ne '1') { throw 'Emulator is not booted.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$output = Invoke-ProbeAdb @('shell', 'am', 'instrument', '-w', '-r', '-e', 'class',
    'com.isivoltpro.maginaolivo.LiveNativePnoaProbeTest', '-e', 'live_pnoa', 'true',
    'com.isivoltpro.maginaolivo.dev.test/androidx.test.runner.AndroidJUnitRunner')
$logPath = Join-Path $OutputDirectory 'live-pnoa.log'
[IO.File]::WriteAllText($logPath, $output)
# Preserve any available captures even when the external service probe fails.
& $AdbPath -s $Serial pull /sdcard/Android/data/com.isivoltpro.maginaolivo.dev/files/live-pnoa-evidence $OutputDirectory | Out-Null
if ($output -notmatch 'OK \(1 test\)' -or $output -match 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed|INSTRUMENTATION_STATUS_CODE: -4') {
    throw "Live PNOA probe failed or skipped; see $logPath"
}
Write-Output "Live PNOA 1/1; evidence: $OutputDirectory. No app data or emulator settings changed."
