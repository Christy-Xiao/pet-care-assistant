'use client';

import { AuthProvider } from '@/store/AuthContext';
import { AppProvider } from '@/store/AppContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

function AppContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 统一交给 (main)/layout.tsx 处理布局（底部TabBar + 手机容器）
  // 这里只做权限保护
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent>{children}</AppContent>
      </AppProvider>
    </AuthProvider>
  );
}
