'use client';

import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Don't show layout on login page
  if (pathname === '/login') {
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
