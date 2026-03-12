import React, { useState } from 'react';
import { Lock, AlertCircle, Loader2, Eye, EyeOff, AtSign } from 'lucide-react';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (rememberMe) {
        await setPersistence(auth, browserLocalPersistence);
      } else {
        await setPersistence(auth, browserSessionPersistence);
      }
      
      await login(username, password);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Kimlik doğrulama başarısız';
      
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        console.warn('[Login] Invalid credentials for username:', username);
        setError('Kullanıcı adı veya şifre hatalı');
      } else if (message.includes('auth/user-not-found')) {
        console.warn('[Login] User not found for username:', username);
        setError('Kullanıcı bulunamadı');
      } else if (message.includes('auth/invalid-email')) {
        setError('Kullanıcı adı geçersiz');
      } else if (message.includes('auth/too-many-requests')) {
        setError('Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin');
      } else if (message.includes('Hesap erişime kapatılmıştır')) {
        setError('Hesabınız erişime kapatılmıştır. Lütfen yönetici ile iletişime geçin');
      } else {
        console.warn('[Login] Unhandled authentication error:', err);
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo & Başlık */}
        <div className="text-center mb-8">
          <img src="/hardhat.svg" alt="AYT Mühendislik Logo" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-brand">
            AYT Mühendislik
          </h1>
        </div>

        {/* Giriş Kartı */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8">
          <h2 className="text-xl font-semibold mb-6 text-center text-slate-800">
            Sisteme Giriş
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slide-up">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-800">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Kullanıcı adınızı yazın"
                  className="w-full rounded-xl pl-12 pr-4 py-4 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  required
                  minLength={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-slate-800">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl pl-12 pr-12 py-4 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border bg-white border-slate-200 text-brand focus:ring-brand/20 focus:ring-offset-white cursor-pointer"
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 text-sm cursor-pointer select-none text-slate-800"
              >
                Beni Hatırla
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-light text-white font-semibold py-4 px-6 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Hesap bilgilerinizi sistem yöneticinizden alabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
