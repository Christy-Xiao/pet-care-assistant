import mysql from 'mysql2/promise';

// 数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pet_care_assistant',
  timezone: '+08:00',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 5,  // 减小连接池大小
  maxIdle: 5,         // 最大空闲连接数
  idleTimeout: 60000, // 空闲连接超时（毫秒）
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// 测试数据库连接
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ MySQL 数据库连接失败:', error);
    return false;
  }
}

// 执行查询
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

// 执行插入并返回结果
export async function insert(sql: string, params?: any[]): Promise<{ insertId?: number; affectedRows?: number }> {
  const [result] = await pool.execute(sql, params);
  return result as any;
}

// 执行更新/删除
export async function execute(sql: string, params?: any[]): Promise<{ affectedRows: number }> {
  const [result] = await pool.execute(sql, params);
  return result as any;
}

// 获取连接
export async function getConnection() {
  return await pool.getConnection();
}

export default pool;
