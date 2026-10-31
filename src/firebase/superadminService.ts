import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { isAuthorizedDirectorOrAdmin, SigaeUser, SigaeRole, TeacherRecord, SchoolGroup, InternalMessage, SchoolConfig } from '../types';
import { sanitizeFirestoreData } from './authService';

export interface AuditLogEntry {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  category: 'usuarios' | 'profesores' | 'calificaciones' | 'asistencia' | 'cursos' | 'seguridad' | 'sistema';
  targetType: string;
  targetId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AccessRequest {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  requestedRole: SigaeRole;
  ci?: string;
  phone?: string;
  specialty?: string;
  studentName?: string;
  studentRude?: string;
  studentCi?: string;
  grade?: string;
  relationship?: string;
  matchedTeacherId?: string;
  status: 'pendiente' | 'aprobada' | 'rechazada' | 'suspendida';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export const superadminService = {
  // Check if current user is authorized Director
  isSuperAdmin(user: SigaeUser | null | undefined): boolean {
    return isAuthorizedDirectorOrAdmin(user);
  },
  isDirector(user: SigaeUser | null | undefined): boolean {
    return isAuthorizedDirectorOrAdmin(user);
  },

  // 1. Audit Logs (Trazabilidad y Seguridad)
  async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string> {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullEntry: AuditLogEntry = {
      ...entry,
      id,
      timestamp: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'audit_logs', id), fullEntry);
    } catch (err) {
      console.warn('[SIGAE SuperAdmin] Error persistiendo log de auditoría en Firestore:', err);
    }
    return id;
  },

