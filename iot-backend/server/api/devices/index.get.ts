// UC04 — GET /api/devices: currentStatus được cập nhật khi Backend nhận bản tin iot/devices/status
export default defineEventHandler(async () => {
  return { data: await listDevices() }
})
