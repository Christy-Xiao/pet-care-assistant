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
  BarChart3
} from 'lucide-react';
import WeatherWidget from '@/components/WeatherWidget';
import MedicationReminderWidget from '@/components/MedicationReminderWidget';
import { useState, useEffect } from 'react';

// 长期记忆摘要组件
function MemoryCard({ pets, schedules }: { pets: any[], schedules: any[] }) {
  const [memoryItems, setMemoryItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // 从 localStorage 获取记忆摘要
    const loadMemory = () => {
      try {
        const memory = localStorage.getItem('petMemorySummary');
        if (memory) {
          setMemoryItems(JSON.parse(memory));
        } else {
          // 默认显示宠物信息摘要
          const defaultItems: string[] = [];
          pets.forEach(pet => {
            defaultItems.push(`${pet.name} (${pet.breed || pet.species})`);
          });
          setMemoryItems(defaultItems);
        }
      } catch {
        setMemoryItems([]);
      }
      setIsLoading(false);
    };
    
    loadMemory();
  }, [pets]);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-5 animate-pulse">
        <div className="h-5 bg-purple-200 rounded w-24 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-purple-200 rounded w-full"></div>
          <div className="h-4 bg-purple-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-purple-800">长期记忆</h3>
        <span className="ml-auto text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">已启用</span>
      </div>
      
      {memoryItems.length > 0 ? (
        <div className="space-y-2">
          {memoryItems.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-purple-700">
              <span className="text-purple-400 mt-0.5">•</span>
              <span>{item}</span>
            </div>
          ))}
          {memoryItems.length > 4 && (
            <p className="text-xs text-purple-500 mt-2">还有 {memoryItems.length - 4} 条记忆...</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-purple-600">与 AI 对话后会记住重要信息</p>
      )}
    </div>
  );
}

