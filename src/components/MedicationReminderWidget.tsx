import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Pill, Check, SkipForward, Bell, BellOff, Smartphone, Loader2, Info } from 'lucide-react';
import Link from 'next/link';

interface TreatmentPlan {
  day1?: { title: string; steps: string[] };
  day2?: { title: string; steps: string[] };
  followUp?: { title: string; steps: string[] };
  frequency?: string;
  notes?: string;
}

interface MedicationReminder {
  id: string;
  pet_id: string;
  disease_name: string;
  medications: string[];
  treatment_plan?: TreatmentPlan | null;
  frequency: number;
  next_dose_time: string;
  total_doses: number;
  remaining_doses: number;
  status: string;
}

interface MedicationReminderWidgetProps {
  petId?: string | null;
}

export default function MedicationReminderWidget({ petId }: MedicationReminderWidgetProps) {
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // 🆕 PWA 推送状态
  const [pushStatus, setPushStatus] = useState<'unknown' | 'subscribed' | 'unsubscribed' | 'unsupported'>('unknown');
  const [sendingPush, setSendingPush] = useState(false);

  // 加载用药提醒
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const url = petId 
          ? `/api/medication-reminders?petId=${petId}&active=true`
          : '/api/medication-reminders?active=true';
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          // 只显示活跃的提醒
          const activeReminders = (Array.isArray(data) ? data : []).filter(
            (r: MedicationReminder) => r.status === 'active'
          );
          setReminders(activeReminders);
        }
      } catch (error) {
        console.error('获取用药提醒失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();

    // 监听新的提醒创建事件
    const handleReminderCreated = () => {
      fetchReminders();
    };
    window.addEventListener('medicationReminderCreated', handleReminderCreated);

    return () => {
      window.removeEventListener('medicationReminderCreated', handleReminderCreated);
    };
  }, [petId]);

  // 🆕 检测 PWA 推送订阅状态
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

  // 🆕 订阅 PWA 推送
  const handleSubscribe = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          alert('请允许接收通知权限，才能在后台收到用药提醒！');
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          setPushStatus('subscribed');
          alert('✅ 已经订阅了推送通知！');
          return;
        }
        // 获取 VAPID 公钥并订阅
        const pk = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!pk) {
          alert('⚠️ 服务端未配置 VAPID 密钥，暂时无法订阅。');
          return;
        }
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
        alert('🎉 用药提醒推送订阅成功！到时间会自动收到系统通知~');
      }
    } catch (err: any) {
      alert('订阅失败: ' + (err?.message || err));
    }
  }, []);

  // 🆕 测试发送 PWA 推送（用药提醒）
  const handleTestPush = useCallback(async () => {
    if (reminders.length === 0) {
      alert('暂无活跃的用药提醒，无法测试推送');
      return;
    }
    setSendingPush(true);
    try {
      const r = reminders[0]!;
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `💊 该给宠物喂药啦！【${r.disease_name}】`,
          body: `${r.medications.join('、')} · ${r.frequency}次/天 · 剩余${r.remaining_doses}次\n点击查看详情 →`,
          icon: '/icons/icon-192x192.png',
          url: '/health',
          tag: `med-test-${Date.now()}`,
          broadcast: true,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        alert(`📱 用药提醒推送已发送！(${result.sentCount || 0} 台设备)\n\n如果已开启推送权限，几秒后手机/电脑会收到系统通知！`);
      } else {
        alert(`推送失败: ${result.error}`);
      }
    } catch (err: any) {
      alert(`推送异常: ${err?.message || err}`);
    } finally {
      setSendingPush(false);
    }
  }, [reminders]);

  // 计算倒计时
  useEffect(() => {
    if (reminders.length === 0) return;

    const updateCountdown = () => {
      const now = new Date();
      const nextDose = new Date(reminders[0]!.next_dose_time);
      const diffMs = nextDose.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeft('现在用药');
      } else {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        if (hours > 0) {
          setTimeLeft(`${hours}小时${minutes}分`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}分${seconds}秒`);
        } else {
          setTimeLeft(`${seconds}秒`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [reminders]);

  // 确认用药
  const handleTakeDose = async (reminderId: string) => {
    try {
      const response = await fetch('/api/medication-reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reminderId,
          action: 'take_dose',
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setReminders(prev => 
          prev.map(r => r.id === reminderId ? updated : r).filter(r => r.status === 'active')
        );
      }
    } catch (error) {
      console.error('确认用药失败:', error);
    }
  };

  // 跳过本次
  const handleSkip = async (reminderId: string) => {
    try {
      const response = await fetch('/api/medication-reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reminderId,
          action: 'skip',
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setReminders(prev => 
          prev.map(r => r.id === reminderId ? updated : r)
        );
      }
    } catch (error) {
      console.error('跳过用药失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5 animate-pulse">
        <div className="h-6 bg-blue-200 rounded w-24 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-blue-200 rounded w-full"></div>
          <div className="h-4 bg-blue-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">用药提醒</h3>
          </div>
          {/* 🆕 推送按钮组 */}
          <div className="flex gap-1">
            {pushStatus === 'unsubscribed' && (
              <button
                onClick={handleSubscribe}
                className="px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-0.5 transition-colors shadow-sm"
                title="开启后可在后台收到用药提醒推送"
              >
                <Bell className="w-3 h-3" /> 开启推送
              </button>
            )}
            {pushStatus === 'subscribed' && (
              <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-green-100 text-green-600 flex items-center gap-0.5">
                <Bell className="w-3 h-3" /> 已开启
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-blue-600">暂无用药提醒</p>
        <Link 
          href="/health"
          className="mt-3 inline-block text-xs text-blue-500 hover:text-blue-600"
        >
          进行健康分析 →
        </Link>
      </div>
    );
  }

  const nextReminder = reminders[0];
  const progress = nextReminder.total_doses > 0 
    ? ((nextReminder.total_doses - nextReminder.remaining_doses) / nextReminder.total_doses) * 100 
    : 0;

  // 判断紧急程度
  const now = new Date();
  const nextDoseTime = new Date(nextReminder.next_dose_time);
  const hoursUntil = (nextDoseTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isUrgent = hoursUntil <= 1;
  const isOverdue = hoursUntil <= 0;

  return (
    <div className={`rounded-2xl border p-5 transition-all ${
      isOverdue 
        ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200 animate-pulse'
        : isUrgent 
        ? 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'
        : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isOverdue ? 'bg-red-500' : isUrgent ? 'bg-orange-500' : 'bg-blue-500'
          }`}>
            <Clock className="w-4 h-4 text-white" />
          </div>
          <h3 className={`font-semibold ${isOverdue ? 'text-red-800' : isUrgent ? 'text-orange-800' : 'text-blue-800'}`}>
            {isOverdue ? '用药提醒' : '下次用药'}
          </h3>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {nextReminder.disease_name}
        </div>
      </div>

      {/* 沙漏效果和时间显示 */}
      <div className="flex items-center gap-4 mb-4">
        {/* 沙漏图标 */}
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 24 24" className="w-full h-full">
            {/* 沙漏框架 */}
            <path
              d="M6 2v2h12V2M6 22v-2h12v2M6 4h12l-1.5 4H7.5L6 4zM6 20h12l-1.5-4H7.5L6 20z"
              fill="none"
              stroke={isOverdue ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* 沙子（从上往下） */}
            <path
              d={`M6 4h12l-1.5 4H7.5L6 4z`}
              fill={isOverdue ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}
              opacity="0.3"
            />
            {/* 沙子（从下往上） */}
            <path
              d={`M6 20h12l-1.5-4H7.5L6 20z`}
              fill={isOverdue ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}
              opacity="0.3"
            />
            {/* 沙子流动线 */}
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="16"
              stroke={isOverdue ? '#ef4444' : isUrgent ? '#f97316' : '#3b82f6'}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* 时间倒计时 */}
        <div className="flex-1">
          <div className={`text-2xl font-bold ${isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-blue-600'}`}>
            {timeLeft}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {nextReminder.frequency}次/天 · {nextReminder.remaining_doses}次剩余
          </div>
        </div>
      </div>

      {/* 疗程进度条 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>疗程进度</span>
          <span>{nextReminder.total_doses - nextReminder.remaining_doses}/{nextReminder.total_doses}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              isOverdue ? 'bg-red-500' : isUrgent ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 用药信息 */}
      <div className="bg-white/70 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Pill className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-800">建议用药</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextReminder.medications.map((med, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
            >
              {med}
            </span>
          ))}
        </div>
        
        {/* 详细治疗方案 */}
        {nextReminder.treatment_plan && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">💡 治疗步骤</p>
            <div className="space-y-2 text-xs">
              {nextReminder.treatment_plan.day1 && (
                <div className="bg-yellow-50 rounded p-2">
                  <p className="font-medium text-yellow-700 mb-1">{nextReminder.treatment_plan.day1.title}</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {nextReminder.treatment_plan.day1.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
              {nextReminder.treatment_plan.day2 && (
                <div className="bg-green-50 rounded p-2">
                  <p className="font-medium text-green-700 mb-1">{nextReminder.treatment_plan.day2.title}</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {nextReminder.treatment_plan.day2.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
              {nextReminder.treatment_plan.followUp && (
                <div className="bg-blue-50 rounded p-2">
                  <p className="font-medium text-blue-700 mb-1">{nextReminder.treatment_plan.followUp.title}</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {nextReminder.treatment_plan.followUp.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
              {nextReminder.treatment_plan.notes && (
                <p className="text-gray-500 italic">
                  📝 {nextReminder.treatment_plan.notes}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTakeDose(nextReminder.id)}
          className={`flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
            isOverdue
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <Check className="w-4 h-4" />
          确认用药
        </button>
        <button
          onClick={() => handleSkip(nextReminder.id)}
          className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          title="跳过本次"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* 其他提醒（如果有） */}
      {reminders.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200/50">
          <p className="text-xs text-gray-500 mb-2">还有其他提醒</p>
          <div className="space-y-2">
            {reminders.slice(1, 3).map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {reminder.disease_name} · {reminder.medications[0]}
                </span>
                <span className="text-xs text-gray-400">
                  剩{reminder.remaining_doses}次
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🆕 PWA 推送控制区 */}
      <div className="mt-4 pt-3 border-t border-blue-100/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] opacity-50">
          <Info className="w-3 h-3" />
          <span>
            {pushStatus === 'subscribed'
              ? '到时间会自动推送系统通知'
              : pushStatus === 'unsupported'
                ? '当前浏览器不支持推送'
                : '开启「推送」可在后台收到用药提醒'
            }
          </span>
        </div>
        <div className="flex gap-1">
          {pushStatus === 'unsubscribed' && (
            <button
              onClick={handleSubscribe}
              className="px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-0.5 transition-colors shadow-sm"
              title="订阅后到时间自动收到系统通知"
            >
              <Bell className="w-3 h-3" /> 开启
            </button>
          )}
          {pushStatus === 'subscribed' && (
            <>
              <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-green-100 text-green-600 flex items-center gap-0.5">
                <Bell className="w-3 h-3" /> 已开启
              </span>
              <button
                onClick={handleTestPush}
                disabled={sendingPush}
                className="px-2 py-1 rounded-md text-[10px] font-medium bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-0.5 transition-colors shadow-sm disabled:opacity-50"
                title="模拟发送一条用药提醒系统通知"
              >
                {sendingPush
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Smartphone className="w-3 h-3" />
                }
                测试推送
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
