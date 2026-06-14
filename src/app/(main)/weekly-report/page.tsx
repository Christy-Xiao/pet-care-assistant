'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { ArrowLeft, Calendar, Activity, TrendingUp, TrendingDown, Minus, Droplets, Heart, Scale, Pill, FileText, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { generateWeeklyReport, getSeasonalCareTip } from '@/lib/care-engine';

interface WeeklyStats {
  exerciseDays: number;
  totalExercise: number;
  exerciseTrend: number;
  weightChange: number;
  weightChangePercent: number;
  weightAlert: string;
  currentWeight: number;
  medicationsCount: number;
  healthRecordsCount: number;
  analysisCount: number;
}

export default function WeeklyReportPage() {
  const { selectedPet } = useApp();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0=本周, -1=上周, etc

  // 获取本周统计数据
  useEffect(() => {
    const fetchWeeklyStats = async () => {
      if (!selectedPet) {
        setStats(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 获取运动记录
        const exerciseRes = await fetch(`/api/exercise-records?petId=${selectedPet.id}`);
        const exerciseData = exerciseRes.ok ? await exerciseRes.json() : [];

        // 获取健康记录（就医记录）
        const healthRes = await fetch(`/api/health-records?petId=${selectedPet.id}`);
        const healthData = healthRes.ok ? await healthRes.json() : [];

        // 获取用药提醒
        const medRes = await fetch(`/api/medication-reminders?petId=${selectedPet.id}`);
        const medData = medRes.ok ? await medRes.json() : [];

        // 计算本周和上周的数据（统一用周一作为一周开始）
        const now = new Date();
        
        // 计算当前这周的周一
        const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 距离本周一的天数
        const currentWeekMonday = new Date(now);
        currentWeekMonday.setDate(now.getDate() - daysToMonday);
        currentWeekMonday.setHours(0, 0, 0, 0);
        
        // 根据 weekOffset 调整查看的周（0=本周, -1=上周, -2=上上周...）
        const targetWeekStart = new Date(currentWeekMonday);
        targetWeekStart.setDate(currentWeekMonday.getDate() + weekOffset * 7);
        
        // 当前查看的那周的结束时间（下周周一）
        const targetWeekEnd = new Date(targetWeekStart);
        targetWeekEnd.setDate(targetWeekStart.getDate() + 7);

        // 上一周的起始（目标周的上上周一）
        const prevWeekStart = new Date(targetWeekStart);
        prevWeekStart.setDate(targetWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(targetWeekStart);

        // 筛选目标周的运动记录
        const thisWeekExercise = exerciseData.filter((r: any) => {
          const date = new Date(r.date || r.created_at);
          return date >= targetWeekStart && date < targetWeekEnd;
        });

        // 筛选上一周的运动记录（用于计算趋势）
        const lastWeekExercise = exerciseData.filter((r: any) => {
          const date = new Date(r.date || r.created_at);
          return date >= prevWeekStart && date < prevWeekEnd;
        });

        // 计算本周运动量（分钟）
        const thisWeekTotal = thisWeekExercise.reduce((sum: number, r: any) => sum + (parseFloat(r.duration) || 0), 0);
        const lastWeekTotal = lastWeekExercise.reduce((sum: number, r: any) => sum + (parseFloat(r.duration) || 0), 0);

        // 计算运动趋势
        let exerciseTrend = 0;
        if (lastWeekTotal > 0) {
          exerciseTrend = Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
        } else if (thisWeekTotal > 0) {
          exerciseTrend = 100;
        }

        // 计算目标周的就医记录
        const thisWeekHealth = healthData.filter((r: any) => {
          const date = new Date(r.created_at);
          return date >= targetWeekStart && date < targetWeekEnd;
        });

        // 计算本周应该服药的总次数（根据频率和日期范围）
        let thisWeekMedsCount = 0;
        medData.forEach((reminder: any) => {
          if (reminder.status === 'active' || reminder.status === 'paused') {
            // 计算目标周内在治疗期间的用药次数
            const reminderStart = new Date(reminder.created_at);
            let currentDate = new Date(Math.max(targetWeekStart.getTime(), reminderStart.getTime()));
            const intervalHours = reminder.interval_hours || 8;
            
            while (currentDate < targetWeekEnd) {
              // 如果在治疗期间
              if (currentDate >= reminderStart && currentDate <= now) {
                thisWeekMedsCount++;
              }
              currentDate.setTime(currentDate.getTime() + intervalHours * 60 * 60 * 1000);
            }
          }
        });

        // 计算体重变化（从健康监控的真实数据）
        let weightChange = 0;
        let weightChangePercent = 0;
        let weightAlert = '';
        let displayWeight = 0;
        
        // 获取体重记录（直接从健康监控数据）
        const weightRes = await fetch(`/api/weight-records?petId=${selectedPet.id}`);
        const weightData = weightRes.ok ? await weightRes.json() : [];
        
        console.log('📊 周报体重数据:', { weightData, targetWeekStart: targetWeekStart.toISOString(), targetWeekEnd: targetWeekEnd.toISOString(), weekOffset });
        
        // 获取目标周的体重记录
        const targetWeekWeight = weightData.filter((r: any) => {
          const dateStr = r.recorded_at || r.created_at;
          const date = new Date(dateStr);
          return date >= targetWeekStart && date < targetWeekEnd;
        }).sort((a: any, b: any) => new Date(b.recorded_at || b.created_at) - new Date(a.recorded_at || b.created_at));
        
        // 获取上一周的体重记录（用于计算变化）
        const prevWeekWeight = weightData.filter((r: any) => {
          const dateStr = r.recorded_at || r.created_at;
          const date = new Date(dateStr);
          return date >= prevWeekStart && date < prevWeekEnd;
        }).sort((a: any, b: any) => new Date(b.recorded_at || b.created_at) - new Date(a.recorded_at || b.created_at));
        
        console.log('📊 目标周体重记录:', targetWeekWeight, '前一周体重记录:', prevWeekWeight);
        
        if (targetWeekWeight.length > 0 && prevWeekWeight.length > 0) {
          // 目标周和前一周都有数据，计算变化
          displayWeight = parseFloat(targetWeekWeight[0].weight);
          const previousWeight = parseFloat(prevWeekWeight[0].weight);
          
          if (previousWeight > 0) {
            weightChange = displayWeight - previousWeight;
            weightChangePercent = Math.round((weightChange / previousWeight) * 1000) / 10;
            
            // 判断是否异常（一周体重变化 2-3% 以内是正常的）
            if (Math.abs(weightChangePercent) > 3) {
              if (weightChangePercent > 0) {
                weightAlert = '⚠️ 体重增长过快，建议控制饮食或咨询兽医！';
              } else {
                weightAlert = '⚠️ 体重下降过快，建议检查是否有健康问题！';
              }
            } else if (Math.abs(weightChangePercent) > 2) {
              weightAlert = '📌 体重变化略大，注意观察饮食情况。';
            } else {
              weightAlert = '✅ 体重变化正常，继续保持！';
            }
          }
        } else if (targetWeekWeight.length > 0) {
          // 只有目标周有体重记录
          displayWeight = parseFloat(targetWeekWeight[0].weight);
          weightAlert = '📊 已有该周体重记录，继续监测变化。';
        } else if (weightData.length > 0) {
          // 有历史体重记录但不在目标周 - 显示最近一条记录
          displayWeight = parseFloat(weightData[0].weight);
          const latestDate = new Date(weightData[0].recorded_at || weightData[0].created_at);
          const weekDiff = Math.round((now.getTime() - latestDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weekDiff === 0) {
            weightAlert = '📊 暂无目标周体重记录，显示最新体重。';
          } else {
            weightAlert = `📊 暂无目标周体重记录，最新记录是${weekDiff}周前。`;
          }
        } else {
          weightAlert = '⚠️ 暂无体重记录，请在健康监控页面记录体重';
        }

        setStats({
          exerciseDays: thisWeekExercise.length,
          totalExercise: Math.round(thisWeekTotal),
          exerciseTrend,
          weightChange,
          weightChangePercent,
          weightAlert,
          currentWeight: displayWeight,
          medicationsCount: thisWeekMedsCount,
          healthRecordsCount: thisWeekHealth.length,
          analysisCount: 0, // 健康分析暂不计入
        });
      } catch (error) {
        console.error('获取周报数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyStats();
  }, [selectedPet, weekOffset]);

  // 获取周报文本
  const getReportText = () => {
    if (!stats || !selectedPet) return '';
    return generateWeeklyReport({
      petName: selectedPet.name,
      ...stats,
    });
  };

  // 获取周报日期范围（统一使用周一作为一周开始）
  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // 计算本周一
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // 根据 weekOffset 调整
    startOfWeek.setDate(startOfWeek.getDate() + weekOffset * 7);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    };

    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">每周健康报告</h1>
          <p className="text-gray-500">{selectedPet ? `${selectedPet.name} 的健康数据` : '请先选择宠物'}</p>
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="ml-auto p-2 hover:bg-gray-100 rounded-xl transition-colors"
          title="上一周"
        >
          <RefreshCw className="w-5 h-5 text-gray-500 rotate-180" />
        </button>
        <button
          onClick={() => setWeekOffset(0)}
          className={`p-2 rounded-xl transition-colors ${weekOffset === 0 ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-500'}`}
          title="回到本周"
        >
          <Calendar className="w-5 h-5" />
        </button>
      </div>

      {/* Week Selector */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <span className="text-2xl">‹</span>
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold">{weekOffset === 0 ? '本周' : weekOffset === -1 ? '上周' : `${Math.abs(weekOffset)}周前`}</p>
            <p className="text-white/80 text-sm">{getWeekRange()}</p>
          </div>
          <button
            onClick={() => setWeekOffset(prev => Math.min(prev + 1, 0))}
            disabled={weekOffset === 0}
            className={`p-2 rounded-full transition-colors ${weekOffset === 0 ? 'opacity-50' : 'hover:bg-white/20'}`}
          >
            <span className="text-2xl">›</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">正在生成报告...</p>
        </div>
      ) : !selectedPet ? (
        <div className="rounded-2xl bg-gray-50 p-12 text-center border-2 border-dashed border-gray-300">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">请先选择宠物</h2>
          <p className="text-gray-500">在顶部导航栏选择一只宠物后，即可查看周报</p>
        </div>
      ) : stats ? (
        <>
          {/* Report Card */}
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedPet.name} 的健康周报</h2>
                  <p className="text-white/80">📊 来自宠物健康助手</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed">
                {getReportText()}
              </pre>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">运动天数</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.exerciseDays} 天</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                {stats.exerciseTrend > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">比上周 +{stats.exerciseTrend}%</span>
                  </>
                ) : stats.exerciseTrend < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-red-600">比上周 {stats.exerciseTrend}%</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">与上周持平</span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">总运动量</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalExercise} 分钟</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">就医记录</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.healthRecordsCount} 条</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">用药提醒</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.medicationsCount} 次</p>
                </div>
              </div>
            </div>
          </div>

          {/* 体重变化分析 */}
          {stats.weightAlert && (
            <div className={`rounded-2xl p-5 border ${
              stats.weightAlert.includes('⚠️') ? 'bg-red-50 border-red-200' :
              stats.weightAlert.includes('📌') ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  stats.weightAlert.includes('⚠️') ? 'bg-red-100' :
                  stats.weightAlert.includes('📌') ? 'bg-yellow-100' :
                  'bg-green-100'
                }`}>
                  <Scale className={`w-5 h-5 ${
                    stats.weightAlert.includes('⚠️') ? 'text-red-600' :
                    stats.weightAlert.includes('📌') ? 'text-yellow-600' :
                    'text-green-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">体重变化监测</p>
                  {stats.currentWeight > 0 ? (
                    <p className="text-lg font-bold text-gray-800">
                      当前 {stats.currentWeight} kg
                      {stats.weightChangePercent !== 0 && (
                        <span className={`ml-2 text-sm font-medium ${
                          stats.weightChangePercent > 0 ? 'text-red-600' : 
                          stats.weightChangePercent < 0 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          ({stats.weightChangePercent > 0 ? '+' : ''}{stats.weightChangePercent}%)
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-lg font-bold text-gray-800">暂无数据</p>
                  )}
                </div>
              </div>
              <p className={`text-sm ${
                stats.weightAlert.includes('⚠️') ? 'text-red-700' :
                stats.weightAlert.includes('📌') ? 'text-yellow-700' :
                'text-green-700'
              }`}>
                {stats.weightAlert}
              </p>
              {stats.weightChangePercent !== 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  正常范围：±2-3%/周
                </p>
              )}
            </div>
          )}

          {/* Care Tips */}
          <div className="rounded-2xl bg-gradient-to-r from-green-50 to-teal-50 border border-green-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">护理小贴士</h3>
            </div>
            <p className="text-green-700">{getSeasonalCareTip()}</p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Link
              href="/"
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-center hover:bg-gray-200 transition-colors"
            >
              返回首页
            </Link>
            <Link
              href="/records"
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium text-center hover:bg-primary-600 transition-colors"
            >
              查看健康记录
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
