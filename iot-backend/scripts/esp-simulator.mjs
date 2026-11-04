/**
 * Giả lập ESP8266 qua MQTT — chạy thử toàn hệ thống khi chưa có phần cứng.
 * Cùng topic/payload với firmware esp8266_iot.ino: sensor_data, device_control, device_response.
 *
 *   npm run esp:sim
 *   npm run esp:sim -- --interval 5 --delay 1200 --no-ack 2
 *
 *   --interval <giây>  chu kỳ publish sensor_data (mặc định 5)
 *   --delay <ms>       thời gian ESP "thực thi" lệnh trước khi phản hồi (mặc định 1000)
 *   --no-ack <id,...>  các thiết bị KHÔNG phản hồi lệnh -> kiểm thử ngoại lệ timeout (UC04)
 *
 * Gõ vào terminal khi đang chạy:  off = ngừng gửi (mô phỏng mất kết nối), on = gửi lại
 */
import mqtt from 'mqtt'
import readline from 'node:readline'

const argv = process.argv.slice(2)
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : def
}

const url = arg('url', process.env.NUXT_MQTT_URL || 'mqtt://127.0.0.1:8899')
const intervalMs = Number(arg('interval', 5)) * 1000
const delayMs = Number(arg('delay', 1000))
const noAck = new Set(String(arg('no-ack', '')).split(',').filter(Boolean).map(Number))

const LED_COUNT = 3
const leds = new Map(Array.from({ length: LED_COUNT }, (_, i) => [i + 1, 'off'])) // deviceId -> 'on' | 'off'
let online = true

const client = mqtt.connect(url, {
  clientId: `esp8266-sim-${Math.random().toString(16).slice(2, 8)}`,
  username: process.env.NUXT_MQTT_USERNAME || undefined,
  password: process.env.NUXT_MQTT_PASSWORD || undefined
})

// Giống publishResponse() của firmware: trạng thái thật của cả 3 đèn
function publishResponse() {
  const payload = {}
  for (const [id, state] of leds) payload[`led${id}`] = state
  payload.status = 'success'
  client.publish('device_response', JSON.stringify(payload), { qos: 1 })
  console.log('[esp-sim] -> device_response', payload)
}

client.on('connect', () => {
  console.log(`[esp-sim] Đã kết nối ${url}`)
  client.subscribe('device_control', { qos: 1 })
  publishResponse()
})
client.on('error', (e) => console.error('[esp-sim] Lỗi:', e.message))

client.on('message', (topic, buf) => {
  if (topic !== 'device_control') return
  let cmd
  try {
    cmd = JSON.parse(buf.toString())
  } catch {
    client.publish('device_response', JSON.stringify({ status: 'error', message: 'invalid json' }))
    return
  }
  console.log(`[esp-sim] <- ${topic}`, cmd)
  if (!online) return
  const targets = [...leds.keys()].filter((id) => cmd.all || cmd[`led${id}`])
  if (targets.length && targets.every((id) => noAck.has(id))) {
    console.log(`[esp-sim]    (không phản hồi thiết bị ${targets.join(',')})`)
    return
  }
  setTimeout(() => {
    for (const id of leds.keys()) {
      const value = String(cmd[`led${id}`] ?? cmd.all ?? '').toLowerCase()
      if ((value === 'on' || value === 'off') && !noAck.has(id)) leds.set(id, value)
    }
    publishResponse()
  }, delayMs)
})

const noise = (amp) => (Math.random() - 0.5) * 2 * amp
const round1 = (n) => Math.round(n * 10) / 10

setInterval(() => {
  if (!online || !client.connected) return
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI))
  const ledsOn = [...leds.values()].filter((s) => s === 'on').length
  const payload = {
    temperature: round1(26 + 4 * daylight + noise(0.3)),
    humidity: round1(68 - 10 * daylight + noise(0.8)),
    light: Math.round(450 * daylight + ledsOn * 40 + 15 + noise(12))
  }
  client.publish('sensor_data', JSON.stringify(payload), { qos: 0 })
  console.log('[esp-sim] -> sensor_data', payload)
}, intervalMs)

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const cmd = line.trim().toLowerCase()
  if (cmd === 'off' || cmd === 'on') {
    online = cmd === 'on'
    console.log(`[esp-sim] ESP8266 ${online ? 'ONLINE' : 'OFFLINE'}`)
  }
})
