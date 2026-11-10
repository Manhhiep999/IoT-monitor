/**
 * Giả lập ESP32 qua MQTT — chạy thử toàn hệ thống khi chưa có phần cứng.
 * Cùng topic/payload với firmware esp32_iot.ino:
 *   publish   iot/sensors/data    {"timestamp","temperature","humidity","light"}
 *   subscribe iot/devices/control LED1_ON | LED1_OFF | ... | ALL_ON | ALL_OFF (văn bản thuần)
 *   publish   iot/devices/status  {"device":"LED1","status":"ON","timestamp":"..."}
 *
 *   npm run esp:sim
 *   npm run esp:sim -- --interval 2 --delay 300 --no-ack 2
 *
 *   --interval <giây>  chu kỳ publish iot/sensors/data (mặc định 2, giống firmware)
 *   --delay <ms>       thời gian ESP "thực thi" lệnh trước khi phản hồi (mặc định 200)
 *   --no-ack <id,...>  các đèn KHÔNG phản hồi lệnh -> kiểm thử ngoại lệ timeout (UC04)
 *
 * Gõ vào terminal khi đang chạy:  off = ngừng gửi (mô phỏng mất kết nối), on = gửi lại
 */
import mqtt from 'mqtt'
import readline from 'node:readline'

const SENSOR_TOPIC = 'iot/sensors/data'
const CONTROL_TOPIC = 'iot/devices/control'
const STATUS_TOPIC = 'iot/devices/status'

const argv = process.argv.slice(2)
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : def
}

const url = arg('url', process.env.NUXT_MQTT_URL || 'mqtt://127.0.0.1:8899')
const intervalMs = Number(arg('interval', 2)) * 1000
const delayMs = Number(arg('delay', 200))
const noAck = new Set(String(arg('no-ack', '')).split(',').filter(Boolean).map(Number))

const leds = new Map([1, 2, 3].map((id) => [id, 'OFF'])) // LED1..LED3 -> 'ON' | 'OFF'
let online = true

const pad = (n) => String(n).padStart(2, '0')
// Giống getDateTimeString() trên ESP32 (giờ NTP GMT+7, định dạng YYYY-MM-DD HH:MM:SS)
function nowString() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const client = mqtt.connect(url, {
  clientId: `esp32-sim-${Math.random().toString(16).slice(2, 8)}`,
  username: process.env.NUXT_MQTT_USERNAME || undefined,
  password: process.env.NUXT_MQTT_PASSWORD || undefined
})

client.on('connect', () => {
  console.log(`[esp-sim] Đã kết nối ${url}`)
  client.subscribe(CONTROL_TOPIC, { qos: 1 })
})
client.on('error', (e) => console.error('[esp-sim] Lỗi:', e.message))

function sendStatus(id) {
  const payload = { device: `LED${id}`, status: leds.get(id), timestamp: nowString() }
  client.publish(STATUS_TOPIC, JSON.stringify(payload))
  console.log(`[esp-sim] -> ${STATUS_TOPIC}`, payload)
}

client.on('message', (topic, buf) => {
  if (topic !== CONTROL_TOPIC) return
  const msg = buf.toString().trim()
  console.log(`[esp-sim] <- ${topic}: ${msg}`)
  if (!online) return

  const all = msg.match(/^ALL_(ON|OFF)$/)
  const one = msg.match(/^LED([1-3])_(ON|OFF)$/)
  if (!all && !one) return // firmware cũng bỏ qua lệnh không khớp

  const targets = all ? [1, 2, 3] : [Number(one[1])]
  const state = all ? all[1] : one[2]
  setTimeout(() => {
    for (const id of targets) {
      if (noAck.has(id)) {
        console.log(`[esp-sim]    (không phản hồi LED${id})`)
        continue
      }
      leds.set(id, state)
      sendStatus(id)
    }
  }, delayMs)
})

const noise = (amp) => (Math.random() - 0.5) * 2 * amp
const round2 = (n) => Math.round(n * 100) / 100

setInterval(() => {
  if (!online || !client.connected) return
  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI))
  const ledsOn = [...leds.values()].filter((s) => s === 'ON').length

  const payload = {
    timestamp: nowString(),
    temperature: round2(26 + 4 * daylight + noise(0.3)),
    humidity: round2(68 - 10 * daylight + noise(0.8)),
    light: Math.round(450 * daylight + ledsOn * 40 + 15 + noise(12))
  }
  client.publish(SENSOR_TOPIC, JSON.stringify(payload), { qos: 0 })
  console.log(`[esp-sim] -> ${SENSOR_TOPIC}`, payload)
}, intervalMs)

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const cmd = line.trim().toLowerCase()
  if (cmd === 'off' || cmd === 'on') {
    online = cmd === 'on'
    console.log(`[esp-sim] ESP32 ${online ? 'ONLINE' : 'OFFLINE'}`)
  }
})
