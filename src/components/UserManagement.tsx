import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Search,
  Shield,
  User,
  Mail,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  AtSign,
  UserPlus,
  Key,
  Trash2,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile, UserRole } from '../types';
import AddUserModal from './AddUserModal';
import { adminResetPassword, adminDeleteUser, adminRestoreUser } from '../services/adminApi';

interface UserManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ isOpen, onClose }) => {
  const { getAllUsers, updateUserRole, userProfile: currentUser } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getAllUsers();
      fetchedUsers.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      setUsers(fetchedUsers);
    } catch (err) {
      setToast({ type: 'error', message: 'Kullanıcılar yüklenemedi' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser?.uid) {
      setToast({ type: 'error', message: 'Kendi rolünüzü değiştiremezsiniz' });
      return;
    }

    setUpdatingUserId(userId);
    setShowRoleDropdown(null);

    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(user => 
        user.uid === userId ? { ...user, role: newRole } : user
      ));
      setToast({ type: 'success', message: `Kullanıcı rolü ${newRole === 'admin' ? 'Yönetici' : 'Çalışan'} olarak güncellendi` });
    } catch (err) {
      setToast({ type: 'error', message: 'Rol güncellenemedi' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenPasswordResetModal = (user: UserProfile) => {
    setResetPasswordUser(user);
    setNewPassword('');
    setShowPasswordResetModal(true);
  };

  const handlePasswordReset = async () => {
    if (!resetPasswordUser || !newPassword) return;
    
    if (newPassword.length < 6) {
      setToast({ type: 'error', message: 'Şifre en az 6 karakter olmalıdır' });
      return;
    }

    setResettingPassword(true);

    try {
      await adminResetPassword(resetPasswordUser.uid, newPassword);
      setToast({ type: 'success', message: `${resetPasswordUser.displayName} kullanıcısının şifresi başarıyla değiştirildi` });
      setShowPasswordResetModal(false);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Şifre değiştirilemedi';
      setToast({ type: 'error', message });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.uid === currentUser?.uid) {
      setToast({ type: 'error', message: 'Kendi hesabınızı silemezsiniz' });
      return;
    }

    if (!confirm(`${user.displayName} kullanıcısını devre dışı bırakmak istediğinize emin misiniz? Bu kullanıcı artık giriş yapamayacak.`)) {
      return;
    }

    setDeletingUserId(user.uid);

    try {
      await adminDeleteUser(user.uid);
      setUsers(prev => prev.map(u => 
        u.uid === user.uid ? { ...u, isActive: false } : u
      ));
      setToast({ type: 'success', message: `${user.displayName} devre dışı bırakıldı` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kullanıcı devre dışı bırakılamadı';
      setToast({ type: 'error', message });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleRestoreUser = async (user: UserProfile) => {
    setDeletingUserId(user.uid);

    try {
      await adminRestoreUser(user.uid);
      setUsers(prev => prev.map(u => 
        u.uid === user.uid ? { ...u, isActive: true } : u
      ));
      setToast({ type: 'success', message: `${user.displayName} tekrar aktif edildi` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kullanıcı aktif edilemedi';
      setToast({ type: 'error', message });
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Bilinmiyor';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query)
    );
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border animate-slide-up bg-white border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-lg">
              <Users className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">
                Kullanıcı ve Yetki Yönetimi
              </h2>
              <p className="text-sm text-slate-500">
                {users.length} kullanıcı
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-brand text-white hover:bg-brand-light"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Kullanıcı Ekle</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`mx-4 mt-4 p-3 rounded-xl flex items-center gap-3 animate-slide-up ${
            toast.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm ${toast.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {toast.message}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="İsim, e-posta veya kullanıcı adı ile ara..."
              className="w-full rounded-xl pl-12 pr-4 py-3 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-brand animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Kullanıcı bulunamadı</p>
            </div>
          ) : (
            <div className="px-4 pb-4">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Kullanıcı</th>
                      <th className="px-4 py-3">Kullanıcı Adı</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Kayıt Tarihi</th>
                      <th className="px-4 py-3">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} className={`hover:bg-slate-50 transition-colors ${user.isActive === false ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              user.role === 'admin' 
                                ? 'bg-brand/10' 
                                : 'bg-slate-200'
                            }`}>
                              {user.role === 'admin' ? (
                                <Shield className="w-5 h-5 text-brand" />
                              ) : (
                                <User className="w-5 h-5 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {user.displayName || 'İsimsiz'}
                                {user.uid === currentUser?.uid && (
                                  <span className="ml-2 text-xs text-slate-400">(Siz)</span>
                                )}
                                {user.isActive === false && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Devre Dışı</span>
                                )}
                              </p>
                              <p className="text-sm flex items-center gap-1 text-slate-500">
                                <Mail className="w-3.5 h-3.5" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <AtSign className="w-3.5 h-3.5" />
                            {user.username || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setShowRoleDropdown(showRoleDropdown === user.uid ? null : user.uid)}
                              disabled={updatingUserId === user.uid || user.uid === currentUser?.uid}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                user.role === 'admin'
                                  ? 'bg-brand/10 text-brand'
                                  : 'bg-slate-200 text-slate-600'
                              } ${user.uid !== currentUser?.uid ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                            >
                              {updatingUserId === user.uid ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  {user.role === 'admin' ? 'Yönetici' : 'Çalışan'}
                                  {user.uid !== currentUser?.uid && <ChevronDown className="w-3.5 h-3.5" />}
                                </>
                              )}
                            </button>

                            {showRoleDropdown === user.uid && user.uid !== currentUser?.uid && (
                              <div className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg border z-50 min-w-[120px] bg-white border-slate-200">
                                <button
                                  onClick={() => handleRoleChange(user.uid, 'worker')}
                                  className={`w-full text-left px-4 py-2 text-sm transition-colors text-slate-700 ${
                                    user.role === 'worker' ? 'bg-slate-100' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  Çalışan
                                </button>
                                <button
                                  onClick={() => handleRoleChange(user.uid, 'admin')}
                                  className={`w-full text-left px-4 py-2 text-sm transition-colors text-slate-700 ${
                                    user.role === 'admin' ? 'bg-slate-100' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  Yönetici
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenPasswordResetModal(user)}
                              disabled={user.isActive === false}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Şifre Değiştir"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            
                            {user.isActive === false ? (
                              <button
                                onClick={() => handleRestoreUser(user)}
                                disabled={deletingUserId === user.uid}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                                title="Aktif Et"
                              >
                                {deletingUserId === user.uid ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={deletingUserId === user.uid || user.uid === currentUser?.uid}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Devre Dışı Bırak"
                              >
                                {deletingUserId === user.uid ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.uid}
                    className={`rounded-xl p-4 border bg-slate-50 border-slate-200 ${user.isActive === false ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.role === 'admin' 
                            ? 'bg-brand/10' 
                            : 'bg-slate-200'
                        }`}>
                          {user.role === 'admin' ? (
                            <Shield className="w-5 h-5 text-brand" />
                          ) : (
                            <User className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {user.displayName || 'İsimsiz'}
                            {user.uid === currentUser?.uid && (
                              <span className="ml-2 text-xs text-slate-400">(Siz)</span>
                            )}
                            {user.isActive === false && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Devre Dışı</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            @{user.username || '-'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-brand/10 text-brand'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {user.role === 'admin' ? 'Yönetici' : 'Çalışan'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 mb-3 text-slate-500">
                      <p className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {user.email}
                      </p>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(user.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {user.uid !== currentUser?.uid && (
                        <button
                          onClick={() => handleRoleChange(user.uid, user.role === 'admin' ? 'worker' : 'admin')}
                          disabled={updatingUserId === user.uid || user.isActive === false}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-30"
                        >
                          {updatingUserId === user.uid ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Shield className="w-3.5 h-3.5" />
                              {user.role === 'admin' ? 'Çalışan Yap' : 'Yönetici Yap'}
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenPasswordResetModal(user)}
                        disabled={user.isActive === false}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-30"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Şifre Değiştir
                      </button>
                      {user.isActive === false ? (
                        <button
                          onClick={() => handleRestoreUser(user)}
                          disabled={deletingUserId === user.uid}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                        >
                          {deletingUserId === user.uid ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Aktif Et
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={deletingUserId === user.uid || user.uid === currentUser?.uid}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-30"
                        >
                          {deletingUserId === user.uid ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              Devre Dışı Bırak
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserCreated={() => {
          fetchUsers();
          setToast({ type: 'success', message: 'Yeni kullanıcı başarıyla oluşturuldu' });
        }}
      />

      {/* Password Reset Modal */}
      {showPasswordResetModal && resetPasswordUser && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !resettingPassword) {
              setShowPasswordResetModal(false);
              setResetPasswordUser(null);
              setNewPassword('');
            }
          }}
        >
          <div className="rounded-2xl max-w-md w-full shadow-2xl border animate-slide-up bg-white border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  Şifre Değiştir
                </h2>
                <p className="text-sm text-slate-500">
                  {resetPasswordUser.displayName} - @{resetPasswordUser.username}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setResetPasswordUser(null);
                  setNewPassword('');
                }}
                disabled={resettingPassword}
                className="p-2 rounded-lg transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl border bg-yellow-50 border-yellow-200">
                <p className="text-xs text-yellow-700">
                  <strong>Uyarı:</strong> Yeni şifreyi kullanıcıya güvenli bir şekilde iletmeyi unutmayın.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">
                  Yeni Şifre *
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    className="w-full rounded-xl pl-12 pr-12 py-3 transition-all focus:outline-none bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
                    required
                    minLength={6}
                    disabled={resettingPassword}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    disabled={resettingPassword}
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs mt-1 text-slate-400">
                  Minimum 6 karakter
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordResetModal(false);
                    setResetPasswordUser(null);
                    setNewPassword('');
                  }}
                  disabled={resettingPassword}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={resettingPassword || !newPassword || newPassword.length < 6}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Değiştiriliyor...
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      Şifreyi Değiştir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
