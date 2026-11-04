// POST /api/auth/logout — JWT stateless: đưa token hiện tại vào danh sách thu hồi tới khi hết hạn
export default defineEventHandler((event) => {
  revokeToken(readToken(event))
  return { message: 'Đăng xuất thành công' }
})
