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
} from 'firebase/firestore';
import { db } from './config';
import {
  KardexEntry,
  KardexLevel,
  KardexCategory,
  AUTHORIZED_DIRECTOR_UID,
  AUTHORIZED_DIRECTOR_UIDS,
  AUTHORIZED_SUPERADMIN_UID,
} from '../types';
import { notificationService } from './notificationService';

export const kardexService = {
  /**
   * Registra una nueva entrada oficial de Kárdex institucional
   */
  async createEntry(
    data: Omit<KardexEntry, 'id' | 'createdAt' | 'status'>
  ): Promise<KardexEntry> {
    try {
      const kardexId = `kdx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      const entry: KardexEntry = {
        id: kardexId,
        ...data,
        status: data.level >= 3 ? 'notificado' : 'registrado',
        requiresFamilySignature: data.level >= 2,
        familyNotificationSent: data.level >= 3,
        directionNotified: data.level === 4,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const ref = doc(db, 'kardex_records', kardexId);
      await setDoc(ref, entry);

      // Notificaciones automáticas según severidad institucional
      let parentsNotifiedCount = 0;
      if (data.level >= 3) {
        parentsNotifiedCount = await this.notifyParentsForKardex(entry);
        if (parentsNotifiedCount === 0) {
          entry.familyNotificationSent = false;
          entry.status = 'registrado';
          await updateDoc(ref, {
            familyNotificationSent: false,
            status: 'registrado',
          }).catch(e => console.warn('[KardexService] Aviso actualizando estado sin tutores:', e));
        }
      }

      if (data.level === 4) {
        await this.notifyDirectionForKardex(entry);
      }

      return entry;
    } catch (err) {
      console.error('[KardexService] Error al crear observación de kárdex:', err);
      throw err;
    }
  },

  /**
   * Obtiene los tutores autorizados con vinculación aprobada para un estudiante
   */
  async getApprovedParentsForStudent(studentId: string): Promise<{ parentUid: string; parentName: string; relationship: string }[]> {
    if (!studentId) return [];
    try {
      const linksQ = query(
        collection(db, 'parentStudentLinks'),
        where('studentId', '==', studentId),
        where('status', '==', 'activa')
      );
      const linksSnap = await getDocs(linksQ);
      const parents: { parentUid: string; parentName: string; relationship: string }[] = [];
      linksSnap.forEach(d => {
        const linkData = d.data();
        if (linkData.parentUid && !parents.some(p => p.parentUid === linkData.parentUid)) {
          parents.push({
            parentUid: linkData.parentUid,
            parentName: linkData.parentName || 'Tutor Legal',
            relationship: linkData.relationship || 'Tutor Legal',
          });
        }
      });
      return parents;
    } catch (err) {
      console.error('[KardexService] Error consultando tutores aprobados:', err);
      return [];
    }
  },

  /**
   * Notifica a los padres de familia vinculados con el estudiante
   * Utiliza identificadores idempotentes para evitar duplicados en reintentos.
   */
  async notifyParentsForKardex(entry: KardexEntry): Promise<number> {
    try {
      const approvedParents = await this.getApprovedParentsForStudent(entry.studentId);
      if (approvedParents.length === 0) {
        return 0;
      }

      const priority = entry.level === 4 ? 'urgente' : 'prioritario';
      const levelLabel =
        entry.level === 4
          ? 'NIVEL 4: ATENCIÓN PRIORITARIA / DIRECCIÓN'
          : 'NIVEL 3: ATENCIÓN FAMILIAR';

      let sentCount = 0;
      for (const parent of approvedParents) {
        // Clave idempotente determinista: kardexRecordId + recipientUid
        const notifId = `notif-kdx-${entry.id}-${parent.parentUid}`;
        const notifDocRef = doc(db, 'notifications', notifId);

        await setDoc(notifDocRef, {
          id: notifId,
          recipientUid: parent.parentUid,
          senderUid: entry.teacherUid,
          senderName: entry.teacherName,
          senderRole: 'profesor',
          title: `[Kárdex ${levelLabel}] ${entry.studentName}`,
          message: `${entry.title} (${entry.category.toUpperCase()}): ${entry.description.slice(0, 140)}... Ingrese al Portal de la Familia para revisar y responder.`,
          type: 'kardex',
          relatedId: entry.id,
          priority,
          read: false,
          createdAt: new Date().toISOString(),
        }, { merge: true });

        sentCount++;
      }

      // Si se entregaron avisos, marcar el kárdex como notificado formalmente
      if (sentCount > 0) {
        await updateDoc(doc(db, 'kardex_records', entry.id), {
          familyNotificationSent: true,
          familyNotificationCount: sentCount,
          updatedAt: new Date().toISOString(),
        }).catch(e => console.warn('[KardexService] Error actualizando flag en kardex:', e));
      }

      return sentCount;
    } catch (err) {
      console.error('[KardexService] Error al notificar a los padres:', err);
      return 0;
    }
  },

  /**
   * Notifica a Dirección de una observación Nivel 4 (falta grave / derivación)
   */
  async notifyDirectionForKardex(entry: KardexEntry): Promise<void> {
    try {
      const directorUids = new Set<string>(AUTHORIZED_DIRECTOR_UIDS);
      directorUids.add(AUTHORIZED_DIRECTOR_UID);

      // Consultar usuarios con rol director
      const usersQ = query(collection(db, 'users'), where('role', '==', 'director'));
      const snap = await getDocs(usersQ);
      snap.forEach(d => directorUids.add(d.id));

      for (const dUid of directorUids) {
        if (!dUid) continue;
        const notifId = `notif-kdx-dir-${entry.id}-${dUid}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientUid: dUid,
          senderUid: entry.teacherUid,
          senderName: entry.teacherName,
          senderRole: 'profesor',
          title: `[ALERTA DIRECCIÓN - KÁRDEX N4] ${entry.studentName} (${entry.courseCode})`,
          message: `Falta de Nivel 4 registrada por Prof. ${entry.teacherName}. Materia: ${entry.subject || 'General'}. Asunto: ${entry.title}. Requiere intervención de Dirección.`,
          type: 'kardex',
          relatedId: entry.id,
          priority: 'urgente',
          read: false,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (err) {
      console.error('[KardexService] Error al notificar a Dirección:', err);
    }
  },

  /**
   * Obtiene las observaciones de Kárdex registradas para un estudiante
   */
  async getByStudent(studentId: string): Promise<KardexEntry[]> {
    if (!studentId) return [];
    try {
      const q = query(
        collection(db, 'kardex_records'),
        where('studentId', '==', studentId)
      );
      const snap = await getDocs(q);
      const list: KardexEntry[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.error('[KardexService] Error al obtener kárdex de estudiante:', err);
      return [];
    }
  },

  /**
   * Obtiene las observaciones de Kárdex para un curso completo (ej: "6A")
   */
  async getByCourse(courseCode: string): Promise<KardexEntry[]> {
    if (!courseCode) return [];
    try {
      const q = query(
        collection(db, 'kardex_records'),
        where('courseCode', '==', courseCode)
      );
      const snap = await getDocs(q);
      const list: KardexEntry[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.error('[KardexService] Error al obtener kárdex de curso:', err);
      return [];
    }
  },

  /**
   * Obtiene las observaciones registradas por un profesor
   */
  async getByTeacher(teacherUid: string): Promise<KardexEntry[]> {
    if (!teacherUid) return [];
    try {
      const q = query(
        collection(db, 'kardex_records'),
        where('teacherUid', '==', teacherUid)
      );
      const snap = await getDocs(q);
      const list: KardexEntry[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.error('[KardexService] Error al obtener kárdex del profesor:', err);
      return [];
    }
  },

  /**
   * Consulta auditora general para Dirección
   */
  async getAllEntries(filters?: {
    level?: KardexLevel;
    courseCode?: string;
    category?: KardexCategory;
  }): Promise<KardexEntry[]> {
    try {
      const snap = await getDocs(collection(db, 'kardex_records'));
      let list: KardexEntry[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));

      if (filters?.level) {
        list = list.filter(e => e.level === filters.level);
      }
      if (filters?.courseCode) {
        list = list.filter(e => e.courseCode === filters.courseCode);
      }
      if (filters?.category) {
        list = list.filter(e => e.category === filters.category);
      }

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.error('[KardexService] Error al consultar kárdex general:', err);
      return [];
    }
  },

  /**
   * Acuse y descargo familiar de una observación de Kárdex
   */
  async acknowledgeByFamily(
    kardexId: string,
    parentUid: string,
    parentName: string,
    responseNote?: string
  ): Promise<boolean> {
    try {
      const ref = doc(db, 'kardex_records', kardexId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return false;
      const entry = snap.data() as KardexEntry;

      const nowIso = new Date().toISOString();
      await updateDoc(ref, {
        familyAcknowledged: true,
        familyAcknowledgedAt: nowIso,
        familyResponseNote: responseNote || 'Notificación revisada y aceptada por el tutor legal.',
        status: entry.directionNotified && !entry.directionResolution ? 'notificado' : 'atendido',
        updatedAt: nowIso,
      });

      // Notificar al profesor emisor con el código de color de PADRE (Verde)
      await notificationService.createNotification({
        recipientUid: entry.teacherUid,
        senderUid: parentUid,
        senderName: parentName,
        senderRole: 'padre',
        title: `[Kárdex Atendido] Tutor de ${entry.studentName} ha respondido`,
        message: `El padre/tutor ${parentName} confirmó la recepción de la observación "${entry.title}". Nota: "${responseNote || 'Conforme'}"`,
        type: 'kardex',
        relatedId: kardexId,
        priority: 'normal',
      });

      return true;
    } catch (err) {
      console.error('[KardexService] Error al registrar acuse familiar:', err);
      return false;
    }
  },

  /**
   * Resolución administrativa de Dirección para una observación de Kárdex
   */
  async resolveByDirection(
    kardexId: string,
    directorUid: string,
    directorName: string,
    resolution: string
  ): Promise<boolean> {
    try {
      const ref = doc(db, 'kardex_records', kardexId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return false;
      const entry = snap.data() as KardexEntry;

      const nowIso = new Date().toISOString();
      await updateDoc(ref, {
        directionResolution: resolution,
        directionResolvedAt: nowIso,
        status: 'cerrado',
        updatedAt: nowIso,
      });

      // Notificar al profesor con código de color de DIRECCIÓN (Rojo)
      await notificationService.createNotification({
        recipientUid: entry.teacherUid,
        senderUid: directorUid,
        senderName: directorName,
        senderRole: 'director',
        title: `[Kárdex Resuelto por Dirección] ${entry.studentName} (${entry.courseCode})`,
        message: `Dirección emitió la siguiente resolución para "${entry.title}": ${resolution}`,
        type: 'kardex',
        relatedId: kardexId,
        priority: 'importante',
      });

      return true;
    } catch (err) {
      console.error('[KardexService] Error al resolver kárdex desde Dirección:', err);
      return false;
    }
  },
};
