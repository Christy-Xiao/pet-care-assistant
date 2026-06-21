'use client';

import React, { useState, useMemo } from 'react';
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
  CheckSquare,
  Square,
} from 'lucide-react';
import Link from 'next/link';

interface ChatSession {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: Date | string;
}

interface ChatLayoutProps {
  children: React.ReactNode;
  onNewChat?: () => void;
  userId?: number | null;
  conversations?: Array<{ id: string; title: string; updatedAt: Date | string; messages?: any[]; createdAt?: any }>;
  currentConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onDeleteBatch?: (ids: string[]) => void;
}

export default function ChatLayout({ 
  children, 
  onNewChat, 
  userId, 
  conversations: propConversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onDeleteBatch,
}: ChatLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 直接从 propConversations 同步映射为 sessions —— 用 useMemo 保证实时性
  const sessions = useMemo<ChatSession[]>(() => {
    if (propConversations && propConversations.length > 0) {
      return propConversations.map(conv => ({
        id: conv.id,
        title: conv.title || '新对话',
        messageCount: conv.messages?.length || 0,
        updatedAt: conv.updatedAt || new Date(),
      }));
    }
    return [];
  }, [propConversations]);

  // 进入/退出批量选择模式时清空选中状态
  const handleToggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    } else {
      setSelectMode(true);
      setSelectedIds(new Set());
    }
  };

  // 单条勾选/取消
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 全选 / 取消全选
  const isAllSelected = selectedIds.size === sessions.length && sessions.length > 0;
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map(s => s.id)));
    }
  };

  // 批量删除确认 + 执行
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`确定要删除选中的 ${count} 条对话吗？此操作不可恢复。`)) return;

    const idsToDelete = Array.from(selectedIds);

    // 一次性批量删除（父组件单次 setState）
    onDeleteBatch?.(idsToDelete);
    
    // 同时调远程 API
    try {
      await Promise.all(
        idsToDelete.map(id =>
          fetch(`/api/chat-sessions?sessionId=${id}`, { method: 'DELETE' }).catch(() => {})
        )
      );
    } catch {}

    // 退出选择模式并清空
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // 单条删除
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('确定要删除这个对话吗？')) return;
    onDeleteConversation?.(sessionId);
    try {
      await fetch(`/api/chat-sessions?sessionId=${sessionId}`, { method: 'DELETE' });
    } catch {}
  };

  const formatTime = (dateInput: Date | string) => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}小时前`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return `${diffDays}天前`;
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  /* 抽屉内容 */
  const DrawerContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部区域 */}
      <div className="px-5 pt-14 pb-3 border-b border-gray-100">
        {/* 选择模式下显示工具栏 */}
        {selectMode ? (
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-500 transition-colors px-1">
              {isAllSelected ? (
                <><CheckSquare className="w-4 h-4 text-primary-500" /><span>取消全选</span></>
              ) : (
                <><Square className="w-4 h-4" /><span>全选</span></>
              )}
            </button>
            <button onClick={handleToggleSelectMode}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors">取消</button>
          </div>
        ) : (
          /* 正常模式：新对话按钮 */
          <button onClick={() => { setDrawerOpen(false); onNewChat?.(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors active:scale-[0.98]">
            <Plus className="w-5 h-5 text-primary-500" />
            <span className="text-sm font-medium text-gray-700">新对话</span>
          </button>
        )}

        {/* 管理按钮 */}
        <button onClick={handleToggleSelectMode}
          className={`w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-2 rounded-lg text-xs transition-colors ${
            selectMode 
              ? 'bg-red-50 text-red-500' 
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}>
          <Trash2 className="w-3.5 h-3.5" />
          <span>{selectMode ? '完成' : '管理'}</span>
        </button>
      </div>

      {/* 历史记录列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {sessions.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-8 px-4">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>暂无历史对话</p>
            <p className="text-xs mt-1 opacity-60">开始你的第一次对话吧</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={(e) => {
                  if (selectMode) {
                    e.stopPropagation();
                    handleToggleSelect(session.id);
                    return;
                  }
                  onSelectConversation?.(session.id);
                  setDrawerOpen(false);
                }}
                className={`flex items-start gap-2.5 p-3 rounded-xl transition-all cursor-pointer ${
                  selectMode && selectedIds.has(session.id)
                    ? 'bg-red-50 border border-red-100'
                    : session.id === currentConversationId && !selectMode
                      ? 'bg-orange-50 border border-orange-100'
                      : 'hover:bg-gray-50 active:bg-gray-50'
                }`}>
                
                {/* 选择模式的 checkbox */}
                {selectMode && (
                  <button onClick={(e) => { e.stopPropagation(); handleToggleSelect(session.id); }}
                    className="shrink-0 mt-0.5 p-0.5 rounded hover:bg-white transition-colors">
                    {selectedIds.has(session.id) ? (
                      <CheckSquare className="w-[18px] h-[18px] text-red-500" />
                    ) : (
                      <Square className="w-[18px] h-[18px] text-gray-300" />
                    )}
                  </button>
                )}

                {/* 非选择模式：消息图标 */}
                {!selectMode && (
                  <MessageSquare className={`w-[18px] h-[18px] mt-0.5 shrink-0 ${session.id === currentConversationId ? 'text-orange-400' : 'text-gray-300'}`} />
                )}

                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium truncate ${selectMode && selectedIds.has(session.id) ? 'text-red-700' : 'text-gray-700'}`}>
                    {session.title || '新对话'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-gray-300" />
                    <span className="text-[11px] text-gray-400">{formatTime(session.updatedAt)}</span>
                    <span className="text-gray-300 text-[11px]">·</span>
                    <span className="text-[11px] text-gray-400">{session.messageCount}条</span>
                  </div>
                </div>

                {/* 非选择模式：单条删除 */}
                {!selectMode && (
                  <button onClick={(e) => handleDeleteSession(e, session.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部：批量删除条 或 默认底部 */}
      {selectMode && selectedIds.size > 0 ? (
        <div className="shrink-0 mx-3 my-2 p-3 bg-red-500 rounded-xl shadow-lg shadow-red-200 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-white/90" />
              <span className="text-sm font-medium text-white">已选 {selectedIds.size} 条</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedIds(new Set())}
                className="text-xs text-white/70 hover:text-white transition-colors px-2">
                清空
              </button>
              <button onClick={handleBatchDelete}
                className="flex items-center gap-1 bg-white text-red-500 text-sm font-medium px-4 py-1.5 rounded-lg active:scale-95 transition-all">
                <Trash2 className="w-3.5 h-3.5" /> 删除
              </button>
            </div>
          </div>
        </div>
      ) : selectMode ? (
        /* 选择模式下未选中任何项 */
        <div className="mx-3 my-2 p-3 bg-gray-100 rounded-xl text-center">
          <p className="text-xs text-gray-400">勾选要删除的对话</p>
        </div>
      ) : (
        /* 默认底部 */
        <div className="px-4 pb-6 pt-3 border-t border-gray-100">
          <Link href="/" onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
            <Home className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">返回主页</span>
          </Link>
          <div className="mt-3 px-4 text-center"><p className="text-[11px] text-gray-300">毛绒管家 v2.0</p></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full w-full overflow-hidden bg-gradient-to-b from-orange-50 via-white to-orange-50 flex relative">
      {/* 历史记录抽屉 */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} onClick={() => { setDrawerOpen(false); setSelectMode(false); setSelectedIds(new Set()); }}
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
            {sessions.length > 0 && (
              <span className="text-[10px] text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded-full">{sessions.length}</span>
            )}
          </div>
        </header>

        {/* 聊天内容 */}
        <main className="flex-1 overflow-hidden relative">{children}</main>
      </div>
    </div>
  );
}
