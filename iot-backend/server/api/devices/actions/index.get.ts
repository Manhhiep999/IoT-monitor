// UC06 — GET /api/devices/actions?keyword&action&status&dateFrom&dateTo&page&limit
export default defineEventHandler(async (event) => {
  const { page, limit, offset } = pagination(event)
  const { whereSql, params } = actionFilters(event)

  const [rows, count] = await Promise.all([
    dbQuery<ActionRow>(`${ACTION_SELECT} ${whereSql} ORDER BY ah.created_at DESC, ah.id DESC LIMIT ? OFFSET ?`, [
      ...params,
      limit,
      offset
    ]),
    dbOne<{ total: number }>(
      `SELECT COUNT(*) AS total
         FROM action_history ah
         JOIN devices d ON d.id = ah.device_id
         JOIN users u ON u.id = ah.user_id ${whereSql}`,
      params
    )
  ])

  return { data: rows, page, total: Number(count?.total ?? 0) }
})
