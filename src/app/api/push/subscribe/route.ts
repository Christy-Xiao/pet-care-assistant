import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';

// GET /api/push/subscribe - 获取当前用户的推送订阅
// POST /api/push/subscribe - 保存/更新推送订阅
// DELETE /api/push/subscribe - 删除推送订阅

export async function GET() {
  try {
    const subscriptions = await query(
      'SELECT id, endpoint, user_id, created_at FROM push_subscriptions ORDER BY created_at DESC'
    );
    return NextResponse.json(subscriptions);
  } catch (error: any) {
    console.error('获取推送订阅失败:', error.message);
    return NextResponse.json({ error: '获取推送订阅失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📱 收到推送订阅请求');

    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: '无效的订阅信息' }, { status: 400 });
    }

    // 检查是否已存在相同 endpoint 的订阅（避免重复）
    const existing = await query(
      'SELECT * FROM push_subscriptions WHERE endpoint = ?',
      [subscription.endpoint]
    );

    if (existing && (existing as any[]).length > 0) {
      // 更新现有订阅
      await execute(
        `UPDATE push_subscriptions 
         SET p256dh_key = ?, auth_secret = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE endpoint = ?`,
        [
          subscription.keys.p256dh,
          subscription.keys.auth,
          userId || null,
          subscription.endpoint,
        ]
      );
      console.log('✅ 推送订阅已更新');
    } else {
      // 新建订阅
      const subId = `push_${Date.now()}`;
      await insert(
        `INSERT INTO push_subscriptions (id, endpoint, p256dh_key, auth_secret, user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          subId,
          subscription.endpoint,
          subscription.keys.p256dh,
          subscription.keys.auth,
          userId || null,
        ]
      );
      console.log('✅ 新推送订阅已保存');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('保存推送订阅失败:', error.message);
    
    // 如果表不存在，提示需要初始化
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return NextResponse.json(
        { error: 'push_subscriptions 表尚未创建，请运行初始化脚本', needInit: true },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ error: `保存推送订阅失败: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: '缺少 endpoint' }, { status: 400 });
    }

    await execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除推送订阅失败:', error.message);
    return NextResponse.json({ error: '删除推送订阅失败' }, { status: 500 });
  }
}
