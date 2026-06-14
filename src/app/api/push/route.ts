import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  initPushScheduleTable, 
  createPushSchedule, 
  getPushSchedules,
  updatePushSchedule,
  deletePushSchedule,
  getPendingPushes,
  markAsPushed,
  createNotification
} from '@/lib/pushService';

// 初始化表
initPushScheduleTable();

// GET - 获取用户的推送计划
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const schedules = await getPushSchedules(parseInt(userId));
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('获取推送计划失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// POST - 创建推送计划 / 手动触发检查
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 手动检查待推送消息
    if (action === 'check') {
      const pending = await getPendingPushes();
      
      for (const schedule of pending) {
        // 创建通知
        await createNotification(
          schedule.user_id,
          schedule.title,
          schedule.content,
          'push'
        );
        // 标记已推送
        await markAsPushed(schedule.id);
      }
      
      return NextResponse.json({ 
        success: true, 
        pushed: pending.length,
        notifications: pending.map(s => ({ title: s.title, content: s.content }))
      });
    }

    // 创建新的推送计划
    const body = await request.json();
    const { userId, title, content, pushTime, pushDays } = body;

    if (!userId || !title || !content) {
      return NextResponse.json({ error: '缺少必填参数' }, { status: 400 });
    }

    const id = await createPushSchedule(
      userId,
      title,
      content,
      pushTime || '09:00',
      pushDays || '1,2,3,4,5'
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('创建推送计划失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// PUT - 更新推送计划
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, enabled, title, content, pushTime, pushDays } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少计划ID' }, { status: 400 });
    }

    await updatePushSchedule(id, { enabled, title, content, push_time: pushTime, push_days: pushDays });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新推送计划失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE - 删除推送计划
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少计划ID' }, { status: 400 });
    }

    await deletePushSchedule(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除推送计划失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
