/*
  PIN FINDER - tu do xem mach dang cam vao chan nao (khong can doan qua anh)
  Serial Monitor: 115200 baud
  Moi vong:
    1) Bat lan luot tung chan D0..D8 trong 1 giay -> nhin LED nao sang thi ghi lai ten chan
    2) Thu doc DHT11 tren tung chan -> chan nao ra so nhiet do la chan DATA cua DHT11
    3) In gia tri A0 -> che tay len quang tro, neu so doi thi AO dang cam dung A0
  Ghi chu: den xanh nho TREN board ESP cung sang khi bat D4 (binh thuong).
*/
#include <DHT.h>

const int   PINS[]  = {D0, D1, D2, D3, D4, D5, D6, D7, D8};
const char* NAMES[] = {"D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"};
const int   N = 9;

DHT dhts[] = {
  DHT(D0, DHT11), DHT(D1, DHT11), DHT(D2, DHT11), DHT(D3, DHT11), DHT(D4, DHT11),
  DHT(D5, DHT11), DHT(D6, DHT11), DHT(D7, DHT11), DHT(D8, DHT11)
};

void setup() {
  Serial.begin(115200);
  delay(300);
  for (int i = 0; i < N; i++) dhts[i].begin();
  Serial.println("\n========== PIN FINDER ==========");
}

void loop() {
  Serial.println("\n--- 1) LED: nhin den nao sang ---");
  for (int i = 0; i < N; i++) {
    pinMode(PINS[i], OUTPUT);
    digitalWrite(PINS[i], HIGH);
    Serial.printf("  Dang bat %s ...\n", NAMES[i]);
    delay(1000);
    digitalWrite(PINS[i], LOW);
    pinMode(PINS[i], INPUT);
    delay(200);
  }

  Serial.println("--- 2) DHT11: tim chan DATA ---");
  delay(2000);                       // DHT11 can nghi 2s giua 2 lan doc
  bool found = false;
  for (int i = 0; i < N; i++) {
    float t = dhts[i].readTemperature(false, true);
    float h = dhts[i].readHumidity();
    if (!isnan(t) && !isnan(h)) {
      Serial.printf("  >>> DHT11 o chan %s: %.1f C, %.0f %%\n", NAMES[i], t, h);
      found = true;
    }
  }
  if (!found) Serial.println("  Khong thay DHT11 o chan nao -> kiem tra VCC-3V3 va GND");

  Serial.println("--- 3) Anh sang ---");
  for (int k = 0; k < 3; k++) {
    Serial.printf("  A0 = %d   (che tay len quang tro xem so co doi khong)\n", analogRead(A0));
    delay(700);
  }
}
