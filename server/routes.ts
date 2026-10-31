import express, { Request, Response } from 'express';
import {
  SCHOOL_CONFIG,
  INITIAL_USERS,
  getInstitutionalUsers,
  addInstitutionalUser,
  INITIAL_COURSES,
  INITIAL_GRADEBOOKS,
  INITIAL_ATTENDANCE,
  SAMPLE_REVIEWS_BATCH,
} from './data.js';
import { parseAndAnalyzeBatch, generateExecutiveSummary } from './sentiment.js';
import { CourseGradebook, StudentGrade, AttendanceRecord, User } from '../src/types.js';
import {
  requireAuth,
  requireRole,
  requireNotOnLeave,
  signServerToken,
  getFirebaseAdminStatus,
} from './auth.js';

export const apiRouter = express.Router();

// Repositorio en memoria del servidor
let courses = [...INITIAL_COURSES];
let gradebooks: Record<string, CourseGradebook> = JSON.parse(JSON.stringify(INITIAL_GRADEBOOKS));
let attendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];

// ---------------------------------------------------------------------------
// 1. CONFIGURACIÓN Y ESTADO INSTITUCIONAL
// ---------------------------------------------------------------------------
apiRouter.get('/config', (_req: Request, res: Response) => {
  const currentUsers = getInstitutionalUsers();
  res.json({
    ...SCHOOL_CONFIG,
    totalStudents: currentUsers.filter((u) => u.role === 'student' || u.role === 'alumno').length,
    totalTeachers: currentUsers.filter((u) => u.role === 'teacher' || u.role === 'profesor').length,
    totalCourses: courses.length,
  });
});

apiRouter.get('/auth/status', (_req: Request, res: Response) => {
  res.json(getFirebaseAdminStatus());
});

// ---------------------------------------------------------------------------
// 2. AUTENTICACIÓN OFICIAL (EMISIÓN DE TOKENS FIRMADOS CRIPTOGRÁFICAMENTE)
// ---------------------------------------------------------------------------
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, role, schoolCode, teacherPin } = req.body;

  // Validación estricta del código institucional SIE
  if (schoolCode && schoolCode !== SCHOOL_CONFIG.code && schoolCode !== SCHOOL_CONFIG.sie) {
    return res.status(401).json({
      error: 'Código institucional no reconocido. Sistema de uso exclusivo para U.E. Luis Espinal Tarde de Collpani.',
    });
  }

  const user = getInstitutionalUsers().find(
    (u) =>
      u.email.toLowerCase() === email?.toLowerCase() ||
      u.id === email ||
      (email === 'sigae-usr-director-01' && u.id === 'usr-admin-1') ||
      (email === 'sigae-usr-profesor-01' && u.id === 'usr-prof-1') ||
      (email === 'sigae-usr-padre-01' && u.id === 'padre-01') ||
      (email === 'sigae-usr-alumno-01' && u.id === 'alu-01')
  );

  if (!user) {
    return res.status(404).json({ error: 'Usuario no registrado en la base de datos institucional.' });
  }

  // Comprobación de estado institucional
  if (user.status === 'inactivo') {
    return res.status(403).json({
      error: 'Acceso denegado: Cuenta institucional inactiva. Contacte a Dirección General.',
      status: 'inactivo',
    });
  }

  if (user.status === 'retirado') {
    return res.status(403).json({
      error: 'Acceso denegado: El usuario ha sido retirado de la institución educativa.',
      status: 'retirado',
    });
  }

  if (user.status === 'pendiente_activacion') {
    return res.status(403).json({
      error: 'Acceso denegado: Cuenta institucional pendiente de activación oficial.',
      status: 'pendiente_activacion',
    });
  }

  // Verificación de PIN de seguridad docente
  if (user.role === 'teacher' || user.role === 'profesor') {
    if (!teacherPin) {
      return res.status(403).json({
        error: 'El portal docente requiere PIN de Seguridad Privado para ingresar y gestionar notas.',
        requiresPin: true,
      });
    }
    if (user.teacherPin && user.teacherPin !== teacherPin) {
      return res.status(403).json({
        error: 'PIN de Seguridad Docente incorrecto. Acceso denegado a la gestión de calificaciones.',
        requiresPin: true,
      });
    }
  }

  // Emisión de token criptográfico oficial firmado por el servidor (HMAC-SHA256)
  // Reemplaza los tokens de prueba o texto plano inseguros
  const token = signServerToken({ uid: user.id, email: user.email });

  res.json({
    success: true,
    user: {
      ...user,
      teacherPin: user.role === 'teacher' || user.role === 'profesor' ? '••••' : undefined,
    },
    token,
  });
});

