'use client';

import { AuthProvider } from '@/store/AuthContext';
import { AppProvider } from '@/store/AppContext';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        {children}
      </AppProvider>
    </AuthProvider>
  );
}
