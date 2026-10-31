import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  MessageSquare,
  Award,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Save,
  FileText,
  Bell,
  RefreshCw,
  X,
  Search,
  LogOut,
  ChevronLeft,
  Filter,
  Check,
  User,
  Send,
  Eye,
  Plus,
  ArrowLeft,
  School,
  Lock,
} from 'lucide-react';
import {
  SigaeUser,
  ScheduleBlock,
  StudentInstitutionalRecord,
  AttendanceSession,
  AttendanceCategory,
  SchoolDayOfWeek,
  InternalMessage,
} from '../../types';
import { scheduleService, SCHOOL_DAYS, OFFICIAL_PERIODS } from '../../firebase/scheduleService';
import { studentService } from '../../firebase/studentService';
import { attendanceService } from '../../firebase/attendanceService';
import { auth } from '../../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, query, where, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { UnifiedSchoolCalendar } from '../calendar/UnifiedSchoolCalendar';
import { NewCommunicationModal } from '../calendar/NewCommunicationModal';
import { TeacherKardexView } from '../kardex/TeacherKardexView';
import { NotificationBellDropdown } from '../notifications/NotificationBellDropdown';
import {
  cuadernoPedagogicoService,
  EvaluationActivity,
  AcademicSubmission,
} from '../../firebase/cuadernoPedagogicoService';

export type TeacherPortalTab =
  | 'inicio'
  | 'calendario'
  | 'clases_hoy'
  | 'cursos'
  | 'estudiantes'
  | 'horario'
  | 'asistencia'
  | 'calificaciones'
  | 'kardex'
  | 'comunicados'
  | 'mensajeria'
  | 'notificaciones'
  | 'perfil';

interface TeacherPortalViewProps {
  currentUser: SigaeUser;
  onLogout: () => void;
}

interface AssignedCourseSummary {
  courseCode: string;
  gradeLevel: string;
  parallel: string;
  subject: string;
  weeklyHours: number;
  studentsCount: number;
}

interface EvaluationItem {
  id: string;
  name: string;
  dimension: 'Saber' | 'Hacer' | 'Ser y Decidir' | 'Autoevaluacion';
  maxScore: number;
  date: string;
  courseCode: string;
  subject: string;
  scores: Record<string, number>; // studentId -> score
  isPublished: boolean;
}

