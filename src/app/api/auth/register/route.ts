import { NextRequest, NextResponse } from 'next/server';
import { query, insert } from '@/lib/db';
import { setSession, generateToken } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '请填写所有字段' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUsers = await query<any[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { message: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 创建用户
    const result = await insert(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password]
    );

    const userId = result.insertId;
    if (!userId) {
      return NextResponse.json({ message: '创建用户失败' }, { status: 500 });
    }

    // 创建 session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setSession(token, { userId, expiresAt });

    const response = NextResponse.json({
      user: {
        id: userId.toString(),
        name,
        email,
      },
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      expires: expiresAt,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { message: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
