import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  UserCog,
  LogOut,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

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
  const { isDark, toggleTheme } = useTheme();
  const { userProfile, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          isDark 
            ? 'bg-slate-700/50 hover:bg-slate-700' 
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        <User className={`w-4 h-4 ${isDark ? 'text-concrete-400' : 'text-gray-500'}`} />
        <div className="hidden sm:flex flex-col items-start">
          <span className={`text-sm font-medium ${isDark ? 'text-concrete-200' : 'text-gray-700'}`}>
            {userProfile?.displayName}
          </span>
          {userProfile?.username && (
            <span className={`text-xs ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
              @{userProfile.username}
            </span>
          )}
        </div>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
          isAdmin 
            ? 'bg-safety-orange/20 text-safety-orange' 
            : isDark 
              ? 'bg-steel-600/20 text-steel-300' 
              : 'bg-blue-100 text-blue-700'
        }`}>
          {isAdmin ? 'Yönetici' : 'Çalışan'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${
          isOpen ? 'rotate-180' : ''
        } ${isDark ? 'text-concrete-400' : 'text-gray-500'}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border z-50 overflow-hidden ${
          isDark 
            ? 'bg-slate-800 border-slate-600' 
            : 'bg-white border-gray-200'
        }`}>
          {/* Profile Settings */}
          <button
            onClick={() => handleItemClick(onOpenProfileSettings)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              isDark 
                ? 'text-white hover:bg-slate-700' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Profil Ayarları</span>
          </button>

          {/* User Management (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => handleItemClick(onOpenUserManagement)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                isDark 
                  ? 'text-white hover:bg-slate-700' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <UserCog className="w-4 h-4" />
              <span>Kullanıcı ve Yetki Yönetimi</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => handleItemClick(toggleTheme)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              isDark 
                ? 'text-white hover:bg-slate-700' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Gündüz Modu' : 'Gece Modu'}</span>
          </button>

          {/* Divider */}
          <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />

          {/* Logout */}
          <button
            onClick={() => handleItemClick(onLogout)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
              isDark 
                ? 'text-red-400 hover:bg-red-500/10' 
                : 'text-red-600 hover:bg-red-50'
            }`}
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
