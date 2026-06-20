import { Pool } from 'pg';

// PostgreSQL 数据库连接池（Supabase 兼容）
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false }, // Supabase 强制需要 SSL，生产环境始终启用
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

/**
 * 将 MySQL 风格的 ? 参数占位符转换为 PostgreSQL 的 $1, $2 ... 格式
 * 例如: "SELECT * FROM users WHERE id = ? AND name = ?" → "SELECT * FROM users WHERE id = $1 AND name = $2"
 */
export function convertParams(sql: string, params?: any[]): { sql: string; params: any[] } {
  if (!params || params.length === 0) return { sql, params: [] };
  
  let index = 0;
  const convertedSql = sql.replace(/\?/g, () => `$${++index}`);
  return { sql: convertedSql, params };
}

// 测试数据库连接
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ PostgreSQL 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL 数据库连接失败:', error);
    return false;
  }
}

// 执行查询（返回行数组）— 兼容 ? 占位符
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const { sql: pgSql, params: pgParams } = convertParams(sql, params);
  const result = await pool.query(pgSql, pgParams);
  return result.rows as T;
}

// 执行插入并返回结果 — 兼容 ? 占位符
export async function insert(sql: string, params?: any[]): Promise<{ insertId?: number; affectedRows?: number }> {
  const { sql: pgSql, params: pgParams } = convertParams(sql, params);
  // 使用 RETURNING id 来获取插入的 ID（如果有的话）
  const resultSql = /\bRETURNING\b/i.test(pgSql) ? pgSql : pgSql.replace(/$/, ' RETURNING id');
  const result = await pool.query(resultSql, pgParams);
  return {
    insertId: result.rows?.[0]?.id as number | undefined,
    affectedRows: result.rowCount ?? undefined,
  };
}

// 执行更新/删除 — 兼容 ? 占位符
export async function execute(sql: string, params?: any[]): Promise<{ affectedRows: number }> {
  const { sql: pgSql, params: pgParams } = convertParams(sql, params);
  const result = await pool.query(pgSql, pgParams);
  return { affectedRows: result.rowCount ?? 0 };
}

// 获取原始连接池（用于事务等复杂操作）
export function getPool(): Pool {
  return pool;
}

// 获取客户端连接（用于需要多步操作的场景）
export async function getClient() {
  return await pool.connect();
}

export default pool;