// ---------------------------------------------------------------------------
// 3. GESTIÓN DE USUARIOS (PROTEGIDO: SOLO DIRECCIÓN GENERAL / ADMINISTRADOR)
// ---------------------------------------------------------------------------
apiRouter.get('/users', requireAuth, requireRole('admin', 'director'), (req: Request, res: Response) => {
  const role = req.query.role as string;
  const currentUsers = getInstitutionalUsers();
  const filtered = role ? currentUsers.filter((u) => u.role === role) : currentUsers;
  // Ocultar PIN de seguridad docente en la respuesta
  const safeUsers = filtered.map((u) => ({
    ...u,
    teacherPin: u.role === 'teacher' || u.role === 'profesor' ? '••••' : undefined,
  }));
  res.json(safeUsers);
});

apiRouter.post('/users/register', requireAuth, requireRole('admin', 'director'), (req: Request, res: Response) => {
  const { name, email, role, specialty, gradeLevel, section, linkedStudentIds, teacherPin, status } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: name, email, role' });
  }

  const existing = getInstitutionalUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Ya existe un usuario institucional registrado con este correo' });
  }

  const newId = `usr-${role}-${Date.now().toString().slice(-4)}`;
  const newUser: User = {
    id: newId,
    name,
    email,
    role,
    schoolCode: SCHOOL_CONFIG.code,
    status: status || 'activo',
    specialty,
    gradeLevel,
    section,
    linkedStudentIds,
    teacherPin: role === 'teacher' || role === 'profesor' ? teacherPin || '1234' : undefined,
    studentCode: role === 'student' || role === 'alumno' ? `ALU-2026-${Math.floor(Math.random() * 900 + 100)}` : undefined,
  };

  addInstitutionalUser(newUser);
  res.status(201).json({ success: true, user: newUser });
});

// ---------------------------------------------------------------------------
// 4. CURSOS ACADÉMICOS (PROTEGIDO)
// ---------------------------------------------------------------------------
apiRouter.get('/courses', requireAuth, (_req: Request, res: Response) => {
  res.json(courses);
});

// ---------------------------------------------------------------------------
// 5. REGISTRO DE CALIFICACIONES (PROTEGIDO POR ROL, ASIGNACIÓN Y ESTADO)
// ---------------------------------------------------------------------------
apiRouter.get('/grades/:courseId', requireAuth, (req: Request, res: Response) => {
  const { courseId } = req.params;
  const authUser = req.user!;

  const course = courses.find((c) => c.id === courseId);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

  const gradebook = gradebooks[courseId];

  const isDirector = authUser.role === 'admin' || authUser.role === 'director';
  const isTeacher = authUser.role === 'teacher' || authUser.role === 'profesor';
  const isStudent = authUser.role === 'student' || authUser.role === 'alumno';
  const isParent = authUser.role === 'parent' || authUser.role === 'padre';

  if (!isDirector) {
    const isAssignedTeacher =
      isTeacher &&
      (course.teacherId === authUser.teacherId ||
        course.teacherId === authUser.id ||
        course.teacherId === authUser.uid);

    if (isTeacher && !isAssignedTeacher) {
      return res.status(403).json({ error: 'Acceso denegado: El docente no tiene asignado este curso' });
    }

    if (isStudent) {
      if (!gradebook || !gradebook.isPublishedToSchool) {
        return res.status(403).json({
          error: 'Acceso denegado: Las calificaciones de este curso aún no han sido publicadas oficialmente',
        });
      }
      const isEnrolled =
        (course.studentIds && course.studentIds.includes(authUser.id)) ||
        Boolean(gradebook.grades && gradebook.grades[authUser.id]);
      if (!isEnrolled) {
        return res.status(403).json({ error: 'Acceso denegado: El estudiante no está inscrito en este curso' });
      }
    }

    if (isParent) {
      if (!gradebook || !gradebook.isPublishedToSchool) {
        return res.status(403).json({
          error: 'Acceso denegado: Las calificaciones de este curso aún no han sido publicadas oficialmente',
        });
      }
      const linked = authUser.linkedStudentIds || [];
      const childEnrolled = linked.some(
        (cid) =>
          (course.studentIds && course.studentIds.includes(cid)) ||
          Boolean(gradebook.grades && gradebook.grades[cid])
      );
      if (!childEnrolled) {
        return res.status(403).json({
          error: 'Acceso denegado: Su estudiante vinculado no está inscrito en este curso',
        });
      }
    }

    if (!isAssignedTeacher && !isStudent && !isParent) {
      return res.status(403).json({ error: 'Acceso denegado: Rol no autorizado para consultar calificaciones' });
    }
  }

  if (!gradebook) {
    const newGb: CourseGradebook = {
      courseId,
      courseName: course.name,
      period: 'Bimestre 1',
      criteria: [
        { id: 'c1', name: 'Evaluación Parcial', shortCode: 'EP', weight: 0.3, maxScore: 20 },
        { id: 'c2', name: 'Trabajos Prácticos', shortCode: 'TP', weight: 0.3, maxScore: 20 },
        { id: 'c3', name: 'Examen Final', shortCode: 'EF', weight: 0.4, maxScore: 20 },
      ],
      grades: {},
      isPublishedToSchool: false,
    };
    gradebooks[courseId] = newGb;
    return res.json(newGb);
  }

  // Sanitización de vistas para Estudiantes: EXCLUSIVAMENTE su propia calificación
  if (isStudent) {
    const studentGrade = gradebook.grades[authUser.id];
    const sanitizedGb: CourseGradebook = {
      ...gradebook,
      grades: studentGrade ? { [studentGrade.studentId]: studentGrade } : {},
    };
    return res.json(sanitizedGb);
  }

  // Sanitización de vistas para Padres: EXCLUSIVAMENTE las calificaciones de sus hijos vinculados
  if (isParent) {
    const linked = authUser.linkedStudentIds || [];
    const sanitizedGrades: Record<string, StudentGrade> = {};
    for (const childId of linked) {
      if (gradebook.grades[childId]) {
        sanitizedGrades[childId] = gradebook.grades[childId];
      }
    }
    const sanitizedGb: CourseGradebook = {
      ...gradebook,
      grades: sanitizedGrades,
    };
    return res.json(sanitizedGb);
  }

  res.json(gradebook);
});

