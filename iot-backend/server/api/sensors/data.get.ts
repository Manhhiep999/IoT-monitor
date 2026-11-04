/**
 * UC03 / UC05 — GET /api/sensors/data
 *
 * Báo cáo: type, time, search, page, limit. Frontend gửi thêm field/value (tiêu chí đang chọn ở Data Sensor)
 * và range=24h cho biểu đồ "Historical Trends".
 *   type   : temperature | humidity | light — lọc loại cảm biến; search khi đó so khớp tiền tố giá trị
 *   time   : tiền tố thời gian yyyy/mm/dd hh:mm:ss (nhập thiếu -> mở rộng ra cả giờ/ngày/...)
 *   search : không có type -> tìm trên ID, loại, đơn vị, giá trị, thời gian
 */
const RANGE_RE = /^(\d+)\s*(h|d)$/i

// Giá trị dạng chuỗi bỏ số 0 thừa: 26.50 -> "26.5", 412.00 -> "412"
const VALUE_TEXT = "TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(sd.value AS CHAR)))"

export default defineEventHandler(async (event) => {
  const range = queryString(event, 'range')
  if (range) return rangeSeries(range)

  const { page, limit, offset } = pagination(event, 5000)
  const field = queryString(event, 'field')
  const type = queryString(event, 'type') || (['temperature', 'humidity', 'light'].includes(field) ? field : '')
  const rawTime = queryString(event, 'time') || (field === 'time' ? queryString(event, 'value') : '')
  const search = queryString(event, 'search') || (!type && field !== 'time' ? queryString(event, 'value') : '')

  const where: string[] = []
  const params: unknown[] = []

  if (type) {
    where.push('s.type = ?')
    params.push(type)
  }

  if (rawTime) {
    const prefix = normalizeTimePrefix(rawTime)
    if (prefix === null) throw badRequest('time sai định dạng yyyy/mm/dd hh:mm:ss')
    where.push(`DATE_FORMAT(sd.measured_at, '%Y/%m/%d %H:%i:%s') LIKE ?`)
    params.push(`${likeEscape(prefix)}%`)
  }

  if (search) {
    const value = likeEscape(search.replace(',', '.'))
    if (type) {
      // Đã chọn loại cảm biến: ô tìm kiếm lọc theo giá trị đo (vd. 26 -> 26, 26.3, 26.75...)
      where.push(`(CAST(sd.value AS CHAR) LIKE ? OR ${VALUE_TEXT} LIKE ?)`)
      params.push(`${value}%`, `${value}%`)
    } else {
      const kw = `%${likeEscape(search)}%`
      const prefix = normalizeTimePrefix(search)
      where.push(`(CONCAT('S', sd.id) LIKE ? OR s.type LIKE ? OR s.name LIKE ? OR s.unit LIKE ?
                   OR CAST(sd.value AS CHAR) LIKE ? OR ${VALUE_TEXT} LIKE ?
                   OR DATE_FORMAT(sd.measured_at, '%Y/%m/%d %H:%i:%s') LIKE ?
                   OR DATE_FORMAT(sd.measured_at, ${DATETIME_FMT}) LIKE ?)`)
      params.push(kw, kw, kw, kw, `${value}%`, `${value}%`, prefix ? `${likeEscape(prefix)}%` : kw, kw)
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const from = 'FROM sensor_data sd JOIN sensors s ON s.id = sd.sensor_id'

  const [rows, count] = await Promise.all([
    dbQuery(
      `SELECT CONCAT('S', sd.id) AS id, s.type AS sensorType, sd.value, s.unit,
              DATE_FORMAT(sd.measured_at, ${DATETIME_FMT}) AS timestamp
         ${from} ${whereSql}
        ORDER BY sd.measured_at DESC, sd.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    dbOne<{ total: number }>(`SELECT COUNT(*) AS total ${from} ${whereSql}`, params)
  ])

  return { data: rows, page, total: Number(count?.total ?? 0) }
})

/**
 * Dữ liệu biểu đồ trong khoảng thời gian gần nhất (vd. range=24h).
 * Gom nhóm trung bình theo khung (~288 điểm / cảm biến) để biểu đồ nhẹ dù ESP8266 gửi vài giây một lần.
 */
async function rangeSeries(range: string) {
  const m = range.match(RANGE_RE)
  if (!m) throw badRequest('range không hợp lệ (vd. 24h, 7d)')
  const seconds = Number(m[1]) * (m[2].toLowerCase() === 'd' ? 86400 : 3600)
  if (!seconds || seconds > 31 * 86400) throw badRequest('range tối đa 31 ngày')
  const bucket = Math.max(60, Math.ceil(seconds / 288))

  const rows = await dbQuery(
    `SELECT CONCAT('S', MAX(sd.id)) AS id, s.type AS sensorType, ROUND(AVG(sd.value), 2) AS value, s.unit,
            DATE_FORMAT(MAX(sd.measured_at), ${DATETIME_FMT}) AS timestamp
       FROM sensor_data sd
       JOIN sensors s ON s.id = sd.sensor_id
      WHERE sd.measured_at >= NOW() - INTERVAL ? SECOND
      GROUP BY s.id, s.type, s.unit, FLOOR(UNIX_TIMESTAMP(sd.measured_at) / ?)
      ORDER BY timestamp ASC, s.id ASC`,
    [seconds, bucket]
  )
  // AVG trả về DECIMAL -> ép về number cho đồng nhất với các API khác
  const data = rows.map((r: any) => ({ ...r, value: Number(r.value) }))
  return { data, page: 1, total: data.length }
}
