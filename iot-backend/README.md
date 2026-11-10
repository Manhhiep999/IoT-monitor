# IoT Monitor — Backend (Nuxt.js)

Backend cho đề tài **"Hệ thống giám sát nhiệt độ, độ ẩm và ánh sáng môi trường phòng học sử dụng ESP32"**
(Hoàng Mạnh Hiệp — B23DCCN292), hiện thực theo Chương 2–4 của báo cáo và khớp với Frontend `iot-frontend`.

```
ESP32 ──MQTT──► Mosquitto ──► Backend Nuxt.js (Nitro) ──► MySQL
   ▲                               │  RESTful /api/**
   └── iot/devices/control ◄─────┘  WebSocket /realtime ──► Frontend Vue.js
```

| Thành phần | Công nghệ |
|---|---|
| Server | Nuxt 4 — chỉ dùng phần server (Nitro, h3), `nitro.experimental.websocket` |
| CSDL | MySQL (`mysql2`, mọi câu SQL dùng placeholder `?`) |
| MQTT | `mqtt` (Mosquitto / HiveMQ / EMQX) |
| Xác thực | JWT (`jsonwebtoken`), mật khẩu băm bcrypt (`bcryptjs`) |

## Chạy thử

Yêu cầu: Node.js ≥ 22, MySQL đang chạy, MQTT Broker (Mosquitto) ở `127.0.0.1:8899` (cấu hình bởi `../setup.ps1`, user/pass trong `.env`).

```bash
npm install
cp .env.example .env      # sửa NUXT_DB_PASSWORD, NUXT_JWT_SECRET...
npm run db:sample         # tạo database + bảng + tài khoản demo + 24h dữ liệu mẫu
npm run dev               # http://localhost:3000
npm run esp:sim           # (terminal khác) giả lập ESP32 khi chưa có phần cứng
```

Tài khoản demo: `admin@iot.com` / `matkhau123`, `user@iot.com` / `matkhau123`.

Frontend: trong `iot-frontend/.env` đặt `VITE_USE_MOCK=false`, `VITE_BACKEND_URL=http://localhost:3000`, rồi `npm run dev`
(Vite proxy `/api` và `/realtime` sang Backend).

| Script | Việc làm |
|---|---|
| `npm run db:init` | Tạo database/bảng, seed users, sensors, devices (chạy lại không mất dữ liệu) |
| `npm run db:sample` | Như trên + 24h dữ liệu cảm biến (5 phút/lần) và 6 bản ghi ActionHistory mẫu nếu bảng còn trống |
| `npm run db:reset` | **Xoá** toàn bộ bảng rồi tạo lại kèm dữ liệu mẫu |
| `npm run esp:sim -- --interval 2 --no-ack 2` | Giả lập ESP32: gửi cảm biến mỗi 2s, không phản hồi lệnh của thiết bị 2 (thử ngoại lệ UC04). Gõ `off`/`on` để mô phỏng mất kết nối |
| `npm run build` → `npm start` | Build production (`.output/`) và chạy |

## API

Mọi API trừ `auth/login`, `auth/logout`, `health` cần header `Authorization: Bearer <token>`.

| UC | Method & Endpoint | Ghi chú |
|---|---|---|
| UC01 | `POST /api/auth/login` | `{ username, password }` → `{ token, user: { id, fullName }, message }` |
| — | `POST /api/auth/logout` | Thu hồi token hiện tại |
| UC02 | `GET /api/sensors/latest` | Bản ghi mới nhất từng loại cảm biến, chỉ đọc DB |
| UC05 | `GET /api/sensors` | Danh mục loại cảm biến (dropdown) |
| UC03/05 | `GET /api/sensors/data?type&time&search&page&limit` | `{ data, page, total }`; thêm `range=24h` cho biểu đồ (gom trung bình theo khung 5 phút) |
| UC04 | `GET /api/devices` | `{ data: [{ id, name, description, currentStatus }] }` |
| UC04 | `POST /api/devices/{id}/actions` | `{ action: "ON"\|"OFF" }` → 202 `{ actionId, status: "loading", ... }`; 409 nếu thiết bị đang loading, 503 nếu mất MQTT |
| UC06 | `GET /api/devices/actions?keyword&action&status&dateFrom&dateTo&page&limit` | `{ data, page, total }`; FE gửi thêm `device`, `time` |
| UC06 | `GET /api/devices/actions/export` | `text/csv` (UTF-8 BOM), cùng bộ lọc, không phân trang |
| UC04 | `PATCH /api/devices/actions/{actionId}` | `{ status: "fail" }` — FE báo timeout; chỉ đổi khi bản ghi còn `loading` |
| — | `GET /api/users` | Danh sách người dùng (không có mật khẩu) |
| — | `GET /api/health` | Trạng thái kết nối MySQL / MQTT |

**Tìm theo thời gian** (`time`, hoặc `keyword` dạng ngày giờ): tiền tố `yyyy/mm/dd hh:mm:ss`, chấp nhận `-` hoặc `/`,
nhập thiếu từ phải sang để mở rộng phạm vi (`2026/08/17 09` = cả giờ 9).
**Tìm theo giá trị** (`type` + `search`): so khớp tiền tố, `26` khớp 26.0, 26.3...