  subscribeAuditLogs(callback: (logs: AuditLogEntry[]) => void, maxLimit = 50) {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(maxLimit));
    return onSnapshot(
      q,
      snapshot => {
        const list: AuditLogEntry[] = [];
        snapshot.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
        callback(list);
      },
      err => {
        console.warn('[SIGAE SuperAdmin] Audit listener notice:', err.message);
        callback([]);
      }
    );
  },

  // 2. All Users Management
  subscribeAllUsers(callback: (users: SigaeUser[]) => void) {
    return onSnapshot(
      collection(db, 'users'),
      snapshot => {
        const list: SigaeUser[] = [];
        snapshot.forEach(d => list.push({ uid: d.id, ...(d.data() as any) }));
        callback(list);
      },
      err => {
        console.warn('[SIGAE SuperAdmin] Users listener notice:', err.message);
        callback([]);
      }
    );
  },

  async updateUserRole(
    targetUid: string,
    newRole: SigaeRole,
    adminUser: SigaeUser
  ): Promise<void> {
    const userRef = doc(db, 'users', targetUid);
    const prevSnap = await getDoc(userRef);
    const prevRole = prevSnap.exists() ? (prevSnap.data() as SigaeUser).role : 'desconocido';

    await updateDoc(userRef, {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });

    await this.logAction({
      adminUid: adminUser.uid,
      adminEmail: adminUser.email,
      action: 'CAMBIO_DE_ROL',
      category: 'usuarios',
      targetType: 'user',
      targetId: targetUid,
      details: `Rol modificado de '${prevRole}' a '${newRole}' para UID ${targetUid}`,
    });
  },

  async setUserActiveStatus(
    targetUid: string,
    active: boolean,
    adminUser: SigaeUser,
    reason?: string
  ): Promise<void> {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      active,
      updatedAt: new Date().toISOString(),
    });

    await this.logAction({
      adminUid: adminUser.uid,
      adminEmail: adminUser.email,
      action: active ? 'ACTIVACION_DE_CUENTA' : 'SUSPENSION_DE_CUENTA',
      category: 'usuarios',
      targetType: 'user',
      targetId: targetUid,
      details: `${active ? 'Activada' : 'Suspendida'} cuenta de usuario UID ${targetUid}${reason ? `. Motivo: ${reason}` : ''}`,
    });
  },

  // 3. Access Requests Management
  subscribeAccessRequests(callback: (requests: AccessRequest[]) => void) {
    return onSnapshot(
      collection(db, 'access_requests'),
      snapshot => {
        const list: AccessRequest[] = [];
        snapshot.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
        callback(list);
      },
      err => {
        console.warn('[SIGAE SuperAdmin] Access requests notice:', err.message);
        callback([]);
      }
    );
  },

  async createAccessRequest(params: Omit<AccessRequest, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const id = `req-${Date.now()}`;
    const newReq: AccessRequest = {
      ...params,
      id,
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'access_requests', id), newReq);
    return id;
  },

  async resolveAccessRequest(
    requestId: string,
    decision: 'aprobada' | 'rechazada' | 'suspendida',
    adminUser: SigaeUser,
    reason?: string
  ): Promise<void> {
    const reqRef = doc(db, 'access_requests', requestId);
    const snap = await getDoc(reqRef);
    if (!snap.exists()) throw new Error('Solicitud no encontrada');
    const reqData = snap.data() as AccessRequest;

    const now = new Date().toISOString();
    await updateDoc(reqRef, sanitizeFirestoreData({
      status: decision,
      reviewedAt: now,
      reviewedBy: adminUser.email,
      rejectionReason: reason || null,
    }));

    if (decision === 'aprobada') {
      const userRef = doc(db, 'users', reqData.uid);
      const isParent = reqData.requestedRole === 'padre';
      const isTeacher = reqData.requestedRole === 'profesor';

      let resolvedTeacherId: string | undefined = reqData.matchedTeacherId;

      // Si es docente, sincronizar o crear expediente en /teachers
      if (isTeacher) {
        try {
          const cleanEmail = reqData.email.toLowerCase().trim();
          const cleanCiDigits = (reqData.ci || '').replace(/[^0-9]/g, '');
          const tSnap = await getDocs(collection(db, 'teachers'));
          let matchedTeacherDoc: any = null;

          for (const d of tSnap.docs) {
            const data = d.data();
            const existingDigits = (data.ci || '').replace(/[^0-9]/g, '');
            if (
              (data.email && data.email.toLowerCase() === cleanEmail) ||
              (cleanCiDigits && existingDigits === cleanCiDigits) ||
              (resolvedTeacherId && d.id === resolvedTeacherId)
            ) {
              matchedTeacherDoc = d;
              break;
            }
          }

          if (matchedTeacherDoc) {
            resolvedTeacherId = matchedTeacherDoc.id;
            await updateDoc(doc(db, 'teachers', matchedTeacherDoc.id), sanitizeFirestoreData({
              status: 'activo',
              authUid: reqData.uid,
              uid: reqData.uid,
              linkedAt: now,
              linkedEmail: cleanEmail,
              updatedAt: now,
            }));
          } else {
            // Si no existía ficha docente previa, crearla con estado activo
            const newTchId = resolvedTeacherId || `tch-${Date.now().toString().slice(-6)}`;
            resolvedTeacherId = newTchId;
            await setDoc(doc(db, 'teachers', newTchId), sanitizeFirestoreData({
              id: newTchId,
              teacherId: newTchId,
              fullName: reqData.displayName,
              email: reqData.email,
              ci: reqData.ci || '',
              phone: reqData.phone || '',
              specialty: reqData.specialty || 'Docente de Secundaria',
              assignedGrades: [],
              assignedSubjects: [reqData.specialty || 'Materia Asignada'],
              hourlyLoad: 80,
              status: 'activo',
              authUid: reqData.uid,
              uid: reqData.uid,
              linkedAt: now,
              linkedEmail: cleanEmail,
              createdAt: now,
              updatedAt: now,
            }));
          }
        } catch (tErr) {
          console.warn('[SIGAE] Aviso sincronizando /teachers en aprobación:', tErr);
        }
      }

      // Activar usuario en /users con todos los atributos institucionales
      const userUpdates: Record<string, any> = {
        active: true,
        role: reqData.requestedRole,
        approvalStatus: 'aprobada',
        updatedAt: now,
        ...(resolvedTeacherId ? { teacherId: resolvedTeacherId } : {}),
      };

      if (isParent) {
        userUpdates.hasApprovedChildLink = true;
        if (reqData.studentRude) {
          userUpdates.studentLinking = {
            studentName: reqData.studentName || 'Estudiante Tutelado',
            studentRude: reqData.studentRude,
            studentCi: reqData.studentCi || '',
            grade: reqData.grade || '',
            relationship: reqData.relationship || 'Tutor Legal',
            status: 'validada',
          };
        }
      }

      await updateDoc(userRef, sanitizeFirestoreData(userUpdates)).catch(async () => {
        // Si el doc no existía, crearlo
        await setDoc(userRef, sanitizeFirestoreData({
          uid: reqData.uid,
          email: reqData.email,
          displayName: reqData.displayName,
          role: reqData.requestedRole,
          active: true,
          approvalStatus: 'aprobada',
          hasApprovedChildLink: isParent,
          ci: reqData.ci || '',
          phone: reqData.phone || '',
          schoolSie: '80730142',
          createdAt: now,
          updatedAt: now,
          ...(resolvedTeacherId ? { teacherId: resolvedTeacherId } : {}),
          ...(reqData.specialty ? { specialty: reqData.specialty } : {}),
          ...(isParent && reqData.studentRude ? {
            studentLinking: {
              studentName: reqData.studentName || 'Estudiante Tutelado',
              studentRude: reqData.studentRude,
              studentCi: reqData.studentCi || '',
              grade: reqData.grade || '',
              relationship: reqData.relationship || 'Tutor Legal',
              status: 'validada',
            }
          } : {}),
        }));
      });
    } else if (decision === 'rechazada') {
      const userRef = doc(db, 'users', reqData.uid);
      await updateDoc(userRef, sanitizeFirestoreData({
        active: false,
        approvalStatus: 'rechazada',
        rejectionReason: reason || 'Solicitud no autorizada por Dirección Institucional.',
        updatedAt: now,
      })).catch(async () => {});
    }

    await this.logAction({
      adminUid: adminUser.uid,
      adminEmail: adminUser.email,
      action: `SOLICITUD_${decision.toUpperCase()}`,
      category: 'seguridad',
      targetType: 'access_request',
      targetId: requestId,
      details: `Solicitud de ${reqData.email} para rol '${reqData.requestedRole}' fue ${decision}${reason ? `. Motivo: ${reason}` : ''}`,
    });
  },

  // 4. Grades Super-Administration with Traceability
  async overrideGrade(
    courseId: string,
    studentId: string,
    newScore: number,
    adminUser: SigaeUser,
    justification: string
  ): Promise<void> {
    const gradeRef = doc(db, 'grades', courseId);
    const snap = await getDoc(gradeRef);
    if (!snap.exists()) {
      throw new Error('Libreta del curso no encontrada.');
    }

    const data = snap.data();
    const prevScore = data.scores?.[studentId] ?? null;

    await updateDoc(gradeRef, {
      [`scores.${studentId}`]: newScore,
      [`auditHistory.${studentId}`]: {
        modifiedBy: adminUser.email,
        adminUid: adminUser.uid,
        previousScore: prevScore,
        newScore,
        justification,
        modifiedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    await this.logAction({
      adminUid: adminUser.uid,
      adminEmail: adminUser.email,
      action: 'CALIFICACION_MODIFICADA',
      category: 'calificaciones',
      targetType: 'grades',
      targetId: `${courseId}:${studentId}`,
      details: `Calificación de estudiante ${studentId} cambiada de ${prevScore} a ${newScore}. Justificación: ${justification}`,
    });
  },

  // 5. Course & Group Management
  async deleteCourse(groupId: string, adminUser: SigaeUser): Promise<void> {
    await deleteDoc(doc(db, 'groups', groupId));
    await this.logAction({
      adminUid: adminUser.uid,
      adminEmail: adminUser.email,
      action: 'CURSO_ELIMINADO',
      category: 'cursos',
      targetType: 'group',
      targetId: groupId,
      details: `Curso o paralelo ${groupId} eliminado por Superadministrador.`,
    });
  },
};

export const directorAccessService = superadminService;
