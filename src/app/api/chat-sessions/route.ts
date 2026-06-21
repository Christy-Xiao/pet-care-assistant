import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// 获取用户的所有会话列表（从 chat_conversations 表）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, title, messages, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    // 表不存在时返回空数组
    if (error && (error.message.includes('does not exist') || error.code === '42P01')) {
      return NextResponse.json({ sessions: [] });
    }
    
    if (error) {
      console.error('获取会话列表失败:', error.message);
      return NextResponse.json({ sessions: [] });
    }

    // 格式化返回数据
    const formattedSessions = (data || []).map((conv: any) => {
      const msgs = typeof conv.messages === 'string' ? JSON.parse(conv.messages) : (conv.messages || []);
      return {
        sessionId: conv.id,
        title: conv.title || '新对话',
        messageCount: msgs.length,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      };
    });

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error: any) {
    console.error('获取会话列表失败:', error);
    return NextResponse.json({ sessions: [] });
  }
}

// 删除指定会话
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId') || 'default_user';

    if (!sessionId) {
      return NextResponse.json({ error: '缺少sessionId参数' }, { status: 400 });
    }

    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('删除会话失败:', error);
      return NextResponse.json({ error: '删除会话失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除会话失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
