'use client';

import MemoryArchive from '@/components/MemoryArchive';

export default function MemoryArchivePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '20px 0' }}>
      {/* 页面标题区 */}
      <div style={{
        maxWidth: 720, margin: '0 auto', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            🧠 AI 长期记忆档案
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            查看 AI 从对话中积累的宠物记忆 — 过敏、恐惧、习惯、基线数据
          </p>
        </div>
      </div>

      <MemoryArchive />
    </div>
  );
}
