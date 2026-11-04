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

# Gui 1 message bat ky:  Pub sensor_data '{"temperature":30}'
function Pub([string]$Topic, [string]$Message) {
    Write-Host "mosquitto_pub -h $MQ_HOST -p $MQ_PORT -u $MQ_USER -P $MQ_PASS -t $Topic -m '$Message'" -ForegroundColor DarkGray
    & "$MQ_DIR\mosquitto_pub.exe" -h $MQ_HOST -p $MQ_PORT -u $MQ_USER -P $MQ_PASS -t $Topic -m (Protect-Quotes $Message)
}

# Nghe 1 topic:  Sub sensor_data
function Sub([string]$Topic) {
    Write-Host "mosquitto_sub -h $MQ_HOST -p $MQ_PORT -u $MQ_USER -P $MQ_PASS -t $Topic -v" -ForegroundColor DarkGray
    & "$MQ_DIR\mosquitto_sub.exe" -h $MQ_HOST -p $MQ_PORT -u $MQ_USER -P $MQ_PASS -t $Topic -v
}

# Dieu khien den:  Led led1 on  |  Led all off
function Led([string]$Name, [string]$State) {
    Pub "device_control" ('{"' + $Name + '":"' + $State + '"}')
}

# Hoi trang thai den ma khong doi gi
function Status { Pub "device_control" '{}' }

# Phan 1 (gia lap HW bang terminal): gui 1 ban tin cam bien gia
function FakeSensor { Pub "sensor_data" '{"temperature":28.5,"humidity":60,"light":512}' }
