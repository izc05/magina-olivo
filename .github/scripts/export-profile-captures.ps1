param(
    [Parameter(Mandatory = $true)][string]$Serial,
    [string]$AdbPath = "$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe",
    [Parameter(Mandatory = $true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
if ($Serial -notmatch '^emulator-\d+$' -or ((& $AdbPath -s $Serial shell getprop ro.kernel.qemu) -join '').Trim() -ne '1') { throw 'An explicit emulator is required' }
$package = 'com.isivoltpro.maginaolivo.dev'
$names = & $AdbPath -s $Serial shell run-as $package ls files/dark3-evidence
if ($LASTEXITCODE -ne 0) { throw 'Cannot list private DEV captures' }
$names = @($names | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^appearance-(choices|dark-profile|light-profile)-(360|390|429|430)dp-font(100|130)\.png$' })
if ($names.Count -lt 18) { throw 'The complete appearance matrix must produce at least eighteen captures' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
foreach ($name in $names) {
    # Copy the binary stream directly; PowerShell text redirection corrupts PNG bytes.
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $AdbPath
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    foreach ($argument in @('-s',$Serial,'exec-out','run-as',$package,'cat',('files/dark3-evidence/'+$name))) { $start.ArgumentList.Add($argument) }
    $process = [Diagnostics.Process]::Start($start)
    $errorOutput = $process.StandardError.ReadToEndAsync()
    $path = Join-Path $OutputDirectory $name
    $stream = [IO.File]::Create($path)
    try { $process.StandardOutput.BaseStream.CopyTo($stream) } finally { $stream.Dispose() }
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw ('Capture export failed: '+$errorOutput.Result) }
    $process.Dispose()
    $bytes = [IO.File]::ReadAllBytes($path)
    if ($bytes.Length -lt 8 -or [Convert]::ToHexString($bytes[0..7]) -ne '89504E470D0A1A0A') { throw ('Invalid PNG: '+$name) }
}
Write-Output ("Exported $($names.Count) private DEV captures without changing app files/settings")