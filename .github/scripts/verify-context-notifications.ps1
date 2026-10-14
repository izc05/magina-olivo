param(
 [Parameter(Mandatory=$true)][string]$Serial,
 [string]$AdbPath="$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe",
 [ValidateSet('baseline','grant','deny','later')][string[]]$Modes=@('baseline','grant','deny','later'),
 [string]$OutputDirectory=(Join-Path $env:TEMP ('magina-notifications-'+[guid]::NewGuid().ToString('N'))),
 [ValidateSet('com.isivoltpro.maginaolivo.ContextNotificationPermissionTest','com.isivoltpro.maginaolivo.FirstReminderPermissionTest#firstSavedReminderRequestsPermissionAndPreservesWork')]
 [string]$ClassName='com.isivoltpro.maginaolivo.ContextNotificationPermissionTest'
)
$ErrorActionPreference='Stop'
$taskPackage='com.isivoltpro.maginaolivo.dev'
function Adb([string[]]$Arguments){$taskOutput=& $AdbPath -s $Serial @Arguments 2>&1;if($LASTEXITCODE -ne 0){throw ($taskOutput -join "`n")};($taskOutput -join "`n").Trim()}
if($Serial -notmatch '^emulator-\d+$' -or (Adb @('shell','getprop','ro.kernel.qemu')) -ne '1'){throw 'Explicit emulator required'}
$taskPermission='android.permission.POST_NOTIFICATIONS'
$taskBefore=[regex]::Match((Adb @('shell','dumpsys','package',$taskPackage)),'android.permission.POST_NOTIFICATIONS: granted=(true|false), flags=\[([^\]]*)\]').Value
if(!$taskBefore){throw 'Cannot preserve original notification permission'}
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'permission-before.txt'),$taskBefore)
try {
 foreach($taskMode in $Modes){
  Adb @('shell','pm','revoke',$taskPackage,$taskPermission) | Out-Null
  Adb @('shell','pm','clear-permission-flags',$taskPackage,$taskPermission,'user-set','user-fixed') | Out-Null
  $taskResult=Adb @('shell','am','instrument','-w','-r','-e','notificationQaMode',$taskMode,'-e','class',$ClassName,'com.isivoltpro.maginaolivo.dev.test/androidx.test.runner.AndroidJUnitRunner')
  [IO.File]::WriteAllText((Join-Path $OutputDirectory ($taskMode+'.log')),$taskResult)
  if($taskResult -notmatch 'OK \(1 test\)' -or $taskResult -match 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed'){throw ('Native notification mode failed: '+$taskMode)}
  Write-Output ($taskMode+': 1/1')
 }
} finally {
 Adb @('shell','input','keyevent','KEYCODE_BACK') | Out-Null
 Adb @('shell','pm',$(if($taskBefore -match 'granted=true'){'grant'}else{'revoke'}),$taskPackage,$taskPermission) | Out-Null
 Adb @('shell','pm','clear-permission-flags',$taskPackage,$taskPermission,'user-set','user-fixed') | Out-Null
 foreach($taskFlag in @('user-set','user-fixed')){if($taskBefore.Contains($taskFlag.Replace('-','_').ToUpperInvariant())){Adb @('shell','pm','set-permission-flags',$taskPackage,$taskPermission,$taskFlag) | Out-Null}}
 $taskAfter=[regex]::Match((Adb @('shell','dumpsys','package',$taskPackage)),'android.permission.POST_NOTIFICATIONS: granted=(true|false), flags=\[([^\]]*)\]').Value
 [IO.File]::WriteAllText((Join-Path $OutputDirectory 'permission-after.txt'),$taskAfter)
 if($taskBefore -ne $taskAfter){throw 'Original notification permission/flags not restored exactly'}
}
Write-Output $OutputDirectory
