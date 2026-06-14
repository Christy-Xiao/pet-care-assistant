'use client';

import { AuthProvider } from '@/store/AuthContext';
import { AppProvider } from '@/store/AppContext';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

function AppContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  
  if (isLoginPage) {
    // 登录页面不需要 Navbar 和 Sidebar
    return <>{children}</>;
  }
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 ml-64 mt-16 min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      </div>
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