'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Bell, PawPrint, ChevronDown, Search } from 'lucide-react';

export default function MobileTopBar() {
  const { state, selectedPet } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  return (
    <header className="absolute top-0 left-0 right-0 z-50 pt-safe">
      {/* 主顶栏 */}
      <div className="h-12 px-4 flex items-center justify-between bg-white/90 backdrop-blur-lg border-b border-orange-100/60">
        {/* 左侧：Logo + 宠物选择 */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center shadow-sm shadow-primary-300/40 shrink-0">
            <PawPrint className="w-4 h-4 text-white" />
          </div>

          {selectedPet ? (
            <button className="flex items-center gap-1 min-w-0 group">
              <span className="text-base leading-none mr-0.5">
                {selectedPet.species === 'dog' ? '🐕' : '🐱'}
              </span>
              <span className="text-sm font-semibold text-gray-800 truncate max-w-[100px]">
                {selectedPet.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>
          ) : (
            <span className="text-sm font-bold text-primary-600">毛绒管家</span>
          )}
        </div>

        {/* 右侧：搜索 + 通知 */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl hover:bg-orange-50 transition-colors active:scale-95">
            <Search className="w-[18px] h-[18px] text-gray-500" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl hover:bg-orange-50 transition-colors active:scale-95 relative"
            >
              <Bell className="w-[18px] h-[18px] text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* 通知下拉面板 */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-[-1]"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-orange-100/80 py-2 animate-fadeIn max-h-80 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-orange-100/50">
                    <h3 className="font-semibold text-gray-800 text-sm">通知</h3>
                  </div>
                  {state.notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400">
                      <Bell className="w-7 h-7 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">暂无通知</p>
                    </div>
                  ) : (
                    state.notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-2.5 transition-colors ${
                          !notif.read ? 'bg-primary-50/60' : ''
                        }`}
                      >
                        <p className="font-medium text-gray-800 text-xs">{notif.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
