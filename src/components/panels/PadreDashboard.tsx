import React from 'react';
import {
  HeartHandshake,
  GraduationCap,
  Award,
  CheckCircle2,
  Calendar,
  Clock,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import { SigaeUser } from '../../types';

interface PadreDashboardProps {
  currentUser: SigaeUser;
  onNavigateToTab: (tab: 'inicio' | 'academico' | 'mensajeria' | 'perfil') => void;
}

export const PadreDashboard: React.FC<PadreDashboardProps> = ({
  currentUser,
  onNavigateToTab,
}) => {
  const linking = currentUser.studentLinking;
  const hasLinkedStudent = Boolean(linking && linking.studentName);

  const children = hasLinkedStudent
    ? [
        {
          id: 'child-linked-1',
          name: linking?.studentName || 'Estudiante Tutelado',
          rude: linking?.studentRude || 'Pendiente RUDE',
          grade: linking?.grade || 'Secundaria',
          parallel: 'A',
          school: 'U.E. Luis Espinal Tarde de Collpani (SIE: 80730142)',
          relationship: linking?.relationship || 'Tutor Legal',
          status: linking?.status === 'aprobada' || currentUser.hasApprovedChildLink ? 'Vinculación Aprobada' : 'En Verificación Institucional',
          isApproved: linking?.status === 'aprobada' || currentUser.hasApprovedChildLink,
          gpa: 'En curso (Gestión 2026)',
          attendanceRate: 'Control de asistencia en línea',
          tutorName: linking?.status === 'aprobada' ? 'Plantel Docente Asignado' : 'Pendiente de aprobación institucional',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Portal de la Familia (Padres y Tutores)
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  ACCESO EXCLUSIVO FAMILIAR
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Padre / Tutor: <strong className="text-white">{currentUser.displayName}</strong> · Seguimiento oficial de sus hijos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToTab('academico')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Ver Boleta de Notas</span>
            </button>
            <button
              onClick={() => onNavigateToTab('mensajeria')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contactar al Tutor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Children Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          <span>Hijos Registrados en la Unidad Educativa</span>
        </h2>

        {children.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Sin Estudiante Vinculado Activo</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No tienes un estudiante enlazado a esta cuenta familiar. Si te acabas de registrar, la Dirección de la U.E. Luis Espinal Tarde revisará los datos RUDE para autorizar la visualización de calificaciones.
            </p>
          </div>
        ) : (
          children.map(child => (
            <div
              key={child.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 hover:border-emerald-800/60 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-300 font-bold text-base">
                    {child.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{child.name}</h3>
                    <p className="text-xs text-slate-400">
                      RUDE: <span className="font-mono text-emerald-400">{child.rude}</span> · {child.grade} · {child.school}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                    child.isApproved
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {child.status}
                  </span>
                </div>
              </div>

              {/* Child KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Parentesco / Tutoría</span>
                  <div className="text-base font-bold text-white pt-1">
                    {child.relationship}
                  </div>
                  <span className="text-[10px] text-slate-500">Registro oficial U.E. Luis Espinal Tarde</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Asistencia Registrada</span>
                  <div className="text-sm font-semibold text-white pt-1">
                    {child.attendanceRate}
                  </div>
                  <span className="text-[10px] text-emerald-400">Gestión Escolar 2026</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Tutor de Curso Asignado</span>
                  <div className="text-sm font-bold text-white truncate pt-1">
                    {child.tutorName}
                  </div>
                  <button
                    onClick={() => onNavigateToTab('mensajeria')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Enviar mensaje interno</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onNavigateToTab('academico')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ver Detalle de Materias y Notas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
