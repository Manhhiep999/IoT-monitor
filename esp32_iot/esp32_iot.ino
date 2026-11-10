#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include "time.h"

// Wi-Fi + MQTT nam trong secrets.h (copy tu secrets.example.h) de khong lo mat khau len GitHub
#include "secrets.h"

const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600;
const int daylightOffset_sec = 0;

// CHÂN GPIO
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define LDR_PIN 34

#define LED1_PIN 5
#define LED2_PIN 18
#define LED3_PIN 19

// GPIO 25, 26, 27: LED cảnh báo của 3 cảm biến giả lập (đã gỡ, chưa dùng) -> luôn giữ mức LOW
const int UNUSED_LED_PINS[] = {25, 26, 27};

// MQTT TOPIC
const char* sensorTopic  = "iot/sensors/data";
const char* controlTopic = "iot/devices/control";
const char* statusTopic  = "iot/devices/status";

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

// Hàm đảo giá trị ánh sáng
int reverseLight(int rawLight) {
  const int ADC_MAX = 4095;
  rawLight = constrain(rawLight, 0, ADC_MAX);
  return ADC_MAX - rawLight;
}

const float LDR_R_FIXED = 10000.0;  // điện trở cố định trên module (10k, mã "103")
const float LDR_R10     = 15000.0;  // điện trở LDR ở 10 lux -> chỉnh số này để hiệu chuẩn
const float LDR_GAMMA   = 0.7;      // độ dốc đặc tuyến của LDR GL5528

float lightToLux(int light) {
  const int ADC_MAX = 4095;
  light = constrain(light, 1, ADC_MAX - 1);                         // tránh chia cho 0
  float rLdr = LDR_R_FIXED * (ADC_MAX - light) / light;             // điện trở LDR (ohm)
  float lux = 10.0 * pow(LDR_R10 / rLdr, 1.0 / LDR_GAMMA);          // lux = 10 * (R10 / R_LDR)^(1/gamma)
  return constrain(lux, 0.0, 100000.0);
}

// Lấy time
String getDateTimeString() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "N/A";
  }
  char timeStringBuff[30];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeStringBuff);
}

// KẾT NỐI WI-FI VÀ ĐỒNG BỘ GIỜ NTP
void setupWiFi() {
  Serial.print("Dang ket noi WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, wifi_pass);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("-> WiFi da ket noi thanh cong!");
  Serial.print("Dia chi IP cua ESP32: ");
  Serial.println(WiFi.localIP());

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  Serial.print("Dang dong bo thoi gian NTP");
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\n-> Dong bo thoi gian thanh cong!");
}

// Hàm gửi trạng thái thiết bị lên MQTT statusTopic
void sendStatusResponse(String device, String status) {
  String datetime = getDateTimeString();

  String statusData = "{";
  statusData += "\"device\":\"";
  statusData += device;
  statusData += "\",\"status\":\"";
  statusData += status;
  statusData += "\",\"timestamp\":\"";
  statusData += datetime;
  statusData += "\"}";

  client.publish(statusTopic, statusData.c_str());

  Serial.print("Phan hoi trang thai: ");
  Serial.println(statusData);
}

// Hàm nhận và xử lý lệnh
void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }

  Serial.print("-> Nhan lenh tu Broker [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(msg);

  if (msg == "ALL_ON") {
    digitalWrite(LED1_PIN, HIGH);
    digitalWrite(LED2_PIN, HIGH);
    digitalWrite(LED3_PIN, HIGH);
    sendStatusResponse("LED1", "ON");
    sendStatusResponse("LED2", "ON");
    sendStatusResponse("LED3", "ON");
  }
  else if (msg == "ALL_OFF") {
    digitalWrite(LED1_PIN, LOW);
    digitalWrite(LED2_PIN, LOW);
    digitalWrite(LED3_PIN, LOW);
    sendStatusResponse("LED1", "OFF");
    sendStatusResponse("LED2", "OFF");
    sendStatusResponse("LED3", "OFF");
  }
  else if (msg == "LED1_ON") {
    digitalWrite(LED1_PIN, HIGH);
    sendStatusResponse("LED1", "ON");
  }
  else if (msg == "LED1_OFF") {
    digitalWrite(LED1_PIN, LOW);
    sendStatusResponse("LED1", "OFF");
  }
  else if (msg == "LED2_ON") {
    digitalWrite(LED2_PIN, HIGH);
    sendStatusResponse("LED2", "ON");
  }
  else if (msg == "LED2_OFF") {
    digitalWrite(LED2_PIN, LOW);
    sendStatusResponse("LED2", "OFF");
  }
  else if (msg == "LED3_ON") {
    digitalWrite(LED3_PIN, HIGH);
    sendStatusResponse("LED3", "ON");
  }
  else if (msg == "LED3_OFF") {
    digitalWrite(LED3_PIN, LOW);
    sendStatusResponse("LED3", "OFF");
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Dang ket noi MQTT Broker... ");

    if (client.connect("ESP32_IOT", mqtt_user, mqtt_pass)) {
      Serial.println("OK (Thanh cong!)");
      client.subscribe(controlTopic);
      Serial.print("Da Subscribe topic: ");
      Serial.println(controlTopic);
    }
    else {
      Serial.print("Loi ket noi, rc=");
      Serial.print(client.state());
      Serial.println(" -> Thuc hien lai sau 2 giay");
      delay(2000);
    }
  }
}

// HÀM SETUP
void setup() {
  Serial.begin(115200);

  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);

  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  for (int pin : UNUSED_LED_PINS) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
  }

  dht.begin();

  setupWiFi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  Serial.println("ESP32 da san sang hoat dong!");
}

// HÀM PUB DỮ LIỆU
const unsigned long sensorInterval = 2000;   // gửi dữ liệu cảm biến mỗi 2 giây
unsigned long lastSensorPublish = 0;

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }

  client.loop();

  if (millis() - lastSensorPublish < sensorInterval) {
    return;
  }
  lastSensorPublish = millis();

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  int rawLight = analogRead(LDR_PIN);
  int light = reverseLight(rawLight);
  int lux = (int)round(lightToLux(light));   // lux, che sáng thì giảm

  String data = "{\"timestamp\":\"" + getDateTimeString() + "\"";

  // DHT11 lỗi thì bỏ 2 trường này, các cảm biến còn lại vẫn được gửi
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Loi: Khong doc duoc du lieu tu cam bien DHT11!");
  } else {
    data += ",\"temperature\":" + String(temperature)
        + ",\"humidity\":" + String(humidity);
  }

  data += ",\"light\":" + String(lux);
  data += "}";

  client.publish(sensorTopic, data.c_str());
  Serial.println(data);
}