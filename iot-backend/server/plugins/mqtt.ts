import mqtt from 'mqtt'

/**
 * MQTT client của Backend:
 *   subscribe iot/sensors/data     -> lưu SensorData, đẩy WS sensor:update
 *   subscribe iot/devices/status   -> chốt ActionHistory, cập nhật Devices, đẩy WS device:status
 *   publish   iot/devices/control  (lệnh LED1_ON... ở POST /api/devices/{id}/actions)
 */
export default defineNitroPlugin((nitroApp) => {
  const { mqtt: cfg } = useRuntimeConfig()

  recoverStaleActions().catch((e) =>
    console.error('[db] Không xử lý được lệnh loading cũ (kiểm tra kết nối MySQL):', e.message)
  )

  const client = mqtt.connect(cfg.url, {
    clientId: cfg.clientId || `iot-backend-${Math.random().toString(16).slice(2, 10)}`,
    username: cfg.username || undefined,
    password: cfg.password || undefined,
    reconnectPeriod: 3000,
    connectTimeout: 10000
  })
  setMqttClient(client)

  client.on('connect', () => {
    console.info(`[mqtt] Đã kết nối ${cfg.url}`)
    client.subscribe([TOPICS.sensorData, TOPICS.deviceStatus], { qos: 1 }, (err) => {
      if (err) console.error('[mqtt] Subscribe lỗi:', err.message)
    })
  })
  client.on('reconnect', () => console.info('[mqtt] Đang kết nối lại...'))
  client.on('offline', () => console.warn('[mqtt] Mất kết nối Broker'))
  client.on('error', (err) => console.error('[mqtt] Lỗi:', err.message))

  client.on('message', async (topic, buffer) => {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(buffer.toString())
      if (!payload || typeof payload !== 'object') throw new Error('payload không phải object')
    } catch {
      console.warn(`[mqtt] Bỏ qua bản tin không phải JSON trên ${topic}`)
      return
    }

    try {
      if (topic === TOPICS.sensorData) {
        if (await saveSensorPayload(payload)) broadcast('sensor:update', await getLatestReadings())
        return
      }
      if (topic === TOPICS.deviceStatus) await handleDeviceStatus(payload)
    } catch (e: any) {
      console.error(`[mqtt] Lỗi xử lý bản tin ${topic}:`, e.message)
    }
  })

  nitroApp.hooks.hook('close', async () => {
    clearPendingActions()
    setMqttClient(null)
    await client.endAsync()
    await closeDb()
  })
})
