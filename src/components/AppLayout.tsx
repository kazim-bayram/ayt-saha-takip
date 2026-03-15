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
  HardHat,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Proje Takip' },
  { to: '/saha-notlari', icon: ClipboardList, label: 'Saha Notları' },
  // Table view should be visible to all authenticated users; RBAC is enforced in hooks
  { to: '/table-view', icon: Table2, label: 'Tablo Görünümü' },
  { to: '/form-builder', icon: Settings2, label: 'Form Oluşturucu', adminOnly: true },
];

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenProfileSettings: () => void;
  onOpenUserManagement: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onOpenProfileSettings, onOpenUserManagement }) => {
  const { logout, isAdmin, userProfile } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const filteredNav = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen((o) => !o)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Menüyü aç/kapat"
          >
            {mobileNavOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeft className="w-5 h-5" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate text-slate-800">
                AYT Mühendislik
              </h1>
              <p className="text-[10px] font-medium tracking-wider uppercase text-brand">
                Yalova Saha Takip Sistemi
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-shrink-0 flex-col transition-all duration-300 bg-white border-r border-slate-200 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
            <HardHat className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate text-slate-800">
                AYT Mühendislik
              </h1>
              <p className="text-[10px] font-medium tracking-wider uppercase text-brand">
                Yalova Saha Takip Sistemi
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand/10 text-brand'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="flex-shrink-0 border-t border-slate-200 px-2 py-3 space-y-1">
          <button
            onClick={onOpenProfileSettings}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            title={collapsed ? 'Profil Ayarları' : undefined}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-slate-200 text-slate-600">
              {(userProfile?.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium truncate text-slate-800">
                  {userProfile?.displayName || userProfile?.username}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isAdmin ? 'Yönetici' : 'Personel'}
                </p>
              </div>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={onOpenUserManagement}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              title={collapsed ? 'Kullanıcı Yönetimi' : undefined}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>Kullanıcı Yönetimi</span>}
            </button>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-red-600 hover:text-red-700 hover:bg-red-50"
            title={collapsed ? 'Çıkış Yap' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Çıkış Yap</span>}
          </button>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            {collapsed ? <PanelLeft className="w-4 h-4 flex-shrink-0" /> : <PanelLeftClose className="w-4 h-4 flex-shrink-0" />}
            {!collapsed && <span>Daralt</span>}
          </button>
        </div>
      </aside>

      {/* Mobile slide-in nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-72 max-w-[80%] h-full bg-white border-r border-slate-200 flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
                  <HardHat className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  AYT Mühendislik
                </span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Menüyü kapat"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
              {filteredNav.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-brand/10 text-brand'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 px-3 py-3 space-y-1">
              <button
                onClick={() => { setMobileNavOpen(false); onOpenProfileSettings(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-slate-200 text-slate-600">
                  {(userProfile?.displayName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium truncate text-slate-800">
                    {userProfile?.displayName || userProfile?.username}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {isAdmin ? 'Yönetici' : 'Personel'}
                  </p>
                </div>
              </button>

              {isAdmin && (
                <button
                  onClick={() => { setMobileNavOpen(false); onOpenUserManagement(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Users className="w-5 h-5 flex-shrink-0" />
                  <span>Kullanıcı Yönetimi</span>
                </button>
              )}

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
          <button
            className="flex-1 h-full bg-black/40"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Menüyü kapat"
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
