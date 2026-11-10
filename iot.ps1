# =====================================================================
#  LENH TAT MQTT CHO BAI 2 (tu nap moi khi mo PowerShell sau khi chay setup.ps1)
#  - Goi thang file .exe -> khong phu thuoc PATH
#  - Tu xu ly dau " trong JSON -> khong phai go \" nua
#  - In ra cau lenh mosquitto that de giai thich voi thay
# =====================================================================

$IOT_DIR = $PSScriptRoot           # thu muc chua file nay (vd D:\IoT)
$MQ_DIR  = "C:\Program Files\mosquitto"
$MQ_HOST = "localhost"
$MQ_PORT = 8899
$MQ_USER = ""
$MQ_PASS = ""
if (Test-Path "$IOT_DIR\config.ps1") { . "$IOT_DIR\config.ps1" }

# Windows PowerShell 5.1 lam mat dau " khi truyen cho file .exe -> phai them \ truoc "
function Protect-Quotes([string]$s) {
    if ($PSVersionTable.PSVersion.Major -ge 7 -and $PSNativeCommandArgumentPassing -ne 'Legacy') { return $s }
    return $s -replace '"', '\"'
}

# Man hinh 1: khoi chay broker
function Broker {
    Write-Host "mosquitto -c $IOT_DIR\mosquitto.conf -v" -ForegroundColor DarkGray
    & "$MQ_DIR\mosquitto.exe" -c "$IOT_DIR\mosquitto.conf" -v
}

# Gui 1 message bat ky:  Pub iot/devices/control LED1_ON
function Pub([string]$Topic, [string]$Message) {
    Write-Host "mosquitto_pub -h $MQ_HOST -p $MQ_PORT -u $MQ_USER -P $MQ_PASS -t $Topic -m '$Message'" -ForegroundColor DarkGray
    & "$MQ_DIR\mosquitto_pub.exe" -h $MQ_HOST -p $MQ_PORT -u $MQ_USER -P $MQ_PASS -t $Topic -m (Protect-Quotes $Message)
}

# Nghe 1 topic:  Sub iot/sensors/data   (Sub '#' = nghe tat ca)
function Sub([string]$Topic) {
    Write-Host "mosquitto_sub -h $MQ_HOST -p $MQ_PORT -u $MQ_USER -P $MQ_PASS -t $Topic -v" -ForegroundColor DarkGray
    & "$MQ_DIR\mosquitto_sub.exe" -h $MQ_HOST -p $MQ_PORT -u $MQ_USER -P $MQ_PASS -t $Topic -v
}

# Dieu khien den nhu Backend gui xuong ESP32:  Led 1 on  |  Led all off
function Led([string]$Name, [string]$State) {
    $cmd = if ($Name -eq 'all') { 'ALL_' + $State.ToUpper() } else { 'LED' + $Name + '_' + $State.ToUpper() }
    Pub "iot/devices/control" $cmd
}

# Gia lap ESP32 bao trang thai den:  LedStatus 1 on
function LedStatus([string]$Id, [string]$State) {
    Pub "iot/devices/status" ('{"device":"LED' + $Id + '","status":"' + $State.ToUpper() + '","timestamp":"' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '"}')
}

# Gia lap ESP32 gui 1 ban tin cam bien (giong payload cua firmware)
function FakeSensor {
    Pub "iot/sensors/data" ('{"timestamp":"' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '","temperature":28.5,"humidity":60,"light":320}')
}
