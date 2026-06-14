'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { LogIn, UserPlus, Loader2, Heart, Shield, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          router.push('/');
          router.refresh();
        } else {
          setError(result.message);
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('两次输入的密码不一致');
          setIsLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError('密码长度至少6位');
          setIsLoading(false);
          return;
        }
        
        const result = await register(formData.name, formData.email, formData.password);
        if (result.success) {
          router.push('/');
          router.refresh();
        } else {
          setError(result.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 via-primary-50 to-secondary-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Floating Pet Icons */}
      <div className="absolute top-1/4 left-8 text-6xl opacity-20 animate-bounce" style={{ animationDuration: '3s' }}>🐕</div>
      <div className="absolute top-1/3 right-12 text-5xl opacity-20 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>🐈</div>
      <div className="absolute bottom-1/4 left-1/4 text-4xl opacity-20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>🐰</div>
      <div className="absolute top-1/2 right-1/4 text-5xl opacity-20 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.3s' }}>🦜</div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <span className="text-5xl">🐾</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              养宠助手
            </h1>
            <p className="text-gray-600 mt-3 text-lg">
              智能宠物健康管理平台
            </p>
            
            {/* Feature Pills */}
            <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-sm text-gray-600 shadow-sm">
                <Heart className="w-4 h-4 text-pink-500" /> 健康追踪
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-sm text-gray-600 shadow-sm">
                <Shield className="w-4 h-4 text-green-500" /> 数据安全
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm text-sm text-gray-600 shadow-sm">
                <Sparkles className="w-4 h-4 text-amber-500" /> 智能提醒
              </span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/50">
            {/* Tab Switcher */}
            <div className="flex rounded-2xl bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 mb-8">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  isLogin
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-[1.02]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LogIn className="w-5 h-5" />
                登录
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  !isLogin
                    ? 'bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-lg transform scale-[1.02]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                注册
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-600 text-sm animate-shake">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  {error}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-primary-600 transition-colors">
                    昵称
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-300 bg-gray-50/50 focus:bg-white"
                      placeholder="给爱宠取个温馨的名字"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 opacity-0 group-focus-within:opacity-5 transition-opacity pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-primary-600 transition-colors">
                  邮箱
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-300 bg-gray-50/50 focus:bg-white"
                    placeholder="your@email.com"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 opacity-0 group-focus-within:opacity-5 transition-opacity pointer-events-none" />
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-primary-600 transition-colors">
                  密码
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-300 bg-gray-50/50 focus:bg-white"
                    placeholder="••••••••"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 opacity-0 group-focus-within:opacity-5 transition-opacity pointer-events-none" />
                </div>
              </div>

              {!isLogin && (
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 group-focus-within:text-primary-600 transition-colors">
                    确认密码
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-300 bg-gray-50/50 focus:bg-white"
                      placeholder="再次确认密码"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 opacity-0 group-focus-within:opacity-5 transition-opacity pointer-events-none" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 bg-size-200 text-white font-bold hover:shadow-lg hover:shadow-primary-500/30 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-lg">{isLogin ? '登录中...' : '注册中...'}</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">{isLogin ? '🐾 登录' : '✨ 开始使用'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Benefits Section */}
            <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100/50">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                {isLogin ? '登录即享' : '注册即享'}
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  永久保存宠物数据
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  智能护理日程提醒
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  随时随地访问
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-8 mt-10 text-sm text-gray-500">
            <div className="flex items-center gap-2 hover:text-primary-600 transition-colors cursor-pointer">
              <span className="text-2xl">🐕</span>
              <span>狗狗管理</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2 hover:text-primary-600 transition-colors cursor-pointer">
              <span className="text-2xl">🐈</span>
              <span>猫咪护理</span>
            </div>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center gap-2 hover:text-primary-600 transition-colors cursor-pointer">
              <span className="text-2xl">🐰</span>
              <span>小宠关爱</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        .bg-size-200 {
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  );
}