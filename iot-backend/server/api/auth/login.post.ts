import bcrypt from 'bcryptjs'

// UC01 — POST /api/auth/login
export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: unknown; password?: unknown }>(event).catch(() => null)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!username || !password) throw badRequest('Vui lòng nhập tài khoản và mật khẩu')

  const user = await dbOne<{ id: number; username: string; hashPassword: string; fullName: string }>(
    'SELECT id, username, hash_password AS hashPassword, full_name AS fullName FROM users WHERE username = ?',
    [username]
  )
  // So khớp mật khẩu đã băm (bcrypt) — không lưu mật khẩu dạng rõ
  if (!user || !(await bcrypt.compare(password, user.hashPassword))) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Sai tài khoản hoặc mật khẩu' })
  }

  return {
    token: signToken({ id: user.id, username: user.username, fullName: user.fullName }),
    user: { id: user.id, fullName: user.fullName },
    message: 'Đăng nhập thành công'
  }
})
