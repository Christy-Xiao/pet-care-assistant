import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

// 获取用户的所有会话列表
export async function GET(request: NextRequest) {
  try {
    const userId = 1; // TODO: 从认证信息获取真实userId
    
    // 查询所有会话，按最后消息时间排序
    const sessions = await query(`
      SELECT 
        session_id,
        COUNT(*) as message_count,
        MIN(created_at) as created_at,
        MAX(created_at) as last_message_at,
        (SELECT content FROM chat_memory 
         WHERE user_id = ? AND session_id = cm.session_id 
         AND role = 'user' 
         ORDER BY created_at DESC LIMIT 1
        ) as first_user_message
      FROM chat_memory cm
      WHERE user_id = ?
      GROUP BY session_id
      ORDER BY last_message_at DESC
      LIMIT 50
    `, [userId, userId]);

    // 格式化返回数据
    const formattedSessions = (sessions as any[]).map((session: any) => ({
      sessionId: session.session_id,
      title: session.first_user_message 
        ? session.first_user_message.substring(0, 50) + (session.first_user_message.length > 50 ? '...' : '')
        : '新对话',
      messageCount: parseInt(session.message_count),
      createdAt: session.created_at,
      updatedAt: session.last_message_at,
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    return NextResponse.json({ error: '获取会话列表失败' }, { status: 500 });
  }
}

// 删除指定会话
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: '缺少sessionId参数' }, { status: 400 });
    }

    const userId = 1; // TODO: 从认证信息获取真实userId

    await execute(
      'DELETE FROM chat_memory WHERE user_id = ? AND session_id = ?',
      [userId, sessionId]
    );

    return NextResponse.json({ success: true, message: '会话已删除' });
  } catch (error) {
    console.error('删除会话失败:', error);
    return NextResponse.json({ error: '删除会话失败' }, { status: 500 });
  }
}
