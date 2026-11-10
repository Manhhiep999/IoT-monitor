// UC04 — POST /api/devices/{deviceId}/actions  { "action": "ON" | "OFF" }
export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const deviceId = parseEntityId(getRouterParam(event, 'id'))
  if (!deviceId) throw badRequest('deviceId không hợp lệ')

  const body = await readBody<{ action?: unknown }>(event).catch(() => null)
  const action = String(body?.action ?? '').toUpperCase()
  if (action !== 'ON' && action !== 'OFF') throw badRequest('Hành động không hợp lệ (chỉ nhận ON hoặc OFF)')

  const device = await getDevice(deviceId)
  if (!device) throw notFound('Không tìm thấy thiết bị')
  if (device.currentStatus === 'loading') {
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Thiết bị đang chờ xác nhận lệnh trước đó' })
  }
  if (!isMqttConnected()) {
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'Backend chưa kết nối được MQTT Broker' })
  }

  // Ghi ActionHistory status=loading TRƯỚC, rồi mới publish lệnh — không giả định đèn đã đổi trạng thái
  const actionId = await createAction(user.id, device, action)
  try {
    // Firmware ESP32 nhận lệnh văn bản (LED1_ON...) rồi trả {"device":"LED1","status":"ON"} lên iot/devices/status
    await mqttPublish(TOPICS.deviceControl, controlCommand(deviceId, action))
  } catch (e: any) {
    await failAction(actionId, `publish lỗi: ${e.message}`)
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'Không gửi được lệnh tới MQTT Broker' })
  }

  setResponseStatus(event, 202)
  return {
    actionId: actionCode(actionId),
    deviceId,
    action,
    status: 'loading',
    createdAt: new Date().toISOString(),
    message: 'Yêu cầu đã được ghi nhận và chuyển tới MQTT'
  }
})
