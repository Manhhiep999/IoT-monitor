// PATCH /api/devices/actions/{actionId}  { "status": "fail" }
// Frontend báo lệnh quá thời gian chờ -> đánh dấu fail sớm (chỉ áp dụng khi bản ghi còn loading)
export default defineEventHandler(async (event) => {
  const actionId = parseEntityId(getRouterParam(event, 'id'))
  if (!actionId) throw badRequest('actionId không hợp lệ')

  const body = await readBody<{ status?: unknown }>(event).catch(() => null)
  const status = String(body?.status ?? '').toLowerCase()
  if (status !== 'fail') throw badRequest('Chỉ hỗ trợ cập nhật status = fail')

  const exists = await dbOne('SELECT id FROM action_history WHERE id = ?', [actionId])
  if (!exists) throw notFound('Không tìm thấy bản ghi thao tác')

  const success = await failAction(actionId, 'frontend timeout')
  const action = await dbOne<ActionRow>(`${ACTION_SELECT} WHERE ah.id = ?`, [actionId])
  return { success, action }
})