### WebSocket `ws://<host>/realtime?token=<JWT>`

| Event | Khi nào | Data |
|---|---|---|
| `sensor:update` | Nhận bản tin `iot/sensors/data` | giống `GET /api/sensors/latest` |
| `device:status` | ESP32 xác nhận qua `iot/devices/status` | `{ deviceId, actionId, status, confirmedAt }` |
| `action:update` | Lệnh mới (`loading`) hoặc thất bại (`fail`) | `{ actionId, deviceId, status, deviceStatus? }` |

Token sai → đóng kết nối với mã `4401`.

## MQTT — hợp đồng với firmware ESP32 (`../esp32_iot/esp32_iot.ino`)

| Topic | Chiều | Payload |
|---|---|---|
| `iot/sensors/data` | ESP32 → Backend | `{"timestamp":"2026-11-10 09:30:00","temperature":29.4,"humidity":58.6,"light":412}` mỗi 2 giây (DHT11 lỗi thì thiếu temperature/humidity — trường nào thiếu bỏ qua trường đó) |
| `iot/devices/control` | Backend → ESP32 | Văn bản thuần `LED1_ON`, `LED1_OFF`, … `LED3_OFF`, `ALL_ON`, `ALL_OFF` (QoS 1; thiết bị id N ↔ `LEDn`) |
| `iot/devices/status` | ESP32 → Backend | `{"device":"LED1","status":"ON","timestamp":"…"}` — mỗi đèn vừa đổi trạng thái một bản tin |

- `light` đã được ESP32 quy đổi sang lux. Trường nào không có trong bảng `sensors` sẽ bị Backend bỏ qua; muốn thêm cảm biến
  (vd. gas, dust, noise) thì thêm dòng vào `SENSORS` trong `scripts/db-init.mjs` — cột `warn_above` dự phòng cho ngưỡng cảnh báo.
- `measured_at` = `timestamp` NTP của ESP32 nếu đúng định dạng và lệch ≤ 5 phút so với giờ MySQL; `"N/A"`/sai/lệch nhiều → `NOW()`.
- Giá trị ngoài ngưỡng hợp lệ (nhiệt độ −40…85, độ ẩm 0…100, ánh sáng 0…100000) bị bỏ qua.
- Phản hồi khớp lệnh đang chờ → `on/off` + `confirmed_at`; phản hồi **ngược** lệnh → `fail` và đèn theo trạng thái thật.

## Luồng điều khiển đèn (UC04) & ngoại lệ

1. `POST /actions` → ghi `action_history.status = 'loading'`, `devices.current_status = 'loading'` **rồi** mới publish lệnh.
2. ESP32 phản hồi → `status = on/off`, `confirmed_at = NOW()`, đẩy `device:status`.
3. Quá `NUXT_ACTION_TIMEOUT_SECONDS` (mặc định 15s) hoặc FE gửi `PATCH ... fail` → `status = 'fail'`, thiết bị trả về trạng thái trước lệnh, đẩy `action:update`.
4. Backend khởi động lại → mọi lệnh còn `loading` chuyển `fail`.

Đặt timeout Backend **lớn hơn** `VITE_ACTION_TIMEOUT_SECONDS` của FE để FE hiện pop-up ngoại lệ trước.

## CSDL

`database/schema.sql` — 5 bảng theo Chương 4: `users`, `sensors`, `devices`, `sensor_data`, `action_history`
(snake_case vì MySQL trên Windows tự hạ chữ thường tên bảng). Khác biệt nhỏ so với báo cáo:

- `action_history.status` có thêm giá trị `'fail'` (cơ chế timeout mà báo cáo để dành cho giai đoạn triển khai; FE đã hiển thị FAIL).
- `devices.description` (nullable) — FE hiển thị mô tả dưới tên thiết bị.
- Seed 3 đèn `Đèn LED 1..3` (↔ `LED1..LED3` của ESP32) và 3 cảm biến: temperature, humidity, light. `db:init` gỡ gas/dust/noise nếu database còn.
- `sensors.type` là `VARCHAR(30)` và có cột `warn_above` (ngưỡng cảnh báo). Database tạo từ bản ESP8266 cũ được `npm run db:init` nâng cấp tại chỗ, không mất dữ liệu.

## Cấu trúc

```
server/
├── api/                    # RESTful API (file-based routing của Nitro)
│   ├── auth/               # login, logout
│   ├── sensors/            # index, latest, data
│   ├── devices/            # index, [id]/actions.post, actions/{index,export,[id].patch}
│   ├── users/  health.get.ts
├── routes/realtime.ts      # WebSocket /realtime
├── plugins/mqtt.ts         # MQTT client: subscribe sensor/status, xử lý bản tin
├── middleware/             # 01.cors, 02.auth (JWT)
└── utils/                  # db, auth, realtime, mqtt, sensors, devices, actions, query
database/schema.sql
scripts/db-init.mjs  scripts/esp-simulator.mjs
```
