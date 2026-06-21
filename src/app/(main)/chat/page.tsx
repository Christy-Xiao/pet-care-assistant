'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles, Trash2, Info, Database, Bell, Plus, MessageSquare, ChevronDown, X, Check, Image, Camera, Scale, PawPrint, Calendar, Heart, Clock, MapPin, HeartPulse, Activity, Mic, MicOff, BarChart3 } from 'lucide-react';
import { generateCareMessage, getTodayFestival, getTomorrowFestival } from '@/lib/care-engine';
import { useApp } from '@/store/AppContext';
import ChatLayout from '@/components/ChatLayout';

// 宠物确认卡片组件 - 可编辑版本
function PetConfirmationCard({ 
  petInfo, 
  onConfirm, 
  onCancel 
}: { 
  petInfo: { name: string; species: string; speciesText: string; breed: string }; 
  onConfirm: (info: { name: string; species: string; breed: string }) => void; 
  onCancel: () => void;
}) {
  const [name, setName] = useState(petInfo.name || '');
  const [species, setSpecies] = useState(petInfo.species || 'dog');
  const [breed, setBreed] = useState(petInfo.breed || '');
  
  const handleConfirm = () => {
    if (!name.trim()) {
      alert('请填写宠物名字');
      return;
    }
    onConfirm({ name: name.trim(), species, breed: breed.trim() });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-purple-200 rounded-2xl p-5 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <PawPrint className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">新宠物档案确认</h3>
          <p className="text-sm text-gray-500">请填写宠物信息</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-4 space-y-3 mb-4">
        {/* 名字 */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">名字</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入宠物名字"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        {/* 物种 */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">物种</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSpecies('dog')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                species === 'dog' 
                  ? 'bg-orange-100 text-orange-600 border-2 border-orange-300' 
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}
            >
              🐕 狗狗
            </button>
            <button
              onClick={() => setSpecies('cat')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                species === 'cat' 
                  ? 'bg-orange-100 text-orange-600 border-2 border-orange-300' 
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
              }`}
            >
              🐱 猫咪
            </button>
          </div>
        </div>
        
        {/* 品种 */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">品种（选填）</label>
          <input
            type="text"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="如：柯基、英短等"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          取消
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-200 transition-all flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" />
          确认添加
        </button>
      </div>
    </motion.div>
  );
}

// ========== 生病记录确认卡片 ==========
function SickPetConfirmCard({
  sickPetInfo,
  onConfirm,
  onCancel
}: {
  sickPetInfo: {
    petId: string;
    petName: string;
    symptoms: { category: string; symptom: string }[];
    symptomText: string;
    detectedDate: string;
    recommendedMedications: { name: string; usage: string; notes: string }[];
  };
  onConfirm: (data: { 
    petId: string; 
    petName: string; 
    symptomText: string; 
    detectedDate: string; 
    medications: string[];
  }) => void;
  onCancel: () => void;
}) {
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [customMedication, setCustomMedication] = useState('');
  const [symptomText, setSymptomText] = useState(sickPetInfo.symptomText);

  const toggleMedication = (medName: string) => {
    setSelectedMedications(prev => 
      prev.includes(medName) 
        ? prev.filter(m => m !== medName)
        : [...prev, medName]
    );
  };

  const addCustomMedication = () => {
    if (customMedication.trim() && !selectedMedications.includes(customMedication.trim())) {
      setSelectedMedications(prev => [...prev, customMedication.trim()]);
      setCustomMedication('');
    }
  };

  const handleConfirm = () => {
    onConfirm({
      petId: sickPetInfo.petId,
      petName: sickPetInfo.petName,
      symptomText: symptomText,
      detectedDate: sickPetInfo.detectedDate,
      medications: selectedMedications
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-5 shadow-lg max-w-md"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">{sickPetInfo.petName}生病了</h3>
          <p className="text-sm text-gray-500">记录病历信息</p>
        </div>
      </div>

      {/* 症状显示 */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <label className="text-sm text-gray-500 mb-2 block">🤒 症状</label>
        <input
          type="text"
          value={symptomText}
          onChange={(e) => setSymptomText(e.target.value)}
          placeholder="描述症状..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {/* 推荐药物 */}
      {sickPetInfo.recommendedMedications && sickPetInfo.recommendedMedications.length > 0 && (
        <div className="bg-white rounded-xl p-4 mb-4">
          <label className="text-sm text-gray-500 mb-2 block">💊 推荐用药（可多选）</label>
          <div className="space-y-2">
            {sickPetInfo.recommendedMedications.map((med, index) => (
              <label
                key={index}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedMedications.includes(med.name) 
                    ? 'bg-blue-50 border border-blue-300' 
                    : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedMedications.includes(med.name)}
                  onChange={() => toggleMedication(med.name)}
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{med.name}</span>
                  <span className="text-sm text-gray-500 ml-2">（{med.usage}）</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 已选药物 */}
      {selectedMedications.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <p className="text-sm text-blue-700 font-medium mb-2">已选择：</p>
          <div className="flex flex-wrap gap-2">
            {selectedMedications.map((med, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
                {med}
                <button onClick={() => toggleMedication(med)} className="hover:text-blue-900">×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 自定义药物输入 */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <label className="text-sm text-gray-500 mb-2 block">➕ 添加其他药物</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customMedication}
            onChange={(e) => setCustomMedication(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomMedication()}
            placeholder="输入药物名称..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <button
            onClick={addCustomMedication}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            添加
          </button>
        </div>
      </div>

      {/* 日期显示 */}
      <div className="text-sm text-gray-500 mb-4 text-center">
        📅 记录日期：{new Date(sickPetInfo.detectedDate).toLocaleDateString('zh-CN')}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          取消
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-red-200 transition-all flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4" />
          记录病历
        </button>
      </div>
    </motion.div>
  );
}

// ========== 用药提醒设置卡片 ==========
function MedicationReminderSetupCard({
  petInfo,
  recordInfo,
  onConfirm,
  onCancel
}: {
  petInfo: { petId: string; petName: string };
  recordInfo: { recordId: string; diseaseName: string; medications: string[] };
  onConfirm: (data: { intervalHours: number; frequency: number; totalDoses: number }) => void;
  onCancel: () => void;
}) {
  const [intervalHours, setIntervalHours] = useState(8);
  const [frequency, setFrequency] = useState(3);
  const [totalDoses, setTotalDoses] = useState(21);

  const handleConfirm = () => {
    onConfirm({ intervalHours, frequency, totalDoses });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-5 shadow-lg max-w-md"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">设置用药提醒</h3>
          <p className="text-sm text-gray-500">为 {petInfo.petName} 设置提醒</p>
        </div>
      </div>

      {/* 疾病和药物显示 */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-500 mb-1">📋 疾病</p>
        <p className="font-medium text-gray-800 mb-3">{recordInfo.diseaseName}</p>
        <p className="text-sm text-gray-500 mb-1">💊 药物</p>
        <div className="flex flex-wrap gap-2">
          {recordInfo.medications.map((med, index) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {med}
            </span>
          ))}
        </div>
      </div>

      {/* 用药间隔 */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <label className="text-sm text-gray-500 mb-2 block">⏰ 用药间隔</label>
        <div className="flex gap-2">
          {[6, 8, 12, 24].map(hours => (
            <button
              key={hours}
              onClick={() => setIntervalHours(hours)}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                intervalHours === hours
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {hours}小时
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">每次用药的间隔时间</p>
      </div>

      {/* 每天用药次数 */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <label className="text-sm text-gray-500 mb-2 block">📊 每天用药次数</label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFrequency(Math.max(1, frequency - 1))}
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
          >
            -
          </button>
          <span className="text-2xl font-bold text-gray-800 w-12 text-center">{frequency}</span>
          <button
            onClick={() => setFrequency(Math.min(10, frequency + 1))}
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
          >
            +
          </button>
          <span className="text-gray-500">次/天</span>
        </div>
      </div>

      {/* 总剂量 */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <label className="text-sm text-gray-500 mb-2 block">💊 总疗程</label>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTotalDoses(Math.max(3, totalDoses - 7))}
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
          >
            -
          </button>
          <span className="text-2xl font-bold text-gray-800 w-16 text-center">{totalDoses}</span>
          <button
            onClick={() => setTotalDoses(Math.min(90, totalDoses + 7))}
            className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
          >
            +
          </button>
          <span className="text-gray-500">次</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          预计用药天数：{Math.ceil(totalDoses / frequency)} 天
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          跳过
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-200 transition-all"
        >
          开启提醒
        </button>
      </div>
    </motion.div>
  );
}

// ========== 排便记录确认卡片 ==========
function BowelConfirmationCard({
  bowelInfo,
  onConfirm,
  onCancel
}: {
  bowelInfo: {
    petId: string;
    petName: string;
    recordDate: string;
    type: 'solid' | 'liquid' | 'both';
    typeText: string;
  };
  onConfirm: (data: {
    petId: string;
    petName: string;
    recordDate: string;
    type: 'solid' | 'liquid' | 'both';
    size: 'small' | 'medium' | 'large';
  }) => void;
  onCancel: () => void;
}) {
  const [selectedSize, setSelectedSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  const handleConfirm = () => {
    onConfirm({
      petId: bowelInfo.petId,
      petName: bowelInfo.petName,
      recordDate: bowelInfo.recordDate,
      type: bowelInfo.type,
      size: selectedSize
    });
  };
  
  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '昨天';
    }
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  };
  
  const sizeOptions: { value: 'small' | 'medium' | 'large'; label: string; desc: string; color: string; bgColor: string }[] = [
    { value: 'small', label: '正常/少量', desc: '绿色', color: 'bg-green-400', bgColor: 'bg-green-50 border-green-200' },
    { value: 'medium', label: '中等量', desc: '黄色', color: 'bg-amber-400', bgColor: 'bg-amber-50 border-amber-200' },
    { value: 'large', label: '大量/异常', desc: '红色', color: 'bg-red-400', bgColor: 'bg-red-50 border-red-200' },
  ];
  
  const typeEmoji = bowelInfo.type === 'solid' ? '💩' : bowelInfo.type === 'liquid' ? '💧' : '💩💧';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
          <span className="text-2xl">{typeEmoji}</span>
        </div>
        <div>
          <h3 className="font-bold text-gray-800">记录{bowelInfo.petName}的排便</h3>
          <p className="text-sm text-gray-500">{formatDate(bowelInfo.recordDate)} · {bowelInfo.typeText}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-600 mb-3 text-center">
          请选择排便量级（颜色代表健康程度）：
        </p>
        <div className="grid grid-cols-3 gap-2">
          {sizeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedSize(opt.value)}
              className={`py-3 px-2 rounded-xl border-2 text-center transition-all ${
                selectedSize === opt.value
                  ? opt.bgColor
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className={`w-8 h-8 mx-auto rounded-full ${opt.color} mb-1.5 shadow-sm`} />
              <div className="text-xs font-medium text-gray-700">{opt.label}</div>
              <div className="text-[10px] text-gray-400">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          取消
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-green-200 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          确认记录
        </button>
      </div>
    </motion.div>
  );
}

// 日程确认卡片组件 - 可编辑版本（支持重复日程）
function ScheduleConfirmationCard({
  scheduleInfo,
  onConfirm,
  onCancel,
}: {
  scheduleInfo: {
    petId: string;
    petName: string;
    title: string;
    dueDate: string;
    dueDateText: string;
    eventType: string;
    isRecurring?: boolean;
    intervalType?: 'day' | 'week' | 'month' | null;
    intervalValue?: number;
    repeatCount?: number;
  };
  onConfirm: (info: { petId: string; title: string; dueDate: string; eventType: string; isRecurring?: boolean; intervalType?: string | null; intervalValue?: number; repeatCount?: number }) => void;
  onCancel: () => void;
}) {
  const [petName, setPetName] = useState(scheduleInfo.petName || '');
  const [title, setTitle] = useState(scheduleInfo.title || '');
  const [dueDate, setDueDate] = useState(scheduleInfo.dueDate || '');
  const [eventType, setEventType] = useState(scheduleInfo.eventType || 'other');
  const [isRecurring, setIsRecurring] = useState(scheduleInfo.isRecurring || false);
  const [intervalType, setIntervalType] = useState<'day' | 'week' | 'month'>(scheduleInfo.intervalType as 'day' | 'week' | 'month' || 'week');
  const [intervalValue, setIntervalValue] = useState(scheduleInfo.intervalValue || 1);
  const [repeatCount, setRepeatCount] = useState(scheduleInfo.repeatCount || 1);
  
  const eventTypes = [
    { value: 'vaccination', label: '💉 疫苗接种' },
    { value: 'parasite_prevention', label: '🛡️ 驱虫护理' },
    { value: 'grooming', label: '✂️ 美容护理' },
    { value: 'wellness_exam', label: '🏥 健康检查' },
    { value: 'dental_care', label: '🦷 牙齿护理' },
    { value: 'exercise', label: '🌳 户外活动' },
    { value: 'other', label: '📋 其他' },
  ];

  // 生成所有日期
  const generateAllDates = () => {
    const dates: string[] = [dueDate];
    if (isRecurring && repeatCount > 1) {
      let currentDate = new Date(dueDate);
      for (let i = 1; i < repeatCount; i++) {
        if (intervalType === 'day') {
          currentDate = new Date(currentDate.getTime() + intervalValue * 24 * 60 * 60 * 1000);
        } else if (intervalType === 'week') {
          currentDate = new Date(currentDate.getTime() + intervalValue * 7 * 24 * 60 * 60 * 1000);
        } else if (intervalType === 'month') {
          currentDate.setMonth(currentDate.getMonth() + intervalValue);
        }
        dates.push(currentDate.toISOString().split('T')[0]);
      }
    }
    return dates;
  };

  const handleConfirm = () => {
    if (!petName.trim() || !title.trim() || !dueDate) {
      alert('请填写完整信息');
      return;
    }
    onConfirm({ 
      petId: scheduleInfo.petId, 
      title: title.trim(), 
      dueDate, 
      eventType,
      isRecurring,
      intervalType: isRecurring ? intervalType : null,
      intervalValue: isRecurring ? intervalValue : 0,
      repeatCount: isRecurring ? repeatCount : 1
    });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 shadow-lg max-w-md"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">护理日程确认</h3>
          <p className="text-sm text-gray-500">请确认日程信息</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-4 space-y-3 mb-4">
        {/* 宠物名称 */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">宠物名称</label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="请输入宠物名字"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        
        {/* 日程标题 */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">日程事项</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：疫苗接种、驱虫护理等"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        
        {/* 日期 */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">
            <Clock className="w-4 h-4 inline mr-1" />
            开始日期
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        
        {/* 日程类型 */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">日程类型</label>
          <div className="grid grid-cols-2 gap-2">
            {eventTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setEventType(type.value)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  eventType === type.value
                    ? 'bg-amber-100 text-amber-600 border-2 border-amber-300'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* 重复设置 */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isRecurring ? 'bg-amber-500' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                isRecurring ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-sm text-gray-600">重复提醒</span>
          </div>

          {isRecurring && (
            <div className="space-y-3 bg-amber-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">每</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 border border-amber-200 rounded-lg text-center"
                />
                <select
                  value={intervalType}
                  onChange={(e) => setIntervalType(e.target.value as 'day' | 'week' | 'month')}
                  className="px-2 py-1 border border-amber-200 rounded-lg"
                >
                  <option value="day">天</option>
                  <option value="week">周</option>
                  <option value="month">月</option>
                </select>
                <span className="text-sm text-gray-600">重复</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">共</span>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                  className="w-16 px-2 py-1 border border-amber-200 rounded-lg text-center"
                />
                <span className="text-sm text-gray-600">次</span>
              </div>
              
              {/* 预览日期 */}
              <div className="text-xs text-gray-500 mt-2">
                <p className="font-medium">日期预览：</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {generateAllDates().slice(0, 5).map((date, i) => {
                    const d = new Date(date);
                    const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`;
                    return (
                      <span key={i} className="px-2 py-0.5 bg-white rounded border border-amber-200">
                        {dateStr}
                      </span>
                    );
                  })}
                  {generateAllDates().length > 5 && (
                    <span className="px-2 py-0.5 text-gray-400">
                      +{generateAllDates().length - 5}次
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          取消
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-amber-200 transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          确认添加
        </button>
      </div>
    </motion.div>
  );
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contextUsed?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

// 从localStorage读取用户数据
function getUserData() {
  try {
    const pets = JSON.parse(localStorage.getItem('pets') || '[]');
    const schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
    const records = JSON.parse(localStorage.getItem('healthAnalyses') || '[]');
    return { pets, schedules, records };
  } catch {
    return { pets: [], schedules: [], records: [] };
  }
}

// 从localStorage读取所有对话
function getConversations(): Conversation[] {
  try {
    const data = localStorage.getItem('chatConversations');
    if (data) {
      const conversations = JSON.parse(data);
      // 转换日期字符串回 Date 对象
      return conversations.map((c: any) => ({
        ...c,
        updatedAt: new Date(c.updatedAt)
      }));
    }
  } catch {}
  return [];
}

// 保存所有对话到localStorage
function saveConversations(conversations: Conversation[]) {
  localStorage.setItem('chatConversations', JSON.stringify(conversations));
}

// 生成默认欢迎消息
function getDefaultWelcomeMessage(hasPets: boolean, petNames?: string, urgentSchedules?: any[]): Message {
  let content = `👋 你好！我是毛绒管家，你的智能宠物健康助手。

我可以帮你解答：
• 宠物饲养与护理问题
• 健康饮食建议  
• 疫苗与驱虫安排
• 常见疾病预防
• 行为问题咨询

💡 我会记住我们的对话历史，提供更个性化的服务！

请告诉我有什么需要帮助的吧！🐾`;

  if (hasPets && petNames) {
    content = `👋 你好！我是毛绒管家，你的智能宠物健康助手。

检测到你有宠物：${petNames}

我可以帮你解答：
• 宠物饲养与护理问题
• 健康饮食建议  
• 疫苗与驱虫安排
• 常见疾病预防
• 行为问题咨询

💡 我会记住我们的对话历史，提供更个性化的服务！`;

    if (urgentSchedules && urgentSchedules.length > 0) {
      const scheduleList = urgentSchedules.map((s: any) => `${s.title}`).join('、');
      content += `\n\n📌 小提醒：${scheduleList}`;
    }
    content += '\n\n请告诉我有什么需要帮助的吧！🐾';
  }

  return {
    id: 'welcome',
    role: 'assistant',
    content,
    timestamp: new Date(),
    contextUsed: hasPets,
  };
}

// 创建新对话
function createNewConversation(hasPets: boolean, petNames?: string, urgentSchedules?: any[]): Conversation {
  return {
    id: `conv_${Date.now()}`,
    title: '新对话',
    messages: [getDefaultWelcomeMessage(hasPets, petNames, urgentSchedules)],
    updatedAt: new Date(),
  };
}

const quickQuestions = [
  { icon: '💉', text: '我的宠物有哪些疫苗要打？' },
  { icon: '⚠️', text: '最近有什么护理日程要注意？' },
  { icon: '📊', text: '帮我分析一下宠物健康状况' },
  { icon: '🐾', text: '我的宠物对什么过敏？' },
  { icon: '✂️', text: '多久给宠物洗一次澡合适？' },
  { icon: '🌳', text: '带宠物去哪玩？' },
];

// ========== 健康自测弹窗 ==========
interface HealthQuestion {
  id: number;
  question: string;
}

const DOG_QUESTIONS: HealthQuestion[] = [
  { id: 1, question: '日常精神充足，活泼好动' },
  { id: 2, question: '作息正常，无嗜睡、过度亢奋' },
  { id: 3, question: '食欲稳定，不挑食拒食、不暴饮暴食' },
  { id: 4, question: '每日饮水量正常，无狂喝水或少喝水' },
  { id: 5, question: '平时无呕吐、干呕、反胃现象' },
  { id: 6, question: '排便规律，粪便软硬成型' },
  { id: 7, question: '便便无带血、拉稀、有虫、发黑异味' },
  { id: 8, question: '排尿顺畅，尿量排尿次数正常' },
  { id: 9, question: '毛发顺滑，无大面积异常掉毛' },
  { id: 10, question: '皮肤干净，无红点、皮屑、红肿' },
  { id: 11, question: '不会频繁抓挠、啃咬自身皮肤' },
  { id: 12, question: '眼睛清澈，无红肿、流泪、多眼屎' },
  { id: 13, question: '鼻头湿润，无流鼻涕、频繁打喷嚏' },
  { id: 14, question: '口腔无严重口臭，不莫名流口水' },
  { id: 15, question: '走路奔跑正常，无跛脚瘸腿' },
  { id: 16, question: '肢体灵活，起身跳跃无僵硬无力' },
  { id: 17, question: '疫苗按时全程接种齐全' },
  { id: 18, question: '每月定期做好体内外驱虫' },
  { id: 19, question: '呼吸平稳，无咳嗽、急促喘气' },
  { id: 20, question: '近期体重稳定，无骤胖骤瘦' },
];

const CAT_QUESTIONS: HealthQuestion[] = [
  { id: 1, question: '精神状态良好，互动反应灵敏' },
  { id: 2, question: '作息平稳，无整日昏睡、情绪狂躁' },
  { id: 3, question: '进食规律，无突然不吃猫粮' },
  { id: 4, question: '日常喝水量、喝水频次正常' },
  { id: 5, question: '除正常吐毛外，几乎不呕吐' },
  { id: 6, question: '排便规律，不软便、不便秘' },
  { id: 7, question: '粪便无血丝、腥臭、形态异常' },
  { id: 8, question: '排尿顺畅，无乱尿、蹲厕排不出' },
  { id: 9, question: '毛发顺滑，非换毛期不掉毛严重' },
  { id: 10, question: '皮肤无结痂、泛红、皮肤病症状' },
  { id: 11, question: '极少频繁舔毛咬肤、抓挠耳朵' },
  { id: 12, question: '双眼干净，无发炎、分泌物过多' },
  { id: 13, question: '鼻子干净，无鼻塞、频繁打喷嚏' },
  { id: 14, question: '口腔无异味，不无故流口水' },
  { id: 15, question: '行走跳跃平稳，无瘸腿不敢着地' },
  { id: 16, question: '四肢灵活，不爱长时间趴卧不动' },
  { id: 17, question: '按时完成猫咪全套疫苗接种' },
  { id: 18, question: '定期规律进行体内外驱虫' },
  { id: 19, question: '安静状态下呼吸平缓，不张口喘' },
  { id: 20, question: '体重平稳，无快速消瘦发胖' },
];

const SCORE_MAP: Record<string, number> = {
  A: 5,
  B: 3,
  C: 1,
  D: 0,
};

const OPTION_LABELS = [
  { key: 'A', label: 'A', text: '完全正常', color: 'green' },
  { key: 'B', label: 'B', text: '轻微异常', color: 'yellow' },
  { key: 'C', label: 'C', text: '明显异常', color: 'orange' },
  { key: 'D', label: 'D', text: '频繁出现', color: 'red' },
];

function getResultInfo(score: number) {
  if (score >= 85) return { level: 'excellent', label: '健康优秀', emoji: '🌟', color: 'emerald', desc: '宝贝健康状况非常棒！继续保持！' };
  if (score >= 70) return { level: 'mild', label: '轻微亚健康', emoji: '🌿', color: 'yellow', desc: '身体状况基本良好，注意日常护理。' };
  if (score >= 50) return { level: 'moderate', label: '需调理', emoji: '⚠️', color: 'orange', desc: '需要关注饮食和生活习惯，建议咨询兽医。' };
  return { level: 'serious', label: '尽快就医', emoji: '🚨', color: 'red', desc: '健康状况需要专业检查，请尽快带宠物就医！' };
}

function HealthSelfTestModal({
  isOpen,
  onClose,
  pets,
  onComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  pets: any[];
  onComplete: (petId: string, petName: string, species: string, score: number, result: string) => void;
}) {
  const [step, setStep] = useState<'selectPet' | 'test' | 'result'>('selectPet');
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [score, setScore] = useState(0);
  const [resultInfo, setResultInfo] = useState<any>(null);

  const questions = species === 'dog' ? DOG_QUESTIONS : CAT_QUESTIONS;

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setStep('selectPet');
      setSelectedPet(null);
      setSpecies('dog');
      setAnswers({});
      setCurrentQuestion(1);
      setScore(0);
      setResultInfo(null);
    }
  }, [isOpen]);

  // 自动选择物种
  useEffect(() => {
    if (selectedPet) {
      setSpecies(selectedPet.species === 'cat' ? 'cat' : 'dog');
    }
  }, [selectedPet]);

  const handleSelectPet = (pet: any) => {
    setSelectedPet(pet);
    setSpecies(pet.species === 'cat' ? 'cat' : 'dog');
    setStep('test');
  };

  const handleAnswer = (questionId: number, option: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    
    if (questionId < questions.length) {
      setCurrentQuestion(questionId + 1);
    } else {
      // 计算总分
      const totalScore = Object.entries({ ...answers, [questionId]: option })
        .reduce((sum, [, opt]) => sum + (SCORE_MAP[opt] || 0), 0);
      setScore(totalScore);
      setResultInfo(getResultInfo(totalScore));
      setStep('result');
      
      if (selectedPet) {
        onComplete(selectedPet.id, selectedPet.name, species, totalScore, getResultInfo(totalScore).label);
      }
    }
  };

  const handleGoBack = () => {
    if (step === 'test' && currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (step === 'test') {
      setStep('selectPet');
    } else if (step === 'result') {
      setStep('test');
      setCurrentQuestion(questions.length);
    }
  };

  const progress = step === 'test' ? (currentQuestion / questions.length) * 100 : step === 'result' ? 100 : 0;
  const currentQ = questions.find(q => q.id === currentQuestion);
  const answeredCount = Object.keys(answers).length;
  const estimatedScore = Object.entries(answers).reduce((sum, [, opt]) => sum + (SCORE_MAP[opt] || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">宠物健康自测</h2>
                <p className="text-xs text-white/80">
                  {step === 'selectPet' && '选择宠物'}
                  {step === 'test' && `题目 ${currentQuestion}/${questions.length}`}
                  {step === 'result' && '测评结果'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* 进度条 */}
          {step !== 'selectPet' && (
            <div className="mt-3 bg-white/20 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 步骤1: 选择宠物 */}
          {step === 'selectPet' && (
            <div>
              <p className="text-gray-600 mb-4">请选择要检测的宠物：</p>
              <div className="space-y-3">
                {pets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <PawPrint className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>还没有添加宠物</p>
                    <p className="text-sm mt-1">请先添加宠物后再进行健康自测</p>
                  </div>
                ) : (
                  pets.map(pet => (
                    <button
                      key={pet.id}
                      onClick={() => handleSelectPet(pet)}
                      className="w-full p-4 bg-gray-50 hover:bg-emerald-50 border-2 border-gray-200 hover:border-emerald-300 rounded-2xl flex items-center gap-4 transition-all"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-3xl">
                        {pet.species === 'cat' ? '🐱' : '🐕'}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-gray-800">{pet.name}</p>
                        <p className="text-sm text-gray-500">{pet.breed || (pet.species === 'cat' ? '猫咪' : '狗狗')}</p>
                      </div>
                      <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
                    </button>
                  ))
                )}
              </div>
              
              {/* 没有合适宠物时的选项 */}
              {pets.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">或者手动选择测评类型：</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setSpecies('dog'); setStep('test'); }}
                      className="flex-1 py-3 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-xl flex flex-col items-center gap-1 transition-all"
                    >
                      <span className="text-2xl">🐕</span>
                      <span className="text-sm font-medium text-orange-700">狗狗版</span>
                    </button>
                    <button
                      onClick={() => { setSpecies('cat'); setStep('test'); }}
                      className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl flex flex-col items-center gap-1 transition-all"
                    >
                      <span className="text-2xl">🐱</span>
                      <span className="text-sm font-medium text-blue-700">猫咪版</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 步骤2: 答题 */}
          {step === 'test' && currentQ && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{species === 'cat' ? '🐱' : '🐕'}</span>
                <span className="text-gray-600">{selectedPet?.name || (species === 'cat' ? '猫咪' : '狗狗')}健康自测</span>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 mb-4">
                <p className="text-lg font-medium text-gray-800 leading-relaxed">
                  <span className="text-emerald-600 font-bold">{currentQ.id}.</span> {currentQ.question}
                </p>
              </div>
              
              <div className="space-y-3">
                {OPTION_LABELS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswer(currentQ.id, opt.key)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      answers[currentQ.id] === opt.key
                        ? opt.color === 'green' ? 'border-emerald-400 bg-emerald-50' :
                          opt.color === 'yellow' ? 'border-yellow-400 bg-yellow-50' :
                          opt.color === 'orange' ? 'border-orange-400 bg-orange-50' :
                          'border-red-400 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      opt.color === 'green' ? 'bg-emerald-500' :
                      opt.color === 'yellow' ? 'bg-yellow-500' :
                      opt.color === 'orange' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}>
                      {opt.label}
                    </span>
                    <span className="text-gray-700 font-medium">{opt.text}</span>
                  </button>
                ))}
              </div>
              
              {/* 已答进度 */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>已答 {answeredCount}/{questions.length} 题</span>
                  <span>预估得分：{estimatedScore}分</span>
                </div>
              </div>
            </div>
          )}

          {/* 步骤3: 结果 */}
          {step === 'result' && resultInfo && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br ${
                  resultInfo.color === 'emerald' ? 'from-emerald-400 to-emerald-600' :
                  resultInfo.color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
                  resultInfo.color === 'orange' ? 'from-orange-400 to-orange-600' :
                  'from-red-400 to-red-600'
                } mb-6 shadow-lg`}
              >
                <div className="text-center text-white">
                  <p className="text-4xl font-bold">{score}</p>
                  <p className="text-xs opacity-80">满分100</p>
                </div>
              </motion.div>
              
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-${
                resultInfo.color === 'emerald' ? 'emerald' :
                resultInfo.color === 'yellow' ? 'yellow' :
                resultInfo.color === 'orange' ? 'orange' :
                'red'
              }-100 text-${resultInfo.color === 'emerald' ? 'emerald' :
                resultInfo.color === 'yellow' ? 'yellow' :
                resultInfo.color === 'orange' ? 'orange' :
                'red'}-700 font-bold mb-4`}>
                <span className="text-2xl">{resultInfo.emoji}</span>
                <span>{resultInfo.label}</span>
              </div>
              
              <p className="text-gray-600 mb-6">{resultInfo.desc}</p>
              
              {/* 详细分析 */}
              <div className="bg-gray-50 rounded-2xl p-4 text-left mb-6">
                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  测评概况
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">测评宠物</span>
                    <span className="font-medium">{selectedPet?.name || (species === 'cat' ? '猫咪' : '狗狗')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">测评类型</span>
                    <span>{species === 'cat' ? '🐱 猫咪版' : '🐕 狗狗版'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">答题数量</span>
                    <span>{questions.length} 题</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">健康评分</span>
                    <span className="font-bold">{score} / 100</span>
                  </div>
                </div>
              </div>
              
              {/* 选项分布 */}
              <div className="bg-gray-50 rounded-2xl p-4 text-left">
                <h4 className="font-bold text-gray-700 mb-3">答题分布</h4>
                <div className="space-y-2 text-sm">
                  {OPTION_LABELS.map(opt => {
                    const count = Object.values(answers).filter(a => a === opt.key).length;
                    const percent = Math.round((count / questions.length) * 100);
                    return (
                      <div key={opt.key} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          opt.color === 'green' ? 'bg-emerald-500' :
                          opt.color === 'yellow' ? 'bg-yellow-500' :
                          opt.color === 'orange' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}>{opt.key}</span>
                        <div className="flex-1">
                          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                opt.color === 'green' ? 'bg-emerald-500' :
                                opt.color === 'yellow' ? 'bg-yellow-500' :
                                opt.color === 'orange' ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-gray-500 w-16 text-right">{count}题 ({percent}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-gray-100 flex gap-3">
          {step !== 'selectPet' && (
            <button
              onClick={handleGoBack}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              {step === 'result' ? '重新测评' : '上一题'}
            </button>
          )}
          {step === 'result' && (
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              完成测评
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ========== 宠物档案查看卡片 ==========
function PetProfileCard({
  petData,
  onEdit,
  onClose,
}: {
  petData: {
    petId: string;
    petName: string;
    petSpecies: string;
    petBreed: string;
    petGender: string;
    petAge: number | null;
    petWeight: number | null;
    petAvatar: string;
    petAllergies: string;
    petNotes: string;
  };
  onEdit: (petId: string) => void;
  onClose: () => void;
}) {
  const speciesEmoji = petData.petSpecies === 'cat' ? '🐱' : '🐕';
  const genderText = petData.petGender === 'male' ? '弟弟 ♂' : petData.petGender === 'female' ? '妹妹 ♀' : '未知';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white border-2 border-purple-200 rounded-2xl shadow-xl overflow-hidden max-w-sm"
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl">
              {petData.petAvatar ? (
                <img src={petData.petAvatar} alt={petData.petName} className="w-full h-full rounded-full object-cover" />
              ) : (
                speciesEmoji
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">{petData.petName}</h3>
              <p className="text-sm text-white/80">{petData.petBreed || (petData.petSpecies === 'cat' ? '猫咪' : '狗狗')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* 信息展示 */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">性别</p>
            <p className="font-medium text-gray-800">{genderText}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">年龄</p>
            <p className="font-medium text-gray-800">{petData.petAge ? `${petData.petAge}岁` : '未知'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">体重</p>
            <p className="font-medium text-gray-800">{petData.petWeight ? `${petData.petWeight}kg` : '未知'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">物种</p>
            <p className="font-medium text-gray-800">{petData.petSpecies === 'cat' ? '🐱 猫咪' : '🐕 狗狗'}</p>
          </div>
        </div>
        
        {petData.petAllergies && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-600 mb-1">⚠️ 过敏史</p>
            <p className="font-medium text-amber-800">{petData.petAllergies}</p>
          </div>
        )}
        
        {petData.petNotes && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-600 mb-1">📝 备注</p>
            <p className="text-sm text-gray-700">{petData.petNotes}</p>
          </div>
        )}
      </div>
      
      {/* 底部按钮 */}
      <div className="p-4 pt-0 flex gap-3">
        <button
          onClick={() => onEdit(petData.petId)}
          className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <PawPrint className="w-4 h-4" />
          修改档案
        </button>
        <button
          onClick={onClose}
          className="py-3 px-4 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          关闭
        </button>
      </div>
    </motion.div>
  );
}

// ========== 所有宠物列表卡片 ==========
function AllPetsCard({
  pets,
  onSelectPet,
  onClose,
}: {
  pets: Array<{
    petId: string;
    petName: string;
    petSpecies: string;
    petBreed: string;
    petGender: string;
    petAge: number | null;
    petWeight: number | null;
    petAvatar: string;
  }>;
  onSelectPet: (petId: string) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white border-2 border-purple-200 rounded-2xl shadow-xl overflow-hidden max-w-md"
    >
      {/* 头部 */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <PawPrint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">宠物档案</h3>
              <p className="text-sm text-white/80">共有 {pets.length} 只宠物</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* 宠物列表 */}
      <div className="p-3 max-h-80 overflow-y-auto">
        <div className="space-y-2">
          {pets.map(pet => (
            <button
              key={pet.petId}
              onClick={() => onSelectPet(pet.petId)}
              className="w-full p-3 bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl flex items-center gap-3 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-2xl">
                {pet.petAvatar ? (
                  <img src={pet.petAvatar} alt={pet.petName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  pet.petSpecies === 'cat' ? '🐱' : '🐕'
                )}
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-800">{pet.petName}</p>
                <p className="text-sm text-gray-500">
                  {pet.petBreed || (pet.petSpecies === 'cat' ? '猫咪' : '狗狗')}
                  {pet.petAge ? ` · ${pet.petAge}岁` : ''}
                  {pet.petWeight ? ` · ${pet.petWeight}kg` : ''}
                </p>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ========== 日程查看弹窗 ==========
function ScheduleViewModal({
  isOpen,
  onClose,
  scheduleView,
}: {
  isOpen: boolean;
  onClose: () => void;
  scheduleView: {
    schedules: Array<{
      id: string;
      petId: string;
      petName: string;
      title: string;
      eventType: string;
      eventTypeText: string;
      dueDate: string;
      dueDateText: string;
      daysUntil: number;
      daysUntilText: string;
      priority: string;
      status: string;
    }>;
    isFiltered: boolean;
    filterPetName: string | null;
    totalCount: number;
  } | null;
}) {
  if (!isOpen || !scheduleView) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDaysColor = (daysUntil: number) => {
    if (daysUntil < 0) return 'text-red-500';
    if (daysUntil === 0) return 'text-red-500 font-bold';
    if (daysUntil === 1) return 'text-orange-500';
    if (daysUntil <= 3) return 'text-amber-500';
    return 'text-gray-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">
                  {scheduleView.filterPetName ? `${scheduleView.filterPetName}的` : ''}护理日程
                </h2>
                <p className="text-sm text-white/80">
                  共 {scheduleView.totalCount} 项日程
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 日程列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {scheduleView.schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">暂无待执行的日程</p>
              <p className="text-sm text-gray-400 mt-2">告诉我想安排什么日程吧～</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduleView.schedules.map((schedule, index) => (
                <motion.div
                  key={schedule.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{schedule.eventTypeText.split(' ')[0]}</span>
                        <span className="font-medium text-gray-800">{schedule.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">🐾 {schedule.petName}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(schedule.priority)}`}>
                          {schedule.priority === 'high' ? '紧急' : schedule.priority === 'medium' ? '一般' : '较低'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getDaysColor(schedule.daysUntil)}`}>
                        {schedule.daysUntilText}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {schedule.dueDateText}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ========== 户外活动推荐弹窗 ==========
function OutdoorActivityRecommendModal({
  isOpen,
  onClose,
  outdoorActivityRecommend,
  onSelectOption,
  onShowCareTip,
}: {
  isOpen: boolean;
  onClose: () => void;
  outdoorActivityRecommend: any;
  onSelectOption: (option: 'walk' | 'park') => void;
  onShowCareTip?: (message: string) => void;
}) {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [parksData, setParksData] = useState<any[]>([]);
  const [locationName, setLocationName] = useState<string>('当前位置');
  const [loading, setLoading] = useState(true);

  // 获取实时天气和绿地数据
  const fetchRealtimeData = useCallback(async () => {
    setLoading(true);
    
    // 并行获取天气和绿地数据
    const [weatherRes, parksRes] = await Promise.all([
      fetch('/api/weather').then(r => r.json()).catch(() => null),
      fetch('/api/parks').then(r => r.json()).catch(() => null)
    ]);

    // 处理天气数据
    if (weatherRes?.current) {
      setWeatherData({
        temp: weatherRes.current.temp,
        feelsLike: weatherRes.current.feelsLike,
        text: weatherRes.current.text,
        icon: weatherRes.current.icon,
        suggestion: weatherRes.suggestion
      });
      setLocationName(weatherRes.location?.name || '当前位置');
    }

    // 处理绿地数据
    if (parksRes?.parks && parksRes.parks.length > 0) {
      setParksData(parksRes.parks.slice(0, 3).map((p: any) => ({
        name: p.name,
        address: p.address,
        distance: p.distanceText || p.distance
      })));
    }

    setLoading(false);
  }, []);

  // 组件打开时获取实时数据
  useEffect(() => {
    if (isOpen) {
      fetchRealtimeData();
    }
  }, [isOpen, fetchRealtimeData]);

  // 天气图标
  const getWeatherIcon = (text: string) => {
    if (!text) return '🌤️';
    if (text.includes('晴')) return '☀️';
    if (text.includes('多云')) return '⛅';
    if (text.includes('阴')) return '☁️';
    if (text.includes('雨')) return '🌧️';
    if (text.includes('雪')) return '❄️';
    if (text.includes('雷')) return '⛈️';
    if (text.includes('雾')) return '🌫️';
    return '🌤️';
  };

  // 天气代码转换（用于关怀引擎）
  const getWeatherCode = (text: string, temp?: number): string => {
    if (!text) return 'sunny';
    if (temp !== undefined) {
      if (temp > 30) return 'hot';
      if (temp < 10) return 'cold';
    }
    if (text.includes('雪')) return 'snowy';
    if (text.includes('雨')) return 'rainy';
    if (text.includes('阴')) return 'cloudy';
    if (text.includes('晴')) return 'sunny';
    return 'sunny';
  };

  // 获取建议等级颜色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'bad': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!isOpen) return null;

  // 使用实时数据或后端传递的数据
  const displayWeather = weatherData || outdoorActivityRecommend?.weather;
  const displaySuggestion = displayWeather?.suggestion || outdoorActivityRecommend?.suggestion;
  const displayLocation = locationName !== '当前位置' ? locationName : (outdoorActivityRecommend?.locationName || '当前位置');
  const displayParks = parksData.length > 0 ? parksData : (outdoorActivityRecommend?.parks || []);
  const weatherIcon = getWeatherIcon(displayWeather?.text || '');

  // 生成主动关怀消息
  const generateAndShowCareTip = useCallback(() => {
    // 获取天气代码
    let weatherCode = 'sunny';
    if (displayWeather?.text) {
      const text = displayWeather.text.toLowerCase();
      if (text.includes('雨')) weatherCode = 'rainy';
      else if (text.includes('阴')) weatherCode = 'cloudy';
      else if (text.includes('雪')) weatherCode = 'snowy';
      else if (text.includes('晴')) weatherCode = 'sunny';
    }
    
    // 根据温度判断冷热
    if (displayWeather?.temp) {
      if (displayWeather.temp > 30) weatherCode = 'hot';
      else if (displayWeather.temp < 10) weatherCode = 'cold';
    }

    const careMessage = generateCareMessage({
      code: weatherCode,
      temp: displayWeather?.temp
    });

    if (careMessage) {
      if (onShowCareTip) {
        onShowCareTip(careMessage);
      }
    }
  }, [displayWeather, onShowCareTip]);

  // 检查节日信息
  const checkFestivals = useCallback(() => {
    const todayFestival = getTodayFestival();
    const tomorrowFestival = getTomorrowFestival();
    
    if (tomorrowFestival) {
      return `\n📅 明天是${tomorrowFestival.name}哦！${tomorrowFestival.message}`;
    }
    return '';
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl">🌿</span>
              </div>
              <div>
                <h2 className="font-bold text-lg">户外活动推荐</h2>
                <p className="text-sm text-white/80">{displayLocation}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : (
            <>
              {/* 天气信息卡片 - 使用主页的天气样式 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-4xl">{weatherIcon}</span>
                    <div>
                      <p className="text-3xl font-bold text-gray-800">{displayWeather?.temp || '--'}°C</p>
                      <p className="text-sm text-gray-500">体感 {displayWeather?.feelsLike || '--'}°C</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-700">{displayWeather?.text || '未知'}</p>
                  </div>
                </div>
                
                {/* 遛狗建议 */}
                {displaySuggestion && (
                  <div className={`mt-3 p-3 rounded-xl border ${getLevelColor(displaySuggestion.level)}`}>
                    <p className="font-medium text-sm mb-1">🐕 遛狗建议</p>
                    <p className="text-sm">{displaySuggestion.message}</p>
                    <p className="text-xs mt-1 opacity-70">建议时长：{displaySuggestion.duration}</p>
                  </div>
                )}
              </div>

              {/* 温馨提示 */}
              {displaySuggestion?.tips && displaySuggestion.tips.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="font-medium text-amber-800 mb-2 flex items-center gap-1">
                    <span className="text-lg">💡</span> 温馨提示
                  </p>
                  <ul className="space-y-1">
                    {displaySuggestion.tips.slice(0, 3).map((tip: string, index: number) => (
                      <li key={index} className="text-sm text-amber-700 flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 选项卡片 */}
              <div className="space-y-3">
                <p className="font-medium text-gray-700 text-center">请问你想怎么玩呢？</p>
                
                {/* 例行遛狗选项 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectOption('walk')}
                  className="w-full p-4 bg-white border-2 border-green-200 rounded-2xl hover:border-green-400 hover:shadow-lg transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-3xl">🐕</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-green-700">🟢 例行遛狗</h3>
                      <p className="text-sm text-gray-500">就在小区附近或周边走走，散步运动一下</p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-green-400 transform rotate-270" />
                  </div>
                </motion.button>

                {/* 去大地方玩选项 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectOption('park')}
                  className="w-full p-4 bg-white border-2 border-blue-200 rounded-2xl hover:border-blue-400 hover:shadow-lg transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-3xl">🌳</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-700">🔵 去大地方玩</h3>
                      <p className="text-sm text-gray-500">去公园、绿地等开阔的地方，让宠物尽情撒欢</p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-blue-400 transform rotate-270" />
                  </div>
                </motion.button>
              </div>

              {/* 附近绿地预览 - 使用绿地搜索的真实数据 */}
              {displayParks.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="font-medium text-gray-700 mb-3 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-red-500" />
                    附近绿地
                  </p>
                  <div className="space-y-2">
                    {displayParks.map((park: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-700">{park.name}</p>
                          <p className="text-xs text-gray-400">{park.address}</p>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                          {park.distance}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// 绿地推荐弹窗
function ParkRecommendationModal({
  isOpen,
  onClose,
  parks,
  locationName,
}: {
  isOpen: boolean;
  onClose: () => void;
  parks: Array<{
    name: string;
    address: string;
    distance: string;
    type: string;
    location: string | null;
    rating?: number;
    features?: string[];
    crowdLevel?: string;
    crowdText?: string;
    lawnSize?: string;
  }>;
  locationName: string;
}) {
  if (!isOpen) return null;

  // 获取人流量颜色
  const getCrowdColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-emerald-500 to-green-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">附近绿地推荐</h2>
                <p className="text-sm text-white/80">{locationName}附近的宠物友好场所</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {parks.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">暂未找到附近的绿地信息</p>
              <p className="text-sm text-gray-400 mt-2">换个地方试试？</p>
            </div>
          ) : (
            <div className="space-y-3">
              {parks.map((park, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                      <span className="text-2xl">🌳</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">{park.name}</h3>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          {park.distance}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{park.address}</span>
                      </p>
                      
                      {/* 标签行 */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {park.type}
                        </span>
                        {park.rating && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-0.5">
                            ⭐ {park.rating}
                          </span>
                        )}
                        {park.crowdText && (
                          <span className={`text-xs px-2 py-0.5 rounded ${getCrowdColor(park.crowdLevel || '')}`}>
                            👥 {park.crowdText}
                          </span>
                        )}
                        {park.lawnSize && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            🌿 {park.lawnSize}
                          </span>
                        )}
                      </div>
                      
                      {/* 特色设施 */}
                      {park.features && park.features.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {park.features.slice(0, 4).map((feature, i) => (
                            <span key={i} className="text-xs bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded">
                              {feature}
                            </span>
                          ))}
                          {park.features.length > 4 && (
                            <span className="text-xs text-gray-400">+{park.features.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button
            onClick={() => {
              // 可以添加导航功能
              alert('可复制绿地名称到地图应用进行导航');
            }}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            复制绿地名称
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// 推送设置弹窗
function PushSettingsModal({ 
  isOpen, 
  onClose, 
  userId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  userId: number | null;
}) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    pushTime: '09:00',
    pushDays: '1,2,3,4,5'
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchSchedules();
    }
  }, [isOpen, userId]);

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`/api/push?userId=${userId}`);
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch (error) {
      console.error('获取推送计划失败:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !form.title || !form.content) return;

    try {
      await fetch(`/api/push?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: form.title,
          content: form.content,
          pushTime: form.pushTime,
          pushDays: form.pushDays
        })
      });
      setForm({ title: '', content: '', pushTime: '09:00', pushDays: '1,2,3,4,5' });
      setShowForm(false);
      fetchSchedules();
    } catch (error) {
      console.error('创建推送计划失败:', error);
    }
  };

  const toggleSchedule = async (id: number, enabled: boolean) => {
    try {
      await fetch('/api/push', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !enabled })
      });
      fetchSchedules();
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  const deleteSchedule = async (id: number) => {
    try {
      await fetch(`/api/push?id=${id}`, { method: 'DELETE' });
      fetchSchedules();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  if (!isOpen) return null;

  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-500" />
            主动提醒设置
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {!showForm ? (
            <div>
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-3 bg-purple-100 text-purple-600 rounded-xl font-medium hover:bg-purple-200 transition-colors mb-4"
              >
                + 添加新提醒
              </button>
              
              {schedules.length === 0 ? (
                <p className="text-center text-gray-500 py-8">暂无提醒设置</p>
              ) : (
                <div className="space-y-3">
                  {schedules.map(schedule => (
                    <div key={schedule.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{schedule.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{schedule.content}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {schedule.push_time} · {schedule.push_days.split(',').map((d: string) => dayNames[parseInt(d)]).join('、')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSchedule(schedule.id, schedule.enabled)}
                            className={`w-10 h-6 rounded-full transition-colors ${
                              schedule.enabled ? 'bg-purple-500' : 'bg-gray-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                              schedule.enabled ? 'translate-x-4' : 'translate-x-0.5'
                            }`} />
                          </button>
                          <button
                            onClick={() => deleteSchedule(schedule.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提醒标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="如：每日宠物护理提醒"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提醒内容</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({...form, content: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="如：别忘了今天要给球球驱虫哦！"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">推送时间</label>
                <input
                  type="time"
                  value={form.pushTime}
                  onChange={e => setForm({...form, pushTime: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">推送日期</label>
                <div className="flex gap-2 flex-wrap">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        const days = form.pushDays.split(',');
                        if (days.includes(index.toString())) {
                          setForm({...form, pushDays: days.filter(d => d !== index.toString()).join(',')});
                        } else {
                          setForm({...form, pushDays: [...days, index.toString()].sort().join(',')});
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        form.pushDays.includes(index.toString())
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-500 text-white rounded-xl"
                >
                  保存
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// 历史对话列表组件
function ConversationList({ 
  conversations, 
  currentId, 
  onSelect, 
  onNewChat,
  onDelete,
  onClose 
}: {
  conversations: Conversation[];
  currentId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-white border-r">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">对话历史</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={onNewChat}
          className="w-full py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新对话
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">暂无对话记录</p>
        ) : (
          <div className="space-y-1">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`group relative p-3 rounded-xl cursor-pointer transition-colors ${
                  conv.id === currentId 
                    ? 'bg-purple-50 border border-purple-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div 
                  onClick={() => {
                    onSelect(conv.id);
                    onClose();
                  }}
                  className="flex-1"
                >
                  <p className="font-medium text-sm text-gray-800 truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatTime(conv.updatedAt)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { dispatch } = useApp();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [showPushSettings, setShowPushSettings] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [healthAnalysisTarget, setHealthAnalysisTarget] = useState<string | null>(null);

  // 语音录制状态
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  // 宠物确认状态
  const [petConfirmation, setPetConfirmation] = useState<{
    name: string;
    species: string;
    speciesText: string;
    breed: string;
  } | null>(null);
  
  // 日程确认状态
  const [scheduleConfirmation, setScheduleConfirmation] = useState<{
    petId: string;
    petName: string;
    title: string;
    dueDate: string;
    dueDateText: string;
    eventType: string;
    isRecurring?: boolean;
    intervalType?: 'day' | 'week' | 'month' | null;
    intervalValue?: number;
    repeatCount?: number;
  } | null>(null);
  
  // 健康自测状态
  const [showHealthTest, setShowHealthTest] = useState(false);
  
  // 宠物档案查看状态
  const [petProfileView, setPetProfileView] = useState<{
    isSpecific: boolean;
    petId?: string;
    petName?: string;
    petSpecies?: string;
    petBreed?: string;
    petGender?: string;
    petAge?: number | null;
    petWeight?: number | null;
    petAvatar?: string;
    petAllergies?: string;
    petNotes?: string;
    pets?: any[];
  } | null>(null);
  
  // 日程查看弹窗状态
  const [scheduleView, setScheduleView] = useState<{
    schedules: Array<{
      id: string;
      petId: string;
      petName: string;
      title: string;
      eventType: string;
      eventTypeText: string;
      dueDate: string;
      dueDateText: string;
      daysUntil: number;
      daysUntilText: string;
      priority: string;
      status: string;
    }>;
    isFiltered: boolean;
    filterPetName: string | null;
    totalCount: number;
  } | null>(null);

  // 生病确认弹窗状态
  const [sickPetConfirmation, setSickPetConfirmation] = useState<{
    petId: string;
    petName: string;
    symptoms: { category: string; symptom: string }[];
    symptomText: string;
    detectedDate: string;
    recommendedMedications: { name: string; usage: string; notes: string }[];
  } | null>(null);

  // 排便记录确认状态
  const [bowelConfirmation, setBowelConfirmation] = useState<{
    petId: string;
    petName: string;
    recordDate: string;
    type: 'solid' | 'liquid' | 'both';
    typeText: string;
  } | null>(null);

  // 用药提醒设置弹窗状态
  const [medicationReminderSetup, setMedicationReminderSetup] = useState<{
    petId: string;
    petName: string;
    recordId: string;
    diseaseName: string;
    medications: string[];
  } | null>(null);

  // 主动关怀状态
  const [showCareTip, setShowCareTip] = useState(false);
  const [careTipContent, setCareTipContent] = useState('');

  // 户外活动推荐弹窗状态
  const [outdoorActivityRecommend, setOutdoorActivityRecommend] = useState<{
    weather: any;
    suggestion: any;
    locationName: string;
    hasParks: boolean;
    parks: Array<{
      name: string;
      address: string;
      distance: string;
      type: string;
      location: string | null;
      rating?: number;
      features?: string[];
      crowdLevel?: string;
      crowdText?: string;
      lawnSize?: string;
    }>;
  } | null>(null);
  
  // 绿地推荐弹窗状态
  const [parkRecommendationModal, setParkRecommendationModal] = useState<{
    parks: Array<{
      name: string;
      address: string;
      distance: string;
      type: string;
      location: string | null;
      rating?: number;
      features?: string[];
      crowdLevel?: string;
      crowdText?: string;
      lawnSize?: string;
    }>;
    locationName: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取当前对话
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  // 初始化
  useEffect(() => {
    // 检查是否为移动端
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 加载对话历史
  useEffect(() => {
    const { pets: userPets, schedules } = getUserData();
    setHasPets(userPets.length > 0);
    setPets(userPets);
    
    // 获取用户ID
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserId(user.id);
      } catch {}
    }
    
    // 加载对话历史
    const savedConversations = getConversations();
    if (savedConversations.length > 0) {
      setConversations(savedConversations);
      setCurrentConversationId(savedConversations[0].id);
    } else {
      // 创建第一个对话
      const now = new Date();
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const urgentSchedules = (schedules || []).filter((s: any) => {
        if (s.status === 'completed') return false;
        const dueDate = new Date(s.dueDate);
        return dueDate >= now && dueDate <= threeDaysLater;
      });
      const petNames = pets.map((p: any) => p.name).join('、');
      
      const newConv = createNewConversation(pets.length > 0, petNames, urgentSchedules);
      setConversations([newConv]);
      setCurrentConversationId(newConv.id);
    }
  }, []);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 保存对话到localStorage
  const saveCurrentConversation = useCallback((updatedMessages: Message[], convId?: string) => {
    const targetConvId = convId || currentConversationId;
    if (!targetConvId) return;
    
    // 生成标题（取第一条用户消息的前20个字符）
    const firstUserMsg = updatedMessages.find(m => m.role === 'user');
    let title = '新对话';
    if (firstUserMsg) {
      title = firstUserMsg.content.substring(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
    }

    setConversations(prev => {
      const updated = prev.map(c => 
        c.id === targetConvId 
          ? { ...c, messages: updatedMessages, title, updatedAt: new Date() }
          : c
      );
      // 按更新时间排序
      updated.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      saveConversations(updated);
      return updated;
    });
  }, [currentConversationId]);

  // 开始新对话
  const handleNewChat = () => {
    const { pets, schedules } = getUserData();
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const urgentSchedules = (schedules || []).filter((s: any) => {
      if (s.status === 'completed') return false;
      const dueDate = new Date(s.dueDate);
      return dueDate >= now && dueDate <= threeDaysLater;
    });
    const petNames = pets.map((p: any) => p.name).join('、');
    
    const newConv = createNewConversation(pets.length > 0, petNames, urgentSchedules);
    setConversations(prev => {
      const updated = [newConv, ...prev];
      saveConversations(updated);
      return updated;
    });
    setCurrentConversationId(newConv.id);
    setShowConversationList(false);
  };

  // 切换对话
  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setShowConversationList(false);
  };

  // 删除对话
  const handleDeleteConversation = (id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveConversations(updated);
      
      // 如果删除的是当前对话，切换到第一个
      if (id === currentConversationId) {
        setCurrentConversationId(updated[0]?.id || null);
      }
      return updated;
    });
  };

  // 快捷操作处理
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'addPet':
        setInput('我想添加一只新宠物');
        break;
      case 'recordWeight':
        setInput('帮我记录体重');
        break;
      case 'healthAnalysis':
        setInput('帮我做健康分析');
        setShowImageUpload(true);
        break;
      case 'createSchedule':
        setInput('帮我安排护理日程');
        break;
      case 'medicationReminder':
        setInput('开启用药提醒');
        break;
      case 'healthTest':
        setShowHealthTest(true);
        break;
      case 'viewSchedule':
        setInput('查看日程安排');
        break;
      case 'weeklyReport':
        setInput('生成我的每周报告');
        break;
      default:
        break;
    }
  };

  // 图片上传处理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 发送带图片的消息
  const handleSendWithImage = async () => {
    if (!uploadedImage || isLoading) return;
    
    // 如果没有输入文字，使用默认消息
    const analysisMessage = input.trim() || '请帮我分析这张图片';
    
    setShowImageUpload(false);
    
    // 触发发送，使用消息内容作为参数
    await handleSendWithAnalysis(uploadedImage, analysisMessage);
  };

  // ========== 语音录制功能（AudioContext PCM → WAV，全平台兼容） ==========
  
  /** 将 Float32Array PCM 数据编码为 WAV Blob */
  const encodeWAV = (
    samples: Float32Array[], 
    sampleRate: number,
    numChannels: number = 1
  ): Blob => {
    // 合并所有采样数据
    const totalLength = samples.reduce((acc, arr) => acc + arr.length, 0);
    const result = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of samples) {
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        result[offset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
    }

    const dataSize = result.length * 2; // 16-bit = 2 bytes per sample
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    
    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);             // chunk size
    view.setUint16(20, 1, true);               // PCM format
    view.setUint16(22, numChannels, true);     // channels
    view.setUint32(24, sampleRate, true);       // sample rate
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true);  // block align
    view.setUint16(34, 16, true);              // bits per sample
    
    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    
    // 写入 PCM 数据
    let byteOffset = 44;
    for (let i = 0; i < result.length; i++) {
      view.setInt16(byteOffset, result[i], true);
      byteOffset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // 录音相关 ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const isRecordingRef = useRef(false); // 同步ref，用于onaudioprocess回调中判断

  // 开始录音 (AudioContext + ScriptProcessor → 直接输出WAV)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 }); // 智谱推荐16kHz
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      pcmChunksRef.current = [];
      isRecordingRef.current = true; // ← 同步设为true，闭包外也能读到

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return; // 用ref判断（同步值）
        pcmChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      
    } catch (error: any) {
      console.error('[Voice] 录音启动失败:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('请允许访问麦克风权限后再试');
      } else if (error.name === 'NotFoundError') {
        alert('未检测到麦克风设备');
      } else {
        alert(`无法启动录音: ${error.message}`);
      }
    }
  };

  // 停止录音并处理
  const stopRecording = () => {
    if (!audioContextRef.current || !isRecordingRef.current) return;

    isRecordingRef.current = false; // 同步停止收集
    setIsRecording(false);
    setIsProcessingVoice(true);

    try {
      // 停止收集PCM
      const processor = processorRef.current;
      const audioContext = audioContextRef.current;
      const stream = streamRef.current;
      const pcmChunks = [...pcmChunksRef.current]; // 快照

      // 断开连接
      if (processor) { processor.disconnect(); processorRef.current = null; }
      if (stream) stream.getTracks().forEach(t => t.stop());
      
      // 关闭 AudioContext
      setTimeout(() => audioContext.close(), 100);

      // 编码为 WAV
      const wavBlob = encodeWAV(pcmChunks, 16000, 1);
      console.log(`[Voice] WAV生成完成: ${(wavBlob.size / 1024).toFixed(1)}KB`);

      // 发送到后端转写
      const formData = new FormData();
      formData.append('audio', wavBlob, 'recording.wav');

      fetch('/api/voice', { method: 'POST', body: formData })
        .then(res => res.json())
        .then((data: any) => {
          if (data.error) {
            console.error('[Voice] 转写失败:', data.error);
            alert(data.error);
            return;
          }

          if (data.text && data.text.trim()) {
            const recognizedText = data.text.trim();
            
            // 直接发送对话（复用现有 chat API）
            const userMessage: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: `[🎤 语音] ${recognizedText}`,
              timestamp: new Date(),
            };
            const newMessages = [...messages, userMessage];
            saveCurrentConversation(newMessages);
            setInput('');
            setIsLoading(true);

            fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [{ role: 'user', content: recognizedText }],
                userData: getUserData(),
                userId,
                sessionId,
              }),
            })
              .then(res => res.json())
              .then((chatData: any) => {
                if (chatData.sessionId) {
                  setSessionId(chatData.sessionId);
                  localStorage.setItem('chatSessionId', chatData.sessionId);
                }
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: chatData.reply,
                  timestamp: new Date(),
                  contextUsed: chatData.contextUsed,
                };
                saveCurrentConversation([...newMessages, assistantMessage]);
                if (chatData.petConfirmation) setPetConfirmation(chatData.petConfirmation);
                if (chatData.scheduleConfirmation) setScheduleConfirmation(chatData.scheduleConfirmation);
                if (chatData.petProfileView) setPetProfileView(chatData.petProfileView);
              })
              .catch((error: any) => {
                const errorMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: `😿 抱歉，${error.message || '语音处理失败，请重试。'}`,
                  timestamp: new Date(),
                };
                saveCurrentConversation([...newMessages, errorMessage]);
              })
              .finally(() => setIsLoading(false));
          }
        })
        .catch((err: any) => {
          console.error('[Voice] 发送失败:', err);
          alert('语音处理失败，请重试');
        })
        .finally(() => setIsProcessingVoice(false));

    } catch (err) {
      console.error('[Voice] 处理录音出错:', err);
      alert('语音处理失败，请重试');
      setIsProcessingVoice(false);
    }
  };

  // 发送带分析的消息
  const handleSendWithAnalysis = async (imageData: string, messageContent?: string) => {
    // 使用传入的消息内容或当前输入
    const content = messageContent || input.trim();
    if (!content || isLoading || !currentConversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    saveCurrentConversation(newMessages);
    setInput('');
    setUploadedImage(null);
    setIsLoading(true);

    try {
      const userData = getUserData();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          userData,
          userId,
          sessionId,
          imageData: imageData,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('chatSessionId', data.sessionId);
      }

      // 检查是否需要宠物确认
      if (data.petConfirmation) {
        setPetConfirmation(data.petConfirmation);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        contextUsed: data.contextUsed,
      };

      const finalMessages = [...newMessages, assistantMessage];
      saveCurrentConversation(finalMessages);

      if (data.scheduleCreated || data.petCreated || data.weightRecorded) {
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
      }
      if (data.medicationReminderCreated) {
        window.dispatchEvent(new CustomEvent('medicationReminderCreated'));
        
        // 添加用药提醒通知
        if (data.medicationReminderInfo) {
          const reminder = data.medicationReminderInfo;
          const notification = {
            id: `notif-med-${Date.now()}`,
            petId: reminder.pet_id || '',
            petName: reminder.pet_name || '',
            title: `用药提醒 💊`,
            message: `${reminder.pet_name || '宠物'}的${reminder.disease_name}，下次用药时间：${new Date(reminder.next_dose_time).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            type: 'reminder' as const,
            read: false,
            createdAt: new Date().toISOString(),
          };
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `😿 抱歉，${error.message || 'AI服务暂时不可用，请稍后再试。'}`,
        timestamp: new Date(),
      };
      const finalMessages = [...newMessages, errorMessage];
      saveCurrentConversation(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 确认添加宠物
  const handleConfirmAddPet = async (petInfo: { name: string; species: string; breed: string }) => {
    if (!currentConversationId) return;
    
    const speciesText = petInfo.species === 'dog' ? '🐕 狗狗' : '🐱 猫咪';
    
    // 立即清除确认卡片
    setPetConfirmation(null);
    
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '正在创建宠物档案...',
      timestamp: new Date(),
    };
    
    // 保存加载中的消息
    const loadingMessages = [...messages, loadingMessage];
    saveCurrentConversation(loadingMessages);
    
    try {
      const response = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: petInfo.name,
          species: petInfo.species,
          breed: petInfo.breed,
          userId: userId,
        }),
      });
      
      if (response.ok) {
        const newPet = await response.json();
        
        // 更新消息 - 替换加载中的消息
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `🎉 太棒了！${speciesText} ${petInfo.name} 的档案已创建成功！

现在它是家庭的一员啦！🐾

你可以继续告诉我更多信息：
• 生日/年龄（帮我计算疫苗时间）
• 体重（记录健康成长）
• 身体状况

有什么需要帮忙的吗？`,
          timestamp: new Date(),
        };
        
        const updatedMessages = loadingMessages.map(m => 
          m.id === loadingMessage.id ? successMessage : m
        );
        saveCurrentConversation(updatedMessages);
        
        // 刷新主页数据
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
        setHasPets(true);
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '😅 创建宠物档案失败了，请稍后重试或者手动在宠物档案页面添加～',
        timestamp: new Date(),
      };
      const updatedMessages = loadingMessages.map(m => 
        m.id === loadingMessage.id ? errorMsg : m
      );
      saveCurrentConversation(updatedMessages);
    }
  };
  
  // 取消添加宠物
  const handleCancelAddPet = () => {
    setPetConfirmation(null);
    setInput('修改信息');
  };

  // ========== 生病记录处理 ==========
  // 确认生病记录
  const handleConfirmSickPet = async (data: {
    petId: string;
    petName: string;
    symptomText: string;
    detectedDate: string;
    medications: string[];
  }) => {
    if (!currentConversationId) return;

    // 立即清除确认卡片
    setSickPetConfirmation(null);

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '正在创建病历记录...',
      timestamp: new Date(),
    };

    const loadingMessages = [...messages, loadingMessage];
    saveCurrentConversation(loadingMessages);

    try {
      // 创建病历记录
      const response = await fetch('/api/health-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: data.petId,
          type: 'other',
          title: `${data.petName} - ${data.symptomText}`,
          description: `症状：${data.symptomText}`,
          medications: data.medications,
        }),
      });

      if (response.ok) {
        const record = await response.json();

        // 生成关怀消息（不依赖天气数据）
        const careMessage = generateCareMessage(undefined);
        const festivalTip = '';

        // 更新消息
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `📋 病历记录已保存！

宠物：${data.petName}
日期：${new Date(data.detectedDate).toLocaleDateString('zh-CN')}
症状：${data.symptomText}
${data.medications.length > 0 ? `用药：${data.medications.join('、')}` : ''}

😟 希望${data.petName}快点好起来～${careMessage}${festivalTip}

需要我为 ${data.petName} 设置用药提醒吗？这样就不会忘记按时吃药啦～`,
          timestamp: new Date(),
        };

        const updatedMessages = loadingMessages.map(m =>
          m.id === loadingMessage.id ? successMessage : m
        );
        saveCurrentConversation(updatedMessages);

        // 保存成功后询问是否设置用药提醒
        if (data.medications.length > 0) {
          setMedicationReminderSetup({
            petId: data.petId,
            petName: data.petName,
            recordId: record.id,
            diseaseName: data.symptomText,
            medications: data.medications,
          });
        }

        // 刷新主页数据
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '😅 创建病历记录失败了，请稍后重试～',
        timestamp: new Date(),
      };
      const updatedMessages = loadingMessages.map(m =>
        m.id === loadingMessage.id ? errorMsg : m
      );
      saveCurrentConversation(updatedMessages);
    }
  };

  // 取消生病记录
  const handleCancelSickPet = () => {
    setSickPetConfirmation(null);
    setInput('好的，知道了');
  };

  // ========== 排便记录处理 ==========
  // 确认排便记录
  const handleConfirmBowel = async (data: {
    petId: string;
    petName: string;
    recordDate: string;
    type: 'solid' | 'liquid' | 'both';
    size: 'small' | 'medium' | 'large';
  }) => {
    if (!currentConversationId) return;

    // 立即清除确认卡片
    setBowelConfirmation(null);

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '正在记录排便情况...',
      timestamp: new Date(),
    };

    const loadingMessages = [...messages, loadingMessage];
    saveCurrentConversation(loadingMessages);

    try {
      // 创建排泄记录
      const response = await fetch('/api/bathroom-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: data.petId,
          record_date: data.recordDate,
          type: data.type,
          size: data.size,
        }),
      });

      if (response.ok) {
        // 获取颜色描述
        const sizeColorMap: Record<string, string> = {
          small: '绿色（正常）',
          medium: '黄色（中等）',
          large: '红色（大量）'
        };
        const typeTextMap: Record<string, string> = {
          solid: '大便',
          liquid: '小便',
          both: '都有'
        };
        
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ 已记录${data.petName}的排便情况！

💩 类型：${typeTextMap[data.type]}
📊 量级：${sizeColorMap[data.size]}
📅 日期：${data.recordDate}

排便记录已保存到健康监控中，可以随时查看历史记录哦～🐾`,
          timestamp: new Date(),
        };

        const updatedMessages = loadingMessages.map(m =>
          m.id === loadingMessage.id ? successMessage : m
        );
        saveCurrentConversation(updatedMessages);

        // 刷新主页数据
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '😅 记录排便情况失败了，请稍后重试～',
        timestamp: new Date(),
      };
      const updatedMessages = loadingMessages.map(m =>
        m.id === loadingMessage.id ? errorMsg : m
      );
      saveCurrentConversation(updatedMessages);
    }
  };

  // 取消排便记录
  const handleCancelBowel = () => {
    setBowelConfirmation(null);
    setInput('好的');
  };

  // ========== 用药提醒设置处理 ==========
  // 确认用药提醒设置
  const handleConfirmMedicationReminder = async (data: {
    intervalHours: number;
    frequency: number;
    totalDoses: number;
  }) => {
    if (!medicationReminderSetup) return;

    const { petId, petName, diseaseName, medications } = medicationReminderSetup;

    // 关闭弹窗
    setMedicationReminderSetup(null);

    try {
      // 计算下次用药时间
      const nextDoseTime = new Date();
      nextDoseTime.setTime(nextDoseTime.getTime() + data.intervalHours * 60 * 60 * 1000);

      // 创建用药提醒
      const response = await fetch('/api/medication-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: petId,
          disease_name: diseaseName,
          medications: medications,
          frequency: data.frequency,
          interval_hours: data.intervalHours,
          next_dose_time: nextDoseTime.toISOString().slice(0, 19).replace('T', ' '),
          total_doses: data.totalDoses,
          remaining_doses: data.totalDoses,
        }),
      });

      if (response.ok) {
        const reminder = await response.json();

        // 发送成功消息（带关怀）
        const careMessage = generateCareMessage(undefined);

        const successMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ 用药提醒已设置！

${petName}的${diseaseName}用药提醒已开启 💊

• 每天 ${data.frequency} 次
• 每隔 ${data.intervalHours} 小时
• 共 ${data.totalDoses} 次

主页会显示下次用药时间，记得按时服药哦～🐾${careMessage}`,
          timestamp: new Date(),
        };

        const updatedMessages = [...messages, successMsg];
        saveCurrentConversation(updatedMessages);

        // 触发用药提醒事件
        window.dispatchEvent(new CustomEvent('medicationReminderCreated'));
        
        // 添加用药提醒通知
        const nextDoseTime = new Date(Date.now() + (data.intervalHours || 8) * 60 * 60 * 1000);
        const notification = {
          id: `notif-med-${Date.now()}`,
          petId: medicationReminderSetup.petId,
          petName: petName,
          title: `用药提醒 💊`,
          message: `${petName}的${diseaseName}，下次用药时间：${nextDoseTime.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          type: 'reminder' as const,
          read: false,
          createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      }
    } catch (error) {
      console.error('创建用药提醒失败:', error);
    }
  };

  // 取消用药提醒设置
  const handleCancelMedicationReminder = () => {
    setMedicationReminderSetup(null);
  };
  
  // 确认添加日程（支持重复日程）
  const handleConfirmSchedule = async (scheduleInfo: { 
    petId: string; 
    title: string; 
    dueDate: string; 
    eventType: string;
    isRecurring?: boolean;
    intervalType?: string | null;
    intervalValue?: number;
    repeatCount?: number;
  }) => {
    if (!currentConversationId) return;
    
    // 立即清除确认卡片
    setScheduleConfirmation(null);
    
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '正在添加护理日程...',
      timestamp: new Date(),
    };
    
    // 保存加载中的消息
    const loadingMessages = [...messages, loadingMessage];
    saveCurrentConversation(loadingMessages);
    
    try {
      // 如果是重复日程，创建多个日程
      if (scheduleInfo.isRecurring && scheduleInfo.repeatCount && scheduleInfo.repeatCount > 1) {
        const createdSchedules: string[] = [];
        let currentDate = new Date(scheduleInfo.dueDate);
        
        for (let i = 0; i < scheduleInfo.repeatCount; i++) {
          const dueDateStr = currentDate.toISOString().split('T')[0];
          
          const response = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pet_id: scheduleInfo.petId,
              title: scheduleInfo.title,
              due_date: dueDateStr,
              event_type: scheduleInfo.eventType,
              priority: 'medium',
              reminder_enabled: true,
            }),
          });
          
          if (response.ok) {
            const dateStr = currentDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
            createdSchedules.push(dateStr);
          }
          
          // 计算下一个日期
          if (i < scheduleInfo.repeatCount - 1) {
            if (scheduleInfo.intervalType === 'day') {
              currentDate = new Date(currentDate.getTime() + (scheduleInfo.intervalValue || 1) * 24 * 60 * 60 * 1000);
            } else if (scheduleInfo.intervalType === 'week') {
              currentDate = new Date(currentDate.getTime() + (scheduleInfo.intervalValue || 1) * 7 * 24 * 60 * 60 * 1000);
            } else if (scheduleInfo.intervalType === 'month') {
              currentDate.setMonth(currentDate.getMonth() + (scheduleInfo.intervalValue || 1));
            }
          }
        }
        
        // 更新消息
        const intervalNames: Record<string, string> = {
          'day': '天',
          'week': '周',
          'month': '月',
        };
        
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `🎉 护理日程已添加成功！共创建${scheduleInfo.repeatCount}次重复日程！

📅 ${scheduleInfo.title}
📆 频率：每${scheduleInfo.intervalValue}${intervalNames[scheduleInfo.intervalType || 'day']}一次
📊 共${scheduleInfo.repeatCount}次

${generateCareMessage(undefined)}

你可以在护理日程页面查看和管理所有日程～

还有其他需要帮忙的吗？🐾`,
          timestamp: new Date(),
        };
        
        const updatedMessages = loadingMessages.map(m => 
          m.id === loadingMessage.id ? successMessage : m
        );
        saveCurrentConversation(updatedMessages);
        
        // 刷新主页数据
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
        
      } else {
        // 单次日程
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_id: scheduleInfo.petId,
            title: scheduleInfo.title,
            due_date: scheduleInfo.dueDate,
            event_type: scheduleInfo.eventType,
            priority: 'medium',
            reminder_enabled: true,
          }),
        });
        
        if (response.ok) {
          const dateStr = new Date(scheduleInfo.dueDate).toLocaleDateString('zh-CN', {
            month: 'long',
            day: 'numeric',
          });
          
          // 更新消息 - 替换加载中的消息
          const successMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `🎉 护理日程已添加成功！

📅 ${scheduleInfo.title}
📆 日期：${dateStr}
⏰ 已设置提醒

${generateCareMessage(undefined)}

你可以在护理日程页面查看和管理所有日程～

还有其他需要帮忙的吗？🐾`,
            timestamp: new Date(),
          };
          
          const updatedMessages = loadingMessages.map(m => 
            m.id === loadingMessage.id ? successMessage : m
          );
          saveCurrentConversation(updatedMessages);
          
          // 刷新主页数据
          window.dispatchEvent(new CustomEvent('appDataRefresh'));
        } else {
          throw new Error('创建失败');
        }
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '😅 创建护理日程失败了，请稍后重试或者手动在护理日程页面添加～',
        timestamp: new Date(),
      };
      const updatedMessages = loadingMessages.map(m => 
        m.id === loadingMessage.id ? errorMsg : m
      );
      saveCurrentConversation(updatedMessages);
    }
  };
  
  // 取消添加日程
  const handleCancelSchedule = () => {
    setScheduleConfirmation(null);
  };
  
  // 处理宠物档案查看 - 选择特定宠物
  const handleSelectPetForView = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    if (pet) {
      setPetProfileView({
        isSpecific: true,
        petId: pet.id,
        petName: pet.name,
        petSpecies: pet.species,
        petBreed: pet.breed || '',
        petGender: pet.gender || '',
        petAge: pet.age,
        petWeight: pet.weight,
        petAvatar: pet.avatar || '',
        petAllergies: pet.allergies || '',
        petNotes: pet.notes || '',
      });
    }
  };
  
  // 处理宠物档案修改
  const handleEditPetProfile = (petId: string) => {
    // 关闭卡片并触发修改（可以通过路由跳转或其他方式）
    setPetProfileView(null);
    // 可以导航到宠物详情页
    window.location.href = '/pets';
  };
  
  // 关闭宠物档案卡片
  const handleClosePetProfile = () => {
    setPetProfileView(null);
  };

  // 发送消息
  const handleSend = async () => {
    // 如果有上传的图片，调用图片发送函数
    if (uploadedImage) {
      handleSendWithImage();
      return;
    }
    
    if (!input.trim() || isLoading || !currentConversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    saveCurrentConversation(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const userData = getUserData();
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          userData,
          userId,
          sessionId
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // 保存会话ID
      if (data.sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem('chatSessionId', data.sessionId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        contextUsed: data.contextUsed,
      };

      const finalMessages = [...newMessages, assistantMessage];
      saveCurrentConversation(finalMessages);

      // 检查是否需要宠物确认
      if (data.petConfirmation) {
        setPetConfirmation(data.petConfirmation);
      }
      
      // 检查是否需要日程确认
      if (data.scheduleConfirmation) {
        setScheduleConfirmation(data.scheduleConfirmation);
      }
      
      // 检查是否需要显示宠物档案
      if (data.petProfileView) {
        setPetProfileView(data.petProfileView);
      }
      
      // 检查是否需要显示日程安排
      if (data.scheduleView) {
        setScheduleView(data.scheduleView);
      }
      
      // 检查是否需要显示户外活动推荐
      if (data.outdoorActivityRecommend) {
        setOutdoorActivityRecommend(data.outdoorActivityRecommend);
      }

      // 检查是否需要显示生病确认卡片
      if (data.sickPetConfirmation) {
        setSickPetConfirmation(data.sickPetConfirmation);
      }

      // 检查是否需要显示排便记录确认卡片
      if (data.bowelConfirmation) {
        setBowelConfirmation(data.bowelConfirmation);
      }

      // 如果创建了日程，刷新本地日程数据
      if (data.scheduleCreated) {
        // 触发 AppContext 刷新数据
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
      }
      
      // 如果创建了用药提醒，刷新主页的用药提醒数据
      if (data.medicationReminderCreated) {
        // 触发主页刷新用药提醒数据
        window.dispatchEvent(new CustomEvent('medicationReminderCreated'));
        
        // 添加用药提醒通知
        if (data.medicationReminderInfo) {
          const reminder = data.medicationReminderInfo;
          const notification = {
            id: `notif-med-${Date.now()}`,
            petId: reminder.pet_id || '',
            petName: reminder.pet_name || '',
            title: `用药提醒 💊`,
            message: `${reminder.pet_name || '宠物'}的${reminder.disease_name}，下次用药时间：${new Date(reminder.next_dose_time).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            type: 'reminder' as const,
            read: false,
            createdAt: new Date().toISOString(),
          };
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
        }
      }
      
      // 如果创建了宠物，刷新主页数据并更新hasPets状态
      if (data.petCreated) {
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
        setHasPets(true);
      }
      
      // 如果记录了体重，刷新主页数据
      if (data.weightRecorded) {
        window.dispatchEvent(new CustomEvent('appDataRefresh'));
      }
      
      // 如果需要健康分析，显示图片上传
      if (data.healthAnalysisNeeded) {
        setHealthAnalysisTarget(data.healthAnalysisPetInfo?.petName || null);
        setShowImageUpload(true);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `😿 抱歉，${error.message || 'AI服务暂时不可用，请稍后再试。'}`,
        timestamp: new Date(),
      };
      const finalMessages = [...newMessages, errorMessage];
      saveCurrentConversation(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <ChatLayout>
    <div className="h-full flex flex-col relative">
        {/* Data indicator */}
        {hasPets && (
          <div className="shrink-0 bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center gap-2 text-xs text-emerald-600">
            <Database className="w-3.5 h-3.5" />
            <span>已同步宠物档案 · 长期记忆已启用</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1">
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-primary-400 to-accent-500 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>

                    {/* Context indicator */}
                    {message.role === 'assistant' && message.contextUsed && (
                      <div className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full w-fit">
                        <Info className="w-3 h-3" />
                        <span>已读取宠物档案</span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-xs text-gray-400 px-1">
                      {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>正在思考...</span>
                    <Sparkles className="w-4 h-4 text-primary-400 animate-pulse" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
          
          {/* 宠物确认卡片 */}
          <AnimatePresence>
            {petConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start mt-4"
              >
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <PetConfirmationCard
                      petInfo={petConfirmation}
                      onConfirm={handleConfirmAddPet}
                      onCancel={handleCancelAddPet}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 日程确认卡片 */}
          <AnimatePresence>
            {scheduleConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start mt-4"
              >
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <ScheduleConfirmationCard
                      scheduleInfo={scheduleConfirmation}
                      onConfirm={handleConfirmSchedule}
                      onCancel={handleCancelSchedule}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 生病确认卡片 */}
          <AnimatePresence>
            {sickPetConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start mt-4"
              >
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <SickPetConfirmCard
                      sickPetInfo={sickPetConfirmation}
                      onConfirm={handleConfirmSickPet}
                      onCancel={handleCancelSickPet}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 排便记录确认卡片 */}
          <AnimatePresence>
            {bowelConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start mt-4"
              >
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <BowelConfirmationCard
                      bowelInfo={bowelConfirmation}
                      onConfirm={handleConfirmBowel}
                      onCancel={handleCancelBowel}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 用药提醒设置卡片 */}
          <AnimatePresence>
            {medicationReminderSetup && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start mt-4"
              >
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <MedicationReminderSetupCard
                      petInfo={{ petId: medicationReminderSetup.petId, petName: medicationReminderSetup.petName }}
                      recordInfo={{ recordId: medicationReminderSetup.recordId, diseaseName: medicationReminderSetup.diseaseName, medications: medicationReminderSetup.medications }}
                      onConfirm={handleConfirmMedicationReminder}
                      onCancel={handleCancelMedicationReminder}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* 宠物档案查看卡片 */}
          <AnimatePresence>
            {petProfileView && petProfileView.isSpecific && petProfileView.petId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start mt-4"
              >
                <PetProfileCard
                  petData={petProfileView as any}
                  onEdit={handleEditPetProfile}
                  onClose={handleClosePetProfile}
                />
              </motion.div>
            )}
            {petProfileView && !petProfileView.isSpecific && petProfileView.pets && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start mt-4"
              >
                <AllPetsCard
                  pets={petProfileView.pets}
                  onSelectPet={handleSelectPetForView}
                  onClose={handleClosePetProfile}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Actions - 仅空聊天时显示 */}
        {showQuickActions && messages.length === 0 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickQuestion(q.text)}
                  className="text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors active:scale-95"
                >
                  {q.icon} {q.text}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-2 mt-3">快捷操作：</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickAction('addPet')}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-full text-primary-600 hover:bg-primary-100 transition-colors active:scale-95"
              >
                <PawPrint className="w-3.5 h-3.5" /> 添加宠物
              </button>
              <button
                onClick={() => handleQuickAction('weeklyReport')}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-600 hover:bg-indigo-100 transition-colors active:scale-95"
              >
                <BarChart3 className="w-3.5 h-3.5" /> 每周报告
              </button>
              <button
                onClick={() => handleQuickAction('createSchedule')}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-600 hover:bg-amber-100 transition-colors active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" /> 护理日程
              </button>
              <button
                onClick={() => handleQuickAction('recordWeight')}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-600 hover:bg-emerald-100 transition-colors active:scale-95"
              >
                <Scale className="w-3.5 h-3.5" /> 体重
              </button>
              <button
                onClick={() => handleQuickAction('healthAnalysis')}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-red-600 hover:bg-red-100 transition-colors active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" /> 健康分析
              </button>
              <button
                onClick={() => handleQuickAction('viewSchedule')}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-orange-600 hover:bg-orange-100 transition-colors active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" /> 查看日程
              </button>
            </div>
          </div>
        )}

        {/* 图片上传区域 */}
        {showImageUpload && (
          <div className="px-4 pb-2">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-primary-600 font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {healthAnalysisTarget ? `为 ${healthAnalysisTarget} 上传照片` : '上传照片进行分析'}
                </p>
                <button 
                  onClick={() => { setShowImageUpload(false); setUploadedImage(null); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {uploadedImage ? (
                <div className="relative">
                  <img 
                    src={uploadedImage} 
                    alt="上传的照片" 
                    className="w-full h-40 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute top-2 right-2 p-1 bg-black/20 rounded-full shadow"
                  >
                    <X className="w-4 h-4 text-white/80" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Image className="w-8 h-8 text-primary-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">点击上传图片</p>
                  <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG 格式</p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {uploadedImage && (
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="描述一下照片内容（可选）..."
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:border-primary-400 focus:outline-none"
                  />
                  <button
                    onClick={handleSendWithImage}
                    disabled={isLoading}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors active:scale-95"
                  >
                    发送
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            {/* 图片按钮 */}
            <button
              onClick={() => setShowImageUpload(!showImageUpload)}
              className={`p-2.5 rounded-full transition-colors ${
                showImageUpload 
                  ? 'bg-primary-100 text-primary-500' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
              }`}
              title="上传图片"
            >
              <Image className="w-[18px] h-[18px]" />
            </button>

            {/* 麦克风按钮 - 固定在输入框左侧 */}
            {isRecording ? (
              <button
                onMouseUp={stopRecording}
                onTouchEnd={stopRecording}
                onMouseLeave={() => { if (isRecording) stopRecording(); }}
                className="p-2.5 rounded-full bg-red-500 text-white shadow-md shadow-red-500/30 transition-colors"
                title="松开结束录音"
              >
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                <MicOff className="w-[18px] h-[18px] relative z-10" />
              </button>
            ) : (
              <button
                onMouseDown={() => startRecording()}
                onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                disabled={isLoading || isProcessingVoice}
                className={`p-2.5 rounded-full transition-colors ${
                  isProcessingVoice 
                    ? 'bg-primary-100 text-primary-500' 
                    : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 active:bg-emerald-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="按住说话"
              >
                {isProcessingVoice ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                ) : (
                  <Mic className="w-[18px] h-[18px]" />
                )}
              </button>
            )}
            
            {/* 文本输入 */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={isRecording ? "🎤 正在录音，松开发送..." : isProcessingVoice ? "正在识别语音..." : "输入你的问题或下达指令..."}
              className={`flex-1 px-4 py-2.5 rounded-full bg-gray-50 border border-transparent text-gray-800 text-sm placeholder-gray-400 focus:border-primary-300 focus:bg-white focus:outline-none transition-all ${
                isRecording ? 'border-red-300 bg-red-50 animate-pulse' : ''
              }`}
              disabled={isLoading || isRecording}
            />

            {/* 发送按钮 */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      {/* Push Settings Modal */}
      <PushSettingsModal 
        isOpen={showPushSettings} 
        onClose={() => setShowPushSettings(false)}
        userId={userId}
      />

      {/* 健康自测弹窗 */}
      <HealthSelfTestModal
        isOpen={showHealthTest}
        onClose={() => setShowHealthTest(false)}
        pets={pets}
        onComplete={(petId, petName, species, score, result) => {
          console.log(`健康自测完成: ${petName}, ${species}, ${score}分, ${result}`);
        }}
      />

      {/* 日程查看弹窗 */}
      <ScheduleViewModal
        isOpen={!!scheduleView}
        onClose={() => setScheduleView(null)}
        scheduleView={scheduleView}
      />
      
      {/* 户外活动推荐弹窗 */}
      <OutdoorActivityRecommendModal
        isOpen={!!outdoorActivityRecommend}
        onClose={() => setOutdoorActivityRecommend(null)}
        outdoorActivityRecommend={outdoorActivityRecommend}
        onSelectOption={(option) => {
          if (option === 'park' && outdoorActivityRecommend) {
            setOutdoorActivityRecommend(null);
            setParkRecommendationModal({
              parks: outdoorActivityRecommend.parks,
              locationName: outdoorActivityRecommend.locationName,
            });
          } else if (option === 'walk') {
            setOutdoorActivityRecommend(null);
          }
        }}
        onShowCareTip={(message) => {
          setCareTipContent(message);
          setShowCareTip(true);
        }}
      />
      
      {/* 绿地推荐弹窗 */}
      <ParkRecommendationModal
        isOpen={!!parkRecommendationModal}
        onClose={() => setParkRecommendationModal(null)}
        parks={parkRecommendationModal?.parks || []}
        locationName={parkRecommendationModal?.locationName || ''}
      />
    </div>
    </ChatLayout>
  );
}
