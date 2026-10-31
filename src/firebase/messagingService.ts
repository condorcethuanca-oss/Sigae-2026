import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './config';
import { InternalMessage, SigaeUser, SigaeRole } from '../types';
import { studentService } from './studentService';

export interface RecipientResolutionResult {
  count: number;
  sampleNames: string[];
  recipientUids: string[];
  groupLabel: string;
}

export const messagingService = {
  /**
   * Resuelve y calcula la lista real y deduplicada de destinatarios para un mensaje
   */
  async resolveRecipients(
    targetGroup: 'all_teachers' | 'all_parents' | 'all_students' | 'course_parents' | 'course_students' | 'course_teachers' | 'individual' | 'custom',
    targetCourseCode?: string,
    individualRecipient?: { uid: string; displayName: string; role: SigaeRole }
  ): Promise<RecipientResolutionResult> {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers: SigaeUser[] = [];
      usersSnap.forEach(d => allUsers.push({ uid: d.id, ...(d.data() as any) }));

      if (targetGroup === 'individual' && individualRecipient) {
        return {
          count: 1,
          sampleNames: [individualRecipient.displayName],
          recipientUids: [individualRecipient.uid],
          groupLabel: `Individual: ${individualRecipient.displayName} (${individualRecipient.role})`,
        };
      }

      if (targetGroup === 'all_teachers') {
        const teachers = allUsers.filter(u => u.role === 'profesor' && u.active !== false);
        return {
          count: teachers.length,
          sampleNames: teachers.slice(0, 4).map(t => t.displayName),
          recipientUids: teachers.map(t => t.uid),
          groupLabel: 'Planta Docente Completa (Todos los Profesores)',
        };
      }

      if (targetGroup === 'all_parents') {
        const parents = allUsers.filter(u => u.role === 'padre' && u.active !== false);
        return {
          count: parents.length,
          sampleNames: parents.slice(0, 4).map(p => p.displayName),
          recipientUids: parents.map(p => p.uid),
          groupLabel: 'Comunidad de Padres y Tutores (Todos los Cursos)',
        };
      }

      if (targetGroup === 'all_students') {
        const students = allUsers.filter(u => u.role === 'alumno' && u.active !== false);
        return {
          count: students.length,
          sampleNames: students.slice(0, 4).map(s => s.displayName),
          recipientUids: students.map(s => s.uid),
          groupLabel: 'Estudiantado General (1° a 6° de Secundaria)',
        };
      }

      if (targetGroup === 'course_parents' && targetCourseCode) {
        // Obtener estudiantes del curso
        const courseStudents = await studentService.getStudentsByCourse(targetCourseCode);
        const studentRudes = new Set(courseStudents.map(s => s.rude));

        // Buscar padres vinculados a esos estudiantes
        const courseParentsMap = new Map<string, SigaeUser>();
        for (const user of allUsers) {
          if (user.role === 'padre' && user.studentLinking) {
            const linkingRude = user.studentLinking.studentRude;
            const linkingGrade = user.studentLinking.grade || '';
            if (
              (linkingRude && studentRudes.has(linkingRude)) ||
              linkingGrade.includes(targetCourseCode)
            ) {
              courseParentsMap.set(user.uid, user);
            }
          }
        }

        const resolvedParents = Array.from(courseParentsMap.values());
        const count = resolvedParents.length || Math.min(courseStudents.length, 32); // Fallback al tamaño del aula si no todos se registraron
        return {
          count,
          sampleNames: resolvedParents.length > 0
            ? resolvedParents.slice(0, 4).map(p => p.displayName)
            : ['Tutores Legales de ' + targetCourseCode],
          recipientUids: resolvedParents.map(p => p.uid),
          groupLabel: `Padres y Tutores de ${targetCourseCode} de Secundaria`,
        };
      }

      if (targetGroup === 'course_students' && targetCourseCode) {
        const courseStudents = await studentService.getStudentsByCourse(targetCourseCode);
        return {
          count: courseStudents.length,
          sampleNames: courseStudents.slice(0, 4).map(s => s.fullName),
          recipientUids: courseStudents.map(s => `std-${s.id}`),
          groupLabel: `Estudiantes Matriculados en ${targetCourseCode} de Secundaria`,
        };
      }

      return {
        count: 1,
        sampleNames: ['Destinatario General'],
        recipientUids: ['all_community'],
        groupLabel: 'Comunidad Educativa',
      };
    } catch (err) {
      console.warn('[messagingService] Error resolviendo destinatarios:', err);
      return {
        count: 1,
        sampleNames: ['Destinatarios Institucionales'],
        recipientUids: [],
        groupLabel: 'Grupo Institucional',
      };
    }
  },

  /**
   * Envía o programa un mensaje escolar con confirmación
   */
  async dispatchMessage(message: InternalMessage): Promise<void> {
    const docRef = doc(db, 'messages', message.id);
    await setDoc(docRef, {
      ...message,
      createdAt: message.createdAt || new Date().toISOString(),
      sentAt: message.status === 'enviado' ? new Date().toISOString() : null,
    });
  },

  /**
   * Obtiene los mensajes relevantes para un usuario según su rol y UID
   */
  async getMessagesForUser(user: SigaeUser): Promise<{
    inbox: InternalMessage[];
    sent: InternalMessage[];
    scheduled: InternalMessage[];
  }> {
    const inbox: InternalMessage[] = [];
    const sent: InternalMessage[] = [];
    const scheduled: InternalMessage[] = [];

    try {
      const snap = await getDocs(collection(db, 'messages'));
      snap.forEach(d => {
        const msg = { id: d.id, ...(d.data() as any) } as InternalMessage;

        // Bandeja de salida (Enviados por este usuario)
        if (msg.senderId === user.uid) {
          if (msg.status === 'programado') {
            scheduled.push(msg);
          } else {
            sent.push(msg);
          }
        }

        // Bandeja de entrada
        const isRecipient =
          user.role === 'director' ||
          msg.recipientId === user.uid ||
          msg.recipientId === 'all_community' ||
          (msg.recipientId === 'all_teachers' && user.role === 'profesor') ||
          (msg.recipientId === 'all_parents' && user.role === 'padre') ||
          (msg.recipientId === 'all_students' && user.role === 'alumno') ||
          (user.teacherId && msg.recipientId === user.teacherId);

        if (isRecipient && msg.status !== 'programado' && msg.senderId !== user.uid) {
          inbox.push(msg);
        }
      });
    } catch (err) {
      console.warn('[messagingService] Lectura de mensajes en Firestore con fallback:', err);
    }

    // Ordenar cronológicamente descendente
    inbox.sort((a, b) => (b.sentAt || b.createdAt).localeCompare(a.sentAt || a.createdAt));
    sent.sort((a, b) => (b.sentAt || b.createdAt).localeCompare(a.sentAt || a.createdAt));
    scheduled.sort((a, b) => (a.scheduledAt || a.createdAt).localeCompare(b.scheduledAt || b.createdAt));

    return { inbox, sent, scheduled };
  },

  /**
   * Marca un mensaje como leído por el usuario
   */
  async markAsRead(messageId: string, userUid: string): Promise<void> {
    try {
      const docRef = doc(db, 'messages', messageId);
      await updateDoc(docRef, {
        readBy: arrayUnion({ uid: userUid, readAt: new Date().toISOString() }),
      });
    } catch (err) {
      console.warn('[messagingService] Error marcando lectura:', err);
    }
  },

  /**
   * Cancela un comunicado institucional programado
   */
  async cancelScheduledMessage(messageId: string): Promise<void> {
    try {
      const docRef = doc(db, 'messages', messageId);
      await updateDoc(docRef, {
        status: 'cancelado',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[messagingService] Error cancelando comunicado programado:', err);
    }
  },
};
