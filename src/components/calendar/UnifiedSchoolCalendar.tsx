import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
  Clock,
  MapPin,
  User,
  AlertCircle,
  FileText,
  Award,
  Users,
  Bell,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  SigaeUser,
  ScheduleBlock,
  CalendarActivityEvent,
  SchoolDayOfWeek,
} from '../../types';
import { calendarService } from '../../firebase/calendarService';
import { scheduleService } from '../../firebase/scheduleService';

interface UnifiedSchoolCalendarProps {
  currentUser: SigaeUser;
  courseCode?: string; // e.g. "6A"
  studentName?: string; // e.g. "Camila Choquehuanca"
  onOpenNewEventModal?: () => void;
  allowedCourseCodes?: string[];
  onSelectCourse?: (courseCode: string) => void;
}

const MONTH_NAMES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

const WEEKDAY_NAMES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

const FULL_DAY_NAMES: Record<number, SchoolDayOfWeek> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const UnifiedSchoolCalendar: React.FC<UnifiedSchoolCalendarProps> = ({
  currentUser,
  courseCode = '6A',
  studentName,
  onOpenNewEventModal,
  allowedCourseCodes,
  onSelectCourse,
}) => {
  // Vista actual: 'mes' o 'semana'
  const [viewMode, setViewMode] = useState<'mes' | 'semana'>('mes');

  // Fecha de navegación activa
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 21)); // 21 Oct 2026 de referencia institucional
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 9, 21));

  // Datos reales desde Firebase
  const [events, setEvents] = useState<CalendarActivityEvent[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtro de día para vista móvil de semana
  const [selectedMobileDayOfWeek, setSelectedMobileDayOfWeek] = useState<number>(3); // Miércoles por defecto

  // Cargar eventos y bloques de horario según curso y fecha
  const loadCalendarData = async () => {
    setLoading(true);
    try {
      // 1. Cargar eventos del mes o semana desde Firebase
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const evts = await calendarService.getEventsForMonth(year, month, {
        courseCode,
        role: currentUser.role,
        userUid: currentUser.uid,
      });
      setEvents(evts);

      // 2. Cargar bloques de horario del curso seleccionado (respetando publicación oficial para padres y alumnos)
      let blocks: ScheduleBlock[] = [];
      if (currentUser.role === 'director' || currentUser.role === 'profesor') {
        blocks = await scheduleService.getByCourse(courseCode);
      } else {
        const published = await scheduleService.getOfficialPublishedScheduleForCourse(courseCode);
        blocks = published || [];
      }
      setScheduleBlocks(blocks);
    } catch (err) {
      console.warn('[UnifiedSchoolCalendar] Error cargando datos de calendario:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [currentDate.getFullYear(), currentDate.getMonth(), courseCode]);

  // Navegación
  const handlePrev = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
    }
  };

  const handleToday = () => {
    const today = new Date(2026, 9, 21); // Fecha institucional 2026
    setCurrentDate(today);
    setSelectedDate(today);
    setSelectedMobileDayOfWeek(today.getDay());
  };

  // Cálculo de días para la vista mensual (Android calendar style)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = [];

  // Días del mes previo
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({
      dateNumber: daysInPrevMonth - i,
      monthType: 'prev',
      dateObj: new Date(year, month - 1, daysInPrevMonth - i),
    });
  }

  // Días del mes actual
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      dateNumber: i,
      monthType: 'current',
      dateObj: new Date(year, month, i),
    });
  }

  // Días del mes siguiente para completar la cuadrícula de 7 columnas
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      dateNumber: i,
      monthType: 'next',
      dateObj: new Date(year, month + 1, i),
    });
  }

  // Formato YYYY-MM-DD
  const formatDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const isToday = (d: Date) => {
    return (
      d.getDate() === 21 &&
      d.getMonth() === 9 &&
      d.getFullYear() === 2026
    );
  };

  const isSelected = (d: Date) => {
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Eventos para la fecha seleccionada
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayEvents = events.filter(e => e.date === selectedDateKey);

  // Cálculo de semana activa (Lunes a Domingo o Domingo a Sábado)
  const getWeekDays = () => {
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay(); // 0 = Domingo
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lunes
    const monday = new Date(start.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      week.push(nextDay);
    }
    return week;
  };

  const currentWeekDays = getWeekDays();

  // Helper de colores de eventos
  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'evaluacion':
        return 'bg-rose-950/80 border-rose-800 text-rose-300';
      case 'tarea':
        return 'bg-amber-950/80 border-amber-800 text-amber-300';
      case 'comunicado':
      case 'institucional':
        return 'bg-blue-950/80 border-blue-800 text-blue-300';
      case 'reunion':
        return 'bg-purple-950/80 border-purple-800 text-purple-300';
      case 'feriado':
        return 'bg-emerald-950/80 border-emerald-800 text-emerald-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  const getEventDotClass = (type: string) => {
    switch (type) {
      case 'evaluacion':
        return 'bg-rose-500';
      case 'tarea':
        return 'bg-amber-500';
      case 'comunicado':
      case 'institucional':
        return 'bg-blue-500';
      case 'reunion':
        return 'bg-purple-500';
      case 'feriado':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-white space-y-6 shadow-2xl">
      {/* 1. ENCABEZADO INSTITUCIONAL AL ESTILO ANDROID DARK CALENDAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Mi calendario
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {MONTH_NAMES[month]} {year}
                {studentName && ` · Estudiante: ${studentName}`}
                {courseCode && ` · Curso: ${courseCode} de Secundaria`}
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Navegación y Vistas */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Cursos si aplica (Director / Docente con varios cursos) */}
          {allowedCourseCodes && allowedCourseCodes.length > 1 && onSelectCourse && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <select
                value={courseCode}
                onChange={e => onSelectCourse(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer"
              >
                {allowedCourseCodes.map(code => (
                  <option key={code} value={code} className="bg-slate-900 text-white">
                    Curso {code}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de Vista: [ Mes ] [ Semana ] */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'mes'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('semana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'semana'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semana
            </button>
          </div>

          {/* Botones de navegación de fecha */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handlePrev}
              title="Período anterior"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              title="Siguiente período"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botón '+' para crear eventos o comunicaciones */}
          {onOpenNewEventModal && currentUser.role !== 'alumno' && (
            <button
              onClick={onOpenNewEventModal}
              title="Crear evento o comunicado"
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. VISTA MENSUAL (INSPIRACIÓN CALENDARIO OSCURO ANDROID) */}
      {viewMode === 'mes' && (
        <div className="space-y-6">
          {/* Cuadrícula de 7 columnas: Domingo a Sábado */}
          <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-950/70">
            {/* Cabecera de días de la semana */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/90 text-center py-2.5 text-[11px] font-black tracking-wider text-slate-400">
              {WEEKDAY_NAMES.map(day => (
                <div key={day} className="py-0.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Celdas del mes */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/80">
              {calendarCells.map((cell, idx) => {
                const dateKey = formatDateKey(cell.dateObj);
                const dayEvents = events.filter(e => e.date === dateKey);
                const isCurrentMonth = cell.monthType === 'current';
                const cellIsToday = isToday(cell.dateObj);
                const cellIsSelected = isSelected(cell.dateObj);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cell.dateObj);
                    }}
                    className={`min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2 flex flex-col justify-between transition-all cursor-pointer ${
                      !isCurrentMonth ? 'opacity-30 bg-slate-950/40' : 'hover:bg-slate-800/50'
                    } ${
                      cellIsSelected
                        ? 'ring-2 ring-blue-500 bg-slate-800/80 z-10'
                        : ''
                    }`}
                  >
                    {/* Número del día */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold flex items-center justify-center w-6 h-6 rounded-full ${
                          cellIsToday
                            ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/30'
                            : cellIsSelected
                            ? 'text-blue-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {cell.dateNumber}
                      </span>

                      {/* Dots rápidos para vista compacta móvil */}
                      {dayEvents.length > 0 && (
                        <div className="flex items-center gap-1 sm:hidden">
                          {dayEvents.slice(0, 3).map((e, eIdx) => (
                            <span
                              key={eIdx}
                              className={`w-1.5 h-1.5 rounded-full ${getEventDotClass(e.type)}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Etiquetas de eventos para vista de escritorio */}
                    <div className="hidden sm:flex flex-col gap-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev, evIdx) => (
                        <div
                          key={evIdx}
                          title={`${ev.title} (${ev.type})`}
                          className={`text-[10px] truncate px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 ${getEventBadgeClass(
                            ev.type
                          )}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getEventDotClass(ev.type)}`} />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}

                      {dayEvents.length > 2 && (
                        <span className="text-[9px] font-bold text-slate-400 pl-1">
                          +{dayEvents.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detalle de eventos de la fecha seleccionada */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white capitalize">
                    {selectedDate.toLocaleDateString('es-BO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {selectedDayEvents.length} actividad(es) registrada(s)
                  </span>
                </div>
              </div>

              {isToday(selectedDate) && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 text-[10px] font-bold">
                  FECHA ACTUAL
                </span>
              )}
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs">No existen eventos ni evaluaciones programadas para este día.</p>
                {onOpenNewEventModal && currentUser.role !== 'alumno' && (
                  <button
                    onClick={onOpenNewEventModal}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline cursor-pointer"
                  >
                    Programar una nueva actividad escolar
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedDayEvents.map(evt => (
                  <div
                    key={evt.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${getEventBadgeClass(
                      evt.type
                    )}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700">
                          {evt.type}
                        </span>
                        {evt.time && (
                          <span className="text-[10px] font-mono flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3" />
                            {evt.time}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-white">{evt.title}</h4>
                      {evt.description && (
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {evt.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/40">
                      <span>{evt.authorName ? `Por: ${evt.authorName}` : 'Institucional'}</span>
                      {evt.subject && <span className="font-semibold text-slate-200">{evt.subject}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. VISTA SEMANAL (AGENDA ACADÉMICA: CLASES, ACTIVIDADES, COMUNICACIONES) */}
      {viewMode === 'semana' && (
        <div className="space-y-6">
          {/* A. VISTA ESCRITORIO (7 COLUMNAS) */}
          <div className="hidden lg:grid grid-cols-7 gap-3">
            {currentWeekDays.map((dayObj, idx) => {
              const dayNum = dayObj.getDay();
              const boliviaDayName = FULL_DAY_NAMES[dayNum];
              const dateKey = formatDateKey(dayObj);
              const dayEvents = events.filter(e => e.date === dateKey);
              const dayClasses = boliviaDayName
                ? scheduleBlocks.filter(b => b.dayOfWeek === boliviaDayName)
                : [];
              const dayIsToday = isToday(dayObj);

              return (
                <div
                  key={idx}
                  className={`bg-slate-950 border rounded-2xl p-3 flex flex-col justify-between space-y-3 ${
                    dayIsToday ? 'border-blue-500/80 shadow-md shadow-blue-500/10' : 'border-slate-800'
                  }`}
                >
                  {/* Cabecera del día */}
                  <div className="pb-2 border-b border-slate-800 text-center">
                    <span className="text-[11px] font-black uppercase text-slate-400 block">
                      {WEEKDAY_NAMES[dayNum]}
                    </span>
                    <span
                      className={`text-sm font-bold inline-block px-2 py-0.5 rounded-full mt-0.5 ${
                        dayIsToday ? 'bg-blue-600 text-white' : 'text-slate-200'
                      }`}
                    >
                      {dayObj.getDate()}
                    </span>
                  </div>

                  {/* 1. CLASES OFICIALES RECURRENTES */}
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 block">
                      Clases
                    </span>
                    {dayClasses.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic block">Sin clases</span>
                    ) : (
                      dayClasses.map(cls => (
                        <div
                          key={cls.id}
                          className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>{cls.periodLabel?.split(' ')[0] || `P${cls.periodNumber}`}</span>
                            {cls.isFortyMinuteSplit && (
                              <span className="text-amber-400 font-bold">40 min</span>
                            )}
                          </div>
                          <div className="font-bold text-white truncate">{cls.subject}</div>
                          <div className="text-slate-400 text-[9px] truncate">{cls.teacherName}</div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 2. ACTIVIDADES / TAREAS / EVALUACIONES */}
                  <div className="space-y-1 pt-2 border-t border-slate-800/80">
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 block">
                      Actividades
                    </span>
                    {dayEvents.filter(e => e.type !== 'comunicado').length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic block">Ninguna</span>
                    ) : (
                      dayEvents
                        .filter(e => e.type !== 'comunicado')
                        .map(e => (
                          <div
                            key={e.id}
                            className={`p-1.5 rounded-lg border text-[10px] ${getEventBadgeClass(e.type)}`}
                          >
                            <span className="font-bold truncate block">{e.title}</span>
                          </div>
                        ))
                    )}
                  </div>

                  {/* 3. COMUNICACIONES */}
                  <div className="space-y-1 pt-2 border-t border-slate-800/80">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
                      Comunicaciones
                    </span>
                    {dayEvents.filter(e => e.type === 'comunicado').length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic block">Ninguna</span>
                    ) : (
                      dayEvents
                        .filter(e => e.type === 'comunicado')
                        .map(e => (
                          <div
                            key={e.id}
                            className="p-1 bg-blue-950/60 border border-blue-900 rounded text-[9px] text-blue-200 truncate"
                          >
                            {e.title}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* B. VISTA TELÉFONO (FILA HORIZONTAL DE DÍAS Y ABAJO CRONOGRAMA EN 3 APARTADOS) */}
          <div className="lg:hidden space-y-4">
            {/* Fila horizontal con selector de 7 días */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {currentWeekDays.map((dayObj, idx) => {
                const dayNum = dayObj.getDay();
                const isSelectedDay = selectedMobileDayOfWeek === dayNum;
                const dayIsToday = isToday(dayObj);

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedMobileDayOfWeek(dayNum);
                      setSelectedDate(dayObj);
                    }}
                    className={`flex-1 min-w-[50px] p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelectedDay
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] block uppercase font-black">
                      {WEEKDAY_NAMES[dayNum]}
                    </span>
                    <span
                      className={`text-sm block font-bold ${
                        dayIsToday && !isSelectedDay ? 'text-blue-400 underline' : ''
                      }`}
                    >
                      {dayObj.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cronograma completo del día seleccionado organizado en 3 apartados estrictos */}
            {(() => {
              const activeDayName = FULL_DAY_NAMES[selectedMobileDayOfWeek];
              const mobileDayClasses = activeDayName
                ? scheduleBlocks.filter(b => b.dayOfWeek === activeDayName)
                : [];
              const mobileDayEvents = events.filter(e => e.date === selectedDateKey);

              return (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-5">
                  <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm text-white uppercase tracking-wider">
                        {activeDayName || 'Día de la Semana'} · {selectedDate.getDate()} de {MONTH_NAMES[selectedDate.getMonth()]}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Cronograma institucional del curso {courseCode}
                      </p>
                    </div>
                    {isToday(selectedDate) && (
                      <span className="text-[10px] font-bold bg-blue-950 border border-blue-800 text-blue-400 px-2 py-0.5 rounded-full">
                        HOY
                      </span>
                    )}
                  </div>

                  {/* 1. APARTADO: MIS CLASES */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Mis Clases</span>
                    </h4>

                    {mobileDayClasses.length === 0 ? (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
                        Sin clases programadas en este turno.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mobileDayClasses.map(cls => (
                          <div
                            key={cls.id}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono text-blue-400">
                                  {cls.periodLabel?.split(' ')[0] || `P${cls.periodNumber}`}
                                </span>
                                {cls.isFortyMinuteSplit && (
                                  <span className="text-[10px] bg-amber-950 border border-amber-800 text-amber-300 font-bold px-1.5 py-0.2 rounded">
                                    40 min
                                  </span>
                                )}
                                <span className="text-xs text-slate-400">
                                  {cls.startTime} - {cls.endTime}
                                </span>
                              </div>
                              <h5 className="font-bold text-sm text-white">{cls.subject}</h5>
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-500" />
                                <span>{cls.teacherName}</span>
                              </p>
                            </div>

                            {cls.classroom && (
                              <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-1 rounded-lg text-slate-400 flex items-center gap-1 shrink-0">
                                <MapPin className="w-3 h-3 text-blue-400" />
                                {cls.classroom}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. APARTADO: ACTIVIDADES (Tareas, Evaluaciones, Reuniones) */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      <span>Actividades y Evaluaciones</span>
                    </h4>

                    {mobileDayEvents.filter(e => e.type !== 'comunicado').length === 0 ? (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
                        Sin actividades académicas registradas para esta fecha.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mobileDayEvents
                          .filter(e => e.type !== 'comunicado')
                          .map(evt => (
                            <div
                              key={evt.id}
                              className={`p-3 rounded-xl border space-y-1 ${getEventBadgeClass(
                                evt.type
                              )}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/60 border border-slate-700">
                                  {evt.type}
                                </span>
                                {evt.time && (
                                  <span className="text-[10px] font-mono text-slate-300">
                                    {evt.time}
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-sm text-white">{evt.title}</h5>
                              {evt.description && (
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {evt.description}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* 3. APARTADO: COMUNICACIONES */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Comunicaciones</span>
                    </h4>

                    {mobileDayEvents.filter(e => e.type === 'comunicado').length === 0 ? (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
                        Sin comunicados oficiales relacionados con esta fecha.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mobileDayEvents
                          .filter(e => e.type === 'comunicado')
                          .map(evt => (
                            <div
                              key={evt.id}
                              className="p-3 bg-blue-950/60 border border-blue-900 rounded-xl space-y-1"
                            >
                              <span className="text-[10px] font-bold text-blue-400 uppercase">
                                Comunicado de Dirección
                              </span>
                              <h5 className="font-bold text-sm text-white">{evt.title}</h5>
                              {evt.description && (
                                <p className="text-xs text-slate-300">{evt.description}</p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
