'use client';

import { useApp } from '@/store/AppContext';
import Link from 'next/link';
import {
  Heart,
  Calendar,
  MapPin,
  Camera,
  ArrowRight,
  CheckCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Brain,
  CloudRain,
  Sun,
  BarChart3,
  Bell,
  Activity,
  Stethoscope,
  FileText,
} from 'lucide-react';
import WeatherWidget from '@/components/WeatherWidget';
import MedicationReminderWidget from '@/components/MedicationReminderWidget';
import WeatherTipWidget from '@/components/WeatherTipWidget';
import { useState, useEffect } from 'react';

// 长期记忆摘要组件
function MemoryCard({ pets }: { pets: any[] }) {
  const [memoryItems, setMemoryItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const memory = localStorage.getItem('petMemorySummary');
      if (memory) {
        setMemoryItems(JSON.parse(memory));
      } else {
        const defaultItems: string[] = [];
        pets.forEach((pet) => {
          defaultItems.push(`${pet.name} (${pet.breed || pet.species})`);
        });
        setMemoryItems(defaultItems);
      }
    } catch {
      setMemoryItems([]);
    }
    setIsLoading(false);
  }, [pets]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-accent-50 to-primary-50 border border-accent-100 p-4 animate-pulse">
        <div className="h-4 bg-accent-200/60 rounded w-20 mb-2" />
        <div className="space-y-1.5">
          <div className="h-3 bg-accent-200/40 rounded w-full" />
          <div className="h-3 bg-accent-200/40 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent-50 to-primary-50 border border-accent-100 p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Brain className="w-4 h-4 text-accent-500" />
        <h3 className="font-semibold text-accent-800 text-sm">长期记忆</h3>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-accent-100 text-accent-600 rounded-full font-medium">已启用</span>
      </div>

      {memoryItems.length > 0 ? (
        <div className="space-y-1.5">
          {memoryItems.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-start gap-1.5 text-xs text-accent-700">
              <span className="text-accent-300 mt-0.5 text-[10px]">•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-accent-600">与 AI 对话后会记住重要信息</p>
      )}
    </div>
  );
}

