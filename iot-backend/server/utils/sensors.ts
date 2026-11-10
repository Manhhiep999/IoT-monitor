export interface SensorRow {
  id: number
  name: string
  type: string
  unit: string
  /** Ngưỡng cảnh báo (vượt ngưỡng -> warning); null = cảm biến không có ngưỡng */
  warnAbove: number | null
}

export interface LatestReading {
  value: number
  unit: string
  updatedAt: string
  warning: boolean
}

// Giới hạn hợp lệ theo loại cảm biến; loại mới thêm vào bảng sensors chỉ cần là số hữu hạn
const VALID_RANGE: Record<string, [number, number]> = {
  temperature: [-40, 85], // DHT11
  humidity: [0, 100], // DHT11
  light: [0, 100000] // LDR đã quy đổi sang lux trên ESP32
}

// "YYYY-MM-DD HH:mm:ss" do ESP32 lấy từ NTP; "N/A" khi chưa đồng bộ được giờ
const ESP_TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
// Giờ ESP32 lệch quá ngưỡng này so với giờ máy chủ thì dùng giờ máy chủ
const MAX_CLOCK_SKEW_SECONDS = 300

let sensorCache: SensorRow[] | null = null

export async function listSensors(refresh = false): Promise<SensorRow[]> {
  if (!sensorCache || refresh) {
    const rows = await dbQuery<SensorRow>(
      'SELECT id, name, type, unit, warn_above AS warnAbove FROM sensors ORDER BY id'
    )
    sensorCache = rows.map((r) => ({ ...r, warnAbove: r.warnAbove == null ? null : Number(r.warnAbove) }))
  }
  return sensorCache
}

/** Bản ghi mới nhất của từng loại cảm biến — định dạng response GET /api/sensors/latest và event sensor:update */
export async function getLatestReadings(): Promise<Record<string, LatestReading | null>> {
  const rows = await dbQuery<{
    type: string
    unit: string
    warnAbove: number | null
    value: number | null
    updatedAt: string | null
  }>(
    `SELECT s.type, s.unit, s.warn_above AS warnAbove, sd.value,
            DATE_FORMAT(sd.measured_at, ${DATETIME_FMT}) AS updatedAt
       FROM sensors s
       LEFT JOIN sensor_data sd ON sd.id = (
         SELECT x.id FROM sensor_data x
          WHERE x.sensor_id = s.id
          ORDER BY x.measured_at DESC, x.id DESC
          LIMIT 1)
      ORDER BY s.id`
  )
  const result: Record<string, LatestReading | null> = {}
  for (const r of rows) {
    if (r.value == null) {
      result[r.type] = null
      continue
    }
    const value = Number(r.value)
    const warning = r.warnAbove != null && value > Number(r.warnAbove)
    result[r.type] = { value, unit: r.unit, updatedAt: r.updatedAt!, warning }
  }
  return result
}

/**
 * Lưu một bản tin từ topic iot/sensors/data, vd.
 *   {"timestamp":"2026-11-10 09:30:00","temperature":29.4,"humidity":58.6,"light":412}
 * Duyệt theo danh mục sensors trong DB nên thêm cảm biến mới không cần sửa code; trường lạ bị bỏ qua.
 * Thời điểm đo lấy theo timestamp NTP của ESP32 nếu hợp lệ và lệch ≤ 5 phút so với giờ máy chủ, ngược lại dùng NOW().
 * Trả về số giá trị đã lưu.
 */
export async function saveSensorPayload(payload: Record<string, unknown>, retried = false): Promise<number> {
  let sensors = await listSensors(retried)
  if (!sensors.length) sensors = await listSensors(true)

  const espTime = typeof payload.timestamp === 'string' && ESP_TIME_RE.test(payload.timestamp) ? payload.timestamp : null
  const values: unknown[] = []
  let count = 0
  for (const s of sensors) {
    const raw = payload[s.type]
    if (raw === undefined || raw === null || raw === '') continue
    const value = Number(raw)
    const [min, max] = VALID_RANGE[s.type] ?? [-Infinity, Infinity]
    if (!Number.isFinite(value) || value < min || value > max) {
      console.warn(`[mqtt] Bỏ qua giá trị ${s.type}=${String(raw)} không hợp lệ`)
      continue
    }
    count++
    values.push(s.id, Math.round(value * 100) / 100)
  }
  if (!count) return 0

  // Một câu INSERT nhiều dòng -> các giá trị cùng lần đo có chung một mốc thời gian
  const measuredAt = espTime
    ? `IF(ABS(TIMESTAMPDIFF(SECOND, ?, NOW())) <= ${MAX_CLOCK_SKEW_SECONDS}, ?, NOW())`
    : 'NOW()'
  const sql = `INSERT INTO sensor_data (sensor_id, value, measured_at)
               SELECT v.sensor_id, v.value, ${measuredAt}
                 FROM (${Array(count).fill('SELECT ? AS sensor_id, ? AS value').join(' UNION ALL ')}) v`
  try {
    await dbExec(sql, espTime ? [espTime, espTime, ...values] : values)
  } catch (e: any) {
    // Danh mục sensors vừa đổi (vd. db:init gỡ cảm biến) khi Backend đang chạy -> tải lại danh mục, ghi lại 1 lần
    if (e.code === 'ER_NO_REFERENCED_ROW_2' && !retried) return saveSensorPayload(payload, true)
    throw e
  }
  return count
}
