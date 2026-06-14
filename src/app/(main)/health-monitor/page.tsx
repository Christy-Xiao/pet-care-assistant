'use client';

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/store/AppContext';
import Link from 'next/link';
import {
  ArrowLeft,
  Scale,
  Droplets,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Plus,
  X,
  Edit2,
  Trash2,
  Check,
  Apple,
  Utensils,
} from 'lucide-react';

// ===== 类型定义 =====
interface WeightRecord {
  id: string;
  weight: number;
  recorded_at: string;
  notes?: string;
}

interface BathroomRecord {
  id: string;
  record_date: string;
  type: 'solid' | 'liquid' | 'both';
  size: 'small' | 'medium' | 'large';
  color?: string;
  notes?: string;
}

interface DietRecord {
  id: string;
  pet_id: string;
  record_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  food_type?: 'dry' | 'wet' | 'treat' | 'homemade' | 'other';
  amount?: string;
  calories?: number;
  notes?: string;
  created_at?: string;
}

interface HealthRecord {
  id: string;
  type: string;
  analysis_type: string;
  title: string;
  created_at: string;
  result?: { severity?: string; description?: string };
}

interface MonitorData {
  weightRecords: WeightRecord[];
  bathroomRecords: BathroomRecord[];
  dietRecords: DietRecord[];
  healthRecords: HealthRecord[];
  currentWeight: number | null;
  weightChange: number;
}

