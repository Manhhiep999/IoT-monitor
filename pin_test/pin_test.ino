/*
  TEST PHAN CUNG (chay TRUOC code MQTT, khong can WiFi)
  - Lan luot bat tung LED 0.7s, Serial in ra dang bat chan nao -> nhin xem dung den khong
  - In gia tri DHT11 va anh sang A0 -> che tay len quang tro xem so co doi khong
  Serial Monitor: 115200 baud
*/
#include <DHT.h>

DHT dht(D7, DHT11);

const int   LED_PINS[]  = {D1, D2, D5};
const char* LED_NAMES[] = {"LED1 (D1)", "LED2 (D2)", "LED3 (D5)"};
const int   LED_COUNT   = 3;

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < LED_COUNT; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
  }
  dht.begin();
  Serial.println("\n=== TEST PHAN CUNG ===");
}

void loop() {
  for (int i = 0; i < LED_COUNT; i++) {
    Serial.printf("Dang bat %s\n", LED_NAMES[i]);
    digitalWrite(LED_PINS[i], HIGH);
    delay(700);
    digitalWrite(LED_PINS[i], LOW);
  }

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  int light = analogRead(A0);

  if (isnan(t) || isnan(h)) Serial.print("DHT11: LOI (kiem tra day VCC-3V3, DATA-D7, GND-GND)");
  else Serial.printf("DHT11: %.1f C, %.0f %%", t, h);
  Serial.printf("  |  Anh sang A0: %d\n\n", light);

  delay(800);
}
