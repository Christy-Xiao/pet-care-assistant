'use client';

import AppLayout from './AppLayout';
import { ReactNode } from 'react';

export default function PageWrapper({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}