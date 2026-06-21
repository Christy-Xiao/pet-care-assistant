'use client';

import { createContext, useContext, useReducer, useEffect, useState, useCallback, ReactNode } from 'react';
import { Pet, CareSchedule, HealthAnalysis, Notification, ParkLocation, Weather } from '@/types';
import { getApplicableSchedules, calculateNextDueDate } from '@/config/care-schedules';

// State Types
interface AppState {
  pets: Pet[];
  selectedPetId: string | null;
  careSchedules: CareSchedule[];
  healthAnalyses: HealthAnalysis[];
  notifications: Notification[];
  parks: ParkLocation[];
  weather: Weather | null;
  isLoading: boolean;
}

// Action Types
type Action =
  | { type: 'SET_PETS'; payload: Pet[] }
  | { type: 'ADD_PET'; payload: Pet }
  | { type: 'UPDATE_PET'; payload: Pet }
  | { type: 'DELETE_PET'; payload: string }
  | { type: 'SELECT_PET'; payload: string | null }
  | { type: 'SET_SCHEDULES'; payload: CareSchedule[] }
  | { type: 'ADD_SCHEDULE'; payload: CareSchedule }
  | { type: 'UPDATE_SCHEDULE'; payload: CareSchedule }
  | { type: 'COMPLETE_SCHEDULE'; payload: string }
  | { type: 'ADD_HEALTH_ANALYSIS'; payload: HealthAnalysis }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'SET_PARKS'; payload: ParkLocation[] }
  | { type: 'SET_WEATHER'; payload: Weather }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial State