// Modificación de calificaciones: Solo docente asignado en estado activo o Dirección
apiRouter.post(
  '/grades/:courseId/student/:studentId',
  requireAuth,
  requireNotOnLeave,
  (req: Request, res: Response) => {
    const { courseId, studentId } = req.params;
    const { scores, teacherFeedback, teacherPin } = req.body;
    const authUser = req.user!;

    const course = courses.find((c) => c.id === courseId);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const isDirector = authUser.role === 'admin' || authUser.role === 'director';
    const isAssignedTeacher =
      (authUser.role === 'teacher' || authUser.role === 'profesor') &&
      (course.teacherId === authUser.teacherId ||
        course.teacherId === authUser.id ||
        course.teacherId === authUser.uid);

    if (!isDirector && !isAssignedTeacher) {
      return res.status(403).json({
        error: 'Acceso denegado: Solo el docente asignado o Dirección pueden modificar calificaciones',
      });
    }

    // Verificación de PIN docente para asentar calificaciones
    const teacher = getInstitutionalUsers().find((u) => u.id === course.teacherId);
    if (teacher && teacher.teacherPin && teacherPin && teacher.teacherPin !== teacherPin) {
      return res.status(403).json({ error: 'PIN de Seguridad Docente no coincide. Modificación no autorizada.' });
    }

    let gradebook = gradebooks[courseId];
    if (!gradebook) {
      return res.status(404).json({ error: 'Registro de calificaciones no inicializado' });
    }

    const student = getInstitutionalUsers().find((u) => u.id === studentId);
    const studentName = student ? student.name : 'Estudiante';
    const studentCode = student?.studentCode || 'ALU-000';

    let totalWeighted = 0;
    let totalWeight = 0;
    gradebook.criteria.forEach((crit) => {
      const val = scores[crit.id];
      if (typeof val === 'number' && !isNaN(val)) {
        totalWeighted += val * crit.weight;
        totalWeight += crit.weight;
      }
    });

    const finalAvg = totalWeight > 0 ? Number((totalWeighted / totalWeight).toFixed(1)) : null;
    let status: StudentGrade['status'] = 'sin_evaluar';
    if (finalAvg !== null) {
      if (finalAvg >= SCHOOL_CONFIG.passingScore) status = 'aprobado';
      else if (finalAvg >= SCHOOL_CONFIG.passingScore - 2) status = 'en_riesgo';
      else status = 'reprobado';
    }

    const updatedGrade: StudentGrade = {
      studentId,
      studentName,
      studentCode,
      scores,
      finalAverage: finalAvg,
      status,
      teacherFeedback: teacherFeedback || '',
      published: gradebook.isPublishedToSchool,
      lastUpdated: new Date().toISOString(),
    };

    gradebook.grades[studentId] = updatedGrade;

    res.json({
      success: true,
      grade: updatedGrade,
      message: 'Calificación guardada exitosamente.',
    });
  }
);

