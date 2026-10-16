param([string]$Serial = 'emulator-5614', [string]$Sdk = "$env:LOCALAPPDATA/Android/Sdk")
$ErrorActionPreference = 'Stop'
$adb = Join-Path $Sdk 'platform-tools/adb.exe'
if ((& $adb -s $Serial shell getprop ro.kernel.qemu).Trim() -ne '1') { throw 'Disposable/synthetic emulator required' }
if ($Serial -notmatch '^emulator-\d+$') { throw 'Emulator serial required' }
$package = 'com.isivoltpro.maginaolivo.dev'
$class = 'com.isivoltpro.maginaolivo.data.local.LocalLinkBackupProcessTest'
$fixture = [guid]::NewGuid().ToString()
$output = Join-Path ([IO.Path]::GetTempPath()) "g1-process-$fixture.log"
$errorLog = Join-Path ([IO.Path]::GetTempPath()) "g1-process-$fixture.err"
$instrument = "$package.test/androidx.test.runner.AndroidJUnitRunner"
$process = Start-Process -FilePath $adb -ArgumentList @('-s',$Serial,'shell','am','instrument','-w','-e','class',$class,'-e','qaLinkPhase','interrupt','-e','qaLinkFixture',$fixture,$instrument) -PassThru -WindowStyle Hidden -RedirectStandardOutput $output -RedirectStandardError $errorLog
$ready = $false
for ($attempt = 0; $attempt -lt 50; $attempt++) {
    & $adb -s $Serial shell run-as $package test -f "no_backup/qa-link-process-$fixture.ready" 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    if ($process.HasExited) { break }
    Start-Sleep -Milliseconds 400
}
if (!$ready) { Get-Content $output; Get-Content $errorLog; throw 'Partial-file checkpoint was not reached; no force-stop performed' }
Write-Output "PASS: partial binary checkpoint reached for synthetic fixture $fixture"
& $adb -s $Serial shell am force-stop $package
if ($LASTEXITCODE -ne 0) { throw 'Force-stop failed' }
$process.WaitForExit(5000) | Out-Null
Write-Output 'PASS: Android application process force-stopped without clearing data'
$result = & $adb -s $Serial shell am instrument -w -e class $class -e qaLinkPhase recover -e qaLinkFixture $fixture $instrument
$result | Write-Output
if (($result -join "`n") -notmatch 'OK \(1 test\)' -or ($result -join "`n") -match 'FAILURES!!!|INSTRUMENTATION_FAILED') { throw 'Recovery verification failed' }
Write-Output 'PASS: original DB, original bytes and prior checkpoint intact; same operation recovered exactly once'