const initialState: AppState = {
  pets: [],
  selectedPetId: null,
  careSchedules: [],
  healthAnalyses: [],
  notifications: [],
  parks: [],
  weather: null,
  isLoading: true,
};

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PETS':
      return { ...state, pets: action.payload };
    case 'ADD_PET':
      return { ...state, pets: [...state.pets, action.payload] };
    case 'UPDATE_PET':
      return {
        ...state,
        pets: state.pets.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };
    case 'DELETE_PET':
      return {
        ...state,
        pets: state.pets.filter((p) => p.id !== action.payload),
        selectedPetId: state.selectedPetId === action.payload ? null : state.selectedPetId,
      };
    case 'SELECT_PET':
      return { ...state, selectedPetId: action.payload };
    case 'SET_SCHEDULES':
      return { ...state, careSchedules: action.payload };
    case 'ADD_SCHEDULE':
      return { ...state, careSchedules: [...state.careSchedules, action.payload] };
    case 'UPDATE_SCHEDULE':
      return {
        ...state,
        careSchedules: state.careSchedules.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case 'COMPLETE_SCHEDULE':
      return {
        ...state,
        careSchedules: state.careSchedules.map((s) =>
          s.id === action.payload
            ? { ...s, status: 'completed' as const, completedDate: new Date().toISOString() }
            : s
        ),
      };
    case 'ADD_HEALTH_ANALYSIS':
      return { ...state, healthAnalyses: [...state.healthAnalyses, action.payload] };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case 'SET_PARKS':
      return { ...state, parks: action.payload };
    case 'SET_WEATHER':
      return { ...state, weather: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  selectedPet: Pet | null;
  addPet: (pet: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePet: (pet: Pet) => void;
  deletePet: (id: string) => void;
  selectPet: (id: string | null) => void;
  completeSchedule: (id: string) => void;
  generateSchedulesForPet: (pet: Pet) => void;
  addHealthAnalysis: (analysis: Omit<HealthAnalysis, 'id' | 'createdAt'>) => void;
  checkDueNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 数据加载状态追踪
  const [dataLoaded, setDataLoaded] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);

  // 从API加载数据
  const loadData = useCallback(async () => {
    try {
      // 尝试从API获取数据
      try {
        const [petsRes, schedulesRes, recordsRes] = await Promise.all([
          fetch('/api/pets'),
          fetch('/api/schedules'),
          fetch('/api/health-records'),
        ]);
        
        if (petsRes.ok) {
          const pets = await petsRes.json();
          // 转换字段名：snake_case -> camelCase
          const normalizedPets = (Array.isArray(pets) ? pets : []).map((p: any) => ({
            id: p.id,
            name: p.name,
            species: p.species,
            breed: p.breed || '',
            dateOfBirth: p.date_of_birth || p.dateOfBirth || '',
            age: p.age || '',
            weight: p.weight || 0,
            gender: p.gender || 'unknown',
            avatar: p.avatar || '',
            allergies: p.allergies ? (typeof p.allergies === 'string' ? p.allergies.split(',').filter(Boolean) : p.allergies) : [],
            medicalHistory: p.medical_history || p.medicalHistory || [],
            notes: p.notes || '',
            createdAt: p.created_at || p.createdAt || new Date().toISOString(),
            updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
          }));
          dispatch({ type: 'SET_PETS', payload: normalizedPets });
          setApiAvailable(true);
        }
        if (schedulesRes.ok) {
          const schedules = await schedulesRes.json();
          // 转换字段名：snake_case -> camelCase
          const normalizedSchedules = (Array.isArray(schedules) ? schedules : []).map((s: any) => ({
            id: s.id,
            petId: s.pet_id,
            title: s.title,
            description: s.description,
            eventType: s.event_type,
            dueDate: s.due_date,
            status: s.status || 'pending',
            priority: s.priority,
            recurrence: s.recurrence,
            source: s.source,
            completedDate: s.completed_date,
            notificationSent: s.notification_sent || false,
          }));
          dispatch({ type: 'SET_SCHEDULES', payload: normalizedSchedules });
        }
        if (recordsRes.ok) {
          const records = await recordsRes.json();
          if (records.length > 0) {
            records.forEach((record: HealthAnalysis) => {
              dispatch({ type: 'ADD_HEALTH_ANALYSIS', payload: record });
            });
          }
        }
      } catch {
        // API不可用时降级到localStorage
        console.log('API 不可用，降级到 localStorage');
        const pets = localStorage.getItem('pets');
        const schedules = localStorage.getItem('schedules');
        const analyses = localStorage.getItem('healthAnalyses');
        const notifications = localStorage.getItem('notifications');

        if (pets) dispatch({ type: 'SET_PETS', payload: JSON.parse(pets) });
        if (schedules) dispatch({ type: 'SET_SCHEDULES', payload: JSON.parse(schedules) });
        if (analyses) dispatch({ type: 'ADD_HEALTH_ANALYSIS', payload: JSON.parse(analyses) });
        if (notifications) dispatch({ type: 'SET_NOTIFICATIONS', payload: JSON.parse(notifications) });
      }
      dispatch({ type: 'SET_LOADING', payload: false });
      setDataLoaded(true);
    } catch (error) {
      console.error('Failed to load data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      setDataLoaded(true);
    }
  }, []);

  // 监听数据刷新事件（聊天创建日程后触发）
  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('appDataRefresh', handleRefresh);
    return () => window.removeEventListener('appDataRefresh', handleRefresh);
  }, [loadData]);

  // 初始化时加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 保存数据到localStorage（备用）和API
  useEffect(() => {
    if (!dataLoaded || state.isLoading) return;
    
    // 同时保存到 localStorage（作为备用）
    localStorage.setItem('pets', JSON.stringify(state.pets));
    localStorage.setItem('schedules', JSON.stringify(state.careSchedules));
    localStorage.setItem('healthAnalyses', JSON.stringify(state.healthAnalyses));
    localStorage.setItem('notifications', JSON.stringify(state.notifications));
  }, [state.pets, state.careSchedules, state.healthAnalyses, state.notifications, state.isLoading, dataLoaded]);

  // 自动生成提醒通知
  const checkDueNotifications = () => {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    state.careSchedules
      .filter((schedule) => {
        const dueDate = new Date(schedule.dueDate);
        return (
          schedule.status === 'pending' &&
          dueDate >= now &&
          dueDate <= threeDaysLater &&
          !schedule.notificationSent
        );
      })
      .forEach((schedule) => {
        const pet = state.pets.find((p) => p.id === schedule.petId);
        if (pet) {
          const daysUntil = Math.ceil((new Date(schedule.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const timeDesc = daysUntil === 0 ? '今天' : daysUntil === 1 ? '明天' : `${daysUntil}天后`;
          
          const notification: Notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            petId: pet.id,
            petName: pet.name,
            title: `护理提醒：${schedule.title}`,
            message: `${pet.name}的${schedule.title}是${timeDesc}哦，别忘了带它去完成！`,
            type: 'reminder',
            read: false,
            createdAt: new Date().toISOString(),
          };
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
          dispatch({
            type: 'UPDATE_SCHEDULE',
            payload: { ...schedule, notificationSent: true },
          });
        }
      });
  };

  // ===== 发送真正的 PWA 系统级推送通知 =====
  const sendPWANotification = useCallback(async (title: string, body: string) => {
    // 同时做两件事：1. 应用内通知 + 2. 真正的 PWA Push
    try {
      // 1. 应用内通知（fallback）
      const notification: Notification = {
        id: `notif-push-${Date.now()}`,
        petId: '', petName: '',
        title,
        message: body,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

      // 2. 发送 PWA 推送（通过后端 web-push 发到所有订阅设备）
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          icon: '/icons/icon-192x192.png',
          url: '/',
          tag: `weather-${new Date().toDateString()}`,
          broadcast: true,  // 广播给所有订阅用户
        }),
      }).catch((err) => console.log('[AppContext] PWA推送发送失败(可能无VAPID配置或无订阅):', err));
    } catch {}
  }, [dispatch]);

  // 检查天气并生成AI智能提醒 → 通过 PWA 推送
  const checkWeatherNotifications = async () => {
    try {
      const weatherStr = localStorage.getItem('weatherData');
      if (!weatherStr) return;
      
      const weather = JSON.parse(weatherStr);
      const weatherCode = parseInt(weather?.current?.icon) || 0;
      const temp = parseInt(weather?.current?.temp) || 25;
      const feelsLike = parseInt(weather?.current?.feelsLike) || temp;
      const humidity = parseInt(weather?.current?.humidity) || 50;
      const windSpeed = parseFloat(weather?.current?.windSpeed) || 5;
      
      const lastWeatherCheck = localStorage.getItem('lastWeatherNotification');
      const today = new Date().toDateString();
      
      // 每天只提醒一次
      if (lastWeatherCheck === today) return;

      // 调用 AI 天气建议 API 获取萌系提示
      let pushTitle = '';
      let pushBody = '';

      try {
        const params = new URLSearchParams({
          temp: String(temp), humidity: String(humidity),
          weatherCode: String(weatherCode), windSpeed: String(windSpeed),
          feelsLike: String(feelsLike),
        });
        const res = await fetch(`/api/weather/tips?${params}`);
        const json = await res.json();

        if (json.success && json.data) {
          const tips = json.data;
          pushTitle = tips.title;
          pushBody = tips.walkAdvice.suitable
            ? `${tips.summary} 🕐 建议${tips.walkAdvice.duration}·${tips.walkAdvice.bestTime}`
            : `${tips.summary} ${tips.careTips[0]?.tip || ''}`;
        }
      } catch (aiErr) {
        console.log('[AppContext] AI天气建议不可用，使用规则降级:', aiErr);
      }

      // 如果 AI 没返回结果，走规则引擎
      if (!pushTitle) {
        const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);
        const isStorm = [95, 96, 99].includes(weatherCode);

        if (isStorm) {
          pushTitle = '⛈️ 雷暴预警！今天宅家陪主子~';
          pushBody = '打雷啦！毛孩子可能会害怕，在家玩点室内游戏安抚一下吧~ (｡•̀ᴗ-)✧';
        } else if (isRainy) {
          pushTitle = '🌧️ 今天有雨，记得带伞哦';
          pushBody = '出门给毛孩子穿件雨衣吧！如果雨大的话就在家玩游戏也很好玩~ ☔';
        } else if (temp > 35) {
          pushTitle = '🔥 好热好热！主子也要避暑~';
          pushBody = '柏油路面可能烫爪子！选择清晨或傍晚遛弯，时间控制在10-15分钟哦~ (๑´ڡ`๑)';
        } else if (temp < 5) {
          pushTitle = '❄️ 冷冷冷！抱紧你的小毛球';
          pushBody = '出门记得给毛孩子穿衣服保暖，选中午暖和的时候出去哦~ 🫶';
        } else {
          // 普通天气也推一条轻量提示
          pushTitle = '☀️ 今日养宠小贴士';
          pushBody = `${temp}°C | 湿度${humidity}% | ${windSpeed}m/s风 — 点击查看详细护理建议~`;
        }
      }

      // 统一通过 PWA 推送发出
      if (pushTitle) {
        await sendPWANotification(pushTitle, pushBody);
        localStorage.setItem('lastWeatherNotification', today);
        console.log(`[AppContext] 天气PWA推送: ${pushTitle}`);
      }
    } catch {}
  };

  // 检查到期通知
  useEffect(() => {
    if (!state.isLoading && state.pets.length > 0) {
      checkDueNotifications();
      // 检查AI天气提醒（异步）
      checkWeatherNotifications();
    }
  }, [state.isLoading, state.pets.length]);

  // 自动生成宠物护理日程
  const generateSchedulesForPet = (pet: Pet) => {
    // 保护：dateOfBirth 可能为空
    if (!pet.dateOfBirth) {
      console.log('⚠️ [AppContext] 宠物缺少 dateOfBirth，跳过日程生成');
      return;
    }
    
    const birthDate = new Date(pet.dateOfBirth);
    // 验证日期有效性
    if (isNaN(birthDate.getTime())) {
      console.log('⚠️ [AppContext] 无效的 dateOfBirth:', pet.dateOfBirth, '，跳过日程生成');
      return;
    }

    const existingSchedules = state.careSchedules.filter((s) => s.petId === pet.id);
    const applicableTemplates = getApplicableSchedules(pet.species, 
      Math.floor((new Date().getTime() - birthDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
    );

    applicableTemplates.forEach((template) => {
      // 检查是否已有该模板的日程
      const hasSchedule = existingSchedules.some((s) => s.id.startsWith(template.id));
      if (!hasSchedule) {
        try {
          const nextDue = calculateNextDueDate(template, pet.dateOfBirth);
          if (!nextDue || isNaN(nextDue.getTime())) {
            console.log('⚠️ [AppContext] calculateNextDueDate 返回无效日期，跳过模板:', template.name);
            return;
          }
          const schedule: CareSchedule = {
            id: `${template.id}-${pet.id}-${Date.now()}`,
            petId: pet.id,
            title: template.name,
            description: template.description,
            eventType: template.event_type as CareSchedule['eventType'],
            dueDate: nextDue.toISOString(),
            status: 'pending',
            priority: template.priority,
            recurrence: template.recurrence,
            source: template.source,
          };
          dispatch({ type: 'ADD_SCHEDULE', payload: schedule });
        } catch (err) {
          console.error('⚠️ [AppContext] 生成日程失败:', err, '模板:', template.name);
        }
      }
    });
  };

  // 获取选中的宠物
  const selectedPet = state.pets.find((p) => p.id === state.selectedPetId) || null;

  // 添加宠物 - 调用 API 保存到数据库
  const addPet = async (petData: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = `pet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🚀 [AppContext] 开始添加宠物:', petData);
    
    try {
      const response = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData),
      });
      
      console.log('📡 [AppContext] API 响应状态:', response.status);
      
      if (response.ok) {
        const newPet = await response.json();
        console.log('✅ [AppContext] 添加成功:', newPet);
        dispatch({ type: 'ADD_PET', payload: newPet });
        generateSchedulesForPet(newPet);
        if (!state.selectedPetId) {
          dispatch({ type: 'SELECT_PET', payload: newPet.id });
        }
        return newPet;
      } else {
        // API 失败时降级到本地存储
        console.log('❌ [AppContext] API 保存失败，降级到本地存储');
        const pet: Pet = {
          ...petData,
          id: tempId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_PET', payload: pet });
        generateSchedulesForPet(pet);
        if (!state.selectedPetId) {
          dispatch({ type: 'SELECT_PET', payload: pet.id });
        }
        return pet;
      }
    } catch (error) {
      // 网络错误时降级到本地存储
      console.log('❌ [AppContext] API 调用失败，降级到本地存储', error);
      const pet: Pet = {
        ...petData,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_PET', payload: pet });
      generateSchedulesForPet(pet);
      if (!state.selectedPetId) {
        dispatch({ type: 'SELECT_PET', payload: pet.id });
      }
      return pet;
    }
  };

  // 更新宠物 - 调用 API 保存到数据库
  const updatePet = async (pet: Pet) => {
    try {
      const response = await fetch('/api/pets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pet),
      });
      
      if (response.ok) {
        const updatedPetFromDb = await response.json();
        // 将数据库格式(snake_case)转换为前端格式(camelCase)
        const updatedPet: Pet = {
          id: updatedPetFromDb.id,
          name: updatedPetFromDb.name,
          species: updatedPetFromDb.species,
          breed: updatedPetFromDb.breed || '',
          dateOfBirth: updatedPetFromDb.date_of_birth || updatedPetFromDb.dateOfBirth || '',
          age: updatedPetFromDb.age || '',
          weight: updatedPetFromDb.weight || 0,
          gender: updatedPetFromDb.gender || 'unknown',
          avatar: updatedPetFromDb.avatar || '',
          allergies: updatedPetFromDb.allergies 
            ? (typeof updatedPetFromDb.allergies === 'string' 
              ? updatedPetFromDb.allergies.split(',').filter(Boolean) 
              : updatedPetFromDb.allergies)
            : [],
          medicalHistory: updatedPetFromDb.medical_history || updatedPetFromDb.medicalHistory || [],
          notes: updatedPetFromDb.notes || '',
          createdAt: updatedPetFromDb.created_at || updatedPetFromDb.createdAt || new Date().toISOString(),
          updatedAt: updatedPetFromDb.updated_at || updatedPetFromDb.updatedAt || new Date().toISOString(),
        };
        dispatch({ type: 'UPDATE_PET', payload: updatedPet });
      } else {
        // API 失败时降级到本地
        console.log('API 更新失败，降级到本地存储');
        dispatch({ type: 'UPDATE_PET', payload: { ...pet, updatedAt: new Date().toISOString() } });
      }
    } catch (error) {
      // 网络错误时降级到本地
      console.log('API 调用失败，降级到本地存储', error);
      dispatch({ type: 'UPDATE_PET', payload: { ...pet, updatedAt: new Date().toISOString() } });
    }
  };

  // 删除宠物 - 调用 API 保存到数据库
  const deletePet = async (id: string) => {
    try {
      const response = await fetch(`/api/pets?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        dispatch({ type: 'DELETE_PET', payload: id });
      } else {
        // API 失败时降级到本地
        console.log('API 删除失败，降级到本地存储');
        dispatch({ type: 'DELETE_PET', payload: id });
      }
    } catch (error) {
      // 网络错误时降级到本地
      console.log('API 调用失败，降级到本地存储', error);
      dispatch({ type: 'DELETE_PET', payload: id });
    }
  };

  // 选择宠物
  const selectPet = (id: string | null) => {
    dispatch({ type: 'SELECT_PET', payload: id });
  };

  // 完成日程 - 调用API更新数据库
  const completeSchedule = async (id: string) => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'completed',
          completed_date: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        dispatch({ type: 'COMPLETE_SCHEDULE', payload: id });
      } else {
        // API失败时降级到本地
        dispatch({ type: 'COMPLETE_SCHEDULE', payload: id });
      }
    } catch (error) {
      console.error('完成日程失败:', error);
      // 网络错误时降级到本地
      dispatch({ type: 'COMPLETE_SCHEDULE', payload: id });
    }
  };

  // 添加健康分析 - 保存到数据库
  const addHealthAnalysis = async (analysisData: Omit<HealthAnalysis, 'id' | 'createdAt'>) => {
    const analysis: HealthAnalysis = {
      ...analysisData,
      id: `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    // 先添加到本地状态
    dispatch({ type: 'ADD_HEALTH_ANALYSIS', payload: analysis });
    
    // 同时保存到数据库
    try {
      // 获取分析类型的中文名
      const typeLabels: Record<string, string> = {
        'feces': '粪便',
        'skin': '皮肤',
        'eye': '眼睛',
        'ear': '耳朵',
        'other': '其他'
      };
      
      // 获取疾病类型的中文名
      const diseaseLabels: Record<string, string> = {
        'eczema': '湿疹',
        'bacterial': '细菌感染',
        'fungal': '真菌感染',
        'allergy': '过敏反应',
        'parasite': '寄生虫感染',
        'normal': '皮肤健康'
      };
      
      // 构建标题（用类型断言处理扩展属性）
      const resultAny = analysisData.result as Record<string, any>;
      const diseaseLabel = resultAny.diseaseType ? diseaseLabels[resultAny.diseaseType] : '';
      const typeLabel = typeLabels[analysisData.analysisType] || '其他';
      const title = diseaseLabel ? `${typeLabel}分析-${diseaseLabel}` : `${typeLabel}分析`;
      
      // 保存到健康记录表
      const response = await fetch('/api/health-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: analysisData.petId,
          type: analysisData.analysisType,
          title: title,
          description: analysisData.result.description,
          image_url: analysisData.imageUrl,
          result: analysisData.result,
        }),
      });
      
      if (response.ok) {
        const savedRecord = await response.json();
        console.log('✅ 健康分析已保存到数据库:', savedRecord);
        
        // 如果检测到皮肤病，自动添加到宠物健康档案
        if (resultAny.diseaseType && resultAny.diseaseType !== 'normal') {
          const pet = state.pets.find((p: any) => p.id === analysisData.petId);
          if (pet) {
            // 构建病史记录
            const medicalRecord = {
              id: `med-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: 'checkup' as const,
              title: diseaseLabel || '皮肤问题检查',
              description: `AI健康分析发现${diseaseLabel || '皮肤问题'}。${(analysisData.result.recommendations as string[])?.slice(0, 2).join('；') || ''}`,
              medication: resultAny.medication || []
            };
            
            // 更新宠物档案
            const updatedPet: Pet = {
              ...pet,
              medicalHistory: [...(pet.medicalHistory || []), medicalRecord],
              updatedAt: new Date().toISOString()
            };
            
            // 调用更新宠物接口
            await fetch('/api/pets', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedPet)
            });
            
            // 更新本地状态
            dispatch({ type: 'UPDATE_PET', payload: updatedPet });
            console.log('✅ 皮肤病已同步到健康档案');
          }
        }
      } else {
        console.log('⚠️ 健康分析保存到数据库失败，但已保存在本地');
      }
    } catch (error) {
      console.error('❌ 保存健康分析到数据库失败:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        selectedPet,
        addPet,
        updatePet,
        deletePet,
        selectPet,
        completeSchedule,
        generateSchedulesForPet,
        addHealthAnalysis,
        checkDueNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
