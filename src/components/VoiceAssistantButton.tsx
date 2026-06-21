'use client';

/**
 * VoiceAssistantButton - 语音助手浮动按钮 v2 (复合意图版)
 *
 * 功能：
 * 1. 浮动麦克风按钮（左侧导航栏旁）
 * 2. 按住/点击录音，松开/再点停止
 * 3. 录音中显示脉冲动画 + 计时
 * 4. 处理完成后弹出确认弹窗（支持多意图列表）
 * 5. 自动串行执行所有意图，显示进度
 * 6. 执行完成后展示结果汇总
 */

import { useState, useEffect } from 'react';
import {
  useVoiceAssistant, VoiceState, VoiceIntent, IntentExecutionResult,
} from '@/hooks/useVoiceAssistant';
import {
  Mic, MicOff, X, Check, AlertTriangle, Calendar, Heart, Plus,
  MessageCircle, Loader2, Scale, Edit, Search, Sparkles, ChevronRight,
} from 'lucide-react';

// 意图对应的图标、标签、颜色
const INTENT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  add_pet:              { icon: <Plus className="w-5 h-5" />,         label: '添加宠物',     color: 'bg-blue-50 border-blue-200 text-blue-700' },
  add_schedule:         { icon: <Calendar className="w-5 h-5" />,      label: '创建日程',     color: 'bg-purple-50 border-purple-200 text-purple-700' },
  health_record:        { icon: <Heart className="w-5 h-5" />,         label: '健康记录',     color: 'bg-red-50 border-red-200 text-red-700' },
  update_weight:        { icon: <Scale className="w-5 h-5" />,         label: '更新体重',     color: 'bg-teal-50 border-teal-200 text-teal-700' },
  update_info:          { icon: <Edit className="w-5 h-5" />,          label: '更新信息',     color: 'bg-orange-50 border-orange-200 text-orange-700' },
  query_pets:           { icon: <Search className="w-5 h-5" />,        label: '查询宠物',     color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  general_question:     { icon: <MessageCircle className="w-5 h-5" />, label: '一般咨询',     color: 'bg-green-50 border-green-200 text-green-700' },

};

interface VoiceAssistantProps {
  showFab?: boolean;
  onActionComplete?: (result: any) => void;
}

