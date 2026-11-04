export interface SensorRow {
  id: number
  name: string
  type: string
  unit: string
}

export interface LatestReading {
  value: number
  unit: string
  updatedAt: string
}

// Giới hạn hợp lệ theo loại cảm biến (DHT11 / LDR); loại mới thêm vào bảng sensors chỉ cần là số hữu hạn
const VALID_RANGE: Record<string, [number, number]> = {
  temperature: [-40, 85],
  humidity: [0, 100],
  light: [0, 100000]
}

let sensorCache: SensorRow[] | null = null

export async function listSensors(refresh = false): Promise<SensorRow[]> {
  if (!sensorCache || refresh) {
    sensorCache = await dbQuery<SensorRow>('SELECT id, name, type, unit FROM sensors ORDER BY id')
  }
  return sensorCache
}

/** Bản ghi mới nhất của từng loại cảm biến — định dạng response GET /api/sensors/latest và event sensor:update */
export async function getLatestReadings(): Promise<Record<string, LatestReading | null>> {
  const rows = await dbQuery<{ type: string; unit: string; value: number | null; updatedAt: string | null }>(
    `SELECT s.type, s.unit, sd.value, DATE_FORMAT(sd.measured_at, ${DATETIME_FMT}) AS updatedAt
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
    result[r.type] = r.value == null ? null : { value: r.value, unit: r.unit, updatedAt: r.updatedAt! }
  }
  return result
}

/**
 * Lưu một bản tin từ topic sensor_data, vd. {"temperature":29.4,"humidity":58.6,"light":412}.
 * Duyệt theo danh mục sensors trong DB nên thêm cảm biến mới không cần sửa code.
 * Trả về số giá trị đã lưu.
 */
export async function saveSensorPayload(payload: Record<string, unknown>): Promise<number> {
  let sensors = await listSensors()
  if (!sensors.length) sensors = await listSensors(true)

  const values: unknown[] = []
  const placeholders: string[] = []
  for (const s of sensors) {
    const raw = payload[s.type]
    if (raw === undefined || raw === null || raw === '') continue
    const value = Number(raw)
    const [min, max] = VALID_RANGE[s.type] ?? [-Infinity, Infinity]
    if (!Number.isFinite(value) || value < min || value > max) {
      console.warn(`[mqtt] Bỏ qua giá trị ${s.type}=${String(raw)} không hợp lệ`)
      continue
    }
    // Một câu INSERT nhiều dòng -> các giá trị cùng lần đo có chung NOW()
    placeholders.push('(?, ?, NOW())')
    values.push(s.id, Math.round(value * 100) / 100)
  }
  if (!placeholders.length) return 0
  await dbExec(`INSERT INTO sensor_data (sensor_id, value, measured_at) VALUES ${placeholders.join(', ')}`, values)
  return placeholders.length
}
