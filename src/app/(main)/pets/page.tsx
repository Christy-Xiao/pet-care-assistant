'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Pet } from '@/types';
import { Plus, Edit2, Trash2, X, Dog, Cat, Check, Calendar, Weight, AlertTriangle, FileText } from 'lucide-react';

export default function PetsPage() {
  const { state, addPet, updatePet, deletePet, selectPet, selectedPet, generateSchedulesForPet } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog' as 'dog' | 'cat',
    breed: '',
    dateOfBirth: '',
    age: '',
    weight: 0,
    gender: 'male' as 'male' | 'female',
    allergies: [] as string[],
    medicalHistory: [] as Pet['medicalHistory'],
    notes: '',
  });
  const [newAllergy, setNewAllergy] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      species: 'dog',
      breed: '',
      dateOfBirth: '',
      age: '',
      weight: 0,
      gender: 'male',
      allergies: [],
      medicalHistory: [],
      notes: '',
    });
    setNewAllergy('');
    setEditingPet(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (pet: Pet) => {
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      dateOfBirth: pet.dateOfBirth ? (typeof pet.dateOfBirth === 'string' ? pet.dateOfBirth.split('T')[0] : '') : '',
      age: pet.age || '',
      weight: pet.weight ?? 0,
      gender: pet.gender || 'male',
      allergies: Array.isArray(pet.allergies) ? [...pet.allergies] : (pet.allergies ? String(pet.allergies).split(',').filter(Boolean) : []),
      medicalHistory: Array.isArray(pet.medicalHistory) ? [...pet.medicalHistory] : [],
      notes: pet.notes || '',
    });
    setEditingPet(pet);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 计算年龄
    const birthDate = new Date(formData.dateOfBirth);
    const now = new Date();
    const months = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
    const ageStr = months < 12 
      ? `${months}个月` 
      : `${Math.floor(months / 12)}岁${months % 12 > 0 ? `${months % 12}个月` : ''}`;

    // 转换为 YYYY-MM-DD 格式供数据库存储
    const dateStr = formData.dateOfBirth;

    const petData = {
      ...formData,
      dateOfBirth: dateStr,  // 直接使用 YYYY-MM-DD 格式
      age: ageStr,
    };

    console.log('提交宠物数据:', petData);

    if (editingPet) {
      await updatePet({ ...editingPet, ...petData });
    } else {
      await addPet(petData);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这只宠物吗？相关的护理日程也会被删除。')) {
      deletePet(id);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) {
      setFormData({ ...formData, allergies: [...formData.allergies, newAllergy.trim()] });
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setFormData({ ...formData, allergies: formData.allergies.filter((a) => a !== allergy) });
  };

  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 12) return `${months}个月`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years}岁${remainingMonths}个月` : `${years}岁`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">宠物档案</h1>
          <p className="text-gray-500 mt-1">管理您的宠物健康档案和基本信息</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加宠物
        </button>
      </div>

      {/* Pet List */}
      {state.pets.length === 0 ? (
        <div className="rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 p-12 text-center border-2 border-dashed border-gray-300">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-200 flex items-center justify-center">
            <Dog className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">还没有宠物</h2>
          <p className="text-gray-500 mb-6">添加您的第一只宠物，开始智能养宠之旅</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            添加宠物
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.pets.map((pet) => (
            <div
              key={pet.id}
              className={`rounded-2xl bg-white shadow-sm border-2 transition-all cursor-pointer hover:shadow-lg ${
                selectedPet?.id === pet.id ? 'border-primary-500' : 'border-gray-100'
              }`}
              onClick={() => selectPet(pet.id)}
            >
              {/* Pet Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-3xl">
                      {pet.species === 'dog' ? '🐕' : '🐱'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{pet.name}</h3>
                      <p className="text-sm text-gray-500">{pet.breed}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 text-xs">
                        {selectedPet?.id === pet.id ? '已选中' : '点击选中'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(pet);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(pet.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pet Info */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{pet.age}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Weight className="w-4 h-4 text-gray-400" />
                    <span>{pet.weight && !isNaN(pet.weight) ? `${pet.weight} kg` : '-'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    pet.gender === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                  }`}>
                    {pet.gender === 'male' ? '♂ 公' : '♀ 母'}
                  </span>
                </div>

                {/* Allergies */}
                {pet.allergies && pet.allergies.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium text-gray-600">过敏信息</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(pet.allergies)
                        ? pet.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs"
                          >
                            {allergy}
                          </span>
                        ))
                        : (pet.allergies as string).split(',').filter(Boolean).map((allergy: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs"
                          >
                            {allergy.trim()}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Medical History */}
                {pet.medicalHistory && (() => {
                  const history = Array.isArray(pet.medicalHistory) 
                    ? pet.medicalHistory 
                    : (typeof pet.medicalHistory === 'string' ? JSON.parse(pet.medicalHistory || '[]') : []);
                  return history.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-gray-600">就医记录</span>
                      </div>
                      <p className="text-sm text-gray-500">{history.length} 条记录</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-fadeIn">
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingPet ? '编辑宠物' : '添加新宠物'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">基本信息</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">宠物名称</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="例如：球球"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">宠物类型</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, species: 'dog' })}
                        className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                          formData.species === 'dog'
                            ? 'border-primary-500 bg-primary-50 text-primary-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Dog className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">狗狗</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, species: 'cat' })}
                        className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                          formData.species === 'cat'
                            ? 'border-primary-500 bg-primary-50 text-primary-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Cat className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">猫咪</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">品种</label>
                    <input
                      type="text"
                      required
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="例如：法国斗牛犬"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'male' })}
                        className={`flex-1 py-2 rounded-xl border-2 transition-all ${
                          formData.gender === 'male'
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        ♂ 公
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'female' })}
                        className={`flex-1 py-2 rounded-xl border-2 transition-all ${
                          formData.gender === 'female'
                            ? 'border-pink-500 bg-pink-50 text-pink-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        ♀ 母
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">出生日期</label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">体重 (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, weight: val === '' ? 0 : parseFloat(val) });
                      }}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                      placeholder="例如：5.5"
                    />
                  </div>
                </div>
              </div>

              {/* Allergies */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">过敏信息</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    placeholder="输入过敏源，按回车添加"
                  />
                  <button
                    type="button"
                    onClick={addAllergy}
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {formData.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.allergies.map((allergy, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-600 text-sm"
                      >
                        {allergy}
                        <button
                          type="button"
                          onClick={() => removeAllergy(allergy)}
                          className="hover:text-red-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">备注</h3>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none resize-none"
                  placeholder="添加其他备注信息..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {editingPet ? '保存修改' : '添加宠物'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