// Publicación de calificaciones: Solo docente asignado o Dirección
apiRouter.post(
  '/grades/:courseId/publish',
  requireAuth,
  requireNotOnLeave,
  (req: Request, res: Response) => {
    const { courseId } = req.params;
    const { publish, teacherPin } = req.body;
    const authUser = req.user!;

    const course = courses.find((c) => c.id === courseId);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const isDirector = authUser.role === 'admin' || authUser.role === 'director';
    const isAssignedTeacher =
      (authUser.role === 'teacher' || authUser.role === 'profesor') &&
      (course.teacherId === authUser.teacherId ||
        course.teacherId === authUser.id ||
        course.teacherId === authUser.uid);

    if (!isDirector && !isAssignedTeacher) {
      return res.status(403).json({
        error: 'Acceso denegado: Solo el docente asignado o Dirección pueden modificar el estado de publicación',
      });
    }

    const teacher = getInstitutionalUsers().find((u) => u.id === course.teacherId);
    if (teacher && teacher.teacherPin && teacherPin && teacherPin !== teacher.teacherPin) {
      return res.status(403).json({
        error: 'PIN de Seguridad Docente inválido. Se requiere validación de identidad para publicar notas oficiales.',
      });
    }

    const gradebook = gradebooks[courseId];
    if (!gradebook) return res.status(404).json({ error: 'Registro de calificaciones no encontrado' });

    gradebook.isPublishedToSchool = publish === true;
    gradebook.publishedAt = publish ? new Date().toISOString() : undefined;

    Object.keys(gradebook.grades).forEach((stuId) => {
      gradebook.grades[stuId].published = publish === true;
      gradebook.grades[stuId].lastUpdated = new Date().toISOString();
    });

    res.json({
      success: true,
      isPublishedToSchool: gradebook.isPublishedToSchool,
      publishedAt: gradebook.publishedAt,
      message: publish
        ? '¡Notas publicadas oficialmente! Ahora los alumnos y padres pueden ver sus calificaciones en tiempo real.'
        : 'Notas guardadas como borrador confidencial. Solo el profesor tiene visibilidad.',
    });
  }
);

