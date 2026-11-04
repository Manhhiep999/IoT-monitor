// GET /api/health — kiểm tra nhanh kết nối MySQL / MQTT
export default defineEventHandler(async () => {
  let database = true
  try {
    await dbQuery('SELECT 1')
  } catch {
    database = false
  }
  return { status: 'ok', database, mqtt: isMqttConnected(), realtimeClients: realtimeClientCount() }
})
