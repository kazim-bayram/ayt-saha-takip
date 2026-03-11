import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Table2,
  Settings2,
  Users,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Moon,
  Sun,
  HardHat,
  ClipboardList
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Proje Konsol' },
  { to: '/saha-notlari', icon: ClipboardList, label: 'Saha Notları' },
  { to: '/table-view', icon: Table2, label: 'Tablo Görünümü', adminOnly: true },
  { to: '/form-builder', icon: Settings2, label: 'Form Oluşturucu', adminOnly: true },
];

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenProfileSettings: () => void;
  onOpenUserManagement: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onOpenProfileSettings, onOpenUserManagement }) => {
  const { isDark, toggleTheme } = useTheme();
  const { logout, isAdmin, userProfile } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 flex flex-col transition-all duration-300 border-r ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
        } ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 px-4 h-16 border-b flex-shrink-0 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-safety-orange to-safety-orange-dark flex items-center justify-center flex-shrink-0">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className={`text-sm font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                AYT Mühendislik
              </h1>
              <p className={`text-[10px] font-medium tracking-wider uppercase ${isDark ? 'text-safety-orange' : 'text-safety-orange-dark'}`}>
                Proje Yönetim OS
              </p>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {filteredNav.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? isDark
                      ? 'bg-safety-orange/15 text-safety-orange shadow-glow-orange'
                      : 'bg-safety-orange/10 text-safety-orange-dark'
                    : isDark
                      ? 'text-concrete-400 hover:text-white hover:bg-slate-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? '' : ''}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className={`flex-shrink-0 border-t px-2 py-3 space-y-1 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          {/* User info */}
          <button
            onClick={onOpenProfileSettings}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={collapsed ? 'Profil Ayarları' : undefined}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              isDark ? 'bg-slate-700 text-concrete-300' : 'bg-gray-200 text-gray-600'
            }`}>
              {(userProfile?.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 text-left">
                <p className={`text-sm font-medium truncate ${isDark ? 'text-concrete-200' : 'text-gray-800'}`}>
                  {userProfile?.displayName || userProfile?.username}
                </p>
                <p className={`text-[10px] ${isDark ? 'text-concrete-500' : 'text-gray-400'}`}>
                  {isAdmin ? 'Yönetici' : 'Personel'}
                </p>
              </div>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={onOpenUserManagement}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={collapsed ? 'Kullanıcı Yönetimi' : undefined}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>Kullanıcı Yönetimi</span>}
            </button>
          )}

          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isDark ? 'text-concrete-400 hover:text-white hover:bg-slate-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={collapsed ? (isDark ? 'Gündüz Modu' : 'Gece Modu') : undefined}
          >
            {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
            {!collapsed && <span>{isDark ? 'Gündüz Modu' : 'Gece Modu'}</span>}
          </button>

          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:text-red-700 hover:bg-red-50'
            }`}
            title={collapsed ? 'Çıkış Yap' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Çıkış Yap</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
              isDark ? 'text-concrete-500 hover:text-concrete-300 hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            {collapsed ? <PanelLeft className="w-4 h-4 flex-shrink-0" /> : <PanelLeftClose className="w-4 h-4 flex-shrink-0" />}
            {!collapsed && <span>Daralt</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
