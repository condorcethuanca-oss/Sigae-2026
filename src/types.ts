export const AUTHORIZED_SUPERADMIN_UID = '385JXeNTGcNrZvV2casb8ICaQvE2';
export const AUTHORIZED_DIRECTOR_UID = 'At1j9MIIu1ZN0ZRZDas28ILQn2y1';
export const AUTHORIZED_ADMIN_UID = '385JXeNTGcNrZvV2casb8ICaQvE2'; // for backwards compatibility
export const AUTHORIZED_DIRECTOR_UIDS = [
  'At1j9MIIu1ZN0ZRZDas28ILQn2y1',
  'oVuD2FxNPqZbzBUfCzKPXc9t1V82',
  '0zHkg7u1XsaJ15EiXtVNzY8qTWt2',
];
export const AUTHORIZED_DIRECTOR_EMAILS = [
  'condorcethuanca@gmail.com',
  'director@sigae.edu.bo',
  'director.institucional@sigae.edu.bo',
  'gamacondorilopez74@gmail.com',
];

export type SigaeRole = 'director' | 'profesor' | 'padre' | 'alumno';
export type UserRole = 'director' | 'teacher' | 'student' | 'parent' | SigaeRole;

export function isAuthorizedDirectorOrAdmin(user: SigaeUser | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'director' ||
    AUTHORIZED_DIRECTOR_UIDS.includes(user.uid) ||
    user.uid === AUTHORIZED_SUPERADMIN_UID ||
    AUTHORIZED_DIRECTOR_EMAILS.includes((user.email || '').toLowerCase().trim())
  );
}