// 智能提醒卡片（紧凑版）
function ProactiveCard({
  weatherData,
  schedules,
  parks,
}: {
  weatherData: any;
  schedules: any[];
  parks: any[];
}) {
  const urgentSchedules = schedules.filter((s) => {
    if (s.status !== 'pending') return false;
    const daysUntil = Math.ceil(
      (new Date(s.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil >= 0 && daysUntil <= 3;
  });

  const temp = parseInt(weatherData?.current?.temp) || 25;
  const isHot = temp > 35;
  const isCold = temp < 5;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-secondary-50 to-green-50 border border-secondary-100 p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles className="w-4 h-4 text-secondary-500" />
        <h3 className="font-semibold text-secondary-800 text-sm">智能提醒</h3>
      </div>

      <div className="space-y-2">
        {/* 日程 */}
        {urgentSchedules.length > 0 && (
          <div className="bg-white/70 rounded-xl p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{urgentSchedules[0].title}</p>
              <p className="text-[10px] text-gray-500">即将到期 · 还有{urgentSchedules.length}项</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-secondary-400 shrink-0 ml-auto" />
          </div>
        )}

        {/* 天气 */}
        {(isHot || isCold) && (
          <div className="bg-white/70 rounded-xl p-3 flex items-center gap-2">
            <span className="text-base">{isHot ? '🔥' : '❄️'}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-orange-800">{isHot ? '高温预警' : '低温提醒'}</p>
              <p className="text-[10px] text-gray-500">
                {isHot ? '遛狗控制在10-15分钟' : '外出记得保暖'}
              </p>
            </div>
          </div>
        )}

        {!urgentSchedules.length && !isHot && !isCold && (
          <p className="text-xs text-secondary-500 py-2 text-center">暂无特别提醒 🌸</p>
        )}
      </div>
    </div>
  );
}

// 快捷操作网格
const quickActions = [
  {
    href: '/health',
    icon: Camera,
    label: '健康分析',
    desc: '拍照识别',
    color: 'from-red-50 to-red-100',
    iconColor: 'bg-red-100 text-red-500',
    iconBg: 'group-hover:bg-red-200',
  },
  {
    href: '/map',
    icon: MapPin,
    label: '绿地搜索',
    desc: '宠物友好场所',
    color: 'from-green-50 to-emerald-100',
    iconColor: 'bg-green-100 text-green-500',
    iconBg: 'group-hover:bg-green-200',
  },
  {
    href: '/schedule',
    icon: Calendar,
    label: '护理日程',
    desc: '疫苗驱虫',
    color: 'from-blue-50 to-sky-100',
    iconColor: 'bg-blue-100 text-blue-500',
    iconBg: 'group-hover:bg-blue-200',
  },
  {
    href: '/health-monitor',
    icon: Activity,
    label: '健康监控',
    desc: '数据追踪',
    color: 'from-violet-50 to-purple-100',
    iconColor: 'bg-violet-100 text-violet-500',
    iconBg: 'group-hover:bg-violet-200',
  },
  {
    href: '/weekly-report',
    icon: BarChart3,
    label: '每周报告',
    desc: '健康周报',
    color: 'from-indigo-50 to-blue-100',
    iconColor: 'bg-indigo-100 text-indigo-500',
    iconBg: 'group-hover:bg-indigo-200',
  },
  {
    href: '/chat',
    icon: Heart,
    label: 'AI 助手',
    desc: '智能问诊',
    color: 'from-pink-50 to-rose-100',
    iconColor: 'bg-pink-100 text-pink-500',
    iconBg: 'group-hover:bg-pink-200',
  },
];

export default function HomePage() {
  const { state, selectedPet } = useApp();
  const [weatherData, setWeatherData] = useState<any>(null);
  const [parksData, setParksData] = useState<any[]>([]);

  useEffect(() => {
    const weatherStr = localStorage.getItem('weatherData');
    if (weatherStr) {
      try {
        setWeatherData(JSON.parse(weatherStr));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const parksStr = localStorage.getItem('parks');
    if (parksStr) {
      try {
        setParksData(JSON.parse(parksStr));
      } catch {}
    }
  }, []);

  const upcomingSchedules = state.careSchedules
    .filter((s) => !selectedPet || s.petId === selectedPet.id)
    .filter((s) => s.status === 'pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  const pendingCount = state.notifications.filter((n) => !n.read).length;

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6">
      {/* ====== 顶部欢迎区 ====== */}
      <div className="pt-2 pb-4">
        <h1 className="text-xl font-bold text-gray-800 leading-tight">
          {selectedPet ? `你好，${selectedPet.name} 的主人！` : '欢迎使用毛绒管家'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {selectedPet ? `${selectedPet.breed || '毛孩子'} · ${selectedPet.age || ''}` : '添加您的宠物开始使用'}
        </p>

        {/* 待读通知标签 */}
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-accent-100 text-accent-600 text-[11px] font-medium">
            <Bell className="w-3 h-3" />
            {pendingCount} 条待读通知
          </span>
        )}
      </div>

      {/* ====== 宠物档案卡片 ====== */}
      {selectedPet ? (
        <div className="rounded-2xl bg-gradient-to-r from-primary-400 via-primary-500 to-accent-400 p-4 text-white shadow-lg shadow-primary-300/30 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl shadow-inner shrink-0">
              {selectedPet.species === 'dog' ? '🐕' : '🐱'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">{selectedPet.name}</h2>
              <p className="text-white/80 text-xs mt-0.5">{selectedPet.breed || '宠物'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {selectedPet.age && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px]">{selectedPet.age}</span>
                )}
                {selectedPet.weight && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px]">{selectedPet.weight}kg</span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px]">
                  {selectedPet.gender === 'male' ? '♂ 公' : selectedPet.gender === 'female' ? '♀ 母' : '?'}
                </span>
              </div>
            </div>
            <Link
              href="/pets"
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white text-primary-600 text-xs font-semibold hover:bg-white/90 transition-colors"
            >
              详情 →
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-cream-200 to-cream-300 p-6 text-center border-2 border-dashed border-primary-200 mb-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary-100 flex items-center justify-center">
            <Heart className="w-7 h-7 text-primary-400" />
          </div>
          <h2 className="text-base font-bold text-gray-700 mb-1">还没有添加宠物</h2>
          <p className="text-xs text-gray-500 mb-3">添加您的第一只毛孩子，开启智能养宠之旅</p>
          <Link
            href="/pets"
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-primary-400 to-primary-500 text-white text-sm font-semibold shadow-md shadow-primary-300/30 hover:shadow-lg transition-all"
          >
            <span>添加宠物</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ====== 天气区域（紧凑版） ====== */}
      <div className="mb-4">
        <WeatherWidget />
      </div>

      {/* ====== 天气智能推送横幅 ====== */}
      <WeatherTipWidget />

      {/* ====== 快捷操作网格 ====== */}
      <div className="mt-5 mb-5">
        <div className="grid grid-cols-3 gap-2.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group p-3 rounded-2xl bg-white border border-gray-100/80 shadow-sm hover:shadow-md transition-all active:scale-[0.97]`}
              >
                <div
                  className={`w-9 h-9 rounded-xl ${action.iconColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-4.5 h-4.5" strokeWidth={1.8} />
                </div>
                <h3 className="font-semibold text-gray-800 text-xs">{action.label}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ====== 双列：记忆 + 提醒 ====== */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <MemoryCard pets={state.pets} />
        <ProactiveCard weatherData={weatherData} schedules={state.careSchedules} parks={parksData} />
      </div>

      {/* ====== 即将到期 ====== */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm">即将到期</h3>
          <Link href="/schedule" className="text-xs text-primary-500 font-medium flex items-center gap-0.5">
            全部 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {upcomingSchedules.length === 0 ? (
          <div className="rounded-2xl bg-secondary-50/60 border border-secondary-100 p-5 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-secondary-400" />
            <p className="text-xs text-secondary-600">近期没有待完成的护理任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingSchedules.map((schedule) => {
              const daysUntil = Math.ceil(
                (new Date(schedule.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              const isUrgent = daysUntil <= 3;
              return (
                <div
                  key={schedule.id}
                  className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isUrgent
                      ? 'bg-amber-50/80 border-amber-200'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      schedule.eventType === 'vaccination'
                        ? 'bg-purple-100 text-purple-500'
                        : schedule.eventType === 'parasite_prevention'
                        ? 'bg-green-100 text-green-500'
                        : 'bg-blue-100 text-blue-500'
                    }`}
                  >
                    {schedule.eventType === 'vaccination' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : schedule.eventType === 'parasite_prevention' ? (
                      <Stethoscope className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs truncate">{schedule.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(schedule.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isUrgent
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {daysUntil === 0 ? '今天' : daysUntil === 1 ? '明天' : `${daysUntil}天`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== 用药提醒沙漏 ====== */}
      <div className="mb-5">
        <MedicationReminderWidget petId={selectedPet?.id} />
      </div>

      {/* ====== 最近分析 ====== */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-sm">最近分析</h3>
          <Link href="/health" className="text-xs text-primary-500 font-medium flex items-center gap-0.5">
            去分析 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {state.healthAnalyses.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-5 text-center">
            <Camera className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs text-gray-400">还没有健康分析记录</p>
            <Link href="/health" className="inline-block mt-2 text-xs text-primary-500 font-medium">
              开始拍照分析 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {state.healthAnalyses.slice(-3).reverse().map((analysis) => {
              const pet = state.pets.find((p) => p.id === analysis.petId);
              return (
                <div key={analysis.id} className="p-3 rounded-xl bg-white border border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-xs truncate">{pet?.name || '未知'}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      analysis.result?.severity === 'normal'
                        ? 'bg-green-100 text-green-700'
                        : analysis.result?.severity === 'mild'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {analysis.result?.severity === 'normal'
                      ? '正常'
                      : analysis.result?.severity === 'mild'
                      ? '轻度'
                      : '关注'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部留白，避免被 TabBar 挡住 */}
      <div className="h-4" />
    </div>
  );
}
