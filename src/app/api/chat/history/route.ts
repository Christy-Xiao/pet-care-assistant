import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 按 session_id 分组返回用户的所有对话历史
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId 参数' }, { status: 400 });
    }

    // 从 chat_memory 表获取该用户所有历史消息，按 session_id 和时间分组
    const rows = await query<any[]>(
      `SELECT id, session_id, role, content, created_at 
       FROM chat_memory 
       WHERE user_id = ? 
       ORDER BY session_id ASC, created_at ASC`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // 按 session_id 分组
    const sessionMap = new Map<string, any[]>();

    for (const row of rows) {
      const sid = row.session_id;
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, []);
      }
      const msgs = sessionMap.get(sid);
      msgs!.push({
        id: `msg_${row.id}`,
        role: row.role,
        content: row.content,
        timestamp: new Date(row.created_at),
      });
    }

    // 转换为前端 Conversation 格式
    const conversations = Array.from(sessionMap.entries()).map(([sessionId, messages], index) => {
      // 用第一条用户消息的前30字作为标题
      const firstUserMsg = messages.find((m: any) => m.role === 'user');
      let title = '新对话';
      if (firstUserMsg && firstUserMsg.content.length > 0) {
        title = firstUserMsg.content.substring(0, 25);
        if (firstUserMsg.content.length > 25) title += '...';
      }
      // 最后一条消息的时间作为 updatedAt
      const lastMsg = messages[messages.length - 1];
      
      return {
        id: sessionId,
        title: index === 0 ? title : title,
        messages,
        updatedAt: lastMsg ? new Date(lastMsg.timestamp) : new Date(),
      };
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('获取聊天历史失败:', error);
    return NextResponse.json(
      { error: '获取聊天历史失败', conversations: [] },
      { status: 500 }
    );
  }
}