// 主动服务卡片
function ProactiveServiceCard({ 
  weather, 
  schedules, 
  parks 
}: { 
  weather: any, 
  schedules: any[], 
  parks: any[] 
}) {
  // 获取3天内即将到期的日程
  const urgentSchedules = schedules.filter(s => {
    if (s.status !== 'pending') return false;
    const daysUntil = Math.ceil((new Date(s.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 3;
  });

  // 判断天气是否适合外出
  const isGoodWeather = weather?.suggestion?.suitable;
  const weatherLevel = weather?.suggestion?.level;
  
  // 获取温度
  const temp = parseInt(weather?.current?.temp) || 25;
  const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(parseInt(weather?.current?.icon));

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-800">智能提醒</h3>
      </div>
      
      <div className="space-y-3">
        {/* 日程提醒 */}
        {urgentSchedules.length > 0 && (
          <div className="bg-white/70 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">即将到期</span>
            </div>
            {urgentSchedules.slice(0, 2).map((s: any) => {
              const daysUntil = Math.ceil((new Date(s.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={s.id} className="text-sm text-amber-700">
                  {s.title} - {daysUntil === 0 ? '今天' : daysUntil === 1 ? '明天' : `${daysUntil}天后`}
                </div>
              );
            })}
          </div>
        )}

        {/* 天气提醒 */}
        {isRainy && isGoodWeather !== false && (
          <div className="bg-white/70 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <CloudRain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">天气提醒</span>
            </div>
            <p className="text-sm text-blue-700">
              今天有雨，出门记得给宠物带雨具哦！
            </p>
          </div>
        )}

        {/* 绿地推荐 */}
        {isGoodWeather && weatherLevel === 'excellent' && parks.length > 0 && (
          <div className="bg-white/70 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">出行推荐</span>
            </div>
            <p className="text-sm text-green-700">
              天气超棒！推荐去 {parks[0]?.name || '附近的绿地'} 玩耍
            </p>
            <Link 
              href="/map" 
              className="text-xs text-green-600 hover:text-green-700 mt-1 inline-block"
            >
              查看详情 →
            </Link>
          </div>
        )}

        {/* 温度提醒 */}
        {(temp > 35 || temp < 5) && (
          <div className="bg-white/70 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{temp > 35 ? '🔥' : '❄️'}</span>
              <span className="text-sm font-medium text-orange-800">
                {temp > 35 ? '高温提醒' : '低温提醒'}
              </span>
            </div>
            <p className="text-sm text-orange-700">
              {temp > 35 
                ? '气温过高，遛狗时间控制在10-15分钟内'
                : '气温较低，外出记得给宠物保暖'
              }
            </p>
          </div>
        )}

        {/* 默认提示 */}
        {urgentSchedules.length === 0 && !isRainy && (!isGoodWeather || weatherLevel !== 'excellent') && (
          <p className="text-sm text-amber-600">暂无特别提醒</p>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { state, selectedPet } = useApp();
  const [weatherData, setWeatherData] = useState<any>(null);
  const [parksData, setParksData] = useState<any[]>([]);

  // 获取天气数据
  useEffect(() => {
    const weatherStr = localStorage.getItem('weatherData');
    if (weatherStr) {
      try {
        setWeatherData(JSON.parse(weatherStr));
      } catch {}
    }
  }, []);

  // 获取绿地数据
  useEffect(() => {
    const parksStr = localStorage.getItem('parks');
    if (parksStr) {
      try {
        setParksData(JSON.parse(parksStr));
      } catch {}
    }
  }, []);

  // 获取即将到期的日程
  const upcomingSchedules = state.careSchedules
    .filter((s) => !selectedPet || s.petId === selectedPet.id)
    .filter((s) => s.status === 'pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  // 获取待处理通知数
  const pendingCount = state.notifications.filter((n) => !n.read).length;

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 天气卡片 - 顶部全宽 */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <WeatherWidget />
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {selectedPet ? `你好，${selectedPet.name} 的主人！` : '欢迎使用养宠助手'}
            </h1>
            <p className="text-gray-500 mt-1">
              {selectedPet ? `${selectedPet.breed || selectedPet.species} · ${selectedPet.age}` : '添加您的宠物开始使用'}
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">
              {pendingCount} 条待读通知
            </div>
          )}
        </div>

        {/* Pet Profile Card */}
        {selectedPet ? (
          <div className="rounded-3xl bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white shadow-xl shadow-primary-500/20">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center text-5xl">
                {selectedPet.species === 'dog' ? '🐕' : '🐱'}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{selectedPet.name}</h2>
                <p className="text-white/80">{selectedPet.breed || '宠物'}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="px-3 py-1 rounded-full bg-white/20 text-sm">
                    {selectedPet.age}
                  </div>
                  {selectedPet.weight && (
                    <div className="px-3 py-1 rounded-full bg-white/20 text-sm">
                      {selectedPet.weight} kg
                    </div>
                  )}
                  <div className="px-3 py-1 rounded-full bg-white/20 text-sm">
                    {selectedPet.gender === 'male' ? '♂ 公' : selectedPet.gender === 'female' ? '♀ 母' : '未知'}
                  </div>
                </div>
              </div>
              <Link
                href="/pets"
                className="px-6 py-3 rounded-xl bg-white text-primary-600 font-medium hover:bg-white/90 transition-colors"
              >
                查看详情
              </Link>
            </div>
            
            {/* 过敏信息 */}
            {selectedPet.allergies && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-sm text-white/80 mb-2">⚠️ 过敏史：{
                  Array.isArray(selectedPet.allergies)
                    ? selectedPet.allergies.join('、')
                    : selectedPet.allergies
                }</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-gradient-to-r from-gray-100 to-gray-50 p-8 text-center border-2 border-dashed border-gray-300">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">还没有添加宠物</h2>
            <p className="text-gray-500 mb-4">添加您的第一只宠物，开启智能养宠之旅</p>
            <Link
              href="/pets"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              <span>添加宠物</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/health"
            className="group p-6 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all border border-gray-100"
          >
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-800">健康分析</h3>
            <p className="text-sm text-gray-500 mt-1">拍照识别健康问题</p>
          </Link>

          <Link
            href="/map"
            className="group p-6 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all border border-gray-100"
          >
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-gray-800">绿地搜索</h3>
            <p className="text-sm text-gray-500 mt-1">查找宠物友好场所</p>
          </Link>

          <Link
            href="/schedule"
            className="group p-6 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all border border-gray-100"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-800">护理日程</h3>
            <p className="text-sm text-gray-500 mt-1">管理疫苗和驱虫</p>
          </Link>

          <Link
            href="/weekly-report"
            className="group p-6 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all border border-gray-100"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="font-semibold text-gray-800">每周报告</h3>
            <p className="text-sm text-gray-500 mt-1">查看健康周报</p>
          </Link>

          <Link
            href="/chat"
            className="group p-6 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all border border-gray-100"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="font-semibold text-gray-800">AI 助手</h3>
            <p className="text-sm text-gray-500 mt-1">智能问诊和建议</p>
          </Link>
        </div>

        {/* 长期记忆和智能提醒 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 用药提醒沙漏卡片 */}
          <MedicationReminderWidget petId={selectedPet?.id} />
          
          {/* 智能提醒卡片 */}
          <ProactiveServiceCard 
            weather={weatherData} 
            schedules={state.careSchedules} 
            parks={parksData}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upcoming Tasks */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">即将到期</h3>
              <Link href="/schedule" className="text-sm text-primary-600 hover:text-primary-700">
                查看全部
              </Link>
            </div>
            
            {upcomingSchedules.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="text-gray-500">近期没有待完成的护理任务</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSchedules.map((schedule) => {
                  const daysUntil = Math.ceil(
                    (new Date(schedule.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const isUrgent = daysUntil <= 3;
                  
                  return (
                    <div
                      key={schedule.id}
                      className={`p-4 rounded-xl border ${
                        isUrgent ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              schedule.eventType === 'vaccination'
                                ? 'bg-purple-100 text-purple-600'
                                : schedule.eventType === 'parasite_prevention'
                                ? 'bg-green-100 text-green-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            {schedule.eventType === 'vaccination' ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : schedule.eventType === 'parasite_prevention' ? (
                              <Clock className="w-5 h-5" />
                            ) : (
                              <Calendar className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{schedule.title}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(schedule.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isUrgent
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {daysUntil === 0 ? '今天' : daysUntil === 1 ? '明天' : `${daysUntil}天后`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 遛狗地图入口 */}
          <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">带宠物出行</h3>
                <p className="text-sm text-gray-500">查找附近的宠物友好场所</p>
              </div>
            </div>
            
            <div className="bg-white/80 rounded-xl p-4">
              <Link
                href="/map"
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">探索附近绿地</p>
                  <p className="text-sm text-gray-500 mt-1">公园、宠物乐园、宠物友好的咖啡馆...</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-500" />
              </Link>
            </div>
            
            <Link
              href="/schedule"
              className="mt-4 block"
            >
              <div className="bg-white/80 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">今日护理任务</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {upcomingSchedules.length > 0 
                        ? `还有 ${upcomingSchedules.length} 项待完成` 
                        : '今日任务已全部完成！'}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary-500" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">最近分析</h3>
          {state.healthAnalyses.length === 0 ? (
            <div className="py-8 text-center">
              <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">还没有健康分析记录</p>
              <Link
                href="/health"
                className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                开始分析
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {state.healthAnalyses.slice(-3).reverse().map((analysis) => {
                const pet = state.pets.find((p) => p.id === analysis.petId);
                return (
                  <div key={analysis.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{pet?.name || '未知宠物'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          analysis.result?.severity === 'normal'
                            ? 'bg-green-100 text-green-700'
                            : analysis.result?.severity === 'mild'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {analysis.result?.severity === 'normal' ? '正常' : 
                         analysis.result?.severity === 'mild' ? '轻度' : '需要关注'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