export interface CourseAssignmentRequest {
  id: string;
  teacherId?: string;
  teacherUid: string;
  teacherName: string;
  teacherEmail: string;
  grade: string;
  parallel: string;
  subject: string;
  hourlyLoad?: number | string;
  schoolSie: string;
  status: 'pendiente' | 'autorizado' | 'rechazado';
  accessCode?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface StudentVinculacionRequest {
  id: string;
  parentUid: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  studentName: string;
  studentCi?: string;
  accessCode: string;
  grade?: string;
  parallel?: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface SigaeUser {
  uid: string;
  email: string;
  displayName: string;
  role: SigaeRole;
  teacherId?: string; // Institutional record ID in /teachers
  ci?: string;
  phone?: string;
  active: boolean;
  schoolSie?: string;
  createdAt: string;
  updatedAt?: string;
  photoURL?: string;
  emailVerified?: boolean;
  needsProfileCompletion?: boolean;
  approvalStatus?: 'pendiente' | 'aprobada' | 'rechazada';
  hasApprovedChildLink?: boolean;
  specialty?: string;
  assignedGrades?: string[];
  assignedSubjects?: string[];
  studentLinking?: {
    studentName: string;
    studentRude: string;
    studentCi?: string;
    grade?: string;
    relationship?: string;
    status: 'pendiente_validacion' | 'aprobada' | 'rechazada' | 'validada';
  };
}

export type TeacherStatus = 'activo' | 'pendiente_activacion' | 'licencia' | 'inactivo' | 'retirado';

export interface TeacherRecord {
  id: string; // Institutional ID, e.g. tch-XXXXXX
  teacherId?: string; // Institutional ID alias
  authUid?: string; // Real Firebase Authentication UID once linked
  uid?: string; // Compatibility alias to authUid
  linkedAt?: string; // Timestamp when linked to real Firebase Auth
  linkedEmail?: string;
  fullName: string;
  email: string;
  ci: string;
  ciExpedition?: 'LP' | 'CB' | 'SC' | 'OR' | 'PT' | 'TJ' | 'CH' | 'BE' | 'PA' | string;
  phone: string;
  specialty: string;
  assignedGrades: string[];
  assignedSubjects: string[];
  hourlyLoad: number | string;
  status: TeacherStatus;
  notes?: string;
  photoUrl?: string;
  documentUrl?: string;
  documentName?: string;
  invitationSentAt?: string;
  accountStatusExplanation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const INITIAL_BOLIVIA_TEACHERS: TeacherRecord[] = [
  {
    id: 'tch-01',
    fullName: 'Prof. Carlos Mamani Quispe',
    email: 'carlos.mamani@luisespinal.edu.bo',
    ci: '6192841 LP',
    ciExpedition: 'LP',
    phone: '+591 73291048',
    specialty: 'Matemática y Razonamiento Lógico',
    assignedGrades: ['4° de Secundaria A', '5° de Secundaria A', '6° de Secundaria A'],
    assignedSubjects: ['Matemática', 'Geometría Analítica'],
    hourlyLoad: 88,
    status: 'activo',
    notes: 'Coordinador del área de ciencias exactas. Docente con 12 años de servicio en Collpani.',
  },
  {
    id: 'tch-02',
    fullName: 'Profa. Elena Choquehuanca Flores',
    email: 'elena.choquehuanca@luisespinal.edu.bo',
    ci: '4928104 CB',
    ciExpedition: 'CB',
    phone: '+591 76543210',
    specialty: 'Comunicación y Lenguajes / Literatura',
    assignedGrades: ['3° de Secundaria A', '4° de Secundaria A', '5° de Secundaria A'],
    assignedSubjects: ['Lenguaje y Literatura', 'Lengua Originaria Aymara'],
    hourlyLoad: 80,
    status: 'activo',
    notes: 'Encargada de la Comisión Pedagógica y Club de Declamación y Debate.',
  },
  {
    id: 'tch-03',
    fullName: 'Prof. Marcos Silva Condori',
    email: 'marcos.silva@luisespinal.edu.bo',
    ci: '7281903 SC',
    ciExpedition: 'SC',
    phone: '+591 68123456',
    specialty: 'Física - Química',
    assignedGrades: ['5° de Secundaria A', '6° de Secundaria A'],
    assignedSubjects: ['Física Experimental', 'Química General'],
    hourlyLoad: 72,
    status: 'activo',
    notes: 'Responsable del laboratorio de ciencias y proyectos de feria científica distrital El Alto.',
  },
  {
    id: 'tch-04',
    fullName: 'Profa. Patricia Ruiz Ticona',
    email: 'patricia.ruiz@luisespinal.edu.bo',
    ci: '5819024 OR',
    ciExpedition: 'OR',
    phone: '+591 71987654',
    specialty: 'Ciencias Sociales e Historia de Bolivia',
    assignedGrades: ['1° de Secundaria A', '2° de Secundaria A', '3° de Secundaria A'],
    assignedSubjects: ['Historia', 'Geografía', 'Cívica'],
    hourlyLoad: 72,
    status: 'activo',
    notes: 'Tutora de aula de 3° de Secundaria Paralelo A.',
  },
  {
    id: 'tch-05',
    fullName: 'Prof. Wilson Huanca Yujra',
    email: 'wilson.huanca@luisespinal.edu.bo',
    ci: '6391028 PT',
    ciExpedition: 'PT',
    phone: '+591 74567890',
    specialty: 'Técnica Tecnológica Productiva (BTH)',
    assignedGrades: ['4° de Secundaria A', '5° de Secundaria A', '6° de Secundaria A'],
    assignedSubjects: ['Robótica y Sistemas', 'Electrónica Básica'],
    hourlyLoad: 64,
    status: 'activo',
    notes: 'Encargado del taller BTH (Bachillerato Técnico Humanístico de Collpani).',
  },
];

export interface GroupSubject {
  id: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
  hoursWeekly: number;
}

export interface SchoolGroup {
  id: string;
  name: string; // e.g. "5° de Secundaria"
  level: 'primaria' | 'secundaria';
  parallel: 'A' | 'B' | 'C' | string;
  shift: 'mañana' | 'tarde';
  academicYear: string;
  tutorTeacherId?: string;
  tutorTeacherName?: string;
  classroom?: string;
  studentCount: number;
  subjects: GroupSubject[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'director' | 'profesor' | 'padre' | 'alumno';
  recipientId: string; // 'all_teachers' | 'all_parents' | 'all_students' | teacherId | parentUid | studentUid | 'course_6A'
  recipientName: string;
  subject: string;
  content: string;
  type: 'comunicado' | 'recordatorio' | 'actividad' | 'tarea' | 'evaluacion' | 'reunion' | 'comunicado_general' | 'circular' | 'mensaje_directo' | 'citacion';
  priority: 'normal' | 'importante' | 'prioritario' | 'alta' | 'urgente';
  targetGroup?: 'all_teachers' | 'all_parents' | 'all_students' | 'course_parents' | 'course_students' | 'course_teachers' | 'individual' | 'custom';
  targetCourseCode?: string;
  eventDate?: string; // YYYY-MM-DD para eventos académicos en calendario
  eventTime?: string; // HH:mm
  scheduledAt?: string; // Fecha y hora programada de despacho
  sentAt?: string; // Fecha efectiva de despacho
  status?: 'borrador' | 'programado' | 'enviado' | 'cancelado';
  readBy?: { uid: string; readAt: string }[];
  recipientCount?: number;
  createdAt: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentSize?: number;
  attachmentType?: string;
}

export interface CalendarActivityEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  type: 'academico' | 'feriado' | 'evaluacion' | 'tarea' | 'reunion' | 'institucional' | 'comunicado' | 'recordatorio';
  courseCode?: string;
  subject?: string;
  teacherName?: string;
  time?: string;
  isHoliday?: boolean;
  authorId?: string;
  authorName?: string;
  authorRole?: SigaeRole;
  priority?: 'normal' | 'importante' | 'prioritario';
  sourceMessageId?: string;
}

export interface ScheduleIncidence {
  id: string;
  courseCode: string;
  gradeLevel: string;
  parallel: string;
  dayOfWeek: SchoolDayOfWeek;
  periodLabel: string;
  description: string;
  conflictType: 'cruce_materias' | 'docente_duplicado' | 'hora_incompleta' | 'pendiente_validacion';
  involvedSubjects: string[];
  resolved: boolean;
  resolutionNote?: string;
}

export type ScheduleStatus =
  | 'borrador'
  | 'en_revision'
  | 'con_incidencias'
  | 'aprobado'
  | 'publicado'
  | 'archivado';

export interface CourseScheduleMeta {
  courseCode: string;
  gradeLevel: string;
  parallel: string;
  academicYear: string;
  status: ScheduleStatus;
  isPublishedToFamilies: boolean;
  publishedAt?: string;
  publishedBy?: string;
  totalBlocks: number;
  hasIncidences: boolean;
  notes?: string;
  updatedAt: string;
}

export interface SchoolConfig {
  id?: string;
  schoolName: string;
  sie: string;
  academicYear: string;
  currentPeriod: string;
  directorName: string;
  department: string;
  district: string;
  shift: 'mañana' | 'tarde' | 'noche' | 'completo';
  phone?: string;
  email?: string;
  logoUrl?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  schoolCode: string;
  ci?: string;
  status?: TeacherStatus;
  // Specific teacher security
  teacherPin?: string;
  specialty?: string;
  // Student specific
  studentCode?: string;
  gradeLevel?: string;
  section?: string;
  parentId?: string;
  // Parent specific
  linkedStudentIds?: string[];
}

export interface Course {
  id: string;
  name: string;
  code: string;
  gradeLevel: string;
  section: string;
  teacherId: string;
  teacherName: string;
  schedule: string;
  credits: number;
  studentIds?: string[];
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  shortCode: string; // P1, P2, TA, EX, CO
  weight: number; // e.g. 0.25
  maxScore: number; // 20
}

export interface StudentGrade {
  studentId: string;
  studentName: string;
  studentCode: string;
  scores: {
    [criteriaId: string]: number | null;
  };
  finalAverage: number | null;
  status: 'aprobado' | 'en_riesgo' | 'reprobado' | 'sin_evaluar';
  teacherFeedback?: string;
  published: boolean;
  lastUpdated: string;
}

export interface CourseGradebook {
  courseId: string;
  courseName: string;
  period: string;
  criteria: EvaluationCriteria[];
  grades: {
    [studentId: string]: StudentGrade;
  };
  isPublishedToSchool: boolean;
  publishedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  courseId: string;
  studentId: string;
  studentName: string;
  status: 'presente' | 'tarde' | 'falta_justificada' | 'falta_injustificada';
  notes?: string;
}

export interface ReviewItem {
  id: string;
  date: string;
  authorType: 'padre' | 'alumno' | 'docente' | 'comunidad';
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  category: 'académico' | 'instalaciones' | 'comunicación' | 'docencia' | 'cafetería' | 'seguridad';
}

export interface WordFrequency {
  word: string;
  count: number;
  type: 'praise' | 'complaint' | 'neutral';
  sentimentScore: number;
}

export interface SentimentTrendPoint {
  date: string;
  label: string;
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
}

export interface ActionableArea {
  title: string;
  priority: 'alta' | 'media' | 'preventiva';
  department: string;
  finding: string;
  recommendation: string;
  expectedImpact: string;
}

export interface SentimentAnalysisReport {
  totalReviews: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
    averageScore: number;
    netPromoterLike: number;
  };
  timelineTrend: SentimentTrendPoint[];
  topPraises: WordFrequency[];
  topComplaints: WordFrequency[];
  executiveSummary: string;
  actionableAreas: ActionableArea[];
  analyzedAt: string;
}

// ---------------------------------------------------------------------------
// TIPOS OFICIALES PARA EL PADRÓN INSTITUCIONAL, HORARIOS Y ASISTENCIA (ETAPA 1)
// ---------------------------------------------------------------------------

/**
 * Expediente oficial de un estudiante en el Padrón Institucional de la U.E. Luis Espinal
 */
export interface StudentInstitutionalRecord {
  id: string; // Identificador institucional único (ej: "est-80730142-001")
  fullName: string; // Nombre oficial completo registrado en el colegio
  ci: string; // Carnet de identidad manejado como string (preserva ceros)
  ciExpedition?: string; // Departamento de expedición (LP, CB, etc.)
  rude: string; // Código RUDE oficial boliviano (string con ceros)
  gradeLevel: string; // ej: "1° de Secundaria", "2° de Secundaria", etc.
  gradeNumber: number; // 1, 2, 3, 4, 5, 6
  parallel: string; // "A", "B", "C", "D"
  courseCode: string; // ej: "1A", "2C", "3D", "5B", "6D"
  academicYear: string; // "2026"
  enrollmentStatus: 'efectivo' | 'inscrito' | 'retirado' | 'trasladado';
  birthDate?: string;
  internalCode?: string; // Código interno administrativo del colegio
  linkedParentUids?: string[]; // UIDs de Firebase Auth de padres/tutores autorizados
  authUid?: string; // UID de Firebase Auth del estudiante una vez vinculado
  linkedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Estructura oficial del Horario Escolar de la U.E. Luis Espinal Tarde de Collpani
 * Basado en la referencia institucional HORARIO REDUCIDO 2024
 */
export type SchoolDayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';

export interface ScheduleBlock {
  id: string;
  dayOfWeek: SchoolDayOfWeek;
  startTime: string; // ej: "08:00", "09:20", "11:00"
  endTime: string; // ej: "09:20", "10:45", "12:15"
  periodNumber: number; // 1, 2, 3
  periodLabel: string; // ej: "1er Período (08:00 - 09:20)"
  gradeLevel: string; // ej: "1° de Secundaria"
  gradeNumber: number; // 1..6
  parallel: string; // "A", "B", "C", "D"
  courseCode: string; // "1A", "2C", "3D", "5B", "6D"
  subject: string; // Materia oficial
  teacherName: string; // Profesor responsable oficial
  teacherId?: string; // Expediente del docente en el padrón
  isFortyMinuteSplit?: boolean; // Bloque subdividido en 40 minutos
  isSaturday?: boolean; // Asignación de sábado
  classroom?: string;
}

/**
 * Categorías oficiales de control de asistencia
 */
export type AttendanceCategory =
  | 'presente'
  | 'ausente'
  | 'retraso'
  | 'licencia'
  | 'pendiente';

export interface AttendanceRecordItem {
  id: string;
  studentId: string;
  studentName: string;
  ci: string;
  rude: string;
  status: AttendanceCategory;
  registeredAt?: string;
  justificationReason?: string;
  isJustified?: boolean;
  reviewedBy?: string;
  notes?: string;
}

export interface AttendanceSession {
  id: string;
  date: string; // YYYY-MM-DD
  gradeNumber: number;
  gradeLevel: string;
  parallel: string;
  courseCode: string;
  shift: 'tarde';
  academicYear: string;
  totalEnrolled: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number; // Licencias (conservan estado de revisión)
  pendingCount: number;
  records: AttendanceRecordItem[];
  isLocked?: boolean;
  lastUpdated?: string;
}

// ---------------------------------------------------------------------------
// KÁRDEX ESCOLAR INSTITUCIONAL (U.E. LUIS ESPINAL TARDE)
// ---------------------------------------------------------------------------

export type KardexLevel = 1 | 2 | 3 | 4;

export type KardexCategory =
  | 'academico'
  | 'disciplina'
  | 'asistencia'
  | 'merito'
  | 'convivencia'
  | 'material';

export interface KardexEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentCi?: string;
  studentRude?: string;
  courseCode: string; // ej: "6A", "1B"
  gradeLevel: string; // ej: "6° de Secundaria"
  parallel: string; // "A", "B", "C", "D"
  teacherId: string;
  teacherUid: string;
  teacherName: string;
  subject?: string;
  level: KardexLevel; // 1: Informativo, 2: Llamada de atención, 3: Atención familiar, 4: Atención prioritaria
  category: KardexCategory;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time?: string;
  actionTaken?: string;
  requiresFamilySignature?: boolean;
  familyNotificationSent?: boolean;
  familyAcknowledged?: boolean;
  familyAcknowledgedAt?: string;
  familyResponseNote?: string;
  directionNotified?: boolean;
  directionResolution?: string;
  directionResolvedAt?: string;
  status: 'registrado' | 'notificado' | 'atendido' | 'cerrado';
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// NOTIFICACIONES INTERNAS CON CÓDIGO DE COLOR POR ROL
// Rojo: Dirección | Azul: Profesor | Verde: Padre | Morado: Alumno
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: string;
  recipientUid: string;
  senderUid: string;
  senderName: string;
  senderRole: SigaeRole;
  title: string;
  message: string;
  type: 'comunicado' | 'kardex' | 'horario' | 'asistencia' | 'general' | 'boletin' | 'calificaciones';
  relatedId?: string;
  priority: 'normal' | 'importante' | 'prioritario' | 'urgente';
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export const ROLE_NOTIFICATION_COLORS: Record<
  SigaeRole,
  {
    label: string;
    hex: string;
    text: string;
    bg: string;
    border: string;
    badge: string;
  }
> = {
  director: {
    label: 'Dirección',
    hex: '#EF4444',
    text: 'text-rose-400',
    bg: 'bg-rose-950/60',
    border: 'border-rose-500/40',
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  },
  profesor: {
    label: 'Profesor',
    hex: '#3B82F6',
    text: 'text-blue-400',
    bg: 'bg-blue-950/60',
    border: 'border-blue-500/40',
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  },
  padre: {
    label: 'Padre de Familia',
    hex: '#10B981',
    text: 'text-emerald-400',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
  alumno: {
    label: 'Alumno',
    hex: '#A855F7',
    text: 'text-purple-400',
    bg: 'bg-purple-950/60',
    border: 'border-purple-500/40',
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  },
};
