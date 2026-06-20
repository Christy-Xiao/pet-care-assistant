import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/store/AppContext';
import { AuthProvider } from '@/store/AuthContext';
import PWARegistrar from '@/components/PWARegistrar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '毛绒管家 - AI宠物健康助手',
  description: 'AI驱动的智能宠物健康管理助手，帮助您管理宠物健康、追踪护理日程、AI健康咨询',
  manifest: '/manifest.json',
  themeColor: '#8b5cf6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '毛绒管家',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </AuthProvider>
        <PWARegistrar />
      </body>
    </html>
  );
}
