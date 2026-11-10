// Sao chep file nay thanh secrets.h roi dien thong tin that
#pragma once

const char* ssid      = "TEN_WIFI_2_4GHZ";           // Wi-Fi 2.4GHz, cung mang voi laptop
const char* wifi_pass = "MAT_KHAU_WIFI";

const char* mqtt_server = "192.168.1.x";   // IPv4 cua LAPTOP (lenh ipconfig). KHONG dung "localhost"
const int   mqtt_port   = 8899;           // giong listener trong mosquitto.conf
const char* mqtt_user   = "HoangManhHiep"; // giong $User trong setup.ps1
const char* mqtt_pass   = "MAT_KHAU_MQTT";
