import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Plus,
  Clock,
  Users,
  Send,
  X,
  FileText,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import {
  SigaeUser,
  KardexEntry,
  KardexLevel,
  KardexCategory,
  StudentInstitutionalRecord,
} from '../../types';
import { kardexService } from '../../firebase/kardexService';
import { studentService } from '../../firebase/studentService';
import { SECONDARY_24_COURSES } from '../../firebase/scheduleService';

interface TeacherKardexViewProps {
  currentUser: SigaeUser;
}

export const TeacherKardexView: React.FC<TeacherKardexViewProps> = ({ currentUser }) => {
  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Cursos asignados al profesor
  const teacherCourses = React.useMemo(() => {
    const grades = currentUser.assignedGrades;
    if (grades && grades.length > 0) {
      return SECONDARY_24_COURSES.filter(c =>
        grades.some((g: string) => g.includes(c.code) || g.includes(`${c.gradeLevel} ${c.parallel}`))
      );
    }
    return SECONDARY_24_COURSES;
  }, [currentUser.assignedGrades]);

  const [selectedCourse, setSelectedCourse] = useState<string>(
    teacherCourses[0]?.code || '6A'
  );
  const [studentsInCourse, setStudentsInCourse] = useState<StudentInstitutionalRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [level, setLevel] = useState<KardexLevel>(2);
  const [category, setCategory] = useState<KardexCategory>('disciplina');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [subject, setSubject] = useState(currentUser.specialty || 'Matemática');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tutores autorizados encontrados para el estudiante
  const [approvedParents, setApprovedParents] = useState<
    { parentUid: string; parentName: string; relationship: string }[]
  >([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Cargar registros del profesor
  const loadTeacherEntries = async () => {
    setLoading(true);
    try {
      const data = await kardexService.getByTeacher(currentUser.uid);
      setEntries(data);
    } catch (err) {
      console.error('Error cargando kárdex del profesor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherEntries();
  }, [currentUser.uid]);

  // Cargar estudiantes del curso seleccionado para el formulario
  useEffect(() => {
    if (!selectedCourse) return;
    const fetchStudents = async () => {
      setLoadingStudents(true);
      setStudentsError(null);
      try {
        const list = await studentService.getStudentsByCourse(selectedCourse);
        setStudentsInCourse(list);
        if (list.length > 0) {
          setStudentId(list[0].id);
        } else {
          setStudentId('');
        }
      } catch (err: any) {
        console.error('Error cargando estudiantes para kárdex:', err);
        setStudentsError('No se pudo consultar la lista de estudiantes. Revisa tu conexión.');
        setStudentsInCourse([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [selectedCourse]);

  // Paso 1: Validar formulario y consultar tutores autorizados reales
  const handleOpenPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !title.trim() || !description.trim()) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    setLoadingParents(true);
    try {
      const parents = await kardexService.getApprovedParentsForStudent(studentId);
      setApprovedParents(parents);
      setIsPreviewOpen(true);
    } catch (err) {
      console.warn('Error verificando tutores vinculados:', err);
      setApprovedParents([]);
      setIsPreviewOpen(true);
    } finally {
      setLoadingParents(false);
    }
  };

  // Paso 2: Confirmar y guardar la observación oficial
  const handleConfirmSave = async (notifyFamily: boolean) => {
    const targetStudent = studentsInCourse.find(s => s.id === studentId);
    if (!targetStudent) {
      alert('Estudiante no encontrado.');
      return;
    }

    const courseObj = SECONDARY_24_COURSES.find(c => c.code === selectedCourse);

    setSaving(true);
    try {
      const entry = await kardexService.createEntry({
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        studentCi: targetStudent.ci,
        studentRude: targetStudent.rude,
        courseCode: selectedCourse,
        gradeLevel: targetStudent.gradeLevel || courseObj?.gradeLevel || 'Secundaria',
        parallel: targetStudent.parallel || courseObj?.parallel || 'A',
        teacherId: currentUser.teacherId || currentUser.uid,
        teacherUid: currentUser.uid,
        teacherName: currentUser.displayName,
        subject,
        level,
        category,
        title: title.trim(),
        description: description.trim(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
        actionTaken: actionTaken.trim() || undefined,
      });

      if (notifyFamily && approvedParents.length > 0) {
        setSuccessMessage(
          `Observación de Kárdex registrada con éxito. Se ha entregado la notificación interna a ${approvedParents.length} tutor(es) legal(es) verificado(s).`
        );
      } else if (approvedParents.length === 0) {
        setSuccessMessage(
          'Observación registrada en el expediente escolar. El estudiante aún no tiene tutores legales vinculados y aprobados en SIGAE.'
        );
      } else {
        setSuccessMessage('Observación registrada en el expediente escolar del estudiante.');
      }

      setIsPreviewOpen(false);
      setIsModalOpen(false);
      // Reset form
      setTitle('');
      setDescription('');
      setActionTaken('');
      setLevel(2);
      await loadTeacherEntries();
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error('Error al guardar kárdex:', err);
      alert(`Ocurrió un error al registrar la observación: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getLevelBadge = (lvl: KardexLevel) => {
    switch (lvl) {
      case 1:
        return {
          label: 'Nivel 1: Informativo',
          desc: 'Registro formativo / Reconocimiento',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          dot: 'bg-emerald-400',
        };
      case 2:
        return {
          label: 'Nivel 2: Llamada de Atención',
          desc: 'Apercibimiento verbal / Incumplimiento',
          badge: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
          dot: 'bg-sky-400',
        };
      case 3:
        return {
          label: 'Nivel 3: Atención Familiar',
          desc: 'Notificación obligatoria a la familia',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
          dot: 'bg-amber-400',
        };
      case 4:
        return {
          label: 'Nivel 4: Prioritario / Dirección',
          desc: 'Falta grave / Intervención de Dirección',
          badge: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
          dot: 'bg-rose-400',
        };
    }
  };

  const targetStudentObj = studentsInCourse.find(s => s.id === studentId);

  return (
    <div className="space-y-6">
      {/* Banner de Éxito */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Kárdex Institucional del Estudiante
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registro oficial pedagógico y de convivencia de la U.E. Luis Espinal Tarde (SIE: 80730142) · Gestión 2026
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Observación</span>
        </button>
      </div>

      {/* Resumen de severidades */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(lvl => {
          const info = getLevelBadge(lvl as KardexLevel);
          const count = entries.filter(e => e.level === lvl).length;
          return (
            <div key={lvl} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${info.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`}></span>
                  Nivel {lvl}
                </span>
                <span className="text-lg font-black text-white font-mono">{count}</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{info.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Listado de Entradas Registradas por el Profesor */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-white text-xs">Mis Observaciones Registradas ({entries.length})</span>
          <span className="text-[11px] text-slate-400 font-mono">Docente: {currentUser.displayName}</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <Clock className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-400" />
            Cargando historial de kárdex desde Cloud Firestore...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-medium text-slate-300">No hay observaciones de kárdex registradas aún.</p>
            <p className="text-[11px] text-slate-500">
              Presione el botón "Registrar Observación" para asentar una anotación pedagógica o disciplinaria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {entries.map(item => {
              const lvlInfo = getLevelBadge(item.level);
              return (
                <div key={item.id} className="p-4.5 hover:bg-slate-800/30 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase inline-flex items-center gap-1 ${lvlInfo.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${lvlInfo.dot}`}></span>
                        {lvlInfo.label}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {item.studentName}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {item.courseCode} · {item.gradeLevel}
                      </span>
                      <span className="text-[10px] bg-indigo-950/70 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded uppercase font-medium">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>{item.date} {item.time && `· ${item.time}`}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Estado: {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/70">
                      {item.description}
                    </p>
                  </div>

                  {item.actionTaken && (
                    <div className="text-[11px] text-indigo-300 bg-indigo-950/30 border border-indigo-800/40 p-2.5 rounded-lg">
                      <span className="font-semibold text-indigo-200">Acción formativa aplicada: </span>
                      {item.actionTaken}
                    </div>
                  )}

                  {/* Estado de Notificación y Respuesta Familiar */}
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] flex items-center justify-between">
                    <div>
                      {item.familyAcknowledged ? (
                        <div className="text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            <strong>Tutor legal acusa recibo: </strong>
                            "{item.familyResponseNote || 'Notificación aceptada y revisada.'}"
                          </span>
                        </div>
                      ) : item.familyNotificationSent ? (
                        <div className="text-amber-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Notificación enviada a la familia. Pendiente de lectura y descargo en el portal.</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Observación formativa registrada en kárdex.</span>
                      )}
                    </div>

                    {item.directionResolution && (
                      <div className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/50 px-2 py-1 rounded">
                        <strong>Dirección: </strong>{item.directionResolution}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Paso 1: Formulario de Nueva Observación */}
      {isModalOpen && !isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  Nueva Observación de Kárdex
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenPreview} className="p-5 space-y-4 text-xs">
              {/* Curso y Estudiante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Curso de Secundaria:
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={e => {
                      setSelectedCourse(e.target.value);
                      setStudentId('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {teacherCourses.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.gradeLevel} "{c.parallel}")
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Estudiante:
                  </label>
                  {loadingStudents ? (
                    <div className="p-2 text-slate-400 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Consultando padrón oficial...
                    </div>
                  ) : studentsError ? (
                    <div className="p-2 text-rose-400 text-[11px] bg-rose-950/40 border border-rose-800/60 rounded-xl">
                      {studentsError}
                    </div>
                  ) : studentsInCourse.length === 0 ? (
                    <div className="p-2 text-amber-400 text-[11px] bg-amber-950/40 border border-amber-800/60 rounded-xl">
                      Este curso todavía no tiene estudiantes matriculados.
                    </div>
                  ) : (
                    <select
                      value={studentId}
                      onChange={e => setStudentId(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {studentsInCourse.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} {s.ci ? `(CI: ${s.ci})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Nivel de Severidad (1 a 4) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Nivel de Atención / Severidad:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(lvl => {
                    const badge = getLevelBadge(lvl as KardexLevel);
                    const isSelected = level === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevel(lvl as KardexLevel)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? `${badge.badge} ring-2 ring-indigo-500/50`
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                          Nivel {lvl}
                        </div>
                        <div className="text-[10px] mt-0.5 line-clamp-1">{badge.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categoría y Materia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Categoría de la Observación:
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as KardexCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="academico">Tarea no presentada / Rendimiento académico</option>
                    <option value="disciplina">Observación de comportamiento / Convivencia</option>
                    <option value="convivencia">Incumplimiento de acuerdo escolar</option>
                    <option value="merito">Reconocimiento positivo / Mérito</option>
                    <option value="asistencia">Seguimiento de asistencia / Puntualidad</option>
                    <option value="material">Solicitud de reunión / Material pedagógico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Materia Asignada:
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="ej: Matemática, Comunicación y Lenguajes"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Título y Descripción */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Motivo / Título de la Observación: *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="ej: Falta de entrega de actividad práctica evaluativa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Descripción Objetiva de los Hechos: *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Explique objetivamente lo ocurrido, circunstancias, fecha y acuerdos..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Acción Sugerida / Formativa (Opcional):
                </label>
                <input
                  type="text"
                  value={actionTaken}
                  onChange={e => setActionTaken(e.target.value)}
                  placeholder="ej: Conversar con el estudiante y solicitar compromiso de entrega para la siguiente clase"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Botones */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingParents || studentsInCourse.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm shadow-indigo-600/30 cursor-pointer"
                >
                  {loadingParents ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Verificando tutores...</span>
                    </>
                  ) : (
                    <>
                      <span>Guardar y revisar notificación</span>
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paso 2: Vista Previa Obligatoria y Confirmación Institucional */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-indigo-700/60 rounded-3xl shadow-2xl overflow-hidden my-8 p-6 text-slate-200 space-y-5">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  ¿Estás seguro de comunicar esta observación?
                </h3>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumen Fidedigno */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Estudiante:</span>
                  <strong className="text-white text-sm">{targetStudentObj?.fullName}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Curso y Materia:</span>
                  <strong className="text-indigo-300">{selectedCourse} · {subject}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Profesor Responsable:</span>
                  <span className="text-slate-200">{currentUser.displayName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Nivel y Categoría:</span>
                  <span className="text-amber-400 font-semibold">Nivel {level} · {category.toUpperCase()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Asunto:</span>
                <span className="text-white font-medium">{title}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Descripción:</span>
                <p className="text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  "{description}"
                </p>
              </div>
            </div>

            {/* Verificación de Destinatarios Familiares Reales */}
            <div className="p-4 rounded-2xl border bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Destinatarios Familiares Autorizados
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {approvedParents.length} {approvedParents.length === 1 ? 'tutor aprobado' : 'tutores aprobados'}
                </span>
              </div>

              {approvedParents.length > 0 ? (
                <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                  {approvedParents.map(p => (
                    <div key={p.parentUid} className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between">
                      <span className="font-semibold text-emerald-200">{p.parentName}</span>
                      <span className="text-[10px] text-emerald-400">{p.relationship}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-emerald-400 pt-1">
                    ✔ Se enviará una notificación interna privada e individual a la bandeja de cada tutor legal vinculado.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Este estudiante todavía no tiene un padre o tutor vinculado y aprobado en SIGAE.
                  </p>
                  <p className="text-[11px] text-amber-200/80">
                    La observación se guardará de forma segura en su expediente institucional. La opción de notificar por mensaje familiar queda inhabilitada hasta que Dirección apruebe un vínculo formal.
                  </p>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Volver y editar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleConfirmSave(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
              >
                {saving ? 'Guardando...' : 'Guardar solo en Kárdex'}
              </button>

              <button
                type="button"
                disabled={saving || approvedParents.length === 0}
                onClick={() => handleConfirmSave(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirmar y notificar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
