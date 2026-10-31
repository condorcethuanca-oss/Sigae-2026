import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  User,
  MapPin,
  RefreshCw,
  Printer,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Filter,
  ShieldCheck,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  ScheduleBlock,
  SchoolDayOfWeek,
  ScheduleIncidence,
  SigaeUser,
  CourseScheduleMeta,
  ScheduleStatus,
} from '../../types';
import {
  scheduleService,
  OFFICIAL_PERIODS,
  SCHOOL_DAYS,
  SECONDARY_24_COURSES,
  OFFICIAL_SCHEDULE_INCIDENCES,
} from '../../firebase/scheduleService';

interface OfficialScheduleManagerProps {
  currentUser: SigaeUser;
}

export const OfficialScheduleManager: React.FC<OfficialScheduleManagerProps> = ({ currentUser }) => {
  // Selectores
  const [academicYear, setAcademicYear] = useState('2026');
  const [selectedGradeNumber, setSelectedGradeNumber] = useState<number>(6);
  const [selectedParallel, setSelectedParallel] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [selectedShift, setSelectedShift] = useState<'todos' | 'mañana' | 'tarde'>('todos');
  const [viewType, setViewType] = useState<'cuadricula' | 'lista'>('cuadricula');

  // Datos
  const [courseBlocks, setCourseBlocks] = useState<ScheduleBlock[]>([]);
  const [courseMeta, setCourseMeta] = useState<CourseScheduleMeta | null>(null);
  const [incidences, setIncidences] = useState<ScheduleIncidence[]>(OFFICIAL_SCHEDULE_INCIDENCES);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modal de resolución de incidencia
  const [resolvingIncidence, setResolvingIncidence] = useState<ScheduleIncidence | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  // Modal de Importación Administrativa Segura (Etapas A a I)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStage, setImportStage] = useState<
    'lectura' | 'validacion' | 'vista_previa' | 'autorizacion' | 'completado'
  >('lectura');
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Código de curso seleccionado (ej. "6A")
  const currentCourseCode = `${selectedGradeNumber}${selectedParallel}`;

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const [blocks, meta] = await Promise.all([
        scheduleService.getByCourse(currentCourseCode),
        scheduleService.getCourseScheduleMeta(currentCourseCode),
      ]);
      setCourseBlocks(blocks);
      setCourseMeta(meta);
      setIncidences(scheduleService.getIncidences());
    } catch (err) {
      console.warn('Error cargando horario del curso:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [currentCourseCode]);

  const handlePublishSchedule = async () => {
    setPublishing(true);
    try {
      const updated = await scheduleService.publishCourseSchedule(currentCourseCode, currentUser);
      setCourseMeta(updated);
      setNotification(`¡Horario de ${currentCourseCode} autorizado y publicado oficialmente para Familias y Alumnos!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`Error al publicar horario: ${err?.message || 'Error desconocido'}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleStatusChange = async (newStatus: ScheduleStatus) => {
    try {
      await scheduleService.setCourseScheduleStatus(currentCourseCode, newStatus);
      const meta = await scheduleService.getCourseScheduleMeta(currentCourseCode);
      setCourseMeta(meta);
      setNotification(`Estado de ${currentCourseCode} actualizado a: ${newStatus}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification(`Error al actualizar estado: ${err?.message || 'Error desconocido'}`);
    }
  };

  // Paralelos disponibles para el grado seleccionado (A, B, C, D)
  const availableParallels = ['A', 'B', 'C', 'D'];

  // Incidencias del curso actual
  const currentCourseIncidences = incidences.filter(
    i => i.courseCode === currentCourseCode || i.courseCode === 'Varios'
  );

  // Resolver incidencia
  const handleSaveResolution = () => {
    if (!resolvingIncidence) return;
    scheduleService.resolveIncidence(resolvingIncidence.id, resolutionText);
    setIncidences([...scheduleService.getIncidences()]);
    setResolvingIncidence(null);
    setResolutionText('');
    setNotification(`Incidencia ${resolvingIncidence.id} resuelta por Dirección.`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Días que tienen bloques para el curso
  const daysToShow: SchoolDayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO Y SELECTORES DEL HORARIO OFICIAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">Horarios Oficiales</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  GESTIÓN INSTITUCIONAL
                </span>
                {/* Badge de Estado Oficial del Curso */}
                {courseMeta && (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                      courseMeta.status === 'publicado'
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : courseMeta.status === 'aprobado'
                        ? 'bg-blue-950/80 border-blue-700 text-blue-300'
                        : courseMeta.status === 'con_incidencias'
                        ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                        : courseMeta.status === 'en_revision'
                        ? 'bg-sky-950/80 border-sky-700 text-sky-300'
                        : 'bg-amber-950/80 border-amber-700 text-amber-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {courseMeta.status === 'publicado'
                      ? 'Publicado a Familias'
                      : courseMeta.status === 'aprobado'
                      ? 'Aprobado por Dirección'
                      : courseMeta.status === 'con_incidencias'
                      ? 'Con Incidencias'
                      : courseMeta.status === 'en_revision'
                      ? 'En Revisión Técnica'
                      : 'Borrador en Edición'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Malla curricular, turnos, períodos y asignaciones de los 24 cursos de secundaria
              </p>
            </div>
          </div>

          {/* Botones de acción: Publicar, Actualizar, Importar, Imprimir */}
          <div className="flex flex-wrap items-center gap-2">
            {currentUser.role === 'director' && (
              <button
                onClick={handlePublishSchedule}
                disabled={publishing || courseMeta?.status === 'publicado'}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                  courseMeta?.status === 'publicado'
                    ? 'bg-emerald-950/90 border border-emerald-800 text-emerald-400 cursor-default shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
                title="Publicar horario oficial a familias y alumnos"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {publishing
                    ? 'Publicando...'
                    : courseMeta?.status === 'publicado'
                    ? 'Horario Publicado'
                    : 'Autorizar y Publicar'}
                </span>
              </button>
            )}

            <button
              onClick={loadSchedule}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={() => {
                setShowImportModal(true);
                setImportStage('lectura');
              }}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Excel</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Imprimir horario oficial"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {/* 2. BARRA DE SELECTORES OBLIGATORIOS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {/* Selector de Gestión Académica */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Gestión
            </label>
            <select
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <option value="2026">2026 (Oficial)</option>
              <option value="2024">2024 (Histórico)</option>
            </select>
          </div>

          {/* Selector de Grado */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Grado
            </label>
            <select
              value={selectedGradeNumber}
              onChange={e => setSelectedGradeNumber(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6].map(g => (
                <option key={g} value={g}>
                  {g}° de Secundaria
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Paralelo */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Paralelo
            </label>
            <div className="flex items-center gap-1">
              {availableParallels.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedParallel(p as any)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    selectedParallel === p
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de Turno */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Turno
            </label>
            <select
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <option value="todos">Todos los turnos</option>
              <option value="mañana">Mañana (08:00 - 12:15)</option>
              <option value="tarde">Tarde (14:00 - 18:15)</option>
            </select>
          </div>

          {/* Selector de Vista */}
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Vista
            </label>
            <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-xl">
              <button
                onClick={() => setViewType('cuadricula')}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewType === 'cuadricula' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                Cuadrícula
              </button>
              <button
                onClick={() => setViewType('lista')}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewType === 'lista' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                Lista
              </button>
            </div>
          </div>
        </div>

        {/* Notificación temporal */}
        {notification && (
          <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* 3. ALERTA DE INCIDENCIAS CURRICULARES SI EXISTEN */}
      {currentCourseIncidences.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Incidencias curriculares detectadas para {currentCourseCode}</span>
          </div>
          <div className="space-y-2">
            {currentCourseIncidences.map(inc => (
              <div
                key={inc.id}
                className="p-3 bg-slate-950/80 border border-amber-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 font-mono">{inc.id}</span>
                    <span className="text-slate-400">· {inc.dayOfWeek} ({inc.periodLabel})</span>
                    {inc.resolved ? (
                      <span className="px-2 py-0.2 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">
                        Resuelto
                      </span>
                    ) : (
                      <span className="px-2 py-0.2 rounded bg-rose-950 text-rose-400 text-[10px] font-bold">
                        Pendiente Dictamen
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300">{inc.description}</p>
                  {inc.resolutionNote && (
                    <p className="text-[11px] text-emerald-400 italic font-medium">
                      Dictamen: {inc.resolutionNote}
                    </p>
                  )}
                </div>

                {!inc.resolved && (
                  <button
                    onClick={() => {
                      setResolvingIncidence(inc);
                      setResolutionText(inc.resolutionNote || '');
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Resolver Incidencia
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CUADRÍCULA SEMANAL TRADICIONAL DE COMPUTADORA */}
      {viewType === 'cuadricula' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 overflow-x-auto shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Horario Oficial Semanal · Curso {currentCourseCode}</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({selectedGradeNumber}° de Secundaria Paralelo {selectedParallel})
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gestión {academicYear} · U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-950 border border-slate-800 text-blue-400 rounded-full">
              {courseBlocks.length} bloques asignados
            </span>
          </div>

          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-950/60">
                <th className="py-3 px-3 w-28">Período / Hora</th>
                {daysToShow.map(day => (
                  <th key={day} className="py-3 px-3 text-center">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {/* Período 1 */}
              <tr>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400 bg-slate-950/40 align-top">
                  <div className="font-bold text-white">P1 (08:00 - 09:20)</div>
                  <div className="text-[10px] text-slate-500">80 minutos</div>
                </td>
                {daysToShow.map(day => {
                  const block = courseBlocks.find(b => b.dayOfWeek === day && b.periodNumber === 1);
                  return (
                    <td key={day} className="py-2.5 px-2.5 align-top">
                      {block ? (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="font-bold text-white block text-xs">{block.subject}</span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {block.teacherName}
                          </span>
                          {block.classroom && (
                            <span className="text-[10px] text-blue-400 block font-mono">
                              {block.classroom}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl border border-dashed border-slate-800 text-center text-slate-600 text-[10px]">
                          Sin clase
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Período 2 (o Bloques 40 min en martes) */}
              <tr>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400 bg-slate-950/40 align-top">
                  <div className="font-bold text-white">P2 (09:20 - 10:45)</div>
                  <div className="text-[10px] text-slate-500">85 min / 40 min</div>
                </td>
                {daysToShow.map(day => {
                  // Manejar split de 40 min (ej. Martes en 6A)
                  const splitBlocks = courseBlocks.filter(
                    b => b.dayOfWeek === day && b.periodNumber === 2
                  );
                  if (splitBlocks.length > 1) {
                    return (
                      <td key={day} className="py-2 px-2 align-top space-y-1.5">
                        {splitBlocks.map(sb => (
                          <div
                            key={sb.id}
                            className="p-2 rounded-xl bg-slate-950 border border-amber-900/60 space-y-0.5"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-white truncate">{sb.subject}</span>
                              <span className="text-[9px] bg-amber-950 text-amber-300 px-1 rounded font-bold">
                                40m
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {sb.teacherName}
                            </span>
                          </div>
                        ))}
                      </td>
                    );
                  }

                  const block = splitBlocks[0];
                  return (
                    <td key={day} className="py-2.5 px-2.5 align-top">
                      {block ? (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="font-bold text-white block text-xs">{block.subject}</span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {block.teacherName}
                          </span>
                          {block.classroom && (
                            <span className="text-[10px] text-blue-400 block font-mono">
                              {block.classroom}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl border border-dashed border-slate-800 text-center text-slate-600 text-[10px]">
                          Sin clase
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* FRANJA DE RECREO DIFERENCIADA */}
              <tr className="bg-slate-950/90 border-y-2 border-indigo-900/40">
                <td className="py-2 px-3 font-mono text-[10px] text-indigo-400 font-bold">
                  10:45 - 11:00
                </td>
                <td colSpan={6} className="py-2 px-4 text-center">
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300">
                    — Recreo General Comunitario (15 minutos) —
                  </span>
                </td>
              </tr>

              {/* Período 3 */}
              <tr>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-400 bg-slate-950/40 align-top">
                  <div className="font-bold text-white">P3 (11:00 - 12:15)</div>
                  <div className="text-[10px] text-slate-500">75 minutos</div>
                </td>
                {daysToShow.map(day => {
                  const block = courseBlocks.find(b => b.dayOfWeek === day && b.periodNumber === 3);
                  return (
                    <td key={day} className="py-2.5 px-2.5 align-top">
                      {block ? (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <span className="font-bold text-white block text-xs">{block.subject}</span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {block.teacherName}
                          </span>
                          {block.classroom && (
                            <span className="text-[10px] text-blue-400 block font-mono">
                              {block.classroom}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl border border-dashed border-slate-800 text-center text-slate-600 text-[10px]">
                          Sin clase
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Turno Tarde (cuando aplique) */}
              {selectedShift !== 'mañana' && (
                <tr className="border-t-2 border-slate-800">
                  <td className="py-3 px-3 font-mono text-[11px] text-amber-400 bg-slate-950/40 align-top">
                    <div className="font-bold">Turno Tarde</div>
                    <div className="text-[10px] text-slate-500">14:00 - 18:15</div>
                  </td>
                  {daysToShow.map(day => {
                    const afternoonBlocks = courseBlocks.filter(
                      b => b.dayOfWeek === day && (b.periodNumber >= 4 || b.startTime >= '14:00')
                    );
                    return (
                      <td key={day} className="py-2.5 px-2.5 align-top">
                        {afternoonBlocks.length > 0 ? (
                          <div className="space-y-1.5">
                            {afternoonBlocks.map(ab => (
                              <div
                                key={ab.id}
                                className="p-2 rounded-xl bg-slate-950 border border-amber-900/40 space-y-0.5"
                              >
                                <span className="font-bold text-white block text-xs">
                                  {ab.subject}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {ab.startTime} - {ab.endTime}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl border border-slate-900 text-center text-slate-600 text-[10px] italic">
                            Sin clases en este turno
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* VISTA LISTA CRONOLÓGICA */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Listado Cronológico de Clases Semanales</h3>
          <div className="space-y-2">
            {courseBlocks.map(b => (
              <div
                key={b.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white">{b.dayOfWeek} · {b.subject}</span>
                  <p className="text-slate-400">{b.periodLabel} ({b.startTime} - {b.endTime})</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-300 block">{b.teacherName}</span>
                  <span className="text-blue-400 font-mono text-[11px]">{b.classroom || 'Aula Oficial'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. MODAL DE RESOLUCIÓN DE INCIDENCIA */}
      {resolvingIncidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Dictamen de Dirección · Incidencia</span>
              </h3>
              <button
                onClick={() => setResolvingIncidence(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-amber-400">{resolvingIncidence.id}</span>
              <p className="text-slate-300">{resolvingIncidence.description}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Dictamen institucional de resolución:
              </label>
              <textarea
                value={resolutionText}
                onChange={e => setResolutionText(e.target.value)}
                rows={3}
                placeholder="Escribe la disposición oficial (ej. Asignar laboratorio al docente titular en período alterno)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setResolvingIncidence(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveResolution}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                Guardar Dictamen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE IMPORTACIÓN ADMINISTRATIVA SEGURA (ETAPAS A A I) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Importación Administrativa Segura de Horarios
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Pasos visuales A-I */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pb-2 border-b border-slate-800">
                <span>Fuente: SIGAE_horarios_por_curso.xlsx</span>
                <span className="text-indigo-400">Gestión Destino: 2026</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Etapas A-D:</strong> Lectura de 24 hojas, normalización de asignaciones y detección de incidencias completada.
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Etapa E (Vista Previa):</strong> 24 cursos catalogados (1A a 6D), 48 bloques regulares y técnicos validados.
                  </span>
                </div>
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Etapa F (Autorización):</strong> Se requiere confirmación de la Directora para publicar la versión 2026.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl text-xs text-blue-300 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-blue-400" />
              <span>
                Este proceso es <strong>idempotente</strong>. No duplicará clases ni sobrescribirá el historial sin validación previa.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setIsProcessingImport(true);
                  try {
                    await scheduleService.seedInitialSchedule(true);
                    setNotification('¡Horarios oficiales 2026 validados y publicados con éxito!');
                    setShowImportModal(false);
                    loadSchedule();
                  } catch (err: any) {
                    alert(`Error en publicación: ${err.message}`);
                  } finally {
                    setIsProcessingImport(false);
                  }
                }}
                disabled={isProcessingImport}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isProcessingImport ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publicando versión oficial...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Autorizar y Publicar Horario Oficial</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
