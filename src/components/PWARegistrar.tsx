'use client';

import { useEffect } from 'react';

export default function PWARegistrar() {
  useEffect(() => {
    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW 注册成功:', reg.scope))
        .catch(err => console.log('SW 注册失败:', err));
    }

    // 监听安装提示
    let deferredPrompt: BeforeInstallPromptEvent | null = null;
    
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      
      // 可以在这里显示"添加到主屏幕"按钮
      window.dispatchEvent(new CustomEvent('pwa-installable', { detail: true }));
    };

    // 检测是否已安装
    const handleAppInstalled = () => {
      deferredPrompt = null;
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null; // 不渲染任何内容
}

// 类型声明
declare global {
  interface WindowEventMap {
    'pwa-installable': CustomEvent<boolean>;
    'pwa-installed': CustomEvent;
  }
  
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
}
