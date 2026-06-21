'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { Calendar, Check, Clock, AlertCircle, TrendingUp, Plus, ChevronLeft, ChevronRight, Filter, X, Edit2, Trash2 } from 'lucide-react';
import { CareSchedule } from '@/types';

const EVENT_TYPES = [
  { value: 'vaccination', label: '💉 疫苗接种', color: 'bg-purple-100 text-purple-600' },
  { value: 'parasite_prevention', label: '🛡️ 驱虫护理', color: 'bg-green-100 text-green-600' },
  { value: 'wellness_exam', label: '🏥 健康检查', color: 'bg-blue-100 text-blue-600' },
  { value: 'dental_care', label: '🦷 牙齿护理', color: 'bg-amber-100 text-amber-600' },
  { value: 'grooming', label: '✂️ 美容护理', color: 'bg-pink-100 text-pink-600' },
  { value: 'feeding', label: '🍖 喂食计划', color: 'bg-orange-100 text-orange-600' },
  { value: 'exercise', label: '🏃 运动锻炼', color: 'bg-cyan-100 text-cyan-600' },
  { value: 'other', label: '📋 其他护理', color: 'bg-gray-100 text-gray-600' },
];

const PRIORITIES = [
  { value: 'high', label: '高', color: 'bg-red-100 text-red-600' },
  { value: 'medium', label: '中', color: 'bg-amber-100 text-amber-600' },
  { value: 'low', label: '低', color: 'bg-green-100 text-green-600' },
];

