/**
 * SIGAE — Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142) · Gestión 2026
 *
 * Servicio oficial para el Cuaderno Pedagógico Digital (Resolución Ministerial 001/2026 - Ley 070),
 * Motor Centralizado de Cálculos de Calificaciones, Generación Oficial de Excel XLSX (9 Hojas),
 * y Entregas Digitales Formales a Dirección con Trazabilidad y Aprobación Institucional.
 */

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
import * as XLSX from 'xlsx';
import { db } from './config';
import {
  StudentInstitutionalRecord,
  AttendanceSession,
  ScheduleBlock,
} from '../types';
import { notificationService } from './notificationService';

export type TrimesterKey = '1T' | '2T' | '3T';
export type EvaluativeDimension = 'Saber' | 'Hacer' | 'Ser y Decidir' | 'Autoevaluacion';

export const DIMENSION_LIMITS: Record<EvaluativeDimension, number> = {
  'Saber': 35,
  'Hacer': 35,
  'Ser y Decidir': 20,
  'Autoevaluacion': 10,
};

export interface EvaluationActivity {
  id: string;
  name: string;
  date: string;
  dimension: EvaluativeDimension;
  maxScore: number;
  description?: string;
  trimester: TrimesterKey;
  courseCode: string;
  gradeLevel: string;
  parallel: string;
  subject: string;
  teacherUid: string;
  teacherName: string;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentScoreRecord {
  id: string; // `scr-${activityId}-${studentId}`
  activityId: string;
  studentId: string;
  studentName: string;
  score: number;
  courseCode: string;
  subject: string;
  trimester: TrimesterKey;
  teacherUid: string;
  updatedAt: string;
}

export type SubmissionStatus =
  | 'borrador'
  | 'enviado'
  | 'en_revision'
  | 'observado'
  | 'aprobado';

export interface AcademicSubmission {
  id: string;
  teacherUid: string;
  teacherName: string;
  teacherEmail?: string;
  courseCode: string;
  gradeLevel: string;
  parallel: string;
  subject: string;
  trimester: TrimesterKey | 'anual';
  academicYear: string;
  documentType:
    | 'cuaderno_completo'
    | 'calificaciones_trimestre'
    | 'asistencia_trimestre'
    | 'nomina';
  version: number;
  status: SubmissionStatus;
  isPublishedToParents: boolean;
  publishedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reviewObservations?: string;
  createdAt: string;
  updatedAt: string;
  totalStudents: number;
  activitiesCount: number;
}

export interface TrimesterCalculatedResult {
  studentId: string;
  studentName: string;
  rude: string;
  ci: string;
  saberAverage: number | null;
  hacerAverage: number | null;
  serDecidirAverage: number | null;
  autoevaluacionScore: number | null;
  trimesterFinalScore: number | null;
  isPassing: boolean;
}

export interface AnnualCalculatedResult {
  studentId: string;
  studentName: string;
  rude: string;
  score1T: number | null;
  score2T: number | null;
  score3T: number | null;
  annualAverage: number | null;
  finalStatus: 'PROMOVIDO' | 'RETENIDO' | 'EN_CURSO';
}

export const cuadernoPedagogicoService = {
  // -------------------------------------------------------------------------
  // 1. ACTIVIDADES EVALUATIVAS (FIRESTORE: /evaluation_activities)
  // -------------------------------------------------------------------------
  async getActivities(
    courseCode: string,
    subject: string,
    trimester: TrimesterKey
  ): Promise<EvaluationActivity[]> {
    try {
      const cleanCourse = (courseCode || '').trim().toUpperCase();
      const q = query(
        collection(db, 'evaluation_activities'),
        where('courseCode', '==', cleanCourse),
        where('subject', '==', subject.trim()),
        where('trimester', '==', trimester)
      );
      const snap = await getDocs(q);
      const list: EvaluationActivity[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return list;
    } catch (err) {
      console.warn('[CuadernoService] Error consultando actividades:', err);
      return [];
    }
  },

  async createActivity(
    activity: Omit<EvaluationActivity, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EvaluationActivity> {
    const actId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const newActivity: EvaluationActivity = {
      ...activity,
      id: actId,
      academicYear: activity.academicYear || '2026',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'evaluation_activities', actId), newActivity);
    return newActivity;
  },

  // -------------------------------------------------------------------------
  // 2. CALIFICACIONES POR ESTUDIANTE (FIRESTORE: /student_scores)
  // -------------------------------------------------------------------------
  async getScoresByActivity(activityId: string): Promise<Record<string, number>> {
    try {
      const q = query(
        collection(db, 'student_scores'),
        where('activityId', '==', activityId)
      );
      const snap = await getDocs(q);
      const scoresMap: Record<string, number> = {};
      snap.forEach(d => {
        const data = d.data() as StudentScoreRecord;
        if (data.studentId !== undefined && data.score !== undefined) {
          scoresMap[data.studentId] = data.score;
        }
      });
      return scoresMap;
    } catch (err) {
      console.warn('[CuadernoService] Error consultando notas de actividad:', err);
      return {};
    }
  },

  async saveStudentScore(params: {
    activityId: string;
    studentId: string;
    studentName: string;
    score: number;
    courseCode: string;
    subject: string;
    trimester: TrimesterKey;
    teacherUid: string;
  }): Promise<void> {
    const scoreId = `scr-${params.activityId}-${params.studentId}`;
    const nowIso = new Date().toISOString();
    const record: StudentScoreRecord = {
      id: scoreId,
      activityId: params.activityId,
      studentId: params.studentId,
      studentName: params.studentName,
      score: Math.max(0, Number(params.score)),
      courseCode: params.courseCode.toUpperCase(),
      subject: params.subject,
      trimester: params.trimester,
      teacherUid: params.teacherUid,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'student_scores', scoreId), record, { merge: true });
  },

  // -------------------------------------------------------------------------
  // 3. MOTOR CENTRALIZADO DE CÁLCULO EVALUATIVO (LEY 070 RM 001/2026)
  // -------------------------------------------------------------------------
  calculateTrimesterConsolidated(
    students: StudentInstitutionalRecord[],
    activities: EvaluationActivity[],
    allScores: Record<string, Record<string, number>> // activityId -> studentId -> score
  ): TrimesterCalculatedResult[] {
    return students.map(student => {
      // 1. Agrupar notas por dimensión
      const dimScores: Record<EvaluativeDimension, number[]> = {
        'Saber': [],
        'Hacer': [],
        'Ser y Decidir': [],
        'Autoevaluacion': [],
      };

      activities.forEach(act => {
        const actScores = allScores[act.id] || {};
        const score = actScores[student.id];
        if (score !== undefined && score !== null && !isNaN(score)) {
          // Normalizar el puntaje al porcentaje o valor de la dimensión si difiere
          dimScores[act.dimension].push(score);
        }
      });

      // 2. Promediar cada dimensión (conservando null si no hay actividades)
      const avgOrNull = (arr: number[]): number | null => {
        if (arr.length === 0) return null;
        const sum = arr.reduce((acc, v) => acc + v, 0);
        return Math.round((sum / arr.length) * 10) / 10;
      };

      const saber = avgOrNull(dimScores['Saber']);
      const hacer = avgOrNull(dimScores['Hacer']);
      const serDecidir = avgOrNull(dimScores['Ser y Decidir']);
      const autoeval = avgOrNull(dimScores['Autoevaluacion']);

      // 3. Calcular la nota final trimestral sobre 100 puntos
      let finalScore: number | null = null;
      const components = [saber, hacer, serDecidir, autoeval].filter(c => c !== null) as number[];
      if (components.length > 0) {
        finalScore = Math.round(
          (saber || 0) + (hacer || 0) + (serDecidir || 0) + (autoeval || 0)
        );
        finalScore = Math.min(100, Math.max(0, finalScore));
      }

      return {
        studentId: student.id,
        studentName: student.fullName,
        rude: student.rude,
        ci: student.ci || '',
        saberAverage: saber,
        hacerAverage: hacer,
        serDecidirAverage: serDecidir,
        autoevaluacionScore: autoeval,
        trimesterFinalScore: finalScore,
        isPassing: (finalScore || 0) >= 51,
      };
    });
  },

  calculateAnnualConsolidated(
    students: StudentInstitutionalRecord[],
    trimesterScores: {
      '1T': Record<string, number | null>;
      '2T': Record<string, number | null>;
      '3T': Record<string, number | null>;
    }
  ): AnnualCalculatedResult[] {
    return students.map(student => {
      const s1 = trimesterScores['1T'][student.id];
      const s2 = trimesterScores['2T'][student.id];
      const s3 = trimesterScores['3T'][student.id];

      const valid = [s1, s2, s3].filter(s => s !== undefined && s !== null) as number[];
      let annualAvg: number | null = null;
      let status: 'PROMOVIDO' | 'RETENIDO' | 'EN_CURSO' = 'EN_CURSO';

      if (valid.length > 0) {
        const sum = valid.reduce((acc, v) => acc + v, 0);
        annualAvg = Math.round(sum / valid.length);
        if (valid.length === 3) {
          status = annualAvg >= 51 ? 'PROMOVIDO' : 'RETENIDO';
        }
      }

      return {
        studentId: student.id,
        studentName: student.fullName,
        rude: student.rude,
        score1T: s1 ?? null,
        score2T: s2 ?? null,
        score3T: s3 ?? null,
        annualAverage: annualAvg,
        finalStatus: status,
      };
    });
  },

  // -------------------------------------------------------------------------
  // 4. ENTREGAS DIGITALES A DIRECCIÓN (FIRESTORE: /academic_submissions)
  // -------------------------------------------------------------------------
  async submitCuadernoToDirection(params: {
    teacherUid: string;
    teacherName: string;
    teacherEmail?: string;
    courseCode: string;
    gradeLevel: string;
    parallel: string;
    subject: string;
    trimester: TrimesterKey | 'anual';
    documentType: 'cuaderno_completo' | 'calificaciones_trimestre' | 'asistencia_trimestre' | 'nomina';
    totalStudents: number;
    activitiesCount: number;
  }): Promise<string> {
    const subId = `sub-${Date.now()}-${params.courseCode}-${params.trimester}`;
    const nowIso = new Date().toISOString();

    const submission: AcademicSubmission = {
      id: subId,
      teacherUid: params.teacherUid,
      teacherName: params.teacherName,
      teacherEmail: params.teacherEmail,
      courseCode: params.courseCode.toUpperCase(),
      gradeLevel: params.gradeLevel,
      parallel: params.parallel,
      subject: params.subject,
      trimester: params.trimester,
      academicYear: '2026',
      documentType: params.documentType,
      version: 1,
      status: 'enviado',
      isPublishedToParents: false,
      totalStudents: params.totalStudents,
      activitiesCount: params.activitiesCount,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'academic_submissions', subId), submission);

    // Notificar a Dirección
    await notificationService.createNotification({
      recipientUid: '0zHkg7u1XsaJ15EiXtVNzY8qTWt2', // Director autorizado
      senderUid: params.teacherUid,
      senderName: params.teacherName,
      senderRole: 'profesor',
      title: `[Entrega Digital] Cuaderno Pedagógico ${params.courseCode} · ${params.subject}`,
      message: `El profesor ${params.teacherName} presentó oficialmente el ${params.documentType.replace('_', ' ')} del ${params.trimester} (${params.courseCode} - ${params.subject}) para revisión y aprobación institucional.`,
      type: 'comunicado',
      relatedId: subId,
      priority: 'importante',
    }).catch(e => console.warn('[CuadernoService] Error notificando a dirección:', e));

    return subId;
  },

