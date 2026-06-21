import { NextRequest, NextResponse } from 'next/server';

/**
 * 开遛功能 - 定时推送通知
 * 
 * POST /api/walk/schedule  → 注册一个延迟推送任务（时间到了发PWA通知）
 * POST /api/walk/cancel    → 取消未执行的推送任务
 */

// 内存存储定时任务（生产环境应改用 Redis/DB）
interface WalkSchedule {
  id: string;
  endTime: string;        // ISO 时间字符串
  petName: string;
  plannedMinutes: number;
  petId?: string;
  timer: ReturnType<typeof setTimeout>;
}

const schedules = new Map<string, WalkSchedule>();

// 发送 PWA 推送
async function sendWalkNotification(petName: string, plannedMinutes: number, isDemo: boolean = false) {
  try {
    // 用相对路径调用自己的 API（避免硬编码端口问题）
    const pushUrl = '/api/push/send';

    // 🆕 演示模式：专属文案
    const title = isDemo
      ? '🎉 今日遛狗时间已经充足'
      : `⏰ ${petName}的遛狗时间到啦！`;

    const body = isDemo
      ? `演示模式完成！${petName}今天运动达标啦，继续保持好习惯~ 🐾💚`
      : `计划${Math.round(plannedMinutes)}分钟的遛狗时间已结束~ 回来记录一下今天的成果吧 🐾`;

    await fetch(pushUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        icon: '/icons/icon-192x192.png',
        url: '/',
        tag: isDemo ? `walk-demo-${Date.now()}` : `walk-${Date.now()}`,
        broadcast: true,
      }),
    });
    console.log(`[WalkAPI] 已发送遛狗结束通知: ${petName} (demo=${isDemo})`);
  } catch (err) {
    console.error('[WalkAPI] 推送失败:', err);
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'schedule';

  try {
    if (action === 'schedule') {
      const body = await request.json();
      const { endTime, petName, plannedMinutes, petId, isDemo, petIds } = body as {
        endTime: string;
        petName: string;
        plannedMinutes: number;
        petId?: string;
        isDemo?: boolean;       // 🆕 是否演示模式
        petIds?: string[];      // 🆕 多宠ID列表
      };

      if (!endTime || !petName || !plannedMinutes) {
        return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
      }

      const end = new Date(endTime).getTime();
      const now = Date.now();
      const delay = Math.max(0, end - now);

      if (delay === 0) {
        // 已经到时间了，直接发通知
        await sendWalkNotification(petName, plannedMinutes, !!isDemo);
        return NextResponse.json({ success: true, message: '立即发送通知', sent: true });
      }

      // 注册延迟任务
      const scheduleId = `walk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      const timer = setTimeout(async () => {
        await sendWalkNotification(petName, plannedMinutes, !!isDemo);
        schedules.delete(scheduleId);
        console.log(`[WalkAPI] 定时任务已执行并清理: ${scheduleId}`);
      }, delay);

      schedules.set(scheduleId, {
        id: scheduleId,
        endTime,
        petName,
        plannedMinutes,
        petId,
        timer,
      });

      console.log(
        `[WalkAPI] 已注册定时推送: ${petName}, ${plannedMinutes}分钟, 剩余 ${Math.round(delay / 1000)}秒`
      );

      return NextResponse.json({
        success: true,
        message: '定时推送已注册',
        scheduleId,
        willSendAt: endTime,
        delaySeconds: Math.round(delay / 1000),
      });
    }

    if (action === 'cancel') {
      // 取消所有该用户的待执行任务（简单实现：取消全部）
      let cancelled = 0;
      for (const [id, sched] of schedules) {
        clearTimeout(sched.timer);
        schedules.delete(id);
        cancelled++;
      }
      return NextResponse.json({ success: true, message: `已取消 ${cancelled} 个任务` });
    }

    return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    console.error('[WalkAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// GET 查看待执行任务数量
export async function GET() {
  return NextResponse.json({
    activeSchedules: schedules.size,
    list: Array.from(schedules.values()).map((s) => ({
      id: s.id,
      petName: s.petName,
      endTime: s.endTime,
      plannedMinutes: s.plannedMinutes,
    })),
  });
}
