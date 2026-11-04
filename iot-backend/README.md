# IoT Monitor — Backend (Nuxt.js)

Backend cho đề tài **"Hệ thống giám sát nhiệt độ, độ ẩm và ánh sáng môi trường phòng học sử dụng ESP8266"**
(Hoàng Mạnh Hiệp — B23DCCN292), hiện thực theo Chương 2–4 của báo cáo và khớp với Frontend `iot-frontend`.

```
ESP8266 ──MQTT──► Mosquitto ──► Backend Nuxt.js (Nitro) ──► MySQL
   ▲                               │  RESTful /api/**
   └──── device_control ◄──────────┘  WebSocket /realtime ──► Frontend Vue.js
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
npm run esp:sim           # (terminal khác) giả lập ESP8266 khi chưa có phần cứng
```

Tài khoản demo: `admin@iot.com` / `matkhau123`, `user@iot.com` / `matkhau123`.

Frontend: trong `iot-frontend/.env` đặt `VITE_USE_MOCK=false`, `VITE_BACKEND_URL=http://localhost:3000`, rồi `npm run dev`
(Vite proxy `/api` và `/realtime` sang Backend).

| Script | Việc làm |
|---|---|
| `npm run db:init` | Tạo database/bảng, seed users, sensors, devices (chạy lại không mất dữ liệu) |
| `npm run db:sample` | Như trên + 24h dữ liệu cảm biến (5 phút/lần) và 6 bản ghi ActionHistory mẫu nếu bảng còn trống |
| `npm run db:reset` | **Xoá** toàn bộ bảng rồi tạo lại kèm dữ liệu mẫu |
| `npm run esp:sim -- --interval 5 --no-ack 2` | Giả lập ESP8266: gửi cảm biến mỗi 5s, không phản hồi lệnh của thiết bị 2 (thử ngoại lệ UC04). Gõ `off`/`on` để mô phỏng mất kết nối |
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
| `sensor:update` | Nhận bản tin `sensor_data` | giống `GET /api/sensors/latest` |
| `device:status` | ESP8266 xác nhận qua `device_response` | `{ deviceId, actionId, status, confirmedAt }` |
| `action:update` | Lệnh mới (`loading`) hoặc thất bại (`fail`) | `{ actionId, deviceId, status, deviceStatus? }` |

Token sai → đóng kết nối với mã `4401`.

## MQTT — hợp đồng với firmware ESP8266

| Topic | Chiều | Payload |
|---|---|---|
| `sensor_data` | ESP → Backend | `{"temperature":29.4,"humidity":58.6,"light":412}` mỗi 2 giây (thiếu trường nào bỏ qua trường đó) |
| `device_control` | Backend → ESP | `{"led1":"on"}` (thiết bị id N ↔ `ledN`), hoặc `{"all":"off"}` (QoS 1) |
| `device_response` | ESP → Backend | `{"led1":"on","led2":"off","led3":"off","status":"success"}` — trạng thái đọc lại từ GPIO |

- Thời điểm đo `measured_at` lấy theo giờ Backend/MySQL lúc nhận (ESP8266 không cần đồng bộ NTP).
- Giá trị ngoài ngưỡng hợp lệ (nhiệt độ −40…85, độ ẩm 0…100, ánh sáng ≥ 0) bị bỏ qua.
- Firmware không gửi `actionId`: với mỗi đèn, nếu có lệnh `loading` và trạng thái thật khớp `action` thì chốt lệnh đó;
  không có lệnh chờ thì chỉ đồng bộ `devices.current_status` (vd. ESP khởi động lại).

## Luồng điều khiển đèn (UC04) & ngoại lệ

1. `POST /actions` → ghi `action_history.status = 'loading'`, `devices.current_status = 'loading'` **rồi** mới publish lệnh.
2. ESP8266 phản hồi → `status = on/off`, `confirmed_at = NOW()`, đẩy `device:status`.
3. Quá `NUXT_ACTION_TIMEOUT_SECONDS` (mặc định 15s) hoặc FE gửi `PATCH ... fail` → `status = 'fail'`, thiết bị trả về trạng thái trước lệnh, đẩy `action:update`.
4. Backend khởi động lại → mọi lệnh còn `loading` chuyển `fail`.

Đặt timeout Backend **lớn hơn** `VITE_ACTION_TIMEOUT_SECONDS` của FE để FE hiện pop-up ngoại lệ trước.

## CSDL

`database/schema.sql` — 5 bảng theo Chương 4: `users`, `sensors`, `devices`, `sensor_data`, `action_history`
(snake_case vì MySQL trên Windows tự hạ chữ thường tên bảng). Khác biệt nhỏ so với báo cáo:

- `action_history.status` có thêm giá trị `'fail'` (cơ chế timeout mà báo cáo để dành cho giai đoạn triển khai; FE đã hiển thị FAIL).
- `devices.description` (nullable) — FE hiển thị mô tả dưới tên thiết bị.
- Seed 3 đèn `Đèn LED 1..3` để khớp FE (FE dùng LED 2 làm demo ngoại lệ). Chỉ cần 1 đèn thì sửa `DEVICES` trong `scripts/db-init.mjs`.

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
