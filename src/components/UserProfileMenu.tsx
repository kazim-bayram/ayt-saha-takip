import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  UserCog,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserProfileMenuProps {
  onOpenProfileSettings: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onOpenProfileSettings,
  onOpenUserManagement,
  onLogout
}) => {
  const { userProfile, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors bg-slate-100 hover:bg-slate-200"
      >
        <User className="w-4 h-4 text-slate-500" />
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-slate-700">
            {userProfile?.displayName}
          </span>
          {userProfile?.username && (
            <span className="text-xs text-slate-400">
              @{userProfile.username}
            </span>
          )}
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
          isAdmin 
            ? 'bg-brand/10 text-brand' 
            : 'bg-blue-100 text-blue-700'
        }`}>
          {isAdmin ? 'Yönetici' : 'Çalışan'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform text-slate-500 ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg border z-50 overflow-hidden bg-white border-slate-200">
          <button
            onClick={() => handleItemClick(onOpenProfileSettings)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-slate-700 hover:bg-slate-50"
          >
            <Settings className="w-4 h-4" />
            <span>Profil Ayarları</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => handleItemClick(onOpenUserManagement)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-slate-700 hover:bg-slate-50"
            >
              <UserCog className="w-4 h-4" />
              <span>Kullanıcı ve Yetki Yönetimi</span>
            </button>
          )}

          <button
            onClick={() => handleItemClick(() => navigate('/weekly-plan'))}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-slate-700 hover:bg-slate-50"
          >
            <Settings className="w-4 h-4" />
            <span>Haftalık İş Planı</span>
          </button>

          <div className="border-t border-slate-200" />

          <button
            onClick={() => handleItemClick(onLogout)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;
