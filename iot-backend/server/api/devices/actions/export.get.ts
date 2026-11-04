// UC06 — GET /api/devices/actions/export: CSV toàn bộ bản ghi thỏa điều kiện lọc (không phân trang)
const HEADER = ['ID', 'Actuator Name', 'Performed By', 'Triggered Action', 'Status', 'Execution Time', 'Confirmed At']

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const slash = (v: string | null) => (v ? v.replace(/-/g, '/') : '')

export default defineEventHandler(async (event) => {
  const { whereSql, params } = actionFilters(event)
  const rows = await dbQuery<ActionRow>(`${ACTION_SELECT} ${whereSql} ORDER BY ah.created_at DESC, ah.id DESC`, params)

  const lines = rows.map((a) =>
    [a.id, a.deviceName, a.performedBy, `TURN ${a.action}`, a.status.toUpperCase(), slash(a.createdAt), slash(a.confirmedAt)]
      .map(csvCell)
      .join(',')
  )
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')

  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="action-history-${stamp}.csv"`
  })
  // BOM để Excel đọc đúng tiếng Việt
  return '﻿' + [HEADER.join(','), ...lines].join('\r\n')
})