export default function SchedulePage() {
  const { state, selectedPet, completeSchedule, generateSchedulesForPet, dispatch } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<CareSchedule | null>(null);
  
  // 新建日程表单
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'vaccination',
    dueDate: '',
    dueTime: '09:00',
    priority: 'medium',
    petId: '',
  });

  const petSchedules = state.careSchedules
    .filter((s) => !selectedPet || s.petId === selectedPet.id)
    .filter((s) => filterStatus === 'all' || s.status === filterStatus)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const pendingCount = petSchedules.filter((s) => s.status === 'pending').length;
  const completedCount = petSchedules.filter((s) => s.status === 'completed').length;
  const urgentCount = petSchedules.filter((s) => {
    if (s.status !== 'pending') return false;
    const daysUntil = Math.ceil((new Date(s.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 3 && daysUntil >= 0;
  }).length;

  // 打开添加弹窗
  const openAddModal = (date?: Date) => {
    const targetDate = date || new Date();
    setSelectedDate(targetDate);
    setFormData({
      title: '',
      description: '',
      eventType: 'vaccination',
      dueDate: targetDate.toISOString().split('T')[0],
      dueTime: '09:00',
      priority: 'medium',
      petId: selectedPet?.id || state.pets[0]?.id || '',
    });
    setShowAddModal(true);
  };

  // 打开编辑弹窗
  const openEditModal = (schedule: CareSchedule) => {
    const dueDate = schedule.dueDate || '';
    const dateStr = dueDate.split('T')[0] || '';
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      eventType: schedule.eventType,
      dueDate: dateStr,
      dueTime: schedule.dueDate.includes('T') ? schedule.dueDate.split('T')[1]?.substring(0, 5) || '09:00' : '09:00',
      priority: schedule.priority,
      petId: schedule.petId,
    });
    setEditingSchedule(schedule);
    setShowAddModal(true);
  };

  // 提交表单 - 保存到数据库
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.petId || !formData.dueDate) {
      alert('请填写标题、选择宠物和日期');
      return;
    }

    const dueDateTime = `${formData.dueDate}T${formData.dueTime}:00`;

    try {
      if (editingSchedule) {
        // 更新日程 - 调用API保存到数据库
        const response = await fetch('/api/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSchedule.id,
            pet_id: formData.petId,
            title: formData.title,
            description: formData.description,
            event_type: formData.eventType,
            due_date: dueDateTime,
            priority: formData.priority,
          }),
        });
        
        if (response.ok) {
          const updated = await response.json();
          // 映射数据库字段到前端字段
          dispatch({
            type: 'UPDATE_SCHEDULE',
            payload: {
              ...editingSchedule,
              petId: updated.pet_id,
              title: updated.title,
              description: updated.description,
              eventType: updated.event_type,
              dueDate: updated.due_date,
              priority: updated.priority,
            },
          });
        } else {
          // API失败时降级到本地
          dispatch({
            type: 'UPDATE_SCHEDULE',
            payload: {
              ...editingSchedule,
              title: formData.title,
              description: formData.description,
              eventType: formData.eventType as CareSchedule['eventType'],
              dueDate: dueDateTime,
              priority: formData.priority as CareSchedule['priority'],
              petId: formData.petId,
            },
          });
        }
      } else {
        // 新增日程 - 调用API保存到数据库
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pet_id: formData.petId,
            title: formData.title,
            description: formData.description,
            event_type: formData.eventType,
            due_date: dueDateTime,
            priority: formData.priority,
          }),
        });
        
        if (response.ok) {
          const newSchedule = await response.json();
          // 映射数据库字段到前端字段
          dispatch({ 
            type: 'ADD_SCHEDULE', 
            payload: {
              id: newSchedule.id,
              petId: newSchedule.pet_id,
              title: newSchedule.title,
              description: newSchedule.description,
              eventType: newSchedule.event_type,
              dueDate: newSchedule.due_date,
              status: newSchedule.status || 'pending',
              priority: newSchedule.priority,
            }
          });
        } else {
          // API失败时降级到本地
          const newSchedule: CareSchedule = {
            id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            petId: formData.petId,
            title: formData.title,
            description: formData.description,
            eventType: formData.eventType as CareSchedule['eventType'],
            dueDate: dueDateTime,
            status: 'pending',
            priority: formData.priority as CareSchedule['priority'],
          };
          dispatch({ type: 'ADD_SCHEDULE', payload: newSchedule });
        }
      }
    } catch (error) {
      console.error('保存日程失败:', error);
      // 网络错误时降级到本地
      if (editingSchedule) {
        dispatch({
          type: 'UPDATE_SCHEDULE',
          payload: {
            ...editingSchedule,
            title: formData.title,
            description: formData.description,
            eventType: formData.eventType as CareSchedule['eventType'],
            dueDate: dueDateTime,
            priority: formData.priority as CareSchedule['priority'],
            petId: formData.petId,
          },
        });
      } else {
        const newSchedule: CareSchedule = {
          id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          petId: formData.petId,
          title: formData.title,
          description: formData.description,
          eventType: formData.eventType as CareSchedule['eventType'],
          dueDate: dueDateTime,
          status: 'pending',
          priority: formData.priority as CareSchedule['priority'],
        };
        dispatch({ type: 'ADD_SCHEDULE', payload: newSchedule });
      }
    }

    setShowAddModal(false);
    setEditingSchedule(null);
  };

  // 删除日程 - 调用API从数据库删除
  const deleteSchedule = async (id: string) => {
    if (!confirm('确定要删除这个日程吗？')) return;
    
    try {
      const response = await fetch(`/api/schedules?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        dispatch({
          type: 'SET_SCHEDULES',
          payload: state.careSchedules.filter((s) => s.id !== id),
        });
      } else {
        // API失败时降级到本地
        dispatch({
          type: 'SET_SCHEDULES',
          payload: state.careSchedules.filter((s) => s.id !== id),
        });
      }
    } catch (error) {
      console.error('删除日程失败:', error);
      // 网络错误时降级到本地
      dispatch({
        type: 'SET_SCHEDULES',
        payload: state.careSchedules.filter((s) => s.id !== id),
      });
    }
  };

  const getDaysUntil = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'vaccination':
        return <TrendingUp className="w-5 h-5" />;
      case 'parasite_prevention':
        return <Clock className="w-5 h-5" />;
      case 'grooming':
        return <Edit2 className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    const type = EVENT_TYPES.find((t) => t.value === eventType);
    return type?.color || 'bg-gray-100 text-gray-600';
  };

  const getEventTypeName = (eventType: string) => {
    const type = EVENT_TYPES.find((t) => t.value === eventType);
    return type?.label.replace(/^[^\s]+\s/, '') || '其他护理';
  };

  const formatDate = (date: string | undefined | null) => {
    if (!date) return { day: 1, month: 1, year: 1970, weekday: '日', time: '' };
    const d = new Date(date);
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      weekday: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
      time: date.includes('T') ? date.split('T')[1]?.substring(0, 5) : '',
    };
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    const startWeekday = firstDay.getDay();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const hasScheduleOnDate = (date: Date) => {
    return petSchedules.some((s) => {
      const scheduleDate = new Date(s.dueDate);
      return (
        scheduleDate.getDate() === date.getDate() &&
        scheduleDate.getMonth() === date.getMonth() &&
        scheduleDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getSchedulesOnDate = (date: Date) => {
    return petSchedules.filter((s) => {
      const scheduleDate = new Date(s.dueDate);
      return (
        scheduleDate.getDate() === date.getDate() &&
        scheduleDate.getMonth() === date.getMonth() &&
        scheduleDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // 获取今天的日程
  const todaySchedules = getSchedulesOnDate(new Date());

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">护理日程</h1>
          <p className="text-gray-500 mt-1">
            {selectedPet ? `为 ${selectedPet.name} 规划护理计划` : '管理所有宠物的护理日程'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            添加日程
          </button>
          {selectedPet && (
            <button
              onClick={() => generateSchedulesForPet(selectedPet)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              智能生成
            </button>
          )}
        </div>
      </div>

      {/* 今日提醒 */}
      {todaySchedules.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">今日待办</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {todaySchedules.map((s) => {
              const pet = state.pets.find((p) => p.id === s.petId);
              return (
                <div key={s.id} className="bg-white rounded-lg px-3 py-2 shadow-sm">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-gray-500 ml-2">- {pet?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
              <p className="text-sm text-gray-500">待完成</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{completedCount}</p>
              <p className="text-sm text-gray-500">已完成</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{urgentCount}</p>
              <p className="text-sm text-gray-500">即将到期</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">
              {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
            </h3>
            <div className="flex gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                今天
              </button>
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {getCalendarDays().map(({ date, isCurrentMonth }, index) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const schedules = getSchedulesOnDate(date);
              const hasSchedule = hasScheduleOnDate(date);
              const hasUrgent = schedules.some((s) => {
                if (s.status !== 'pending') return false;
                const daysUntil = Math.ceil((new Date(s.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return daysUntil <= 3 && daysUntil >= 0;
              });

              return (
                <div
                  key={index}
                  onClick={() => openAddModal(date)}
                  className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 ${
                    !isCurrentMonth ? 'text-gray-300' : 'text-gray-700'
                  } ${isToday ? 'bg-primary-50 ring-2 ring-primary-500' : ''} ${
                    hasUrgent ? 'bg-red-50' : ''
                  }`}
                  title={schedules.length > 0 ? `${schedules.length}个日程` : '点击添加日程'}
                >
                  <span className={`text-sm ${isToday ? 'font-bold text-primary-600' : ''}`}>
                    {date.getDate()}
                  </span>
                  {hasSchedule && (
                    <div className="flex gap-0.5 mt-0.5">
                      {schedules.length > 2 ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      ) : (
                        schedules.slice(0, 2).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              schedules[i].status === 'completed'
                                ? 'bg-green-500'
                                : hasUrgent
                                ? 'bg-red-500'
                                : 'bg-primary-500'
                            }`}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">点击日期可添加日程</p>
        </div>

        {/* Schedule List */}
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            {([
              { key: 'all', label: '全部' },
              { key: 'pending', label: '待完成' },
              { key: 'completed', label: '已完成' },
            ] as const).map((option) => (
              <button
                key={option.key}
                onClick={() => setFilterStatus(option.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filterStatus === option.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Schedule Items */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {petSchedules.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">暂无护理日程</p>
                <button
                  onClick={() => openAddModal()}
                  className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  点击添加日程
                </button>
              </div>
            ) : (
              petSchedules.map((schedule) => {
                const daysUntil = getDaysUntil(schedule.dueDate);
                const dateInfo = formatDate(schedule.dueDate);
                const pet = state.pets.find((p) => p.id === schedule.petId);
                const isUrgent = schedule.status === 'pending' && daysUntil <= 3 && daysUntil >= 0;
                const isOverdue = schedule.status === 'pending' && daysUntil < 0;

                return (
                  <div
                    key={schedule.id}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      schedule.status === 'completed'
                        ? 'bg-gray-50 border-gray-100 opacity-75'
                        : isOverdue
                        ? 'bg-red-50 border-red-200'
                        : isUrgent
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventTypeColor(schedule.eventType)}`}>
                          {getEventTypeIcon(schedule.eventType)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{schedule.title}</h4>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {pet?.name || '未知宠物'} · {getEventTypeName(schedule.eventType)}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            📅 {dateInfo.year}年{dateInfo.month}月{dateInfo.day}日 周{dateInfo.weekday}
                            {dateInfo.time && ` ${dateInfo.time}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {schedule.status === 'pending' ? (
                          <>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                isOverdue
                                  ? 'bg-red-100 text-red-700'
                                  : isUrgent
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {isOverdue
                                ? `已逾期${Math.abs(daysUntil)}天`
                                : daysUntil === 0
                                ? '今天'
                                : daysUntil === 1
                                ? '明天'
                                : `${daysUntil}天后`}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditModal(schedule)}
                                className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                                title="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteSchedule(schedule.id)}
                                className="p-1.5 rounded-lg bg-gray-100 text-red-500 hover:bg-red-100"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => completeSchedule(schedule.id)}
                                className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
                              >
                                <Check className="w-4 h-4" />
                                完成
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              已完成
                            </span>
                            <button
                              onClick={() => deleteSchedule(schedule.id)}
                              className="p-1.5 rounded-lg bg-gray-100 text-red-500 hover:bg-red-100"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {schedule.description && (
                      <p className="text-sm text-gray-600 mt-3">{schedule.description}</p>
                    )}

                    {schedule.source && (
                      <p className="text-xs text-gray-400 mt-2">参考：{schedule.source}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">{editingSchedule ? '编辑日程' : '添加日程'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingSchedule(null); }}>
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* 宠物选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择宠物 *</label>
                <select
                  value={formData.petId}
                  onChange={(e) => setFormData({ ...formData, petId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">请选择宠物</option>
                  {state.pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日程标题 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：接种狂犬疫苗"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* 活动类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">活动类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormData({ ...formData, eventType: type.value })}
                      className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        formData.eventType === type.value
                          ? `${type.color} ring-2 ring-offset-1 ring-gray-300`
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 日期时间 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日期 *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* 优先级 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">优先级</label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setFormData({ ...formData, priority: p.value })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.priority === p.value
                          ? `${p.color} ring-2 ring-offset-1 ring-gray-300`
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="添加更多细节..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowAddModal(false); setEditingSchedule(null); }}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
                >
                  {editingSchedule ? '保存修改' : '添加日程'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-6">
        <h4 className="font-semibold text-blue-800 mb-2">使用说明</h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• 点击日历上的日期可直接添加日程</li>
          <li>• 选择活动类型（如疫苗、驱虫、美容等）</li>
          <li>• 设置日期时间和优先级</li>
          <li>• 使用「智能生成」可自动生成推荐日程</li>
        </ul>
      </div>
    </div>
  );
}
