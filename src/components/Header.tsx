import React from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, Lock, GraduationCap, Users, BookOpen, BarChart3, LogOut, CheckCircle2, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  activeTab: 'grades' | 'admin' | 'sentiment' | 'attendance';
  setActiveTab: (tab: 'grades' | 'admin' | 'sentiment' | 'attendance') => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onQuickSwitchUser: (user: User) => void;
  allUsers: User[];
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenLogin,
  onLogout,
  onQuickSwitchUser,
  allUsers,
}) => {
  const [showSwitchMenu, setShowSwitchMenu] = React.useState(false);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'director':
        return 'Dirección Académica';
      case 'teacher':
        return 'Profesor / Docente';
      case 'parent':
        return 'Padre de Familia';
      case 'student':
        return 'Estudiante';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
      {/* Top institution bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-inner font-bold text-lg">
              SM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-white text-base">
                  Colegio Privado San Martín de Porres
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Red Privada
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sistema Integral de Gestión Escolar · Bimestre I 2026
              </p>
            </div>
          </div>

          {/* User profile & Action */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                {/* Role Switcher for seamless preview/evaluation */}
                <div className="relative">
                  <button
                    onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    title="Cambiar rol para probar accesos"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-slate-300">{currentUser.name}</span>
                    <span className="text-slate-500">({getRoleLabel(currentUser.role)})</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {showSwitchMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 text-xs text-slate-200">
                      <div className="px-3 py-1.5 font-semibold text-slate-400 border-b border-slate-700/60 uppercase text-[10px] tracking-wider">
                        Cambiar de Usuario de Prueba
                      </div>

                      {/* Teachers */}
                      <div className="px-3 py-1 text-[11px] font-medium text-indigo-400 mt-1">Docentes (Portal Privado con PIN):</div>
                      {allUsers
                        .filter(u => u.role === 'teacher')
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onQuickSwitchUser(u);
                              setShowSwitchMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-700/70 transition-colors ${
                              currentUser.id === u.id ? 'bg-indigo-900/40 text-indigo-200 font-semibold' : ''
                            }`}
                          >
                            <span className="truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400">PIN: {u.teacherPin || '7731'}</span>
                          </button>
                        ))}

                      {/* Parents */}
                      <div className="px-3 py-1 text-[11px] font-medium text-amber-400 mt-2">Padres de Familia:</div>
                      {allUsers
                        .filter(u => u.role === 'parent')
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onQuickSwitchUser(u);
                              setShowSwitchMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-700/70 transition-colors ${
                              currentUser.id === u.id ? 'bg-amber-900/30 text-amber-200 font-semibold' : ''
                            }`}
                          >
                            <span className="truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400">{u.linkedStudentIds?.length || 1} hijo(s)</span>
                          </button>
                        ))}

                      {/* Students */}
                      <div className="px-3 py-1 text-[11px] font-medium text-sky-400 mt-2">Alumnos (5to Sec):</div>
                      {allUsers
                        .filter(u => u.role === 'student')
                        .slice(0, 3)
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onQuickSwitchUser(u);
                              setShowSwitchMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-700/70 transition-colors ${
                              currentUser.id === u.id ? 'bg-sky-900/30 text-sky-200 font-semibold' : ''
                            }`}
                          >
                            <span className="truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400">{u.studentCode}</span>
                          </button>
                        ))}

                      {/* Admin */}
                      <div className="px-3 py-1 text-[11px] font-medium text-emerald-400 mt-2">Dirección:</div>
                      {allUsers
                        .filter(u => u.role === 'director' || (u.role as string) === 'admin')
                        .map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              onQuickSwitchUser(u);
                              setShowSwitchMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-700/70 transition-colors ${
                              currentUser.id === u.id ? 'bg-emerald-900/30 text-emerald-200 font-semibold' : ''
                            }`}
                          >
                            <span className="truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400">Dirección</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Acceso Privado Institucional
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 border-t border-slate-800 py-1.5 overflow-x-auto">
          {/* Calificaciones y Reportes */}
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'grades'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {currentUser?.role === 'teacher' ? (
              <>
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Registro Docente Privado (Calificaciones)</span>
              </>
            ) : currentUser?.role === 'parent' || currentUser?.role === 'student' ? (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                <span>Boleta de Calificaciones en Tiempo Real</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gestión de Notas y Boletines</span>
              </>
            )}
          </button>

          {/* Control de Asistencia */}
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Control de Asistencia</span>
          </button>

          {/* Registro y Base de Datos (Admin / Docentes) */}
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Base de Datos Escolar (Alumnos, Profesores, Padres)</span>
          </button>

          {/* Customer Sentiment Dashboard */}
          <button
            onClick={() => setActiveTab('sentiment')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'sentiment'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Customer Sentiment Dashboard (Encuestas y Clima Escolar)</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
