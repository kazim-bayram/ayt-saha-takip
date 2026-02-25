import React, { useState } from 'react';
import { Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface ChangePasswordModalProps {
  onSuccess?: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onSuccess }) => {
  const { isDark } = useTheme();
  const { updatePasswordForced } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!newPassword || !confirmPassword) {
        throw new Error('Lütfen tüm alanları doldurun');
      }
      if (newPassword.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }

      await updatePasswordForced(newPassword);
      onSuccess?.();
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Şifre güncellenemedi';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      // No onClick - modal cannot be closed by clicking outside
    >
      <div
        className={`rounded-2xl max-w-md w-full shadow-2xl border animate-slide-up ${
          isDark
            ? 'bg-slate-850 border-slate-700/50'
            : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - no close button */}
        <div className={`p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Şifrenizi Değiştirin
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
            İlk girişte şifrenizi değiştirmeniz gerekmektedir. Devam etmek için yeni bir şifre belirleyin.
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl flex items-center gap-3 bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Yeni Şifre */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
              Yeni Şifre *
            </label>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className={`w-full rounded-xl pl-12 pr-12 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                  isDark
                    ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange'
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                }`}
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}
                disabled={loading}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Yeni Şifre Tekrar */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
              Yeni Şifre Tekrar *
            </label>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrenizi tekrar girin"
                className={`w-full rounded-xl pl-12 pr-12 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                  isDark
                    ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange'
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                } ${confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''}`}
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Şifreler eşleşmiyor</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
            className="w-full flex items-center justify-center gap-2 bg-safety-orange hover:bg-safety-orange-dark text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Güncelleniyor...
              </>
            ) : (
              'Şifreyi Güncelle'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
