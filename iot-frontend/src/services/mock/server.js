/**
 * Backend giả lập (in-memory) — trả về đúng định dạng response trong báo cáo,
 * giúp chạy thử Frontend khi chưa có Backend Nuxt.js / ESP8266.
 *
 * Thử tình huống mất kết nối ESP8266 trong DevTools console:
 *   __iotMock.setEspOnline(false)   // ngừng gửi dữ liệu + không xác nhận lệnh
 *   __iotMock.setEspOnline(true)
 */
import { emitMockEvent } from './bus'
import { formatDateTime, parseDateTime } from '@/utils/datetime'

const SAMPLE_INTERVAL_MS = 5 * 60 * 1000 // dữ liệu lịch sử: 5 phút / lần đo
const LIVE_INTERVAL_MS = 5000 // dữ liệu realtime: 5 giây / lần đo
const CONFIRM_DELAY_MS = 1500 // ESP8266 phản hồi sau ~1.5s

const users = [
  { id: 1, username: 'admin@iot.com', password: 'matkhau123', fullName: 'Hoàng Mạnh Hiệp' },
  { id: 2, username: 'user@iot.com', password: 'matkhau123', fullName: 'Nguyễn Văn An' }
]

const sensors = [
  { id: 1, name: 'Nhiệt độ', type: 'temperature', unit: '°C' },
  { id: 2, name: 'Độ ẩm', type: 'humidity', unit: '%' },
  { id: 3, name: 'Ánh sáng', type: 'light', unit: 'lux' }
]

const devices = [
  { id: 1, name: 'Đèn LED 1', currentStatus: 'on', description: 'Đèn chiếu sáng khu vực 1' },
  { id: 2, name: 'Đèn LED 2', currentStatus: 'off', description: 'Đèn chiếu sáng khu vực 2' },
  { id: 3, name: 'Đèn LED 3', currentStatus: 'off', description: 'Đèn chiếu sáng khu vực 3' }
]

const sensorData = []
let nextSensorId = 1
let espOnline = true
let led2ExceptionEnabled = true // Mặc định bật mô phỏng ngoại lệ cho Đèn LED 2 để phục vụ demo báo cáo

const actionHistory = [
  { id: 207, deviceId: 1, userId: 1, action: 'OFF', status: 'off', createdAt: '2026-08-16 22:03:09', confirmedAt: '2026-08-16 22:03:11' },
  { id: 208, deviceId: 2, userId: 2, action: 'ON', status: 'fail', createdAt: '2026-08-17 08:14:59', confirmedAt: null },
  { id: 209, deviceId: 3, userId: 1, action: 'OFF', status: 'off', createdAt: '2026-08-17 08:15:45', confirmedAt: '2026-08-17 08:15:47' },
  { id: 210, deviceId: 1, userId: 2, action: 'ON', status: 'on', createdAt: '2026-08-17 09:40:00', confirmedAt: '2026-08-17 09:40:02' },
  { id: 211, deviceId: 2, userId: 1, action: 'OFF', status: 'off', createdAt: '2026-08-17 11:20:15', confirmedAt: '2026-08-17 11:20:17' },
  { id: 212, deviceId: 3, userId: 2, action: 'ON', status: 'on', createdAt: '2026-08-17 14:05:30', confirmedAt: '2026-08-17 14:05:32' }
]

// ---------- Sinh dữ liệu cảm biến ----------
const noise = (amp) => (Math.random() - 0.5) * 2 * amp
const round1 = (n) => Math.round(n * 10) / 10

function readingsAt(date) {
  const hour = date.getHours() + date.getMinutes() / 60
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI)) // 0 lúc đêm, 1 lúc trưa
  const activeLeds = devices.filter((d) => d.currentStatus === 'on').length
  return {
    temperature: round1(26 + 4 * daylight + noise(0.3)),
    humidity: round1(68 - 10 * daylight + noise(0.8)),
    light: Math.round(450 * daylight + activeLeds * 40 + 15 + noise(12))
  }
}

