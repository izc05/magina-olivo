param(
    [Parameter(Mandatory = $true)][string]$Serial,
    [string]$AdbPath = "$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe",
    [string]$OutputDirectory = (Join-Path $env:TEMP ("magina-profile-readability-" + [guid]::NewGuid().ToString('N')))
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($Serial -notmatch '^emulator-\d+$') { throw 'An explicit emulator serial is required.' }
function Invoke-ProfileAdb([string[]]$Arguments) {
    $result = & $AdbPath -s $Serial @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "adb failed: $($Arguments -join ' '): $result" }
    return ($result -join "`n").Trim()
}
if ((Invoke-ProfileAdb @('shell', 'getprop', 'ro.kernel.qemu')) -ne '1') { throw 'Only an emulator is allowed.' }
if ((Invoke-ProfileAdb @('shell', 'getprop', 'sys.boot_completed')) -ne '1') { throw 'Emulator is not booted.' }
$size = Invoke-ProfileAdb @('shell', 'wm', 'size')
$effectiveSize = [regex]::Match($size, 'Override size:\s*(\d+)x(\d+)')
if (-not $effectiveSize.Success) { $effectiveSize = [regex]::Match($size, 'Physical size:\s*(\d+)x(\d+)') }
if (-not $effectiveSize.Success) { throw 'Cannot determine effective display size.' }
$widthPixels = [int]$effectiveSize.Groups[1].Value
$originalDensity = Invoke-ProfileAdb @('shell', 'wm', 'density')
$densityOverride = [regex]::Match($originalDensity, 'Override density:\s*(\d+)')
$originalFont = Invoke-ProfileAdb @('shell', 'settings', 'get', 'system', 'font_scale')
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
try {
    foreach ($widthDp in @(360, 390, 430)) {
        $density = [int][math]::Round($widthPixels * 160.0 / $widthDp)
        Invoke-ProfileAdb @('shell', 'wm', 'density', "$density") | Out-Null
        foreach ($font in @('1.3', '1.0')) {
            Invoke-ProfileAdb @('shell', 'settings', 'put', 'system', 'font_scale', $font) | Out-Null
            $output = Invoke-ProfileAdb @('shell', 'am', 'instrument', '-w', '-r', '-e', 'class',
                'com.isivoltpro.maginaolivo.ProfileReadabilityTest,com.isivoltpro.maginaolivo.AppearanceSettingsTest',
                'com.isivoltpro.maginaolivo.dev.test/androidx.test.runner.AndroidJUnitRunner')
            $logPath = Join-Path $OutputDirectory "$($widthDp)dp-font$font.log"
            [IO.File]::WriteAllText($logPath, $output)
            if ($output -notmatch 'OK \(9 tests\)' -or $output -match 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed') {
                throw "Profile readability UI failed at $widthDp dp/font $font; see $logPath"
            }
            Write-Output "$widthDp dp/font ${font}: 9/9 (text layout, action and appearance)"
        }
    }
    Invoke-ProfileAdb @('pull', '/sdcard/Android/data/com.isivoltpro.maginaolivo.dev/files/profile-readability-evidence', $OutputDirectory) | Out-Null
    & (Join-Path $PSScriptRoot 'export-profile-captures.ps1') -Serial $Serial -AdbPath $AdbPath -OutputDirectory (Join-Path $OutputDirectory 'profile-appearance-evidence')
} finally {
    if ($densityOverride.Success) {
        Invoke-ProfileAdb @('shell', 'wm', 'density', $densityOverride.Groups[1].Value) | Out-Null
    } else {
        Invoke-ProfileAdb @('shell', 'wm', 'density', 'reset') | Out-Null
    }
    if ($originalFont -eq 'null') {
        Invoke-ProfileAdb @('shell', 'settings', 'delete', 'system', 'font_scale') | Out-Null
    } else {
        Invoke-ProfileAdb @('shell', 'settings', 'put', 'system', 'font_scale', $originalFont) | Out-Null
    }
}
Write-Output "Evidence: $OutputDirectory; original density/font restored. App data was not cleared."