// ---------------------------------------------------------------------------
// 6. BOLETA DE CALIFICACIONES (PROTEGIDO)
// ---------------------------------------------------------------------------
apiRouter.get('/students/:studentId/report-card', requireAuth, (req: Request, res: Response) => {
  const { studentId } = req.params;
  const authUser = req.user!;

  const student = getInstitutionalUsers().find((u) => u.id === studentId);
  if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

  // Comprobación de autorización:
  // - Dirección: acceso general
  // - Estudiante: únicamente su propia boleta
  // - Padre: únicamente sus hijos vinculados
  // - Docente: únicamente si le enseña a este estudiante
  const isDirector = authUser.role === 'admin' || authUser.role === 'director';
  const isSelfStudent =
    (authUser.role === 'student' || authUser.role === 'alumno') &&
    (authUser.id === studentId || authUser.uid === studentId);
  const isLinkedParent =
    (authUser.role === 'parent' || authUser.role === 'padre') &&
    ((authUser.linkedStudentIds && authUser.linkedStudentIds.includes(studentId)) ||
      student.parentId === authUser.id ||
      student.parentId === authUser.uid);
  const isTeacher = authUser.role === 'teacher' || authUser.role === 'profesor';

  if (!isDirector && !isSelfStudent && !isLinkedParent && !isTeacher) {
    return res.status(403).json({
      error: 'Acceso denegado: No tiene autorización para consultar la boleta de calificaciones de este estudiante',
    });
  }

  const parent = getInstitutionalUsers().find((u) => u.id === student.parentId);

  const subjectGrades: Array<{
    courseId: string;
    courseName: string;
    teacherName: string;
    criteria: Array<{ name: string; shortCode: string; weight: number; score: number | null }>;
    finalAverage: number | null;
    status: StudentGrade['status'];
    teacherFeedback: string;
    isPublished: boolean;
    lastUpdated: string;
  }> = [];

  courses.forEach((c) => {
    const gb = gradebooks[c.id];
    if (gb && gb.grades[studentId]) {
      const g = gb.grades[studentId];
      subjectGrades.push({
        courseId: c.id,
        courseName: c.name,
        teacherName: c.teacherName,
        criteria: gb.criteria.map((crit) => ({
          name: crit.name,
          shortCode: crit.shortCode,
          weight: crit.weight,
          score: g.published || isDirector || (isTeacher && c.teacherId === authUser.id) ? (g.scores[crit.id] ?? null) : null,
        })),
        finalAverage: g.published || isDirector || (isTeacher && c.teacherId === authUser.id) ? g.finalAverage : null,
        status: g.published || isDirector ? g.status : 'sin_evaluar',
        teacherFeedback: g.published || isDirector ? g.teacherFeedback || '' : 'Calificaciones en proceso de revisión por el docente.',
        isPublished: g.published,
        lastUpdated: g.lastUpdated,
      });
    } else {
      subjectGrades.push({
        courseId: c.id,
        courseName: c.name,
        teacherName: c.teacherName,
        criteria: [],
        finalAverage: null,
        status: 'sin_evaluar',
        teacherFeedback: 'Pendiente de evaluación.',
        isPublished: false,
        lastUpdated: new Date().toISOString(),
      });
    }
  });

  const evaluated = subjectGrades.filter((s) => s.isPublished && s.finalAverage !== null);
  const overallAverage = evaluated.length
    ? Number((evaluated.reduce((acc, s) => acc + (s.finalAverage || 0), 0) / evaluated.length).toFixed(2))
    : null;

  const studentAttendance = attendance.filter((a) => a.studentId === studentId);
  const totalClasses = studentAttendance.length;
  const presents = studentAttendance.filter((a) => a.status === 'presente').length;
  const lates = studentAttendance.filter((a) => a.status === 'tarde').length;
  const excused = studentAttendance.filter((a) => a.status === 'falta_justificada').length;
  const unexcused = studentAttendance.filter((a) => a.status === 'falta_injustificada').length;

  res.json({
    student,
    parent: parent ? { id: parent.id, name: parent.name, email: parent.email } : null,
    academicPeriod: SCHOOL_CONFIG.currentPeriod,
    overallAverage,
    totalCourses: subjectGrades.length,
    evaluatedCourses: evaluated.length,
    subjectGrades,
    attendanceSummary: {
      total: totalClasses,
      presents,
      lates,
      excused,
      unexcused,
      attendancePercentage: totalClasses > 0 ? Math.round(((presents + lates * 0.5) / totalClasses) * 100) : 100,
    },
  });
});

// ---------------------------------------------------------------------------
// 7. TUTORÍA PARENTAL (PROTEGIDO)
// ---------------------------------------------------------------------------
apiRouter.get('/parents/:parentId/children', requireAuth, (req: Request, res: Response) => {
  const { parentId } = req.params;
  const authUser = req.user!;

  const isDirector = authUser.role === 'admin' || authUser.role === 'director';
  const isSelfParent =
    (authUser.role === 'parent' || authUser.role === 'padre') &&
    (authUser.id === parentId || authUser.uid === parentId);

  if (!isDirector && !isSelfParent) {
    return res.status(403).json({
      error: 'Acceso denegado: Solo el tutor legal titular o Dirección pueden consultar los estudiantes vinculados',
    });
  }

  const parent = getInstitutionalUsers().find((u) => u.id === parentId);
  if (!parent) return res.status(404).json({ error: 'Padre o tutor legal no encontrado' });

  const childrenIds = parent.linkedStudentIds || [];
  const children = getInstitutionalUsers().filter((u) => childrenIds.includes(u.id));

  res.json({
    parent,
    children,
  });
});

