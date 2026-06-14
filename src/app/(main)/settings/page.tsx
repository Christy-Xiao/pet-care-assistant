'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/store/AuthContext';
import { Bell, Moon, Globe, Shield, Info, LogOut, ChevronRight, Check } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { state } = useApp();
  const { user, logout } = useAuth();
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

      {/* Notifications */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" />
            通知设置
          </h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">护理提醒通知</p>
              <p className="text-sm text-gray-500">在护理到期前3天发送提醒</p>
            </div>
            <button
              onClick={() => toggleSetting('notifications')}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
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
