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
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
      <div className="max-w-md mx-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-primary-100 p-3.5 flex items-center gap-3 animate-fadeIn">
        {/* 图标 */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center flex-shrink-0 shadow-sm shadow-primary-200/50">
          <span className="text-lg">🐾</span>
        </div>

        {/* 文字 */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900">添加到主屏幕</p>
          <p className="text-[10px] text-gray-500">更快访问，体验更佳</p>
        </div>

        {/* 按钮 */}
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-gradient-to-r from-primary-400 to-primary-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 hover:shadow-lg transition-all active:scale-95 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          安装
        </button>

        {/* 关闭 */}
        <button
          onClick={() => setShowBanner(false)}
          className="p-1 text-gray-300 hover:text-gray-500 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
