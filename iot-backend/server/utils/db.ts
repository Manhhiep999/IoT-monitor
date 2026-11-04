import mysql from 'mysql2/promise'
import type { Pool, ResultSetHeader } from 'mysql2/promise'

let pool: Pool | null = null

/** Pool MySQL dùng chung. Mọi câu lệnh đều truyền tham số qua placeholder `?` (không nối chuỗi). */
export function useDb(): Pool {
  if (pool) return pool
  const { db } = useRuntimeConfig()
  pool = mysql.createPool({
    host: db.host,
    port: Number(db.port),
    user: db.user,
    password: db.password,
    database: db.database,
    charset: 'utf8mb4',
    connectionLimit: 10,
    waitForConnections: true,
    // DATETIME trả về dạng chuỗi "YYYY-MM-DD HH:mm:ss" đúng như định dạng API, không qua Date của JS
    dateStrings: true,
    decimalNumbers: true
  })
  // NOW() / measured_at / created_at luôn theo múi giờ cấu hình, không phụ thuộc máy chủ MySQL
  pool.on('connection', (conn) => {
    conn.query('SET time_zone = ?', [db.timezone])
  })
  return pool
}

export async function dbQuery<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await useDb().query(sql, params)
  return rows as T[]
}

export async function dbOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await dbQuery<T>(sql, params)
  return rows[0] ?? null
}

export async function dbExec(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await useDb().query(sql, params)
  return result as ResultSetHeader
}

export async function closeDb() {
  await pool?.end()
  pool = null
}

/** Biểu thức SQL định dạng DATETIME theo chuẩn API */
export const DATETIME_FMT = "'%Y-%m-%d %H:%i:%s'"
