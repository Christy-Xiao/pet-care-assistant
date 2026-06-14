'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { FileText, Calendar, Heart, Plus, Search, Filter, Camera, Download, Share2, Loader2, Trash2 } from 'lucide-react';
import { Pet } from '@/types';

interface HealthRecord {
  id: string;
  pet_id: string;
  type: string;
  title: string;
  description: string;
  medications: string[];
  created_at: string;
}

export default function RecordsPage() {
  const { state, selectedPet } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'health' | 'analysis'>('all');
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; type: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 从数据库获取病历记录
  useEffect(() => {
    const fetchHealthRecords = async () => {
      if (!selectedPet) {
        setHealthRecords([]);
        return;
      }

      setLoadingRecords(true);
      try {
        const response = await fetch(`/api/health-records?petId=${selectedPet.id}`);
        if (response.ok) {
          const data = await response.json();
          setHealthRecords(data);
        }
      } catch (error) {
        console.error('获取病历记录失败:', error);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchHealthRecords();

    // 监听数据刷新事件
    const handleRefresh = () => {
      fetchHealthRecords();
    };
    window.addEventListener('appDataRefresh', handleRefresh);

    return () => {
      window.removeEventListener('appDataRefresh', handleRefresh);
    };
  }, [selectedPet]);

  // 合并宠物档案、AI分析和数据库病历记录
  const petRecords = selectedPet
    ? [
        // 数据库中的病历记录（来自 AI 助手）
        ...healthRecords.map((record) => ({
          id: record.id,
          type: 'health' as const,
          date: record.created_at,
          title: record.title || '就诊记录',
          description: record.description || '',
          details: record,
          isFromDb: true,
        })),
        // 宠物档案中的就医记录（本地状态）
        ...(Array.isArray(selectedPet.medicalHistory) ? selectedPet.medicalHistory : []).map((record: any) => ({
          id: record.id,
          type: 'health' as const,
          date: record.date,
          title: record.title,
          description: record.description,
          details: record,
        })),
        // AI 健康分析记录（本地状态）
        ...state.healthAnalyses
          .filter((a) => a.petId === selectedPet.id)
          .map((analysis) => ({
            id: analysis.id,
            type: 'analysis' as const,
            date: analysis.createdAt,
            title: `${analysis.analysisType === 'feces' ? '粪便' : analysis.analysisType === 'skin' ? '皮肤' : analysis.analysisType === 'eye' ? '眼睛' : '其他'}健康分析`,
            description: analysis.result.description,
            details: analysis,
          })),
      ]
    : [];

  const filteredRecords = petRecords
    .filter((record) => {
      if (selectedType !== 'all' && record.type !== selectedType) return false;
      if (searchQuery && !record.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'normal':
        return { label: '正常', bg: 'bg-green-100', text: 'text-green-700' };
      case 'mild':
        return { label: '轻度', bg: 'bg-yellow-100', text: 'text-yellow-700' };
      case 'moderate':
        return { label: '中度', bg: 'bg-orange-100', text: 'text-orange-700' };
      case 'severe':
        return { label: '严重', bg: 'bg-red-100', text: 'text-red-700' };
      default:
        return { label: '未知', bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  const getRecordTypeIcon = (record: typeof filteredRecords[0]) => {
    if (record.type === 'health') {
      return <FileText className="w-5 h-5" />;
    }
    return <Camera className="w-5 h-5" />;
  };

  const getRecordTypeColor = (record: typeof filteredRecords[0]) => {
    if (record.type === 'health') {
      return 'bg-blue-100 text-blue-600';
    }
    return 'bg-purple-100 text-purple-600';
  };

  // 删除记录
  const handleDeleteRecord = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      const apiEndpoint = deleteConfirm.type === 'health'
        ? `/api/health-records?id=${deleteConfirm.id}`
        : null;

      if (!apiEndpoint) {
        // 本地记录暂不支持删除
        alert('本地记录暂不支持删除');
        return;
      }

      const response = await fetch(apiEndpoint, { method: 'DELETE' });
      if (response.ok) {
        // 刷新数据
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const generateSummary = () => {
    if (!selectedPet) return '';

    const totalRecords = petRecords.length;
    const healthRecords = petRecords.filter((r) => r.type === 'health').length;
    const analysisRecords = petRecords.filter((r) => r.type === 'analysis').length;
    const normalCount = petRecords.filter((r) => {
      if (r.type !== 'analysis') return false;
      return (r.details as typeof state.healthAnalyses[0]).result.severity === 'normal';
    }).length;

    return `${selectedPet.name}目前共有 ${totalRecords} 条健康记录，其中 ${healthRecords} 条就医记录，${analysisRecords} 次健康分析。最近 ${normalCount} 次分析结果正常。`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">健康记录</h1>
          <p className="text-gray-500 mt-1">
            {selectedPet ? `查看 ${selectedPet.name} 的健康档案和历史分析` : '请先选择一只宠物'}
          </p>
        </div>
        {selectedPet && (
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              <Download className="w-5 h-5" />
              导出
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              <Share2 className="w-5 h-5" />
              分享
            </button>
          </div>
        )}
      </div>

      {/* Summary Card */}
      {selectedPet && petRecords.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white shadow-lg">
          <h3 className="font-semibold mb-2">{selectedPet.name} 的健康概览</h3>
          <p className="text-white/90">{generateSummary()}</p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{petRecords.length}</p>
              <p className="text-sm text-white/80">总记录</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{selectedPet.medicalHistory.length}</p>
              <p className="text-sm text-white/80">就医记录</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{state.healthAnalyses.filter((a) => a.petId === selectedPet.id).length}</p>
              <p className="text-sm text-white/80">分析记录</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      {selectedPet && (
        <div className="flex gap-4">
          <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索记录..."
              className="flex-1 bg-transparent outline-none"
            />
          </div>
          <div className="flex gap-2">
            {([
              { key: 'all', label: '全部' },
              { key: 'health', label: '就医记录' },
              { key: 'analysis', label: '健康分析' },
            ] as const).map((option) => (
              <button
                key={option.key}
                onClick={() => setSelectedType(option.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedType === option.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Records List */}
      {!selectedPet ? (
        <div className="rounded-3xl bg-gray-50 p-12 text-center border-2 border-dashed border-gray-300">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">请先选择宠物</h2>
          <p className="text-gray-500">在顶部导航栏选择一只宠物后，即可查看其健康记录</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-3xl bg-gray-50 p-12 text-center border-2 border-dashed border-gray-300">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">暂无记录</h2>
          <p className="text-gray-500 mb-6">
            {searchQuery || selectedType !== 'all'
              ? '没有找到符合条件的记录'
              : '还没有健康记录，开始记录宠物的健康历程吧'}
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/health"
              className="px-6 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              进行健康分析
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getRecordTypeColor(record)}`}>
                    {getRecordTypeIcon(record)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{record.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {new Date(record.date).toLocaleDateString()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          record.type === 'health' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        {record.type === 'health' ? '就医记录' : '健康分析'}
                      </span>
                    </div>
                  </div>
                </div>

                {record.type === 'analysis' && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getSeverityLabel((record.details as typeof state.healthAnalyses[0]).result.severity).bg
                    } ${getSeverityLabel((record.details as typeof state.healthAnalyses[0]).result.severity).text}`}
                  >
                    {getSeverityLabel((record.details as typeof state.healthAnalyses[0]).result.severity).label}
                  </span>
                )}

                {/* 删除按钮（仅对来自数据库的记录显示） */}
                {(record as any).isFromDb && (
                  <button
                    onClick={() => setDeleteConfirm({ id: record.id, title: record.title, type: record.type })}
                    className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-gray-600 mb-4">{record.description}</p>

              {record.type === 'health' && (
                <div className="space-y-3">
                  {/* 类型和药物信息 */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500">类型</p>
                      <p className="font-medium text-gray-800">
                        {(record.details as Pet['medicalHistory'][0])?.type === 'vaccination'
                          ? '疫苗接种'
                          : (record.details as Pet['medicalHistory'][0])?.type === 'checkup'
                          ? '健康检查'
                          : (record.details as Pet['medicalHistory'][0])?.type === 'surgery'
                          ? '手术'
                          : (record.details as Pet['medicalHistory'][0])?.type === 'medication'
                          ? '用药'
                          : '就诊记录'}
                      </p>
                    </div>
                    {(record.details as Pet['medicalHistory'][0])?.veterinarian && (
                      <div>
                        <p className="text-xs text-gray-500">主治医师</p>
                        <p className="font-medium text-gray-800">{(record.details as Pet['medicalHistory'][0]).veterinarian}</p>
                      </div>
                    )}
                    {(record.details as Pet['medicalHistory'][0])?.cost && (
                      <div>
                        <p className="text-xs text-gray-500">费用</p>
                        <p className="font-medium text-gray-800">¥{(record.details as Pet['medicalHistory'][0]).cost}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* 显示药物信息（来自 AI 助手） */}
                  {(record.details as HealthRecord).medications && 
                   Array.isArray((record.details as HealthRecord).medications) && 
                   (record.details as HealthRecord).medications.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-xs text-blue-600 mb-2 font-medium">💊 用药记录</p>
                      <div className="flex flex-wrap gap-2">
                        {(record.details as HealthRecord).medications.map((med, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {med}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {record.type === 'analysis' && (
                <div className="flex flex-wrap gap-2">
                  {(record.details as typeof state.healthAnalyses[0]).result.recommendations
                    .slice(0, 3)
                    .map((rec, index) => (
                      <span key={index} className="px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm">
                        {rec}
                      </span>
                    ))}
                  {(record.details as typeof state.healthAnalyses[0]).result.recommendations.length > 3 && (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                      +{(record.details as typeof state.healthAnalyses[0]).result.recommendations.length - 3} 更多
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Export Info */}
      {selectedPet && petRecords.length > 0 && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6">
          <h4 className="font-semibold text-blue-800 mb-2">就医摘要</h4>
          <p className="text-sm text-blue-700 mb-4">
            当您带宠物就医时，可以一键生成「病历摘要」给兽医参考，帮助医生快速了解宠物的健康状况。
          </p>
          <button className="px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors">
            生成病历摘要
          </button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-2">确认删除</h3>
            <p className="text-gray-600 text-center mb-6">
              确定要删除「{deleteConfirm.title}」吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                disabled={deleting}
              >
                取消
              </button>
              <button
                onClick={handleDeleteRecord}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    删除中...
                  </>
                ) : (
                  '删除'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
