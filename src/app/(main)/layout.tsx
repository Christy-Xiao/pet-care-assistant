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
      {/* 外层：桌面端深色背景 + 居中手机框架 */}
      <div className="min-h-screen bg-stone-200 md:bg-stone-300 md:flex md:justify-center md:items-start md:p-2 md:pt-2">
        {/* 手机容器 - 桌面端限宽，移动端全屏 */}
        <div className="w-full max-w-[430px] md:h-[93vh] md:max-h-[900px] md:rounded-[2rem] md:shadow-2xl md:overflow-hidden bg-cream-100 relative">
          {/* 紧凑顶栏 */}
          <MobileTopBar />

          {/* 主内容区 - 适配底部导航高度 */}
          <main className="pt-14 pb-20 min-h-screen md:min-h-0 md:h-[calc(100vh-56px)] md:overflow-y-auto">
            {children}
          </main>

          {/* 底部 Tab 导航 */}
          <BottomTabBar />

          {/* 浮动组件 */}
          <PWAInstallButton />
          <VoiceAssistantButton />
        </div>
      </div>
    </ProtectedRoute>
  );
}
