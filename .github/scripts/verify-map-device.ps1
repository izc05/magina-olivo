param(
    [Parameter(Mandatory = $true)][string]$Serial,
    [string]$AdbPath = "$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe",
    [ValidateSet('baseline','denied','grant','precise','rotation','off','no-fix','coarse','offline')]
    [string[]]$Modes = @('baseline','denied','grant','precise','rotation','off','no-fix','coarse','offline'),
    [ValidateSet('light','dark')][string]$Theme = 'light',
    [string]$OutputDirectory = (Join-Path $env:TEMP ('magina-map-device-' + [guid]::NewGuid().ToString('N')))
)
$ErrorActionPreference='Stop'
$taskAdb=$AdbPath
$taskSerial=$Serial
$taskPackage='com.isivoltpro.maginaolivo.dev'
function Adb([string[]]$Arguments){$taskResult=& $taskAdb -s $taskSerial @Arguments 2>&1;if($LASTEXITCODE -ne 0){throw ($taskResult -join "`n")};($taskResult -join "`n").Trim()}
if((Adb @('shell','getprop','ro.kernel.qemu')) -ne '1'){throw 'Only emulator'}
if($Serial -notmatch '^emulator-\d+$'){throw 'Explicit emulator serial required'}
$taskPlane=Adb @('shell','cmd','connectivity','airplane-mode')
$taskWifi=Adb @('shell','settings','get','global','wifi_on')
$taskBluetooth=Adb @('shell','settings','get','global','bluetooth_on')
$taskLocation=Adb @('shell','cmd','location','is-location-enabled')
$taskMock=Adb @('shell','cmd','appops','get',$taskPackage,'android:mock_location')
$taskMockMatch=[regex]::Match($taskMock,'(?i)MOCK_LOCATION:\s*(\w+)')
$taskMockMode=if($taskMockMatch.Success){$taskMockMatch.Groups[1].Value}else{'default'}
$taskPackageState=Adb @('shell','dumpsys','package',$taskPackage)
$taskPermissions=@{}
foreach($taskName in @('ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION')){
 $taskMatch=[regex]::Match($taskPackageState,'android.permission.'+$taskName+': granted=(true|false), flags=\[([^\]]*)\]')
 if(!$taskMatch.Success){throw 'Cannot back up permission'}
 $taskPermissions[$taskName]=[pscustomobject]@{Granted=$taskMatch.Groups[1].Value -eq 'true';Flags=$taskMatch.Groups[2].Value.Trim()}
}
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
[IO.File]::WriteAllText((Join-Path $OutputDirectory 'device-before.json'),(@{Location=$taskLocation;Mock=$taskMockMode;Permissions=$taskPermissions;Airplane=$taskPlane;Wifi=$taskWifi;Bluetooth=$taskBluetooth}|ConvertTo-Json -Depth 4))
try {
 Adb @('shell','cmd','appops','set',$taskPackage,'android:mock_location','allow')|Out-Null
 foreach($taskMode in $Modes){
  if($taskMode -eq 'offline'){Adb @('shell','cmd','connectivity','airplane-mode','enable')|Out-Null;Adb @('shell','svc','wifi','disable')|Out-Null}
  foreach($taskName in @('ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION')){
   Adb @('shell','pm','revoke',$taskPackage,('android.permission.'+$taskName))|Out-Null
   Adb @('shell','pm','clear-permission-flags',$taskPackage,('android.permission.'+$taskName),'user-set','user-fixed')|Out-Null
  }
  if($taskMode -in @('precise','rotation','off','no-fix','coarse')){Adb @('shell','pm','grant',$taskPackage,'android.permission.ACCESS_COARSE_LOCATION')|Out-Null}
  if($taskMode -in @('precise','rotation','off','no-fix')){Adb @('shell','pm','grant',$taskPackage,'android.permission.ACCESS_FINE_LOCATION')|Out-Null}
  Adb @('shell','cmd','location','set-location-enabled',$(if($taskMode -eq 'off'){'false'}else{'true'}))|Out-Null
  $taskResult=Adb @('shell','am','instrument','-w','-r','-e','mapDeviceQaMode',$taskMode,'-e','mapDeviceQaTheme',$Theme,'-e','class','com.isivoltpro.maginaolivo.NativeMapDeviceQaTest','com.isivoltpro.maginaolivo.dev.test/androidx.test.runner.AndroidJUnitRunner')
  [IO.File]::WriteAllText((Join-Path $OutputDirectory ($Theme+'-'+$taskMode+'.log')),$taskResult)
  if($taskResult -notmatch 'OK \(1 test\)' -or $taskResult -match 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed'){throw ('Native mode failed: '+$taskMode)}
  Write-Output ($Theme+'/'+$taskMode+': 1/1')
 }
} finally {
 $taskResumed=Adb @('shell','dumpsys','activity','activities')
 if($taskResumed -match 'topResumedActivity[^\r\n]*permissioncontroller[^\r\n]*GrantPermissionsActivity'){Adb @('shell','input','keyevent','KEYCODE_BACK')|Out-Null}
 Adb @('shell','cmd','connectivity','airplane-mode',$(if($taskPlane -eq 'enabled'){'enable'}else{'disable'}))|Out-Null
 Adb @('shell','svc','wifi',$(if($taskWifi -eq '1'){'enable'}else{'disable'}))|Out-Null
 Adb @('shell','cmd','bluetooth_manager',$(if($taskBluetooth -eq '1'){'enable'}else{'disable'}))|Out-Null
 Adb @('shell','cmd','location','set-location-enabled',$taskLocation)|Out-Null
 Adb @('shell','cmd','appops','set',$taskPackage,'android:mock_location',$taskMockMode)|Out-Null
 foreach($taskName in @('ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION')){if(!$taskPermissions[$taskName].Granted){Adb @('shell','pm','revoke',$taskPackage,('android.permission.'+$taskName))|Out-Null}}
 foreach($taskName in @('ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION')){if($taskPermissions[$taskName].Granted){Adb @('shell','pm','grant',$taskPackage,('android.permission.'+$taskName))|Out-Null}}
 foreach($taskName in $taskPermissions.Keys){
  Adb @('shell','pm','clear-permission-flags',$taskPackage,('android.permission.'+$taskName),'user-set','user-fixed')|Out-Null
  if($taskPermissions[$taskName].Flags -match 'USER_SET'){Adb @('shell','pm','set-permission-flags',$taskPackage,('android.permission.'+$taskName),'user-set')|Out-Null}
  if($taskPermissions[$taskName].Flags -match 'USER_FIXED'){Adb @('shell','pm','set-permission-flags',$taskPackage,('android.permission.'+$taskName),'user-fixed')|Out-Null}
 }
 $taskAccuracy=if($taskPermissions['ACCESS_FINE_LOCATION'].Flags -match '524288|SELECTED_LOCATION_ACCURACY'){'524288'}else{'0'}
 $taskAccuracyResult=Adb @('shell','am','instrument','--no-hidden-api-checks','-w','-r','-e','mapDeviceQaMode','restore-accuracy','-e','mapAccuracyFlag',$taskAccuracy,'-e','class','com.isivoltpro.maginaolivo.NativeMapDeviceQaTest','com.isivoltpro.maginaolivo.dev.test/androidx.test.runner.AndroidJUnitRunner')
 [IO.File]::WriteAllText((Join-Path $OutputDirectory 'accuracy-restored.log'),$taskAccuracyResult)
 if($taskAccuracyResult -notmatch 'OK \(1 test\)' -or $taskAccuracyResult -match 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed'){throw 'Accuracy flag restore failed'}
 $taskFinal=Adb @('shell','dumpsys','package',$taskPackage)
 foreach($taskName in $taskPermissions.Keys){
  $taskMatch=[regex]::Match($taskFinal,'android.permission.'+$taskName+': granted=(true|false), flags=\[([^\]]*)\]')
  if(($taskMatch.Groups[1].Value -eq 'true') -ne $taskPermissions[$taskName].Granted -or $taskMatch.Groups[2].Value.Trim() -ne $taskPermissions[$taskName].Flags){throw ('Permission restoration failed: '+$taskName)}
 }
 if ((Adb @('shell','cmd','location','is-location-enabled')) -ne $taskLocation -or
     (Adb @('shell','cmd','connectivity','airplane-mode')) -ne $taskPlane -or
     (Adb @('shell','settings','get','global','wifi_on')) -ne $taskWifi -or
     (Adb @('shell','settings','get','global','bluetooth_on')) -ne $taskBluetooth) { throw 'Device master setting restoration failed' }
 Adb @('pull',('/sdcard/Android/data/'+$taskPackage+'/files/map-device-evidence'),(Join-Path $OutputDirectory 'captures')) | Out-Null
 Write-Output 'Location switch, mock appop, runtime grants and denial flags restored; no app data cleared.'
}