# IoT Monitor — Frontend (Vue.js)

Frontend cho đề tài **"Hệ thống giám sát nhiệt độ, độ ẩm và ánh sáng môi trường phòng học sử dụng ESP8266"**
(Hoàng Mạnh Hiệp — B23DCCN292), dựng theo thiết kế Figma
[HoangManhHiep-B23DCCN292-IoT](https://www.figma.com/design/ZMBZDNyG6Ddktflemuibn2) và đặc tả API trong báo cáo.

## Tech stack

| Thành phần | Thư viện |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) + Vite |
| Điều hướng | Vue Router 4 (có route guard đăng nhập) |
| State | Pinia |
| HTTP | Axios (gắn `Authorization: Bearer <token>`, tự về Login khi 401) |
| Realtime | WebSocket gốc `ws://<host>/realtime` (tự reconnect) |
| Biểu đồ | Chart.js 4 + vue-chartjs |
| Style | CSS thuần + design tokens lấy từ Figma (`src/assets/main.css`) |

## Chạy thử

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build production vào dist/
```

Mặc định `.env` để `VITE_USE_MOCK=true` → chạy được ngay **không cần Backend/ESP8266**.
Tài khoản demo: `admin@iot.com` / `matkhau123`.

Thử tình huống mất kết nối ESP8266 (mở DevTools → Console):

```js
__iotMock.setEspOnline(false) // sau ~30s Dashboard hiện banner OFFLINE, lệnh bật/tắt sẽ timeout
__iotMock.setEspOnline(true)
```

### Kết nối Backend Nuxt.js thật

Trong `.env`: đặt `VITE_USE_MOCK=false` và `VITE_BACKEND_URL=http://<ip-backend>:3000`.
Khi `npm run dev`, Vite proxy `/api` và `/realtime` sang Backend (không lo CORS).

| Biến | Ý nghĩa |
|---|---|
| `VITE_USE_MOCK` | `true` dùng dữ liệu giả lập, `false` gọi Backend thật |
| `VITE_BACKEND_URL` | Địa chỉ Backend cho proxy dev |
| `VITE_WS_URL` | (tuỳ chọn) URL WebSocket đầy đủ nếu không đi qua proxy |
| `VITE_OFFLINE_AFTER_SECONDS` | Quá số giây này không có dữ liệu mới → hiện banner mất kết nối (mặc định 30) |
| `VITE_ACTION_TIMEOUT_SECONDS` | ESP8266 không xác nhận lệnh trong số giây này → báo lỗi, trả công tắc về trạng thái cũ (mặc định 10) |

## Màn hình ↔ Use Case ↔ API

| Màn hình | Use Case | API / sự kiện sử dụng |
|---|---|---|
| Login | UC01 | `POST /api/auth/login`, `POST /api/auth/logout` |
| Dashboard | UC02, UC03, UC04 | `GET /api/sensors/latest`, `GET /api/sensors/data?range=24h`, `GET /api/devices`, `POST /api/devices/{id}/actions`, WS `sensor:update`, `device:status` |
| Data Sensor | UC05 | `GET /api/sensors`, `GET /api/sensors/data?type&time&search&page&limit` |
| Action History | UC06 | `GET /api/devices/actions?keyword&action&status&dateFrom&dateTo&page&limit`, `GET /api/devices/actions/export` |
| Profile | — | Thông tin tĩnh trong `src/utils/profile.js` |

### Luồng bật/tắt đèn (UC04)

1. Bấm công tắc → gửi `POST /api/devices/{id}/actions` với action **ngược** trạng thái hiện tại.
2. Giao diện chuyển ngay sang badge **LOADING**, khoá công tắc (không giả định đèn đã đổi trạng thái).
3. Chỉ khi nhận WS `device:status` (ESP8266 đã xác nhận) mới cập nhật **ON/OFF**.
4. Quá `VITE_ACTION_TIMEOUT_SECONDS` không có xác nhận → báo lỗi, trả công tắc về trạng thái cũ.

## Những điểm Backend cần thống nhất

Báo cáo chưa ghi rõ các điểm sau; Frontend đang giả định như dưới, sửa ở `src/services/api.js` nếu Backend khác:

- **Đăng nhập**: response nên có thêm `token` (JWT). Frontend lưu token vào `localStorage` và gửi qua header `Authorization` + query `?token=` khi mở WebSocket. Nếu dùng cookie httpOnly thì không cần (axios đã bật `withCredentials`).
- **Biểu đồ 24h**: gọi `GET /api/sensors/data?range=24h&limit=5000` — Backend cần hỗ trợ tham số `range=24h` (hoặc đổi sang endpoint riêng).
- **`GET /api/devices/actions`**: báo cáo chỉ đưa mẫu 1 bản ghi; Frontend mong đợi dạng `{ "data": [...], "page": 1, "total": 5 }` giống `/api/sensors/data`.
- **Ô thời gian ở Data Sensor** gửi chuỗi tiền tố dạng `YYYY-MM-DD HH:mm:ss` (cho phép thiếu, vd. `2026-08-17 09`) qua tham số `time`; Backend so khớp theo tiền tố.

## Cấu trúc thư mục

```
src/
├── assets/main.css          # design tokens + style dùng chung
├── router/index.js          # routes + guard đăng nhập
├── stores/
│   ├── auth.js              # phiên đăng nhập
│   └── monitor.js           # số liệu realtime, lịch sử 24h, thiết bị, lệnh chờ xác nhận
├── services/
│   ├── api.js               # toàn bộ RESTful API (tự chuyển sang mock khi VITE_USE_MOCK=true)
│   ├── http.js              # axios instance
│   ├── realtime.js          # WebSocket /realtime
│   └── mock/                # backend giả lập + event bus
├── layouts/AppLayout.vue    # sidebar + vùng nội dung (responsive)
├── components/              # StatCard, TrendChart, DeviceControl, ToggleSwitch, StatusBadge,
│                            # OfflineBanner, FilterDropdown, DataPagination, PageHeader, AppSidebar
├── views/                   # Login, Dashboard, DataSensor, ActionHistory, Profile
└── utils/                   # định dạng thời gian, thông tin Profile
```

## Ghi chú so với Figma

- Biểu đồ "Historical Trends (24 Hours)" vẽ 3 đường nhưng tách thành **3 panel nhỏ cạnh nhau**, mỗi panel một trục Y,
  vì °C, % và lux khác thang đo rất xa (0–35 so với 0–600). Vẽ chung một trục sẽ làm đường nhiệt độ/độ ẩm gần như phẳng.
- Frame "IoT Monitor" trên sidebar trong Figma có nền trắng + chữ trắng (chữ bị ẩn) — code hiển thị chữ trắng trên nền tối.
- Màn Action History trong Figma có dropdown "Thiết bị" / "Người điều khiển" nhưng API chỉ hỗ trợ lọc theo
  `action`, `status`, `dateFrom`, `dateTo` → dùng cùng kiểu dropdown cho **Hành động** và **Trạng thái**, thêm ô chọn khoảng thời gian.
- Thêm nút **Đăng xuất** ở cuối sidebar (API logout có trong báo cáo nhưng Figma chưa có vị trí).
- Cập nhật Lớp, link GitHub/Postman/PDF ở `src/utils/profile.js`.
