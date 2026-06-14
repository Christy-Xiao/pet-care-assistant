import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { setSession, generateToken, initSessionsTable } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: '请填写邮箱和密码' },
        { status: 400 }
      );
    }

    // 查询用户
    const users = await query<any[]>(
      'SELECT id, name, email, password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { message: '用户不存在，请先注册' },
        { status: 401 }
      );
    }

    const user = users[0];

    // 简单密码比对（生产环境应该用 bcrypt）
    if (user.password !== password) {
      return NextResponse.json(
        { message: '密码错误' },
        { status: 401 }
      );
    }

    // 初始化 sessions 表
    await initSessionsTable();
    
    // 创建 session（存入数据库）
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天过期
    await setSession(token, { userId: user.id, expiresAt });

    // 返回 token 和用户信息
    const response = NextResponse.json({
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
      },
    });

    // 设置 cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      expires: expiresAt,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { message: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
