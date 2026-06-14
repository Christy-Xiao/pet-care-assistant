import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/sessions';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;
    
    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session_token');
    
    return response;
  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json({ success: true }); // 即使出错也返回成功
  }
}
