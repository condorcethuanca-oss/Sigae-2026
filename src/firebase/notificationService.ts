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
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { NotificationItem, SigaeRole } from '../types';

export const notificationService = {
  /**
   * Crea una notificación interna individual en Firestore (/notifications)
   */
  async createNotification(
    data: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>
  ): Promise<NotificationItem> {
    try {
      const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newNotification: NotificationItem = {
        id: notifId,
        ...data,
        read: false,
        createdAt: new Date().toISOString(),
      };

      const ref = doc(db, 'notifications', notifId);
      await setDoc(ref, newNotification);
      return newNotification;
    } catch (err) {
      console.error('[NotificationService] Error al crear notificación:', err);
      throw err;
    }
  },

  /**
   * Crea notificaciones en lote para múltiples destinatarios
   */
  async createBatchNotifications(
    recipientUids: string[],
    data: Omit<NotificationItem, 'id' | 'createdAt' | 'read' | 'recipientUid'>
  ): Promise<number> {
    try {
      let created = 0;
      for (const uid of recipientUids) {
        if (!uid) continue;
        await this.createNotification({
          ...data,
          recipientUid: uid,
        });
        created++;
      }
      return created;
    } catch (err) {
      console.error('[NotificationService] Error al crear notificaciones en lote:', err);
      return 0;
    }
  },

  /**
   * Obtiene las notificaciones dirigidas al usuario autenticado
   */
  async getUserNotifications(recipientUid: string, maxItems = 40): Promise<NotificationItem[]> {
    if (!recipientUid) return [];
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientUid', '==', recipientUid),
        orderBy('createdAt', 'desc'),
        limit(maxItems)
      );

      const snap = await getDocs(q);
      const items: NotificationItem[] = [];
      snap.forEach(d => {
        items.push({ id: d.id, ...(d.data() as any) });
      });
      return items;
    } catch (err: any) {
      // Fallback si índice compuesto no está construido en Firestore
      try {
        const fallbackQ = query(
          collection(db, 'notifications'),
          where('recipientUid', '==', recipientUid)
        );
        const fallbackSnap = await getDocs(fallbackQ);
        const items: NotificationItem[] = [];
        fallbackSnap.forEach(d => {
          items.push({ id: d.id, ...(d.data() as any) });
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return items.slice(0, maxItems);
      } catch (innerErr) {
        console.error('[NotificationService] Fallback error al consultar notificaciones:', innerErr);
        return [];
      }
    }
  },

  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const ref = doc(db, 'notifications', notificationId);
      await updateDoc(ref, {
        read: true,
        readAt: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('[NotificationService] Error al marcar como leída:', err);
      return false;
    }
  },

  /**
   * Marca todas las notificaciones pendientes de un usuario como leídas
   */
  async markAllAsRead(recipientUid: string): Promise<number> {
    try {
      const unreadList = await this.getUserNotifications(recipientUid, 50);
      let updated = 0;
      for (const notif of unreadList) {
        if (!notif.read) {
          await this.markAsRead(notif.id);
          updated++;
        }
      }
      return updated;
    } catch (err) {
      console.error('[NotificationService] Error al marcar todas como leídas:', err);
      return 0;
    }
  },
};
