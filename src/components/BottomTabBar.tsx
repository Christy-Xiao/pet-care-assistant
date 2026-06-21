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
  MessageCircle,
  Settings,
} from 'lucide-react';

const tabs = [
  { href: '/', icon: Home, label: '首页' },
  { href: '/pets', icon: Dog, label: '宠物' },
  { href: '/health', icon: Heart, label: '健康' },
  { href: '/map', icon: MapPin, label: '绿地' },
  { href: '/chat', icon: MessageCircle, label: 'AI' },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 glass border-t border-orange-100/50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== '/' && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all duration-200',
                isActive
                  ? 'text-primary-500'
                  : 'text-gray-400 active:text-primary-400'
              )}
            >
              <div
                className={clsx(
                  'relative transition-transform duration-200',
                  isActive ? 'scale-110' : ''
                )}
              >
                <Icon
                  className={clsx(
                    'w-[22px] h-[22px]',
                    isActive && 'stroke-[2.2px]'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {/* 活跃指示点 */}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
                )}
              </div>
              <span
                className={clsx(
                  'text-[10px] font-medium leading-none',
                  isActive ? 'text-primary-600' : ''
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* 更多菜单（设置等）入口 */}
        <Link
          href="/settings"
          className={clsx(
            'flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all duration-200',
            pathname === '/settings'
              ? 'text-primary-500'
              : 'text-gray-400 active:text-primary-400'
          )}
        >
          <Settings
            className={clsx(
              'w-[22px] h-[22px]',
              pathname === '/settings' ? 'stroke-[2.2px]' : ''
            )}
            strokeWidth={pathname === '/settings' ? 2.5 : 1.8}
          />
          <span
            className={clsx(
              'text-[10px] font-medium leading-none',
              pathname === '/settings' ? 'text-primary-600' : ''
            )}
          >
            我的
          </span>
        </Link>
      </div>
    </nav>
  );
}
