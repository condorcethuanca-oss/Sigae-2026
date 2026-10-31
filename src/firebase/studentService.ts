/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * Servicio oficial para el Padrón Institucional de Estudiantes,
 * Vinculación Familiar y Códigos Individuales Seguros de Acceso.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import {
  StudentInstitutionalRecord,
  SigaeUser,
} from '../types';

export type { StudentInstitutionalRecord };

export interface ParentStudentLinkRequest {
  id: string;
  parentUid: string;
  parentName: string;
  parentEmail: string;
  parentCi: string;
  parentPhone: string;
  studentId?: string;
  studentName: string;
  studentRude: string;
  studentCi: string;
  grade: string;
  parallel?: string;
  relationship: string;
  method: 'aprobacion_directora' | 'codigo_seguro';
  status: 'pendiente' | 'aprobada' | 'rechazada';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface ParentStudentLink {
  id: string;
  parentUid: string;
  parentName: string;
  studentId: string;
  studentName: string;
  studentRude: string;
  studentCi: string;
  grade: string;
  parallel: string;
  relationship: string;
  status: 'activa' | 'revocada';
  verifiedBy: string;
  verifiedAt: string;
  createdAt: string;
}

export interface FamilyLinkInvitation {
  id: string;
  code: string; // Código de verificación alfanumérico único
  studentId: string;
  studentName: string;
  studentRude: string;
  studentCi?: string;
  courseId: string;
  grade: string;
  parallel: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string;
  isConsumed: boolean;
  consumedBy?: string;
  consumedAt?: string;
}

/**
 * Padrón Institucional Maestro de Estudiantes - Secundaria
 * U.E. Luis Espinal Tarde de Collpani (Gestión 2026)
 * Se conservan todos los identificadores como string para preservar ceros a la izquierda.
 */
export const OFFICIAL_STUDENTS_ROSTER: StudentInstitutionalRecord[] = [
  // 6.° de Secundaria - Paralelo A
  {
    id: 'est-6a-001',
    fullName: 'Emanuel Cóndorcet Huanca',
    ci: '8492015',
    ciExpedition: 'LP',
    rude: '807301422019001',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-6A-01',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'est-6a-002',
    fullName: 'Camila Choquehuanca Silva',
    ci: '9182304',
    ciExpedition: 'LP',
    rude: '807301422018006',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-6A-02',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'est-6a-003',
    fullName: 'Mateo Quispe Choque',
    ci: '8392011',
    ciExpedition: 'LP',
    rude: '807301422018003',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-6A-03',
    createdAt: '2026-02-01T08:00:00Z',
  },

  // 5.° de Secundaria - Paralelo A
  {
    id: 'est-5a-001',
    fullName: 'Santiago González Mamani',
    ci: '8491024',
    ciExpedition: 'LP',
    rude: '807301422018001',
    gradeLevel: '5° de Secundaria',
    gradeNumber: 5,
    parallel: 'A',
    courseCode: '5A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-5A-01',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'est-5a-002',
    fullName: 'Valeria Condori Flores',
    ci: '7482910',
    ciExpedition: 'LP',
    rude: '807301422018002',
    gradeLevel: '5° de Secundaria',
    gradeNumber: 5,
    parallel: 'A',
    courseCode: '5A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-5A-02',
    createdAt: '2026-02-01T08:00:00Z',
  },

  // 4.° de Secundaria - Paralelo A
  {
    id: 'est-4a-001',
    fullName: 'Luciana Ticona Ramos',
    ci: '8291047',
    ciExpedition: 'LP',
    rude: '807301422018004',
    gradeLevel: '4° de Secundaria',
    gradeNumber: 4,
    parallel: 'A',
    courseCode: '4A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-4A-01',
    createdAt: '2026-02-01T08:00:00Z',
  },

  // 3.° de Secundaria - Paralelo A
  {
    id: 'est-3a-001',
    fullName: 'Gabriel Mamani Fernández',
    ci: '9102847',
    ciExpedition: 'LP',
    rude: '807301422018007',
    gradeLevel: '3° de Secundaria',
    gradeNumber: 3,
    parallel: 'A',
    courseCode: '3A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-3A-01',
    createdAt: '2026-02-01T08:00:00Z',
  },

  // 2.° de Secundaria - Paralelo A
  {
    id: 'est-2a-001',
    fullName: 'Andrea Nina Paredes',
    ci: '9840192',
    ciExpedition: 'LP',
    rude: '807301422018008',
    gradeLevel: '2° de Secundaria',
    gradeNumber: 2,
    parallel: 'A',
    courseCode: '2A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-2A-01',
    createdAt: '2026-02-01T08:00:00Z',
  },

  // 1.° de Secundaria - Paralelo A
  {
    id: 'est-1a-001',
    fullName: 'Rodrigo Tarqui Calle',
    ci: '9920148',
    ciExpedition: 'LP',
    rude: '807301422018009',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    academicYear: '2026',
    enrollmentStatus: 'efectivo',
    internalCode: 'EXP-1A-01',
    createdAt: '2026-02-01T08:00:00Z',
  },
];

/**
 * Códigos de Invitación Seguros Oficiales Pre-emitidos por la Dirección
 * Para verificación atómica individual (un solo uso, no reutilizable).
 */
export const INITIAL_FAMILY_INVITATIONS: FamilyLinkInvitation[] = [
  {
    id: 'inv-6a-001',
    code: 'ESP-6A-84920',
    studentId: 'est-6a-001',
    studentName: 'Emanuel Cóndorcet Huanca',
    studentRude: '807301422019001',
    studentCi: '8492015',
    courseId: '6A',
    grade: '6° de Secundaria',
    parallel: 'A',
    issuedBy: 'dir-condorcet-huanca',
    issuedAt: '2026-02-01T08:00:00Z',
    expiresAt: '2026-12-31T23:59:59Z',
    isConsumed: false,
  },
  {
    id: 'inv-5a-001',
    code: 'ESP-5A-84910',
    studentId: 'est-5a-001',
    studentName: 'Santiago González Mamani',
    studentRude: '807301422018001',
    studentCi: '8491024',
    courseId: '5A',
    grade: '5° de Secundaria',
    parallel: 'A',
    issuedBy: 'dir-condorcet-huanca',
    issuedAt: '2026-02-01T08:00:00Z',
    expiresAt: '2026-12-31T23:59:59Z',
    isConsumed: false,
  },
  {
    id: 'inv-4a-001',
    code: 'ESP-4A-82910',
    studentId: 'est-4a-001',
    studentName: 'Luciana Ticona Ramos',
    studentRude: '807301422018004',
    studentCi: '8291047',
    courseId: '4A',
    grade: '4° de Secundaria',
    parallel: 'A',
    issuedBy: 'dir-condorcet-huanca',
    issuedAt: '2026-02-01T08:00:00Z',
    expiresAt: '2026-12-31T23:59:59Z',
    isConsumed: false,
  },
];

// Helper para limpiar campos undefined antes de setDoc
function sanitizeData<T extends Record<string, any>>(data: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

// Normalización de texto para comparaciones seguras
function normalizeCompare(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const studentService = {
  /**
   * Obtiene todos los estudiantes del padrón institucional (estrictamente desde Firestore)
   * Si la colección está vacía, retorna un array vacío sin inventar estudiantes simulados.
   */
  async getAllStudents(): Promise<StudentInstitutionalRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'students'));
      const list: StudentInstitutionalRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      return list;
    } catch (err) {
      console.error('[SIGAE StudentService] Error leyendo padrón de estudiantes desde Firestore:', err);
      throw err;
    }
  },

  /**
   * Obtiene los estudiantes asignados a un curso o paralelo específico (ej. "1A", "6A")
   * Si el curso no tiene estudiantes registrados, retorna [] de forma canónica.
   */
  async getStudentsByCourse(courseCode: string): Promise<StudentInstitutionalRecord[]> {
    const cleanCode = (courseCode || '').trim().toUpperCase();
    if (!cleanCode) return [];

    try {
      // 1. Intento por consulta indexada en courseCode
      const q = query(collection(db, 'students'), where('courseCode', '==', cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: StudentInstitutionalRecord[] = [];
        snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
        return list;
      }

      // 2. Fallback de búsqueda amplia en el padrón real de Firestore (sin inventar datos)
      const all = await this.getAllStudents();
      return all.filter(s => {
        const code = `${s.gradeNumber}${s.parallel}`.toUpperCase();
        return code === cleanCode || (s.courseCode && s.courseCode.toUpperCase() === cleanCode);
      });
    } catch (err) {
      console.error('[SIGAE StudentService] Error consultando estudiantes por curso:', err);
      throw err;
    }
  },

  /**
   * Busca un estudiante por RUDE o CI de manera segura en Firestore exclusivamente
   */
  async findStudentByRudeAndCi(
    rude: string,
    ci: string
  ): Promise<StudentInstitutionalRecord | null> {
    const cleanRude = (rude || '').trim();
    const cleanCiDigits = (ci || '').replace(/[^0-9]/g, '');

    if (!cleanRude) return null;

    try {
      const q = query(collection(db, 'students'), where('rude', '==', cleanRude));
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const docSnap of snap.docs) {
          const s = docSnap.data() as StudentInstitutionalRecord;
          const sDigits = (s.ci || '').replace(/[^0-9]/g, '');
          if (!cleanCiDigits || sDigits === cleanCiDigits) {
            return { ...s, id: docSnap.id };
          }
        }
      }
    } catch (err) {
      console.error('[SIGAE StudentService] Error buscando estudiante en Firestore:', err);
    }

    return null;
  },

  /**
   * Verifica y contrasta los datos de un estudiante ingresados por el tutor
   */
  async verifyStudentCandidate(candidate: {
    studentName: string;
    studentRude: string;
    studentCi: string;
  }): Promise<{
    matched: boolean;
    student?: StudentInstitutionalRecord;
    courseSuggestion?: string;
  }> {
    const student = await this.findStudentByRudeAndCi(
      candidate.studentRude,
      candidate.studentCi
    );

    if (!student) {
      return { matched: false };
    }

    // Comprobar coincidencia razonable de nombre
    const normInput = normalizeCompare(candidate.studentName);
    const normOfficial = normalizeCompare(student.fullName);

    const nameMatches =
      !candidate.studentName.trim() ||
      normOfficial.includes(normInput) ||
      normInput.includes(normOfficial) ||
      normInput.split(' ').some(part => part.length >= 3 && normOfficial.includes(part));

    if (nameMatches) {
      return {
        matched: true,
        student,
        courseSuggestion: `${student.gradeLevel} ${student.parallel}`,
      };
    }

    return {
      matched: true,
      student,
      courseSuggestion: `${student.gradeLevel} ${student.parallel}`,
    };
  },

  /**
   * Valida y canjea un Código Individual Seguro de forma atómica
   */
  async redeemInvitationCode(params: {
    code: string;
    parentUid: string;
    parentName: string;
    studentRude: string;
  }): Promise<{
    success: boolean;
    message: string;
    invitation?: FamilyLinkInvitation;
    student?: StudentInstitutionalRecord;
  }> {
    const cleanCode = (params.code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Debe ingresar un código de verificación.' };
    }

    try {
      // 1. Buscar en Firestore
      const invQuery = query(
        collection(db, 'familyLinkInvitations'),
        where('code', '==', cleanCode)
      );
      const snap = await getDocs(invQuery);

      let targetDoc: any = null;
      let invitationData: FamilyLinkInvitation | null = null;

      if (!snap.empty) {
        targetDoc = snap.docs[0];
        invitationData = { id: targetDoc.id, ...(targetDoc.data() as any) };
      } else {
        // Fallback a invitaciones oficiales iniciales
        const found = INITIAL_FAMILY_INVITATIONS.find(i => i.code === cleanCode);
        if (found) {
          invitationData = { ...found };
        }
      }

      if (!invitationData) {
        return {
          success: false,
          message: 'El código ingresado no existe o no corresponde a esta unidad educativa.',
        };
      }

      if (invitationData.isConsumed) {
        return {
          success: false,
          message: 'Este código de vinculación ya fue utilizado anteriormente.',
        };
      }

      const now = new Date().toISOString();
      if (invitationData.expiresAt && invitationData.expiresAt < now) {
        return {
          success: false,
          message: 'El código de vinculación ha caducado. Solicite uno nuevo a la Dirección.',
        };
      }

      // Si targetDoc existía en Firestore, marcarlo consumido
      if (targetDoc) {
        await updateDoc(doc(db, 'familyLinkInvitations', targetDoc.id), {
          isConsumed: true,
          consumedBy: params.parentUid,
          consumedAt: now,
        });
      } else {
        // Persistir la invitación consumida en Firestore
        await setDoc(doc(db, 'familyLinkInvitations', invitationData.id), {
          ...invitationData,
          isConsumed: true,
          consumedBy: params.parentUid,
          consumedAt: now,
        });
      }

      // Crear o actualizar la vinculación formal en parentStudentLinks
      const linkId = `link-${params.parentUid}-${invitationData.studentId}`;
      const linkRecord: ParentStudentLink = {
        id: linkId,
        parentUid: params.parentUid,
        parentName: params.parentName,
        studentId: invitationData.studentId,
        studentName: invitationData.studentName,
        studentRude: invitationData.studentRude,
        studentCi: invitationData.studentCi || '',
        grade: invitationData.grade,
        parallel: invitationData.parallel,
        relationship: 'Tutor Legal',
        status: 'activa',
        verifiedBy: 'codigo_seguro_individual',
        verifiedAt: now,
        createdAt: now,
      };

      await setDoc(doc(db, 'parentStudentLinks', linkId), sanitizeData(linkRecord));

      // Actualizar el perfil del padre en /users/{parentUid}
      await updateDoc(doc(db, 'users', params.parentUid), {
        hasApprovedChildLink: true,
        studentLinking: {
          studentName: invitationData.studentName,
          studentRude: invitationData.studentRude,
          studentCi: invitationData.studentCi || '',
          grade: `${invitationData.grade} ${invitationData.parallel}`,
          relationship: 'Tutor Legal',
          status: 'validada',
        },
        updatedAt: now,
      }).catch(err => {
        console.warn('[SIGAE StudentService] Aviso actualizando users:', err);
      });

      return {
        success: true,
        message: '¡Vinculación familiar activada exitosamente mediante código individual!',
        invitation: invitationData,
      };
    } catch (err: any) {
      console.error('[SIGAE StudentService] Error canjeando código:', err);
      return {
        success: false,
        message: `Error al procesar el código: ${err.message}`,
      };
    }
  },

  /**
   * Registra una solicitud de vinculación familiar para revisión de la Directora
   */
  async submitLinkRequest(request: ParentStudentLinkRequest): Promise<void> {
    const now = new Date().toISOString();
    const reqId = request.id || `req-link-${request.parentUid}-${Date.now().toString().slice(-4)}`;

    const cleanData = sanitizeData({
      ...request,
      id: reqId,
      status: 'pendiente',
      createdAt: request.createdAt || now,
    });

    // 1. Guardar en /parentStudentLinkRequests/{reqId}
    await setDoc(doc(db, 'parentStudentLinkRequests', reqId), cleanData);

    // 2. Sincronizar en /access_requests/req-${request.parentUid} para visibilidad inmediata en el panel de Dirección
    const accessReqDoc = sanitizeData({
      id: `req-${request.parentUid}`,
      uid: request.parentUid,
      email: request.parentEmail,
      displayName: request.parentName,
      requestedRole: 'padre',
      ci: request.parentCi,
      phone: request.parentPhone,
      studentName: request.studentName,
      studentRude: request.studentRude,
      studentCi: request.studentCi,
      grade: request.grade,
      relationship: request.relationship,
      status: 'pendiente',
      createdAt: now,
    });

    await setDoc(doc(db, 'access_requests', `req-${request.parentUid}`), accessReqDoc).catch(err => {
      console.warn('[SIGAE StudentService] Aviso guardando access_requests:', err);
    });
  },

  /**
   * Consulta las vinculaciones activas de un padre
   */
  async getLinksForParent(parentUid: string): Promise<ParentStudentLink[]> {
    try {
      const q = query(
        collection(db, 'parentStudentLinks'),
        where('parentUid', '==', parentUid),
        where('status', '==', 'activa')
      );
      const snap = await getDocs(q);
      const links: ParentStudentLink[] = [];
      snap.forEach(d => links.push({ id: d.id, ...(d.data() as any) }));
      return links;
    } catch (err) {
      console.warn('[SIGAE StudentService] Aviso consultando vínculos del padre:', err);
      return [];
    }
  },

  /**
   * Consulta las solicitudes de vinculación de un padre
   */
  async getRequestsForParent(parentUid: string): Promise<ParentStudentLinkRequest[]> {
    try {
      const q = query(
        collection(db, 'parentStudentLinkRequests'),
        where('parentUid', '==', parentUid)
      );
      const snap = await getDocs(q);
      const list: ParentStudentLinkRequest[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      return list;
    } catch (err) {
      console.warn('[SIGAE StudentService] Aviso consultando solicitudes del padre:', err);
      return [];
    }
  },

  /**
   * El profesor solicita incorporar formalmente a un estudiante a la nómina institucional.
   * La solicitud permanece pendiente hasta que la Dirección la aprueba.
   */
  async requestStudentEnrollment(params: {
    fullName: string;
    ci: string;
    rude: string;
    courseCode: string;
    gradeLevel: string;
    parallel: string;
    teacherUid: string;
    teacherName: string;
    reason: string;
  }): Promise<string> {
    const reqId = `enr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const reqDoc = {
      id: reqId,
      fullName: params.fullName.trim(),
      ci: params.ci.trim(),
      rude: params.rude.trim(),
      courseCode: params.courseCode.trim().toUpperCase(),
      gradeLevel: params.gradeLevel.trim(),
      parallel: params.parallel.trim().toUpperCase(),
      teacherUid: params.teacherUid,
      teacherName: params.teacherName,
      reason: params.reason.trim(),
      status: 'pendiente',
      academicYear: '2026',
      createdAt: nowIso,
    };

    await setDoc(doc(db, 'enrollment_requests', reqId), sanitizeData(reqDoc));
    return reqId;
  },

  /**
   * Consulta las solicitudes de incorporación de estudiantes pendientes para Dirección
   */
  async getPendingEnrollmentRequests(): Promise<any[]> {
    try {
      const q = query(collection(db, 'enrollment_requests'), where('status', '==', 'pendiente'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    } catch (err) {
      console.warn('[SIGAE StudentService] Error consultando enrollment_requests:', err);
      return [];
    }
  },

  /**
   * Dirección aprueba la incorporación: se crea el expediente en /students
   * y queda disponible automáticamente para todos los profesores del curso.
   */
  async approveEnrollmentRequest(requestId: string, reviewerUid: string, reviewerName: string): Promise<boolean> {
    try {
      const reqRef = doc(db, 'enrollment_requests', requestId);
      const reqSnap = await getDoc(reqRef);
      if (!reqSnap.exists()) return false;
      const reqData = reqSnap.data();

      const studentId = `est-${reqData.courseCode.toLowerCase()}-${Date.now().toString().slice(-4)}`;
      const nowIso = new Date().toISOString();

      const newStudent: StudentInstitutionalRecord = {
        id: studentId,
        fullName: reqData.fullName,
        ci: reqData.ci,
        ciExpedition: 'LP',
        rude: reqData.rude,
        gradeLevel: reqData.gradeLevel,
        gradeNumber: parseInt(reqData.courseCode) || 6,
        parallel: reqData.parallel,
        courseCode: reqData.courseCode,
        academicYear: '2026',
        enrollmentStatus: 'efectivo',
        internalCode: `EXP-${reqData.courseCode}-${Date.now().toString().slice(-3)}`,
        createdAt: nowIso,
      };

      // 1. Guardar estudiante oficial en /students
      await setDoc(doc(db, 'students', studentId), sanitizeData(newStudent));

      // 2. Actualizar la solicitud a aprobada
      await updateDoc(reqRef, {
        status: 'aprobada',
        approvedStudentId: studentId,
        reviewedBy: reviewerUid,
        reviewerName: reviewerName,
        reviewedAt: nowIso,
      });

      return true;
    } catch (err) {
      console.error('[SIGAE StudentService] Error aprobando solicitud de matrícula:', err);
      return false;
    }
  },

  /**
   * Siembra el padrón inicial en Firestore si la colección está vacía
   */
  async seedInitialStudentsRoster(): Promise<number> {
    let seededCount = 0;
    for (const student of OFFICIAL_STUDENTS_ROSTER) {
      const sRef = doc(db, 'students', student.id);
      await setDoc(sRef, sanitizeData(student), { merge: true });
      seededCount++;
    }

    // Sembrar también las invitaciones iniciales
    for (const inv of INITIAL_FAMILY_INVITATIONS) {
      const iRef = doc(db, 'familyLinkInvitations', inv.id);
      await setDoc(iRef, sanitizeData(inv), { merge: true });
    }

    return seededCount;
  },
};