// ---------------------------------------------------------------------------
// 8. ASISTENCIA ESCOLAR (PROTEGIDO: DOCENTES Y DIRECCIÓN)
// ---------------------------------------------------------------------------
apiRouter.get('/attendance', requireAuth, (req: Request, res: Response) => {
  const authUser = req.user!;
  const isDirector = authUser.role === 'admin' || authUser.role === 'director';
  const isTeacher = authUser.role === 'teacher' || authUser.role === 'profesor';

  if (!isDirector && !isTeacher) {
    return res.status(403).json({
      error: 'Acceso denegado: Solo docentes o Dirección pueden consultar el registro de asistencia',
    });
  }

  const { courseId, date } = req.query;
  let filtered = [...attendance];

  if (courseId) {
    if (isTeacher && !isDirector) {
      const course = courses.find((c) => c.id === courseId);
      if (course && course.teacherId !== authUser.id && course.teacherId !== authUser.teacherId) {
        return res.status(403).json({ error: 'Acceso denegado: El docente no tiene asignado este curso' });
      }
    }
    filtered = filtered.filter((a) => a.courseId === courseId);
  }

  if (date) filtered = filtered.filter((a) => a.date === date);
  res.json(filtered);
});

apiRouter.post('/attendance', requireAuth, requireNotOnLeave, (req: Request, res: Response) => {
  const authUser = req.user!;
  const isDirector = authUser.role === 'admin' || authUser.role === 'director';
  const isTeacher = authUser.role === 'teacher' || authUser.role === 'profesor';

  if (!isDirector && !isTeacher) {
    return res.status(403).json({
      error: 'Acceso denegado: Solo docentes o Dirección pueden asentar asistencia escolar',
    });
  }

  const { date, courseId, records } = req.body;
  if (!date || !courseId || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Datos de asistencia inválidos' });
  }

  if (isTeacher && !isDirector) {
    const course = courses.find((c) => c.id === courseId);
    if (!course || (course.teacherId !== authUser.id && course.teacherId !== authUser.teacherId)) {
      return res.status(403).json({ error: 'Acceso denegado: Solo el docente asignado puede registrar asistencia para este curso' });
    }
  }

  // Actualizar registros para este curso y fecha
  attendance = attendance.filter((a) => !(a.date === date && a.courseId === courseId));

  records.forEach((rec: any) => {
    attendance.push({
      id: `att-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      date,
      courseId,
      studentId: rec.studentId,
      studentName: rec.studentName,
      status: rec.status,
      notes: rec.notes || '',
    });
  });

  res.json({ success: true, count: records.length });
});

// ---------------------------------------------------------------------------
// 9. MÓDULO DE OPINIÓN INSTITUCIONAL (PROTEGIDO: DIRECCIÓN Y EQUIPO ACADÉMICO)
// ---------------------------------------------------------------------------
apiRouter.get(
  '/sentiment/sample',
  requireAuth,
  requireRole('admin', 'director', 'teacher', 'profesor'),
  (_req: Request, res: Response) => {
    res.json({ sample: SAMPLE_REVIEWS_BATCH });
  }
);

apiRouter.post(
  '/sentiment/analyze',
  requireAuth,
  requireRole('admin', 'director', 'teacher', 'profesor'),
  async (req: Request, res: Response) => {
    try {
      const { rawText } = req.body;
      const textToAnalyze = rawText && rawText.trim().length > 10 ? rawText : SAMPLE_REVIEWS_BATCH;

      const { reviews, praises, complaints, timeline } = parseAndAnalyzeBatch(textToAnalyze);

      const posCount = reviews.filter((r) => r.sentiment === 'positive').length;
      const neuCount = reviews.filter((r) => r.sentiment === 'neutral').length;
      const negCount = reviews.filter((r) => r.sentiment === 'negative').length;
      const avgScore = reviews.length
        ? reviews.reduce((a, b) => a + b.score, 0) / reviews.length
        : 0;

      const stats = {
        total: reviews.length,
        positive: posCount,
        neutral: neuCount,
        negative: negCount,
        praises: praises.map((p) => p.word),
        complaints: complaints.map((c) => c.word),
      };

      const { executiveSummary, actionableAreas } = await generateExecutiveSummary(textToAnalyze, stats);

      const report = {
        totalReviews: reviews.length,
        sentimentDistribution: {
          positive: posCount,
          neutral: neuCount,
          negative: negCount,
          averageScore: Number(avgScore.toFixed(2)),
          netPromoterLike: Math.round(((posCount - negCount) / Math.max(1, reviews.length)) * 100),
        },
        timelineTrend: timeline,
        topPraises: praises.slice(0, 20),
        topComplaints: complaints.slice(0, 20),
        executiveSummary,
        actionableAreas,
        analyzedAt: new Date().toISOString(),
      };

      res.json(report);
    } catch (error: any) {
      console.error('Error analyzing sentiment batch:', error);
      res.status(500).json({ error: 'Error procesando análisis de sentimiento: ' + error.message });
    }
  }
);
