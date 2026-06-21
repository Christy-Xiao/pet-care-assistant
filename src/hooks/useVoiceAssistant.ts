/**
 * useVoiceAssistant - 语音助手 Hook v2 (复合意图版)
 *
 * 完整流程: 按住录音 → 语音转文字(智谱ASR) → LLM意图提取(v2多意图) → 自动串行执行所有操作
 *
 * 使用方式:
 * const { startRecording, stopRecording, state, result, confirmAction, reset, executionResults } = useVoiceAssistant();
 */

import { useState, useRef, useCallback } from 'react';
import { useApp } from '@/store/AppContext';

// 录音状态
export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'extracting' | 'ready' | 'executing';

// 单个意图类型
export interface VoiceIntent {
  intent: string;
  confidence: number;
  data: Record<string, any>;
}

// 提取结果（v2 复合意图）
export interface VoiceExtraction {
  intents: VoiceIntent[];
  summary?: string;
}

// 单条执行结果
export interface IntentExecutionResult {
  intent: string;
  success: boolean;
  message: string;
  data?: any;
}

// 最终结果
export interface VoiceResult {
  originalText: string;
  extraction: VoiceExtraction;
}

// 音频配置
const AUDIO_CONFIG = {
  sampleRate: 16000,
  channelCount: 1,
  maxDuration: 30, // 最长30秒
};

