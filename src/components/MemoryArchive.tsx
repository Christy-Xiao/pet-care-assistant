'use client';

import { useState, useEffect } from 'react';

// 记忆类型配置
const MEMORY_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  allergy:  { label: '过敏',    icon: '🔴', color: '#ef4444', bgColor: '#fef2f2' },
  fear:     { label: '恐惧',    icon: '⚡', color: '#f59e0b', bgColor: '#fffbeb' },
  behavior: { label: '习惯',    icon: '🎾', color: '#10b981', bgColor: '#ecfdf5' },
  baseline: { label: '基准线',  icon: '📊', color: '#6366f1', bgColor: '#eef2ff' },
  health:   { label: '健康',    icon: '🏥', color: '#06b6d4', bgColor: '#ecfeff' },
  preference:{ label: '偏好',   icon: '💡', color: '#8b5cf6', bgColor: '#f5f3ff' },
  other:    { label: '其他',    icon: '📝', color: '#6b7280', bgColor: '#f9fafb' },
};

interface Memory {
  id: number;
  pet_id: string | null;
  pet_name: string | null;
  memory_type: string;
  memory_content: string;
  updated_at: string;
}

interface MemoryGrouped {
  [key: string]: Memory[];
}

export default function MemoryArchive() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [grouped, setGrouped] = useState<MemoryGrouped>({});
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [baselines, setBaselines] = useState<any[]>([]);
  const [showBaseline, setShowBaseline] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    try {
      setLoading(true);
      const res = await fetch('/api/memories');
      const data = await res.json();
      if (data.success) {
        setMemories(data.memories || []);
        setGrouped(data.grouped || {});
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error('加载记忆失败:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBaselines() {
    if (baselines.length > 0) return;
    try {
      const res = await fetch('/api/baseline');
      const data = await res.json();
      if (data.success) {
        setBaselines(data.baselines || []);
        setShowBaseline(true);
      }
    } catch (err) {
      console.error('加载基线数据失败:', err);
    }
  }

  async function deleteMemory(id: number) {
    if (!confirm('确定要删除这条记忆吗？')) return;
    
    try {
      await fetch('/api/memories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadMemories();
    } catch (err) {
      console.error('删除记忆失败:', err);
    }
  }

  const filteredMemories = activeTab === 'all'
    ? memories
    : memories.filter(m => m.memory_type === activeTab);

  function formatTime(timeStr: string): string {
    const d = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    return d.toLocaleDateString('zh-CN');
  }

  const totalMemories = memories.length;

  return (
    <div style={{ 
      maxWidth: 720, margin: '0 auto', padding: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>🧠</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>AI 长期记忆档案</h1>
        {totalMemories > 0 && (
          <span style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff', borderRadius: 12, padding: '2px 10px',
            fontSize: 12, fontWeight: 600
          }}>
            {totalMemories} 条记忆
          </span>
        )}
      </div>

      {/* 统计卡片行 */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
        gap: 8, marginBottom: 16 
      }}>
        {(Object.keys(MEMORY_TYPE_CONFIG) as Array<keyof typeof MEMORY_TYPE_CONFIG>).map(type => {
          const config = MEMORY_TYPE_CONFIG[type];
          const count = summary[type] || 0;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(activeTab === type ? 'all' : type)}
              style={{
                background: activeTab === type ? config.bgColor : '#f3f4f6',
                border: `2px solid ${activeTab === type ? config.color : 'transparent'}`,
                borderRadius: 12, padding: '10px 8px',
                cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 22 }}>{config.icon}</div>
              <div style={{ 
                fontSize: 14, fontWeight: 600, color: config.color,
                marginTop: 2 
              }}>
                {count}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{config.label}</div>
            </button>
          );
        })}
      </div>

      {/* 基线检查按钮 */}
      <button
        onClick={() => { setShowBaseline(!showBaseline); if (!showBaseline) loadBaselines(); }}
        style={{
          width: '100%', padding: 12, marginBottom: 16,
          background: showBaseline ? '#eef2ff' : '#f3f4f6',
          border: '1px solid #c7d2fe', borderRadius: 12,
          cursor: 'pointer', fontSize: 14, fontWeight: 600,
          color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8,
        }}
      >
        📊 {showBaseline ? '收起行为基线分析' : '查看行为基线分析（场景三）'}
      </button>

      {/* 基线报告面板 */}
      {showBaseline && baselines.length > 0 && (
        <div style={{ 
          background: '#eef2ff', borderRadius: 12, padding: 16, marginBottom: 16,
          border: '1px solid #c7d2fe'
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#3730a3' }}>
            📊 行为基线检测报告
          </h3>
          {baselines.map((pet: any) => (
            <div key={pet.petId} style={{ 
              background: '#fff', borderRadius: 10, padding: 12, marginBottom: 10,
              borderLeft: pet.hasAnomaly ? '4px solid #ef4444' : '4px solid #22c55e'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {pet.petName} {pet.hasAnomaly && <span style={{ color: '#ef4444' }}> ⚠️ 异常</span>}
              </div>
              
              {pet.metrics.walk && (
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#6b7280' }}>🏃 运动：</span>
                  <span>基线 {pet.metrics.walk.baseline} → 当前 {pet.metrics.walk.current}</span>
                  {pet.metrics.walk.isAnomaly && (
                    <span style={{ 
                      color: pet.metrics.walk.direction === 'below' ? '#ef4444' : '#f59e0b',
                      fontWeight: 600, marginLeft: 4
                    }}>
                      ({pet.metrics.walk.direction === 'below' ? '↓ 减少' : '↑ 增加'}{pet.metrics.walk.percentChange}%)
                    </span>
                  )}
                </div>
              )}

              {pet.metrics.meal?.isAnomaly && (
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#6b7280' }}>🍽️ 进食：</span>
                  <span>{pet.metrics.meal.baseline} → {pet.metrics.meal.current}</span>
                  <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 4 }}>
                    ({pet.metrics.meal.direction === 'below' ? '↓ 减少' : '↑ 增加'})
                  </span>
                </div>
              )}

              {pet.metrics.weight?.isAnomaly && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>⚖️ 体重：</span>
                  <span>{pet.metrics.weight.baseline} → {pet.metrics.weight.current} ({pet.metrics.weight.change})</span>
                </div>
              )}
            </div>
          ))}
          
          {!baselines.some((b: any) => b.hasAnomaly) && (
            <p style={{ margin: 0, fontSize: 13, color: '#059669', textAlign: 'center' }}>
              ✅ 所有宠物行为数据正常，无异常偏离
            </p>
          )}
        </div>
      )}

      {/* 记忆列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
          正在加载记忆档案...
        </div>
      ) : filteredMemories.length === 0 ? (
        <div style={{ 
          textAlign: 'center', padding: 40, color: '#9ca3af',
          background: '#f9fafb', borderRadius: 16 
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💭</div>
          <p style={{ margin: 0, fontSize: 15 }}>还没有长期记忆</p>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>
            跟 AI 助手聊天时会自动积累记忆哦～
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d1d5db' }}>
            例如说 &quot;九万对芒果过敏&quot; 或 &quot;打雷时它很害怕&quot;
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredMemories.map((mem) => {
            const config = MEMORY_TYPE_CONFIG[mem.memory_type] || MEMORY_TYPE_CONFIG.other;
            return (
              <div key={mem.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: config.bgColor, borderRadius: 12,
                padding: '12px 16px',
                borderLeft: `4px solid ${config.color}`,
                transition: 'transform 0.15s',
              }}>
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: -2 }}>
                  {config.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: config.color,
                      background: `${config.color}18`, padding: '1px 8px',
                      borderRadius: 4
                    }}>
                      {config.label}
                    </span>
                    {mem.pet_name && (
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {mem.pet_name}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#d1d5db', marginLeft: 'auto' }}>
                      {formatTime(mem.updated_at)}
                    </span>
                  </div>
                  <p style={{ 
                    margin: 0, fontSize: 14, lineHeight: 1.5, color: '#374151',
                    wordBreak: 'break-word'
                  }}>
                    {mem.memory_content}
                  </p>
                </div>
                <button
                  onClick={() => deleteMemory(mem.id)}
                  title="删除此条记忆"
                  style={{
                    background: 'none', border: 'none', color: '#d1d5db',
                    cursor: 'pointer', padding: '2px 4px', fontSize: 16,
                    flexShrink: 0, lineHeight: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#d1d5db')}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部说明 */}
      {!loading && totalMemories > 0 && (
        <div style={{ 
          marginTop: 20, textAlign: 'center', fontSize: 12, color: '#9ca3af',
          padding: 12, background: '#f9fafb', borderRadius: 10
        }}>
          💡 这些记忆由 AI 从对话中自动提取，用于提供更精准的个性化建议。
          <br />
          记忆会自然融入每次对话中，不会生硬地背诵出来~
        </div>
      )}
    </div>
  );
}
