/**
 * useNotifications - PWA 推送通知管理 Hook
 * 
 * 功能：
 * 1. 检测浏览器是否支持推送通知
 * 2. 注册/更新 Service Worker
 * 3. 申请通知权限
 * 4. 订阅/取消订阅 Web Push
 * 5. 发送测试通知
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

interface NotificationState {
  supported: boolean;        // 浏览器是否支持
  permission: NotificationPermission | null; // 权限状态
  subscribed: boolean;       // 是否已订阅推送
  swRegistered: boolean;     // Service Worker 是否已注册
  loading: boolean;
  error: string | null;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    supported: false,
    permission: null,
    subscribed: false,
    swRegistered: false,
    loading: true,
    error: null,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // 将 base64 VAPID 公钥转为 Uint8Array（浏览器要求）
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // 初始化：注册 SW + 检测推送支持
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => initNotifications(), 300);
    return () => clearTimeout(timer);
  }, []);

  async function initNotifications() {
    try {
      // Step 1: 只检查 ServiceWorker + Notification（这两个你都有）
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        setState((prev) => ({ ...prev, loading: false, supported: false }));
        return;
      }

      // Step 2: 注册/获取 Service Worker
      let reg: ServiceWorkerRegistration;
      try {
        const existingReg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (existingReg) {
          reg = existingReg;
        } else {
          reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          await reg.ready || Promise.resolve();
        }

        registrationRef.current = reg;
        setState((prev) => ({ ...prev, swRegistered: true }));
      } catch (swErr) {
        console.error('[推送通知] Service Worker 注册失败:', swErr);
        setState((prev) => ({
          ...prev,
          loading: false,
          supported: false,
          error: 'Service Worker 注册失败',
        }));
        return;
      }

      // Step 3: 直接尝试调用 pushManager（不依赖 'PushManager' in navigator 检测）
      let subscription: PushSubscription | null = null;

      try {
        subscription = await reg.pushManager.getSubscription();
      } catch (pushErr: any) {
        console.warn('[推送通知] Push API 不可用:', pushErr.message);
        setState((prev) => ({ ...prev, loading: false, supported: false }));
        return;
      }

      // Step 4: 标记支持
      setState((prev) => ({ ...prev, supported: true }));

      // Step 5: 权限 + 订阅状态
      const perm = Notification.permission;
      setState((prev) => ({
        ...prev,
        permission: perm as NotificationPermission,
        subscribed: !!subscription,
        loading: false,
      }));

      console.log('[推送通知] 初始化完成 — 支持:', true, '已订阅:', !!subscription, '权限:', perm);
    } catch (err: any) {
      console.error('[推送通知] 初始化异常:', err);
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }

  // 请求通知权限 + 订阅推送
  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!state.supported) return { success: false, message: '您的浏览器不支持推送通知' };

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Step 1: 请求通知权限
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          loading: false,
          permission: permission as NotificationPermission,
          error: permission === 'denied' ? '您已拒绝通知权限，请在浏览器设置中手动开启' : null,
        }));
        return {
          success: false,
          message:
            permission === 'denied'
              ? '您已拒绝通知权限。请在 Safari > 设置 > 网站中允许通知'
              : '用户拒绝了通知权限',
        };
      }

      setState((prev) => ({ ...prev, permission: 'granted' }));

      // Step 2: 确保 SW 已注册
      let reg = registrationRef.current;
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        registrationRef.current = reg;
      }

      // Step 3: 订阅 Push
      const existingSubscription = await reg.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[通知] 已经有订阅，跳过重复订阅');
        setState((prev) => ({ ...prev, loading: false, subscribed: true }));
        return { success: true, message: '已开启推送通知' };
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true, // 必须为 true（安全限制）
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log('[通知] 推送订阅成功:', subscription.endpoint.slice(0, 60));

      // Step 4: 把订阅信息发送到后端保存
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: JSON.parse(JSON.stringify(subscription)),
          userId: localStorage.getItem('userId') || undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        if (result.needInit) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: '数据库表尚未初始化，请刷新后重试',
          }));
          return { success: false, message: result.error };
        }
        throw new Error(result.error || '保存订阅失败');
      }

      setState((prev) => ({ ...prev, loading: false, subscribed: true }));
      return { success: true, message: '推送通知已开启！您将收到宠物护理提醒' };
    } catch (err: any) {
      console.error('[通知] 订阅失败:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
      return { success: false, message: err.message };
    }
  }, [state.supported]);

  // 取消订阅
  const unsubscribe = useCallback(async () => {
    try {
      const reg = registrationRef.current;
      if (!reg) return;

      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        setState((prev) => ({ ...prev, subscribed: false }));
        return;
      }

      // 从后端删除
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      // 从浏览器取消订阅
      await subscription.unsubscribe();

      setState((prev) => ({ ...prev, subscribed: false }));
      console.log('[通知] 已取消订阅');
      return { success: true, message: '已关闭推送通知' };
    } catch (err: any) {
      console.error('[通知] 取消订阅失败:', err);
      return { success: false, message: err.message };
    }
  }, []);

  // 发送测试通知（调用后端 API 触发）
  const sendTestNotification = useCallback(async () => {
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🐾 毛绒管家测试',
          body: '这是一条测试通知，如果您能看到它说明推送功能正常！',
          icon: '/icons/icon-192x192.png',
          url: '/settings',
          broadcast: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: `测试通知已发送 (${data.sentCount} 台设备)` };
      }
      return { success: false, message: data.error };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, []);

  return {
    ...state,
    requestPermissionAndSubscribe,
    unsubscribe,
    sendTestNotification,
  };
}



