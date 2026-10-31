import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  MessageSquare,
  Award,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Save,
  FileText,
  Bell,
  RefreshCw,
  X,
  Search,
} from 'lucide-react';
import { SigaeUser, ScheduleBlock, StudentInstitutionalRecord, AttendanceSession, AttendanceCategory, SchoolDayOfWeek } from '../../types';
import { scheduleService, SCHOOL_DAYS, OFFICIAL_PERIODS } from '../../firebase/scheduleService';
import { studentService } from '../../firebase/studentService';
import { attendanceService } from '../../firebase/attendanceService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface ProfesorDashboardProps {
  currentUser: SigaeUser;
  onNavigateToTab: (tab: 'inicio' | 'academico' | 'mensajeria' | 'perfil') => void;
}

interface AssignedCourseSummary {
  courseCode: string;
  gradeLevel: string;
  parallel: string;
  subject: string;
  weeklyHours: number;
  studentsCount: number;
}

export const ProfesorDashboard: React.FC<ProfesorDashboardProps> = ({
  currentUser,
  onNavigateToTab,
}) => {
  const [loading, setLoading] = useState(true);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<AssignedCourseSummary[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [teacherExpediente, setTeacherExpediente] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<SchoolDayOfWeek>('Lunes');

  // Modal de Estudiantes por Curso
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState<AssignedCourseSummary | null>(null);
  const [courseStudentsList, setCourseStudentsList] = useState<StudentInstitutionalRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Modal de Asistencia
  const [attendanceModalCourse, setAttendanceModalCourse] = useState<AssignedCourseSummary | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceStudents, setAttendanceStudents] = useState<StudentInstitutionalRecord[]>([]);
  const [attendanceStates, setAttendanceStates] = useState<Record<string, AttendanceCategory>>({});
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceFeedback, setAttendanceFeedback] = useState<string | null>(null);

  // Cargar datos oficiales del profesor
  const loadOfficialTeacherData = async () => {
    setLoading(true);
    try {
      // 1. Obtener expediente oficial en /teachers si existe teacherId
      let exp: any = null;
      if (currentUser.teacherId) {
        try {
          const tDoc = await getDoc(doc(db, 'teachers', currentUser.teacherId));
          if (tDoc.exists()) {
            exp = tDoc.data();
            setTeacherExpediente(exp);
          }
        } catch (e) {
          console.warn('[ProfesorDashboard] Aviso leyendo /teachers:', e);
        }
      }

      // 2. Obtener bloques de horario oficiales asignados al docente
      const teacherIdentifier = currentUser.teacherId || currentUser.displayName || '';
      const blocks = await scheduleService.getByTeacher(teacherIdentifier);
      setScheduleBlocks(blocks);

      // 3. Agrupar cursos únicos oficiales
      const coursesMap = new Map<string, AssignedCourseSummary>();
      for (const b of blocks) {
        const key = `${b.courseCode}-${b.subject}`;
        if (!coursesMap.has(key)) {
          coursesMap.set(key, {
            courseCode: b.courseCode,
            gradeLevel: b.gradeLevel,
            parallel: b.parallel,
            subject: b.subject,
            weeklyHours: 1,
            studentsCount: 0,
          });
        } else {
          const existing = coursesMap.get(key)!;
          existing.weeklyHours += 1;
        }
      }

      // Si no hay bloques en schedule pero el expediente tiene assignedGrades y assignedSubjects:
      if (coursesMap.size === 0 && exp && exp.assignedGrades && exp.assignedGrades.length > 0) {
        exp.assignedGrades.forEach((g: string) => {
          const subject = exp.assignedSubjects?.[0] || exp.specialty || 'Materia Oficial';
          const code = g.replace(/[^0-9A-Za-z]/g, '');
          coursesMap.set(`${code}-${subject}`, {
            courseCode: code,
            gradeLevel: g,
            parallel: 'A',
            subject: subject,
            weeklyHours: Number(exp.hourlyLoad || 4),
            studentsCount: 0,
          });
        });
      }

      const coursesList = Array.from(coursesMap.values());

      // 4. Obtener conteo real de alumnos por curso oficial
      let totalEnrolled = 0;
      for (const c of coursesList) {
        try {
          const students = await studentService.getStudentsByCourse(c.courseCode);
          c.studentsCount = students.length;
          totalEnrolled += students.length;
        } catch {
          c.studentsCount = 0;
        }
      }

      setAssignedCourses(coursesList);
      setTotalStudentsCount(totalEnrolled);

      // Determinar día actual
      const dayMap: Record<number, SchoolDayOfWeek> = {
        1: 'Lunes',
        2: 'Martes',
        3: 'Miércoles',
        4: 'Jueves',
        5: 'Viernes',
        6: 'Sábado',
      };
      const currentDayNumber = new Date().getDay();
      if (dayMap[currentDayNumber]) {
        setSelectedDay(dayMap[currentDayNumber]);
      }
    } catch (err) {
      console.error('[ProfesorDashboard] Error cargando asignaciones docentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficialTeacherData();
  }, [currentUser.uid, currentUser.teacherId]);

  // Abrir modal de lista de estudiantes
  const handleOpenStudentsList = async (course: AssignedCourseSummary) => {
    setSelectedCourseForStudents(course);
    setLoadingStudents(true);
    setStudentSearchTerm('');
    try {
      const list = await studentService.getStudentsByCourse(course.courseCode);
      setCourseStudentsList(list);
    } catch (err) {
      console.warn('[ProfesorDashboard] Error cargando lista:', err);
      setCourseStudentsList([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Abrir modal de asistencia
  const handleOpenAttendance = async (course: AssignedCourseSummary) => {
    setAttendanceModalCourse(course);
    setAttendanceFeedback(null);
    try {
      const list = await studentService.getStudentsByCourse(course.courseCode);
      setAttendanceStudents(list);

      // Consultar si ya existe sesión para la fecha
      const existingSession = await attendanceService.getSession(course.courseCode, attendanceDate);
      const initialStates: Record<string, AttendanceCategory> = {};
      const initialNotes: Record<string, string> = {};

      if (existingSession && existingSession.records) {
        existingSession.records.forEach(r => {
          initialStates[r.studentId] = r.status;
          if (r.notes) initialNotes[r.studentId] = r.notes;
        });
      } else {
        list.forEach(s => {
          initialStates[s.id] = 'presente';
        });
      }

      setAttendanceStates(initialStates);
      setAttendanceNotes(initialNotes);
    } catch (err) {
      console.warn('[ProfesorDashboard] Error al preparar asistencia:', err);
    }
  };

  // Guardar asistencia real en Firestore
  const handleSaveAttendance = async () => {
    if (!attendanceModalCourse) return;
    setSavingAttendance(true);
    setAttendanceFeedback(null);

    try {
      const records = attendanceStudents.map(s => ({
        id: `att-rec-${s.id}-${attendanceDate}`,
        studentId: s.id,
        studentName: s.fullName,
        ci: s.ci || '',
        rude: s.rude,
        status: attendanceStates[s.id] || 'presente',
        registeredAt: new Date().toISOString(),
        notes: attendanceNotes[s.id] || '',
      }));

      const presentCount = records.filter(r => r.status === 'presente').length;
      const absentCount = records.filter(r => r.status === 'ausente').length;
      const lateCount = records.filter(r => r.status === 'retraso').length;
      const leaveCount = records.filter(r => r.status === 'licencia').length;

      const session: AttendanceSession = {
        id: `att-${attendanceModalCourse.courseCode}-${attendanceDate}`,
        date: attendanceDate,
        gradeNumber: parseInt(attendanceModalCourse.courseCode) || 1,
        gradeLevel: attendanceModalCourse.gradeLevel,
        parallel: attendanceModalCourse.parallel,
        courseCode: attendanceModalCourse.courseCode,
        shift: 'tarde',
        academicYear: '2026',
        totalEnrolled: attendanceStudents.length,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        pendingCount: 0,
        records,
        lastUpdated: new Date().toISOString(),
      };

      await attendanceService.saveSession(session);
      setAttendanceFeedback('¡Asistencia registrada y guardada exitosamente en el sistema oficial!');
      setTimeout(() => {
        setAttendanceModalCourse(null);
        setAttendanceFeedback(null);
      }, 1500);
    } catch (err: any) {
      setAttendanceFeedback(`Error al registrar asistencia: ${err.message}`);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Bloques del día seleccionado
  const dayScheduleBlocks = scheduleBlocks.filter(b => b.dayOfWeek === selectedDay);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-900 border border-slate-800 rounded-3xl">
        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
        <span className="text-xs font-semibold text-slate-300">
          Cargando asignaciones oficiales del profesor desde Firebase...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. BANNER INSTITUCIONAL DEL DOCENTE */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Portal Docente · Área Pedagógica
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  ACCESO AUTORIZADO
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Docente: <strong className="text-white">{currentUser.displayName}</strong> · U.E. Luis Espinal Tarde de Collpani (SIE: 80730142) · Gestión 2026
              </p>
              {currentUser.teacherId && (
                <p className="text-[11px] text-amber-300/80 font-mono mt-0.5">
                  Expediente Institucional: {currentUser.teacherId} {teacherExpediente?.specialty ? `· Especialidad: ${teacherExpediente.specialty}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onNavigateToTab('academico')}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Calificaciones</span>
            </button>
            <button
              onClick={() => onNavigateToTab('mensajeria')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Mensajería</span>
            </button>
            <button
              onClick={loadOfficialTeacherData}
              title="Recargar datos oficiales"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SI NO POSEE ASIGNACIONES OFICIALES TODAVÍA: MOSTRAR ESTADO PENDIENTE DE CONFIGURACIÓN */}
      {assignedCourses.length === 0 ? (
        <div className="bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-600/50 flex items-center justify-center text-amber-400 mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-lg font-bold text-white">
              Asignaciones oficiales pendientes de configuración por la Dirección
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Su cuenta docente ha sido autorizada en SIGAE. Sin embargo, la Dirección General de la U.E. Luis Espinal Tarde de Collpani (SIE 80730142) aún no ha configurado sus cursos, paralelos, materias ni horarios oficiales en el sistema.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Estado de Registro:</span>
                <span className="font-semibold text-emerald-400">Aprobado y Activo</span>
              </div>
              <div className="flex justify-between">
                <span>Expediente Docente:</span>
                <span className="font-mono text-white">{currentUser.teacherId || 'Generándose por Dirección'}</span>
              </div>
              <div className="flex justify-between">
                <span>Especialidad declarada:</span>
                <span className="text-white">{currentUser.specialty || teacherExpediente?.specialty || 'Secundaria'}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Tan pronto la Dirección complete la carga horaria en el Módulo de Dirección, este panel se actualizará automáticamente con sus aulas autorizadas.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 3. MÉTRICAS OFICIALES REALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Cursos Asignados</span>
                <BookOpen className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {assignedCourses.length} <span className="text-xs font-normal text-slate-500">paralelos</span>
              </div>
              <div className="text-[11px] text-slate-400">U.E. Luis Espinal Tarde</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Estudiantes Autorizados</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {totalStudentsCount} <span className="text-xs font-normal text-slate-500">matriculados</span>
              </div>
              <div className="text-[11px] text-emerald-400">Padrón oficial institucional</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Períodos Semanales</span>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black font-mono text-white">
                {scheduleBlocks.length} <span className="text-xs font-normal text-slate-500">períodos</span>
              </div>
              <div className="text-[11px] text-slate-400">Turno Tarde Oficial</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                <span>Régimen de Evaluación</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base font-bold text-emerald-400">
                1er TRIMESTRE 2026
              </div>
              <div className="text-[11px] text-slate-400">100 puntos (Ser, Saber, Hacer, Decidir)</div>
            </div>
          </div>

          {/* 4. LISTA DE CURSOS Y MATERIAS OFICIALES ASIGNADOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Mis Cursos y Materias Asignados por Dirección</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Grupos escolares autorizados para gestión pedagógica
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedCourses.map(course => (
                <div
                  key={`${course.courseCode}-${course.subject}`}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-700/60 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-400">
                        Curso {course.courseCode}
                      </span>
                      <h3 className="font-bold text-sm text-white mt-1">
                        {course.subject}
                      </h3>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {course.gradeLevel} · Paralelo {course.parallel}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                      {course.weeklyHours} período(s)/sem
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{course.studentsCount} estudiantes autorizados</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenStudentsList(course)}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      <span>Ver Alumnos</span>
                    </button>
                    <button
                      onClick={() => handleOpenAttendance(course)}
                      className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Asistencia</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. CONSULTA DE HORARIO SEMANAL POR DÍA, CURSO Y MATERIA */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Mi Horario Semanal Docente</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Horario pedagógico oficial por día, período y aula (Turno Tarde)
                </p>
              </div>

              {/* Selector de días */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {SCHOOL_DAYS.slice(0, 5).map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedDay === day
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {dayScheduleBlocks.length === 0 ? (
              <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
                <Clock className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  No tiene períodos pedagógicos asignados el día <strong className="text-white">{selectedDay}</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {OFFICIAL_PERIODS.map(period => {
                  const block = dayScheduleBlocks.find(b => b.periodNumber === period.periodNumber);
                  if (period.isBreak) {
                    return (
                      <div
                        key={`break-${period.periodNumber}`}
                        className="py-2 px-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-400"
                      >
                        <span className="font-semibold text-slate-400">{period.periodLabel}</span>
                        <span className="text-[11px] font-mono text-slate-500">10:45 - 11:00</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`p-${period.periodNumber}`}
                      className={`p-4 rounded-2xl border transition-all ${
                        block
                          ? 'bg-slate-950 border-amber-800/40 hover:border-amber-600/60'
                          : 'bg-slate-950/40 border-slate-800/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            block
                              ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-900 text-slate-600'
                          }`}>
                            P{period.periodNumber}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-400">
                              {period.startTime} - {period.endTime}
                            </div>
                            {block ? (
                              <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                                <span>{block.subject}</span>
                                <span className="text-xs font-normal text-amber-400 font-mono">
                                  ({block.gradeLevel} · Par. {block.parallel})
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-600 mt-0.5">
                                Sin actividad pedagógica en este período
                              </div>
                            )}
                          </div>
                        </div>

                        {block && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                              {block.classroom || 'Aula Oficial'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 6. MODAL DE ESTUDIANTES AUTORIZADOS POR CURSO */}
      {selectedCourseForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Lista de Estudiantes Autorizados</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCourseForStudents.gradeLevel} · Paralelo {selectedCourseForStudents.parallel} ({selectedCourseForStudents.subject})
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseForStudents(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nombre, RUDE o Cédula..."
                value={studentSearchTerm}
                onChange={e => setStudentSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Listado con scroll */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px]">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
              ) : (
                courseStudentsList
                  .filter(s =>
                    !studentSearchTerm ||
                    s.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                    s.rude.includes(studentSearchTerm) ||
                    (s.ci && s.ci.includes(studentSearchTerm))
                  )
                  .map((stu, idx) => (
                    <div
                      key={stu.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-[11px] font-mono text-slate-500 text-right">
                          {idx + 1}.
                        </span>
                        <div>
                          <div className="font-semibold text-white">{stu.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            RUDE: {stu.rude} {stu.ci ? `· CI: ${stu.ci}` : ''}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/50 text-emerald-400">
                        Matriculado Oficial
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Total: {courseStudentsList.length} estudiantes</span>
              <button
                onClick={() => setSelectedCourseForStudents(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE ASISTENCIA EN TIEMPO REAL */}
      {attendanceModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 text-slate-200 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-400" />
                  <span>Control de Asistencia Pedagógica</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {attendanceModalCourse.gradeLevel} · Paralelo {attendanceModalCourse.parallel} ({attendanceModalCourse.subject})
                </p>
              </div>
              <button
                onClick={() => setAttendanceModalCourse(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fecha de Asistencia */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 font-medium">Fecha de registro:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Botón marcar todos presentes */}
              <button
                type="button"
                onClick={() => {
                  const allP: Record<string, AttendanceCategory> = {};
                  attendanceStudents.forEach(s => (allP[s.id] = 'presente'));
                  setAttendanceStates(allP);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline text-left sm:text-right"
              >
                Marcar todos presentes
              </button>
            </div>

            {attendanceFeedback && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                attendanceFeedback.includes('Error')
                  ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                  : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
              }`}>
                {attendanceFeedback}
              </div>
            )}

            {/* Lista de estudiantes con botones de estado */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[280px]">
              {attendanceStudents.map((stu, idx) => {
                const currentStatus = attendanceStates[stu.id] || 'presente';
                return (
                  <div
                    key={stu.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-[11px] font-mono text-slate-500">{idx + 1}.</span>
                      <div>
                        <div className="font-semibold text-white">{stu.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">RUDE: {stu.rude}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {(['presente', 'ausente', 'retraso', 'licencia'] as AttendanceCategory[]).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setAttendanceStates(prev => ({ ...prev, [stu.id]: cat }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                            currentStatus === cat
                              ? cat === 'presente'
                                ? 'bg-emerald-600 text-white'
                                : cat === 'ausente'
                                ? 'bg-rose-600 text-white'
                                : cat === 'retraso'
                                ? 'bg-amber-600 text-white'
                                : 'bg-sky-600 text-white'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Acciones */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {attendanceStudents.length} alumnos registrados
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAttendanceModalCourse(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingAttendance ? 'Guardando...' : 'Guardar Asistencia'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
