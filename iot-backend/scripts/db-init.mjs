/**
 * Khởi tạo CSDL: tạo database, chạy database/schema.sql, seed danh mục + tài khoản.
 *
 *   npm run db:init            # tạo bảng + seed users/sensors/devices (chạy lại nhiều lần không sao)
 *   npm run db:sample          # như trên + sinh 24h dữ liệu cảm biến mẫu và vài bản ghi ActionHistory
 *   npm run db:reset           # XOÁ toàn bộ bảng rồi tạo lại + dữ liệu mẫu
 */
import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const args = new Set(process.argv.slice(2))
const env = process.env
const cfg = {
  host: env.NUXT_DB_HOST || '127.0.0.1',
  port: Number(env.NUXT_DB_PORT || 3306),
  user: env.NUXT_DB_USER || 'root',
  password: env.NUXT_DB_PASSWORD || '',
  database: env.NUXT_DB_DATABASE || 'iot_monitor',
  timezone: env.NUXT_DB_TIMEZONE || '+07:00'
}

const USERS = [
  { username: 'admin@iot.com', password: 'matkhau123', fullName: 'Hoàng Mạnh Hiệp' },
  { username: 'user@iot.com', password: 'matkhau123', fullName: 'Nguyễn Văn An' }
]

// type trùng tên trường trong payload iot/sensors/data của ESP32. Trường nào không có trong danh mục
// này sẽ bị Backend bỏ qua.
const SENSORS = [
  { id: 1, name: 'Nhiệt độ', type: 'temperature', unit: '°C', warnAbove: null },
  { id: 2, name: 'Độ ẩm', type: 'humidity', unit: '%', warnAbove: null },
  { id: 3, name: 'Ánh sáng', type: 'light', unit: 'lux', warnAbove: null }
]
// Cảm biến đã gỡ khỏi hệ thống: xóa khỏi danh mục cùng dữ liệu đo của chúng
const REMOVED_SENSOR_TYPES = ['gas', 'dust', 'noise']

// Khớp với Frontend: Dashboard hiển thị danh sách thiết bị; LED 2 được FE dùng để demo ngoại lệ timeout
const DEVICES = [
  { id: 1, name: 'Đèn LED 1', description: 'Đèn chiếu sáng khu vực 1' },
  { id: 2, name: 'Đèn LED 2', description: 'Đèn chiếu sáng khu vực 2' },
  { id: 3, name: 'Đèn LED 3', description: 'Đèn chiếu sáng khu vực 3' }
]

