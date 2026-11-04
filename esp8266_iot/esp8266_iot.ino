
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ================= 1. SUA CHO DUNG MAY BAN =================
// WiFi + MQTT nam trong secrets.h (copy tu secrets.example.h) de khong lo mat khau len GitHub
#include "secrets.h"

// ================= 2. TOPIC =================
const char* TOPIC_SENSOR   = "sensor_data";
const char* TOPIC_CONTROL  = "device_control";
const char* TOPIC_RESPONSE = "device_response";

// ================= 3. CHAN PHAN CUNG =================
#define DHT_PIN    D7
#define DHT_TYPE   DHT11
#define LIGHT_PIN  A0                       // chan AO cua module anh sang -> A0 (gia tri 0-1023)

const int   LED_PINS[]  = {D1, D5, D6};     // dung theo mach that (pin_finder)
const char* LED_NAMES[] = {"led1", "led2", "led3"};
const int   LED_COUNT   = 3;

const unsigned long SENSOR_INTERVAL = 2000; // 2 giay gui 1 lan

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
unsigned long lastSensor = 0;

// ---------- WiFi ----------
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("\nKet noi WiFi \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - start > 20000) {          // 20s chua vao duoc -> in goi y loi
      int s = WiFi.status();
      Serial.printf("\n[LOI WIFI] status=%d\n", s);
      if (s == WL_NO_SSID_AVAIL) {
        Serial.println("  -> Khong thay mang: sai ten, mang 5GHz, hoac iPhone chua bat Maximize Compatibility");
        WiFi.disconnect();                         // dung lan ket noi dang treo truoc khi quet
        delay(100);
        int n = WiFi.scanNetworks();               // in cac mang ESP thay duoc de doi chieu ten
        Serial.printf("  Cac mang ESP thay duoc (%d):\n", n);
        for (int i = 0; i < n; i++)
          Serial.printf("   [%s] kenh %d, %d dBm\n", WiFi.SSID(i).c_str(), WiFi.channel(i), WiFi.RSSI(i));
      } else
        Serial.println("  -> Sai mat khau, mang WPA3, hoac WiFi truong (phai dang nhap web) -> doi sang hotspot");
      WiFi.begin(WIFI_SSID, WIFI_PASS);
      start = millis();
    }
  }
  Serial.printf("\nWiFi OK, IP cua ESP: %s\n", WiFi.localIP().toString().c_str());
}

// ---------- Gui trang thai THAT cua den ----------
void publishResponse() {
  StaticJsonDocument<256> doc;
  for (int i = 0; i < LED_COUNT; i++) {
    doc[LED_NAMES[i]] = digitalRead(LED_PINS[i]) ? "on" : "off";   // doc lai tu chan, khong doan
  }
  doc["status"] = "success";

  char buf[256];
  serializeJson(doc, buf);
  mqtt.publish(TOPIC_RESPONSE, buf);
  Serial.printf("-> %s: %s\n", TOPIC_RESPONSE, buf);
}

// ---------- Bat/tat 1 chan theo chuoi "on"/"off" ----------
void applyState(int pin, const char* value) {
  if (value == nullptr) return;
  if (strcasecmp(value, "on") == 0)  digitalWrite(pin, HIGH);
  if (strcasecmp(value, "off") == 0) digitalWrite(pin, LOW);
}

// ---------- Nhan lenh tu device_control ----------
void onMessage(char* topic, byte* payload, unsigned int length) {
  Serial.printf("<- %s: %.*s\n", topic, length, (char*)payload);

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, (const char*)payload, length);
  if (err) {
    Serial.printf("[LOI JSON] %s  (neu thay mat dau \" -> xem muc loi PowerShell trong huong dan)\n", err.c_str());
    mqtt.publish(TOPIC_RESPONSE, "{\"status\":\"error\",\"message\":\"invalid json\"}");
    return;
  }

  if (doc["all"].is<const char*>()) {                    // {"all":"on"} -> ca 3 den
    for (int i = 0; i < LED_COUNT; i++) applyState(LED_PINS[i], doc["all"].as<const char*>());
  }
  for (int i = 0; i < LED_COUNT; i++) {                  // {"led2":"on"} -> tung den
    if (doc[LED_NAMES[i]].is<const char*>()) {
      applyState(LED_PINS[i], doc[LED_NAMES[i]].as<const char*>());
    }
  }

  publishResponse();                                     // luon tra trang thai (ke ca khi gui {})
}

// ---------- Ket noi MQTT ----------
void connectMQTT() {
  while (!mqtt.connected()) {
    connectWiFi();
    String clientId = "ESP8266-" + String(ESP.getChipId(), HEX);
    Serial.printf("Ket noi MQTT %s:%d ... ", MQTT_HOST, MQTT_PORT);

    if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
      Serial.println("OK");
      mqtt.subscribe(TOPIC_CONTROL);   // phai subscribe lai MOI lan ket noi lai
      publishResponse();
    } else {
      int rc = mqtt.state();
      Serial.printf("LOI rc=%d\n", rc);
      if (rc == -2) Serial.println("  -> Khong toi duoc broker: sai IP laptop / broker chua chay / firewall / khac mang");
      if (rc == 4 || rc == 5) Serial.println("  -> Sai user/password MQTT");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  for (int i = 0; i < LED_COUNT; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
  }
  dht.begin();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  connectWiFi();
}

void loop() {
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();                                           // phai goi lien tuc -> KHONG dung delay() dai

  if (millis() - lastSensor >= SENSOR_INTERVAL) {        // dem gio kieu non-blocking
    lastSensor = millis();

    float t = dht.readTemperature();
    float h = dht.readHumidity();
    int light = analogRead(LIGHT_PIN);

    if (isnan(t) || isnan(h)) {
      Serial.println("[LOI DHT11] kiem tra day: VCC->3V3, DATA->D7, GND->GND");
      return;
    }

    StaticJsonDocument<128> doc;
    doc["temperature"] = t;
    doc["humidity"]    = h;
    doc["light"]       = light;

    char buf[128];
    serializeJson(doc, buf);
    mqtt.publish(TOPIC_SENSOR, buf);
    Serial.printf("-> %s: %s\n", TOPIC_SENSOR, buf);
  }
}