function pushReadings(date) {
  const values = readingsAt(date)
  const measuredAt = formatDateTime(date)
  for (const s of sensors) {
    sensorData.push({ id: nextSensorId++, sensorId: s.id, value: values[s.type], measuredAt })
  }
}

;(function seed() {
  const now = Date.now()
  const start = now - 24 * 60 * 60 * 1000
  for (let t = start; t <= now; t += SAMPLE_INTERVAL_MS) pushReadings(new Date(t))
})()

function latestPayload() {
  const result = {}
  for (const s of sensors) {
    const row = findLast(sensorData, (r) => r.sensorId === s.id)
    result[s.type] = row ? { value: row.value, unit: s.unit, updatedAt: row.measuredAt } : null
  }
  return result
}

setInterval(() => {
  if (!espOnline) return
  pushReadings(new Date())
  emitMockEvent('sensor:update', latestPayload())
}, LIVE_INTERVAL_MS)

// ---------- Helpers ----------
function findLast(arr, fn) {
  for (let i = arr.length - 1; i >= 0; i--) if (fn(arr[i])) return arr[i]
  return undefined
}

const delay = (ms = 250 + Math.random() * 200) => new Promise((r) => setTimeout(r, ms))

function httpError(status, message) {
  const err = new Error(message)
  err.response = { status, data: { message } }
  return err
}

function paginate(rows, page = 1, limit = 10) {
  const p = Math.max(1, Number(page) || 1)
  const l = Math.max(1, Number(limit) || 10)
  return { data: rows.slice((p - 1) * l, p * l), page: p, total: rows.length }
}

const sensorById = (id) => sensors.find((s) => s.id === id)

function toSensorRow(r) {
  const s = sensorById(r.sensorId)
  return { id: `S${r.id}`, sensorType: s.type, value: r.value, unit: s.unit, timestamp: r.measuredAt }
}

function toActionRow(a) {
  return {
    id: `A${a.id}`,
    deviceName: devices.find((d) => d.id === a.deviceId)?.name ?? '',
    performedBy: users.find((u) => u.id === a.userId)?.fullName ?? '',
    action: a.action,
    status: a.status,
    createdAt: a.createdAt,
    confirmedAt: a.confirmedAt
  }
}

