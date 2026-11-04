/**
 * Vòng đời một lệnh điều khiển (UC04):
 *   POST /actions -> ActionHistory.status = 'loading', Devices.current_status = 'loading', publish device_control
 *   ESP8266 publish device_response (trạng thái thật cả 3 đèn) -> lệnh đang chờ của đèn nào khớp trạng thái
 *     thì status = on/off, confirmed_at = NOW(), đẩy WS device:status
 *   Quá actionTimeoutSeconds (hoặc Frontend báo PATCH fail) -> status = 'fail', trả thiết bị về trạng thái cũ
 */
export type DeviceStatus = 'loading' | 'on' | 'off'

export interface DeviceRow {
  id: number
  name: string
  description: string | null
  currentStatus: DeviceStatus
}

// actionId -> lệnh đang chờ ESP8266 xác nhận
const pending = new Map<
  number,
  { deviceId: number; action: 'ON' | 'OFF'; previousStatus: DeviceStatus; timer: NodeJS.Timeout }
>()

export const actionCode = (id: number) => `A${id}`

export function listDevices() {
  return dbQuery<DeviceRow>(
    'SELECT id, name, description, current_status AS currentStatus FROM devices ORDER BY id'
  )
}

export function getDevice(id: number) {
  return dbOne<DeviceRow>(
    'SELECT id, name, description, current_status AS currentStatus FROM devices WHERE id = ?',
    [id]
  )
}

/** Trạng thái on/off đã được xác nhận gần nhất của thiết bị (dùng khi không còn biết trạng thái trước lệnh) */
async function lastConfirmedStatus(deviceId: number): Promise<DeviceStatus> {
  const row = await dbOne<{ status: DeviceStatus }>(
    `SELECT status FROM action_history
      WHERE device_id = ? AND status IN ('on', 'off')
      ORDER BY confirmed_at DESC, id DESC LIMIT 1`,
    [deviceId]
  )
  return row?.status ?? 'off'
}

export async function createAction(userId: number, device: DeviceRow, action: 'ON' | 'OFF') {
  const result = await dbExec(
    "INSERT INTO action_history (user_id, device_id, action, status, created_at) VALUES (?, ?, ?, 'loading', NOW())",
    [userId, device.id, action]
  )
  const actionId = result.insertId
  await dbExec("UPDATE devices SET current_status = 'loading' WHERE id = ?", [device.id])

  const timeoutMs = Number(useRuntimeConfig().actionTimeoutSeconds) * 1000
  pending.set(actionId, {
    deviceId: device.id,
    action,
    previousStatus: device.currentStatus,
    timer: setTimeout(() => {
      failAction(actionId, 'timeout').catch((e) => console.error('[action] Lỗi đánh dấu timeout:', e))
    }, timeoutMs)
  })
  broadcast('action:update', { actionId: actionCode(actionId), deviceId: device.id, status: 'loading' })
  return actionId
}

/** Đánh dấu lệnh thất bại nếu vẫn đang loading; trả thiết bị về trạng thái trước khi gửi lệnh */
export async function failAction(actionId: number, reason: string): Promise<boolean> {
  const info = pending.get(actionId)
  if (info) clearTimeout(info.timer)
  pending.delete(actionId)

  const row = await dbOne<{ deviceId: number }>('SELECT device_id AS deviceId FROM action_history WHERE id = ?', [
    actionId
  ])
  if (!row) return false
  const result = await dbExec("UPDATE action_history SET status = 'fail' WHERE id = ? AND status = 'loading'", [
    actionId
  ])
  if (!result.affectedRows) return false

  const previous = info?.previousStatus && info.previousStatus !== 'loading'
    ? info.previousStatus
    : await lastConfirmedStatus(row.deviceId)
  await dbExec("UPDATE devices SET current_status = ? WHERE id = ? AND current_status = 'loading'", [
    previous,
    row.deviceId
  ])
  console.warn(`[action] ${actionCode(actionId)} thất bại (${reason}), thiết bị ${row.deviceId} -> ${previous}`)
  broadcast('action:update', {
    actionId: actionCode(actionId),
    deviceId: row.deviceId,
    status: 'fail',
    deviceStatus: previous
  })
  return true
}

/**
 * Xử lý bản tin device_response của firmware, vd. {"led1":"on","led2":"off","led3":"off","status":"success"}.
 * Firmware gửi trạng thái đọc lại từ chân GPIO của cả 3 đèn sau MỖI lệnh (và khi vừa kết nối MQTT),
 * không kèm actionId -> với từng đèn: nếu có lệnh đang chờ và trạng thái thật khớp ý định của lệnh thì chốt lệnh;
 * nếu không có lệnh đang chờ thì chỉ đồng bộ current_status.
 */
export async function handleDeviceResponse(payload: Record<string, unknown>) {
  if (String(payload.status ?? '').toLowerCase() === 'error') {
    console.warn('[mqtt] ESP8266 báo lỗi:', payload)
    return
  }
  for (const device of await listDevices()) {
    const status = String(payload[ledKey(device.id)] ?? '').toLowerCase()
    if (status === 'on' || status === 'off') await applyDeviceState(device, status)
  }
}

async function applyDeviceState(device: DeviceRow, status: 'on' | 'off') {
  const waiting = [...pending.entries()].find(([, p]) => p.deviceId === device.id)

  if (!waiting) {
    // Không có lệnh chờ (ESP khởi động lại / phản hồi lệnh của đèn khác): chỉ đồng bộ khi trạng thái đổi
    if (device.currentStatus === 'loading' || device.currentStatus === status) return
    await dbExec('UPDATE devices SET current_status = ? WHERE id = ?', [status, device.id])
    broadcast('device:status', { deviceId: device.id, status, confirmedAt: null })
    return
  }

  const [actionId, info] = waiting
  // Phản hồi này sinh ra từ lệnh của đèn khác, đèn này chưa đổi -> tiếp tục chờ (hết hạn thì timeout)
  if (info.action.toLowerCase() !== status) return

  clearTimeout(info.timer)
  pending.delete(actionId)
  const result = await dbExec(
    "UPDATE action_history SET status = ?, confirmed_at = NOW() WHERE id = ? AND status = 'loading'",
    [status, actionId]
  )
  let confirmedAt: string | null = null
  if (result.affectedRows) {
    const row = await dbOne<{ confirmedAt: string }>(
      `SELECT DATE_FORMAT(confirmed_at, ${DATETIME_FMT}) AS confirmedAt FROM action_history WHERE id = ?`,
      [actionId]
    )
    confirmedAt = row?.confirmedAt ?? null
  }
  await dbExec('UPDATE devices SET current_status = ? WHERE id = ?', [status, device.id])
  broadcast('device:status', { deviceId: device.id, actionId: actionCode(actionId), status, confirmedAt })
}

/** Khi Backend khởi động lại: các lệnh loading cũ không thể được xác nhận nữa -> fail */
export async function recoverStaleActions() {
  const stale = await dbQuery<{ id: number }>("SELECT id FROM action_history WHERE status = 'loading'")
  for (const { id } of stale) await failAction(id, 'backend restart')
  const loadingDevices = await dbQuery<{ id: number }>("SELECT id FROM devices WHERE current_status = 'loading'")
  for (const { id } of loadingDevices) {
    await dbExec("UPDATE devices SET current_status = ? WHERE id = ? AND current_status = 'loading'", [
      await lastConfirmedStatus(id),
      id
    ])
  }
}

export function clearPendingActions() {
  for (const { timer } of pending.values()) clearTimeout(timer)
  pending.clear()
}
