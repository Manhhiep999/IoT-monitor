import type { H3Event } from 'h3'

export interface ActionRow {
  id: string
  deviceName: string
  performedBy: string
  action: 'ON' | 'OFF'
  status: string
  createdAt: string
  confirmedAt: string | null
}

export const ACTION_SELECT = `
  SELECT CONCAT('A', ah.id) AS id, d.name AS deviceName, u.full_name AS performedBy,
         ah.action, ah.status,
         DATE_FORMAT(ah.created_at, ${DATETIME_FMT}) AS createdAt,
         DATE_FORMAT(ah.confirmed_at, ${DATETIME_FMT}) AS confirmedAt
    FROM action_history ah
    JOIN devices d ON d.id = ah.device_id
    JOIN users u ON u.id = ah.user_id`

/**
 * Dựng điều kiện lọc cho GET /api/devices/actions và /export.
 * Theo báo cáo: keyword, action, status, dateFrom, dateTo.
 * Frontend gửi thêm: device (tên thiết bị), user/performedBy, time (tiền tố yyyy/mm/dd hh:mm:ss).
 */
export function actionFilters(event: H3Event) {
  const where: string[] = []
  const params: unknown[] = []

  const device = queryString(event, 'device')
  if (device) {
    where.push('d.name = ?')
    params.push(device)
  }

  const user = queryString(event, 'user') || queryString(event, 'performedBy')
  if (user) {
    where.push('u.full_name = ?')
    params.push(user)
  }

  const action = queryString(event, 'action').toUpperCase().replace(/^TURN\s+/, '')
  if (action) {
    if (action !== 'ON' && action !== 'OFF') throw badRequest('action chỉ nhận ON hoặc OFF')
    where.push('ah.action = ?')
    params.push(action)
  }

  const status = queryString(event, 'status').toLowerCase()
  if (status) {
    if (!['loading', 'on', 'off', 'fail'].includes(status)) {
      throw badRequest('status chỉ nhận loading, on, off hoặc fail')
    }
    where.push('ah.status = ?')
    params.push(status)
  }

  for (const [name, op, endOfDay] of [
    ['dateFrom', '>=', false],
    ['dateTo', '<=', true]
  ] as const) {
    const raw = queryString(event, name)
    if (!raw) continue
    const value = parseDateTimeParam(raw, endOfDay)
    if (!value) throw badRequest(`${name} sai định dạng (YYYY-MM-DD [HH:mm:ss])`)
    where.push(`ah.created_at ${op} ?`)
    params.push(value)
  }

  // time: so khớp tiền tố thời gian; keyword: tìm trên mọi cột (nếu là chuỗi thời gian cũng so tiền tố)
  const time = queryString(event, 'time')
  const keyword = queryString(event, 'keyword')
  if (time) {
    const prefix = normalizeTimePrefix(time)
    if (prefix === null) throw badRequest('time sai định dạng yyyy/mm/dd hh:mm:ss')
    where.push(`DATE_FORMAT(ah.created_at, '%Y/%m/%d %H:%i:%s') LIKE ?`)
    params.push(`${likeEscape(prefix)}%`)
  } else if (keyword) {
    const kw = `%${likeEscape(keyword)}%`
    const prefix = normalizeTimePrefix(keyword)
    where.push(`(CONCAT('A', ah.id) LIKE ? OR d.name LIKE ? OR u.full_name LIKE ? OR ah.action LIKE ?
                 OR ah.status LIKE ? OR DATE_FORMAT(ah.created_at, '%Y/%m/%d %H:%i:%s') LIKE ?
                 OR DATE_FORMAT(ah.created_at, ${DATETIME_FMT}) LIKE ?)`)
    params.push(kw, kw, kw, kw, kw, prefix ? `${likeEscape(prefix)}%` : kw, kw)
  }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params }
}