function filterActions({ device, user, performedBy, action, status, time, keyword, dateFrom, dateTo } = {}) {
  const kw = keyword?.trim().toLowerCase()
  const rawTime = (time ?? keyword ?? '').trim()
  const targetUser = (user || performedBy || '').trim().toLowerCase()
  const from = parseDateTime(dateFrom)
  const to = parseDateTime(dateTo)

  return actionHistory
    .map(toActionRow)
    .filter((a) => {
      // 1. Lọc theo thiết bị
      if (device && a.deviceName !== device && a.deviceName.toLowerCase() !== device.toLowerCase()) {
        return false
      }

      // 2. Lọc theo người điều khiển thiết bị
      if (targetUser && a.performedBy.toLowerCase() !== targetUser) {
        return false
      }

      // 3. Lọc theo hành động (ON / OFF)
      if (action && a.action !== action) {
        return false
      }

      // 4. Lọc theo trạng thái (on / off / fail / loading)
      if (status && a.status.toLowerCase() !== status.toLowerCase()) {
        return false
      }

      // 5. Lọc theo khoảng ngày từ/đến nếu có
      if (from && parseDateTime(a.createdAt) < from) return false
      if (to && parseDateTime(a.createdAt) > to) return false

      // 6. Lọc theo thời gian yyyy/mm/dd hh:mm:ss (thiếu mức nào lọc tới mức đó)
      if (rawTime) {
        const rowTimeSlash = a.createdAt.replace(/-/g, '/')
        const rowTimeDash = a.createdAt.replace(/\//g, '-')
        const qSlash = rawTime.replace(/-/g, '/')
        const qDash = rawTime.replace(/\//g, '-')

        const matchesTime = rowTimeSlash.startsWith(qSlash) || rowTimeDash.startsWith(qDash)
        if (time || (!time && matchesTime)) {
          return matchesTime
        }

        // Nếu keyword thông thường không trùng thời gian thì so khớp các trường khác
        if (kw) {
          const matchGeneral = [a.id, a.deviceName, a.performedBy, a.action, a.status, a.createdAt].some((v) =>
            String(v).toLowerCase().includes(kw)
          )
          return matchesTime || matchGeneral
        }
      }

      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}


let currentUserId = 1

// ---------- API giả lập ----------
export async function login({ username, password }) {
  await delay()
  const user = users.find((u) => u.username === username && u.password === password)
  if (!user) throw httpError(401, 'Sai tài khoản hoặc mật khẩu')
  currentUserId = user.id
  return {
    token: 'mock-jwt-token',
    user: { id: user.id, fullName: user.fullName },
    message: 'Đăng nhập thành công'
  }
}

export async function logout() {
  await delay(100)
  return { message: 'Đăng xuất thành công' }
}

export async function getLatestSensors() {
  await delay()
  return latestPayload()
}

export async function getSensors() {
  await delay()
  return { data: sensors.map((s) => ({ ...s })) }
}

export async function getSensorData({ field, value, type, time, search, page, limit } = {}) {
  await delay()
  const activeField = field || (type ? type : time ? 'time' : 'all')
  const rawQuery = (value ?? search ?? time ?? '').trim()
  const kw = rawQuery.toLowerCase()

  const unitDec = (t) => (t === 'light' ? 0 : 1)

  const rows = sensorData
    .map(toSensorRow)
    .filter((r) => {
      // 1. Lọc theo từng loại cảm biến cụ thể
      if (activeField === 'temperature' || activeField === 'humidity' || activeField === 'light') {
        if (r.sensorType !== activeField) return false
        if (!rawQuery) return true

        const valStr = String(r.value)
        const valFixed = Number(r.value).toFixed(unitDec(r.sensorType))
        const qNorm = rawQuery.replace(',', '.')

        return valFixed.startsWith(qNorm) || valStr.startsWith(qNorm) || valFixed.includes(qNorm)
      }

      // 2. Lọc theo thời gian (chuẩn yyyy/mm/dd hh:mm:ss, thiếu mức nào lọc tới mức trước đó)
      if (activeField === 'time') {
        if (!rawQuery) return true
        const rowTimeSlash = r.timestamp.replace(/-/g, '/')
        const rowTimeDash = r.timestamp.replace(/\//g, '-')
        const qSlash = rawQuery.replace(/-/g, '/')
        const qDash = rawQuery.replace(/\//g, '-')

        return rowTimeSlash.startsWith(qSlash) || rowTimeDash.startsWith(qDash)
      }

      // 3. activeField === 'all' (Tất cả)
      if (!rawQuery) return true
      const valStr = String(r.value)
      const valFixed = Number(r.value).toFixed(unitDec(r.sensorType))
      const qNorm = rawQuery.replace(',', '.')
      const rowTimeSlash = r.timestamp.replace(/-/g, '/')
      const qSlash = rawQuery.replace(/-/g, '/')

      return (
        r.id.toLowerCase().includes(kw) ||
        r.sensorType.toLowerCase().includes(kw) ||
        r.unit.toLowerCase().includes(kw) ||
        valFixed.startsWith(qNorm) ||
        valStr.startsWith(qNorm) ||
        rowTimeSlash.startsWith(qSlash) ||
        rowTimeSlash.includes(qSlash) ||
        r.timestamp.includes(rawQuery)
      )
    })
    .reverse()

  return paginate(rows, page, limit)
}


export async function getSensorHistory24h() {
  await delay()
  const from = Date.now() - 24 * 60 * 60 * 1000
  const rows = sensorData.filter((r) => parseDateTime(r.measuredAt).getTime() >= from).map(toSensorRow)
  return { data: rows, page: 1, total: rows.length }
}

export async function getDevices() {
  await delay()
  return { data: devices.map((d) => ({ ...d })) }
}

export async function getUsers() {
  await delay()
  return { data: users.map((u) => ({ id: u.id, fullName: u.fullName, username: u.username })) }
}

export async function sendDeviceAction(deviceId, action) {
  await delay()
  const device = devices.find((d) => d.id === Number(deviceId))
  if (!device) throw httpError(404, 'Không tìm thấy thiết bị')
  if (!['ON', 'OFF'].includes(action)) throw httpError(400, 'Hành động không hợp lệ')

  const record = {
    id: Math.max(...actionHistory.map((a) => a.id)) + 1,
    deviceId: device.id,
    userId: currentUserId,
    action,
    status: 'loading',
    createdAt: formatDateTime(new Date()),
    confirmedAt: null
  }
  actionHistory.push(record)
  device.currentStatus = 'loading'

  // ESP8266 thực thi lệnh rồi publish trạng thái thật lên device_response
  setTimeout(() => {
    if (!espOnline) return

    // Mô phỏng ngoại lệ phần cứng cho LED 2: ESP8266 không gửi phản hồi xác nhận trạng thái
    if (device.id === 2 && led2ExceptionEnabled) {
      console.warn('[mock] Mô phỏng ngoại lệ UC04: ESP8266 không gửi phản hồi cho Đèn LED 2 (chờ Frontend timeout & rollback)')
      return
    }

    record.status = action === 'ON' ? 'on' : 'off'
    record.confirmedAt = formatDateTime(new Date())
    device.currentStatus = record.status
    emitMockEvent('device:status', {
      deviceId: device.id,
      actionId: `A${record.id}`,
      status: record.status,
      confirmedAt: record.confirmedAt
    })
  }, CONFIRM_DELAY_MS)

  // Nếu quá thời gian chờ mà chưa được xác nhận (loading), đánh dấu ngoại lệ là 'fail'
  const failTimeoutMs = device.id === 2 ? 3500 : 10000
  setTimeout(() => {
    if (record.status === 'loading') {
      record.status = 'fail'
      emitMockEvent('action:update', {
        actionId: `A${record.id}`,
        status: 'fail'
      })
    }
  }, failTimeoutMs)

  return {
    actionId: `A${record.id}`,
    deviceId: device.id,
    action,
    status: 'loading',
    createdAt: new Date().toISOString(),
    message: 'Yêu cầu đã được ghi nhận và chuyển tới MQTT'
  }
}

export async function updateActionStatus(actionId, status) {
  await delay(20)
  const idNum = Number(String(actionId).replace(/\D/g, ''))
  const record = actionHistory.find((a) => a.id === idNum)
  if (record) {
    record.status = status
    emitMockEvent('action:update', { actionId: `A${record.id}`, status })
    return { success: true, action: toActionRow(record) }
  }
  return { success: false }
}

export async function getActionHistory({ page, limit, ...filters } = {}) {
  await delay()
  return paginate(filterActions(filters), page, limit)
}

export async function exportActionHistory(filters = {}) {
  await delay()
  const header = ['ID', 'Actuator Name', 'Performed By', 'Triggered Action', 'Status', 'Execution Time', 'Confirmed At']
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = filterActions(filters).map((a) =>
    [
      a.id,
      a.deviceName,
      a.performedBy,
      `TURN ${a.action}`,
      a.status.toUpperCase(),
      a.createdAt ? a.createdAt.replace(/-/g, '/') : '',
      a.confirmedAt ? a.confirmedAt.replace(/-/g, '/') : ''
    ]
      .map(escape)
      .join(',')
  )
  return new Blob(['\ufeff' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
}

window.__iotMock = {
  setEspOnline(value) {
    espOnline = Boolean(value)
    console.info(`[mock] ESP8266 ${espOnline ? 'ONLINE' : 'OFFLINE'}`)
  },
  setLed2Exception(value) {
    led2ExceptionEnabled = Boolean(value)
    console.info(`[mock] LED 2 Exception Simulation: ${led2ExceptionEnabled ? 'ENABLED' : 'DISABLED'}`)
  },
  isLed2Exception() {
    return led2ExceptionEnabled
  }
}
