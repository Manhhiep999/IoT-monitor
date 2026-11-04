# =====================================================================
#  CAI DAT BROKER CHO BAI 2 - chay 1 LAN, bang PowerShell "Run as administrator":
#     powershell -ExecutionPolicy Bypass -File D:\IoT\setup.ps1   (doi D:\IoT neu de cho khac)
#  Can cai Mosquitto truoc (mosquitto.org/download, ban Windows x64)
# =====================================================================

# ---------- SUA 3 DONG NAY ----------
$User = "HoangManhHiep"     # ten ban, khong dau, khong cach (vd: NguyenVanA)
$Pass = "B23DCCN292"      # ma sinh vien
$Port = 8899              # khong dung 1883
# ------------------------------------

$ErrorActionPreference = "Stop"
$Dir  = $PSScriptRoot      # thu muc chua file nay (vd D:\IoT)
$Mosq = "C:\Program Files\mosquitto"

function Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "   OK: $msg" -ForegroundColor Green }

Step "Kiem tra Mosquitto"
if (!(Test-Path "$Mosq\mosquitto.exe")) {
    Write-Host "   Khong thay $Mosq\mosquitto.exe -> cai Mosquitto truoc roi chay lai." -ForegroundColor Red
    exit 1
}
Ok "$Mosq"

Step "Tao file cau hinh broker (port $Port, bat user/password)"
New-Item -ItemType Directory -Force $Dir | Out-Null
@"
listener $Port 0.0.0.0
allow_anonymous false
password_file $($Dir -replace '\\','/')/passwd
"@ | Set-Content -Encoding ascii "$Dir\mosquitto.conf"
Ok "$Dir\mosquitto.conf"

Step "Tao tai khoan MQTT"
& "$Mosq\mosquitto_passwd.exe" -c -b "$Dir\passwd" $User $Pass
Ok "user=$User"

Step "Luu cau hinh cho cac lenh tat"
@"
`$MQ_USER = "$User"
`$MQ_PASS = "$Pass"
`$MQ_PORT = $Port
"@ | Set-Content -Encoding ascii "$Dir\config.ps1"
Ok "$Dir\config.ps1"

Step "Mo firewall cho port $Port (de ESP8266 ket noi vao duoc)"
Get-NetFirewallRule -DisplayName "Mosquitto $Port" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "Mosquitto $Port" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
Ok "da mo"

Step "Cho phep chay script + tu nap lenh tat moi khi mo PowerShell"
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
Get-ChildItem $Dir -Recurse -File | Unblock-File
$profileDir = Split-Path $PROFILE
New-Item -ItemType Directory -Force $profileDir | Out-Null
if (!(Test-Path $PROFILE)) { New-Item -ItemType File -Force $PROFILE | Out-Null }
$line = ". `"$Dir\iot.ps1`""
if (!(Select-String -Path $PROFILE -SimpleMatch -Pattern "$Dir\iot.ps1" -Quiet)) {
    Add-Content $PROFILE "`n$line"
}
Ok "$PROFILE"

Write-Host "`nXONG. Dong cua so nay, mo PowerShell MOI (khong can admin), go:  Broker" -ForegroundColor Yellow
