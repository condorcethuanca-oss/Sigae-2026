/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * Servicio oficial de Calendario Escolar y Fechas Institucionales de Bolivia (Gestión 2026).
 */

export interface SchoolCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  type: 'academico' | 'feriado' | 'evaluacion' | 'reunion' | 'institucional';
  isHoliday?: boolean;
}

/**
 * Calendario oficial de la Gestión Escolar 2026 en el Estado Plurinacional de Bolivia
 * y fechas del Distrito Educativo El Alto 1 (La Paz).
 */
export const OFFICIAL_BOLIVIA_CALENDAR_EVENTS: SchoolCalendarEvent[] = [
  {
    id: 'evt-01',
    date: '2026-02-02',
    title: 'Inauguración de la Gestión Escolar 2026',
    description: 'Inicio de labores educativas en la U.E. Luis Espinal Tarde de Collpani (Turno Tarde).',
    type: 'institucional',
  },
  {
    id: 'evt-02',
    date: '2026-02-16',
    title: 'Feriado de Carnaval',
    description: 'Feriado nacional - Lunes de Carnaval.',
    type: 'feriado',
    isHoliday: true,
  },
  {
    id: 'evt-03',
    date: '2026-02-17',
    title: 'Feriado de Carnaval',
    description: 'Feriado nacional - Martes de Ch\'alla.',
    type: 'feriado',
    isHoliday: true,
  },
  {
    id: 'evt-04',
    date: '2026-03-06',
    title: 'Aniversario de la Ciudad de El Alto',
    description: 'Feriado municipal con suspensión de actividades escolares en la urbe alteña.',
    type: 'feriado',
    isHoliday: true,
  },
  {
    id: 'evt-05',
    date: '2026-03-23',
    title: 'Día del Mar Boliviano',
    description: 'Hora cívica y desfile escolar en conmemoración a Eduardo Abaroa.',
    type: 'institucional',
  },
  {
    id: 'evt-06',
    date: '2026-04-03',
    title: 'Feriado de Viernes Santo',
    description: 'Feriado nacional de Semana Santa.',
    type: 'feriado',
    isHoliday: true,
  },
  {
    id: 'evt-07',
    date: '2026-04-20',
    title: 'Semana de Evaluaciones del 1.er Trimestre',
    description: 'Aplicación de evaluaciones trimestrales comunitarias de saberes y conocimientos.',
    type: 'evaluacion',
  },
  {
    id: 'evt-08',
    date: '2026-05-01',
    title: 'Día del Trabajo',
    description: 'Feriado nacional.',
    type: 'feriado',
    isHoliday: true,
  },
  {
    id: 'evt-09',
    date: '2026-05-08',
    title: 'Cierre del 1.er Trimestre y Consejo de Maestros',
    description: 'Consolidación de notas y entrega de libretas escolares a padres de familia.',
    type: 'academico',
  },
  {
    id: 'evt-10',
    date: '2026-06-04',
    title: 'Feriado de Corpus Christi',
    description: 'Feriado nacional.',
    type: 'feriado',
    isHoliday: true,
  },
  {
    id: 'evt-11',
    date: '2026-06-21',
    title: 'Año Nuevo Andino Amazónico Chaqueño (Willkakuti 5534)',
    description: 'Feriado nacional.',
    type: 'feriado',
    isHoliday: true,
  },
  {
    id: 'evt-12',
    date: '2026-07-06',
    title: 'Descanso Pedagógico de Invierno',
    description: 'Inicio del receso pedagógico de invierno para el departamento de La Paz.',
    type: 'academico',
  },
  {
    id: 'evt-13',
    date: '2026-07-16',
    title: 'Aniversario Cívico de La Paz (Revolución del 16 de Julio)',
    description: 'Feriado departamental en La Paz.',
    type: 'feriado',
    isHoliday: true,
  },
  {
    id: 'evt-14',
    date: '2026-08-06',
    title: 'Día de la Independencia de Bolivia',
    description: 'Aniversario patrio del Estado Plurinacional de Bolivia.',
    type: 'feriado',
    isHoliday: true,
  },
];

import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './config';
import { CalendarActivityEvent, SigaeRole } from '../types';

export const calendarService = {
  /**
   * Obtiene todos los eventos predeterminados del calendario institucional
   */
  getOfficialMilestones(): CalendarActivityEvent[] {
    return OFFICIAL_BOLIVIA_CALENDAR_EVENTS.map(e => ({
      id: e.id,
      date: e.date,
      title: e.title,
      description: e.description,
      type: e.type,
      isHoliday: e.isHoliday,
    }));
  },

  /**
   * Obtiene eventos combinados (hitos institucionales + eventos dinámicos en Firestore)
   */
  async getEventsForRange(
    startDateStr: string,
    endDateStr: string,
    filters?: {
      courseCode?: string;
      role?: SigaeRole;
      userUid?: string;
    }
  ): Promise<CalendarActivityEvent[]> {
    const list: CalendarActivityEvent[] = [];

    // 1. Agregar hitos bolivianos que caen en el rango
    for (const m of OFFICIAL_BOLIVIA_CALENDAR_EVENTS) {
      if (m.date >= startDateStr && m.date <= endDateStr) {
        list.push({
          id: m.id,
          date: m.date,
          title: m.title,
          description: m.description,
          type: m.type,
          isHoliday: m.isHoliday,
        });
      }
    }

    // 2. Consultar mensajes / comunicados / evaluaciones en Firestore que tienen eventDate
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('eventDate', '>=', startDateStr),
        where('eventDate', '<=', endDateStr)
      );
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data();
        // Filtrar por curso si corresponde
        if (
          !filters?.courseCode ||
          !data.targetCourseCode ||
          data.targetCourseCode === filters.courseCode ||
          data.recipientId === 'all_community' ||
          data.recipientId === 'all_teachers' ||
          data.recipientId === 'all_parents'
        ) {
          list.push({
            id: d.id,
            date: data.eventDate,
            title: data.subject || 'Actividad Escolar',
            description: data.content,
            type: (data.type as any) || 'academico',
            courseCode: data.targetCourseCode,
            authorName: data.senderName,
            authorRole: data.senderRole,
            priority: data.priority,
            time: data.eventTime,
            sourceMessageId: d.id,
          });
        }
      });
    } catch (err) {
      console.warn('[calendarService] Lectura de eventos en Firestore con respaldo local:', err);
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Obtiene eventos para un mes específico
   */
  async getEventsForMonth(
    year: number,
    monthIndex: number, // 0-based
    filters?: { courseCode?: string; role?: SigaeRole; userUid?: string }
  ): Promise<CalendarActivityEvent[]> {
    const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return this.getEventsForRange(start, end, filters);
  },

  /**
   * Obtiene eventos para una fecha específica (YYYY-MM-DD)
   */
  async getEventsForDate(
    dateStr: string,
    filters?: { courseCode?: string; role?: SigaeRole; userUid?: string }
  ): Promise<CalendarActivityEvent[]> {
    return this.getEventsForRange(dateStr, dateStr, filters);
  },

  /**
   * Guarda un evento institucional en Firestore
   */
  async saveEvent(event: CalendarActivityEvent): Promise<void> {
    try {
      await setDoc(doc(db, 'calendar_events', event.id), event, { merge: true });
    } catch (err) {
      console.warn('[calendarService] Error guardando evento en Firestore:', err);
    }
  },

  /**
   * Elimina un evento de Firestore
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'calendar_events', eventId));
    } catch (err) {
      console.warn('[calendarService] Error eliminando evento:', err);
    }
  },
};
