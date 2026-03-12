import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TablePage from './pages/TablePage';
import FormBuilder from './pages/admin/FormBuilder';
import ProjectConsole from './pages/ProjectConsole';
import AppLayout from './components/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';
import ChangePasswordModal from './components/ChangePasswordModal';
import ProfileSettings from './components/ProfileSettings';
import UserManagement from './components/UserManagement';
import { CheckCircle2 } from 'lucide-react';

const AdminFormBuilderRoute: React.FC = () => {
  const { userProfile } = useAuth();
  if (userProfile?.role !== 'admin') return <Navigate to="/" replace />;
  return <FormBuilder />;
};

const App: React.FC = () => {
  const { currentUser, userProfile, loading, isAdmin } = useAuth();
  const [showPasswordChangeToast, setShowPasswordChangeToast] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  useEffect(() => {
    if (!showPasswordChangeToast) return;
    const timer = setTimeout(() => setShowPasswordChangeToast(false), 3000);
    return () => clearTimeout(timer);
  }, [showPasswordChangeToast]);

  if (loading) {
    return <LoadingSpinner fullScreen message="AYT Mühendislik Takip Sistemi yükleniyor..." />;
  }

  if (!currentUser) return <Login />;

  if (!userProfile) {
    return <LoadingSpinner fullScreen message="Profiliniz yükleniyor..." />;
  }

  if (userProfile.mustChangePassword === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <ChangePasswordModal onSuccess={() => setShowPasswordChangeToast(true)} />
      </div>
    );
  }

  return (
    <>
      <AppLayout
        onOpenProfileSettings={() => setShowProfileSettings(true)}
        onOpenUserManagement={() => setShowUserManagement(true)}
      >
        <Routes>
          <Route path="/" element={<ProjectConsole />} />
          <Route path="/saha-notlari" element={<Dashboard />} />
          {/* Table view is available to all authenticated users; RBAC is enforced in hooks */}
          <Route path="/table-view" element={<TablePage />} />
          <Route path="/form-builder" element={<AdminFormBuilderRoute />} />
          <Route path="/weekly-plan" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>

      {/* Global modals */}
      <ProfileSettings isOpen={showProfileSettings} onClose={() => setShowProfileSettings(false)} />
      {isAdmin && <UserManagement isOpen={showUserManagement} onClose={() => setShowUserManagement(false)} />}

      {showPasswordChangeToast && (
        <div className="fixed bottom-4 right-4 z-[110] flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200 shadow-lg animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700 text-sm font-medium">Şifreniz güncellendi. Sisteme hoş geldiniz.</p>
        </div>
      )}
    </>
  );
};

export default App;
