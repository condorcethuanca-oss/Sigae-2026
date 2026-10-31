import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  User,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { SigaeUser } from '../../types';
import { UnifiedSchoolCalendar } from '../calendar/UnifiedSchoolCalendar';
import { cuadernoPedagogicoService, AcademicSubmission } from '../../firebase/cuadernoPedagogicoService';
import { scheduleService } from '../../firebase/scheduleService';

interface AlumnoDashboardProps {
  currentUser: SigaeUser;
  onNavigateToTab: (tab: 'inicio' | 'academico' | 'mensajeria' | 'perfil') => void;
}

export const AlumnoDashboard: React.FC<AlumnoDashboardProps> = ({
  currentUser,
  onNavigateToTab,
}) => {
  const [publishedSubmissions, setPublishedSubmissions] = useState<AcademicSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSchedulePublished, setIsSchedulePublished] = useState(true);

  // Determinar curso del estudiante (por defecto 6A si es de promoción)
  const studentCourseCode =
    currentUser.studentLinking?.grade
      ? `${currentUser.studentLinking.grade.replace(/[^0-9]/g, '') || '6'}A`
      : '6A';

  useEffect(() => {
    const loadStudentData = async () => {
      setLoading(true);
      try {
        const [submissions, publishedBlocks] = await Promise.all([
          cuadernoPedagogicoService.getPublishedSubmissions(),
          scheduleService.getOfficialPublishedScheduleForCourse(studentCourseCode),
        ]);
        setPublishedSubmissions(submissions || []);
        setIsSchedulePublished(publishedBlocks !== null);
      } catch (err) {
        console.warn('[AlumnoDashboard] Error cargando datos académicos del estudiante:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStudentData();
  }, [studentCourseCode]);

  return (
    <div className="space-y-6">
      {/* 1. Banner Institucional */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-600/30 border border-sky-500/50 flex items-center justify-center text-sky-400 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Portal del Estudiante
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/80 border border-sky-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  EXPEDIENTE PERSONAL SEGURO
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Estudiante: <strong className="text-white">{currentUser.displayName}</strong> · Curso: {studentCourseCode} · U.E. Luis Espinal Tarde de Collpani (SIE: 80730142)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToTab('academico')}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-600/20 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Ver Mis Calificaciones</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas de Resumen Oficial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Calificaciones Trimestrales</span>
            <Award className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-black text-white pt-1">
            {publishedSubmissions.length > 0
              ? `${publishedSubmissions.length} publicadas`
              : 'En consolidación'}
          </div>
          <div className="text-[11px] text-slate-400">
            {publishedSubmissions.length > 0 ? 'Gestión Académica 2026' : '1.er Trimestre en curso'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Malla Curricular</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg font-black text-white pt-1">
            Secundaria Comunitaria
          </div>
          <div className="text-[11px] text-slate-400">Currículo Base Plurinacional</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Asistencia Institucional</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-white pt-1">
            Registro Activo
          </div>
          <div className="text-[11px] text-emerald-400">Control regular en aula</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Horario Oficial</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black text-white pt-1">
            {isSchedulePublished ? 'Confirmado' : 'En revisión'}
          </div>
          <div className="text-[11px] text-slate-400">
            {isSchedulePublished ? 'Turnos Mañana y Tarde' : 'Pendiente de confirmación'}
          </div>
        </div>
      </div>

      {/* 3. Tabla de Calificaciones Oficiales */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Mis Materias y Calificaciones Trimestrales</span>
            </h2>
            <p className="text-xs text-slate-400">
              Información académica oficial validada por los docentes y autorizada por la Dirección.
            </p>
          </div>
        </div>

        {publishedSubmissions.length === 0 ? (
          <div className="p-8 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2">
            <Info className="w-6 h-6 text-sky-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">
              Calificaciones en proceso de registro y revisión
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Los docentes titulares se encuentran registrando las actividades y valoraciones en el Cuaderno Pedagógico. Una vez remitidas y aprobadas formalmente por Dirección, se visualizarán en esta sección.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3 font-semibold">Asignatura</th>
                  <th className="pb-3 font-semibold">Profesor Titular</th>
                  <th className="pb-3 font-semibold text-center">Trimestre</th>
                  <th className="pb-3 font-semibold text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {publishedSubmissions.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 font-bold text-white">{sub.subject}</td>
                    <td className="py-3 text-slate-400">{sub.teacherName}</td>
                    <td className="py-3 text-center font-mono font-bold text-sky-300">{sub.trimester}</td>
                    <td className="py-3 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {sub.isPublishedToParents ? 'Publicado' : 'Aprobado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Calendario y Horario Escolar */}
      <UnifiedSchoolCalendar
        currentUser={currentUser}
        courseCode={studentCourseCode}
        studentName={currentUser.displayName}
      />
    </div>
  );
};
