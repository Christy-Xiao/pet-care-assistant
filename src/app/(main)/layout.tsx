import MobileTopBar from '@/components/MobileTopBar';
import BottomTabBar from '@/components/BottomTabBar';
import ProtectedRoute from '@/components/ProtectedRoute';
import PWAInstallButton from '@/components/PWAInstallButton';
import VoiceAssistantButton from '@/components/VoiceAssistantButton';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cream-100">
        {/* 紧凑顶栏 */}
        <MobileTopBar />

        {/* 主内容区 - 适配底部导航高度 */}
        <main className="pt-14 pb-20 min-h-screen">
          {children}
        </main>

        {/* 底部 Tab 导航 */}
        <BottomTabBar />

        {/* 浮动组件 */}
        <PWAInstallButton />
        <VoiceAssistantButton />
      </div>
    </ProtectedRoute>
  );
}
