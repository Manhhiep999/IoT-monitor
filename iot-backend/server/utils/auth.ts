import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

export interface AuthUser {
  id: number
  username: string
  fullName: string
}

interface TokenPayload {
  sub: string
  username: string
  name: string
  jti: string
  exp: number
}

// jti của token đã đăng xuất -> thời điểm hết hạn (giây). JWT stateless nên chỉ cần giữ tới khi token tự hết hạn.
const revoked = new Map<string, number>()

export function signToken(user: AuthUser): string {
  const { jwt: cfg } = useRuntimeConfig()
  return jwt.sign({ username: user.username, name: user.fullName }, cfg.secret, {
    subject: String(user.id),
    jwtid: randomUUID(),
    expiresIn: cfg.expiresIn as jwt.SignOptions['expiresIn']
  })
}

function decode(token: string | null | undefined): TokenPayload | null {
  if (!token) return null
  try {
    const payload = jwt.verify(token, useRuntimeConfig().jwt.secret) as TokenPayload
    if (revoked.has(payload.jti)) return null
    return payload
  } catch {
    return null
  }
}

export function verifyToken(token: string | null | undefined): AuthUser | null {
  const p = decode(token)
  return p ? { id: Number(p.sub), username: p.username, fullName: p.name } : null
}

export function revokeToken(token: string | null | undefined) {
  const p = decode(token)
  if (!p) return
  revoked.set(p.jti, p.exp)
  const now = Date.now() / 1000
  for (const [jti, exp] of revoked) if (exp < now) revoked.delete(jti)
}

/** Token lấy từ header Authorization: Bearer <token>, dự phòng ?token= */
export function readToken(event: H3Event): string | null {
  const header = getHeader(event, 'authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7).trim()
  return queryString(event, 'token') || null
}

export function requireUser(event: H3Event): AuthUser {
  const user = event.context.user as AuthUser | undefined
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Vui lòng đăng nhập' })
  return user
}
