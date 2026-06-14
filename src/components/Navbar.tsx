'use client';

import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Bell, Search, Plus, Menu, X, PawPrint, User } from 'lucide-react';

export default function Navbar() {
  const { state, selectPet, selectedPet } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPetSelector, setShowPetSelector] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <PawPrint className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">养宠助手</h1>
            <p className="text-xs text-gray-500">Pet Care Assistant</p>
          </div>
        </div>

        {/* Pet Selector */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowPetSelector(!showPetSelector)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {selectedPet ? (
                <>
                  <span className="text-2xl">{selectedPet.species === 'dog' ? '🐕' : '🐱'}</span>
                  <span className="font-medium text-gray-700">{selectedPet.name}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">添加宠物</span>
                </>
              )}
            </button>

            {showPetSelector && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fadeIn">
                {state.pets.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <PawPrint className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">还没有添加宠物</p>
                    <p className="text-xs mt-1">点击右上角添加您的第一只宠物</p>
                  </div>
                ) : (
                  <>
                    {state.pets.map((pet) => (
                      <button
                        key={pet.id}
                        onClick={() => {
                          selectPet(pet.id);
                          setShowPetSelector(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                          selectedPet?.id === pet.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <span className="text-2xl">{pet.species === 'dog' ? '🐕' : '🐱'}</span>
                        <div className="text-left">
                          <p className="font-medium text-gray-800">{pet.name}</p>
                          <p className="text-xs text-gray-500">{pet.breed}</p>
                        </div>
                        {selectedPet?.id === pet.id && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-primary-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              className="bg-transparent outline-none text-sm text-gray-700 w-40"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full mt-2 right-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fadeIn max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">通知</h3>
                </div>
                {state.notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无通知</p>
                  </div>
                ) : (
                  state.notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                        !notif.read ? 'bg-primary-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            notif.type === 'reminder'
                              ? 'bg-amber-100 text-amber-600'
                              : notif.type === 'alert'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* User */}
          <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <User className="w-5 h-5 text-gray-600" />
          </button>

          {/* Mobile menu */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 py-4 px-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 mb-4">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              className="bg-transparent outline-none text-sm text-gray-700 flex-1"
            />
          </div>
        </div>
      )}
    </nav>
  );
}
