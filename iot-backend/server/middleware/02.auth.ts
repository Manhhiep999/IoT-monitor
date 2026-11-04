// Mọi API (trừ đăng nhập/đăng xuất/health) yêu cầu JWT hợp lệ trong header Authorization
const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/auth/logout', '/api/health'])

export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]
  if (!path.startsWith('/api/') || PUBLIC_PATHS.has(path) || event.method === 'OPTIONS') return

  const user = verifyToken(readToken(event))
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
    })
  }
  event.context.user = user
})
