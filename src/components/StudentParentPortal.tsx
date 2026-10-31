import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  GraduationCap,
  Award,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  FileText,
  UserCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface StudentParentPortalProps {
  currentUser: User;
  onPrintReportCard: (studentData: any) => void;
}

export const StudentParentPortal: React.FC<StudentParentPortalProps> = ({
  currentUser,
  onPrintReportCard,
}) => {
  const [children, setChildren] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [reportCard, setReportCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isParent = currentUser.role === 'parent';

  // Load parent children or set student directly
  useEffect(() => {
    async function initUser() {
      setLoading(true);
      setError(null);
      try {
        if (isParent) {
          const res = await api.getParentChildren(currentUser.id);
          setChildren(res.children || []);
          if (res.children && res.children.length > 0) {
            setSelectedStudentId(res.children[0].id);
          }
        } else {
          // Current user is student
          setSelectedStudentId(currentUser.id);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar perfil');
      } finally {
        setLoading(false);
      }
    }
    initUser();
  }, [currentUser, isParent]);

  // Load student report card when selectedStudentId changes
  useEffect(() => {
    async function fetchReport() {
      if (!selectedStudentId) return;
      setLoading(true);
      try {
        const data = await api.getStudentReportCard(selectedStudentId);
        setReportCard(data);
      } catch (err: any) {
        setError(err.message || 'Error al obtener calificaciones');
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [selectedStudentId]);

  if (loading && !reportCard) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs">Sincronizando libreta de calificaciones en tiempo real con el servidor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-6 text-rose-300 text-xs">
        <div className="flex items-center gap-2 font-medium mb-1">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>Error de conexión</span>
        </div>
        <p>{error}</p>
      </div>
    );
  }

  const overallAvg = reportCard?.overallAverage;
  const isPassing = overallAvg !== null && overallAvg >= 11;
  const isHonors = overallAvg !== null && overallAvg >= 16;
  const lowGradeSubjects = reportCard?.subjectGrades.filter(
    (s: any) => s.isPublished && s.finalAverage !== null && s.finalAverage < 11
  ) || [];

  return (
    <div className="space-y-6">
      {/* Parent Child Switcher Banner */}
      {isParent && children.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400">Portal de Familia:</span>
            <span className="font-semibold text-white">{currentUser.name}</span>
            <span className="text-slate-500">· Mostrando libreta de:</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-800 rounded-lg">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedStudentId(child.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  selectedStudentId === child.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {child.name.split(' ')[0]} ({child.studentCode})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Student Header & GPA Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-xl p-6 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-bold text-xl shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  {reportCard?.student?.name}
                </h1>
                <span className="text-xs font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
                  {reportCard?.student?.studentCode}
                </span>
                <span className="text-xs text-emerald-400 bg-emerald-950 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Matriculado 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Grado: <strong className="text-slate-200">{reportCard?.student?.gradeLevel}</strong> · Sección:{' '}
                <strong className="text-slate-200">{reportCard?.student?.section || 'A'}</strong> · Tutor:{' '}
                {reportCard?.parent?.name || 'Titular registrado'}
              </p>
            </div>
          </div>

          {/* Academic Overview KPIs */}
          <div className="flex items-center gap-3">
            {/* GPA badge */}
            <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-center min-w-[130px]">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Promedio Bimestral
              </div>
              <div className="text-2xl font-black font-mono text-white mt-0.5 flex items-baseline justify-center gap-1">
                <span className={isHonors ? 'text-emerald-400' : isPassing ? 'text-indigo-400' : 'text-rose-400'}>
                  {overallAvg !== null ? overallAvg.toFixed(2) : '-'}
                </span>
                <span className="text-xs text-slate-500 font-normal">/ 20</span>
              </div>
              <div className="text-[10px] mt-1 font-medium text-slate-300">
                {isHonors
                  ? '★ Cuadro de Honor'
                  : isPassing
                  ? 'Rendimiento Satisfactorio'
                  : 'Atención Requerida'}
              </div>
            </div>

            {/* Attendance % */}
            <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-center min-w-[120px]">
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Asistencia
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
                {reportCard?.attendanceSummary?.attendancePercentage ?? 100}%
              </div>
              <div className="text-[10px] mt-1 text-slate-400">
                {reportCard?.attendanceSummary?.presents || 0} asistencias registradas
              </div>
            </div>

            {/* Print Official Report Card Button */}
            <button
              onClick={() => onPrintReportCard(reportCard)}
              className="px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors shadow-sm"
              title="Generar e imprimir boleta oficial"
            >
              <Printer className="w-5 h-5" />
              <span>Imprimir Boleta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Alert for low grades if any */}
      {lowGradeSubjects.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-rose-300">Alerta de Seguimiento Académico en Tiempo Real:</span>
            <p className="mt-0.5 text-rose-200/90 leading-relaxed">
              El alumno presenta promedio por debajo del estándar aprobatorio (11.0) en:{' '}
              <strong>{lowGradeSubjects.map((s: any) => s.courseName).join(', ')}</strong>. Se recomienda
              revisar las observaciones de los docentes y solicitar cita de tutoría.
            </p>
          </div>
        </div>
      )}

      {/* Real-time Subject Grades Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Boleta de Calificaciones Detallada por Materia</span>
          </h2>
          <span className="text-xs text-slate-400">
            {reportCard?.evaluatedCourses} de {reportCard?.totalCourses} materias evaluadas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {reportCard?.subjectGrades.map((subject: any) => {
            const hasGrade = subject.finalAverage !== null;
            const isSubjPassing = hasGrade && subject.finalAverage >= 11;

            return (
              <div
                key={subject.courseId}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors text-xs text-slate-300 space-y-4"
              >
                {/* Course top line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div>
                    <h3 className="text-base font-semibold text-white tracking-tight">
                      {subject.courseName}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Docente titular: <strong className="text-slate-300">{subject.teacherName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {subject.isPublished ? (
                      <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Publicado en tiempo real
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded">
                        Pendiente de publicación
                      </span>
                    )}

                    {/* Final grade badge */}
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-500 font-semibold">Promedio</div>
                      <div
                        className={`text-xl font-bold font-mono ${
                          !hasGrade
                            ? 'text-slate-500'
                            : isSubjPassing
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {hasGrade ? subject.finalAverage.toFixed(1) : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Criteria breakdown */}
                {subject.isPublished && subject.criteria.length > 0 ? (
                  <div>
                    <div className="text-[11px] font-medium text-slate-400 mb-2">
                      Desglose de Evaluaciones y Competencias:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {subject.criteria.map((crit: any, idx: number) => {
                        const score = crit.score;
                        return (
                          <div
                            key={idx}
                            className="bg-slate-800/70 border border-slate-700/60 rounded-lg p-2.5"
                          >
                            <div className="text-[11px] font-medium text-slate-300 truncate">
                              {crit.name} ({crit.shortCode})
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Peso: {Math.round(crit.weight * 100)}%
                            </div>
                            <div className="mt-1 flex items-baseline justify-between">
                              <span
                                className={`text-base font-bold font-mono ${
                                  score === null
                                    ? 'text-slate-500'
                                    : score >= 11
                                    ? 'text-emerald-300'
                                    : 'text-rose-300'
                                }`}
                              >
                                {score !== null ? score : '-'}
                              </span>
                              <span className="text-[10px] text-slate-500">/ 20</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/40 rounded-lg p-3 text-slate-400 text-xs italic">
                    El docente aún se encuentra ingresando o revisando las notas de este curso en su registro privado.
                  </div>
                )}

                {/* Teacher Feedback / Observations */}
                {subject.isPublished && subject.teacherFeedback && (
                  <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-3">
                    <span className="text-[11px] font-semibold text-indigo-300 block mb-0.5">
                      Observación del Profesor:
                    </span>
                    <p className="text-slate-300 text-xs italic leading-relaxed">
                      "{subject.teacherFeedback}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
