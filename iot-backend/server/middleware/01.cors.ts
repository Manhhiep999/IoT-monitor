// CORS cho trường hợp Frontend gọi thẳng Backend (không qua Vite proxy)
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return
  const origin = getHeader(event, 'origin')
  if (!origin) return

  const allowed = String(useRuntimeConfig().corsOrigin)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (!allowed.includes('*') && !allowed.includes(origin)) return

  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type',
    'Access-Control-Expose-Headers': 'Content-Disposition',
    Vary: 'Origin'
  })
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
