import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Award,
  CheckCircle2,
  Users,
  Calendar,
  Clock,
  FileText,
  Shield,
  Briefcase,
  HeartHandshake,
  GraduationCap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { SigaeUser, ScheduleBlock } from '../../types';
import { scheduleService } from '../../firebase/scheduleService';
import { studentService } from '../../firebase/studentService';

interface AreaAcademicaViewProps {
  currentUser: SigaeUser;
}

export const AreaAcademicaView: React.FC<AreaAcademicaViewProps> = ({ currentUser }) => {
  const [teacherCourses, setTeacherCourses] = useState<{ courseCode: string; gradeLevel: string; parallel: string; subject: string; studentsCount: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser.role === 'profesor') {
      setLoading(true);
      const loadTeacherAcademicData = async () => {
        try {
          const blocks = await scheduleService.getByTeacher(currentUser.teacherId || currentUser.displayName || '');
          const map = new Map<string, { courseCode: string; gradeLevel: string; parallel: string; subject: string; studentsCount: number }>();
          for (const b of blocks) {
            const key = `${b.courseCode}-${b.subject}`;
            if (!map.has(key)) {
              map.set(key, {
                courseCode: b.courseCode,
                gradeLevel: b.gradeLevel,
                parallel: b.parallel,
                subject: b.subject,
                studentsCount: 0,
              });
            }
          }
          const list = Array.from(map.values());
          for (const item of list) {
            try {
              const students = await studentService.getStudentsByCourse(item.courseCode);
              item.studentsCount = students.length;
            } catch {
              item.studentsCount = 0;
            }
          }
          setTeacherCourses(list);
        } catch (err) {
          console.warn('[AreaAcademicaView] Error al cargar cursos del docente:', err);
        } finally {
          setLoading(false);
        }
      };
      loadTeacherAcademicData();
    }
  }, [currentUser]);

  const linking = currentUser.studentLinking;
  const hasLinkedStudent = Boolean(linking && linking.studentName);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Gestión y Control Académico Escolar
              </h2>
              <p className="text-xs text-slate-400">
                Gestión 2026 · 1er Trimestre · U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-indigo-300">
            Rol: {currentUser.role.toUpperCase()}
          </span>
        </div>

        {/* 1. VISTA DIRECTOR */}
        {currentUser.role === 'director' && (
          <div className="space-y-4 pt-2 text-xs">
            <p className="text-slate-300">
              Estructura curricular institucional y supervisión de aulas:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-white text-sm">Nivel Secundaria</span>
                <p className="text-slate-400 text-[11px]">1° a 6° de Secundaria (Paralelos A y B)</p>
                <div className="text-indigo-400 font-semibold pt-1">12 grupos activos</div>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-white text-sm">Bachillerato BTH</span>
                <p className="text-slate-400 text-[11px]">Técnica Tecnológica Productiva</p>
                <div className="text-amber-400 font-semibold pt-1">Especialidad: Robótica y Sistemas</div>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-white text-sm">Régimen de Evaluación</span>
                <p className="text-slate-400 text-[11px]">Trimestral sobre 100 puntos</p>
                <div className="text-emerald-400 font-semibold pt-1">Reglamento del Ministerio de Educación</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. VISTA DOCENTE */}
        {currentUser.role === 'profesor' && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-slate-300 font-medium">
                Cursos y materias asignados para registro pedagógico oficial:
              </p>
              {loading && <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />}
            </div>

            {teacherCourses.length === 0 ? (
              <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">
                  Asignaciones oficiales pendientes de configuración por la Dirección
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  La Dirección aún no ha registrado la carga de cursos para su expediente docente. Al asignarse las materias en el Módulo Directivo, se habilitará aquí la planilla de notas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {teacherCourses.map(course => (
                  <div
                    key={`${course.courseCode}-${course.subject}`}
                    className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-bold text-white text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-mono text-xs px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60">
                          {course.courseCode}
                        </span>
                        <span>{course.gradeLevel} · Paralelo {course.parallel} — {course.subject}</span>
                      </div>
                      <span className="text-xs font-normal text-emerald-400 font-mono">
                        {course.studentsCount} estudiantes autorizados
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                      <div className="font-semibold text-slate-300">Dimensiones de Calificación Ministerial (Resolución 001/2026):</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                        <span className="text-sky-300">Saber: 35 pts</span>
                        <span className="text-emerald-300">Hacer: 35 pts</span>
                        <span className="text-amber-300">Ser y Decidir: 20 pts</span>
                        <span className="text-purple-300">Autoevaluación: 10 pts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. VISTA PADRE / FAMILIA */}
        {currentUser.role === 'padre' && (
          <div className="space-y-4 pt-2 text-xs">
            {hasLinkedStudent ? (
              <div className="space-y-3">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                        {linking?.status === 'aprobada' || currentUser.hasApprovedChildLink ? 'Filiación Aprobada' : 'En Validación Institucional'}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-400" />
                        <span>{linking?.studentName}</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        RUDE: {linking?.studentRude} {linking?.studentCi ? `· CI: ${linking.studentCi}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-white">{linking?.grade || 'Nivel Secundaria'}</div>
                      <div className="text-[10px] text-slate-400">Parentesco: {linking?.relationship || 'Tutor Legal'}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/70 rounded-2xl border border-dashed border-slate-800 space-y-2 text-center py-6">
                  <Award className="w-8 h-8 text-emerald-400/80 mx-auto" />
                  <h4 className="text-xs font-bold text-white">
                    Boletín Oficial de Calificaciones · 1.er Trimestre 2026
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    El primer trimestre se encuentra actualmente en desarrollo pedagógico. Las notas oficiales por dimensiones serán publicadas por los profesores de cada asignatura y visadas por la Dirección al término del trimestre.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">
                  No tiene estudiantes vinculados a su cuenta familiar
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Para consultar las calificaciones y asistencia escolar de su hijo(a), debe vincular su RUDE oficial en el registro de SIGAE o solicitar autorización a la Dirección.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. VISTA ALUMNO */}
        {currentUser.role === 'alumno' && (
          <div className="space-y-4 pt-2 text-xs">
            <p className="text-slate-300">
              Historial académico oficial del estudiante:
            </p>
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Estado del 1.er Trimestre:</span>
                <span className="text-xs font-bold font-mono text-emerald-400">EN CURSO (Gestión 2026)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Las calificaciones trimestrales registradas por los profesores de la U.E. Luis Espinal Tarde se actualizarán en este panel.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
