'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  Home, 
  Sparkles,
  MoreVertical,
  Clock,
  X
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
  currentSessionId?: string;
  onNewChat?: () => void;
}

export default function ChatLayout({ 
  children, 
  currentSessionId,
  onNewChat 
}: ChatLayoutProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  // 获取会话列表
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

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 删除会话
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
      const response = await fetch(`/api/chat-sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchSessions();
        // 如果删除的是当前会话，触发新建对话
        if (sessionId === currentSessionId && onNewChat) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('删除会话失败:', error);
    }
  };

  // 格式化时间显示
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 头部 - 新建对话 */}
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={() => {
            onNewChat?.();
            setMobileMenuOpen(false);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 transition-colors group"
        >
          <Plus className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
          <span className="text-sm font-medium text-gray-700">新对话</span>
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-gray-400 text-sm mt-8">
            加载中...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8 px-4">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>暂无历史对话</p>
            <p className="text-xs mt-1">开始你的第一次对话吧</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => (
              <Link
                key={session.sessionId}
                href={`/chat?session=${session.sessionId}`}
                onClick={() => setMobileMenuOpen(false)}
                onMouseEnter={() => setHoveredSession(session.sessionId)}
                onMouseLeave={() => setHoveredSession(null)}
                className={`relative group flex items-start gap-3 p-3 rounded-lg transition-all ${
                  session.sessionId === currentSessionId
                    ? 'bg-white shadow-sm border border-gray-200'
                    : 'hover:bg-gray-100'
                }`}
              >
                <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  session.sessionId === currentSessionId 
                    ? 'text-purple-500' 
                    : 'text-gray-400 group-hover:text-gray-600'
                }`} />
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    session.sessionId === currentSessionId 
                      ? 'text-gray-900' 
                      : 'text-gray-700'
                  }`}>
                    {session.title || '新对话'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{formatTime(session.updatedAt)}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{session.messageCount}条消息</span>
                  </div>
                </div>

                {/* 删除按钮 - hover时显示 */}
                <AnimatePresence>
                  {hoveredSession === session.sessionId && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={(e) => handleDeleteSession(e, session.sessionId)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 底部 - 返回首页 */}
      <div className="p-3 border-t border-gray-200">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <Home className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">返回主页</span>
        </Link>
        
        {/* 版本信息 */}
        <div className="mt-2 px-4 text-center">
          <p className="text-xs text-gray-400">养宠助手 v2.0</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-white flex">
      {/* 桌面端侧边栏 */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="hidden md:flex flex-col border-r border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* 顶部工具栏 */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* 桌面端：折叠/展开按钮 */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className={`w-5 h-5 text-gray-600 transition-transform ${
                !sidebarOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* 移动端：菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {/* Logo/标题 */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-semibold text-gray-800 hidden sm:block">
                AI 健康助手
              </h1>
            </div>
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新对话</span>
            </button>
          </div>
        </header>

        {/* 聊天内容区 */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      {/* 移动端侧边栏遮罩层 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-black/30 z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50 shadow-2xl"
            >
              <SidebarContent />
              
              {/* 关闭按钮 */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-200"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
