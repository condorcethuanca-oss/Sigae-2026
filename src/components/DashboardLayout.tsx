import React, { useState } from 'react';
import {
  School,
  Shield,
  Briefcase,
  HeartHandshake,
  GraduationCap,
  LogOut,
  Bell,
  Menu,
  X,
  User,
  MessageSquare,
  Home,
  BookOpen,
  Settings,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { SigaeUser, SigaeRole } from '../types';
import { NotificationBellDropdown } from './notifications/NotificationBellDropdown';

interface DashboardLayoutProps {
  currentUser: SigaeUser;
  activeTab: 'inicio' | 'academico' | 'mensajeria' | 'perfil';
  onTabChange: (tab: 'inicio' | 'academico' | 'mensajeria' | 'perfil') => void;
  onLogout: () => void;
  onQuickRoleSwitch?: (role: SigaeRole) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onLogout,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Helper for role metadata
  const getRoleBadge = (role: SigaeRole) => {
    switch (role) {
      case 'director':
        return {
          label: 'DIRECTOR',
          title: 'Panel del Director',
          color: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60',
          dotColor: 'bg-indigo-400',
          icon: Shield,
        };
      case 'profesor':
        return {
          label: 'PROFESOR',
          title: 'Panel del Profesor',
          color: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
          dotColor: 'bg-amber-400',
          icon: Briefcase,
        };
      case 'padre':
        return {
          label: 'PADRE / MADRE',
          title: 'Panel del Padre/Madre',
          color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          dotColor: 'bg-emerald-400',
          icon: HeartHandshake,
        };
      case 'alumno':
      default:
        return {
          label: 'ALUMNO',
          title: 'Panel del Alumno',
          color: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
          dotColor: 'bg-sky-400',
          icon: GraduationCap,
        };
    }
  };

  const badge = getRoleBadge(currentUser.role);
  const RoleIcon = badge.icon;

  interface NavItem {
    id: 'inicio' | 'academico' | 'mensajeria' | 'perfil';
    label: string;
    icon: any;
    badge?: string;
  }

  const navItems: NavItem[] = [
    { id: 'inicio', label: 'Inicio / Resumen', icon: Home },
    { id: 'academico', label: 'Área Académica', icon: BookOpen },
    { id: 'mensajeria', label: 'Mensajería Interna', icon: MessageSquare, badge: 'Oficial' },
    { id: 'perfil', label: 'Mi Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0 sticky top-0 h-screen z-30">
        {/* Logo and Identity */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white font-mono block">
                SIGAE
              </span>
              <span className="text-[10px] text-slate-400 font-medium block -mt-1 truncate max-w-[150px]">
                U.E. Luis Espinal Tarde de Collpani (SIE: 80730142)
              </span>
            </div>
          </div>
        </div>

        {/* User Card in Sidebar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold overflow-hidden shrink-0">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{currentUser.displayName.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {currentUser.displayName}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${badge.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}></span>
                  {badge.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto text-xs">
          {navItems.map(item => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full p-2.5 rounded-xl font-medium transition-all flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ItemIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Role Switcher Footer */}
        {/* Institutional Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/30">
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 text-center font-mono">
            SIE 80730142 · U.E. Luis Espinal
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full py-2.5 px-3 rounded-lg text-rose-300 hover:text-white hover:bg-rose-950/50 border border-transparent hover:border-rose-800/60 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          ></div>

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85%] bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <School className="w-4 h-4" />
                </div>
                <span className="font-bold text-white font-mono text-sm">SIGAE BOLIVIA</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User profile */}
            <div className="p-4 bg-slate-950/50 border-b border-slate-800">
              <div className="text-xs font-bold text-white">{currentUser.displayName}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{currentUser.email}</div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 mt-2 ${badge.color}`}>
                <RoleIcon className="w-3 h-3" />
                {badge.label}
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 text-xs overflow-y-auto">
              {navItems.map(item => {
                const ItemIcon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl font-medium flex items-center gap-2.5 ${
                      isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <ItemIcon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 bg-rose-950/60 border border-rose-800/80 text-rose-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* HEADER */}
        <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 h-16 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  {badge.title}
                </span>
                <span className="hidden sm:inline-block text-[11px] text-slate-500 font-mono">
                  · SIGAE 2026
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                {activeTab === 'inicio' && 'Resumen general y métricas institucionales'}
                {activeTab === 'academico' && 'Control curricular y seguimiento escolar'}
                {activeTab === 'mensajeria' && 'Canal oficial de comunicación interna'}
                {activeTab === 'perfil' && 'Información de cuenta y datos personales'}
              </span>
            </div>
          </div>

          {/* Right Header Icons */}
          <div className="flex items-center gap-3">
            {/* Academic Period Badge */}
            <span className="hidden md:inline-flex text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full items-center gap-1.5">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>1er Trimestre · 2026</span>
            </span>

            {/* Notifications Popover */}
            <NotificationBellDropdown currentUserUid={currentUser.uid} />

            {/* User Mini Avatar Header */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold overflow-hidden">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{currentUser.displayName.charAt(0)}</span>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                  {currentUser.displayName}
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-none">
                  {currentUser.ci || 'Bolivia'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
