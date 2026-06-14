import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession, initSessionsTable } from '@/lib/sessions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 初始化 sessions 表
    await initSessionsTable();
    
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = await getSession(token);
    
    if (!session) {
      return NextResponse.json({ user: null });
    }

    // 查询用户
    const users = await query<any[]>(
      'SELECT id, name, email FROM users WHERE id = ?',
      [session.userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ user: null });
    }

    const user = users[0];
    return NextResponse.json({
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Session 检查错误:', error);
    return NextResponse.json({ user: null });
  }
}
