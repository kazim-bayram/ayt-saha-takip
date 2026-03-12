import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  AtSign,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'password';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ isOpen, onClose }) => {
  const { 
    userProfile, 
    checkUsernameAvailable, 
    updateUserProfile,
    updateUserPassword
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [toast, setToast] = useState<Toast | null>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'same'>('idle');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setUsername(userProfile.username || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!isOpen) return null;

  const handleUsernameChange = async (value: string) => {
    const lowered = value.toLowerCase();
    setUsername(lowered);

    if (!lowered.trim() || lowered.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    if (lowered === userProfile?.username) {
      setUsernameStatus('same');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(lowered)) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');

    try {
      const isAvailable = await checkUsernameAvailable(lowered, userProfile?.uid);
      setUsernameStatus(isAvailable ? 'available' : 'taken');
    } catch {
      setUsernameStatus('idle');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'taken') return;

    setProfileLoading(true);
    try {
      const updates: { displayName?: string; username?: string } = {};
      
      if (displayName !== userProfile?.displayName) {
        updates.displayName = displayName;
      }
      if (username !== userProfile?.username) {
        updates.username = username;
      }

      if (Object.keys(updates).length > 0) {
        await updateUserProfile(updates);
        setToast({ type: 'success', message: 'Profil başarıyla güncellendi' });
        setUsernameStatus('same');
      }
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Profil güncellenemedi' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'Yeni şifreler eşleşmiyor' });
      return;
    }

    if (newPassword.length < 6) {
      setToast({ type: 'error', message: 'Yeni şifre en az 6 karakter olmalıdır' });
      return;
    }

    setPasswordLoading(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      setToast({ type: 'success', message: 'Şifre başarıyla güncellendi' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Şifre güncellenemedi';
      if (message.includes('auth/wrong-password') || message.includes('auth/invalid-credential')) {
        setToast({ type: 'error', message: 'Mevcut şifre yanlış' });
      } else if (message.includes('auth/requires-recent-login')) {
        setToast({ type: 'error', message: 'Güvenlik nedeniyle yeniden giriş yapmanız gerekiyor' });
      } else {
        setToast({ type: 'error', message });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profil', icon: <User className="w-4 h-4" /> },
    { key: 'password', label: 'Şifre', icon: <Lock className="w-4 h-4" /> }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="rounded-2xl max-w-lg w-full shadow-2xl border animate-slide-up bg-white border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">
            Profil Ayarları
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`mx-4 mt-4 p-3 rounded-xl flex items-center gap-3 animate-slide-up ${
            toast.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <p className={toast.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {toast.message}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-brand border-b-2 border-brand'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Ad Soyad
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl pl-12 pr-4 py-3 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={`w-full rounded-xl pl-12 pr-12 py-3 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 ${usernameStatus === 'taken' ? 'border-red-500' : ''} ${usernameStatus === 'available' ? 'border-green-500' : ''}`}
                    required
                    minLength={3}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    )}
                    {usernameStatus === 'available' && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {usernameStatus === 'taken' && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                {usernameStatus === 'taken' && (
                  <p className="text-red-600 text-xs mt-1">Bu kullanıcı adı zaten kullanılıyor</p>
                )}
              </div>

              <button
                type="submit"
                disabled={profileLoading || usernameStatus === 'taken' || usernameStatus === 'checking'}
                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {profileLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Kaydet
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Mevcut Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl pl-12 pr-12 py-3 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl pl-12 pr-4 py-3 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full rounded-xl pl-12 pr-4 py-3 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 ${newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''}`}
                    required
                    minLength={6}
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-600 text-xs mt-1">Şifreler eşleşmiyor</p>
                )}
              </div>

              <button
                type="submit"
                disabled={passwordLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {passwordLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Şifreyi Güncelle
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
