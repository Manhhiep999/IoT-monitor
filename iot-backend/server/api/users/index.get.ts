// GET /api/users — danh sách người điều khiển (không trả mật khẩu)
export default defineEventHandler(async () => {
  const data = await dbQuery(
    'SELECT id, full_name AS fullName, username FROM users ORDER BY id'
  )
  return { data }
})
