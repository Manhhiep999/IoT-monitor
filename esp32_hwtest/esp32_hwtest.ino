// Kiem tra phan cung ESP32 KHONG can Wi-Fi/MQTT — cung chan va cong thuc voi esp32_iot.ino
//   - DHT11 (GPIO 4), LDR (GPIO 34) -> in ra Serial moi 2 giay
//   - 3 LED dieu khien (GPIO 5, 18, 19) -> bat lan luot tung den
// Mo Serial Monitor 115200. Go so 1..3 + Enter de bat/tat rieng tung den, go 0 de tat het va chay lai vong tu dong.
#include <DHT.h>

#define DHT_PIN  4
#define DHT_TYPE DHT11
#define LDR_PIN  34

struct Led { const char* name; int pin; };
const Led LEDS[] = {
  {"LED1 (GPIO 5)", 5}, {"LED2 (GPIO 18)", 18}, {"LED3 (GPIO 19)", 19},
};
const int LED_COUNT = sizeof(LEDS) / sizeof(LEDS[0]);

DHT dht(DHT_PIN, DHT_TYPE);

// Giong esp32_iot.ino: dao gia tri ADC roi quy doi sang lux theo dac tuyen LDR GL5528
const int   ADC_MAX     = 4095;
const float LDR_R_FIXED = 10000.0;
const float LDR_R10     = 15000.0;
const float LDR_GAMMA   = 0.7;

float lightToLux(int light) {
  light = constrain(light, 1, ADC_MAX - 1);
  float rLdr = LDR_R_FIXED * (ADC_MAX - light) / light;
  return constrain(10.0 * pow(LDR_R10 / rLdr, 1.0 / LDR_GAMMA), 0.0, 100000.0);
}

bool autoCycle = true;
int current = -1;
unsigned long lastStep = 0, lastRead = 0;

void allOff() {
  for (int i = 0; i < LED_COUNT; i++) digitalWrite(LEDS[i].pin, LOW);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  for (int i = 0; i < LED_COUNT; i++) pinMode(LEDS[i].pin, OUTPUT);
  allOff();
  dht.begin();
  Serial.println("\n=== KIEM TRA PHAN CUNG ESP32 (khong Wi-Fi) ===");
  Serial.println("Tu dong bat lan luot 3 LED, moi den 1 giay. Go 1..3 de bat/tat rieng, 0 de chay lai tu dong.");
}

void loop() {
  // Lenh tu Serial Monitor
  if (Serial.available()) {
    int c = Serial.read();
    if (c >= '1' && c <= '0' + LED_COUNT) {
      autoCycle = false;
      const Led& l = LEDS[c - '1'];
      bool on = !digitalRead(l.pin);
      digitalWrite(l.pin, on ? HIGH : LOW);
      Serial.printf("[LED] %s -> %s\n", l.name, on ? "BAT" : "TAT");
    } else if (c == '0') {
      allOff();
      autoCycle = true;
      Serial.println("[LED] Tat het, chay lai vong tu dong");
    }
  }

  // Vong tu dong: moi 1 giay bat den tiep theo
  if (autoCycle && millis() - lastStep >= 1000) {
    lastStep = millis();
    allOff();
    current = (current + 1) % LED_COUNT;
    digitalWrite(LEDS[current].pin, HIGH);
    Serial.printf("[LED] Dang bat: %s\n", LEDS[current].name);
  }

  // Doc cam bien moi 2 giay
  if (millis() - lastRead >= 2000) {
    lastRead = millis();
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    int raw = analogRead(LDR_PIN);
    int light = ADC_MAX - constrain(raw, 0, ADC_MAX);
    if (isnan(t) || isnan(h)) {
      Serial.println("[DHT11] LOI: khong doc duoc (kiem tra VCC->3V3, DATA->GPIO 4, GND->GND)");
    } else {
      Serial.printf("[DHT11] Nhiet do = %.1f C | Do am = %.1f %%\n", t, h);
    }
    Serial.printf("[LDR]   ADC tho = %4d | sau dao = %4d | ~ %.0f lux\n", raw, light, lightToLux(light));
  }
}