interface InstitutionalAnnouncement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  targetCourses?: string[];
  createdAt: string;
  isRead?: boolean;
}

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({
  currentUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherPortalTab>('inicio');
  const [loading, setLoading] = useState(true);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<AssignedCourseSummary[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [teacherExpediente, setTeacherExpediente] = useState<any>(null);
  const [showTeacherCommModal, setShowTeacherCommModal] = useState(false);
  const [selectedTeacherCalCourse, setSelectedTeacherCalCourse] = useState('6A');

  // Selector de día para horario y clases
  const [selectedDay, setSelectedDay] = useState<SchoolDayOfWeek>('Lunes');
  const [showFullWeek, setShowFullWeek] = useState(false);

  // Espacio de Clase Activa (Abrir Clase)
  const [activeOpenClassBlock, setActiveOpenClassBlock] = useState<ScheduleBlock | null>(null);
  const [openClassStudents, setOpenClassStudents] = useState<StudentInstitutionalRecord[]>([]);

  // Vista Detalle de Curso Seleccionado
  const [activeSelectedCourse, setActiveSelectedCourse] = useState<AssignedCourseSummary | null>(null);

  // Nóminas y Ficha de Estudiante
  const [selectedCourseForList, setSelectedCourseForList] = useState<string>('');
  const [courseStudents, setCourseStudents] = useState<StudentInstitutionalRecord[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [viewingStudentFicha, setViewingStudentFicha] = useState<StudentInstitutionalRecord | null>(null);

  // Módulo de Asistencia Oficial
  const [attCourseCode, setAttCourseCode] = useState<string>('');
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attStudentsList, setAttStudentsList] = useState<StudentInstitutionalRecord[]>([]);
  const [attStates, setAttStates] = useState<Record<string, AttendanceCategory>>({});
  const [attNotes, setAttNotes] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attSuccessMessage, setAttSuccessMessage] = useState<string | null>(null);
  const [savedAttendanceSession, setSavedAttendanceSession] = useState<AttendanceSession | null>(null);
  const [attHistoryDates, setAttHistoryDates] = useState<string[]>([]);
  const [attSummaryView, setAttSummaryView] = useState(false);

  // Módulo de Calificaciones (Ley 070)
  const [evalCourseCode, setEvalCourseCode] = useState<string>('');
  const [evalList, setEvalList] = useState<EvaluationItem[]>([]);
  const [showCreateEvalModal, setShowCreateEvalModal] = useState(false);
  const [newEvalName, setNewEvalName] = useState('');
  const [newEvalDim, setNewEvalDim] = useState<'Saber' | 'Hacer' | 'Ser y Decidir' | 'Autoevaluacion'>('Saber');
  const [newEvalMax, setNewEvalMax] = useState(35);
  const [activeGradingEval, setActiveGradingEval] = useState<EvaluationItem | null>(null);
  const [tempScores, setTempScores] = useState<Record<string, number>>({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradesFeedback, setGradesFeedback] = useState<string | null>(null);
  const [cuadernoSubTab, setCuadernoSubTab] = useState<
    'nomina' | 'asistencia' | 'calificaciones' | 'trimestres' | 'boletin' | 'documentos'
  >('calificaciones');

  // Estado para exportación oficial a Excel XLSX (9 hojas)
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Estado para solicitud de incorporación formal a la nómina (aprobación de Dirección)
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [enrollFullName, setEnrollFullName] = useState('');
  const [enrollCi, setEnrollCi] = useState('');
  const [enrollRude, setEnrollRude] = useState('');
  const [enrollReason, setEnrollReason] = useState('Estudiante con traslado regular autorizado');
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);
  const [enrollmentSuccessMsg, setEnrollmentSuccessMsg] = useState<string | null>(null);

  // Estado para entrega formal a Dirección
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionDocType, setSubmissionDocType] = useState<
    'cuaderno_completo' | 'calificaciones_trimestre' | 'asistencia_trimestre' | 'nomina'
  >('cuaderno_completo');
  const [submissionTrimester, setSubmissionTrimester] = useState<'1T' | '2T' | '3T'>('1T');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [teacherSubmissions, setTeacherSubmissions] = useState<AcademicSubmission[]>([]);

  // Comunicados
  const [announcements, setAnnouncements] = useState<InstitutionalAnnouncement[]>([]);
  const [showCreateAnnounceModal, setShowCreateAnnounceModal] = useState(false);
  const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
  const [newAnnounceContent, setNewAnnounceContent] = useState('');
  const [newAnnounceTargetCourse, setNewAnnounceTargetCourse] = useState('todos');
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set());

  // Mensajería
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [selectedConversationUser, setSelectedConversationUser] = useState<any | null>(null);
  const [chatMessageText, setChatMessageText] = useState('');
  const [msgSearch, setMsgSearch] = useState('');

  // Perfil
  const [phoneInput, setPhoneInput] = useState(currentUser.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Notificaciones
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  // 1. Cargar datos maestros oficiales del profesor desde Firebase
  const loadTeacherData = async () => {
    setLoading(true);
    try {
      // Cargar expediente en /teachers si existe teacherId
      if (currentUser.teacherId) {
        try {
          const tDoc = await getDoc(doc(db, 'teachers', currentUser.teacherId));
          if (tDoc.exists()) {
            setTeacherExpediente(tDoc.data());
          }
        } catch (e) {
          console.warn('[TeacherPortal] Aviso leyendo /teachers:', e);
        }
      }

      // Obtener bloques de horario
      const iden = currentUser.teacherId || currentUser.displayName || '';
      const blocks = await scheduleService.getByTeacher(iden);
      setScheduleBlocks(blocks);

      // Cursos únicos
      const coursesMap = new Map<string, AssignedCourseSummary>();
      for (const b of blocks) {
        const key = `${b.courseCode}-${b.subject}`;
        if (!coursesMap.has(key)) {
          coursesMap.set(key, {
            courseCode: b.courseCode,
            gradeLevel: b.gradeLevel,
            parallel: b.parallel,
            subject: b.subject,
            weeklyHours: 1,
            studentsCount: 0,
          });
        } else {
          coursesMap.get(key)!.weeklyHours += 1;
        }
      }

      const list = Array.from(coursesMap.values());
      let totalEnrolled = 0;
      for (const c of list) {
        try {
          const stus = await studentService.getStudentsByCourse(c.courseCode);
          c.studentsCount = stus.length;
          totalEnrolled += stus.length;
        } catch {
          c.studentsCount = 0;
        }
      }

      if (list.length === 0) {
        // Asignación oficial docente según especialidad y cursos institucionales
        const defaultGrades = currentUser.assignedGrades || ['6° de Secundaria A', '5° de Secundaria A'];
        const subj = currentUser.specialty || 'Matemática';
        defaultGrades.forEach((g: string) => {
          const parts = g.split(' ');
          const parallel = parts[parts.length - 1] || 'A';
          const num = parseInt(parts[0]) || 6;
          const code = `${num}${parallel}`.toUpperCase();
          list.push({
            courseCode: code,
            gradeLevel: `${num}° de Secundaria`,
            parallel,
            subject: subj,
            weeklyHours: 4,
            studentsCount: 0,
          });
        });
      }

      setAssignedCourses(list);
      setTotalStudentsCount(totalEnrolled);

      if (list.length > 0) {
        setSelectedCourseForList(list[0].courseCode);
        setAttCourseCode(list[0].courseCode);
        setEvalCourseCode(list[0].courseCode);
      }

      // Cargar entregas formales presentadas a Dirección
      try {
        const subs = await cuadernoPedagogicoService.getSubmissionsByTeacher(currentUser.uid);
        setTeacherSubmissions(subs);
      } catch (e) {
        console.warn('[TeacherPortal] Aviso cargando entregas:', e);
      }

      // Determinar día actual
      const dayMap: Record<number, SchoolDayOfWeek> = {
        1: 'Lunes',
        2: 'Martes',
        3: 'Miércoles',
        4: 'Jueves',
        5: 'Viernes',
        6: 'Sábado',
      };
      const curDay = new Date().getDay();
      if (dayMap[curDay]) {
        setSelectedDay(dayMap[curDay]);
      }

      // Cargar comunicados oficiales iniciales
      setAnnouncements([
        {
          id: 'ann-01',
          title: 'Calendario Oficial del 1.er Trimestre — Gestión Escolar 2026',
          content: 'Se comunica al plantel docente de la U.E. Luis Espinal Tarde que el registro y consolidación de evaluaciones sobre 100 puntos concluye según cronograma distrital.',
          authorName: 'Lic. Gonzalo Fernández Mamani (Dirección)',
          authorRole: 'director',
          createdAt: '2026-03-01',
        },
        {
          id: 'ann-02',
          title: 'Lineamientos de Control de Asistencia y Justificaciones de Falta',
          content: 'Todo permiso o justificación médica debe ser visado formalmente por la Dirección antes de su registro como Licencia Justificada en la plataforma SIGAE.',
          authorName: 'Dirección General (SIE 80730142)',
          authorRole: 'director',
          createdAt: '2026-03-10',
        },
      ]);

      // Notificaciones iniciales
      setNotificationsList([
        {
          id: 'notif-1',
          title: 'Cuenta Docente Autorizada',
          description: 'Su expediente ha sido validado exitosamente para la Gestión 2026.',
          time: 'Reciente',
          type: 'success',
        },
        {
          id: 'notif-2',
          title: 'Registro de Asistencia Diario',
          description: 'Recuerde registrar la asistencia al inicio de cada período pedagógico.',
          time: 'Hoy',
          type: 'info',
        },
      ]);
    } catch (err) {
      console.error('[TeacherPortal] Error cargando datos docentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, [currentUser.uid, currentUser.teacherId]);

  // Cargar estudiantes cuando cambia el curso seleccionado en Listas
  useEffect(() => {
    if (selectedCourseForList) {
      studentService.getStudentsByCourse(selectedCourseForList).then(setCourseStudents);
    }
  }, [selectedCourseForList]);

  // Cargar estudiantes y sesión cuando cambia curso o fecha en Asistencia
  useEffect(() => {
    if (attCourseCode && attDate) {
      studentService.getStudentsByCourse(attCourseCode).then(async students => {
        setAttStudentsList(students);
        const session = await attendanceService.getSession(attCourseCode, attDate);
        setSavedAttendanceSession(session);

        const states: Record<string, AttendanceCategory> = {};
        const notes: Record<string, string> = {};

        if (session && session.records) {
          session.records.forEach(r => {
            states[r.studentId] = r.status;
            if (r.notes) notes[r.studentId] = r.notes;
          });
        } else {
          students.forEach(s => {
            states[s.id] = 'pendiente';
          });
        }
        setAttStates(states);
        setAttNotes(notes);
      });

      attendanceService.getRecordedDatesForCourse(attCourseCode).then(setAttHistoryDates);
    }
  }, [attCourseCode, attDate]);

  // Guardar Asistencia en Firestore con validación
  const handleSaveAttendance = async () => {
    if (!attCourseCode || !attDate) return;
    setSavingAttendance(true);
    setAttSuccessMessage(null);

    try {
      const records = attStudentsList.map(s => ({
        id: `att-rec-${s.id}-${attDate}`,
        studentId: s.id,
        studentName: s.fullName,
        ci: s.ci || '',
        rude: s.rude,
        status: attStates[s.id] || 'presente',
        registeredAt: new Date().toISOString(),
        notes: attNotes[s.id] || '',
      }));

      const presentCount = records.filter(r => r.status === 'presente').length;
      const absentCount = records.filter(r => r.status === 'ausente').length;
      const lateCount = records.filter(r => r.status === 'retraso').length;
      const leaveCount = records.filter(r => r.status === 'licencia').length;
      const pendingCount = records.filter(r => r.status === 'pendiente').length;

      const courseInfo = assignedCourses.find(c => c.courseCode === attCourseCode);

      const session: AttendanceSession = {
        id: `att-${attCourseCode}-${attDate}`,
        date: attDate,
        gradeNumber: parseInt(attCourseCode) || 6,
        gradeLevel: courseInfo?.gradeLevel || 'Secundaria',
        parallel: courseInfo?.parallel || 'A',
        courseCode: attCourseCode,
        shift: 'tarde',
        academicYear: '2026',
        totalEnrolled: attStudentsList.length,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        pendingCount,
        records,
        lastUpdated: new Date().toISOString(),
      };

      await attendanceService.saveSession(session);
      setSavedAttendanceSession(session);
      setAttSuccessMessage('¡Asistencia guardada y confirmada exitosamente en Cloud Firestore!');
      const dates = await attendanceService.getRecordedDatesForCourse(attCourseCode);
      setAttHistoryDates(dates);
      setTimeout(() => setAttSuccessMessage(null), 4000);
    } catch (err: any) {
      setAttSuccessMessage(`Error al guardar asistencia: ${err.message}`);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Abrir espacio de clase del día
  const handleOpenClass = async (block: ScheduleBlock) => {
    setActiveOpenClassBlock(block);
    try {
      const students = await studentService.getStudentsByCourse(block.courseCode);
      setOpenClassStudents(students);
    } catch {
      setOpenClassStudents([]);
    }
  };

  // Guardar calificaciones
  const handleSaveGradesBorrador = (publish = false) => {
    if (!activeGradingEval) return;
    setSavingGrades(true);
    setGradesFeedback(null);

    const updated = {
      ...activeGradingEval,
      scores: { ...tempScores },
      isPublished: publish,
    };

    setEvalList(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    setSavingGrades(false);
    setGradesFeedback(
      publish
        ? '¡Calificaciones publicadas oficialmente para consulta de familias!'
        : '¡Borrador de calificaciones guardado exitosamente!'
    );
    setTimeout(() => {
      setGradesFeedback(null);
      if (publish) setActiveGradingEval(null);
    }, 2500);
  };

  // Crear nueva evaluación
  const handleCreateEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvalName.trim()) return;

    const newEval: EvaluationItem = {
      id: `eval-${Date.now()}`,
      name: newEvalName.trim(),
      dimension: newEvalDim,
      maxScore: newEvalMax,
      date: new Date().toISOString().split('T')[0],
      courseCode: evalCourseCode,
      subject: assignedCourses.find(c => c.courseCode === evalCourseCode)?.subject || 'Materia Oficial',
      scores: {},
      isPublished: false,
    };

    setEvalList(prev => [newEval, ...prev]);
    setShowCreateEvalModal(false);
    setNewEvalName('');
  };

  // Descargar Cuaderno Pedagógico en Excel Oficial (9 Hojas XLSX)
  const handleDownloadExcel = () => {
    try {
      setIsExportingExcel(true);
      const courseObj = assignedCourses.find(c => c.courseCode === evalCourseCode);
      const subject = courseObj?.subject || currentUser.specialty || 'Matemática';

      const scoresMap: Record<string, Record<string, number>> = {};
      evalList.forEach(ev => {
        scoresMap[ev.id] = ev.scores || {};
      });

      const { blob, fileName } = cuadernoPedagogicoService.generateCuadernoXLSX({
        institutionName: 'U.E. LUIS ESPINAL TARDE DE COLLPANI',
        sie: '80730142',
        academicYear: '2026',
        teacherName: currentUser.displayName,
        directorName: 'Lic. Gonzalo Fernández Mamani / Emanuel Cóndorcet Huanca',
        courseCode: evalCourseCode || '6A',
        gradeLevel: courseObj?.gradeLevel || '6° de Secundaria',
        parallel: courseObj?.parallel || 'A',
        subject,
        students: courseStudents,
        activities1T: evalList.map(ev => ({
          ...ev,
          academicYear: '2026',
          gradeLevel: courseObj?.gradeLevel || '6° de Secundaria',
          parallel: courseObj?.parallel || 'A',
          teacherUid: currentUser.uid,
          teacherName: currentUser.displayName,
          trimester: '1T',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        scores1T: scoresMap,
      });

      cuadernoPedagogicoService.downloadExcelBlob(blob, fileName);
      setGradesFeedback(`¡Cuaderno pedagógico descargado exitosamente: ${fileName}!`);
      setTimeout(() => setGradesFeedback(null), 5000);
    } catch (err: any) {
      console.error('Error generando Excel:', err);
      alert(`Error al generar Excel: ${err.message}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Enviar entrega digital a Dirección
  const handleSubmitCuadernoToDirection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDoc(true);
    try {
      const courseObj = assignedCourses.find(c => c.courseCode === evalCourseCode);
      await cuadernoPedagogicoService.submitCuadernoToDirection({
        teacherUid: currentUser.uid,
        teacherName: currentUser.displayName,
        teacherEmail: currentUser.email,
        courseCode: evalCourseCode || '6A',
        gradeLevel: courseObj?.gradeLevel || '6° de Secundaria',
        parallel: courseObj?.parallel || 'A',
        subject: courseObj?.subject || currentUser.specialty || 'General',
        trimester: submissionTrimester,
        documentType: submissionDocType,
        totalStudents: courseStudents.length,
        activitiesCount: evalList.length,
      });

      setShowSubmissionModal(false);
      setGradesFeedback('¡Entrega digital presentada exitosamente a Dirección para revisión institucional!');
      const subs = await cuadernoPedagogicoService.getSubmissionsByTeacher(currentUser.uid);
      setTeacherSubmissions(subs);
      setTimeout(() => setGradesFeedback(null), 6000);
    } catch (err: any) {
      console.error('Error al presentar a dirección:', err);
      alert(`Error al presentar a dirección: ${err.message}`);
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  // Solicitar incorporación de nuevo estudiante a la nómina oficial
  const handleEnrollmentRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollFullName.trim() || !enrollRude.trim()) {
      alert('Nombre y RUDE son obligatorios.');
      return;
    }
    setIsSubmittingEnrollment(true);
    try {
      const courseObj = assignedCourses.find(c => c.courseCode === evalCourseCode);
      await studentService.requestStudentEnrollment({
        fullName: enrollFullName.trim(),
        ci: enrollCi.trim(),
        rude: enrollRude.trim(),
        courseCode: evalCourseCode || '6A',
        gradeLevel: courseObj?.gradeLevel || '6° de Secundaria',
        parallel: courseObj?.parallel || 'A',
        teacherUid: currentUser.uid,
        teacherName: currentUser.displayName,
        reason: enrollReason.trim(),
      });

      setShowEnrollmentModal(false);
      setEnrollmentSuccessMsg('Solicitud enviada a Dirección. Una vez aprobada la matrícula, el estudiante aparecerá en todas las materias.');
      setEnrollFullName('');
      setEnrollCi('');
      setEnrollRude('');
      setTimeout(() => setEnrollmentSuccessMsg(null), 6000);
    } catch (err: any) {
      alert(`Error al enviar solicitud: ${err.message}`);
    } finally {
      setIsSubmittingEnrollment(false);
    }
  };

  // Publicar comunicado
  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnounceTitle.trim() || !newAnnounceContent.trim()) return;

    const ann: InstitutionalAnnouncement = {
      id: `ann-${Date.now()}`,
      title: newAnnounceTitle.trim(),
      content: newAnnounceContent.trim(),
      authorName: currentUser.displayName,
      authorRole: 'profesor',
      targetCourses: newAnnounceTargetCourse === 'todos' ? assignedCourses.map(c => c.courseCode) : [newAnnounceTargetCourse],
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAnnouncements(prev => [ann, ...prev]);
    setShowCreateAnnounceModal(false);
    setNewAnnounceTitle('');
    setNewAnnounceContent('');
  };

  // Guardar datos personales
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        phone: phoneInput.trim(),
        updatedAt: new Date().toISOString(),
      });
      setProfileMsg('¡Teléfono personal actualizado correctamente!');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileMsg(`Error al actualizar perfil: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // Cambiar contraseña oficial
  const handlePasswordReset = async () => {
    if (!currentUser.email) return;
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setPasswordResetSent(true);
      setTimeout(() => setPasswordResetSent(false), 5000);
    } catch (err: any) {
      alert(`Error al solicitar restablecimiento de contraseña: ${err.message}`);
    }
  };

  // Enviar mensaje de chat
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !selectedConversationUser) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      senderName: currentUser.displayName,
      senderRole: 'profesor',
      recipientId: selectedConversationUser.id,
      recipientName: selectedConversationUser.name,
      text: chatMessageText.trim(),
      time: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setMessagesList(prev => [...prev, newMsg]);
    setChatMessageText('');
  };

  const navMenuItems: { id: TeacherPortalTab; label: string; icon: any }[] = [
    { id: 'inicio', label: 'Inicio / Resumen', icon: Briefcase },
    { id: 'calendario', label: 'Mi calendario', icon: Calendar },
    { id: 'clases_hoy', label: 'Mis clases de hoy', icon: Clock },
    { id: 'cursos', label: 'Mis cursos y materias', icon: BookOpen },
    { id: 'estudiantes', label: 'Listas de estudiantes', icon: Users },
    { id: 'horario', label: 'Mi horario', icon: Calendar },
    { id: 'asistencia', label: 'Asistencia', icon: CheckCircle2 },
    { id: 'calificaciones', label: 'Calificaciones', icon: Award },
    { id: 'kardex', label: 'Kárdex de estudiantes', icon: AlertCircle },
    { id: 'comunicados', label: 'Comunicados', icon: Bell },
    { id: 'mensajeria', label: 'Mensajería interna', icon: MessageSquare },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'perfil', label: 'Mi perfil', icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-300">
          Cargando Portal Docente oficial desde Cloud Firestore...
        </span>
      </div>
    );
  }

  // Clases del día seleccionado
  const dayClasses = scheduleBlocks.filter(b => b.dayOfWeek === selectedDay);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-indigo-600 selection:text-white">
      {/* =========================================================================
          1. MENÚ LATERAL DEL PROFESOR (12 FUNCIONES ESTRICTAS)
         ========================================================================= */}
      <aside className="w-full lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 lg:sticky lg:top-0 lg:h-screen z-30">
        {/* Identidad Institucional */}
        <div className="p-4.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-white font-mono block">
                SIGAE
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 truncate max-w-[140px]">
                U.E. Luis Espinal Tarde
              </span>
            </div>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300">
            SIE 80730142
          </span>
        </div>

        {/* Ficha rápida del docente */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0 text-xs">
              {currentUser.displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {currentUser.displayName}
              </div>
              <div className="text-[10px] text-amber-400 font-mono">
                {currentUser.teacherId || 'Expediente Docente'}
              </div>
            </div>
          </div>
        </div>

        {/* 12 Ítems de navegación */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setActiveOpenClassBlock(null);
                  setActiveSelectedCourse(null);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Botón 12: Cerrar sesión */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-all cursor-pointer mt-3 border-t border-slate-800/80 pt-3"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </nav>
      </aside>

      {/* =========================================================================
          2. ÁREA PRINCIPAL DE CONTENIDO
         ========================================================================= */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        {/* Encabezado Oficial del Panel Docente */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Portal Docente — SIGAE
              </h1>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                ACCESO PRIVADO DOCENTE
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Profesor: <strong className="text-white">{currentUser.displayName}</strong></span>
              <span>·</span>
              <span>Especialidad: <strong className="text-slate-200">{currentUser.specialty || teacherExpediente?.specialty || 'Secundaria Técnica'}</strong></span>
              <span>·</span>
              <span>Gestión: <strong className="text-slate-200">2026</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTeacherData}
              title="Actualizar datos oficiales"
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {/* Campana de Notificaciones Oficial */}
            <NotificationBellDropdown
              currentUserUid={currentUser.uid}
              onNavigateToItem={(type) => {
                if (type === 'kardex') setActiveTab('kardex');
                else if (type === 'comunicado') setActiveTab('comunicados');
              }}
            />
          </div>
        </div>

        {/* AVISO SI NO POSEE ASIGNACIONES OFICIALES */}
        {assignedCourses.length === 0 && (
          <div className="p-6 bg-slate-900 border border-amber-500/30 rounded-3xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <h2 className="text-base font-bold text-white">
              Tu cuenta está autorizada, pero la Dirección todavía no te ha asignado cursos o materias
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              La Dirección de la U.E. Luis Espinal Tarde de Collpani (SIE 80730142) debe asignar sus paralelos curriculares y carga horaria en el sistema para que aparezcan en este panel.
            </p>
          </div>
        )}

        {/* =====================================================================
            VISTA 1: INICIO / RESUMEN
           ===================================================================== */}
        {activeTab === 'inicio' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Banner resumen de actividades docentes */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Resumen de mis actividades docentes
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Hoy es {selectedDay}
                </span>
              </div>
              <h2 className="text-lg font-bold">
                Bienvenido(a), {currentUser.displayName}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Desde este portal puede registrar asistencia diaria, asentar notas por dimensiones bajo la Ley 070, consultar su horario semanal verificado y comunicarse con las familias tuteladas.
              </p>

              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setActiveTab('clases_hoy')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-600/20"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mis clases de hoy ({dayClasses.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('asistencia')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Registrar Asistencia</span>
                </button>
                <button
                  onClick={() => setActiveTab('calificaciones')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Planilla de Notas</span>
                </button>
              </div>
            </div>

            {/* Métricas Reales desde Firestore */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Cursos Asignados</span>
                  <BookOpen className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {assignedCourses.length} <span className="text-xs font-normal text-slate-500">paralelos</span>
                </div>
                <div className="text-[11px] text-slate-400">U.E. Luis Espinal Tarde</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Alumnos a Cargo</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {totalStudentsCount} <span className="text-xs font-normal text-slate-500">matriculados</span>
                </div>
                <div className="text-[11px] text-emerald-400">Padrón oficial institucional</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Clases Asignadas Hoy</span>
                  <Clock className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {dayClasses.length} <span className="text-xs font-normal text-slate-500">períodos</span>
                </div>
                <div className="text-[11px] text-slate-400">Turno oficial</div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Régimen Curricular</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  1.er TRIMESTRE EN CURSO
                </div>
                <div className="text-[11px] text-slate-400">Reglamento Ley 070</div>
              </div>
            </div>

            {/* Clases del día con acceso directo */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Próximos bloques de su horario ({selectedDay})</span>
                </h3>
                <button
                  onClick={() => setActiveTab('clases_hoy')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  Ver todas las clases →
                </button>
              </div>

              {dayClasses.length === 0 ? (
                <div className="p-6 bg-slate-950 rounded-2xl text-center text-xs text-slate-400">
                  No tiene clases pedagógicas asignadas el día {selectedDay}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dayClasses.map(b => (
                    <div
                      key={b.id}
                      className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-amber-400">
                          {b.startTime} - {b.endTime} · Período {b.periodNumber}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5">{b.subject}</h4>
                        <span className="text-xs text-slate-400">
                          {b.gradeLevel} · Paralelo {b.parallel} ({b.classroom || 'Aula'})
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          handleOpenClass(b);
                          setActiveTab('clases_hoy');
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-600/20"
                      >
                        Abrir clase
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            VISTA: MI CALENDARIO PEDAGÓGICO
           ===================================================================== */}
        {activeTab === 'calendario' && (
          <div className="space-y-6 animate-in fade-in">
            <UnifiedSchoolCalendar
              currentUser={currentUser}
              courseCode={selectedTeacherCalCourse || assignedCourses[0]?.courseCode || '6A'}
              allowedCourseCodes={
                assignedCourses.length > 0
                  ? assignedCourses.map(c => c.courseCode)
                  : ['6A', '6B', '5A']
              }
              onSelectCourse={setSelectedTeacherCalCourse}
              onOpenNewEventModal={() => setShowTeacherCommModal(true)}
            />
          </div>
        )}

        {/* =====================================================================
            VISTA 2: MIS CLASES DE HOY
           ===================================================================== */}
        {activeTab === 'clases_hoy' && (
          <div className="space-y-5 animate-in fade-in">
            {activeOpenClassBlock ? (
              /* Espacio del Aula / Clase Abierta */
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <button
                    onClick={() => setActiveOpenClassBlock(null)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a clases de hoy</span>
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeOpenClassBlock.startTime} - {activeOpenClassBlock.endTime}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-black text-white">
                    {activeOpenClassBlock.subject}
                  </h2>
                  <p className="text-xs text-slate-300">
                    {activeOpenClassBlock.gradeLevel} · Paralelo {activeOpenClassBlock.parallel} · {activeOpenClassBlock.classroom || 'Aula Oficial'}
                  </p>
                </div>

                {/* Acciones autorizadas de la clase */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      setAttCourseCode(activeOpenClassBlock.courseCode);
                      setActiveTab('asistencia');
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Registrar Asistencia de esta clase</span>
                  </button>
                  <button
                    onClick={() => {
                      setEvalCourseCode(activeOpenClassBlock.courseCode);
                      setActiveTab('calificaciones');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Calificaciones del grupo</span>
                  </button>
                </div>

                {/* Nómina de estudiantes de la clase */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Nómina autorizada de la clase ({openClassStudents.length} estudiantes)</span>
                  </h3>
                  <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                    {openClassStudents.map((stu, i) => (
                      <div
                        key={stu.id}
                        className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 font-mono text-slate-500">{i + 1}.</span>
                          <span className="font-semibold text-white">{stu.fullName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Matriculado Oficial
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Lista de clases del día seleccionado */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Mis Clases del Día ({selectedDay})</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Horarios y asignaciones confirmados en Firestore
                    </p>
                  </div>

                  {/* Selector de días */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {SCHOOL_DAYS.slice(0, 5).map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedDay === day
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {dayClasses.length === 0 ? (
                  <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                    <Clock className="w-6 h-6 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">
                      No tiene clases registradas el día <strong className="text-white">{selectedDay}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayClasses.map(b => (
                      <div
                        key={b.id}
                        className="p-5 bg-slate-900 border border-slate-800 hover:border-amber-700/50 rounded-2xl transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-amber-400 font-semibold">
                              Período {b.periodNumber} · {b.startTime} - {b.endTime}
                            </span>
                            <h3 className="text-base font-bold text-white mt-1">
                              {b.subject}
                            </h3>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {b.gradeLevel} · Paralelo {b.parallel}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                            {b.classroom || 'Aula'}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                          <button
                            onClick={() => handleOpenClass(b)}
                            className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-600/20"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Abrir clase</span>
                          </button>
                          <button
                            onClick={() => {
                              setAttCourseCode(b.courseCode);
                              setActiveTab('asistencia');
                            }}
                            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Asistencia</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 3: MIS CURSOS Y MATERIAS
           ===================================================================== */}
        {activeTab === 'cursos' && (
          <div className="space-y-5 animate-in fade-in">
            {activeSelectedCourse ? (
              /* Página de Detalle del Curso Seleccionado */
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <button
                    onClick={() => setActiveSelectedCourse(null)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a mis cursos</span>
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    Código {activeSelectedCourse.courseCode}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-lg font-black text-white">
                    {activeSelectedCourse.subject}
                  </h2>
                  <p className="text-xs text-slate-300">
                    {activeSelectedCourse.gradeLevel} · Paralelo {activeSelectedCourse.parallel} · {activeSelectedCourse.studentsCount} alumnos matriculados
                  </p>
                </div>

                {/* Botones de acción del curso */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <button
                    onClick={() => {
                      setSelectedCourseForList(activeSelectedCourse.courseCode);
                      setActiveTab('estudiantes');
                    }}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-600 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Ver estudiantes</span>
                  </button>
                  <button
                    onClick={() => {
                      setAttCourseCode(activeSelectedCourse.courseCode);
                      setActiveTab('asistencia');
                    }}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-600 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Registrar asistencia</span>
                  </button>
                  <button
                    onClick={() => {
                      setEvalCourseCode(activeSelectedCourse.courseCode);
                      setActiveTab('calificaciones');
                    }}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-600 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Calificaciones</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('horario')}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-600 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Ver horario</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Lista de cursos asignados */
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Mis Asignaciones Oficiales</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cursos y materias configurados por la Dirección
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedCourses.map(course => (
                    <div
                      key={`${course.courseCode}-${course.subject}`}
                      onClick={() => setActiveSelectedCourse(course)}
                      className="p-5 bg-slate-900 border border-slate-800 hover:border-amber-600/70 rounded-2xl transition-all space-y-3 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-950 border border-amber-800/60">
                            Curso {course.courseCode}
                          </span>
                          <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors mt-1.5">
                            {course.subject}
                          </h3>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {course.gradeLevel} · Paralelo {course.parallel}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {course.weeklyHours} hrs/sem
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <span>{course.studentsCount} alumnos matriculados</span>
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          Gestionar curso →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 4: LISTAS DE ESTUDIANTES
           ===================================================================== */}
        {activeTab === 'estudiantes' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Listas Oficiales de Estudiantes</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Nómina autorizada de matriculados por curso
                </p>
              </div>

              {/* Selector de Curso */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Curso:</span>
                <select
                  value={selectedCourseForList}
                  onChange={e => setSelectedCourseForList(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {assignedCourses.map(c => (
                    <option key={c.courseCode} value={c.courseCode}>
                      {c.gradeLevel} {c.parallel} ({c.courseCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o RUDE..."
                value={studentSearchTerm}
                onChange={e => setStudentSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Lista de Alumnos */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
              {courseStudents
                .filter(s =>
                  !studentSearchTerm ||
                  s.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                  s.rude.includes(studentSearchTerm)
                )
                .map((stu, i) => (
                  <div
                    key={stu.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-xs font-mono text-slate-500 text-right">{i + 1}.</span>
                      <div>
                        <div className="text-xs font-bold text-white">{stu.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Matrícula Oficial · Turno Tarde
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingStudentFicha(stu)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Ver ficha
                      </button>
                      <button
                        onClick={() => {
                          setAttCourseCode(selectedCourseForList);
                          setActiveTab('asistencia');
                        }}
                        className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Asistencia
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Ficha Pedagógica del Estudiante */}
            {viewingStudentFicha && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-400" />
                      <span>Ficha del Estudiante</span>
                    </h3>
                    <button
                      onClick={() => setViewingStudentFicha(null)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Nombre Completo:</span>
                      <span className="font-bold text-white text-sm">{viewingStudentFicha.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Curso y Paralelo:</span>
                      <span className="font-medium text-slate-200">{viewingStudentFicha.gradeLevel} · Paralelo {viewingStudentFicha.parallel}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Código RUDE Oficial:</span>
                      <span className="font-mono text-slate-300">{viewingStudentFicha.rude}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Estado de Matrícula:</span>
                      <span className="text-emerald-400 font-semibold">Efectivo / Regular (Gestión 2026)</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => setViewingStudentFicha(null)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 5: MI HORARIO
           ===================================================================== */}
        {activeTab === 'horario' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Mi Horario Semanal Docente</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Períodos oficiales del Turno Tarde de la U.E. Luis Espinal Tarde
                </p>
              </div>

              {/* Botones de navegación de horario */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowFullWeek(!showFullWeek)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  {showFullWeek ? 'Ver por día' : 'Ver semana completa'}
                </button>
                <div className="flex items-center gap-1">
                  {SCHOOL_DAYS.slice(0, 5).map(day => (
                    <button
                      key={day}
                      onClick={() => {
                        setSelectedDay(day);
                        setShowFullWeek(false);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedDay === day && !showFullWeek
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {showFullWeek ? (
              /* Vista Semana Completa */
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {SCHOOL_DAYS.slice(0, 5).map(d => {
                  const bks = scheduleBlocks.filter(b => b.dayOfWeek === d);
                  return (
                    <div key={d} className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                      <div className="text-xs font-bold text-amber-400 pb-1.5 border-b border-slate-800">
                        {d}
                      </div>
                      {bks.length === 0 ? (
                        <div className="text-[11px] text-slate-600 py-3 text-center">Sin clases</div>
                      ) : (
                        bks.map(b => (
                          <div key={b.id} className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px]">
                            <div className="font-semibold text-white">{b.subject}</div>
                            <div className="text-slate-400">{b.courseCode} · {b.startTime}</div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Vista Día Individual */
              <div className="space-y-3">
                {OFFICIAL_PERIODS.map(period => {
                  const block = dayClasses.find(b => b.periodNumber === period.periodNumber);
                  if (period.isBreak) {
                    return (
                      <div
                        key="recreo"
                        className="py-2 px-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-500 flex justify-between"
                      >
                        <span>Recreo General (10:45 - 11:00)</span>
                        <span className="font-mono">15 min</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`per-${period.periodNumber}`}
                      className={`p-4 rounded-2xl border transition-all ${
                        block
                          ? 'bg-slate-900 border-amber-800/50 hover:border-amber-600'
                          : 'bg-slate-900/40 border-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            block ? 'bg-amber-600/20 text-amber-400' : 'bg-slate-800 text-slate-600'
                          }`}>
                            P{period.periodNumber}
                          </div>
                          <div>
                            <div className="text-xs font-mono text-slate-400">
                              {period.startTime} - {period.endTime}
                            </div>
                            {block ? (
                              <div className="text-sm font-bold text-white mt-0.5">
                                {block.subject} ({block.gradeLevel} · Paralelo {block.parallel})
                              </div>
                            ) : (
                              <div className="text-xs text-slate-600">Sin período programado</div>
                            )}
                          </div>
                        </div>

                        {block && (
                          <button
                            onClick={() => {
                              handleOpenClass(block);
                              setActiveTab('clases_hoy');
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            Abrir
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 6: ASISTENCIA OFICIAL
           ===================================================================== */}
        {activeTab === 'asistencia' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Control Diario de Asistencia Escolar</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Registro oficial en tiempo real guardado en Cloud Firestore
                </p>
              </div>

              {/* Botón Resumen */}
              <button
                onClick={() => setAttSummaryView(!attSummaryView)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                {attSummaryView ? 'Volver a registro' : 'Ver resumen y estadísticas'}
              </button>
            </div>

            {/* Paso 1: Selección de Curso y Fecha */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <span className="text-slate-400 block text-[10px]">Curso a evaluar:</span>
                  <select
                    value={attCourseCode}
                    onChange={e => setAttCourseCode(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    {assignedCourses.map(c => (
                      <option key={c.courseCode} value={c.courseCode}>
                        {c.gradeLevel} {c.parallel} ({c.courseCode} - {c.subject})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Fecha oficial:</span>
                  <input
                    type="date"
                    value={attDate}
                    onChange={e => setAttDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all: Record<string, AttendanceCategory> = {};
                    attStudentsList.forEach(s => (all[s.id] = 'presente'));
                    setAttStates(all);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline text-[11px]"
                >
                  Marcar todos presentes
                </button>
              </div>
            </div>

            {/* Mensajes de Confirmación Real */}
            {attSuccessMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                attSuccessMessage.includes('Error')
                  ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                  : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
              }`}>
                {attSuccessMessage}
              </div>
            )}

            {attSummaryView ? (
              /* Vista Resumen */
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
                <h3 className="text-sm font-bold text-white">
                  Resumen de Asistencia para Curso {attCourseCode}
                </h3>
                {savedAttendanceSession ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950 rounded-xl text-center">
                      <span className="text-xs text-slate-400 block">Presentes</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">{savedAttendanceSession.presentCount}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl text-center">
                      <span className="text-xs text-slate-400 block">Ausentes</span>
                      <span className="text-xl font-bold font-mono text-rose-400">{savedAttendanceSession.absentCount}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl text-center">
                      <span className="text-xs text-slate-400 block">Retrasos</span>
                      <span className="text-xl font-bold font-mono text-amber-400">{savedAttendanceSession.lateCount}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl text-center">
                      <span className="text-xs text-slate-400 block">Licencias</span>
                      <span className="text-xl font-bold font-mono text-sky-400">{savedAttendanceSession.leaveCount}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    No existe registro de asistencia guardado aún para la fecha {attDate}.
                  </p>
                )}

                <div className="pt-3 border-t border-slate-800 text-xs">
                  <span className="font-semibold text-slate-300">Fechas con asistencia registrada:</span>
                  <div className="flex gap-2 flex-wrap pt-2">
                    {attHistoryDates.map(d => (
                      <button
                        key={d}
                        onClick={() => {
                          setAttDate(d);
                          setAttSummaryView(false);
                        }}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono hover:text-white"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Paso 2 y 3: Lista y Guardado */
              <div className="space-y-2">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
                  {attStudentsList.map((stu, i) => {
                    const st = attStates[stu.id] || 'pendiente';
                    return (
                      <div
                        key={stu.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 font-mono text-slate-500">{i + 1}.</span>
                          <div>
                            <span className="font-semibold text-white">{stu.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">RUDE: {stu.rude}</span>
                          </div>
                        </div>

                        {/* Selector de estados oficiales */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {(['presente', 'ausente', 'retraso', 'licencia', 'pendiente'] as AttendanceCategory[]).map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setAttStates(prev => ({ ...prev, [stu.id]: cat }))}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                                st === cat
                                  ? cat === 'presente'
                                    ? 'bg-emerald-600 text-white'
                                    : cat === 'ausente'
                                    ? 'bg-rose-600 text-white'
                                    : cat === 'retraso'
                                    ? 'bg-amber-600 text-white'
                                    : cat === 'licencia'
                                    ? 'bg-sky-600 text-white'
                                    : 'bg-slate-700 text-white'
                                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón Guardar Asistencia */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-600/20 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingAttendance ? 'Guardando en Firestore...' : 'Guardar asistencia oficial'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 7: MI CUADERNO PEDAGÓGICO (RESOLUCIÓN MINISTERIAL 001/2026 - LEY 070)
           ===================================================================== */}
        {activeTab === 'calificaciones' && (
          <div className="space-y-5 animate-in fade-in">
            {/* 30.1 ENCABEZADO INSTITUCIONAL DEL CUADERNO PEDAGÓGICO */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 rounded-3xl text-white shadow-lg space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black tracking-tight text-white">
                        Mi Cuaderno Pedagógico Digital
                      </h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                        R.M. 001/2026 · Ley 070
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      U.E. Luis Espinal Tarde de Collpani (SIE: 80730142) · Docente: <strong className="text-white">{currentUser.displayName}</strong> · Gestión: 2026
                    </p>
                  </div>
                </div>

                {/* Acciones principales del Cuaderno */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={handleDownloadExcel}
                    disabled={isExportingExcel}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isExportingExcel ? 'Generando...' : 'Descargar Excel Oficial (9 Hojas)'}</span>
                  </button>

                  <button
                    onClick={() => setShowSubmissionModal(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Presentar a Dirección</span>
                  </button>
                </div>
              </div>

              {/* Selector de Asignaciones Reales del Docente */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-semibold">Curso y Materia:</span>
                  <select
                    value={evalCourseCode}
                    onChange={e => {
                      setEvalCourseCode(e.target.value);
                      setSelectedCourseForList(e.target.value);
                    }}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {assignedCourses.map(c => (
                      <option key={c.courseCode} value={c.courseCode}>
                        {c.gradeLevel} {c.parallel} ({c.courseCode}) — {c.subject}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                  <span>Matrícula activa: <strong className="text-emerald-400 font-bold">{courseStudents.length}</strong> estudiantes</span>
                  <span>Turno: <strong className="text-white">Tarde</strong></span>
                </div>
              </div>
            </div>

            {/* Banners de Notificación de Estado */}
            {gradesFeedback && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <span>{gradesFeedback}</span>
                <button onClick={() => setGradesFeedback(null)} className="text-emerald-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {enrollmentSuccessMsg && (
              <div className="p-3.5 bg-sky-950/80 border border-sky-800 text-sky-300 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
                <span>{enrollmentSuccessMsg}</span>
                <button onClick={() => setEnrollmentSuccessMsg(null)} className="text-sky-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 30.2 NAVEGACIÓN DEL CUADERNO PEDAGÓGICO (6 PESTAÑAS CANÓNICAS) */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 text-xs">
              <button
                onClick={() => setCuadernoSubTab('nomina')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  cuadernoSubTab === 'nomina'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Nómina</span>
              </button>

              <button
                onClick={() => setCuadernoSubTab('asistencia')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  cuadernoSubTab === 'asistencia'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Asistencia</span>
              </button>

              <button
                onClick={() => setCuadernoSubTab('calificaciones')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  cuadernoSubTab === 'calificaciones'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Calificaciones</span>
              </button>

              <button
                onClick={() => setCuadernoSubTab('trimestres')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  cuadernoSubTab === 'trimestres'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Trimestres</span>
              </button>

              <button
                onClick={() => setCuadernoSubTab('boletin')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  cuadernoSubTab === 'boletin'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Boletín</span>
              </button>

              <button
                onClick={() => setCuadernoSubTab('documentos')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  cuadernoSubTab === 'documentos'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Documentos</span>
              </button>
            </div>

            {/* =================================================================
                PESTAÑA 1: NÓMINA OFICIAL DE ESTUDIANTES
               ================================================================= */}
            {cuadernoSubTab === 'nomina' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Nómina Institucional de Estudiantes ({courseStudents.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Curso: {evalCourseCode} · Matrículas efectivas aprobadas por la Dirección
                    </p>
                  </div>

                  <button
                    onClick={() => setShowEnrollmentModal(true)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Solicitar incorporación a la nómina</span>
                  </button>
                </div>

                {courseStudents.length === 0 ? (
                  <div className="p-10 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto opacity-40" />
                    <p className="text-xs text-slate-400">Este curso todavía no tiene estudiantes matriculados</p>
                    <p className="text-[11px] text-slate-500">
                      Cuando la Dirección registre o apruebe solicitudes de matrícula, los estudiantes aparecerán aquí automáticamente.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
                    <div className="p-3 bg-slate-950 text-[11px] font-bold text-slate-400 grid grid-cols-12 gap-2">
                      <span className="col-span-1">N.º</span>
                      <span className="col-span-5">Apellidos y nombres</span>
                      <span className="col-span-3">Código RUDE / CI</span>
                      <span className="col-span-1 text-center">Estado</span>
                      <span className="col-span-2 text-right">Opciones</span>
                    </div>

                    {courseStudents.map((st, i) => (
                      <div key={st.id} className="p-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-850/40">
                        <span className="col-span-1 font-mono text-slate-500">{i + 1}.</span>
                        <div className="col-span-5">
                          <span className="font-semibold text-white block">{st.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Exp: {st.internalCode || 'S/E'}</span>
                        </div>
                        <div className="col-span-3 text-[11px] font-mono text-slate-300">
                          <div>RUDE: {st.rude}</div>
                          {st.ci && <div className="text-slate-500">CI: {st.ci} {st.ciExpedition || 'LP'}</div>}
                        </div>
                        <span className="col-span-1 text-center text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-bold capitalize">
                          {st.enrollmentStatus || 'efectivo'}
                        </span>
                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingStudentFicha(st)}
                            title="Ver expediente autorizado"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCourseForList(evalCourseCode);
                              setActiveTab('kardex');
                            }}
                            title="Ver o registrar Kárdex"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                PESTAÑA 2: ASISTENCIA COMPARTIDA (REGISTRO OFICIAL)
               ================================================================= */}
            {cuadernoSubTab === 'asistencia' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Registro Oficial de Asistencia de la Materia</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Fecha: {attDate} · Curso: {evalCourseCode} · {assignedCourses.find(c => c.courseCode === evalCourseCode)?.subject}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={attDate}
                      onChange={e => setAttDate(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance || courseStudents.length === 0}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-600/20 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingAttendance ? 'Guardando...' : 'Guardar asistencia'}</span>
                    </button>
                  </div>
                </div>

                {attSuccessMessage && (
                  <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold">
                    {attSuccessMessage}
                  </div>
                )}

                {courseStudents.length === 0 ? (
                  <div className="p-10 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto opacity-40" />
                    <p className="text-xs text-slate-400">Este curso todavía no tiene estudiantes matriculados</p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
                    {courseStudents.map((stu, i) => {
                      const st = attStates[stu.id] || 'presente';
                      return (
                        <div key={stu.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-850/40">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 font-mono text-slate-500">{i + 1}.</span>
                            <div>
                              <span className="font-semibold text-white">{stu.fullName}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">RUDE: {stu.rude}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {(['presente', 'ausente', 'retraso', 'licencia'] as AttendanceCategory[]).map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setAttStates(prev => ({ ...prev, [stu.id]: cat }))}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                                  st === cat
                                    ? cat === 'presente'
                                      ? 'bg-emerald-600 text-white'
                                      : cat === 'ausente'
                                      ? 'bg-rose-600 text-white'
                                      : cat === 'retraso'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-sky-600 text-white'
                                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                PESTAÑA 3: CALIFICACIONES (PLANILLA LEY 070 POR DIMENSIONES)
               ================================================================= */}
            {cuadernoSubTab === 'calificaciones' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <span>Actividades Evaluativas — 1.er Trimestre ({evalList.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Saber (35 pts) · Hacer (35 pts) · Ser y Decidir (20 pts) · Autoevaluación (10 pts)
                    </p>
                  </div>

                  <button
                    onClick={() => setShowCreateEvalModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Nueva actividad</span>
                  </button>
                </div>

                {evalList.length === 0 ? (
                  <div className="p-10 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                    <Award className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-300 font-semibold">Aún no ha creado actividades evaluativas para este curso.</p>
                    <p className="text-[11px] text-slate-500">
                      Presione "+ Nueva actividad" para registrar pruebas, prácticas o trabajos según las dimensiones pedagógicas de la Ley 070.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evalList.map(ev => {
                      const gradedCount = Object.keys(ev.scores || {}).length;
                      return (
                        <div
                          key={ev.id}
                          className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-800/50 transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800 font-bold">
                                {ev.dimension.toUpperCase()} (máx. {ev.maxScore} pts)
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">{ev.date}</span>
                              <span className="text-[10px] text-slate-400">
                                {gradedCount} / {courseStudents.length} evaluados
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1">{ev.name}</h4>
                            <span className="text-xs text-slate-400">{ev.subject}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveGradingEval(ev);
                                setTempScores(ev.scores || {});
                              }}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
                            >
                              Registrar notas
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                PESTAÑA 4: CONSOLIDADO TRIMESTRAL
               ================================================================= */}
            {cuadernoSubTab === 'trimestres' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>Consolidado de Calificaciones — 1.er Trimestre 2026</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cálculo oficial centralizado sobre 100 puntos con redondeo reglamentario
                    </p>
                  </div>
                </div>

                {courseStudents.length === 0 ? (
                  <div className="p-10 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto opacity-40" />
                    <p className="text-xs text-slate-400">Este curso todavía no tiene estudiantes matriculados</p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
                    <div className="p-3 bg-slate-950 text-[11px] font-bold text-slate-400 grid grid-cols-12 gap-2 text-center">
                      <span className="col-span-1 text-left">N.º</span>
                      <span className="col-span-4 text-left">Estudiante</span>
                      <span className="col-span-1">Saber (35)</span>
                      <span className="col-span-1">Hacer (35)</span>
                      <span className="col-span-1">Ser/Dec (20)</span>
                      <span className="col-span-1">Auto (10)</span>
                      <span className="col-span-1 font-bold text-emerald-400">Final (100)</span>
                      <span className="col-span-2 text-right">Estado</span>
                    </div>

                    {courseStudents.map((st, i) => {
                      // Calcular sub-totales por dimensión
                      const saberActs = evalList.filter(e => e.dimension === 'Saber');
                      const hacerActs = evalList.filter(e => e.dimension === 'Hacer');
                      const serDecActs = evalList.filter(e => e.dimension === 'Ser y Decidir');
                      const autoActs = evalList.filter(e => e.dimension === 'Autoevaluacion');

                      const calcAvg = (acts: EvaluationItem[]) => {
                        const vals = acts.map(a => (a.scores || {})[st.id]).filter(v => v !== undefined && v !== null && !isNaN(v));
                        if (vals.length === 0) return null;
                        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
                      };

                      const saber = calcAvg(saberActs);
                      const hacer = calcAvg(hacerActs);
                      const serDec = calcAvg(serDecActs);
                      const autoeval = calcAvg(autoActs);

                      let finalTrim = null;
                      if (saber !== null || hacer !== null || serDec !== null || autoeval !== null) {
                        finalTrim = Math.round((saber || 0) + (hacer || 0) + (serDec || 0) + (autoeval || 0));
                      }

                      const isApproved = (finalTrim || 0) >= 51;

                      return (
                        <div key={st.id} className="p-3 text-xs grid grid-cols-12 gap-2 items-center text-center hover:bg-slate-850/40">
                          <span className="col-span-1 text-left font-mono text-slate-500">{i + 1}.</span>
                          <div className="col-span-4 text-left">
                            <span className="font-semibold text-white block truncate">{st.fullName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">RUDE: {st.rude}</span>
                          </div>
                          <span className="col-span-1 font-mono text-slate-300">{saber !== null ? saber : '-'}</span>
                          <span className="col-span-1 font-mono text-slate-300">{hacer !== null ? hacer : '-'}</span>
                          <span className="col-span-1 font-mono text-slate-300">{serDec !== null ? serDec : '-'}</span>
                          <span className="col-span-1 font-mono text-slate-300">{autoeval !== null ? autoeval : '-'}</span>
                          <span className="col-span-1 font-mono font-bold text-sm text-emerald-400">
                            {finalTrim !== null ? finalTrim : '-'}
                          </span>
                          <div className="col-span-2 text-right">
                            {finalTrim !== null ? (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                isApproved ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}>
                                {isApproved ? 'APROBADO' : 'EN DESARROLLO'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">En curso</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                PESTAÑA 5: BOLETÍN Y CENTRALIZADOR ANUAL
               ================================================================= */}
            {cuadernoSubTab === 'boletin' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Centralizador Oficial Anual de la Materia — Gestión 2026</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Consolidado anual para generación del boletín institucional oficial
                    </p>
                  </div>
                </div>

                {courseStudents.length === 0 ? (
                  <div className="p-10 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                    <Users className="w-8 h-8 text-slate-600 mx-auto opacity-40" />
                    <p className="text-xs text-slate-400">Este curso todavía no tiene estudiantes matriculados</p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
                    <div className="p-3 bg-slate-950 text-[11px] font-bold text-slate-400 grid grid-cols-12 gap-2 text-center">
                      <span className="col-span-1 text-left">N.º</span>
                      <span className="col-span-5 text-left">Estudiante</span>
                      <span className="col-span-1">1.er Trim</span>
                      <span className="col-span-1">2.º Trim</span>
                      <span className="col-span-1">3.er Trim</span>
                      <span className="col-span-1 font-bold text-emerald-400">Promedio</span>
                      <span className="col-span-2 text-right">Resultado</span>
                    </div>

                    {courseStudents.map((st, i) => (
                      <div key={st.id} className="p-3 text-xs grid grid-cols-12 gap-2 items-center text-center hover:bg-slate-850/40">
                        <span className="col-span-1 text-left font-mono text-slate-500">{i + 1}.</span>
                        <div className="col-span-5 text-left">
                          <span className="font-semibold text-white block truncate">{st.fullName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">RUDE: {st.rude}</span>
                        </div>
                        <span className="col-span-1 font-mono text-slate-300">
                          {evalList.length > 0 ? 'En curso' : '-'}
                        </span>
                        <span className="col-span-1 font-mono text-slate-600">-</span>
                        <span className="col-span-1 font-mono text-slate-600">-</span>
                        <span className="col-span-1 font-mono font-bold text-emerald-400">-</span>
                        <span className="col-span-2 text-right text-[10px] text-slate-400 font-mono">
                          REGULAR
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                PESTAÑA 6: DOCUMENTOS, EXCEL Y ENTREGA A DIRECCIÓN
               ================================================================= */}
            {cuadernoSubTab === 'documentos' && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span>Entregas Digitales y Generación Oficial de Documentos</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Presentación formal de planillas a Dirección y exportación directa en formato Excel XLSX institucional (9 hojas)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tarjeta 1: Exportación Excel Oficial */}
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Descargar Cuaderno en Excel (9 Hojas)</h4>
                        <span className="text-[11px] text-slate-400">Formato Ministerial de 9 pestañas</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Genera el archivo XLSX fidedigno con las hojas: <strong>Car</strong> (Carátula), <strong>Fil</strong> (Filiación), <strong>Asis1</strong>, <strong>Asis2</strong>, <strong>Asis3</strong>, <strong>1Trim</strong>, <strong>2Trim</strong>, <strong>3Trim</strong> y <strong>Boletin</strong>.
                    </p>
                    <button
                      onClick={handleDownloadExcel}
                      disabled={isExportingExcel}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>{isExportingExcel ? 'Generando libro Excel...' : 'Descargar Archivo XLSX Oficial'}</span>
                    </button>
                  </div>

                  {/* Tarjeta 2: Presentar Entrega Digital a Dirección */}
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                        <Send className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Presentación Digital a Dirección</h4>
                        <span className="text-[11px] text-slate-400">Entrega oficial para revisión institucional</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Formaliza la entrega del cuaderno o planillas trimestrales ante el despacho del Director. Permite registrar versiones, revisiones, observaciones y aprobación final.
                    </p>
                    <button
                      onClick={() => setShowSubmissionModal(true)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Preparar y Enviar Entrega a Dirección</span>
                    </button>
                  </div>
                </div>

                {/* Historial de Entregas Presentadas */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-2">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Mis Entregas Oficiales a Dirección ({teacherSubmissions.length})</span>
                    <span className="text-[11px] text-slate-400 font-mono">Trazabilidad Institucional</span>
                  </div>

                  {teacherSubmissions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Aún no ha realizado entregas digitales a Dirección en esta gestión.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {teacherSubmissions.map(sub => (
                        <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white capitalize">
                                {sub.documentType.replace('_', ' ')} ({sub.trimester})
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {sub.courseCode} · Versión {sub.version}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">Presentado: {new Date(sub.createdAt).toLocaleString('es-BO')}</span>
                            {sub.reviewObservations && (
                              <p className="text-[11px] text-amber-300 mt-1 bg-amber-950/40 p-2 rounded border border-amber-800/60">
                                Observación de Dirección: "{sub.reviewObservations}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                              sub.status === 'aprobado'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : sub.status === 'observado'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-950 text-slate-300 border border-slate-800'
                            }`}>
                              {sub.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal de Registro de Notas de la Evaluación */}
            {activeGradingEval && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {activeGradingEval.name} — Dimensión {activeGradingEval.dimension}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Puntuación máxima: {activeGradingEval.maxScore} puntos
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveGradingEval(null)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px]">
                    {courseStudents.map((stu, i) => (
                      <div
                        key={stu.id}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 font-mono text-slate-500">{i + 1}.</span>
                          <span className="font-semibold text-white">{stu.fullName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={activeGradingEval.maxScore}
                            value={tempScores[stu.id] ?? ''}
                            onChange={e => {
                              const val = Math.min(activeGradingEval.maxScore, Math.max(0, parseInt(e.target.value) || 0));
                              setTempScores(prev => ({ ...prev, [stu.id]: val }));
                            }}
                            placeholder="0"
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-slate-500 text-[11px]">/ {activeGradingEval.maxScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                    <button
                      onClick={() => setActiveGradingEval(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveGradesBorrador(false)}
                        disabled={savingGrades}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Guardar borrador
                      </button>
                      <button
                        onClick={() => handleSaveGradesBorrador(true)}
                        disabled={savingGrades}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        Publicar calificaciones
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Crear Evaluación */}
            {showCreateEvalModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <form
                  onSubmit={handleCreateEvaluation}
                  className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Nueva Actividad Evaluativa</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateEvalModal(false)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Nombre de la evaluación:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Prueba Escrita de Funciones, Práctica de Laboratorio"
                        value={newEvalName}
                        onChange={e => setNewEvalName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Dimensión según Ley 070:</label>
                      <select
                        value={newEvalDim}
                        onChange={e => {
                          const dim = e.target.value as any;
                          setNewEvalDim(dim);
                          if (dim === 'Saber') setNewEvalMax(35);
                          else if (dim === 'Hacer') setNewEvalMax(35);
                          else if (dim === 'Ser y Decidir') setNewEvalMax(20);
                          else setNewEvalMax(10);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Saber">Saber (Teoría y conceptos - 35 pts)</option>
                        <option value="Hacer">Hacer (Prácticas y procedimientos - 35 pts)</option>
                        <option value="Ser y Decidir">Ser y Decidir (Valores e impacto social - 20 pts)</option>
                        <option value="Autoevaluacion">Autoevaluación (10 pts)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Ponderación máxima:</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newEvalMax}
                        onChange={e => setNewEvalMax(parseInt(e.target.value) || 35)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateEvalModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      Crear actividad
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal Solicitar Incorporación a la Nómina */}
            {showEnrollmentModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <form
                  onSubmit={handleEnrollmentRequestSubmit}
                  className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Solicitar Incorporación a la Nómina</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowEnrollmentModal(false)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Nombre Completo del Estudiante: *</label>
                      <input
                        type="text"
                        required
                        placeholder="ej: Juan Carlos Mamani Flores"
                        value={enrollFullName}
                        onChange={e => setEnrollFullName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Código RUDE Oficial: *</label>
                        <input
                          type="text"
                          required
                          placeholder="80730142..."
                          value={enrollRude}
                          onChange={e => setEnrollRude(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Cédula de Identidad (CI):</label>
                        <input
                          type="text"
                          placeholder="8492015 LP"
                          value={enrollCi}
                          onChange={e => setEnrollCi(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Motivo de la Incorporación:</label>
                      <input
                        type="text"
                        value={enrollReason}
                        onChange={e => setEnrollReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEnrollmentModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEnrollment}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      {isSubmittingEnrollment ? 'Enviando a Dirección...' : 'Enviar a Dirección'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal Presentar a Dirección */}
            {showSubmissionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <form
                  onSubmit={handleSubmitCuadernoToDirection}
                  className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>Presentación Digital a Dirección</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowSubmissionModal(false)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Tipo de Documento a Presentar:</label>
                      <select
                        value={submissionDocType}
                        onChange={e => setSubmissionDocType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="cuaderno_completo">Cuaderno Pedagógico Completo</option>
                        <option value="calificaciones_trimestre">Planilla de Calificaciones Trimestrales</option>
                        <option value="asistencia_trimestre">Reporte Oficial de Asistencia</option>
                        <option value="nomina">Nómina y Filiación</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Trimestre Académico:</label>
                      <select
                        value={submissionTrimester}
                        onChange={e => setSubmissionTrimester(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="1T">1.er Trimestre 2026</option>
                        <option value="2T">2.º Trimestre 2026</option>
                        <option value="3T">3.er Trimestre 2026</option>
                      </select>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
                      <div>Curso: <strong className="text-white">{evalCourseCode}</strong></div>
                      <div>Materia: <strong className="text-white">{assignedCourses.find(c => c.courseCode === evalCourseCode)?.subject}</strong></div>
                      <div>Docente: <strong className="text-emerald-400">{currentUser.displayName}</strong></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSubmissionModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingDoc}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      {isSubmittingDoc ? 'Registrando entrega...' : 'Confirmar y Enviar a Dirección'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA KÁRDEX: OBSERVACIONES Y SEGUIMIENTO PEDAGÓGICO
           ===================================================================== */}
        {activeTab === 'kardex' && (
          <TeacherKardexView currentUser={currentUser} />
        )}

        {/* =====================================================================
            VISTA 8: COMUNICADOS
           ===================================================================== */}
        {activeTab === 'comunicados' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>Comunicados y Circulares Institucionales</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Avisos oficiales de Dirección y notas para sus cursos
                </p>
              </div>

              <button
                onClick={() => setShowCreateAnnounceModal(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Crear comunicado para mis cursos</span>
              </button>
            </div>

            <div className="space-y-3">
              {announcements.map(ann => (
                <div
                  key={ann.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950 border border-amber-800/60">
                      {ann.authorRole.toUpperCase()} · {ann.authorName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{ann.createdAt}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{ann.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>

            {/* Modal Crear Comunicado */}
            {showCreateAnnounceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <form
                  onSubmit={handlePublishAnnouncement}
                  className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white">Publicar Comunicado Pedagógico</h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateAnnounceModal(false)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Destinatarios:</label>
                      <select
                        value={newAnnounceTargetCourse}
                        onChange={e => setNewAnnounceTargetCourse(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="todos">Todos mis cursos asignados</option>
                        {assignedCourses.map(c => (
                          <option key={c.courseCode} value={c.courseCode}>
                            {c.gradeLevel} {c.parallel} ({c.courseCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Título del comunicado:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Materiales para la siguiente clase de laboratorio"
                        value={newAnnounceTitle}
                        onChange={e => setNewAnnounceTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">Contenido:</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Escriba el comunicado detallado para los estudiantes y padres de familia..."
                        value={newAnnounceContent}
                        onChange={e => setNewAnnounceContent(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateAnnounceModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-amber-600/20"
                    >
                      Publicar comunicado
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 9: MENSAJERÍA INTERNA AUTORIZADA
           ===================================================================== */}
        {activeTab === 'mensajeria' && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 animate-in fade-in">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>Mensajería Interna Autorizada</span>
              </h2>
              <p className="text-xs text-slate-400">
                Comunicación directa con familias tuteladas y Dirección de la U.E. Luis Espinal Tarde
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
              {/* Contactos Autorizados */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block px-1">
                  Contactos permitidos:
                </span>
                <div className="space-y-1">
                  <div
                    onClick={() => setSelectedConversationUser({ id: 'dir-01', name: 'Dirección Institucional' })}
                    className={`p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                      selectedConversationUser?.id === 'dir-01'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">Dirección Institucional</div>
                    <div className="text-[10px] text-slate-400">U.E. Luis Espinal Tarde</div>
                  </div>

                  <div
                    onClick={() => setSelectedConversationUser({ id: 'padre-tutores', name: 'Padres de Familia (Cursos Asignados)' })}
                    className={`p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                      selectedConversationUser?.id === 'padre-tutores'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">Padres Tutores Vinculados</div>
                    <div className="text-[10px] text-slate-400">Familias de mis asignaciones</div>
                  </div>
                </div>
              </div>

              {/* Chat Activo */}
              <div className="md:col-span-2 p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
                {selectedConversationUser ? (
                  <>
                    <div className="pb-2 border-b border-slate-800 flex justify-between items-center text-xs">
                      <span className="font-bold text-white">Chat con: {selectedConversationUser.name}</span>
                      <span className="text-[10px] text-emerald-400">Canal Seguro</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                      {messagesList
                        .filter(m => m.recipientId === selectedConversationUser.id || m.isMe)
                        .map(msg => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-xl max-w-[80%] text-xs ${
                              msg.isMe
                                ? 'bg-amber-600/30 border border-amber-600/40 text-amber-200 ml-auto'
                                : 'bg-slate-900 border border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="font-semibold text-[11px] mb-0.5">{msg.senderName}</div>
                            <div>{msg.text}</div>
                            <span className="text-[9px] text-slate-400 block text-right mt-1">{msg.time}</span>
                          </div>
                        ))}
                    </div>

                    <form onSubmit={handleSendChatMessage} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Escribir mensaje institucional..."
                        value={chatMessageText}
                        onChange={e => setChatMessageText(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="p-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-500 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-600" />
                    <span>Seleccione un contacto para abrir la conversación.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VISTA 10: NOTIFICACIONES
           ===================================================================== */}
        {activeTab === 'notificaciones' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Bandeja de Notificaciones Oficiales</span>
              </h2>
              <p className="text-xs text-slate-400">
                Avisos en tiempo real sobre asistencia, circulares y aprobaciones
              </p>
            </div>

            <div className="space-y-2">
              {notificationsList.map(n => (
                <div
                  key={n.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{n.title}</div>
                      <div className="text-slate-400 mt-0.5">{n.description}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            VISTA 11: MI PERFIL DOCENTE
           ===================================================================== */}
        {activeTab === 'perfil' && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 animate-in fade-in">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>Mi Perfil Docente Institucional</span>
              </h2>
              <p className="text-xs text-slate-400">
                Información de su expediente docente en la U.E. Luis Espinal Tarde
              </p>
            </div>

            {profileMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold">
                {profileMsg}
              </div>
            )}

            {passwordResetSent && (
              <div className="p-3 bg-indigo-950/80 border border-indigo-800 text-indigo-300 rounded-xl text-xs font-semibold">
                Se ha enviado un enlace oficial de recuperación a su correo electrónico institucional.
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block mb-1">Nombre completo:</span>
                  <input
                    type="text"
                    disabled
                    value={currentUser.displayName}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Correo electrónico:</span>
                  <input
                    type="text"
                    disabled
                    value={currentUser.email}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block mb-1">Expediente Institucional:</span>
                  <input
                    type="text"
                    disabled
                    value={currentUser.teacherId || 'Expediente Docente Oficial'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Área / Especialidad:</span>
                  <input
                    type="text"
                    disabled
                    value={currentUser.specialty || teacherExpediente?.specialty || 'Secundaria Técnica'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Número de teléfono / celular de contacto (Editable):
                </label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  placeholder="Ej. +591 71234567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-600/20"
                >
                  {savingProfile ? 'Guardando...' : 'Editar mis datos'}
                </button>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cambiar contraseña
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Modal de Comunicaciones del Profesor con Confirmación Obligatoria */}
      {showTeacherCommModal && (
        <NewCommunicationModal
          currentUser={currentUser}
          isOpen={showTeacherCommModal}
          onClose={() => setShowTeacherCommModal(false)}
          defaultCourseCode={selectedTeacherCalCourse || assignedCourses[0]?.courseCode || '6A'}
          defaultType="evaluacion"
          onSuccess={(msg) => {
            alert(`Actividad/comunicado "${msg.subject}" publicado exitosamente en el calendario del curso.`);
            setShowTeacherCommModal(false);
          }}
        />
      )}
    </div>
  );
};
