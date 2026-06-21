'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Home,
  Sparkles,
  Clock,
  X,
  Menu,
} from 'lucide-react';
import Link from 'next/link';

interface ChatSession {
  sessionId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatLayoutProps {
  children: React.ReactNode;
  onNewChat?: () => void;
}

export default function ChatLayout({ children, onNewChat }: ChatLayoutProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/chat-sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('获取会话列表失败:', error);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('确定要删除这个对话吗？')) return;
    try {
      const response = await fetch(`/api/chat-sessions?sessionId=${sessionId}`, { method: 'DELETE' });
      if (response.ok) await fetchSessions();
    } catch (error) { console.error('删除失败:', error); }
  };

  const formatTime = (dateString: string) => {
    const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return new Date(dateString).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  /* 抽屉内容 */
  const DrawerContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="px-5 pt-14 pb-4 border-b border-gray-100">
        <button onClick={() => { setDrawerOpen(false); onNewChat?.(); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors active:scale-[0.98]">
          <Plus className="w-5 h-5 text-primary-500" />
          <span className="text-sm font-medium text-gray-700">新对话</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? <div className="text-center text-gray-400 text-sm mt-8">加载中...</div>
        : sessions.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8 px-4">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>暂无历史对话</p>
            <p className="text-xs mt-1 opacity-60">开始你的第一次对话吧</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <Link key={session.sessionId} href={`/chat?session=${session.sessionId}`}
                onClick={() => setDrawerOpen(false)}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                  session.sessionId === (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('session') : '')
                    ? 'bg-orange-50' : 'hover:bg-gray-50 active:bg-gray-50'
                }`}>
                <MessageSquare className={`w-[18px] h-[18px] mt-0.5 shrink-0 text-gray-300`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate text-gray-700">{session.title || '新对话'}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-gray-300" />
                    <span className="text-[11px] text-gray-400">{formatTime(session.updatedAt)}</span>
                    <span className="text-gray-300 text-[11px]">·</span>
                    <span className="text-[11px] text-gray-400">{session.messageCount}条</span>
                  </div>
                </div>
                <button onClick={(e) => handleDeleteSession(e, session.sessionId)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pb-6 pt-3 border-t border-gray-100">
        <Link href="/" onClick={() => setDrawerOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
          <Home className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">返回主页</span>
        </Link>
        <div className="mt-3 px-4 text-center"><p className="text-[11px] text-gray-300">毛绒管家 v2.0</p></div>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full overflow-hidden bg-gradient-to-b from-orange-50 via-white to-orange-50 flex relative">
      {/* 历史记录抽屉 */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] shadow-xl shadow-gray-200/50 bg-white">
              <DrawerContent />
              <button onClick={() => setDrawerOpen(false)}
                className="absolute top-12 right-3 p-2 rounded-xl bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all z-50">
                <X className="w-4 h-4" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* 顶栏 */}
        <header className="shrink-0 flex items-center justify-between px-4 pt-safe pb-0 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="h-12 flex items-center gap-3 w-full">
            <button onClick={() => setDrawerOpen(true)}
              className="p-2 -ml-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all active:scale-95">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center shadow-md shadow-primary-500/20">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="text-base font-semibold text-gray-800 truncate tracking-tight">毛绒管家 AI</h1>
            </div>
          </div>
        </header>

        {/* 聊天内容 */}
        <main className="flex-1 overflow-hidden relative">{children}</main>
      </div>
    </div>
  );
}