export default function VoiceAssistantButton({ showFab = true, onActionComplete }: VoiceAssistantProps) {
  const {
    state, result, transcript, error, recordingTime,
    executionResults, currentExecutingIndex,
    startRecording, stopRecording, confirmAction, reset, cancel,
  } = useVoiceAssistant();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [noIntentMessage, setNoIntentMessage] = useState<string | null>(null);

  // 点击处理（开始/停止录音）
  const handleToggleRecording = async () => {
    if (state === 'idle') {
      await startRecording();
    } else if (state === 'recording') {
      await stopRecording();
    }
  };

  // 当结果准备好时，自动弹出确认框
  useEffect(() => {
    if (state === 'ready') {
      if ((result?.extraction?.intents?.length ?? 0) > 0) {
        setActionDone(false);
        setNoIntentMessage(null);
        setShowConfirmDialog(true);
      } else if (transcript) {
        setNoIntentMessage(result?.extraction?.summary || '未能理解您的意思，请换个说法试试～');
        setShowConfirmDialog(true);
      }
    }
  }, [state, result, transcript]);

  // 确认执行所有意图
  const handleConfirm = async () => {
    if (!result) return;
    try {
      const results = await confirmAction();
      setActionDone(true);
      if (onActionComplete) onActionComplete({ result, executionResults: results });
      setTimeout(() => { setShowConfirmDialog(false); reset(); }, 2500);
    } catch (err: any) {
      console.error('[语音] 执行失败:', err);
    }
  };

  // 取消
  const handleCancel = () => {
    if (state === 'executing') return;
    setShowConfirmDialog(false);
    setNoIntentMessage(null);
    reset();
  };

  // 渲染状态文本
  const getStateText = () => {
    switch (state) {
      case 'recording':   return `录音中 ${recordingTime}s`;
      case 'transcribing': return '识别中...';
      case 'extracting':  return `分析意图...`;
      case 'executing':   return `执行中 ${currentExecutingIndex + 1}/${result?.extraction?.intents?.length || 0}`;
      default: return '';
    }
  };

  const intents: VoiceIntent[] = result?.extraction?.intents || [];
  const summary = result?.extraction?.summary || '';

  return (
    <>
      {/* ====== 浮动麦克风按钮 ====== */}
      {showFab && (
        <div className="absolute bottom-[88px] right-5 z-50 flex flex-col items-center gap-2">
          {/* 状态文字 */}
          {(state === 'recording' || state === 'transcribing' || state === 'extracting' || state === 'executing') && (
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ${
              state === 'recording'
                ? 'bg-red-500 text-white animate-pulse'
                : state === 'executing'
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-800 text-white'
            }`}>
              {state === 'recording' ? (
                <span className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  {getStateText()}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {getStateText()}
                </span>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {error && state === 'idle' && (
            <div className="px-3 py-1.5 rounded-full bg-red-100 text-red-600 text-xs font-medium shadow-lg max-w-[200px] text-center truncate">
              {error}
            </div>
          )}

          {/* 麦克风按钮 */}
          <button
            onClick={handleToggleRecording}
            onMouseDown={(e) => { if (state === 'idle') { e.preventDefault(); startRecording(); } }}
            onMouseUp={() => { if (state === 'recording') stopRecording(); }}
            onTouchStart={(e) => { if (state === 'idle') { e.preventDefault(); startRecording(); } }}
            onTouchEnd={() => { if (state === 'recording') stopRecording(); }}
            disabled={state === 'transcribing' || state === 'extracting' || state === 'executing'}
            className={`
              relative w-[72px] h-[72px] rounded-full shadow-xl transition-all duration-200
              flex items-center justify-center ring-4 ring-white/60
              ${state === 'recording'
                ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse-slow ring-red-200/50'
                : ['transcribing', 'extracting', 'executing'].includes(state)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-br from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 hover:scale-105 active:scale-95'
              }
            `}
          >
            {state === 'recording' ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : ['transcribing', 'extracting', 'executing'].includes(state) ? (
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}

            {/* 录音波纹 */}
            {state === 'recording' && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" style={{ animationDuration: '1.5s' }}></span>
                <span className="absolute inset-0 rounded-full bg-red-300 animate-ping opacity-20" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></span>
              </>
            )}
          </button>

          {/* 提示文字 */}
          {state === 'idle' && !error && (
            <p className="text-[10px] text-gray-400 -mt-1">按住说话</p>
          )}
        </div>
      )}

      {/* ====== 结果确认/执行弹窗 ====== */}
      {showConfirmDialog && result && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up max-h-[85vh] flex flex-col">

            {/* 头部 */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-500" />
                语音助手
              </h3>
              {!actionDone && state !== 'executing' && (
                <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">

              {/* ===== 未识别到意图 → 显示提示 ===== */}
              {noIntentMessage && !actionDone && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">识别到：</p>
                    <p className="text-gray-700">{transcript}</p>
                  </div>
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-center space-y-3">
                    <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto" />
                    <p className="text-sm text-yellow-800 font-medium">{noIntentMessage}</p>
                    <p className="text-xs text-yellow-600">
                      试试说：<br />
                      <span className="font-mono text-[11px] mt-1 inline-block">「设置每天两次的用药提醒」</span><br />
                      <span className="font-mono text-[11px]">「帮球球记一下，今天拉肚子了」</span><br />
                      <span className="font-mono text-[11px]">「明天早上8点带旺财去打疫苗」</span>
                    </p>
                  </div>
                </div>
              )}

              {/* ===== 有识别到意图的内容 ===== */}
              {!noIntentMessage && (
                <>
                  {/* 原文 */}
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">你说：</p>
                    <p className="text-gray-800">{result.originalText}</p>
                  </div>

                  {/* AI 总结 */}
                  {summary && !actionDone && (
                    <div className="rounded-xl bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-100 p-3">
                      <p className="text-sm text-primary-800 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                        {summary}
                      </p>
                    </div>
                  )}

                  {/* 执行完成：结果汇总 */}
                  {actionDone && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" /> 全部完成！
                      </p>
                      {executionResults.map((er, idx) => (
                        <div key={idx} className={`flex items-center gap-3 rounded-xl p-3 ${er.success ? 'bg-green-50' : 'bg-red-50'}`}>
                          {INTENT_CONFIG[er.intent]?.icon || <Sparkles className="w-5 h-5" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">{INTENT_CONFIG[er.intent]?.label || er.intent}</p>
                            <p className={`text-sm font-medium truncate ${er.success ? 'text-green-700' : 'text-red-600'}`}>{er.message}</p>
                          </div>
                          {er.success ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-400 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 执行中：进度显示 */}
                  {state === 'executing' && !actionDone && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-primary-700 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> 正在执行...
                      </p>
                      {intents.map((intent, idx) => {
                        const execResult = executionResults.find(r => r.intent === intent.intent);
                        const isCurrent = idx === currentExecutingIndex;
                        const isDone = !!execResult;
                        const config = INTENT_CONFIG[intent.intent];
                        return (
                          <div key={idx} className={`flex items-center gap-3 rounded-xl p-3 transition-all ${
                            isCurrent ? 'bg-primary-50 ring-2 ring-primary-200' :
                            isDone ? (execResult?.success ? 'bg-green-50' : 'bg-red-50') : 'bg-gray-50'
                          }`}>
                            <div className={`shrink-0 ${isCurrent ? 'animate-pulse' : ''}`}>
                              {isCurrent ? (
                                <Loader2 className="w-5 h-5 text-primary-500" />
                              ) : isDone ? (
                                execResult?.success ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-400" />
                              ) : config?.icon || <Sparkles className="w-5 h-5 text-gray-300" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isCurrent ? 'text-primary-700' : isDone ? '' : 'text-gray-400'}`}>
                                {config?.label || intent.intent}
                              </p>
                              {isCurrent && <p className="text-xs text-primary-500">处理中...</p>}
                              {isDone && execResult && (
                                <p className={`text-xs truncate ${execResult.success ? 'text-green-600' : 'text-red-500'}`}>{execResult.message}</p>
                              )}
                            </div>
                            <ChevronRight className={`w-4 h-4 ${isCurrent ? 'text-primary-400' : 'text-gray-300'}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 待确认：意图预览列表 */}
                  {!actionDone && state !== 'executing' && (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">识别到 {intents.length} 个操作</p>
                        {intents.map((intentItem, idx) => {
                          const config = INTENT_CONFIG[intentItem.intent];
                          if (!config) return null;
                          return (
                            <div key={idx} className={`${config.color} rounded-xl border p-3 flex items-center gap-3`}>
                              {config.icon}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{config.label}</p>
                                <p className="text-xs opacity-70">确信度 {Math.round((intentItem.confidence || 0) * 100)}%</p>
                              </div>
                              <ChevronRight className="w-4 h-4 opacity-40" />
                            </div>
                          );
                        })}

                        <details className="group rounded-xl bg-blue-50/50 border border-blue-100">
                          <summary className="px-4 py-3 cursor-pointer text-xs font-medium text-blue-700 hover:bg-blue-100/50 transition-colors flex items-center gap-2">
                            📋 查看详细信息
                            <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform ml-auto" />
                          </summary>
                          <div className="px-4 pb-3 space-y-3 pt-1">
                            {intents.map((intentItem, idx) => (
                              <IntentDetailCard key={idx} intent={intentItem} />
                            ))}
                          </div>
                        </details>
                      </div>

                      {intents.some(i => i.intent === 'general_question') && (
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                          <p className="text-xs text-yellow-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            包含咨询类问题，建议到 AI 对话中继续交流~
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* 底部按钮 */}
            {!actionDone && state !== 'executing' && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                {noIntentMessage ? (
                  <button onClick={handleCancel} className="w-full px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors">
                    知道了
                  </button>
                ) : (
                  <>
                    <button onClick={handleCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">取消</button>
                    <button onClick={handleConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />确认全部 ({intents.length}项)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ==================== 意图详情卡片 ====================

function IntentDetailCard({ intent }: { intent: VoiceIntent }) {
  if (!intent || !intent.intent) return null;

  const fieldLabels: Record<string, string> = {
    name: '🐾 名字', species: '🏷️ 种类', breed: '🧬 品种', age: '🎂 年龄',
    gender: '⚧️ 性别', pet_name: '🐕 宠物', title: '📝 标题', description: '💬 描述',
    event_type: '📅 类型', time: '⏰ 时间', priority: '🚨 优先级', status: '🩺 状态',
    symptoms: '🔍 症状', severity: '📊 严重程度', notes: '📝 备注', question: '❓ 问题',
    topic: '📌 话题', weight: '⚖️ 体重', weight_unit: '单位', field: '字段',
    new_value: '新值', query_type: '查询类型',
  };

  const data = intent.data || {};
  const entries = Object.entries(data).filter(([_, v]) => v != null && v !== '');
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg bg-white/60 p-2.5 space-y-1.5">
      <p className="text-xs font-semibold text-blue-800 mb-1">
        {INTENT_CONFIG[intent.intent]?.label || intent.intent}
      </p>
      {entries.map(([key, value]) => {
        const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
        return (
          <div key={key} className="flex justify-between text-xs">
            <span className="text-gray-400">{fieldLabels[key] || key}</span>
            <span className="text-gray-700 font-medium max-w-[55%] truncate text-right" title={displayValue}>{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}
