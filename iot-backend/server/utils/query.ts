import type { H3Event } from 'h3'

/** Lấy tham số query dạng chuỗi đã trim (bỏ qua mảng / rỗng) */
export function queryString(event: H3Event, name: string): string {
  const raw = getQuery(event)[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  return value == null ? '' : String(value).trim()
}

export function pagination(event: H3Event, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(queryString(event, 'page'), 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(queryString(event, 'limit'), 10) || 10))
  return { page, limit, offset: (page - 1) * limit }
}

/** Escape ký tự đại diện của LIKE trong chuỗi người dùng nhập */
export function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`)
}

const pad = (n: string) => n.padStart(2, '0')

/**
 * Chuẩn hoá chuỗi thời gian người dùng nhập về tiền tố "yyyy/mm/dd hh:mm:ss"
 * (chấp nhận '-' hoặc '/', cho phép nhập thiếu từ phải sang, vd. "2026-8-17 9" -> "2026/08/17 09").
 * Trả về null nếu không đúng định dạng.
 */
export function normalizeTimePrefix(value: string): string | null {
  const v = value.trim().replace(/-/g, '/')
  if (!v) return ''
  if (!/^\d{4}(\/\d{1,2}(\/\d{1,2}( \d{1,2}(:\d{1,2}(:\d{1,2})?)?)?)?)?$/.test(v)) return null
  const [datePart, timePart] = v.split(' ')
  const [y, m, d] = datePart.split('/')
  let result = y
  if (m) result += '/' + pad(m)
  if (d) result += '/' + pad(d)
  if (timePart) {
    const [hh, mm, ss] = timePart.split(':')
    result += ' ' + pad(hh)
    if (mm !== undefined) result += ':' + pad(mm)
    if (ss !== undefined) result += ':' + pad(ss)
  }
  return result
}

/** "2026-08-17", "2026-08-17 09:30", "2026/08/17T09:30:00" -> "2026-08-17 09:30:00" hoặc null */
export function parseDateTimeParam(value: string, endOfDay = false): string | null {
  const m = value
    .trim()
    .match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/)
  if (!m) return null
  const [, y, mo, d, hh, mi, ss] = m
  const time = hh
    ? `${pad(hh)}:${pad(mi)}:${pad(ss ?? (endOfDay ? '59' : '00'))}`
    : endOfDay
      ? '23:59:59'
      : '00:00:00'
  return `${y}-${pad(mo)}-${pad(d)} ${time}`
}

/** "A211" / "S1024" / "211" -> 211 */
export function parseEntityId(raw: unknown): number | null {
  const n = Number(String(raw ?? '').replace(/^[A-Za-z]+/, ''))
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

export function badRequest(message: string) {
  return createError({ statusCode: 400, statusMessage: 'Bad Request', message })
}

export function notFound(message: string) {
  return createError({ statusCode: 404, statusMessage: 'Not Found', message })
}