  async getSubmissionsByTeacher(teacherUid: string): Promise<AcademicSubmission[]> {
    try {
      const q = query(
        collection(db, 'academic_submissions'),
        where('teacherUid', '==', teacherUid)
      );
      const snap = await getDocs(q);
      const list: AcademicSubmission[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.warn('[CuadernoService] Error consultando entregas del profesor:', err);
      return [];
    }
  },

  async getAllSubmissions(): Promise<AcademicSubmission[]> {
    try {
      const snap = await getDocs(collection(db, 'academic_submissions'));
      const list: AcademicSubmission[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.warn('[CuadernoService] Error consultando todas las entregas para dirección:', err);
      return [];
    }
  },

  async reviewSubmissionByDirection(params: {
    submissionId: string;
    decision: 'aprobado' | 'observado';
    reviewerUid: string;
    reviewerName: string;
    observations?: string;
  }): Promise<boolean> {
    try {
      const subRef = doc(db, 'academic_submissions', params.submissionId);
      const snap = await getDoc(subRef);
      if (!snap.exists()) return false;
      const subData = snap.data() as AcademicSubmission;

      const nowIso = new Date().toISOString();
      await updateDoc(subRef, {
        status: params.decision,
        reviewedBy: params.reviewerUid,
        reviewerName: params.reviewerName,
        reviewObservations: params.observations || '',
        reviewedAt: nowIso,
        updatedAt: nowIso,
      });

      // Notificar al profesor emisor
      await notificationService.createNotification({
        recipientUid: subData.teacherUid,
        senderUid: params.reviewerUid,
        senderName: params.reviewerName,
        senderRole: 'director',
        title: `[Revisión de Dirección] Entrega ${subData.courseCode} ${subData.subject}: ${params.decision.toUpperCase()}`,
        message: params.decision === 'aprobado'
          ? `Su entrega de ${subData.documentType} (${subData.trimester}) ha sido aprobada por Dirección.`
          : `Su entrega de ${subData.documentType} ha sido observada: "${params.observations || 'Requiere corrección'}". Ingrese a SIGAE para revisar.`,
        type: 'comunicado',
        relatedId: params.submissionId,
        priority: params.decision === 'aprobado' ? 'normal' : 'urgente',
      });

      return true;
    } catch (err) {
      console.error('[CuadernoService] Error revisando entrega:', err);
      return false;
    }
  },

  async publishGradesToFamilies(submissionId: string, directorUid: string, directorName: string): Promise<boolean> {
    try {
      const subRef = doc(db, 'academic_submissions', submissionId);
      const snap = await getDoc(subRef);
      if (!snap.exists()) return false;
      const subData = snap.data() as AcademicSubmission;

      const nowIso = new Date().toISOString();
      await updateDoc(subRef, {
        isPublishedToParents: true,
        publishedAt: nowIso,
        updatedAt: nowIso,
      });

      // Avisar a los padres del curso
      await notificationService.createNotification({
        recipientUid: 'all_parents_course',
        senderUid: directorUid,
        senderName: directorName,
        senderRole: 'director',
        title: `[Boletín Publicado] Nuevas Calificaciones de ${subData.subject} (${subData.courseCode})`,
        message: `Se han publicado oficialmente los resultados de ${subData.subject} correspondientes al ${subData.trimester} para el curso ${subData.courseCode}. Ingrese a su portal para ver la boleta de su hijo.`,
        type: 'boletin',
        relatedId: submissionId,
        priority: 'importante',
      });

      return true;
    } catch (err) {
      console.error('[CuadernoService] Error publicando calificaciones a familias:', err);
      return false;
    }
  },

  async getPublishedSubmissions(courseCode?: string): Promise<AcademicSubmission[]> {
    try {
      const all = await this.getAllSubmissions();
      return all.filter(s => s.isPublishedToParents === true && (!courseCode || s.courseCode === courseCode));
    } catch (err) {
      console.warn('[CuadernoService] Error consultando entregas publicadas:', err);
      return [];
    }
  },

  // -------------------------------------------------------------------------
  // 5. GENERADOR OFICIAL DE EXCEL XLSX (9 HOJAS INSTITUCIONALES)
  // -------------------------------------------------------------------------
  generateCuadernoXLSX(params: {
    institutionName?: string;
    sie?: string;
    academicYear?: string;
    teacherName: string;
    directorName?: string;
    courseCode: string;
    gradeLevel: string;
    parallel: string;
    subject: string;
    students: StudentInstitutionalRecord[];
    activities1T: EvaluationActivity[];
    scores1T: Record<string, Record<string, number>>; // actId -> studentId -> score
    attendanceSessions?: AttendanceSession[];
  }): { blob: Blob; fileName: string } {
    const institution = params.institutionName || 'U.E. LUIS ESPINAL TARDE DE COLLPANI';
    const sie = params.sie || '80730142';
    const year = params.academicYear || '2026';
    const director = params.directorName || 'Lic. Gonzalo Fernández Mamani / Emanuel Cóndorcet Huanca';

    const wb = XLSX.utils.book_new();

    // -------------------------------------------------------------
    // HOJA 1: Car (Carátula)
    // -------------------------------------------------------------
    const carData = [
      ['MINISTERIO DE EDUCACIÓN DEL ESTADO PLURINACIONAL DE BOLIVIA'],
      ['VICEMINISTERIO DE EDUCACIÓN REGULAR'],
      ['DIRECCIÓN DEPARTAMENTAL DE EDUCACIÓN DE LA PAZ'],
      ['DIRECCIÓN DISTRITAL DE EDUCACIÓN EL ALTO - 1'],
      [''],
      ['CUADERNO PEDAGÓGICO DE EVALUACIÓN Y SEGUIMIENTO ESCOLAR'],
      ['EDUCACIÓN SECUNDARIA COMUNITARIA PRODUCTIVA - LEY 070'],
      ['GESTIÓN ACADÉMICA:', year],
      [''],
      ['DATOS DE LA UNIDAD EDUCATIVA'],
      ['UNIDAD EDUCATIVA:', institution],
      ['CÓDIGO SIE:', sie],
      ['TURNO:', 'TARDE'],
      ['DISTRITO EDUCATIVO:', 'EL ALTO 1'],
      ['DEPARTAMENTO:', 'LA PAZ'],
      ['DIRECTOR(A):', director],
      [''],
      ['DATOS CURRICULARES DEL PROFESOR'],
      ['DOCENTE:', params.teacherName],
      ['CAMPO DE SABERES:', 'COMUNIDAD Y SOCIEDAD / CIENCIA Y TECNOLOGÍA'],
      ['ÁREA / MATERIA:', params.subject],
      ['CURSO:', `${params.gradeLevel} (PARALELO "${params.parallel}")`],
      ['CÓDIGO DE CURSO:', params.courseCode],
      ['TOTAL ESTUDIANTES EFECTIVOS:', params.students.length],
      [''],
      ['Generado automáticamente por SIGAE - Sistema Integral de Gestión Académica Escolar'],
      ['Fecha de emisión oficial:', new Date().toLocaleDateString('es-BO')],
    ];
    const wsCar = XLSX.utils.aoa_to_sheet(carData);
    XLSX.utils.book_append_sheet(wb, wsCar, 'Car');

    // -------------------------------------------------------------
    // HOJA 2: Fil (Filiación Oficial de Estudiantes)
    // -------------------------------------------------------------
    const filHeaders = [
      'N.º',
      'CÓDIGO RUDE',
      'CÉDULA DE IDENTIDAD',
      'APELLIDOS Y NOMBRES',
      'GÉNERO',
      'ESTADO DE MATRÍCULA',
      'CÓDIGO INTERNO EXPEDIENTE',
    ];
    const filRows = params.students.map((st, i) => [
      i + 1,
      st.rude,
      st.ci ? `${st.ci} ${st.ciExpedition || 'LP'}` : 'SIN REGISTRO',
      st.fullName,
      'REGULAR',
      st.enrollmentStatus || 'efectivo',
      st.internalCode || `EXP-${params.courseCode}-${i + 1}`,
    ]);
    const wsFil = XLSX.utils.aoa_to_sheet([
      [`FILIACIÓN OFICIAL DE ESTUDIANTES - ${institution}`],
      [`CURSO: ${params.gradeLevel} "${params.parallel}" (${params.courseCode}) · GESTIÓN: ${year}`],
      [''],
      filHeaders,
      ...filRows,
    ]);
    XLSX.utils.book_append_sheet(wb, wsFil, 'Fil');

    // -------------------------------------------------------------
    // HOJA 3: Asis1 (Asistencia 1.er Trimestre)
    // -------------------------------------------------------------
    const asisSessions = (params.attendanceSessions || []).slice(0, 20);
    const asisDates = asisSessions.map(s => s.date || 'S/F');
    const asisHeaders = [
      'N.º',
      'APELLIDOS Y NOMBRES',
      ...asisDates,
      'TOTAL CLASES',
      'PRESENTES',
      'FALTAS',
      'ATRASOS',
      'LICENCIAS',
      '% ASISTENCIA',
    ];

    const asisRows = params.students.map((st, i) => {
      let pCount = 0;
      let fCount = 0;
      let aCount = 0;
      let lCount = 0;

      const marks = asisSessions.map(sess => {
        let cat: string | undefined;
        if (Array.isArray(sess.records)) {
          const rec = sess.records.find(r => r.studentId === st.id);
          cat = rec?.status;
        } else {
          cat = (sess.records as any)?.[st.id]?.category || (sess.records as any)?.[st.id]?.status;
        }
        if (cat === 'presente') {
          pCount++;
          return 'P';
        } else if (cat === 'ausente') {
          fCount++;
          return 'F';
        } else if (cat === 'retraso') {
          aCount++;
          return 'A';
        } else if (cat === 'licencia') {
          lCount++;
          return 'L';
        }
        return '-';
      });

      const totalSess = asisSessions.length;
      const pct = totalSess > 0 ? Math.round(((pCount + aCount) / totalSess) * 100) : 100;

      return [
        i + 1,
        st.fullName,
        ...marks,
        totalSess,
        pCount,
        fCount,
        aCount,
        lCount,
        `${pct}%`,
      ];
    });

    const wsAsis1 = XLSX.utils.aoa_to_sheet([
      [`REGISTRO DE ASISTENCIA Y PUNTUALIDAD - 1.er TRIMESTRE`],
      [`MATERIA: ${params.subject} · CURSO: ${params.courseCode} · DOCENTE: ${params.teacherName}`],
      [''],
      asisHeaders,
      ...asisRows,
    ]);
    XLSX.utils.book_append_sheet(wb, wsAsis1, 'Asis1');

    // HOJA 4: Asis2 (Plantilla vacía respetando estructura)
    const wsAsis2 = XLSX.utils.aoa_to_sheet([
      [`REGISTRO DE ASISTENCIA Y PUNTUALIDAD - 2.º TRIMESTRE`],
      ['(En curso / Próximo período curricular)'],
      [''],
      ['N.º', 'APELLIDOS Y NOMBRES', 'SESIONES EN BLANCO'],
      ...params.students.map((st, i) => [i + 1, st.fullName, '']),
    ]);
    XLSX.utils.book_append_sheet(wb, wsAsis2, 'Asis2');

    // HOJA 5: Asis3 (Plantilla vacía respetando estructura)
    const wsAsis3 = XLSX.utils.aoa_to_sheet([
      [`REGISTRO DE ASISTENCIA Y PUNTUALIDAD - 3.er TRIMESTRE`],
      ['(Próximo período curricular)'],
      [''],
      ['N.º', 'APELLIDOS Y NOMBRES', 'SESIONES EN BLANCO'],
      ...params.students.map((st, i) => [i + 1, st.fullName, '']),
    ]);
    XLSX.utils.book_append_sheet(wb, wsAsis3, 'Asis3');

    // -------------------------------------------------------------
    // HOJA 6: 1Trim (Calificaciones 1.er Trimestre por Dimensiones)
    // -------------------------------------------------------------
    const consolidated1T = this.calculateTrimesterConsolidated(
      params.students,
      params.activities1T,
      params.scores1T
    );

    const trim1Headers = [
      'N.º',
      'APELLIDOS Y NOMBRES',
      'CÓDIGO RUDE',
      'SABER (35 PTS)',
      'HACER (35 PTS)',
      'SER Y DECIDIR (20 PTS)',
      'AUTOEVALUACIÓN (10 PTS)',
      'NOTA 1.er TRIMESTRE (100 PTS)',
      'ESTADO TRIMESTRAL',
    ];

    const trim1Rows = consolidated1T.map((res, i) => [
      i + 1,
      res.studentName,
      res.rude,
      res.saberAverage !== null ? res.saberAverage : 'S/N',
      res.hacerAverage !== null ? res.hacerAverage : 'S/N',
      res.serDecidirAverage !== null ? res.serDecidirAverage : 'S/N',
      res.autoevaluacionScore !== null ? res.autoevaluacionScore : 'S/N',
      res.trimesterFinalScore !== null ? res.trimesterFinalScore : 'S/N',
      res.trimesterFinalScore !== null
        ? (res.isPassing ? 'APROBADO' : 'EN DESARROLLO')
        : 'EN CURSO',
    ]);

    const ws1Trim = XLSX.utils.aoa_to_sheet([
      [`PLANILLA DE EVALUACIÓN CUALI-CUANTITATIVA - 1.er TRIMESTRE ${year}`],
      [`INSTITUCIÓN: ${institution} · SIE: ${sie}`],
      [`CURSO: ${params.gradeLevel} "${params.parallel}" (${params.courseCode}) · ÁREA: ${params.subject}`],
      [`DOCENTE RESPONSABLE: ${params.teacherName}`],
      [''],
      trim1Headers,
      ...trim1Rows,
    ]);
    XLSX.utils.book_append_sheet(wb, ws1Trim, '1Trim');

    // HOJA 7: 2Trim (Segundo Trimestre en Blanco)
    const ws2Trim = XLSX.utils.aoa_to_sheet([
      [`PLANILLA DE EVALUACIÓN - 2.º TRIMESTRE ${year}`],
      ['(Próximo trimestre académico)'],
      [''],
      ['N.º', 'APELLIDOS Y NOMBRES', 'SABER (35)', 'HACER (35)', 'SER Y DECIDIR (20)', 'AUTOEVAL (10)', 'NOTA FINAL (100)'],
      ...params.students.map((st, i) => [i + 1, st.fullName, '', '', '', '', '']),
    ]);
    XLSX.utils.book_append_sheet(wb, ws2Trim, '2Trim');

    // HOJA 8: 3Trim (Tercer Trimestre en Blanco)
    const ws3Trim = XLSX.utils.aoa_to_sheet([
      [`PLANILLA DE EVALUACIÓN - 3.er TRIMESTRE ${year}`],
      ['(Próximo trimestre académico)'],
      [''],
      ['N.º', 'APELLIDOS Y NOMBRES', 'SABER (35)', 'HACER (35)', 'SER Y DECIDIR (20)', 'AUTOEVAL (10)', 'NOTA FINAL (100)'],
      ...params.students.map((st, i) => [i + 1, st.fullName, '', '', '', '', '']),
    ]);
    XLSX.utils.book_append_sheet(wb, ws3Trim, '3Trim');

    // -------------------------------------------------------------
    // HOJA 9: Boletin (Centralizador Anual 2026)
    // -------------------------------------------------------------
    const boletinHeaders = [
      'N.º',
      'APELLIDOS Y NOMBRES',
      'RUDE',
      '1.er TRIMESTRE',
      '2.º TRIMESTRE',
      '3.er TRIMESTRE',
      'PROMEDIO ANUAL',
      'ESTADO FINAL',
    ];

    const boletinRows = consolidated1T.map((res, i) => [
      i + 1,
      res.studentName,
      res.rude,
      res.trimesterFinalScore !== null ? res.trimesterFinalScore : 'S/N',
      '-',
      '-',
      res.trimesterFinalScore !== null ? res.trimesterFinalScore : 'S/N',
      'EN CURSO',
    ]);

    const wsBoletin = XLSX.utils.aoa_to_sheet([
      [`CENTRALIZADOR GENERAL DE CALIFICACIONES - GESTIÓN ${year}`],
      [`${institution} · CÓDIGO SIE: ${sie} · TURNO: TARDE`],
      [`CURSO: ${params.courseCode} · MATERIA: ${params.subject}`],
      [''],
      boletinHeaders,
      ...boletinRows,
    ]);
    XLSX.utils.book_append_sheet(wb, wsBoletin, 'Boletin');

    // Generar archivo binario XLSX
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const cleanSubj = params.subject.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `SIGAE_2026_${params.courseCode}_${cleanSubj}_Cuaderno.xlsx`;

    return { blob, fileName };
  },

  async generateOfficialCuadernoXLSX(
    courseCode: string,
    subject: string,
    teacherName: string
  ): Promise<void> {
    const { studentService } = await import('./studentService');
    const students = await studentService.getStudentsByCourse(courseCode);
    const activities1T = await this.getActivities(courseCode, subject, '1T');
    const scores1T: Record<string, Record<string, number>> = {};
    for (const act of activities1T) {
      scores1T[act.id] = await this.getScoresByActivity(act.id);
    }

    let asisSessions: AttendanceSession[] = [];
    try {
      const qAsis = query(
        collection(db, 'attendance_sessions'),
        where('courseCode', '==', courseCode),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(qAsis);
      asisSessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
    } catch {
      // fallback if index isn't ready
    }

    const { blob, fileName } = this.generateCuadernoXLSX({
      teacherName,
      courseCode,
      gradeLevel: students[0]?.gradeLevel || `${courseCode[0]}° de Secundaria`,
      parallel: courseCode.slice(1) || 'A',
      subject,
      students,
      activities1T,
      scores1T,
      attendanceSessions: asisSessions,
    });

    this.downloadExcelBlob(blob, fileName);
  },

  downloadExcelBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
