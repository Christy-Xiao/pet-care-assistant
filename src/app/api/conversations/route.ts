import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET - 获取用户的所有对话
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId 参数' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('获取对话失败:', error.message);
      // 表可能还不存在，返回空数组
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ conversations: [] });
      }
      return NextResponse.json({ error: '获取对话失败' }, { status: 500 });
    }

    // 转换 messages JSON 字符串为数组，转换日期
    const conversations = (data || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      messages: (typeof c.messages === 'string' ? JSON.parse(c.messages) : c.messages).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
      updatedAt: new Date(c.updated_at),
      createdAt: new Date(c.created_at),
    }));

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('对话 API 错误:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - 保存/更新单个对话（upsert）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, conversationId, title, messages } = body;

    if (!userId || !conversationId || !messages) {
      return NextResponse.json(
        { error: '缺少必要参数 (userId, conversationId, messages)' },
        { status: 400 }
      );
    }

    // 将消息中的 Date 对象转为 ISO 字符串以便存储
    const serializedMessages = (messages as any[]).map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : 
                typeof m.timestamp === 'string' ? m.timestamp : new Date(m.timestamp).toISOString(),
    }));

    const { data, error } = await supabase
      .from('chat_conversations')
      .upsert({
        id: conversationId,
        user_id: userId,
        title: title || '新对话',
        messages: serializedMessages,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (error) {
      console.error('保存对话失败:', error);
      // 表可能不存在
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ success: false, reason: '表不存在' });
      }
      return NextResponse.json({ error: '保存对话失败', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, conversation: data });
  } catch (error: any) {
    console.error('对话 POST API 错误:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - 删除单个对话
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');

    if (!userId || !conversationId) {
      return NextResponse.json(
        { error: '缺少参数 (userId, conversationId)' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId); // 安全：只能删除自己的

    if (error) {
      console.error('删除对话失败:', error);
      return NextResponse.json({ error: '删除对话失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('对话 DELETE API 错误:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
