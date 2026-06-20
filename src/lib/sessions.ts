import { query, insert, execute } from './db';

export interface Session {
  userId: number;
  expiresAt: Date;
}

// 初始化 sessions 表（PostgreSQL 语法）
export async function initSessionsTable() {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        user_id INT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ sessions 表创建成功');
  } catch (error) {
    console.error('❌ sessions 表创建失败:', error);
  }
}

// 生成随机 session token
export function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 设置 session（存入数据库）
export async function setSession(token: string, session: Session): Promise<void> {
  await execute(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, session.userId, session.expiresAt]
  );
}

// 获取 session（从数据库读取）
export async function getSession(token: string): Promise<Session | null> {
  if (!token) return null;
  
  try {
    const sessions = await query<any[]>(
      'SELECT user_id, expires_at FROM sessions WHERE token = ?',
      [token]
    );
    
    if (sessions.length === 0) return null;
    
    const session = sessions[0];
    if (new Date(session.expires_at) < new Date()) {
      // 过期了，删除
      await execute('DELETE FROM sessions WHERE token = ?', [token]);
      return null;
    }
    
    return {
      userId: session.user_id,
      expiresAt: new Date(session.expires_at),
    };
  } catch (error) {
    console.error('获取 session 失败:', error);
    return null;
  }
}

// 删除 session
export async function deleteSession(token: string): Promise<void> {
  try {
    await execute('DELETE FROM sessions WHERE token = ?', [token]);
  } catch (error) {
    console.error('删除 session 失败:', error);
  }
}

// 清理过期 session
export async function cleanExpiredSessions(): Promise<void> {
  try {
    await execute('DELETE FROM sessions WHERE expires_at < NOW()');
  } catch (error) {
    console.error('清理过期 session 失败:', error);
  }
}
