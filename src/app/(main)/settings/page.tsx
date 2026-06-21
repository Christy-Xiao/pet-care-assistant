'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, Moon, Globe, Shield, Info, LogOut, ChevronRight, Check, Smartphone, Send, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { state } = useApp();
  const { user, logout } = useAuth();
  // PWA 推送通知 Hook
  const {
    supported: pushSupported,
    permission: pushPermission,
    subscribed: pushSubscribed,
    loading: pushLoading,
    error: pushError,
    requestPermissionAndSubscribe,
    unsubscribe,
    sendTestNotification,
  } = useNotifications();

  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    language: 'zh-CN',
  });

  const toggleSetting = (key: 'notifications' | 'darkMode') => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // 浏览器检测辅助函数
  const getBrowserName = (): string => {
    if (typeof window === 'undefined') return '未知';
    const ua = navigator.userAgent;
    if (ua.includes('360SE') || ua.includes('360EE') || ua.includes('360browser')) return '360 安全/极速浏览器 ⚠️';
    if (ua.includes('QQBrowser')) return 'QQ 浏览器 ⚠️';
    if (ua.includes('MetaSr')) return '搜狗浏览器 ⚠️';
    if (ua.includes('UBrowser')) return 'UC 浏览器 ⚠️';
    if (ua.includes('Maxthon')) return '遨游浏览器 ⚠️';
    if (ua.includes('Edg/')) return 'Microsoft Edge ✅';
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Google Chrome ✅';
    if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari ✅';
    if (ua.includes('Firefox')) return 'Firefox';
    return `${ua.slice(0, 80)}...`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">设置</h1>
        <p className="text-gray-500 mt-1">管理您的应用偏好和账户设置</p>
      </div>

      {/* Account Info */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-500 to-secondary-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">当前账户</p>
            <p className="text-xl font-bold">{user?.name || '未登录'}</p>
            <p className="text-white/70 text-sm mt-1">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {/* PWA 推送通知 */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary-500" />
            推送通知
            <span className="ml-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs font-medium">
              PWA
            </span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">即使关闭应用，也能收到护理提醒和用药提醒</p>
        </div>

        <div className="p-6 space-y-4">
          {/* 浏览器支持状态 */}
          {!pushSupported && !pushLoading && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">当前环境暂不支持推送通知</p>
                <div className="text-sm text-amber-600 mt-2 space-y-2">
                  <p>🔍 <strong>检测到您正在使用:</strong> <span id="browser-detect">{getBrowserName()}</span></p>
                  <p>💡 推荐使用以下浏览器获得完整体验：</p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li><strong>Google Chrome</strong> — 推送通知完全支持 ✅</li>
                    <li><strong>Microsoft Edge</strong> — 基于 Chromium，支持良好 ✅</li>
                    <li><strong>Safari (iOS 16.4+)</strong> — iPhone/iPad 部署后可用 ✅</li>
                  </ul>
                  <p className="text-xs text-amber-500 pt-1">⚠️ 部分国产浏览器（如 360、QQ浏览器）对 Web Push 支持有限。部署到线上后，在手机 Safari 中从主屏幕打开即可正常使用。</p>
                </div>
              </div>
            </div>
          )}

          {/* 权限被拒绝 */}
          {pushSupported && pushPermission === 'denied' && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3">
              <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">通知权限已被拒绝</p>
                <p className="text-sm text-red-600 mt-1">
                  iOS: 设置 → Safari → 网站设置 → 找到此网站 → 允许通知
                  <br />
                  Android/PC: 点击地址栏左侧的锁图标 → 通知权限 → 允许
                </p>
              </div>
            </div>
          )}

          {/* 主控制区 */}
          {pushSupported && pushPermission !== 'denied' && (
            <>
              {/* 开关 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">接收推送通知</p>
                  <p className="text-sm text-gray-500">
                    {pushSubscribed ? '已开启 - 您将收到实时推送' : '未开启 - 无法收到离线通知'}
                  </p>
                </div>
                {pushLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                ) : (
                  <button
                    onClick={async () => {
                      if (pushSubscribed) {
                        const result = await unsubscribe();
                        setTestResult(result?.success ? '已关闭推送通知' : result?.message || '操作失败');
                      } else {
                        const result = await requestPermissionAndSubscribe();
                        setTestResult(result.message || '操作失败');
                      }
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      pushSubscribed ? 'bg-primary-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                        pushSubscribed ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* 操作提示 */}
              {pushError && (
                <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{pushError}</p>
              )}

              {/* 订阅成功后的操作按钮 */}
              {pushSubscribed && !pushLoading && (
                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={async () => {
                      setTesting(true);
                      setTestResult(null);
                      const res = await sendTestNotification();
                      setTestResult(res.message || (res.success ? '发送成功！请查看手机通知栏' : '发送失败'));
                      setTesting(false);
                      // 5秒后清除提示
                      setTimeout(() => setTestResult(null), 5000);
                    }}
                    disabled={testing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 font-medium transition-colors"
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    发送测试通知
                  </button>
                </div>
              )}

              {/* 测试结果 */}
              {testResult && (
                <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${testResult.includes('失败') || testResult.includes('拒绝') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  {testResult}
                </div>
              )}

              {/* iOS 使用说明 */}
              <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                <p className="text-sm font-medium text-blue-800">📱 iOS 用户必读：</p>
                <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                  <li>在 Safari 中打开此页面</li>
                  <li>点击底部 <strong>分享</strong> 按钮 → <strong>"添加到主屏幕"</strong></li>
                  <li>从<strong>桌面图标</strong>打开应用（不是从 Safari）</li>
                  <li>此时开启上方开关即可生效</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Moon className="w-5 h-5 text-gray-500" />
            外观
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">深色模式</p>
              <p className="text-sm text-gray-500">使用深色主题</p>
            </div>
            <button
              onClick={() => toggleSetting('darkMode')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.darkMode ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">语言</p>
              <p className="text-sm text-gray-500">选择显示语言</p>
            </div>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-gray-50"
            >
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-500" />
            数据管理
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="text-left">
              <p className="font-medium text-gray-800">导出数据</p>
              <p className="text-sm text-gray-500">下载所有宠物数据</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-red-600">
            <div className="text-left">
              <p className="font-medium">清除所有数据</p>
              <p className="text-sm text-red-400">删除所有宠物和记录</p>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Privacy */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-500" />
            隐私与安全
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="text-left">
              <p className="font-medium text-gray-800">隐私政策</p>
              <p className="text-sm text-gray-500">了解我们如何保护您的数据</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="text-left">
              <p className="font-medium text-gray-800">服务条款</p>
              <p className="text-sm text-gray-500">使用条款和条件</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* About */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Info className="w-5 h-5 text-gray-500" />
            关于
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">版本</span>
            <span className="font-medium text-gray-800">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">构建日期</span>
            <span className="font-medium text-gray-800">2024-05-08</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center">
        <p className="text-gray-500 mb-2">当前数据统计</p>
        <div className="flex justify-center gap-8">
          <div>
            <p className="text-3xl font-bold text-gray-800">{state.pets.length}</p>
            <p className="text-sm text-gray-500">宠物</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-800">{state.careSchedules.length}</p>
            <p className="text-sm text-gray-500">护理日程</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-800">{state.healthAnalyses.length}</p>
            <p className="text-sm text-gray-500">健康分析</p>
          </div>
        </div>
      </div>
    </div>
  );
}
