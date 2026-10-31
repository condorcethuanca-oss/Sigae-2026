/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * Servicio oficial de Asistencia Escolar y Registro Diario por Curso/Fecha.
 * No genera datos inventados: si no existe registro para una fecha, retorna null.
 */

import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from './config';
import { AttendanceSession, AttendanceRecordItem, AttendanceCategory } from '../types';

export const attendanceService = {
  /**
   * Obtiene la sesión de asistencia oficial para un curso/paralelo en una fecha (YYYY-MM-DD).
   * Retorna null si la sesión no ha sido registrada por el docente o la dirección.
   */
  async getSession(courseCode: string, date: string): Promise<AttendanceSession | null> {
    try {
      const sessionId = `att-${courseCode}-${date}`;
      const snap = await getDoc(doc(db, 'attendance_sessions', sessionId));
      if (snap.exists()) {
        return snap.data() as AttendanceSession;
      }
    } catch (err) {
      console.warn('[SIGAE Attendance] Aviso leyendo sesión de asistencia:', err);
    }
    return null;
  },

  /**
   * Guarda o actualiza la sesión de asistencia oficial en Firestore.
   */
  async saveSession(session: AttendanceSession): Promise<void> {
    const sessionId = `att-${session.courseCode}-${session.date}`;
    const cleanSession: AttendanceSession = {
      ...session,
      id: sessionId,
      lastUpdated: new Date().toISOString(),
    };
    await setDoc(doc(db, 'attendance_sessions', sessionId), cleanSession);
  },

  /**
   * Retorna la lista de fechas (YYYY-MM-DD) en que se ha tomado asistencia para un curso.
   * Utilizado por el calendario para marcar puntos de actividad sin inventar datos.
   */
  async getRecordedDatesForCourse(courseCode: string): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'attendance_sessions'),
        where('courseCode', '==', courseCode)
      );
      const snap = await getDocs(q);
      const dates: string[] = [];
      snap.forEach(d => {
        const data = d.data() as AttendanceSession;
        if (data.date && !dates.includes(data.date)) {
          dates.push(data.date);
        }
      });
      return dates.sort();
    } catch (err) {
      console.warn('[SIGAE Attendance] Aviso listando fechas registradas:', err);
      return [];
    }
  },

  /**
   * Obtiene todas las sesiones registradas en una fecha dada (para la vista de control diario del Director)
   */
  async getSessionsByDate(date: string): Promise<AttendanceSession[]> {
    try {
      const q = query(
        collection(db, 'attendance_sessions'),
        where('date', '==', date)
      );
      const snap = await getDocs(q);
      const list: AttendanceSession[] = [];
      snap.forEach(d => list.push(d.data() as AttendanceSession));
      return list;
    } catch (err) {
      console.warn('[SIGAE Attendance] Aviso consultando sesiones por fecha:', err);
      return [];
    }
  },
};
