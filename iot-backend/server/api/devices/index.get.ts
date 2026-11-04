// UC04 — GET /api/devices: currentStatus được cập nhật khi Backend nhận bản tin device_response
export default defineEventHandler(async () => {
  return { data: await listDevices() }
})
