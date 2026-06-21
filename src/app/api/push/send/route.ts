import { NextRequest, NextResponse } from 'next/server';
import * as webPush from 'web-push';
import { supabase } from '@/lib/db';

// 配置 VAPID 密钥
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('❌ 缺少 VAPID 密钥配置，请检查 .env.local');
}

// 初始化 web-push（只执行一次）
function initWebPush() {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) return false;
  
  try {
    webPush.setVapidDetails(
      'mailto:maorong@pet-care.app',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    return true;
  } catch (err) {
    console.error('❌ Web Push 初始化失败:', err);
    return false;
  }
}

/**
 * POST /api/push/send - 发送推送通知到指定用户/所有用户
 * 
 * 用法示例:
 * 发送给特定用户: { title, body, userId: "user_123" }
 * 发送给所有人:     { title, body, broadcast: true }
 */
export async function POST(request: NextRequest) {
  try {
    // 验证并初始化 web-push
    const initialized = initWebPush();
    if (!initialized) {
      return NextResponse.json({ error: '推送服务未配置' }, { status: 500 });
    }

    const body = await request.json();
    const { title, body: notificationBody, icon, url, tag, data, userId, broadcast } = body;

    // 构造通知载荷
    const payload = JSON.stringify({
      title: title || '毛绒管家',
      body: notificationBody || '您有一条新消息',
      icon: icon || '/icons/icon-192x192.png',
      url: url || '/',
      tag: tag || undefined,
      data: data || {},
    });

    // 获取目标订阅列表（直接使用 Supabase SDK）
    let subscriptions: any[];
    if (userId && !broadcast) {
      const { data: userSubs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_secret')
        .eq('user_id', userId);
      const { data: globalSubs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_secret')
        .is('user_id', null);
      // 合并去重
      const all = [...(userSubs || []), ...(globalSubs || [])];
      const seen = new Set<string>();
      subscriptions = all.filter((s: any) => {
        if (seen.has(s.endpoint)) return false;
        seen.add(s.endpoint);
        return true;
      });
    } else {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh_key, auth_secret');
      subscriptions = (data as any[]) || [];
    }

    if (!subscriptions || (subscriptions as any[]).length === 0) {
      return NextResponse.json({ success: true, message: '没有活跃的推送订阅', sentCount: 0 });
    }

    // 逐个发送通知，记录失败项以便清理
    const results = [];
    let successCount = 0;
    let failedEndpoints: string[] = [];

    for (const sub of subscriptions as any[]) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_secret,
          },
        };

        await webPush.sendNotification(pushSubscription, payload);
        successCount++;
        results.push({ endpoint: sub.endpoint, status: 'ok' });

        console.log(`✅ 推送成功 -> ${sub.endpoint.slice(0, 50)}...`);
      } catch (sendError: any) {
        // 410 Gone 表示订阅已失效，应该从数据库删除
        if (sendError.statusCode === 410) {
          failedEndpoints.push(sub.endpoint);
        }
        results.push({ endpoint: sub.endpoint, status: 'failed', error: sendError.message });
        console.warn(`⚠️ 推送失败 (${sendError.statusCode}):`, sendError.message);
      }
    }

    // 清理失效的订阅（410 Gone）
    if (failedEndpoints.length > 0) {
      const { error: delErr } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
      if (delErr) console.warn('清理失效订阅时出错:', delErr.message);
      else console.log(`🧹 清理了 ${failedEndpoints.length} 个失效订阅`);
    }

    console.log(`📊 推送完成: ${successCount}/${(subscriptions as any[]).length} 成功`);

    return NextResponse.json({
      success: true,
      message: `发送成功: ${successCount}/${(subscriptions as any[]).length}`,
      sentCount: successCount,
      totalCount: (subscriptions as any[]).length,
      cleanedCount: failedEndpoints.length,
    });
  } catch (error: any) {
    console.error('发送推送通知失败:', error.message);
    return NextResponse.json({ error: `发送推送通知失败: ${error.message}` }, { status: 500 });
  }
}

// GET /api/push/send - 测试接口，返回状态信息
export async function GET() {
  const hasKeys = !!(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

  // 统计订阅数量
  let subCount = 0;
  try {
    const { count, error } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });
    if (!error) subCount = count ?? 0;
  } catch (e) {
    // 表可能不存在
  }

  return NextResponse.json({
    configured: hasKeys,
    vapidPublicKeySet: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    vaidPrivateKeySet: !!process.env.VAPID_PRIVATE_KEY,
    subscriptionCount: subCount,
  });
}
