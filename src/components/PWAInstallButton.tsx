'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallButton() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 检查是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // 已经作为 PWA 运行
    }

    // 监听安装事件
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as any);
      
      // 延迟显示，避免一进入就弹
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('用户接受了安装');
    }
    
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-purple-100 p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-500">
        {/* 图标 */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🐾</span>
        </div>

        {/* 文字 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">添加到主屏幕</p>
          <p className="text-xs text-gray-500">更快访问，体验更佳</p>
        </div>

        {/* 按钮 */}
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 hover:shadow-lg transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          安装
        </button>

        {/* 关闭 */}
        <button
          onClick={() => setShowBanner(false)}
          className="p-1.5 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
