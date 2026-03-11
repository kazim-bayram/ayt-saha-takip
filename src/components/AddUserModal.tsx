import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  AtSign,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { firebaseConfig } from '../firebase/config';
import { db } from '../firebase/config';
import { UserRole } from '../types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const { isDark } = useTheme();
  const { checkUsernameAvailable } = useAuth();

  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setPassword('');
    setUsername('');
    setDisplayName('');
    setRole('worker');
    setShowPassword(false);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate inputs
      if (!password || !username || !displayName) {
        throw new Error('Lütfen tüm alanları doldurun');
      }

      if (password.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }

      // Check username availability
      const isUsernameAvailable = await checkUsernameAvailable(username);
      if (!isUsernameAvailable) {
        throw new Error('Bu kullanıcı adı zaten kullanılıyor');
      }

      // Generate email from username with @ayt.local domain
      const email = `${username.toLowerCase()}@ayt.local`;

      // Create a secondary Firebase app instance for authentication only
      const secondaryAppName = 'SecondaryApp';
      
      // Check if secondary app already exists and delete it
      const existingApps = getApps();
      const existingSecondary = existingApps.find(app => app.name === secondaryAppName);
      if (existingSecondary) {
        await deleteApp(existingSecondary);
      }

      // Initialize secondary app (only for authentication)
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      // STEP 1: Create user with secondary auth (doesn't affect admin session)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

      // STEP 2: Create user profile in Firestore using MAIN db instance
      // This uses the admin's authentication context, not the new user's
      try {
        // Create clean user data object - ensure NO undefined values
        const userData = {
          uid: userCredential.user.uid ?? '',
          email: email ?? '',
          username: (username ?? '').toLowerCase(),
          displayName: displayName ?? '',
          role: role ?? 'worker',
          isActive: true,
          mustChangePassword: true,
          createdAt: serverTimestamp()
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      } catch (firestoreError: any) {
        // If Firestore write fails, clean up the auth user
        console.error('Firestore write failed:', firestoreError);
        try {
          // Delete the auth user since we couldn't create the profile
          await secondaryAuth.currentUser?.delete();
        } catch (deleteError) {
          console.error('Failed to cleanup auth user:', deleteError);
        }
        throw new Error('Profil oluşturulamadı. Lütfen Firestore kurallarını kontrol edin veya tekrar deneyin.');
      }

      // STEP 3: Sign out from secondary auth and clean up
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      setSuccess(true);
      
      // Wait a moment to show success message
      setTimeout(() => {
        handleClose();
        onUserCreated();
      }, 1500);

    } catch (err: any) {
      console.error('Error creating user:', err);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('Bu kullanıcı adı zaten kullanılıyor');
      } else if (err.code === 'auth/weak-password') {
        setError('Şifre çok zayıf. En az 6 karakter kullanın');
      } else {
        setError(err.message || 'Kullanıcı oluşturulurken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className={`rounded-2xl max-w-md w-full shadow-2xl border animate-slide-up ${
        isDark 
          ? 'bg-slate-850 border-slate-700/50' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-slate-700/50' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Yeni Kullanıcı Ekle
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-concrete-400 hover:text-white hover:bg-slate-700/50' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl flex items-center gap-3 bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-xl flex flex-col gap-2 bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="text-green-300 text-sm">Kullanıcı başarıyla oluşturuldu!</p>
              </div>
              <p className={`text-xs ml-8 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`}>
                Kullanıcı ilk girişte şifresini değiştirmek zorunda olacaktır.
              </p>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
              Ad Soyad *
            </label>
            <div className="relative">
              <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                className={`w-full rounded-xl pl-12 pr-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                  isDark 
                    ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange' 
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                }`}
                required
                disabled={loading || success}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
              Kullanıcı Adı *
            </label>
            <div className="relative">
              <AtSign className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="ahmet_yilmaz"
                className={`w-full rounded-xl pl-12 pr-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                  isDark 
                    ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange' 
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                }`}
                required
                minLength={3}
                disabled={loading || success}
              />
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
              Sadece harf, rakam ve alt çizgi (_) kullanabilirsiniz
            </p>
          </div>

          {/* Info about automatic email generation */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
            <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
              <strong>Not:</strong> Kullanıcı adından otomatik olarak <code className="px-1 py-0.5 rounded bg-black/20">@ayt.local</code> uzantılı e-posta oluşturulacaktır.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
              Şifre *
            </label>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full rounded-xl pl-12 pr-12 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-safety-orange/20 ${
                  isDark 
                    ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-concrete-500 focus:border-safety-orange' 
                    : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-safety-orange'
                }`}
                required
                minLength={6}
                disabled={loading || success}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}
                disabled={loading || success}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
              En az 6 karakter
            </p>
          </div>

          {/* Role */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-concrete-300' : 'text-gray-700'}`}>
              Rol *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('worker')}
                disabled={loading || success}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                  role === 'worker'
                    ? 'bg-blue-600/20 border-2 border-blue-500 text-blue-400'
                    : isDark
                      ? 'bg-slate-800 border-2 border-slate-600 text-concrete-400 hover:border-slate-500'
                      : 'bg-gray-100 border-2 border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <User className="w-5 h-5" />
                Çalışan
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                disabled={loading || success}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                  role === 'admin'
                    ? 'bg-safety-orange/20 border-2 border-safety-orange text-safety-orange'
                    : isDark
                      ? 'bg-slate-800 border-2 border-slate-600 text-concrete-400 hover:border-slate-500'
                      : 'bg-gray-100 border-2 border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                <Shield className="w-5 h-5" />
                Yönetici
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-2 bg-safety-orange hover:bg-safety-orange-dark text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Kullanıcı Oluşturuluyor...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Başarılı!
              </>
            ) : (
              'Kullanıcı Oluştur'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