export function useVoiceAssistant() {
  const [state, setState] = useState<VoiceState>('idle');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [executionResults, setExecutionResults] = useState<IntentExecutionResult[]>([]);
  const [currentExecutingIndex, setCurrentExecutingIndex] = useState<number>(-1);

  const { state: appState, dispatch } = useApp();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // AudioContext 直录相关
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);

  // 开始录音（AudioContext直录PCM → WAV）
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      setTranscript('');

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_CONFIG.sampleRate,
          channelCount: AUDIO_CONFIG.channelCount,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];
      pcmChunksRef.current = [];

      // 用 AudioContext 直录原始 PCM 数据
      const audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.sampleRate });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNode 捕获原始音频数据
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (audioContext.state === 'closed') return;
        const inputData = e.inputBuffer.getChannelData(0);
        // 复制一份，因为 inputData 会被复用
        pcmChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setState('recording');

      // 计时器
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
        if (elapsed >= AUDIO_CONFIG.maxDuration) {
          stopRecording();
        }
      }, 1000);

    } catch (err: any) {
      console.error('[语音] 麦克风访问失败:', err);
      setError(err.message || '无法访问麦克风，请检查浏览器权限设置');
      setState('idle');
    }
  }, []);

  // 停止录音并处理后续流程
  const stopRecording = useCallback(async () => {
    return new Promise<void>(async (resolve) => {
      if (!audioContextRef.current || state !== 'recording') {
        resolve();
        return;
      }

      // 清除计时器
      if (timerRef.current) clearInterval(timerRef.current);

      // 断开并关闭音频链
      try {
        if (processorRef.current) {
          processorRef.current.disconnect();
          processorRef.current = null;
        }
        if (sourceRef.current) {
          sourceRef.current.disconnect();
          sourceRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      } catch (e) { /* ignore */ }

      // 从 PCM chunks 构建 WAV
      try {
        const pcmData = mergePcmChunks(pcmChunksRef.current);
        const wavBlob = createWavFromPCM(pcmData, AUDIO_CONFIG.sampleRate);

        console.log(`[语音] 录制完成: ${(wavBlob.size / 1024).toFixed(1)}KB, PCM采样数: ${pcmData.length}`);

        // Step 1: 语音转文字
        setState('transcribing');
        const text = await transcribeAudio(wavBlob);
        if (!text) throw new Error('未能识别出语音内容');

        setTranscript(text);
        console.log(`[语音] 转写结果: "${text}"`);

        // Step 2: LLM 意图提取
        setState('extracting');
        const extraction = await extractIntent(text);

        setResult({ originalText: text, extraction });
        setState('ready');

      } catch (err: any) {
        console.error('[语音] 处理失败:', err);
        setError(err.message || '语音处理失败');
        setState('idle');
      } finally {
        resolve();
      }
    });
  }, [state]);

  // 语音转文字（调用后端ASR，已经是WAV格式）
  async function transcribeAudio(wavBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', wavBlob, 'audio.wav');

    const response = await fetch('/api/voice', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.text) {
      throw new Error(data.error || '语音识别失败');
    }

    return data.text;
  }

  // LLM 意图提取（v2 复合意图）
  async function extractIntent(text: string): Promise<VoiceExtraction> {
    const context = {
      pets: appState.pets.map(p => ({ id: p.id, name: p.name, species: p.species, breed: p.breed })),
      selectedPetId: appState.selectedPetId,
    };

    const response = await fetch('/api/voice/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '意图提取失败');
    }

    return data.extraction;
  }

  // 确认执行 — 串行执行所有意图
  const confirmAction = useCallback(async (): Promise<IntentExecutionResult[]> => {
    if (!result || !result.extraction?.intents?.length) return [];

    const intents = result.extraction.intents;
    const results: IntentExecutionResult[] = [];
    
    setState('executing');
    setExecutionResults([]);

    for (let i = 0; i < intents.length; i++) {
      const intentItem = intents[i];
      setCurrentExecutingIndex(i);

      try {
        const message = await executeSingleIntent(intentItem);
        results.push({ intent: intentItem.intent, success: true, message });
        console.log(`[语音] ✅ [${i + 1}/${intents.length}] ${intentItem.intent}: ${message}`);
      } catch (err: any) {
        const errMsg = err.message || '执行失败';
        results.push({ intent: intentItem.intent, success: false, message: errMsg });
        console.error(`[语音] ❌ [${i + 1}/${intents.length}] ${intentItem.intent}: ${errMsg}`);
      }

      // 更新实时结果
      setExecutionResults([...results]);
      
      // 意图之间稍作停顿
      if (i < intents.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setCurrentExecutingIndex(-1);
    setState('ready');
    return results;
  }, [result]);

  // 执行单个意图（分发到对应处理器）
  async function executeSingleIntent(intentItem: VoiceIntent): Promise<string> {
    const { intent, data } = intentItem;

    switch (intent) {
      case 'add_pet':       return handleAddPet(data);
      case 'add_schedule':  return handleAddSchedule(data);
      case 'health_record': return handleHealthRecord(data);
      case 'update_weight': return handleUpdateWeight(data);
      case 'update_info':   return handleUpdateInfo(data);
      case 'query_pets':    return handleQueryPets(data);
      case 'general_question':
        // 不自动操作，返回问题让用户看
        return data.question || data.topic || '已识别到咨询';
      default:
        throw new Error(`未知意图类型: ${intent}`);
    }
  }

  // 处理添加宠物 → 返回消息
  async function handleAddPet(data: Record<string, any>): Promise<string> {
    const petData = {
      id: `pet_${Date.now()}`,
      name: data.name || '未命名宠物',
      species: (data.species === 'cat' ? 'cat' : 'dog') as 'dog' | 'cat',
      breed: data.breed || '',
      dateOfBirth: estimateBirthDate(data.age),
      age: data.age || '',
      weight: 0,
      gender: (data.gender === 'female' ? 'female' : 'male') as 'male' | 'female',
      allergies: [],
      medicalHistory: [],
      notes: `由语音助手创建: ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userId = localStorage.getItem('userId') || undefined;
    const res = await fetch('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...petData, userId }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || '保存宠物信息失败');
    }

    dispatch({ type: 'ADD_PET', payload: petData });
    return `已添加 ${petData.species === 'dog' ? '🐕' : '🐱'}「${petData.name}」`;
  }

  // 处理添加日程 → 返回消息
  async function handleAddSchedule(data: Record<string, any>): Promise<string> {
    // 匹配宠物
    const petName = data.pet_name;
    let petId = appState.selectedPetId;
    
    if (petName && appState.pets.length > 0) {
      const matched = appState.pets.find(p => 
        p.name.toLowerCase() === petName.toLowerCase() ||
        p.name.includes(petName) ||
        petName.includes(p.name)
      );
      petId = matched?.id || appState.selectedPetId || appState.pets[0]?.id;
    }
    if (!petId && appState.pets.length > 0) { petId = appState.pets[0].id; }

    const scheduleData: any = {
      id: `schedule_${Date.now()}`,
      petId,
      title: data.title || data.description || '护理日程',
      description: data.description || data.title || '',
      eventType: mapEventType(data.event_type),
      dueDate: parseTime(data.time),
      status: 'pending' as const,
      priority: mapPriority(data.priority),
      source: 'voice_assistant',
      notificationSent: false,
      createdAt: new Date().toISOString(),
    };

    await fetch('/api/care-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scheduleData),
    }).catch(() => null);

    dispatch({ type: 'ADD_SCHEDULE', payload: scheduleData });
    
    const timeStr = formatTime(scheduleData.dueDate);
    return `已创建日程「${scheduleData.title}」${timeStr}`;
  }

  // 处理健康记录 → 返回消息
  async function handleHealthRecord(data: Record<string, any>): Promise<string> {
    const petName = data.pet_name;
    let petId = appState.selectedPetId;
    
    if (petName && appState.pets.length > 0) {
      const matched = appState.pets.find(p =>
        p.name.toLowerCase() === petName.toLowerCase()
      );
      petId = matched?.id || appState.pets[0]?.id;
    }

    if (!petId && !petName) return '未找到关联的宠物';

    const healthRecord: any = {
      id: `health_${Date.now()}`,
      petId,
      imageUrl: '',
      analysisType: 'other' as const,
      result: {
        severity: mapSeverity(data.severity) || (data.status === 'abnormal' ? 'mild' : 'normal'),
        description: data.notes || data.symptoms?.join(', ') || '',
        recommendations: getRecommendations(data.symptoms, data.severity),
        needsImmediateCare: data.severity === 'severe' || data.status === 'abnormal',
      },
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_HEALTH_ANALYSIS', payload: healthRecord });

    // 异常时创建通知
    if (data.status === 'abnormal' || (data.severity && data.severity !== 'normal')) {
      const notification = {
        id: `notif_${Date.now()}`,
        petId: petId || '',
        petName: petName || '未知宠物',
        title: '健康异常提醒',
        message: `${petName || '宠物'} ${data.notes || data.symptoms?.join('、') || '有健康异常，请关注'}`,
        type: 'alert' as const,
        read: false,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      return `已记录${petName}的健康异常：${data.symptoms?.join('、') || data.notes || ''} ⚠️`;
    }

    return `已记录${petName || ''}健康状况：一切正常 ✅`;
  }

  // 更新体重
  async function handleUpdateWeight(data: Record<string, any>): Promise<string> {
    const petName = data.pet_name;
    let weightKg = data.weight;
    
    // 单位转换：斤 → kg
    if (data.weight_unit === 'jin' && weightKg) {
      weightKg = weightKg / 2;
    }
    
    if (!weightKg) throw new Error('未能识别出体重数值');

    // 找到对应宠物更新
    const pet = petName ? appState.pets.find(p => p.name === petName) : null;
    if (pet) {
      dispatch({
        type: 'UPDATE_PET',
        payload: { ...pet, weight: weightKg, updatedAt: new Date().toISOString() },
      });
    }

    return `已记录 ${petName || ''}${weightKg.toFixed(1)}kg ⚖️`;
  }

  // 更新宠物信息
  async function handleUpdateInfo(data: Record<string, any>): Promise<string> {
    const petName = data.pet_name;
    if (!petName) throw new Error('不知道要更新哪只宠物的信息');

    const fieldLabels: Record<string, string> = {
      name: '名字', age: '年龄', breed: '品种', gender: '性别',
    };

    const pet = appState.pets.find(p => p.name === petName);
    if (pet) {
      const updates: any = { ...pet, [data.field]: data.new_value, updatedAt: new Date().toISOString() };
      if (data.field === 'gender') updates[data.field] = data.new_value;
      dispatch({ type: 'UPDATE_PET', payload: updates });
    }

    return `已更新${petName}的${fieldLabels[data.field] || data.field}为"${data.new_value}" 📝`;
  }

  // 查询宠物信息
  async function handleQueryPets(data: Record<string, any>): Promise<string> {
    if (data.query_type === 'count') {
      return `你一共有 ${appState.pets.length} 只宠物`;
    }
    if (data.pet_name) {
      const pet = appState.pets.find(p => p.name === data.pet_name);
      if (pet) {
        return `${pet.name}: ${pet.species === 'dog' ? '狗' : '猫'}, ${pet.breed || '未知品种'}, ${pet.age || '?岁'}, ${pet.weight ? pet.weight + 'kg' : '体重未知'}`;
      }
      return `没找到叫${data.pet_name}的宠物哦`;
    }
    // 列表模式
    const list = appState.pets.map(p =>
      `${p.name}(${p.species === 'dog' ? '🐕' : '🐱'})`
    ).join('、');
    return list || '还没有添加任何宠物';
  }

  // 重置状态
  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setTranscript('');
    setError(null);
    setRecordingTime(0);
    setExecutionResults([]);
    setCurrentExecutingIndex(-1);
  }, []);

  // 取消当前操作
  const cancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // 清理 AudioContext
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    reset();
  }, [state, reset]);

  return {
    state,                  // idle | recording | transcribing | extracting | ready | executing
    result,                 // 提取结果（含 intents[] 数组）
    transcript,             // 转写的文字
    error,                  // 错误信息
    recordingTime,          // 录音时长(秒)
    executionResults,       // 每条意图的执行结果
    currentExecutingIndex,  // 当前正在执行第几个意图 (-1=未开始/已完成)
    startRecording,
    stopRecording,
    confirmAction,          // 确认执行所有意图（串行）
    reset,
    cancel,
  };
}

// ==================== 辅助函数 ====================

function estimateBirthDate(ageStr?: string): string {
  if (!ageStr) return '';
  
  const match = ageStr.match(/(\d+)\s*(岁|个月|月)/i);
  if (!match) return '';

  const num = parseInt(match[1]);
  const unit = match[2];
  
  const now = new Date();
  if (unit === '岁' || unit === '岁') {
    now.setFullYear(now.getFullYear() - num);
  } else {
    now.setMonth(now.getMonth() - num);
  }
  
  return now.toISOString().split('T')[0];
}

function formatTime(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
    
    if (isToday) return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    if (isTomorrow) return `明天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return ''; }
}

function parseTime(timeStr?: string): string {
  if (!timeStr) {
    // 默认明天上午10点
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString();
  }

  // 尝试解析 ISO 格式
  const isoMatch = timeStr.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    const base = isoMatch[0];
    const hourMatch = timeStr.match(/(\d{1,2})[:：时点](\d{0,2})?/);
    const h = hourMatch ? parseInt(hourMatch[1]) : 14;
    const m = hourMatch?.[2] ? parseInt(hourMatch[2]) : 0;
    return `${base}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }

  // 相对时间解析
  const now = new Date();
  
  if (timeStr.includes('后天')) {
    now.setDate(now.getDate() + 3);
  } else if (timeStr.includes('明天') || timeStr.includes('次日')) {
    now.setDate(now.getDate() + 1);
  } else if (timeStr.includes('今天')) {
    // 保持今天
  } else if (timeStr.includes('下周')) {
    now.setDate(now.getDate() + 7);
  }

  // 解析时间段
  const hourMatch = timeStr.match(/(上午|下午|晚上|中午)?\s*(\d{1,2})\s*([:：点])?\s*(\d{0,2})?/);
  if (hourMatch) {
    let h = parseInt(hourMatch[2]);
    const period = hourMatch[1];
    if (period === '下午' || period === '晚上' || period === '中午') {
      if (h < 12) h += 12;
    }
    if (h > 23) h = 23;
    now.setHours(h, hourMatch[4] ? parseInt(hourMatch[4]) : 0, 0, 0);
  } else {
    now.setHours(14, 0, 0, 0); // 默认下午2点
  }

  return now.toISOString();
}

function mapEventType(type?: string): string {
  const map: Record<string, string> = {
    '疫苗': 'vaccination', 'vaccination': 'vaccination', '打疫苗': 'vaccination',
    '驱虫': 'parasite_prevention', 'parasite_prevention': 'parasite_prevention',
    '体检': 'wellness_exam', 'wellness_exam': 'wellness_exam', '检查': 'wellness_exam',
    '口腔': 'dental_care', 'dental_care': 'dental_care', '刷牙': 'dental_care',
    '洗澡': 'grooming', '美容': 'grooming', 'grooming': 'grooming',
  };
  return map[type || ''] || 'other';
}

function mapPriority(priority?: string): string {
  if (priority === 'high' || priority === '高') return 'high';
  if (priority === 'low' || priority === '低') return 'low';
  return 'medium';
}

function mapSeverity(severity?: string): string {
  const validSeverities = ['normal', 'mild', 'moderate', 'severe'];
  if (severity && validSeverities.includes(severity)) return severity;
  return 'normal';
}

function getRecommendations(symptoms?: string[], severity?: string): string[] {
  if (severity === 'severe') {
    return ['建议立即就医', '症状较为严重，不要自行处理'];
  }
  if (severity === 'moderate' || severity === 'mild') {
    return ['观察24小时', '如症状加重及时就医', '保持环境清洁'];
  }
  return ['继续保持良好的生活习惯'];
}

// ==================== 音频处理 ====================

/**
 * 合并所有PCM chunks为连续的Float32Array
 */
function mergePcmChunks(chunks: Float32Array[]): Float32Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

/**
 * 从原始 PCM 数据创建 WAV 文件 Blob
 */
function createWavFromPCM(pcmData: Float32Array, sampleRate: number): Blob {
  const channels = 1;
  const bitsPerSample = 16;
  const dataLength = pcmData.length * (bitsPerSample / 8);
  
  // WAV文件头 + 数据
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // subchunk1 size
  view.setUint16(20, 1, true);             // audio format (PCM)
  view.setUint16(22, channels, true);      // num channels
  view.setUint32(24, sampleRate, true);     // sample rate
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true); // byte rate
  view.setUint16(32, channels * (bitsPerSample / 8), true);             // block align
  view.setUint16(34, bitsPerSample, true);   // bits per sample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // 写入PCM数据（float32 → int16）
  let offset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
