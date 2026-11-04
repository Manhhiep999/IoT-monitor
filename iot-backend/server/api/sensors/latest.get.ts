// UC02 — GET /api/sensors/latest: chỉ đọc bản ghi mới nhất trong DB, không gọi MQTT
export default defineEventHandler(() => getLatestReadings())
