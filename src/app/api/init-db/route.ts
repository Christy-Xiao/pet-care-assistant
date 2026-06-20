import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET() {
  try {
    const ok = await testConnection();
    if (!ok) {
      return NextResponse.json({ error: '数据库连接失败' }, { status: 500 });
    }
    // 表已在 Supabase SQL Editor 中手动创建，这里只验证连接
    return NextResponse.json({ message: '数据库连接正常（表已通过 Supabase SQL Editor 创建）' });
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return NextResponse.json({ error: '数据库初始化失败', details: String(error) }, { status: 500 });
  }
}
