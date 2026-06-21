'use client';

// Template 已废弃 — 所有页面布局由 (main)/layout.tsx 统一管理
// 这里只做透传，不添加任何额外 UI
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
