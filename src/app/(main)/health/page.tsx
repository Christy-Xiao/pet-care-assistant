'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import { Camera, Upload, AlertCircle, CheckCircle, Info, X, Loader2, History, Save, Check } from 'lucide-react';

type AnalysisType = 'feces' | 'skin' | 'eye' | 'ear' | 'other';

interface AnalysisResult {
  severity: 'normal' | 'mild' | 'moderate' | 'severe';
  diseaseType?: 'eczema' | 'bacterial' | 'fungal' | 'allergy' | 'parasite' | 'normal';
  description: string;
  recommendations: string[];
  medication?: string[];
  needsImmediateCare: boolean;
}

export default function HealthPage() {
  const { state, selectedPet, addHealthAnalysis } = useApp();
  const [selectedType, setSelectedType] = useState<AnalysisType>('skin');
  const [image, setImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>(''); // 保存文件名
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [savedToRecord, setSavedToRecord] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 清除错误消息
  const clearError = () => setErrorMessage(null);
  
  // 保存皮肤病史到病例表
  const saveToMedicalHistory = async (petId: string, result: AnalysisResult) => {
    try {
      // 疾病类型映射
      const diseaseLabels: Record<string, string> = {
        'eczema': '湿疹',
        'bacterial': '细菌感染',
        'fungal': '真菌感染',
        'allergy': '过敏反应',
        'parasite': '寄生虫感染',
      };
      
      // 湿疹详细治疗方案
      const eczemaTreatmentPlan = {
        day1: {
          title: '第一天',
          steps: [
            '喷碘伏消毒',
            '涂抹恩诺沙星'
          ]
        },
        day2: {
          title: '第二天',
          steps: [
            '用碘伏清洁',
            '用洁尔阴+水喷洒',
            '等1分钟后擦干',
            '涂地塞米松软膏',
            '睡前抹爽身粉'
          ]
        },
        followUp: {
          title: '后续观察',
          steps: [
            '观察红疹是否好转',
            '如果无好转：口服马来酸氯苯那敏片止痒'
          ]
        },
        frequency: '每天3次',
        notes: '保持皮肤干燥，避免抓挠'
      };
      
      const diseaseName = diseaseLabels[result.diseaseType || ''] || '皮肤病';
      const medications = result.medication || [];
      
      // 如果是湿疹，使用详细的治疗方案
      const finalMedications = result.diseaseType === 'eczema' 
        ? ['碘伏', '恩诺沙星', '地塞米松软膏', '爽身粉', '马来酸氯苯那敏片(严重时)']
        : medications;
      
      // 调用API保存病例记录
      const response = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: petId,
          disease_name: diseaseName,
          disease_type: result.diseaseType,
          severity: result.severity,
          description: result.description.substring(0, 200),
          medications: finalMedications,
          treatment_plan: result.diseaseType === 'eczema' ? eczemaTreatmentPlan : null,
          detected_date: new Date().toISOString(),
          status: 'active',
        }),
      });
      
      if (response.ok) {
        const record = await response.json();
        
        // 如果有用药建议，自动创建用药提醒
        if (finalMedications.length > 0) {
          await createMedicationReminder(petId, diseaseName, finalMedications, record.id, result.diseaseType === 'eczema' ? eczemaTreatmentPlan : null);
        }
        
        console.log('病例已保存:', record);
      }
    } catch (error) {
      console.error('保存病例失败:', error);
    }
  };
  
  // 创建用药提醒
  const createMedicationReminder = async (
    petId: string, 
    diseaseName: string, 
    medications: string[],
    recordId: string,
    treatmentPlan?: any
  ) => {
    try {
      // 提取用药频率（如果有的话）
      const frequency = 3; // 默认一天3次
      const intervalHours = 24 / frequency; // 间隔8小时
      
      // 计算下次用药时间
      const nextDoseTime = new Date(Date.now() + intervalHours * 60 * 60 * 1000);
      
      const response = await fetch('/api/medication-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: petId,
          record_id: recordId,
          disease_name: diseaseName,
          medications: medications,
          treatment_plan: treatmentPlan || null,
          frequency: frequency,
          interval_hours: intervalHours,
          next_dose_time: nextDoseTime.toISOString(),
          total_doses: frequency * 7, // 默认7天疗程
          remaining_doses: frequency * 7,
          status: 'active',
        }),
      });
      
      if (response.ok) {
        const reminder = await response.json();
        console.log('用药提醒已创建:', reminder);
        
        // 触发主页刷新提醒数据
        window.dispatchEvent(new CustomEvent('medicationReminderCreated'));
      }
    } catch (error) {
      console.error('创建用药提醒失败:', error);
    }
  };

  const analysisTypes = [
    { id: 'feces', label: '粪便分析', emoji: '💩', desc: '检测消化系统健康' },
    { id: 'skin', label: '皮肤检查', emoji: '🔍', desc: '识别皮肤问题' },
    { id: 'eye', label: '眼睛检查', emoji: '👁️', desc: '观察眼部状况' },
    { id: 'ear', label: '耳朵检查', emoji: '👂', desc: '检查耳道健康' },
    { id: 'other', label: '其他问题', emoji: '📷', desc: '通用拍照分析' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 保存文件名（去掉扩展名）
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setImageFileName(fileName);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // 调用真实的AI分析
  const runAIAnalysis = async () => {
    // 检查是否有图片
    if (!image) {
      setErrorMessage('请先上传一张图片');
      setTimeout(clearError, 3000);
      return;
    }
    
    // 检查是否选择了宠物
    if (!selectedPet) {
      setErrorMessage('请先选择一只宠物进行健康分析');
      setTimeout(clearError, 3000);
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: image,
          analysisType: selectedType,
          description: '',
          fileName: imageFileName, // 传递文件名
        }),
      });

      const data = await response.json();

      if (data.success && data.content) {
        // 解析AI返回的内容
        const aiContent = data.content;
        
        // 解析严重程度
        let severity: AnalysisResult['severity'] = 'normal';
        if (aiContent.includes('严重') || aiContent.includes('立即就医') || aiContent.includes('紧急')) {
          severity = 'severe';
        } else if (aiContent.includes('中度') || aiContent.includes('建议就医')) {
          severity = 'moderate';
        } else if (aiContent.includes('轻度') || aiContent.includes('轻微') || aiContent.includes('需要注意')) {
          severity = 'mild';
        }

        // 解析皮肤病类型
        let diseaseType: AnalysisResult['diseaseType'] = 'normal';
        if (aiContent.includes('湿疹')) {
          diseaseType = 'eczema';
        } else if (aiContent.includes('细菌感染') || aiContent.includes('脓皮')) {
          diseaseType = 'bacterial';
        } else if (aiContent.includes('真菌') || aiContent.includes('癣') || aiContent.includes('马拉色菌')) {
          diseaseType = 'fungal';
        } else if (aiContent.includes('过敏')) {
          diseaseType = 'allergy';
        } else if (aiContent.includes('寄生虫') || aiContent.includes('螨虫') || aiContent.includes('跳蚤') || aiContent.includes('蜱')) {
          diseaseType = 'parasite';
        }

        // 提取描述和建议
        const lines = aiContent.split('\n').filter((line: string) => line.trim());
        const description = lines[0] || '根据图片分析得出的结论';
        
        // 提取建议和用药
        const recommendations: string[] = [];
        const medications: string[] = [];
        let captureRecommendations = false;
        let captureMedication = false;
        lines.forEach((line: string) => {
          if (line.includes('护理建议') || line.includes('建议') || line.includes('措施') || line.includes('处理')) {
            captureRecommendations = true;
            captureMedication = true;
          } else if (captureRecommendations && (line.match(/^\d/) || line.includes('•'))) {
            const item = line.replace(/^[^\w]+/, '').trim();
            // 检测是否是用药相关
            if (item.includes('药') || item.includes('膏') || item.includes('口服') || item.includes('抗生素') || item.includes('涂抹')) {
              medications.push(item);
            } else {
              recommendations.push(item);
            }
          }
        });
        
        if (recommendations.length === 0) {
          recommendations.push('持续观察宠物状态');
          recommendations.push('如有异常加重，及时就医');
        }

        const analysisResult: AnalysisResult = {
          severity,
          diseaseType,
          description: aiContent,
          recommendations: recommendations.slice(0, 5),
          medication: medications.slice(0, 3),
          needsImmediateCare: severity === 'severe',
        };

        setResult(analysisResult);
        
        // 保存分析记录（包含皮肤病类型和用药信息）
        await addHealthAnalysis({
          petId: selectedPet.id,
          imageUrl: image,
          analysisType: selectedType,
          result: analysisResult,
        });
        
        // 如果检测到皮肤病，自动保存到病例和创建用药提醒
        if (analysisResult.diseaseType && analysisResult.diseaseType !== 'normal') {
          await saveToMedicalHistory(selectedPet.id, analysisResult);
        }
        
        // 显示保存成功提示
        setSavedToRecord(true);
        setTimeout(() => setSavedToRecord(false), 3000);
      } else {
        throw new Error(data.error || 'AI分析失败');
      }
    } catch (error: any) {
      console.error('AI分析失败:', error);
      // 使用默认结果
      setResult({
        severity: 'normal',
        description: `AI分析服务暂时不可用。\n\n错误信息: ${error.message}\n\n请您稍后再试，或使用其他方式咨询。`,
        recommendations: [
          '稍后重试AI分析功能',
          '如有紧急情况，请直接咨询兽医',
        ],
        needsImmediateCare: false,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setImage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSeverityConfig = (severity: string, diseaseType?: string) => {
    // 根据皮肤病类型返回具体标签
    if (severity === 'normal') {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: <CheckCircle className="w-6 h-6 text-green-500" />,
        text: 'text-green-700',
        label: '皮肤健康',
      };
    }
    
    // 根据具体疾病类型显示标签
    const diseaseLabels: Record<string, string> = {
      'eczema': '湿疹相关',
      'bacterial': '细菌感染',
      'fungal': '真菌感染',
      'allergy': '过敏反应',
      'parasite': '寄生虫感染',
    };
    
    if (diseaseType && diseaseLabels[diseaseType]) {
      const isMild = severity === 'mild';
      return {
        bg: isMild ? 'bg-yellow-50' : severity === 'moderate' ? 'bg-orange-50' : 'bg-red-50',
        border: isMild ? 'border-yellow-200' : severity === 'moderate' ? 'border-orange-200' : 'border-red-200',
        icon: <AlertCircle className="w-6 h-6 text-orange-500" />,
        text: isMild ? 'text-yellow-700' : severity === 'moderate' ? 'text-orange-700' : 'text-red-700',
        label: diseaseLabels[diseaseType],
      };
    }
    
    switch (severity) {
      case 'mild':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: <Info className="w-6 h-6 text-yellow-500" />,
          text: 'text-yellow-700',
          label: '轻度异常',
        };
      case 'moderate':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: <AlertCircle className="w-6 h-6 text-orange-500" />,
          text: 'text-orange-700',
          label: '中度异常',
        };
      case 'severe':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: <AlertCircle className="w-6 h-6 text-red-500" />,
          text: 'text-red-700',
          label: '严重需就医',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: <Info className="w-6 h-6 text-gray-500" />,
          text: 'text-gray-700',
          label: '未知',
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">健康分析</h1>
          {!selectedPet && (
            <p className="text-orange-500 mt-1 font-medium">
              ⚠️ 请先在顶部选择一只宠物
            </p>
          )}
          {selectedPet && (
            <p className="text-gray-500 mt-1">
              为 {selectedPet.name} 进行健康分析
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            🤖 智谱AI已接入
          </span>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <History className="w-5 h-5" />
            分析记录
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">分析记录</h3>
            <span className="text-xs text-gray-400">{state.healthAnalyses.length} 条记录</span>
          </div>
          {state.healthAnalyses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <History className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无分析记录</p>
              <p className="text-sm text-gray-400 mt-1">上传图片开始分析后，记录会显示在这里</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {state.healthAnalyses.slice().reverse().map((analysis) => {
                const pet = state.pets.find((p) => p.id === analysis.petId);
                const config = getSeverityConfig(analysis.result.severity, (analysis.result as any).diseaseType);
                const typeLabel = analysisTypes.find((t) => t.id === analysis.analysisType)?.label || '其他';
                return (
                  <div key={analysis.id} className="flex items-start gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <img
                      src={analysis.imageUrl}
                      alt="分析图片"
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{pet?.name || '未知宠物'}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{typeLabel}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {analysis.result.description.substring(0, 80)}...
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(analysis.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Analysis Type Selection */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">选择分析类型</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {analysisTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedType(type.id as AnalysisType);
                resetAnalysis();
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedType === type.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-3xl mb-2 block">{type.emoji}</span>
              <span className="text-sm font-medium text-gray-800">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Image Upload */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">上传图片</h3>
        
        {!image ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">点击或拖拽上传图片</p>
            <p className="text-sm text-gray-400">支持 JPG、PNG 格式</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative">
            <img
              src={image}
              alt="上传图片"
              className="w-full max-h-96 object-contain rounded-2xl bg-gray-100"
            />
            <button
              onClick={resetAnalysis}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white shadow-lg"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}

        {image && !result && (
          <button
            onClick={runAIAnalysis}
            disabled={analyzing}
            className="w-full mt-4 py-4 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI 智谱分析中...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                开始 AI 分析
              </>
            )}
          </button>
        )}

        {/* 错误提示 */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{errorMessage}</span>
            <button onClick={clearError} className="ml-auto p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Analysis Result */}
      {result && (
        <div className={`rounded-2xl border-2 p-6 animate-fadeIn ${getSeverityConfig(result.severity, result.diseaseType).bg} ${getSeverityConfig(result.severity, result.diseaseType).border}`}>
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white`}>
              {getSeverityConfig(result.severity, result.diseaseType).icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-lg font-bold ${getSeverityConfig(result.severity, result.diseaseType).text}`}>
                  {getSeverityConfig(result.severity, result.diseaseType).label}
                </span>
                {result.needsImmediateCare && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                    需立即就医
                  </span>
                )}
              </div>
              <p className="text-gray-600 whitespace-pre-wrap">{result.description}</p>
            </div>
          </div>

          {/* 用药建议 */}
          {result.medication && result.medication.length > 0 && (
            <div className="bg-white/50 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                💊 建议用药
              </h4>
              <ul className="space-y-2">
                {result.medication.map((med, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    {med}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 护理建议 */}
          <div className="bg-white/50 rounded-xl p-4">
            <h4 className="font-semibold text-gray-800 mb-3">护理建议</h4>
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Pet Context */}
          {selectedPet && (
            <div className="mt-4 p-4 bg-white/50 rounded-xl">
              <h4 className="font-semibold text-gray-800 mb-2">结合 {selectedPet.name} 的档案分析</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPet.allergies && selectedPet.allergies.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
                    过敏：{Array.isArray(selectedPet.allergies) ? selectedPet.allergies.join('、') : selectedPet.allergies}
                  </span>
                )}
                <span className="text-sm text-gray-600">
                  品种：{selectedPet.breed}
                </span>
                <span className="text-sm text-gray-600">
                  年龄：{selectedPet.age}
                </span>
              </div>
            </div>
          )}

          {/* Save Status */}
          {savedToRecord && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">已自动保存到健康记录</span>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200/50 flex gap-3">
            <button
              onClick={runAIAnalysis}
              className="flex-1 py-2 rounded-xl bg-white text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              重新分析
            </button>
            <button
              onClick={resetAnalysis}
              className="flex-1 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              上传新图片
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6">
        <h4 className="font-semibold text-blue-800 mb-2">拍照小贴士</h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• 确保光线充足，避免阴影遮挡</li>
          <li>• 拍摄时保持稳定，图片清晰</li>
          <li>• 尽量拍摄问题区域的全貌</li>
          <li>• 如有分泌物，可一并拍摄</li>
          <li className="mt-2 text-blue-600">🤖 AI分析由智谱GLM-4驱动</li>
        </ul>
      </div>
    </div>
  );
}
