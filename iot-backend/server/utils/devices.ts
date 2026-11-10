/**
 * Vòng đời một lệnh điều khiển (UC04):
 *   POST /actions -> ActionHistory.status = 'loading', Devices.current_status = 'loading', publish LEDn_ON|OFF lên iot/devices/control
 *   ESP32 publish iot/devices/status {"device":"LEDn","status":"ON"} -> khớp lệnh thì status = on/off,
 *     confirmed_at = NOW(), đẩy WS device:status; ngược lệnh thì status = 'fail'
 *   Quá actionTimeoutSeconds (hoặc Frontend báo PATCH fail) -> status = 'fail', trả thiết bị về trạng thái cũ
 */
export type DeviceStatus = 'loading' | 'on' | 'off'

export interface DeviceRow {
  id: number
  name: string
  description: string | null
  currentStatus: DeviceStatus
}

// actionId -> lệnh đang chờ ESP32 xác nhận
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
 * Xử lý bản tin iot/devices/status của firmware, vd. {"device":"LED1","status":"ON","timestamp":"2026-11-10 09:30:02"}.
 * ESP32 gửi trạng thái thật của đúng đèn vừa nhận lệnh (ALL_ON / ALL_OFF -> 3 bản tin, mỗi đèn một bản tin).
 */
export async function handleDeviceStatus(payload: Record<string, unknown>) {
  const m = String(payload.device ?? '').trim().match(/^LED(\d+)$/i)
  const status = String(payload.status ?? '').trim().toLowerCase()
  if (!m || (status !== 'on' && status !== 'off')) {
    console.warn('[mqtt] Bỏ qua bản tin trạng thái không hợp lệ:', payload)
    return
  }
  const device = await getDevice(Number(m[1]))
  if (!device) {
    console.warn(`[mqtt] Thiết bị ${deviceCode(Number(m[1]))} không có trong bảng devices`)
    return
  }
  await applyDeviceState(device, status)
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
  if (info.action.toLowerCase() !== status) {
    // Phần cứng báo trạng thái ngược với lệnh -> lệnh thất bại, giao diện theo trạng thái thật của đèn
    await failAction(actionId, `ESP32 báo ${status.toUpperCase()} trong khi lệnh là ${info.action}`)
    await dbExec('UPDATE devices SET current_status = ? WHERE id = ?', [status, device.id])
    broadcast('device:status', { deviceId: device.id, status, confirmedAt: null })
    return
  }

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
