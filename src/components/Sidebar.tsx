'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { 
  Home, 
  Dog, 
  Heart, 
  MapPin, 
  Calendar, 
  FileText, 
  Settings,
  Sparkles,
  Bell,
  BarChart3,
  Activity
} from 'lucide-react';

const navItems = [
  { href: '/', icon: Home, label: '首页' },
  { href: '/pets', icon: Dog, label: '宠物档案' },
  { href: '/health', icon: Heart, label: '健康分析' },
  { href: '/map', icon: MapPin, label: '绿地搜索' },
  { href: '/schedule', icon: Calendar, label: '护理日程' },
  { href: '/health-monitor', icon: Activity, label: '健康监控' },
  { href: '/weekly-report', icon: BarChart3, label: '每周报告' },
  { href: '/records', icon: FileText, label: '健康记录' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 z-40 overflow-y-auto">
      <div className="p-4">
        {/* AI 助手入口 */}
        <Link
          href="/chat"
          className="flex items-center gap-3 p-4 mb-4 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">AI 健康助手</p>
            <p className="text-xs text-white/80">智能问诊与分析</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={clsx('w-5 h-5', isActive ? 'text-primary-500' : '')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-6 border-t border-gray-100" />

        {/* Reminder Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">待办提醒</span>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            您有 3 项护理任务即将到期
          </p>
          <Link
            href="/schedule"
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            查看详情 →
          </Link>
        </div>

        {/* Settings */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <Settings className="w-5 h-5" />
            <span>设置</span>
          </Link>
        </div>
      </div>

      {/* Version */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-xs text-gray-400">养宠助手 v1.0.0</p>
      </div>
    </aside>
  );
}
