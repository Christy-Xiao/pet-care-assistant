'use client';

/**
 * WeatherTipWidget - 天气智能推送横幅（PWA 推送辅助组件）
 *
 * 定位：
 * - 主要推送通道：PWA 系统级通知（通过 /api/push/send → Service Worker → showNotification）
 * - 本组件：轻量级内嵌横幅，展示天气建议 + 引导订阅推送 + 手动触发测试
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bell, BellOff, Sparkles, Dog, Home, Clock,
  RefreshCw, Loader2, X, Smartphone, Info,
} from 'lucide-react';

interface WalkAdvice {
  suitable: boolean;
  duration: string;
  bestTime: string;
  reason: string;
}

interface CareTip {
  icon: string;
  category: string;
  tip: string;
}

interface WeatherTipsData {
  title: string;
  summary: string;
  walkAdvice: WalkAdvice;
  careTips: CareTip[];
  warnings: string[];
  extraTips: string[];
  mood: number;
  moodEmoji: string;
}

export default function WeatherNotificationPopup() {
  const [tips, setTips] = useState<WeatherTipsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pushStatus, setPushStatus] = useState<'unknown' | 'subscribed' | 'unsubscribed' | 'unsupported'>('unknown');
  const [sendingPush, setSendingPush] = useState(false);

  // 从 localStorage 读天气参数
  const getWeatherParams = useCallback(() => {
    let temp = 25, humidity = 50, weatherCode = 0, windSpeed = 5, feelsLike = 25;
    try {
      const stored = localStorage.getItem('weatherData');
      if (stored) {
        const w = JSON.parse(stored);
        temp = parseInt(w.current?.temp) || 25;
        humidity = parseInt(w.current?.humidity) || 50;
        weatherCode = parseInt(w.current?.icon) || 0;
        windSpeed = parseFloat(w.current?.windSpeed) || 5;
        feelsLike = parseInt(w.current?.feelsLike) || temp;
      }
    } catch {}
    return { temp, humidity, weatherCode, windSpeed, feelsLike };
  }, []);

  // 检测推送订阅状态
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkPush = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
          setPushStatus('unsupported');
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!reg) { setPushStatus('unsubscribed'); return; }

        const sub = await reg.pushManager.getSubscription();
        setPushStatus(sub ? 'subscribed' : 'unsubscribed');
      } catch { setPushStatus('unsupported'); }
    };
    checkPush();
  }, []);

  // 获取 AI 建议
  const fetchTips = useCallback(async () => {
    setLoading(true);
    try {
      const { temp, humidity, weatherCode, windSpeed, feelsLike } = getWeatherParams();
      const params = new URLSearchParams({
        temp: String(temp), humidity: String(humidity),
        weatherCode: String(weatherCode), windSpeed: String(windSpeed),
        feelsLike: String(feelsLike), petSpecies: 'dog',
      });
      const res = await fetch(`/api/weather/tips?${params}`);
      const json = await res.json();
      if (json.data) setTips(json.data);
      else throw new Error('no data');
    } catch {
      // 规则降级：生成基础建议
      const { temp, humidity } = getWeatherParams();
      setTips({
        title: temp >= 35 ? '🔥 高温暴晒预警！' : temp >= 30 ? '☀️ 今天好热呀~' : '☀️ 今日养宠小贴士',
        summary: temp >= 35
          ? `${temp}°C 大太阳直射！柏油路面可能烫伤肉垫，建议傍晚遛弯~ (๑´ڡ`๑)`
          : temp >= 30
            ? `当前${temp}°C · 湿度${humidity}%，偏热注意防暑，点击查看详细护理建议`
            : `当前${temp}°C · 湿度${humidity}%，点击查看详细护理建议`,
        walkAdvice: { suitable: true, duration: '15-20分钟', bestTime: '傍晚', reason: '' },
        careTips: [{ icon: '💧', category: '补水', tip: '高温天注意给宠物多喝水' }],
        warnings: [],
        extraTips: [],
        mood: 7,
        moodEmoji: '😊',
      });
    } finally { setLoading(false); }
  }, [getWeatherParams]);

  // 初始化获取数据
  useEffect(() => { fetchTips(); }, [fetchTips]);

  // 监听外部触发事件
  useEffect(() => {
    const handler = () => { fetchTips(); setDismissed(false); };
    window.addEventListener('showWeatherPopup', handler);
    return () => window.removeEventListener('showWeatherPopup', handler);
  }, [fetchTips]);

  // 发送真正的 PWA 推送
  const handleSendPWA = async () => {
    if (!tips) return;
    setSendingPush(true);

    try {
      const body = tips.walkAdvice.suitable
        ? `${tips.summary} 🕐 ${tips.walkAdvice.duration}·${tips.walkAdvice.bestTime}`
        : tips.summary;

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: tips.title,
          body,
          icon: '/icons/icon-192x192.png',
          url: '/',
          tag: `weather-manual-${Date.now()}`,
          broadcast: true,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        alert(`📱 PWA 推送已发送！(${result.sentCount || 0} 台设备)\n\n如果已开启推送权限，几秒后手机/电脑会收到系统通知！`);
      } else {
        alert(`推送失败: ${result.error}\n\n可能原因：\n1. 未配置 VAPID 密钥\n2. 无活跃的推送订阅`);
      }
    } catch (err: any) {
      alert(`推送异常: ${err?.message || err}`);
    } finally {
      setSendingPush(false);
    }
  };

  // 请求订阅推送
  const handleSubscribe = async () => {
    // 动态导入 useNotifications hook 的逻辑
    try {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          alert('请允许接收通知权限哦~ 这样才能在后台收到养宠提醒！');
          return;
        }

        const reg = await navigator.serviceWorker.ready;
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          setPushStatus('subscribed');
          alert('✅ 已经订阅了推送通知！');
          return;
        }

        // 需要获取 VAPID 公钥
        const vapidRes = await fetch('/api/push/send');
        const vapidInfo = await vapidRes.json();

        if (!vapidInfo.configured || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          alert('⚠️ 服务端尚未配置 VAPID 密钥，暂时无法订阅推送。\n请联系管理员配置。');
          return;
        }

        // base64 → Uint8Array
        const pk = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
        const padding = '='.repeat((4 - pk.length % 4) % 4);
        const b64 = (pk + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = window.atob(b64);
        const key = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: JSON.parse(JSON.stringify(sub)),
            userId: localStorage.getItem('userId') || undefined,
          }),
        });
        setPushStatus('subscribed');
        alert('🎉 推送订阅成功！以后会在后台收到养宠提醒通知~');
      }
    } catch (err: any) {
      alert('订阅失败: ' + (err?.message || err));
    }
  };

  // 已关闭则不渲染
  if (dismissed && !loading) return null;

  // 心情颜色
  const moodColor = (mood: number) => {
    if (mood >= 8) return 'from-green-400 to-emerald-400 text-green-700 bg-green-50 border-green-200';
    if (mood >= 6) return 'from-yellow-400 to-amber-400 text-yellow-700 bg-yellow-50 border-yellow-200';
    if (mood >= 4) return 'from-orange-400 to-red-400 text-orange-700 bg-orange-50 border-orange-200';
    return 'from-red-500 to-rose-500 text-red-700 bg-red-50 border-red-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3">
      <div className={`rounded-xl border overflow-hidden transition-all ${
        tips ? `bg-gradient-to-r ${moodColor(tips.mood).split(' ').slice(1).join(' ')}` : 'bg-gray-50 border-gray-200'
      }`}>
        {/* 内容区 */}
        <div className="px-4 py-3 flex items-start gap-3">
          {/* 左侧图标 */}
          <div className="shrink-0 mt-0.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${
              tips ? moodColor(tips.mood).split(' ')[0] : 'bg-gray-200'
            }`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : tips?.moodEmoji || '🐾'}
            </div>
          </div>

          {/* 中间内容 */}
          <div className="flex-1 min-w-0">
            {tips ? (
              <>
                <p className={`text-sm font-semibold leading-snug ${tips.mood >= 6 ? '' : ''}`}>
                  {tips.title}
                </p>
                <p className="text-xs mt-0.5 line-clamp-2 opacity-80">
                  {tips.summary}
                </p>
                {/* 遛狗快捷条 */}
                <div className={`mt-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap max-w-fit ${
                  tips.walkAdvice.suitable ? 'bg-white/60' : 'bg-white/40'
                }`}>
                  {tips.walkAdvice.suitable
                    ? <><Dog className="w-3 h-3 shrink-0" /><span>适合遛弯</span></>
                    : <><Home className="w-3 h-3 shrink-0" /><span>不宜外出</span></>
                  }
                  <span className="opacity-70 shrink-0">·</span>
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{tips.walkAdvice.duration}</span>
                </div>
              </>
            ) : (
              <div className="space-y-1.5 py-1">
                <div className="h-3.5 bg-black/5 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-black/5 rounded w-full animate-pulse" />
              </div>
            )}
          </div>

          {/* 右侧：关闭 + 操作按钮 */}
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <button
              onClick={() => setDismissed(true)}
              className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 opacity-40" />
            </button>

            <div className="flex gap-1">
              {/* 订阅引导 */}
              {pushStatus === 'unsubscribed' && (
                <button
                  onClick={handleSubscribe}
                  className="px-2 py-1 rounded-md text-[10px] font-medium
                           bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-0.5
                           transition-colors shadow-sm"
                  title="开启后可接收系统级推送通知"
                >
                  <Bell className="w-3 h-3" /> 开启推送
                </button>
              )}

              {/* 已订阅标识 */}
              {pushStatus === 'subscribed' && (
                <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-green-100 text-green-600 flex items-center gap-0.5">
                  <Bell className="w-3 h-3" /> 已开启
                </span>
              )}

              {/* 手动发送 PWA 推送 */}
              <button
                onClick={handleSendPWA}
                disabled={sendingPush || loading || !tips}
                className="px-2 py-1 rounded-md text-[10px] font-medium
                         bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-0.5
                         transition-colors shadow-sm disabled:opacity-50"
                title="模拟发送一条系统级推送通知"
              >
                {sendingPush
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Smartphone className="w-3 h-3" />
                }
                测试推送
              </button>
            </div>
          </div>
        </div>

        {/* 底部信息条 */}
        <div className="px-4 pb-2.5 pt-0 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] opacity-50">
            <Info className="w-3 h-3" />
            <span>
              {pushStatus === 'subscribed'
                ? '每天自动推送系统通知到您的设备'
                : pushStatus === 'unsupported'
                  ? '当前浏览器不支持系统推送'
                  : '开启「推送」即可在后台收到养宠通知'
              }
            </span>
          </div>

          <button
            onClick={fetchTips}
            disabled={loading}
            className="text-[10px] opacity-50 hover:opacity-100 flex items-center gap-0.5 transition-opacity"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            刷新建议
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook：供其他组件触发天气弹窗刷新
 */
export function useWeatherPopup() {
  return {
    show: () => window.dispatchEvent(new CustomEvent('showWeatherPopup')),
  };
}