// ===== 体重输入弹窗 =====
function WeightModal({
  petId,
  editing,
  onClose,
  onSaved,
}: {
  petId: string;
  editing?: WeightRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(editing?.recorded_at?.split('T')[0] || today);
  const [weight, setWeight] = useState(editing ? String(editing.weight) : '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!weight || !date) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch('/api/weight-records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, pet_id: petId, weight: parseFloat(weight), recorded_at: date, notes }),
        });
        console.log('体重更新结果:', res.ok);
      } else {
        const res = await fetch('/api/weight-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pet_id: petId, weight: parseFloat(weight), recorded_at: date, notes }),
        });
        console.log('体重保存结果:', res.ok);
      }
      // 触发全局数据刷新，确保 AppContext 中的宠物体重也更新
      window.dispatchEvent(new Event('appDataRefresh'));
      onSaved();
      onClose();
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !confirm('确认删除这条体重记录？')) return;
    setDeleting(true);
    try {
      await fetch(`/api/weight-records?id=${editing.id}`, { method: 'DELETE' });
      onSaved();
      onClose();
    } catch {
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg">{editing ? '编辑体重' : '记录体重'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">记录日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">体重 (kg)</label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="200"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="例如: 5.32"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">备注（可选）</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如: 饭后称的"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {editing && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? '删除中...' : '删除'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !weight || !date}
            className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 排泄记录弹窗 =====
function BathroomModal({
  petId,
  editing,
  presetDate,
  onClose,
  onSaved,
}: {
  petId: string;
  editing?: BathroomRecord;
  presetDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(editing?.record_date?.split('T')[0] || presetDate || today);
  const [type, setType] = useState<'solid' | 'liquid' | 'both'>(editing?.type || 'solid');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>(editing?.size || 'medium');
  const [color, setColor] = useState(editing?.color || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await fetch('/api/bathroom-records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, record_date: date, type, size, color, notes }),
        });
      } else {
        await fetch('/api/bathroom-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pet_id: petId, record_date: date, type, size, color, notes }),
        });
      }
      onSaved();
      onClose();
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !confirm('确认删除这条排泄记录？')) return;
    setDeleting(true);
    try {
      await fetch(`/api/bathroom-records?id=${editing.id}`, { method: 'DELETE' });
      onSaved();
      onClose();
    } catch {
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const typeOptions: { value: 'solid' | 'liquid' | 'both'; label: string; emoji: string }[] = [
    { value: 'solid', label: '大便', emoji: '💩' },
    { value: 'liquid', label: '小便', emoji: '💧' },
    { value: 'both', label: '都有', emoji: '💩💧' },
  ];

  const sizeOptions: { value: 'small' | 'medium' | 'large'; label: string; desc: string; color: string }[] = [
    { value: 'small', label: '小', desc: '少量', color: 'bg-green-400' },
    { value: 'medium', label: '中', desc: '正常', color: 'bg-amber-400' },
    { value: 'large', label: '大', desc: '大量', color: 'bg-red-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg">{editing ? '编辑排泄' : '记录排泄'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">记录日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">类型</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`py-3 rounded-xl border-2 text-center transition-all ${
                    type === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl mb-0.5">{opt.emoji}</div>
                  <div className="text-xs font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">量级（用颜色区分）</label>
            <div className="grid grid-cols-3 gap-2">
              {sizeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSize(opt.value)}
                  className={`py-3 rounded-xl border-2 text-center transition-all ${
                    size === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-7 h-7 mx-auto rounded-full ${opt.color} mb-1 shadow-sm`} />
                  <div className="text-xs font-medium text-gray-700">{opt.label}</div>
                  <div className="text-[10px] text-gray-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">颜色（可选）</label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="例如: 棕色、正常、偏黑"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">备注（可选）</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如: 有点稀"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {editing && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? '删除中...' : '删除'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 饮食记录弹窗 =====
function DietModal({
  petId,
  editing,
  presetDate,
  onClose,
  onSaved,
}: {
  petId: string;
  editing?: DietRecord;
  presetDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(editing?.record_date?.split('T')[0] || presetDate || today);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(editing?.meal_type || 'breakfast');
  const [foodName, setFoodName] = useState(editing?.food_name || '');
  const [foodType, setFoodType] = useState<'dry' | 'wet' | 'treat' | 'homemade' | 'other'>(editing?.food_type || 'dry');
  const [amount, setAmount] = useState(editing?.amount || '');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mealOptions: { value: 'breakfast' | 'lunch' | 'dinner' | 'snack'; label: string; emoji: string; time: string }[] = [
    { value: 'breakfast', label: '早餐', emoji: '🌅', time: '6-9点' },
    { value: 'lunch', label: '午餐', emoji: '☀️', time: '11-14点' },
    { value: 'dinner', label: '晚餐', emoji: '🌙', time: '17-20点' },
    { value: 'snack', label: '零食', emoji: '🍖', time: '任意时间' },
  ];

  const foodTypeOptions: { value: 'dry' | 'wet' | 'treat' | 'homemade' | 'other'; label: string; emoji: string }[] = [
    { value: 'dry', label: '干粮', emoji: '🥣' },
    { value: 'wet', label: '湿粮', emoji: '🥫' },
    { value: 'treat', label: '零食', emoji: '🍖' },
    { value: 'homemade', label: '自制', emoji: '🍲' },
    { value: 'other', label: '其他', emoji: '🍱' },
  ];

  const handleSave = async () => {
    if (!date || !foodName || !mealType) return;
    setSaving(true);
    try {
      if (editing) {
        await fetch('/api/diet-records', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, record_date: date, meal_type: mealType, food_name: foodName, food_type: foodType, amount, notes }),
        });
      } else {
        await fetch('/api/diet-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pet_id: petId, record_date: date, meal_type: mealType, food_name: foodName, food_type: foodType, amount, notes }),
        });
      }
      onSaved();
      onClose();
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !confirm('确认删除这条饮食记录？')) return;
    setDeleting(true);
    try {
      await fetch(`/api/diet-records?id=${editing.id}`, { method: 'DELETE' });
      onSaved();
      onClose();
    } catch {
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800 text-lg">{editing ? '编辑饮食' : '记录饮食'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">记录日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">餐次</label>
            <div className="grid grid-cols-4 gap-2">
              {mealOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMealType(opt.value)}
                  className={`py-2.5 rounded-xl border-2 text-center transition-all ${
                    mealType === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-0.5">{opt.emoji}</div>
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[9px] text-gray-400">{opt.time}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">食物类型</label>
            <div className="grid grid-cols-5 gap-2">
              {foodTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFoodType(opt.value)}
                  className={`py-2 rounded-xl border-2 text-center transition-all ${
                    foodType === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-base">{opt.emoji}</div>
                  <div className="text-[10px] font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">食物名称</label>
            <input
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="例如: 皇家狗粮、鸡胸肉"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">用量（可选）</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例如: 100g、半碗"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">备注（可选）</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如: 爱吃、吃得很干净"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-300 text-gray-800"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {editing && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? '删除中...' : '删除'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !foodName}
            className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 记录列表弹窗 =====
function RecordsListModal({
  title,
  records,
  listType,
  onEdit,
  onClose,
}: {
  title: string;
  records: any[];
  listType: 'weight' | 'bathroom' | 'diet';
  onEdit: (record: any) => void;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  const sizeColorMap: Record<string, string> = {
    small: 'bg-green-400',
    medium: 'bg-amber-400',
    large: 'bg-red-400',
  };
  const sizeLabelMap: Record<string, string> = {
    small: '小',
    medium: '中',
    large: '大',
  };
  const typeLabelMap: Record<string, string> = {
    solid: '大便',
    liquid: '小便',
    both: '都有',
  };
  const mealLabelMap: Record<string, { label: string; emoji: string }> = {
    breakfast: { label: '早餐', emoji: '🌅' },
    lunch: { label: '午餐', emoji: '☀️' },
    dinner: { label: '晚餐', emoji: '🌙' },
    snack: { label: '零食', emoji: '🍖' },
  };
  const foodTypeLabelMap: Record<string, string> = {
    dry: '干粮',
    wet: '湿粮',
    treat: '零食',
    homemade: '自制',
    other: '其他',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={listRef}
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-sm sm:mx-4 overflow-hidden max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-800 text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
          {records.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">暂无记录</div>
          ) : (
            records.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => onEdit(r)}
              >
                {listType === 'weight' ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Scale className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-gray-800">{r.weight}</span>
                        <span className="text-xs text-gray-400">kg</span>
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(r.recorded_at || r.record_date)}</div>
                      {r.notes && <div className="text-xs text-gray-500 truncate mt-0.5">{r.notes}</div>}
                    </div>
                  </>
                ) : listType === 'diet' ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">{mealLabelMap[r.meal_type]?.emoji || '🍽️'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{r.food_name}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-orange-500">{mealLabelMap[r.meal_type]?.label || r.meal_type}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{foodTypeLabelMap[r.food_type] || r.food_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{formatDate(r.record_date)}</span>
                        {r.amount && <><span>·</span><span>{r.amount}</span></>}
                      </div>
                      {r.notes && <div className="text-xs text-gray-500 truncate mt-0.5">{r.notes}</div>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-shrink-0 flex gap-1">
                      <div className={`w-5 h-5 rounded-full ${sizeColorMap[r.size] || 'bg-gray-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{typeLabelMap[r.type]}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{sizeLabelMap[r.size]}</span>
                        {r.color && (
                          <>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">{r.color}</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(r.record_date)}</div>
                      {r.notes && <div className="text-xs text-gray-500 truncate mt-0.5">{r.notes}</div>}
                    </div>
                  </>
                )}
                <Edit2 className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ===== 统计卡片组件 =====
function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: any;
  colorClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl ${colorClass} p-4 flex flex-col items-center justify-center hover:opacity-90 transition-opacity ${onClick ? 'cursor-pointer' : ''}`}
    >
      <span className="text-2xl font-bold text-gray-800">{value}</span>
      <span className="text-sm text-gray-500 mt-0.5">{label}</span>
      {onClick && <span className="text-[10px] text-gray-400 mt-1">点击查看详情</span>}
    </button>
  );
}

// ===== SVG体重趋势图 =====
function WeightChart({
  records,
  currentWeight,
  weightChange,
  onEdit,
  onAdd,
}: {
  records: WeightRecord[];
  currentWeight: number | null;
  weightChange: number;
  onEdit: (r: WeightRecord) => void;
  onAdd: () => void;
}) {
  const [range, setRange] = useState<'7' | '30' | '90'>('30');

  const filtered = (() => {
    if (records.length === 0) return [];
    const now = new Date();
    const daysAgo = parseInt(range);
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    let filtered = records.filter((r) => new Date(r.recorded_at) >= cutoff);

    if (filtered.length === 0 && currentWeight) {
      return [{ id: 'current', recorded_at: now.toISOString(), weight: currentWeight }];
    }
    if (filtered.length === 1 && currentWeight) {
      return [
        ...filtered,
        { id: 'current', recorded_at: now.toISOString(), weight: currentWeight },
      ];
    }

    filtered.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    if (filtered.length <= 10) return filtered;
    const step = Math.floor(filtered.length / 10);
    const sampled: WeightRecord[] = [];
    for (let i = 0; i < filtered.length; i += step) sampled.push(filtered[i]);
    if (!sampled.includes(filtered[filtered.length - 1])) sampled.push(filtered[filtered.length - 1]);
    return sampled;
  })();

  const weights = filtered.map((r) => r.weight);
  const minW = Math.min(...weights, currentWeight || Infinity);
  const maxW = Math.max(...weights, currentWeight || 0);
  const padding = Math.max(0.05, (maxW - minW) * 0.15);
  const yMin = minW - padding;
  const yMax = maxW + padding;

  const width = 320, height = 160;
  const leftPad = 40, bottomPad = 24;
  const chartWidth = width - leftPad - 10;
  const chartHeight = height - bottomPad - 10;

  const points = filtered.map((r, i) => ({
    x: leftPad + (i / Math.max(filtered.length - 1, 1)) * chartWidth,
    y: 10 + ((yMax - r.weight) / (yMax - yMin || 1)) * chartHeight,
    record: r,
  }));

  const areaPath = points.length > 0
    ? `M ${leftPad},${10 + chartHeight} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${10 + chartHeight} Z`
    : '';
  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
    : '';

  const yTicks = [yMax, (yMax + yMin) / 2, yMin];
  const xLabels = points.filter((_, i) =>
    points.length <= 6 ? true : i % Math.ceil(points.length / 5) === 0 || i === points.length - 1
  );

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">体重趋势</h3>
          {currentWeight && (
            <p className="text-sm mt-0.5">
              <span className="text-2xl font-bold text-gray-800">{currentWeight.toFixed(2)}</span>
              <span className="text-gray-500">kg </span>
              <span className={weightChange >= 0 ? 'text-green-600' : 'text-red-500'}>
                ({weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}kg)
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAdd}
            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
            title="添加体重记录"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="flex gap-1">
            {(['7', '30', '90'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  range === r ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {r}天
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        {points.length > 0 ? (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={leftPad}
                  y1={10 + ((yMax - tick) / (yMax - yMin || 1)) * chartHeight}
                  x2={width - 10}
                  y2={10 + ((yMax - tick) / (yMax - yMin || 1)) * chartHeight}
                  stroke="#f0f0f0" strokeWidth="1"
                />
                <text x={leftPad - 6} y={14 + ((yMax - tick) / (yMax - yMin || 1)) * chartHeight} textAnchor="end" fontSize="9" fill="#9ca3af">
                  {tick.toFixed(2)}
                </text>
              </g>
            ))}
            <path d={areaPath} fill="url(#weightGradient3)" opacity="0.4" />
            <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x} cy={p.y} r="4"
                fill="#f59e0b" stroke="white" strokeWidth="1.5"
                className="cursor-pointer"
                onClick={() => p.record.id !== 'current' && onEdit(p.record)}
              />
            ))}
            {xLabels.map((p, i) => (
              <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {new Date(p.record.recorded_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
              </text>
            ))}
            <defs>
              <linearGradient id="weightGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
              </linearGradient>
            </defs>
          </svg>
        ) : (
          <div className="flex flex-col items-center py-8">
            <Scale className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">暂无体重记录</p>
            <button onClick={onAdd} className="mt-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-600 text-sm font-medium hover:bg-amber-100 transition-colors">
              添加第一条记录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 排泄热力图 =====
function BathroomHeatmap({
  records,
  onAdd,
  onEdit,
}: {
  records: BathroomRecord[];
  onAdd: (date?: string) => void;
  onEdit: (r: BathroomRecord) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthRecords = records.filter((r) => r.record_date.startsWith(selectedMonth));
  const year = parseInt(selectedMonth.split('-')[0]);
  const month = parseInt(selectedMonth.split('-')[1]) - 1;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const recordMap = new Map<string, BathroomRecord[]>();
  monthRecords.forEach((r) => {
    const d = new Date(r.record_date);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const key = `${dow}-${d.getDate()}`;
    if (!recordMap.has(key)) recordMap.set(key, []);
    recordMap.get(key)!.push(r);
  });

  const months: string[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const getCellColor = (recs: BathroomRecord[] | undefined) => {
    if (!recs || recs.length === 0) return null;
    if (recs.some((r) => r.type === 'both')) return { bg: 'bg-green-100', dot: 'bg-green-500' };
    if (recs.some((r) => r.type === 'liquid')) return { bg: 'bg-blue-100', dot: 'bg-blue-500' };
    if (recs.some((r) => r.type === 'solid')) return { bg: 'bg-orange-100', dot: 'bg-orange-500' };
    return null;
  };

  const sizePriority: Record<string, number> = { small: 1, medium: 2, large: 3 };
  const getDotSize = (recs: BathroomRecord[] | undefined) => {
    if (!recs || recs.length === 0) return 0;
    const maxPrio = Math.max(...recs.map((r) => sizePriority[r.size] || 2));
    if (maxPrio === 3) return 10;
    if (maxPrio === 2) return 7;
    return 5;
  };

  const hasRecordCount = new Set(monthRecords.map((r) => r.record_date.split('T')[0])).size;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 text-lg">排泄</h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-300"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m.split('-')[0]}年{parseInt(m.split('-')[1])}月
              </option>
            ))}
          </select>
          <button
            onClick={() => onAdd()}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title="添加排泄记录"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        点击方块可编辑 ·{' '}
        <span className="font-medium text-blue-600">{hasRecordCount}</span> 天有记录
      </p>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex gap-1 ml-7">
            {weekDays.map((d) => (
              <div key={d} className="w-[28px] text-center text-[11px] text-gray-400 font-medium">{d}</div>
            ))}
          </div>

          {Array.from({ length: 6 }).map((_, rowIdx) => {
            const cells: JSX.Element[] = [];
            cells.push(
              <div key={`${rowIdx}-label`} className="w-[22px] h-[28px] flex items-center justify-center text-[11px] text-gray-400 mr-1">
                {rowIdx < 6 ? ['一', '二', '三', '四', '五', '六'][rowIdx] : ''}
              </div>
            );

            for (let col = 0; col < 7; col++) {
              const dayNum = rowIdx * 7 + col - startDow + 1;
              const isValid = dayNum > 0 && dayNum <= totalDays;

              if (!isValid) {
                cells.push(<div key={col} className="w-[28px] h-[28px]" />);
                continue;
              }

              const dow = col;
              const key = `${dow}-${dayNum}`;
              const dayRecs = recordMap.get(key);
              const colors = getCellColor(dayRecs);
              const dotSize = getDotSize(dayRecs);

              cells.push(
                <div
                  key={col}
                  onClick={() => {
                    if (dayRecs && dayRecs.length > 0) {
                      onEdit(dayRecs[0]);
                    } else {
                      // 空方块点击时，调用 onAdd 并设置日期
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      onAdd(dateStr);
                    }
                  }}
                  className={`w-[28px] h-[28px] rounded-md flex items-center justify-center transition-colors cursor-pointer hover:opacity-80 ${
                    colors ? colors.bg : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  title={
                    dayRecs && dayRecs.length > 0
                      ? `${month + 1}月${dayNum}日 ${dayRecs.map((r) => {
                          const t = r.type === 'solid' ? '💩' : r.type === 'liquid' ? '💧' : '💩💧';
                          const s = r.size === 'large' ? '大' : r.size === 'medium' ? '中' : '小';
                          return `${t}[${s}]`;
                        }).join(' ')}`
                      : `${month + 1}月${dayNum}日 无记录（点击添加）`
                  }
                >
                  {colors && (
                    <div className={`${colors.dot} rounded-full`} style={{ width: dotSize, height: dotSize }} />
                  )}
                </div>
              );
            }

            return <div key={rowIdx} className="flex gap-1 mb-1">{cells}</div>;
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-orange-400" /><span className="text-xs text-gray-500">大便</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-blue-400" /><span className="text-xs text-gray-500">小便</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-green-400" /><span className="text-xs text-gray-500">都有</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 rounded bg-gray-300" /><span className="text-xs text-gray-500">无记录</span></div>
      </div>
    </div>
  );
}

// ===== 饮食热力图 =====
function DietHeatmap({
  records,
  onAdd,
  onEdit,
}: {
  records: DietRecord[];
  onAdd: (date?: string) => void;
  onEdit: (r: DietRecord) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthRecords = records.filter((r) => r.record_date.startsWith(selectedMonth));
  const year = parseInt(selectedMonth.split('-')[0]);
  const month = parseInt(selectedMonth.split('-')[1]) - 1;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const recordMap = new Map<string, DietRecord[]>();
  monthRecords.forEach((r) => {
    const d = new Date(r.record_date);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const key = `${dow}-${d.getDate()}`;
    if (!recordMap.has(key)) recordMap.set(key, []);
    recordMap.get(key)!.push(r);
  });

  const months: string[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const mealEmojis: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍖',
  };

  const getCellInfo = (recs: DietRecord[] | undefined) => {
    if (!recs || recs.length === 0) return null;
    const meals = recs.map((r) => mealEmojis[r.meal_type] || '🍽️').join('');
    return { meals, count: recs.length };
  };

  const hasRecordCount = new Set(monthRecords.map((r) => r.record_date.split('T')[0])).size;

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 text-lg">饮食</h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-300"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m.split('-')[0]}年{parseInt(m.split('-')[1])}月
              </option>
            ))}
          </select>
          <button
            onClick={() => onAdd()}
            className="p-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 周标签 */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 空白格子（周一前的位置） */}
        {Array.from({ length: startDow === 0 ? 6 : startDow - 1 }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* 日期格子 */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dow = (startDow === 0 ? 6 : startDow - 1 + i) % 7;
          const key = `${dow}-${day}`;
          const recs = recordMap.get(key);
          const info = getCellInfo(recs);
          const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <button
              key={day}
              onClick={() => info ? onEdit(recs![0]) : onAdd(dateStr)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all ${
                info
                  ? 'bg-orange-50 hover:bg-orange-100 cursor-pointer'
                  : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'
              } ${isToday ? 'ring-2 ring-primary-400' : ''}`}
            >
              <span className={`font-medium ${isToday ? 'text-primary-600' : 'text-gray-600'}`}>{day}</span>
              {info && <span className="text-[8px] leading-none mt-0.5">{info.meals}</span>}
            </button>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="text-sm">🌅</span>早餐</span>
          <span className="flex items-center gap-1"><span className="text-sm">☀️</span>午餐</span>
          <span className="flex items-center gap-1"><span className="text-sm">🌙</span>晚餐</span>
          <span className="flex items-center gap-1"><span className="text-sm">🍖</span>零食</span>
        </div>
        <span className="text-xs text-gray-400">本月 {hasRecordCount} 天有记录</span>
      </div>
    </div>
  );
}

// ===== 异常环形图 =====
function AnomalyGauge({ count, todayCount }: { count: number; todayCount: number }) {
  const size = 140, center = size / 2, radius = 52, strokeWidth = 14;
  const angle = count > 0 ? Math.min(count / 5, 1) * 360 : 0;
  const startAngle = -90, endAngle = startAngle + angle;
  const polarToCartesian = (cx: number, cy: number, r: number, a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const start = polarToCartesian(center, center, radius, startAngle);
  const end = polarToCartesian(center, center, radius, endAngle);
  const pathData = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${angle > 180 ? 1 : 0} 1 ${end.x} ${end.y}`;
  const bgPath = `M ${polarToCartesian(center, center, radius, 0).x} ${polarToCartesian(center, center, radius, 0).y} A ${radius} ${radius} 1 1 1 ${polarToCartesian(center, center, radius, 359.99).x} ${polarToCartesian(center, center, radius, 359.99).y}`;
  const gaugeColor = count > 0 ? '#ef4444' : '#22c55e';

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 text-lg mb-3">异常</h3>
      <div className="flex items-center gap-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <path d={bgPath} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
          {angle > 0 && <path d={pathData} fill="none" stroke={gaugeColor} strokeWidth={strokeWidth} strokeLinecap="round" />}
          <text x={center} y={center + 8} textAnchor="middle" className="text-4xl font-bold" fill={gaugeColor}>{count}</text>
        </svg>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-sm text-gray-700">今天异常 <strong>{todayCount}</strong> 次</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {count > 0 ? `近期发现 ${count} 条异常，建议关注` : '暂未发现异常，继续保持！'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== 记录分布 =====
function RecordDistribution({ records }: { records: HealthRecord[] }) {
  const typeStats = new Map<string, number>();
  records.forEach((r) => {
    const t = r.type || r.analysis_type || 'other';
    typeStats.set(t, (typeStats.get(t) || 0) + 1);
  });
  const typeLabels: Record<string, string> = {
    vaccination: '疫苗', checkup: '体检', surgery: '手术', medication: '用药',
    feces: '粪便分析', skin: '皮肤', eye: '眼部', ear: '耳部', other: '其他',
  };
  const sorted = Array.from(typeStats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxVal = sorted.length > 0 ? sorted[0][1] : 1;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 text-lg mb-4">记录分布</h3>
      {sorted.length === 0 ? (
        <div className="py-6 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">暂无健康记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(([type, count], idx) => (
            <div key={type} className="flex items-center gap-3">
              <div className="w-20 text-xs text-gray-500 truncate">{typeLabels[type] || type}</div>
              <div className="flex-1 h-6 bg-gray-50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(count / maxVal) * 100}%`, backgroundColor: colors[idx % colors.length], minWidth: count > 0 ? '24px' : undefined }}
                />
              </div>
              <div className="w-8 text-right text-sm font-medium text-gray-700">{count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== 标签分析 =====
function TagAnalysis({ records }: { records: HealthRecord[] }) {
  const severityStats = { normal: 0, mild: 0, moderate: 0, severe: 0 };
  records.forEach((r) => {
    const sev = r.result?.severity || 'normal';
    if (sev in severityStats) (severityStats as any)[sev]++;
  });
  const total = Object.values(severityStats).reduce((a, b) => a + b, 0);
  const config: { key: string; label: string; color: string; bg: string }[] = [
    { key: 'normal', label: '正常', color: 'bg-green-500', bg: 'bg-green-50' },
    { key: 'mild', label: '轻度', color: 'bg-yellow-500', bg: 'bg-yellow-50' },
    { key: 'moderate', label: '中度', color: 'bg-orange-500', bg: 'bg-orange-50' },
    { key: 'severe', label: '严重', color: 'bg-red-500', bg: 'bg-red-50' },
  ];

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 text-lg mb-4">标签分析</h3>
      {total === 0 ? (
        <div className="py-6 text-center">
          <PieChart className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">暂无分析数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {config.map(({ key, label, color, bg }) => {
            const val = (severityStats as any)[key];
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} text-gray-700 w-16 text-center`}>{label}</div>
                <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, minWidth: pct > 0 ? '32px' : undefined }} />
                </div>
                <span className="w-16 text-right text-sm text-gray-500">{val}条({pct}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== 主页面 =====
export default function HealthMonitorPage() {
  const { selectedPet } = useApp();
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);

  const [weightModal, setWeightModal] = useState<{ open: boolean; edit?: WeightRecord }>({ open: false });
  const [bathroomModal, setBathroomModal] = useState<{ open: boolean; edit?: BathroomRecord; presetDate?: string }>({ open: false });
  const [dietModal, setDietModal] = useState<{ open: boolean; edit?: DietRecord; presetDate?: string }>({ open: false });
  const [listModal, setListModal] = useState<{ open: boolean; type?: 'weight' | 'bathroom' | 'diet' }>({ open: false });

  const fetchMonitorData = async () => {
    if (!selectedPet) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [healthRes, petsRes, weightRes, bathroomRes, dietRes] = await Promise.all([
        fetch(`/api/health-records?petId=${selectedPet.id}`),
        fetch(`/api/pets?id=${selectedPet.id}`),
        fetch(`/api/weight-records?petId=${selectedPet.id}`),
        fetch(`/api/bathroom-records?petId=${selectedPet.id}`),
        fetch(`/api/diet-records?petId=${selectedPet.id}`),
      ]);

      const healthRecords: HealthRecord[] = healthRes.ok ? await healthRes.json() : [];
      const petsData: any[] = petsRes.ok ? await petsRes.json() : [];
      const weightRecords: WeightRecord[] = weightRes.ok ? await weightRes.json() : [];
      const bathroomRecords: BathroomRecord[] = bathroomRes.ok ? await bathroomRes.json() : [];
      const dietRecords: DietRecord[] = dietRes.ok ? await dietRes.json() : [];

      const currentPet = petsData.find((p: any) => p.id === selectedPet.id);
      const currentWeight = currentPet?.weight ? parseFloat(currentPet.weight) : null;

      const today = new Date().toISOString().split('T')[0];
      const hasTodayWeight = weightRecords.some((r) => (r.recorded_at as string).split('T')[0] === today);
      if (currentWeight && !hasTodayWeight) {
        weightRecords.unshift({ id: 'current', recorded_at: new Date().toISOString(), weight: currentWeight });
      }

      let weightChange = 0;
      const uniqueWeights = weightRecords.filter((r) => r.id !== 'current');
      if (uniqueWeights.length >= 2) {
        const sorted = [...uniqueWeights].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
        weightChange = sorted[sorted.length - 1].weight - sorted[0].weight;
      }

      setData({ weightRecords, bathroomRecords, dietRecords, healthRecords, currentWeight, weightChange });
    } catch (error) {
      console.error('获取监控数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitorData();
  }, [selectedPet]);

  const anomalyCount = data?.healthRecords.filter((r) => r.result?.severity && !['normal'].includes(r.result?.severity)).length || 0;
  const todayAnomaly = data?.healthRecords.filter((r) => {
    const isToday = new Date(r.created_at).toDateString() === new Date().toDateString();
    return isToday && r.result?.severity && !['normal'].includes(r.result?.severity);
  }).length || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">健康报表</h1>
          <p className="text-gray-500 text-sm">
            {selectedPet ? `${selectedPet.name} 的健康数据` : '请先选择宠物'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">正在加载数据...</p>
        </div>
      ) : !selectedPet ? (
        <div className="rounded-2xl bg-gray-50 p-12 text-center border-2 border-dashed border-gray-300">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">请先选择宠物</h2>
          <p className="text-gray-500">选择宠物后查看详细健康监控数据</p>
        </div>
      ) : data ? (
        <>
          {/* 顶部统计卡片 */}
          <div className="grid grid-cols-5 gap-3">
            <StatCard label="体重" value={data.currentWeight ? `${data.currentWeight.toFixed(2)}kg` : '--'} icon={Scale} colorClass="bg-green-50" onClick={() => setListModal({ open: true, type: 'weight' })} />
            <StatCard label="饮食" value={data.dietRecords.length} icon={Apple} colorClass="bg-orange-50" onClick={() => setListModal({ open: true, type: 'diet' })} />
            <StatCard label="排泄" value={data.bathroomRecords.length} icon={Droplets} colorClass="bg-blue-50" onClick={() => setListModal({ open: true, type: 'bathroom' })} />
            <StatCard label="异常" value={anomalyCount} icon={AlertTriangle} colorClass="bg-red-50" />
            <StatCard label="用药" value={data.healthRecords.filter((r) => r.type === 'medication').length} icon={Calendar} colorClass="bg-purple-50" />
          </div>

          {/* 体重趋势图 */}
          <WeightChart
            records={data.weightRecords}
            currentWeight={data.currentWeight}
            weightChange={data.weightChange}
            onEdit={(r) => setWeightModal({ open: true, edit: r })}
            onAdd={() => setWeightModal({ open: true })}
          />

          {/* 排泄热力图 */}
          <BathroomHeatmap
            records={data.bathroomRecords}
            onAdd={(date) => setBathroomModal({ open: true, presetDate: date })}
            onEdit={(r) => setBathroomModal({ open: true, edit: r })}
          />

          {/* 饮食热力图 */}
          <DietHeatmap
            records={data.dietRecords}
            onAdd={(date) => setDietModal({ open: true, presetDate: date })}
            onEdit={(r) => setDietModal({ open: true, edit: r })}
          />

          {/* 异常环形图 */}
          <AnomalyGauge count={anomalyCount} todayCount={todayAnomaly} />

          {/* 底部两列 */}
          <div className="grid md:grid-cols-2 gap-5">
            <RecordDistribution records={data.healthRecords} />
            <TagAnalysis records={data.healthRecords} />
          </div>

          {/* 底部导航 */}
          <div className="flex gap-3 pb-4">
            <Link href="/weekly-report" className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium text-center hover:bg-primary-600 transition-colors">
              查看每周报告
            </Link>
            <Link href="/records" className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-center hover:bg-gray-200 transition-colors">
              健康记录详情
            </Link>
          </div>
        </>
      ) : null}

      {/* 弹窗 */}
      {weightModal.open && selectedPet && (
        <WeightModal
          petId={selectedPet.id}
          editing={weightModal.edit}
          onClose={() => setWeightModal({ open: false })}
          onSaved={fetchMonitorData}
        />
      )}

      {bathroomModal.open && selectedPet && (
        <BathroomModal
          petId={selectedPet.id}
          editing={bathroomModal.edit}
          presetDate={bathroomModal.presetDate}
          onClose={() => setBathroomModal({ open: false })}
          onSaved={fetchMonitorData}
        />
      )}

      {dietModal.open && selectedPet && (
        <DietModal
          petId={selectedPet.id}
          editing={dietModal.edit}
          presetDate={dietModal.presetDate}
          onClose={() => setDietModal({ open: false })}
          onSaved={fetchMonitorData}
        />
      )}

      {listModal.open && listModal.type && data && (
        <RecordsListModal
          title={listModal.type === 'weight' ? '体重记录列表' : listModal.type === 'diet' ? '饮食记录列表' : '排泄记录列表'}
          records={listModal.type === 'weight' ? data.weightRecords.filter((r) => r.id !== 'current') : listModal.type === 'diet' ? data.dietRecords : data.bathroomRecords}
          listType={listModal.type}
          onEdit={(r) => {
            setListModal({ open: false });
            setTimeout(() => {
              if (listModal.type === 'weight') setWeightModal({ open: true, edit: r as WeightRecord });
              else if (listModal.type === 'diet') setDietModal({ open: true, edit: r as DietRecord });
              else setBathroomModal({ open: true, edit: r as BathroomRecord });
            }, 100);
          }}
          onClose={() => setListModal({ open: false })}
        />
      )}
    </div>
  );
}
