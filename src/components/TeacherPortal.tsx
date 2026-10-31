import React, { useState, useEffect } from 'react';
import { User, Course, CourseGradebook, StudentGrade } from '../types';
import { api } from '../services/api';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Save,
  CheckCircle,
  AlertTriangle,
  Send,
  Eye,
  EyeOff,
  UserCheck,
  RefreshCw,
  Sparkles,
  Search,
} from 'lucide-react';

interface TeacherPortalProps {
  currentUser: User;
  courses: Course[];
  allStudents: User[];
  onOpenAttendance: (courseId: string) => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  currentUser,
  courses,
  allStudents,
  onOpenAttendance,
}) => {
  const teacherCourses = courses.filter(c => c.teacherId === currentUser.id);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    teacherCourses[0]?.id || courses[0]?.id || ''
  );
  const [gradebook, setGradebook] = useState<CourseGradebook | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Security publication modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [confirmPin, setConfirmPin] = useState(currentUser.teacherPin || '');
  const [publishing, setPublishing] = useState(false);

  // Local draft scores state: studentId -> criteriaId -> number | null
  const [localScores, setLocalScores] = useState<Record<string, Record<string, number | null>>>({});
  const [localFeedback, setLocalFeedback] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Load gradebook whenever selected course changes
  const loadGradebook = async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const gb = await api.getGradebook(courseId, { id: currentUser.id, role: currentUser.role });
      setGradebook(gb);

      // Hydrate local editable states
      const scoresMap: Record<string, Record<string, number | null>> = {};
      const feedbackMap: Record<string, string> = {};

      allStudents.forEach(stu => {
        const studentGrade = gb.grades[stu.id];
        scoresMap[stu.id] = {};
        gb.criteria.forEach(crit => {
          scoresMap[stu.id][crit.id] = studentGrade?.scores?.[crit.id] ?? null;
        });
        feedbackMap[stu.id] = studentGrade?.teacherFeedback || '';
      });

      setLocalScores(scoresMap);
      setLocalFeedback(feedbackMap);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error al cargar notas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadGradebook(selectedCourseId);
    }
  }, [selectedCourseId]);

  // Calculate live weighted average for a student
  const computeStudentAverage = (studentId: string): number | null => {
    if (!gradebook) return null;
    const scores = localScores[studentId];
    if (!scores) return null;

    let totalWeighted = 0;
    let totalWeight = 0;

    gradebook.criteria.forEach(crit => {
      const val = scores[crit.id];
      if (typeof val === 'number' && !isNaN(val)) {
        totalWeighted += val * crit.weight;
        totalWeight += crit.weight;
      }
    });

    if (totalWeight === 0) return null;
    return Number((totalWeighted / totalWeight).toFixed(1));
  };

  // Handle score change in matrix
  const handleScoreChange = (studentId: string, critId: string, rawVal: string) => {
    const val = rawVal.trim() === '' ? null : Math.min(20, Math.max(0, parseFloat(rawVal)));
    setLocalScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [critId]: isNaN(val as number) ? null : val,
      },
    }));
  };

  // Save single student's row
  const handleSaveStudent = async (studentId: string) => {
    if (!selectedCourseId) return;
    setSavingStudentId(studentId);
    try {
      const scores = localScores[studentId] || {};
      const feedback = localFeedback[studentId] || '';

      const result = await api.updateStudentGrade(selectedCourseId, studentId, {
        scores,
        teacherFeedback: feedback,
        teacherPin: currentUser.teacherPin,
      });

      // Update gradebook in memory
      setGradebook(prev => {
        if (!prev) return null;
        return {
          ...prev,
          grades: {
            ...prev.grades,
            [studentId]: result.grade,
          },
        };
      });

      setNotification({
        type: 'success',
        text: `Notas de ${result.grade.studentName} guardadas correctamente.`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error al guardar notas' });
    } finally {
      setSavingStudentId(null);
    }
  };

  // Save all students' rows
  const handleSaveAll = async () => {
    if (!selectedCourseId || !gradebook) return;
    setLoading(true);
    try {
      for (const stu of allStudents) {
        const scores = localScores[stu.id] || {};
        const feedback = localFeedback[stu.id] || '';
        await api.updateStudentGrade(selectedCourseId, stu.id, {
          scores,
          teacherFeedback: feedback,
          teacherPin: currentUser.teacherPin,
        });
      }
      await loadGradebook(selectedCourseId);
      setNotification({
        type: 'success',
        text: '¡Todas las calificaciones del aula han sido guardadas exitosamente!',
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Error al guardar grupo' });
    } finally {
      setLoading(false);
    }
  };

  // Toggle official publication with teacher PIN verification
  const handleTogglePublication = async (newPublishState: boolean) => {
    if (!selectedCourseId) return;
    setPublishing(true);
    try {
      const res = await api.togglePublishGrades(selectedCourseId, newPublishState, confirmPin);
      setGradebook(prev => (prev ? { ...prev, isPublishedToSchool: res.isPublishedToSchool } : null));
      setShowPublishModal(false);
      setNotification({
        type: 'success',
        text: res.message,
      });
      setTimeout(() => setNotification(null), 4000);
      loadGradebook(selectedCourseId);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Fallo de autorización al publicar' });
    } finally {
      setPublishing(false);
    }
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const isPublished = gradebook?.isPublishedToSchool ?? false;

  const filteredStudents = allStudents.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.studentCode && s.studentCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: Teacher Private Security Guarantee */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white">
                  Portal Docente Privado: Registro y Publicación de Calificaciones
                </h1>
                <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
                  PIN ACTIVO: {currentUser.teacherPin || '••••'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Profesor: <strong className="text-slate-200">{currentUser.name}</strong> · Especialidad: {currentUser.specialty || 'Ciencias y Letras'}
              </p>
            </div>
          </div>

          {/* Quick Attendance Launcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAttendance(selectedCourseId)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 rounded-md transition-colors flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Tomar Asistencia Hoy
            </button>
            <button
              onClick={() => loadGradebook(selectedCourseId)}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-md transition-colors"
              title="Recargar registro"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-950/60 border-rose-800/60 text-rose-200'
              : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Course Bar & Publication Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Course selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-400 whitespace-nowrap">
            Materia / Aula:
          </label>
          <select
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.gradeLevel} ({c.teacherName})
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500 hidden sm:inline">
            · Periodo: {gradebook?.period || 'Bimestre 1'}
          </span>
        </div>

        {/* Publication Status & Action Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Estado de Publicación:</span>
            {isPublished ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 rounded">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                PUBLICADO EN TIEMPO REAL
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2.5 py-1 rounded">
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                BORRADOR CONFIDENCIAL
              </span>
            )}
          </div>

          {/* Action button to publish or unpublish */}
          <button
            onClick={() => setShowPublishModal(true)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isPublished
                ? 'bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/50 text-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
            }`}
          >
            {isPublished ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                Pausar Publicación (Borrador)
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Publicar Notas Oficiales
              </>
            )}
          </button>

          <button
            onClick={handleSaveAll}
            disabled={loading}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Todo
          </button>
        </div>
      </div>

      {/* Grade Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Table header bar with search */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Planilla de Calificaciones y Criterios Bimestrales
            </h3>
            <p className="text-xs text-slate-400">
              Escala oficial de 0 a 20 · Aprobatoria $\ge 11$ · Los cambios se calculan automáticamente
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar estudiante o código..."
              className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Interactive Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-semibold w-12 text-center">Nº</th>
                <th className="py-3 px-4 font-semibold min-w-[200px]">Estudiante</th>
                {gradebook?.criteria.map(crit => (
                  <th key={crit.id} className="py-3 px-3 font-semibold text-center min-w-[90px]">
                    <div className="text-slate-200 font-medium">{crit.shortCode}</div>
                    <div className="text-[10px] text-slate-500">{Math.round(crit.weight * 100)}% peso</div>
                  </th>
                ))}
                <th className="py-3 px-3 font-semibold text-center min-w-[90px]">
                  <div className="text-indigo-400 font-bold">Promedio</div>
                  <div className="text-[10px] text-slate-500">Ponderado</div>
                </th>
                <th className="py-3 px-3 font-semibold min-w-[120px]">Estado</th>
                <th className="py-3 px-4 font-semibold min-w-[220px]">Observación / Feedback</th>
                <th className="py-3 px-3 font-semibold text-center w-20">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredStudents.map((student, index) => {
                const stuScores = localScores[student.id] || {};
                const average = computeStudentAverage(student.id);

                let statusColor = 'text-slate-400';
                let statusLabel = 'Sin evaluar';

                if (average !== null) {
                  if (average >= 11) {
                    statusColor = 'text-emerald-400 font-semibold';
                    statusLabel = average >= 18 ? 'Destacado (AD)' : 'Aprobado (A)';
                  } else if (average >= 9) {
                    statusColor = 'text-amber-400 font-semibold';
                    statusLabel = 'En riesgo (B)';
                  } else {
                    statusColor = 'text-rose-400 font-semibold';
                    statusLabel = 'Reprobado (C)';
                  }
                }

                const isSaving = savingStudentId === student.id;

                return (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{student.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {student.studentCode} · {student.gradeLevel || '5to Sec'}
                      </div>
                    </td>

                    {/* Criteria input columns */}
                    {gradebook?.criteria.map(crit => {
                      const scoreVal = stuScores[crit.id];
                      return (
                        <td key={crit.id} className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.5"
                            value={scoreVal === null || scoreVal === undefined ? '' : scoreVal}
                            onChange={e => handleScoreChange(student.id, crit.id, e.target.value)}
                            placeholder="-"
                            className={`w-16 text-center font-mono py-1 rounded border text-xs focus:outline-none focus:ring-1 ${
                              scoreVal !== null && scoreVal < 11
                                ? 'bg-rose-950/40 border-rose-800 text-rose-300 focus:ring-rose-500'
                                : 'bg-slate-800 border-slate-700 text-white focus:ring-indigo-500'
                            }`}
                          />
                        </td>
                      );
                    })}

                    {/* Weighted Live Average */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                          average === null
                            ? 'text-slate-500'
                            : average >= 11
                            ? 'text-emerald-300 bg-emerald-950/50'
                            : 'text-rose-300 bg-rose-950/50'
                        }`}
                      >
                        {average !== null ? average.toFixed(1) : '-'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <span className={`text-[11px] ${statusColor}`}>{statusLabel}</span>
                    </td>

                    {/* Teacher feedback note */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={localFeedback[student.id] || ''}
                        onChange={e =>
                          setLocalFeedback(prev => ({
                            ...prev,
                            [student.id]: e.target.value,
                          }))
                        }
                        placeholder="Comentario o retroalimentación..."
                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Save individual row action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleSaveStudent(student.id)}
                        disabled={isSaving}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition-colors"
                        title="Guardar notas de este estudiante"
                      >
                        <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-pulse' : ''}`} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>
            Mostrando <strong>{filteredStudents.length}</strong> alumnos matriculados en {selectedCourse?.name}.
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Aprobado (11 - 20)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> En Riesgo (09 - 10)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> Reprobado (00 - 08)
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to Publish / Unpublish */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isPublished
                    ? 'bg-amber-950 border border-amber-700 text-amber-400'
                    : 'bg-emerald-950 border border-emerald-700 text-emerald-400'
                }`}
              >
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {isPublished ? 'Despublicar Calificaciones' : 'Autorización de Publicación Oficial'}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedCourse?.name} ({gradebook?.period})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {isPublished
                ? 'Al retirar las notas a modo Borrador, los padres y alumnos no podrán visualizar los cambios hasta que vuelvas a publicarlas.'
                : 'Al publicar oficialmente, las calificaciones y observaciones se sincronizarán en tiempo real en las libretas de los alumnos y los teléfonos/portales de sus padres.'}
            </p>

            <div className="bg-slate-800/80 p-3.5 rounded-lg border border-slate-700 mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ingresa tu PIN de Seguridad Docente para confirmar:
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                maxLength={6}
                placeholder="PIN privado"
                className="w-full bg-slate-900 border border-indigo-700/60 rounded px-3 py-2 font-mono text-center tracking-widest text-amber-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                PIN de {currentUser.name}: <strong className="text-amber-300">{currentUser.teacherPin || '7731'}</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleTogglePublication(!isPublished)}
                disabled={publishing || !confirmPin}
                className={`px-5 py-2 font-semibold rounded-md transition-colors ${
                  isPublished
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                }`}
              >
                {publishing
                  ? 'Confirmando con el servidor...'
                  : isPublished
                  ? 'Confirmar Retiro a Borrador'
                  : 'Confirmar y Publicar en Tiempo Real'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
