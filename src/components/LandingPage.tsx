import React from 'react';
import {
  School,
  Shield,
  Briefcase,
  HeartHandshake,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Lock,
  MessageSquare,
  Smartphone,
  ChevronRight,
  Sparkles,
  Users,
  Award,
} from 'lucide-react';
import { SigaeRole } from '../types';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  onQuickDemoLogin: (role: SigaeRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToRegister,
  onQuickDemoLogin,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. TOP INSTITUTIONAL BAR */}
      <div className="bg-slate-900/90 border-b border-slate-800 text-xs py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">Plataforma Oficial Escolar</span>
            <span className="text-slate-600">·</span>
            <span>U.E. Luis Espinal Tarde de Collpani (SIE: 80730142)</span>
            <span className="text-slate-600">·</span>
            <span>El Alto, Bolivia</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Gestión Académica 2026</span>
            <span className="text-slate-600">·</span>
            <span className="text-indigo-400 font-mono font-medium">Seguridad Firebase ABAC</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white font-mono">
                  SIGAE
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                  Bolivia
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Sistema Integral de Gestión Académica Escolar
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onGoToLogin}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Iniciar sesión</span>
            </button>
            <button
              onClick={onGoToRegister}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Crear cuenta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-900">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Plataforma moderna, segura y clara para computadoras y teléfonos</span>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Control escolar inteligente para la comunidad educativa
            </h1>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
              SIGAE centraliza la gestión académica de la unidad educativa en un entorno jerárquico seguro, facilitando la colaboración transparente entre dirección, plantel docente, familias y estudiantes.
            </p>
          </div>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={onGoToLogin}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Iniciar sesión en SIGAE</span>
            </button>
            <button
              onClick={onGoToRegister}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800/90 text-slate-200 hover:text-white font-semibold rounded-xl text-sm border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Crear cuenta nueva</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Quick Demo Credentials Guide */}
          <div className="pt-10 max-w-2xl mx-auto">
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 text-xs space-y-3 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Credenciales institucionales para evaluación oficial:
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Formulario de acceso seguro</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => onQuickDemoLogin('director')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-indigo-950/60 border border-indigo-900/60 text-indigo-300 font-medium text-[11px] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>1. Director</span>
                  <span className="text-[9px] text-slate-500 font-mono">director@sigae.edu.bo</span>
                </button>
                <button
                  onClick={() => onQuickDemoLogin('profesor')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-amber-950/60 border border-amber-900/60 text-amber-300 font-medium text-[11px] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  <span>2. Profesor</span>
                  <span className="text-[9px] text-slate-500 font-mono">carlos.mamani@...</span>
                </button>
                <button
                  onClick={() => onQuickDemoLogin('padre')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-emerald-950/60 border border-emerald-900/60 text-emerald-300 font-medium text-[11px] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <HeartHandshake className="w-4 h-4 text-emerald-400" />
                  <span>3. Padre/Madre</span>
                  <span className="text-[9px] text-slate-500 font-mono">roberto.gonzalez@...</span>
                </button>
                <button
                  onClick={() => onQuickDemoLogin('alumno')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-sky-950/60 border border-sky-900/60 text-sky-300 font-medium text-[11px] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-sky-400" />
                  <span>4. Alumno</span>
                  <span className="text-[9px] text-slate-500 font-mono">santiago.gonzalez@...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE FOUR HIERARCHICAL ROLES */}
      <section className="py-16 sm:py-24 bg-slate-950/60 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">
              Estructura Jerárquica de Acceso
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Cuatro tipos de usuario con permisos estrictos
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Cada usuario ingresa a su panel correspondiente. La seguridad se controla en Firebase mediante reglas que impiden el acceso a información no autorizada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. DIRECTOR */}
            <div className="bg-slate-900/70 border border-indigo-900/40 rounded-2xl p-6 space-y-4 hover:border-indigo-600/60 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">DIRECTOR</h3>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      Nivel 1
                    </span>
                  </div>
                  <p className="text-xs text-indigo-300/80 font-medium mt-1">
                    Administrador general de la institución
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gestiona las cuentas de los profesores, asignación de cursos, emisión de circulares oficiales y supervisión global del colegio.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Registro restringido por Dirección</span>
              </div>
            </div>

            {/* 2. PROFESOR */}
            <div className="bg-slate-900/70 border border-amber-900/40 rounded-2xl p-6 space-y-4 hover:border-amber-600/60 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">PROFESOR</h3>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      Nivel 2
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/80 font-medium mt-1">
                    Gestión de aula y materias
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Administra su grupo asignado de alumnos y padres. Carga de calificaciones, asistencia diaria y seguimiento curricular.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Privacidad estricta entre profesores</span>
              </div>
            </div>

            {/* 3. PADRE / MADRE */}
            <div className="bg-slate-900/70 border border-emerald-900/40 rounded-2xl p-6 space-y-4 hover:border-emerald-600/60 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">PADRE / MADRE</h3>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Nivel 3
                    </span>
                  </div>
                  <p className="text-xs text-emerald-300/80 font-medium mt-1">
                    Portal de seguimiento familiar
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Accede únicamente a la información académica, asistencia, reportes de notas y comunicados de sus propios hijos matriculados.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acceso exclusivo a sus hijos</span>
              </div>
            </div>

            {/* 4. ALUMNO */}
            <div className="bg-slate-900/70 border border-sky-900/40 rounded-2xl p-6 space-y-4 hover:border-sky-600/60 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-sky-950/80 border border-sky-700/60 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">ALUMNO</h3>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                      Nivel 4
                    </span>
                  </div>
                  <p className="text-xs text-sky-300/80 font-medium mt-1">
                    Portal del estudiante
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Consulta de materias, horario escolar, tareas y expediente de notas personal publicado por sus profesores.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Privacidad individual garantizada</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SYSTEM FEATURES */}
      <section className="py-16 sm:py-20 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Diseñado para el contexto escolar de Bolivia
            </h2>
            <p className="text-xs text-slate-400">
              Compatibilidad con el sistema trimestral y codificación SIE oficial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Autenticación con Firebase</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingreso por correo, Google y teléfono móvil. Reglas de seguridad estrictas que impiden la alteración no autorizada de notas y datos.
              </p>
            </div>

            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-700/50 text-sky-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Mensajería y Circulares</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Canal oficial de comunicación interna entre Dirección, docentes y familias sin distracciones ni llamadas externas.
              </p>
            </div>

            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">100% Adaptable a Teléfonos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Interfaz fluida optimizada para profesores que registran notas en aula y padres que consultan desde sus teléfonos móviles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="py-8 bg-slate-950 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-300">SIGAE</span>
            <span>· Sistema Integral de Gestión Académica Escolar</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Bolivia · Gestión Escolar 2026</span>
            <span className="text-slate-700">|</span>
            <button
              onClick={onGoToLogin}
              className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Acceso a Sistema
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
