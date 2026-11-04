const pad = (n) => String(n).padStart(2, '0')

/** Date -> "YYYY-MM-DD HH:mm:ss" (định dạng thời gian dùng trong API) */
export function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** "YYYY-MM-DD HH:mm:ss" -> Date (chấp nhận cả ISO và yyyy/mm/dd) */
export function parseDateTime(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const s = String(value).trim()
  const normalized = s
    .replace(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/, (m, y, mo, d) => `${y}-${pad(mo)}-${pad(d)}`)
    .replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Date / string -> "yyyy/mm/dd hh:mm:ss" */
export function formatDateTimeSlash(value) {
  const d = parseDateTime(value)
  if (!d) return '--'
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** "09:42:15 — 17/08/2026" như trên Dashboard */
export function formatClockAndDate(value) {
  const d = parseDateTime(value)
  if (!d) return '--'
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} — ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function formatHourMinute(value) {
  const d = parseDateTime(value)
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ''
}

/**
 * Ô tìm kiếm thời gian chấp nhận "YYYY-MM-DD HH:mm:ss" và cho phép nhập thiếu
 * từ phải sang (vd. "2026-08-17 09:00" = cả phút 09:00, "2026-08-17 09" = cả giờ 9).
 */
const PARTIAL_DATETIME = /^\d{4}(-\d{2}(-\d{2}( \d{2}(:\d{2}(:\d{2})?)?)?)?)?$/

export function isValidPartialDateTime(value) {
  return !value || PARTIAL_DATETIME.test(value.trim())
}

/**
 * Kiểm tra tính hợp lệ của định dạng yyyy/mm/dd hh:mm:ss (cho phép nhập thiếu các cấp)
 * Chấp nhận dấu '/' hoặc '-'
 */
const PARTIAL_TIME_SLASH = /^\d{4}([/-]\d{1,2}([/-]\d{1,2}( \d{1,2}(:\d{1,2}(:\d{1,2})?)?)?)?)?$/

export function isValidPartialTimeSlash(value) {
  if (!value || !value.trim()) return true
  const v = value.trim()
  if (!PARTIAL_TIME_SLASH.test(v)) return false

  const [datePart, timePart] = v.replace(/-/g, '/').split(' ')
  const dateTokens = datePart.split('/')
  if (dateTokens[1] && (Number(dateTokens[1]) < 1 || Number(dateTokens[1]) > 12)) return false
  if (dateTokens[2] && (Number(dateTokens[2]) < 1 || Number(dateTokens[2]) > 31)) return false

  if (timePart !== undefined) {
    const timeTokens = timePart.split(':')
    if (timeTokens[0] && (Number(timeTokens[0]) < 0 || Number(timeTokens[0]) > 23)) return false
    if (timeTokens[1] && (Number(timeTokens[1]) < 0 || Number(timeTokens[1]) > 59)) return false
    if (timeTokens[2] && (Number(timeTokens[2]) < 0 || Number(timeTokens[2]) > 59)) return false
  }
  return true
}

/**
 * Chuẩn hoá chuỗi thời gian người dùng nhập về dạng tiền tố yyyy/mm/dd hh:mm:ss
 * Đảm bảo các số tháng, ngày, giờ, phút, giây luôn có 2 chữ số để lọc tiền tố chính xác
 */
export function normalizeTimeSlash(value) {
  if (!value || !value.trim()) return ''
  const trimmed = value.trim().replace(/-/g, '/')
  const [datePart, timePart] = trimmed.split(' ')

  const dateTokens = datePart.split('/')
  const y = dateTokens[0]
  const m = dateTokens[1] ? pad(dateTokens[1]) : ''
  const d = dateTokens[2] ? pad(dateTokens[2]) : ''

  let result = y
  if (m) result += '/' + m
  if (d) result += '/' + d

  if (timePart !== undefined) {
    const timeTokens = timePart.split(':')
    const hh = timeTokens[0] ? pad(timeTokens[0]) : ''
    const mm = timeTokens[1] !== undefined ? pad(timeTokens[1]) : ''
    const ss = timeTokens[2] !== undefined ? pad(timeTokens[2]) : ''

    if (hh) result += ' ' + hh
    if (mm) result += ':' + mm
    if (ss) result += ':' + ss
  }

  return result
}

