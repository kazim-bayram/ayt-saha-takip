import React, { useState } from 'react';
import { Lock, AlertCircle, Loader2, Eye, EyeOff, Sun, Moon, AtSign } from 'lucide-react';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../firebase/config';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Set persistence based on "Remember Me" checkbox
      if (rememberMe) {
        await setPersistence(auth, browserLocalPersistence);
      } else {
        await setPersistence(auth, browserSessionPersistence);
      }
      
      // Username-only login (appends @insaat.local)
      await login(username, password);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Kimlik doğrulama başarısız';
      
      // Map Firebase errors to user-friendly Turkish messages
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        setError('Kullanıcı adı veya şifre hatalı');
      } else if (message.includes('auth/user-not-found')) {
        setError('Kullanıcı bulunamadı');
      } else if (message.includes('auth/invalid-email')) {
        setError('Kullanıcı adı geçersiz');
      } else if (message.includes('auth/too-many-requests')) {
        setError('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin');
      } else if (message.includes('Hesap erişime kapatılmıştır')) {
        setError('Hesabınız erişime kapatılmıştır. Lütfen yönetici ile iletişime geçin');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
      isDark 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-steel-900' 
        : 'bg-gradient-to-br from-gray-100 via-gray-50 to-steel-50'
    }`}>
      {/* Arka Plan Deseni */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl ${
          isDark ? 'bg-safety-orange/10' : 'bg-safety-orange/20'
        }`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${
          isDark ? 'bg-steel-600/10' : 'bg-steel-300/30'
        }`} />
      </div>

      {/* Tema Değiştirici */}
      <button
        onClick={toggleTheme}
        className={`absolute top-4 right-4 p-3 rounded-xl transition-colors ${
          isDark 
            ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' 
            : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
        }`}
        title={isDark ? 'Açık Tema' : 'Koyu Tema'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo & Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-safety-orange to-safety-orange-dark rounded-2xl shadow-industrial-lg mb-4">
            {/* Construction Plan / Map / Parcel Icon */}
            <svg 
              className="w-10 h-10 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {/* Outer boundary */}
              <rect x="3" y="3" width="18" height="18" rx="2" />
              {/* Horizontal division lines (parcels) */}
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              {/* Vertical division lines (parcels) */}
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="9" x2="15" y2="21" />
              {/* Location marker */}
              <circle cx="6" cy="6" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Saha Takip
          </h1>
        </div>

        {/* Giriş Kartı */}
        <div className={`rounded-2xl shadow-industrial-lg border p-8 ${
          isDark 
            ? 'bg-slate-850/80 backdrop-blur-sm border-slate-700/50' 
            : 'bg-white/90 backdrop-blur-sm border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold mb-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Hoş Geldiniz
          </h2>

          {/* Hata Mesajı */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-slide-up">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Kullanıcı Adı */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
                Kullanıcı Adı
              </label>
              <div className="relative">
                <AtSign className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Kullanıcı adınızı girin"
                  className={`w-full rounded-xl pl-12 pr-4 py-4 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                    isDark 
                      ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange' 
                      : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                  }`}
                  required
                  minLength={3}
                />
              </div>
            </div>

            {/* Şifre Alanı */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
                Şifre
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-xl pl-12 pr-12 py-4 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                    isDark 
                      ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange' 
                      : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                  }`}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark ? 'text-concrete-500 hover:text-concrete-300' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Beni Hatırla */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={`w-4 h-4 rounded border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-900/50 border-slate-600 text-safety-orange focus:ring-safety-orange/20 focus:ring-offset-slate-850'
                    : 'bg-white border-gray-300 text-safety-orange focus:ring-safety-orange/20 focus:ring-offset-white'
                }`}
              />
              <label
                htmlFor="rememberMe"
                className={`ml-2 text-sm cursor-pointer select-none ${
                  isDark ? 'text-concrete-300' : 'text-gray-700'
                }`}
              >
                Beni Hatırla
              </label>
            </div>

            {/* Gönder Butonu */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-safety-orange to-safety-orange-dark hover:from-safety-orange-dark hover:to-safety-orange text-white font-semibold py-4 px-6 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 btn-industrial"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          {/* Info text */}
          <div className="mt-6 text-center">
            <p className={`text-xs ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
              Hesap bilgilerinizi yöneticinizden alabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