const root = await mysql.createConnection({
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  password: cfg.password,
  multipleStatements: true,
  charset: 'utf8mb4'
})
await root.query(
  `CREATE DATABASE IF NOT EXISTS \`${cfg.database.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
)
await root.changeUser({ database: cfg.database })
await root.query('SET time_zone = ?', [cfg.timezone])

if (args.has('--reset')) {
  console.log('Xoá bảng cũ...')
  await root.query(
    'DROP TABLE IF EXISTS action_history, sensor_data, devices, sensors, users'
  )
}

const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8')
await root.query(schema)
await migrateSensorsTable()
console.log(`Đã tạo bảng trong database "${cfg.database}"`)

for (const u of USERS) {
  const hash = await bcrypt.hash(u.password, 10)
  await root.query(
    'INSERT IGNORE INTO users (username, hash_password, full_name) VALUES (?, ?, ?)',
    [u.username, hash, u.fullName]
  )
}
for (const s of SENSORS) {
  await root.query(
    `INSERT INTO sensors (id, name, type, unit, warn_above) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), unit = VALUES(unit), warn_above = VALUES(warn_above)`,
    [s.id, s.name, s.type, s.unit, s.warnAbove]
  )
}
for (const d of DEVICES) {
  await root.query('INSERT IGNORE INTO devices (id, name, description) VALUES (?, ?, ?)', [
    d.id,
    d.name,
    d.description
  ])
}
const [removed] = await root.query(
  `DELETE sd FROM sensor_data sd JOIN sensors s ON s.id = sd.sensor_id WHERE s.type IN (?)`,
  [REMOVED_SENSOR_TYPES]
)
const [removedSensors] = await root.query('DELETE FROM sensors WHERE type IN (?)', [REMOVED_SENSOR_TYPES])
if (removedSensors.affectedRows) {
  console.log(`Đã gỡ ${removedSensors.affectedRows} cảm biến giả lập và ${removed.affectedRows} bản ghi đo của chúng`)
}
console.log('Đã seed users / sensors / devices')

if (args.has('--sample')) {
  await seedSample()
}

await root.end()
console.log('Xong. Tài khoản demo: admin@iot.com / matkhau123')

async function seedSample() {
  const [[{ n }]] = await root.query('SELECT COUNT(*) AS n FROM sensor_data')
  if (n > 0) {
    console.log(`sensor_data đã có ${n} bản ghi — bỏ qua dữ liệu mẫu (dùng --reset để làm lại)`)
    return
  }

  // 24 giờ gần nhất, 5 phút / lần đo — mô phỏng chu kỳ ngày/đêm giống mock của Frontend
  const STEP_MS = 5 * 60 * 1000
  const [[{ nowStr }]] = await root.query("SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS nowStr")
  const now = new Date(nowStr.replace(' ', 'T'))
  const rows = []
  for (let t = now.getTime() - 24 * 3600 * 1000; t <= now.getTime(); t += STEP_MS) {
    const d = new Date(t)
    const hour = d.getHours() + d.getMinutes() / 60
    const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI))
    const noise = (amp) => (Math.random() - 0.5) * 2 * amp
    const at = fmt(d)
    rows.push([1, round(26 + 4 * daylight + noise(0.3), 1), at])
    rows.push([2, round(68 - 10 * daylight + noise(0.8), 1), at])
    rows.push([3, Math.round(450 * daylight + 55 + noise(12)), at])
  }
  await root.query('INSERT INTO sensor_data (sensor_id, value, measured_at) VALUES ?', [rows])
  console.log(`Đã sinh ${rows.length} bản ghi sensor_data mẫu`)

  const [[admin]] = await root.query('SELECT id FROM users WHERE username = ?', ['admin@iot.com'])
  const [[user]] = await root.query('SELECT id FROM users WHERE username = ?', ['user@iot.com'])
  const ago = (min) => fmt(new Date(now.getTime() - min * 60000))
  const agoPlus = (min, sec) => fmt(new Date(now.getTime() - min * 60000 + sec * 1000))
  const actions = [
    [admin.id, 1, 'OFF', 'off', ago(600), agoPlus(600, 2)],
    [user.id, 2, 'ON', 'fail', ago(420), null],
    [admin.id, 3, 'OFF', 'off', ago(400), agoPlus(400, 2)],
    [user.id, 1, 'ON', 'on', ago(300), agoPlus(300, 2)],
    [admin.id, 2, 'OFF', 'off', ago(200), agoPlus(200, 2)],
    [user.id, 3, 'ON', 'on', ago(90), agoPlus(90, 2)]
  ]
  await root.query(
    'INSERT INTO action_history (user_id, device_id, action, status, created_at, confirmed_at) VALUES ?',
    [actions]
  )
  // Đồng bộ current_status với lần xác nhận cuối cùng ở trên
  await root.query("UPDATE devices SET current_status = CASE id WHEN 1 THEN 'on' WHEN 3 THEN 'on' ELSE 'off' END")
  console.log(`Đã sinh ${actions.length} bản ghi action_history mẫu`)
}

/** Database tạo từ bản ESP8266 cũ: type là ENUM 3 giá trị và chưa có warn_above -> nâng cấp tại chỗ, giữ dữ liệu */
async function migrateSensorsTable() {
  const [cols] = await root.query(
    `SELECT COLUMN_NAME AS name, DATA_TYPE AS type FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sensors'`
  )
  if (cols.find((c) => c.name === 'type')?.type === 'enum') {
    await root.query('ALTER TABLE sensors MODIFY type VARCHAR(30) NOT NULL')
    console.log('Đã đổi sensors.type sang VARCHAR(30)')
  }
  if (!cols.some((c) => c.name === 'warn_above')) {
    await root.query('ALTER TABLE sensors ADD COLUMN warn_above DECIMAL(10,2) NULL AFTER unit')
    console.log('Đã thêm cột sensors.warn_above')
  }
}

function round(n, digits) {
  const p = 10 ** digits
  return Math.round(n * p) / p
}

function fmt(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
