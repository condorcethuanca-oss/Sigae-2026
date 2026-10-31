import React, { useState, useEffect } from 'react';
import {
  School,
  Shield,
  Users,
  UserPlus,
  GraduationCap,
  HeartHandshake,
  Layers,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Building,
  KeyRound,
  Eye,
  Trash2,
  Edit3,
  Phone,
  Mail,
  Printer,
  ChevronRight,
  BookOpen,
  Award,
  Calendar,
  MapPin,
  Save,
  Check,
  Copy,
  Info,
  RefreshCw,
  UserCheck,
  UserX,
  UserMinus,
  AlertTriangle,
  Plus,
  ShieldCheck,
  CheckSquare,
  Square,
  FileSpreadsheet,
  ShieldAlert,
  Download,
  FileCheck2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { SigaeUser, TeacherRecord, TeacherStatus, SchoolGroup, InternalMessage, SchoolConfig, ScheduleBlock, AttendanceSession } from '../types';
import { directorService, DEFAULT_BOLIVIA_SCHOOL } from '../firebase/directorService';
import { superadminService, AccessRequest } from '../firebase/superadminService';
import { scheduleService, OFFICIAL_PERIODS, SCHOOL_DAYS, SECONDARY_24_COURSES } from '../firebase/scheduleService';
import { studentService, StudentInstitutionalRecord } from '../firebase/studentService';
import { cuadernoPedagogicoService, AcademicSubmission } from '../firebase/cuadernoPedagogicoService';
import { attendanceService } from '../firebase/attendanceService';
import { UnifiedSchoolCalendar } from './calendar/UnifiedSchoolCalendar';
import { OfficialScheduleManager } from './calendar/OfficialScheduleManager';
import { NewCommunicationModal } from './calendar/NewCommunicationModal';
import { DirectorKardexView } from './kardex/DirectorKardexView';
import { NotificationBellDropdown } from './notifications/NotificationBellDropdown';

interface DirectorPanelProps {
  currentUser: SigaeUser;
  onLogout: () => void;
  onGoToSuperAdmin?: () => void;
}

type DirectorTab =
  | 'inicio'
  | 'profesores'
  | 'cuadernos'
  | 'solicitudes'
  | 'horarios'
  | 'calendario'
  | 'kardex'
  | 'estudiantes'
  | 'padres'
  | 'cursos'
  | 'comunicados'
  | 'reportes'
  | 'configuracion';

const BOLIVIA_DEPARTMENTS = [
  { code: 'LP', name: 'La Paz' },
  { code: 'CB', name: 'Cochabamba' },
  { code: 'SC', name: 'Santa Cruz' },
  { code: 'OR', name: 'Oruro' },
  { code: 'PT', name: 'Potosí' },
  { code: 'TJ', name: 'Tarija' },
  { code: 'CH', name: 'Chuquisaca' },
  { code: 'BE', name: 'Beni' },
  { code: 'PA', name: 'Pando' },
];

const STANDARD_SPECIALTIES = [
  'Matemática y Razonamiento Lógico',
  'Comunicación y Lenguajes / Literatura',
  'Física - Química',
  'Biología y Geografía',
  'Ciencias Sociales e Historia de Bolivia',
  'Artes Plásticas y Visuales',
  'Educación Musical',
  'Educación Física y Deportes',
  'Cosmovisiones, Filosofía y Psicología',
  'Valores, Espiritualidad y Religiones',
  'Técnica Tecnológica Productiva (BTH - Robótica)',
  'Lengua Extranjera (Inglés)',
  'Lengua Originaria Aymara',
];

const SECONDARY_GRADES = [
  '1° de Secundaria A',
  '1° de Secundaria B',
  '2° de Secundaria A',
  '2° de Secundaria B',
  '3° de Secundaria A',
  '3° de Secundaria B',
  '4° de Secundaria A',
  '4° de Secundaria B',
  '5° de Secundaria A',
  '5° de Secundaria B',
  '6° de Secundaria A',
  '6° de Secundaria B',
];

const PRIMARY_GRADES = [
  '1° de Primaria A',
  '2° de Primaria A',
  '3° de Primaria A',
  '4° de Primaria A',
  '5° de Primaria A',
  '6° de Primaria A',
];

const CURRICULAR_AREAS = [
  'Matemática y Cálculo',
  'Comunicación y Lenguajes',
  'Física - Química',
  'Biología y Geografía',
  'Ciencias Sociales e Historia',
  'Educación Cívica y Ciudadana',
  'Técnica Tecnológica Productiva (BTH - Robótica)',
  'Electrónica y Sistemas',
  'Educación Musical',
  'Artes Plásticas y Visuales',
  'Educación Física y Deportes',
  'Cosmovisiones, Filosofía y Psicología',
  'Valores, Espiritualidad y Religiones',
  'Lengua Originaria Aymara',
  'Lengua Extranjera (Inglés)',
];

// Representative Students for U.E. Luis Espinal Tarde de Collpani
const SAMPLE_STUDENTS = [
  { rude: '807301422018001', name: 'Santiago González Mamani', grade: '5° de Secundaria', parallel: 'A', tutor: 'Prof. Carlos Mamani Quispe', status: 'Efectivo', gender: 'M' },
  { rude: '807301422018002', name: 'Valeria Condori Flores', grade: '5° de Secundaria', parallel: 'A', tutor: 'Prof. Carlos Mamani Quispe', status: 'Efectivo', gender: 'F' },
  { rude: '807301422018003', name: 'Mateo Quispe Choque', grade: '5° de Secundaria', parallel: 'B', tutor: 'Prof. Marcos Silva Condori', status: 'Efectivo', gender: 'M' },
  { rude: '807301422018004', name: 'Luciana Ticona Ramos', grade: '4° de Secundaria', parallel: 'A', tutor: 'Profa. Elena Choquehuanca Flores', status: 'Efectivo', gender: 'F' },
  { rude: '807301422018005', name: 'Sebastián Huanca Vargas', grade: '4° de Secundaria', parallel: 'B', tutor: 'Prof. Wilson Huanca Yujra', status: 'Efectivo', gender: 'M' },
  { rude: '807301422018006', name: 'Camila Choquehuanca Silva', grade: '6° de Secundaria', parallel: 'A', tutor: 'Prof. Wilson Huanca Yujra', status: 'Efectivo', gender: 'F' },
  { rude: '807301422018007', name: 'Gabriel Mamani Fernández', grade: '3° de Secundaria', parallel: 'A', tutor: 'Profa. Patricia Ruiz Ticona', status: 'Efectivo', gender: 'M' },
  { rude: '807301422018008', name: 'Andrea Nina Paredes', grade: '2° de Secundaria', parallel: 'A', tutor: 'Profa. Patricia Ruiz Ticona', status: 'Efectivo', gender: 'F' },
  { rude: '807301422018009', name: 'Rodrigo Tarqui Calle', grade: '1° de Secundaria', parallel: 'A', tutor: 'Prof. Carlos Mamani Quispe', status: 'Efectivo', gender: 'M' },
  { rude: '807301422018010', name: 'Paola Alarcón Yujra', grade: '6° de Secundaria', parallel: 'B', tutor: 'Prof. Marcos Silva Condori', status: 'Observado (Doc. RUDE)', gender: 'F' },
];

// Representative Parents for Collpani
const SAMPLE_PARENTS = [
  { id: 'par-1', name: 'Don Roberto González Paredes', student: 'Santiago González Mamani (5° Sec A)', phone: '+591 72098415', role: 'Presidente Junta Escolar', verified: true },
  { id: 'par-2', name: 'Doña Martha Flores Quispe', student: 'Valeria Condori Flores (5° Sec A)', phone: '+591 71239012', role: 'Vicepresidenta Junta Escolar', verified: true },
  { id: 'par-3', name: 'Don Javier Quispe Condori', student: 'Mateo Quispe Choque (5° Sec B)', phone: '+591 76510928', role: 'Delegado de Curso 5°B', verified: true },
  { id: 'par-4', name: 'Doña Silvia Ramos Choque', student: 'Luciana Ticona Ramos (4° Sec A)', phone: '+591 68901234', role: 'Vocal de Hacienda', verified: true },
  { id: 'par-5', name: 'Don Hernán Huanca Apaza', student: 'Sebastián Huanca Vargas (4° Sec B)', phone: '+591 73456789', role: 'Tutor Legal', verified: true },
  { id: 'par-6', name: 'Doña Bertha Silva Mamani', student: 'Camila Choquehuanca Silva (6° Sec A)', phone: '+591 74890123', role: 'Delegada de Promoción', verified: true },
];

export const DirectorPanel: React.FC<DirectorPanelProps> = ({ currentUser, onLogout, onGoToSuperAdmin }) => {
  const [activeTab, setActiveTab] = useState<DirectorTab>('inicio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Firestore Data State
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(DEFAULT_BOLIVIA_SCHOOL);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast notification
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter & Search states
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'todos' | TeacherStatus>('todos');
  const [teacherSpecialtyFilter, setTeacherSpecialtyFilter] = useState<string>('todas');
  const [teacherGradeFilter, setTeacherGradeFilter] = useState<string>('todos');
  const [studentSearch, setStudentSearch] = useState('');

  // Modals & Active Teacher Operations
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState<TeacherRecord | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [assigningTeacher, setAssigningTeacher] = useState<TeacherRecord | null>(null);
  const [accessModalTeacher, setAccessModalTeacher] = useState<TeacherRecord | null>(null);
  const [deleteModalTeacher, setDeleteModalTeacher] = useState<TeacherRecord | null>(null);
  const [deleteOption, setDeleteOption] = useState<'retire' | 'permanent'>('retire');
  const [deleteConfirmCheckbox, setDeleteConfirmCheckbox] = useState(false);
  const [retireReason, setRetireReason] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [sendingActivation, setSendingActivation] = useState(false);
  const [activationNotice, setActivationNotice] = useState<string | null>(null);

  // New Teacher Form
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCi, setNewCi] = useState('');
  const [newCiExp, setNewCiExp] = useState('LP');
  const [newPhone, setNewPhone] = useState('');
  const [newSpecialty, setNewSpecialty] = useState(STANDARD_SPECIALTIES[0]);
  const [newHourlyLoad, setNewHourlyLoad] = useState<number>(80);
  const [newStatus, setNewStatus] = useState<TeacherStatus>('pendiente_activacion');
  const [newNotes, setNewNotes] = useState('');

  // Edit Teacher Form
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCi, setEditCi] = useState('');
  const [editCiExp, setEditCiExp] = useState('LP');
  const [editPhone, setEditPhone] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editHourlyLoad, setEditHourlyLoad] = useState<number>(80);
  const [editStatus, setEditStatus] = useState<TeacherStatus>('activo');
  const [editNotes, setEditNotes] = useState('');

  // Assigning Teacher Form
  const [assignGrades, setAssignGrades] = useState<string[]>([]);
  const [assignSubjects, setAssignSubjects] = useState<string[]>([]);
  const [assignHourlyLoad, setAssignHourlyLoad] = useState<number>(80);
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // New Message Modal
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showNewCommModal, setShowNewCommModal] = useState(false);
  const [selectedCalendarCourse, setSelectedCalendarCourse] = useState('6A');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgRecipient, setMsgRecipient] = useState('all_teachers');
  const [msgPriority, setMsgPriority] = useState<'normal' | 'alta' | 'urgente'>('normal');
  const [msgType, setMsgType] = useState<InternalMessage['type']>('comunicado_general');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Report Print Modal
  const [showReportModal, setShowReportModal] = useState<string | null>(null);

  // Access Requests Management State
  const [reqFilter, setReqFilter] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('pendiente');
  const [reqRoleFilter, setReqRoleFilter] = useState<'todos' | 'profesor' | 'padre'>('todos');
  const [resolvingReqId, setResolvingReqId] = useState<string | null>(null);

  const handleApproveRequest = async (req: AccessRequest) => {
    setResolvingReqId(req.id);
    try {
      await superadminService.resolveAccessRequest(req.id, 'aprobada', currentUser);
      showNotification(`Solicitud de ${req.displayName} aprobada. Acceso institucional activado.`);
    } catch (err: any) {
      showNotification(`Error al autorizar solicitud: ${err.message}`, 'error');
    } finally {
      setResolvingReqId(null);
    }
  };

  const handleRejectRequest = async (req: AccessRequest) => {
    setResolvingReqId(req.id);
    try {
      await superadminService.resolveAccessRequest(
        req.id,
        'rechazada',
        currentUser,
        'Solicitud no autorizada por la Dirección de la U.E. Luis Espinal Tarde.'
      );
      showNotification(`Solicitud de ${req.displayName} rechazada.`, 'error');
    } catch (err: any) {
      showNotification(`Error al rechazar solicitud: ${err.message}`, 'error');
    } finally {
      setResolvingReqId(null);
    }
  };

  // School Config Edit Form State
  const [cfgSchoolName, setCfgSchoolName] = useState(DEFAULT_BOLIVIA_SCHOOL.schoolName);
  const [cfgSie, setCfgSie] = useState(DEFAULT_BOLIVIA_SCHOOL.sie);
  const [cfgDepartment, setCfgDepartment] = useState(DEFAULT_BOLIVIA_SCHOOL.department);
  const [cfgDistrict, setCfgDistrict] = useState(DEFAULT_BOLIVIA_SCHOOL.district);
  const [cfgShift, setCfgShift] = useState(DEFAULT_BOLIVIA_SCHOOL.shift);
  const [cfgAcademicYear, setCfgAcademicYear] = useState(DEFAULT_BOLIVIA_SCHOOL.academicYear);
  const [cfgDirectorName, setCfgDirectorName] = useState(currentUser.displayName || DEFAULT_BOLIVIA_SCHOOL.directorName);
  const [cfgPhone, setCfgPhone] = useState(DEFAULT_BOLIVIA_SCHOOL.phone || '+591 2 2840192');
  const [cfgEmail, setCfgEmail] = useState(DEFAULT_BOLIVIA_SCHOOL.email || 'direccion@luisespinal.edu.bo');
  const [savingCfg, setSavingCfg] = useState(false);

  // Real Students State (from Firestore /students)
  const [realStudents, setRealStudents] = useState<StudentInstitutionalRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [seedingStudents, setSeedingStudents] = useState(false);

  // Student Enrollment Requests (from Firestore /enrollment_requests)
  const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([]);
  const [resolvingEnrollmentId, setResolvingEnrollmentId] = useState<string | null>(null);

  // Cuadernos Pedagógicos & Academic Submissions (from Firestore /academic_submissions)
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [subTeacherFilter, setSubTeacherFilter] = useState('todos');
  const [subCourseFilter, setSubCourseFilter] = useState('todos');
  const [subTrimesterFilter, setSubTrimesterFilter] = useState('todos');
  const [subStatusFilter, setSubStatusFilter] = useState('todos');

  // Observation Modal State
  const [observingSubmission, setObservingSubmission] = useState<AcademicSubmission | null>(null);
  const [observationText, setObservationText] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Solicitudes Subtab Toggle
  const [solicitudesSubtab, setSolicitudesSubtab] = useState<'cuentas' | 'matriculas'>('cuentas');

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSubmissionsAndStudents = async () => {
    setLoadingStudents(true);
    setLoadingSubmissions(true);
    try {
      const [stList, reqList, subList] = await Promise.all([
        studentService.getAllStudents(),
        studentService.getPendingEnrollmentRequests(),
        cuadernoPedagogicoService.getAllSubmissions(),
      ]);
      setRealStudents(stList);
      setEnrollmentRequests(reqList);
      setSubmissions(subList);
    } catch (err) {
      console.warn('[DirectorPanel] Error cargando datos complementarios:', err);
    } finally {
      setLoadingStudents(false);
      setLoadingSubmissions(false);
    }
  };

  // Real-time Firestore Subscriptions
  useEffect(() => {
    setLoading(true);
    const unsubTeachers = directorService.subscribeTeachers(list => {
      setTeachers(list);
      setLoading(false);
    });

    const unsubGroups = directorService.subscribeGroups(list => {
      setGroups(list);
    });

    const unsubMessages = directorService.subscribeMessages(list => {
      setMessages(list);
    });

    const unsubRequests = superadminService.subscribeAccessRequests(list => {
      setAccessRequests(list);
    });

    loadSubmissionsAndStudents();

    directorService.getSchoolConfig().then(cfg => {
      setSchoolConfig(cfg);
      setCfgSchoolName(cfg.schoolName);
      setCfgSie(cfg.sie);
      setCfgDepartment(cfg.department);
      setCfgDistrict(cfg.district);
      setCfgShift(cfg.shift);
      setCfgAcademicYear(cfg.academicYear);
      if (cfg.phone) setCfgPhone(cfg.phone);
      if (cfg.email) setCfgEmail(cfg.email);
    });

    return () => {
      unsubTeachers();
      unsubGroups();
      unsubMessages();
      unsubRequests();
    };
  }, []);

  // Cuaderno & Submission Handlers
  const handleApproveSubmission = async (sub: AcademicSubmission) => {
    try {
      const ok = await cuadernoPedagogicoService.reviewSubmissionByDirection({
        submissionId: sub.id,
        decision: 'aprobado',
        reviewerUid: currentUser.uid,
        reviewerName: currentUser.displayName || 'Director Institucional',
      });
      if (ok) {
        showNotification(`Entrega de ${sub.courseCode} · ${sub.subject} aprobada formalmente.`);
        const updated = await cuadernoPedagogicoService.getAllSubmissions();
        setSubmissions(updated);
      } else {
        showNotification('No se pudo aprobar la entrega.', 'error');
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error');
    }
  };

  const handleOpenObservationModal = (sub: AcademicSubmission) => {
    setObservingSubmission(sub);
    setObservationText(sub.reviewObservations || '');
  };

  const handleSubmitObservation = async () => {
    if (!observingSubmission) return;
    if (!observationText.trim()) {
      showNotification('Debes ingresar las observaciones pedagógicas o requerimientos para el docente.', 'error');
      return;
    }
    setSavingReview(true);
    try {
      const ok = await cuadernoPedagogicoService.reviewSubmissionByDirection({
        submissionId: observingSubmission.id,
        decision: 'observado',
        reviewerUid: currentUser.uid,
        reviewerName: currentUser.displayName || 'Director Institucional',
        observations: observationText.trim(),
      });
      if (ok) {
        showNotification(`Entrega observada. Se notificó al profesor ${observingSubmission.teacherName} con las indicaciones.`);
        const updated = await cuadernoPedagogicoService.getAllSubmissions();
        setSubmissions(updated);
        setObservingSubmission(null);
        setObservationText('');
      } else {
        showNotification('Error al registrar observación.', 'error');
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setSavingReview(false);
    }
  };

  const handlePublishGrades = async (sub: AcademicSubmission) => {
    try {
      const ok = await cuadernoPedagogicoService.publishGradesToFamilies(
        sub.id,
        currentUser.uid,
        currentUser.displayName || 'Director Institucional'
      );
      if (ok) {
        showNotification(`Calificaciones de ${sub.courseCode} ${sub.subject} (${sub.trimester}) publicadas formalmente a los padres de familia.`);
        const updated = await cuadernoPedagogicoService.getAllSubmissions();
        setSubmissions(updated);
      } else {
        showNotification('No se pudo publicar las notas.', 'error');
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error');
    }
  };

  const handleDownloadExcel = async (sub: AcademicSubmission) => {
    try {
      showNotification(`Generando Excel oficial (9 Hojas) para ${sub.courseCode} - ${sub.subject}...`);
      await cuadernoPedagogicoService.generateOfficialCuadernoXLSX(
        sub.courseCode,
        sub.subject,
        sub.teacherName
      );
      showNotification('Descarga de Excel completada exitosamente.');
    } catch (err: any) {
      showNotification(`Error generando Excel: ${err.message}`, 'error');
    }
  };

  const handleApproveEnrollment = async (req: any) => {
    setResolvingEnrollmentId(req.id);
    try {
      const ok = await studentService.approveEnrollmentRequest(
        req.id,
        currentUser.uid,
        currentUser.displayName || 'Director Institucional'
      );
      if (ok) {
        showNotification(`Estudiante ${req.fullName} incorporado a la matrícula del curso ${req.courseCode}.`);
        const [stList, reqList] = await Promise.all([
          studentService.getAllStudents(),
          studentService.getPendingEnrollmentRequests(),
        ]);
        setRealStudents(stList);
        setEnrollmentRequests(reqList);
      } else {
        showNotification('No se pudo aprobar la incorporación.', 'error');
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setResolvingEnrollmentId(null);
    }
  };

  const handleSeedStudents = async () => {
    setSeedingStudents(true);
    try {
      const count = await studentService.seedInitialStudentsRoster();
      showNotification(`Se cargaron ${count} estudiantes del padrón institucional 2026 en Firestore.`);
      const stList = await studentService.getAllStudents();
      setRealStudents(stList);
    } catch (err: any) {
      showNotification(`Error al sembrar estudiantes: ${err.message}`, 'error');
    } finally {
      setSeedingStudents(false);
    }
  };

  // Filtered teachers with comprehensive multi-criteria filter
  const filteredTeachers = teachers.filter(t => {
    const q = teacherSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.fullName.toLowerCase().includes(q) ||
      t.specialty.toLowerCase().includes(q) ||
      t.ci.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.assignedGrades && t.assignedGrades.some(g => g.toLowerCase().includes(q))) ||
      (t.assignedSubjects && t.assignedSubjects.some(s => s.toLowerCase().includes(q)));

    const matchesStatus =
      teacherStatusFilter === 'todos' ? true : t.status === teacherStatusFilter;

    const matchesSpecialty =
      teacherSpecialtyFilter === 'todas' ? true : t.specialty === teacherSpecialtyFilter;

    const matchesGrade =
      teacherGradeFilter === 'todos'
        ? true
        : t.assignedGrades && t.assignedGrades.includes(teacherGradeFilter);

    return matchesSearch && matchesStatus && matchesSpecialty && matchesGrade;
  });

  // Filtered real students from Firestore
  const filteredStudents = realStudents.filter(s => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.rude.includes(q) ||
      (s.ci && s.ci.includes(q)) ||
      s.gradeLevel.toLowerCase().includes(q) ||
      s.courseCode.toLowerCase().includes(q)
    );
  });

  // Status Badge Component Helper
  const renderStatusBadge = (status: TeacherStatus) => {
    switch (status) {
      case 'activo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Activo
          </span>
        );
      case 'pendiente_activacion':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Pendiente de activación
          </span>
        );
      case 'licencia':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-800">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            Licencia
          </span>
        );
      case 'inactivo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Inactivo
          </span>
        );
      case 'retirado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            Retirado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  // 1. Handle Create Teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || newFullName.trim().length < 3) {
      showNotification('El nombre completo es obligatorio (mínimo 3 caracteres).', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail.trim() || !emailRegex.test(newEmail.trim())) {
      showNotification('Ingresa un correo electrónico válido.', 'error');
      return;
    }
    if (!newCi.trim()) {
      showNotification('El número de Carnet de Identidad (CI) es obligatorio.', 'error');
      return;
    }
    if (!newSpecialty.trim()) {
      showNotification('La especialidad pedagógica es obligatoria.', 'error');
      return;
    }
    const cleanPhone = newPhone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      showNotification('Ingresa un número de celular de contacto válido (mínimo 7 dígitos).', 'error');
      return;
    }
    if (!newHourlyLoad || newHourlyLoad <= 0) {
      showNotification('La carga horaria debe ser un número positivo.', 'error');
      return;
    }

    try {
      const created = await directorService.createTeacher({
        fullName: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        ci: newCi.trim(),
        ciExpedition: newCiExp,
        phone: newPhone.startsWith('+591') ? newPhone.trim() : `+591 ${newPhone.trim()}`,
        specialty: newSpecialty,
        assignedGrades: [],
        assignedSubjects: [newSpecialty.split('/')[0].trim()],
        hourlyLoad: newHourlyLoad,
        status: newStatus,
        notes: newNotes.trim() || 'Profesor registrado institucionalmente por Dirección.',
      });

      showNotification(`Profesor(a) ${newFullName} registrado correctamente en Firestore.`);
      setShowAddTeacherModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewCi('');
      setNewPhone('');
      setNewNotes('');
      setNewStatus('pendiente_activacion');

      // Open Access & Activation Modal for the newly registered teacher
      setAccessModalTeacher(created);
    } catch (err: any) {
      showNotification(err.message || 'Error al registrar al profesor.', 'error');
    }
  };

  // 2. Handle Open & Save Edit Teacher
  const handleOpenEdit = (t: TeacherRecord) => {
    setEditingTeacher(t);
    setEditFullName(t.fullName);
    setEditEmail(t.email);
    const parts = t.ci.split(' ');
    if (parts.length > 1 && ['LP', 'CB', 'SC', 'OR', 'PT', 'TJ', 'CH', 'BE', 'PA'].includes(parts[parts.length - 1])) {
      setEditCiExp(parts[parts.length - 1]);
      setEditCi(parts.slice(0, -1).join(' '));
    } else {
      setEditCi(t.ci);
      setEditCiExp(t.ciExpedition || 'LP');
    }
    setEditPhone(t.phone);
    setEditSpecialty(t.specialty);
    setEditHourlyLoad(Number(t.hourlyLoad) || 80);
    setEditStatus(t.status || 'activo');
    setEditNotes(t.notes || '');
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (!editFullName.trim() || !editEmail.trim() || !editCi.trim()) {
      showNotification('Nombre, correo y CI son obligatorios.', 'error');
      return;
    }

    try {
      const fullCi = `${editCi.trim()}${editCiExp ? ` ${editCiExp}` : ''}`.trim();
      await directorService.updateTeacher(editingTeacher.id, {
        fullName: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        ci: fullCi,
        ciExpedition: editCiExp,
        phone: editPhone.trim(),
        specialty: editSpecialty.trim(),
        hourlyLoad: Number(editHourlyLoad) || 0,
        status: editStatus,
        notes: editNotes.trim(),
      });

      showNotification(`Ficha del profesor ${editFullName} actualizada con éxito.`);
      setEditingTeacher(null);
    } catch (err: any) {
      showNotification(err.message || 'Error al actualizar datos del profesor.', 'error');
    }
  };

  // 3. Handle Academic Assignments
  const handleOpenAssign = (t: TeacherRecord) => {
    setAssigningTeacher(t);
    setAssignGrades([...(t.assignedGrades || [])]);
    setAssignSubjects([...(t.assignedSubjects || [])]);
    setAssignHourlyLoad(Number(t.hourlyLoad) || 80);
    setCustomSubjectInput('');
  };

  const toggleGradeSelection = (grade: string) => {
    setAssignGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  };

  const toggleSubjectSelection = (subj: string) => {
    setAssignSubjects(prev =>
      prev.includes(subj) ? prev.filter(s => s !== subj) : [...prev, subj]
    );
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (trimmed && !assignSubjects.includes(trimmed)) {
      setAssignSubjects(prev => [...prev, trimmed]);
      setCustomSubjectInput('');
    }
  };

  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeacher) return;
    try {
      await directorService.updateTeacherAssignments(
        assigningTeacher.id,
        assignGrades,
        assignSubjects,
        assignHourlyLoad
      );
      showNotification(`Asignación académica guardada para ${assigningTeacher.fullName}.`);
      setAssigningTeacher(null);
    } catch (err: any) {
      showNotification(err.message || 'Error al guardar asignación.', 'error');
    }
  };

  // 4. Handle Status Toggle & Change
  const handleToggleStatus = async (id: string, currentStatus: TeacherStatus) => {
    const updated = await directorService.toggleTeacherStatus(id, currentStatus);
    showNotification(`Estado del profesor actualizado a: ${updated.toUpperCase()}`);
  };

  const handleQuickSetStatus = async (id: string, newSt: TeacherStatus) => {
    await directorService.setTeacherStatus(id, newSt);
    showNotification(`Estado actualizado a: ${newSt.toUpperCase()}`);
  };

  // 5. Activation & Password Reset Link via Firebase Auth
  const handleSendActivation = async (teacher: TeacherRecord) => {
    setSendingActivation(true);
    setActivationNotice(null);
    try {
      const res = await directorService.sendActivationEmail(teacher);
      setActivationNotice(res.message);
      showNotification(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      const msg = err.message || 'Error al procesar la activación.';
      setActivationNotice(msg);
      showNotification(msg, 'error');
    } finally {
      setSendingActivation(false);
    }
  };

  const handleCopyAccessInstructions = (t: TeacherRecord) => {
    const isLinked = Boolean(t.authUid);
    const text = `*COMUNICADO INSTITUCIONAL — U.E. LUIS ESPINAL TARDE (SIE: 80730142)*\n` +
      `Estimado(a) colega: ${t.fullName}\n\n` +
      `Se ha formalizado su expediente docente en la plataforma institucional SIGAE.\n` +
      `• Correo Institucional: ${t.email}\n` +
      `• Rol Asignado: Profesor(a)\n` +
      `• Carnet CI: ${t.ci}\n` +
      `• Especialidad: ${t.specialty}\n` +
      `• Estado en Nómina: ${t.status === 'activo' ? 'Activo' : 'Pendiente de activación'}\n` +
      `• Estado de Vinculación Auth: ${isLinked ? 'Cuenta ya vinculada' : 'Pendiente de primer ingreso'}\n\n` +
      `*Instrucciones oficiales para acceder a SIGAE:*\n` +
      `1. Ingrese a la plataforma institucional de la Unidad Educativa.\n` +
      (isLinked
        ? `2. Su cuenta de acceso ya está vinculada. Inicie sesión con su correo (${t.email}) o solicite restablecer su contraseña si la olvidó.\n`
        : `2. Si dispone de Google, seleccione "Continuar con Google" con su cuenta (${t.email}). El sistema validará su identidad y vinculará automáticamente su UID auténtico a su expediente docente.\n` +
          `3. Si prefiere acceder con contraseña, seleccione "¿No tienes una cuenta? Crear cuenta", registre su contraseña confidencial y revise su bandeja de entrada para verificar su correo.\n`) +
      `\n_Dirección Institucional — U.E. Luis Espinal Tarde de Collpani_`;

    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
    showNotification('Instrucciones institucionales copiadas al portapapeles.');
  };

  // 6. Delete & Retire Teacher Modal
  const handleOpenDeleteModal = (t: TeacherRecord) => {
    setDeleteModalTeacher(t);
    setDeleteOption('retire');
    setDeleteConfirmCheckbox(false);
    setRetireReason('');
  };

  const handleProcessDeleteOrRetire = async () => {
    if (!deleteModalTeacher) return;
    try {
      if (deleteOption === 'retire') {
        await directorService.retireTeacher(deleteModalTeacher.id, retireReason.trim());
        showNotification(`El profesor ${deleteModalTeacher.fullName} fue dado de baja institucionalmente (estado Retirado).`);
      } else {
        if (!deleteConfirmCheckbox) {
          showNotification('Debes marcar la confirmación para eliminar definitivamente.', 'error');
          return;
        }
        await directorService.deleteTeacher(deleteModalTeacher.id);
        showNotification(`Registro del profesor ${deleteModalTeacher.fullName} eliminado definitivamente de Firestore.`);
      }
      setDeleteModalTeacher(null);
    } catch (err: any) {
      showNotification(err.message || 'Error en la operación.', 'error');
    }
  };

  // 7. Seed Collpani Teachers (on demand if empty)
  const handleSeedCollpaniTeachers = async () => {
    try {
      await directorService.seedDefaultTeachers();
      showNotification('Plantel docente sugerido de Collpani cargado en Firestore.');
    } catch (err: any) {
      showNotification('Error al cargar nómina docente.', 'error');
    }
  };

  // 4. Handle Send Official Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject.trim() || !msgContent.trim()) {
      showNotification('Por favor ingresa el asunto y contenido del comunicado.', 'error');
      return;
    }

    setSendingMsg(true);
    try {
      const recipientLabel =
        msgRecipient === 'all_teachers'
          ? 'Todo el Plantel Docente'
          : msgRecipient === 'all_community'
          ? 'Comunidad Educativa en General'
          : 'Personal Seleccionado';

      await directorService.sendMessage({
        senderId: currentUser.uid,
        senderName: `${currentUser.displayName} (Dirección General)`,
        senderRole: 'director',
        recipientId: msgRecipient,
        recipientName: recipientLabel,
        subject: msgSubject.trim(),
        content: msgContent.trim(),
        type: msgType,
        priority: msgPriority,
      });

      showNotification('¡Comunicado oficial emitido y publicado con éxito!');
      setShowMessageModal(false);
      setMsgSubject('');
      setMsgContent('');
    } catch (err: any) {
      showNotification(err.message || 'Error al emitir el comunicado.', 'error');
    } finally {
      setSendingMsg(false);
    }
  };

  // 5. Handle Save School Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCfg(true);
    try {
      await directorService.updateSchoolConfig({
        schoolName: cfgSchoolName,
        sie: cfgSie,
        department: cfgDepartment,
        district: cfgDistrict,
        shift: cfgShift as any,
        academicYear: cfgAcademicYear,
        directorName: cfgDirectorName,
        phone: cfgPhone,
        email: cfgEmail,
      });
      showNotification('Configuración institucional guardada en Firestore.');
    } catch (err: any) {
      showNotification('Error al guardar la configuración.', 'error');
    } finally {
      setSavingCfg(false);
    }
  };

  // Navigation Items
  const pendingRequestsCount = accessRequests.filter(r => r.status === 'pendiente').length;
  const totalPendingRequests = pendingRequestsCount + enrollmentRequests.length;

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: School, count: undefined },
    { id: 'calendario', label: 'Calendario y Eventos', icon: Calendar, count: undefined },
    { id: 'horarios', label: 'Horarios Oficiales', icon: FileSpreadsheet, count: 24 },
    { id: 'cuadernos', label: 'Cuadernos y Entregas', icon: BookOpen, count: submissions.length > 0 ? submissions.length : undefined },
    { id: 'kardex', label: 'Kárdex Institucional', icon: ShieldAlert, count: undefined },
    { id: 'profesores', label: 'Profesores', icon: Users, count: teachers.length },
    { id: 'solicitudes', label: 'Solicitudes y Matrícula', icon: UserCheck, count: totalPendingRequests > 0 ? totalPendingRequests : undefined },
    { id: 'estudiantes', label: 'Estudiantes', icon: GraduationCap, count: realStudents.length > 0 ? realStudents.length : undefined },
    { id: 'padres', label: 'Padres/Madres', icon: HeartHandshake, count: SAMPLE_PARENTS.length },
    { id: 'cursos', label: 'Cursos y Paralelos', icon: Layers, count: 12 },
    { id: 'comunicados', label: 'Comunicados', icon: MessageSquare, count: messages.length },
    { id: 'reportes', label: 'Reportes', icon: FileText, count: undefined },
    { id: 'configuracion', label: 'Configuración', icon: Settings, count: undefined },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-indigo-600 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-slate-900 border-emerald-500/60 text-emerald-300'
              : 'bg-slate-900 border-rose-500/60 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* =========================================================================
          1. DESKTOP LATERAL NAVIGATION (SIDEBAR)
         ========================================================================= */}
      <aside className="hidden lg:flex w-72 bg-slate-900/95 border-r border-slate-800/80 flex-col shrink-0 sticky top-0 h-screen z-30 shadow-2xl">
        {/* Brand & School Header */}
        <div className="p-5 border-b border-slate-800/90">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/10 shrink-0">
              <School className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-white font-mono">
                  SIGAE
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                  Collpani
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate" title="U.E. Luis Espinal Tarde de Collpani">
                U.E. Luis Espinal Tarde
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                SIE: 80730142 · El Alto
              </p>
            </div>
          </div>
        </div>

        {/* Director Profile Badge */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/60 border border-indigo-600/50 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0 shadow-inner">
              {currentUser.displayName ? currentUser.displayName.charAt(0) : 'D'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-white block truncate">
                {currentUser.displayName || 'Director Titular'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border inline-flex items-center gap-1 bg-indigo-950/80 text-indigo-300 border-indigo-700/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  DIRECTOR
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Nivel 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Required Lateral Options */}
        <div className="px-3 py-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
          Módulo de Dirección
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as DirectorTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-indigo-800 text-indigo-100 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Account & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
          {currentUser.uid === '385JXeNTGcNrZvV2casb8ICaQvE2' && onGoToSuperAdmin && (
            <button
              onClick={onGoToSuperAdmin}
              className="w-full py-2 px-3 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/70 text-purple-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Panel Superadministrador</span>
            </button>
          )}
          <div className="text-[11px] text-slate-400 truncate">
            {currentUser.email}
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-rose-950/70 border border-slate-700/80 hover:border-rose-700/60 text-slate-300 hover:text-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. MOBILE / TABLET DRAWER
         ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-white font-mono block">SIGAE</span>
                  <span className="text-[10px] text-slate-400 block -mt-1">Collpani · SIE: 80730142</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
              <div className="text-xs font-bold text-white truncate">{currentUser.displayName}</div>
              <div className="text-[10px] text-indigo-400">Director Titular · Nivel Máximo</div>
            </div>

            {/* Nav list */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as DirectorTab);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
              {currentUser.uid === '385JXeNTGcNrZvV2casb8ICaQvE2' && onGoToSuperAdmin && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGoToSuperAdmin();
                  }}
                  className="w-full py-2 px-3 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/70 text-purple-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Panel Superadministrador</span>
                </button>
              )}
              <button
                onClick={onLogout}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. MAIN CONTENT CONTAINER
         ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 cursor-pointer"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Panel de Dirección</span>
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                  SIE: 80730142
                </span>
                <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  Collpani · El Alto
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                Director: <strong className="text-slate-200">{currentUser.displayName}</strong> · U.E. Luis Espinal Tarde de Collpani
              </p>
            </div>
          </div>

          {/* Top Right Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                setActiveTab('comunicados');
                setShowMessageModal(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Emitir Comunicado</span>
            </button>

            {/* Campana de Notificaciones Oficial */}
            <NotificationBellDropdown
              currentUserUid={currentUser.uid}
              onNavigateToItem={(type) => {
                if (type === 'kardex') setActiveTab('kardex');
                else if (type === 'comunicado') setActiveTab('comunicados');
              }}
            />

            {/* Account Info Button */}
            <div className="relative">
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-white cursor-pointer transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {currentUser.displayName ? currentUser.displayName.charAt(0) : 'D'}
                </div>
                <span className="hidden sm:inline text-xs font-bold truncate max-w-[120px]">
                  {currentUser.displayName}
                </span>
              </button>

              {/* Account Dropdown */}
              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="pb-3 border-b border-slate-800 space-y-1">
                    <span className="text-xs font-bold text-white block">
                      {currentUser.displayName}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate font-mono">
                      {currentUser.email}
                    </span>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                      Rol: Director Titular
                    </span>
                  </div>
                  <div className="py-2.5 text-[11px] text-slate-300 space-y-1">
                    <div>
                      <span className="text-slate-500">Unidad Educativa: </span>
                      <span className="font-semibold text-white">Luis Espinal Tarde</span>
                    </div>
                    <div>
                      <span className="text-slate-500">SIE Institucional: </span>
                      <span className="font-mono text-indigo-300 font-bold">80730142</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Distrito: </span>
                      <span>El Alto 1 · La Paz</span>
                    </div>
                    {currentUser.ci && (
                      <div>
                        <span className="text-slate-500">CI Director: </span>
                        <span className="font-mono text-slate-200">{currentUser.ci}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between gap-2">
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setActiveTab('configuracion');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Configuración
                    </button>
                    <button
                      onClick={onLogout}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =========================================================================
            4. MAIN VIEW CONTENT BY ACTIVE TAB
           ========================================================================= */}
        <main className="p-4 sm:p-8 space-y-6 max-w-7xl">
          {/* TAB 1: INICIO */}
          {activeTab === 'inicio' && (
            <div className="space-y-6">
              {/* Institutional Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg">
                      <School className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                          Despacho de Dirección Académica
                        </h2>
                        <span className="text-xs font-mono bg-indigo-950 border border-indigo-700/60 text-indigo-300 px-2.5 py-0.5 rounded-full">
                          SIE: 80730142
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          ADMINISTRADOR INSTITUCIONAL
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Director Titular: <strong className="text-white">{currentUser.displayName}</strong> · U.E. Luis Espinal Tarde de Collpani · Distrito Educativo El Alto 1, Bolivia
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Gestión Escolar: <strong>2026</strong> · Turno: <strong>Tarde</strong> · Subsistema de Educación Regular
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        setActiveTab('profesores');
                        setShowAddTeacherModal(true);
                      }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Registrar Profesor</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('comunicados');
                        setShowMessageModal(true);
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Emitir Comunicado</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Quantitative KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveTab('profesores')}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-600/50 rounded-2xl p-4.5 space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Plantel Docente</span>
                    <Users className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {teachers.length} <span className="text-xs font-normal text-slate-500">profesores</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span>{teachers.filter(t => t.status === 'activo').length} activos</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-400">{teachers.filter(t => t.status === 'licencia').length} en licencia</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('estudiantes')}
                  className="bg-slate-900 border border-slate-800 hover:border-sky-600/50 rounded-2xl p-4.5 space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Estudiantes Matriculados</span>
                    <GraduationCap className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {realStudents.length} <span className="text-xs font-normal text-slate-500">estudiantes</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {realStudents.length > 0 ? 'Padrón oficial en Firestore' : 'Padrón inicial por cargar'}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('cuadernos')}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-600/50 rounded-2xl p-4.5 space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Cuadernos y Entregas</span>
                    <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {submissions.length} <span className="text-xs font-normal text-slate-500">entregas</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span>{submissions.filter(s => s.status === 'aprobado').length} aprobadas</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-amber-400">{submissions.filter(s => s.status === 'enviado' || s.status === 'en_revision').length} pendientes</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('solicitudes')}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-600/50 rounded-2xl p-4.5 space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                    <span>Solicitudes y Matrícula</span>
                    <UserCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {totalPendingRequests} <span className="text-xs font-normal text-slate-500">por revisar</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {pendingRequestsCount} accesos · {enrollmentRequests.length} matrículas
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Quick Access & School Dossier */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-indigo-400" />
                        <span>Ficha Institucional — U.E. Luis Espinal Tarde</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Datos del establecimiento educativo registrado en el Ministerio de Educación
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      SIE 80730142
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400 block font-medium">Ubicación Geográfica:</span>
                      <strong className="text-white block">Zona Collpani, El Alto, La Paz</strong>
                      <span className="text-[11px] text-slate-500">Distrito Educativo El Alto 1</span>
                    </div>

                    <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400 block font-medium">Turno y Nivel:</span>
                      <strong className="text-white block">Turno Tarde</strong>
                      <span className="text-[11px] text-slate-500">Secundaria Comunitaria Productiva</span>
                    </div>

                    <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400 block font-medium">Periodo Vigente:</span>
                      <strong className="text-indigo-400 block font-semibold">1er Trimestre (Gestión 2026)</strong>
                      <span className="text-[11px] text-slate-500">Evaluación continua y trimestral</span>
                    </div>

                    <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-[11px] text-slate-400 block font-medium">Director Titular:</span>
                      <strong className="text-white block">{currentUser.displayName}</strong>
                      <span className="text-[11px] text-emerald-400">Credenciales verificadas</span>
                    </div>
                  </div>

                  {/* 4 Quick Direct Action Buttons */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Accesos Rápidos del Despacho:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <button
                        onClick={() => {
                          setActiveTab('profesores');
                          setShowAddTeacherModal(true);
                        }}
                        className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-all cursor-pointer group"
                      >
                        <UserPlus className="w-4 h-4 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-white block">Nuevo Docente</span>
                        <span className="text-[10px] text-slate-500">Añadir a nómina</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab('comunicados');
                          setShowMessageModal(true);
                        }}
                        className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-all cursor-pointer group"
                      >
                        <Send className="w-4 h-4 text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-white block">Comunicado</span>
                        <span className="text-[10px] text-slate-500">Circular oficial</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('cursos')}
                        className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-all cursor-pointer group"
                      >
                        <Layers className="w-4 h-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-white block">Ver Cursos</span>
                        <span className="text-[10px] text-slate-500">1° a 6° Secundaria</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('reportes')}
                        className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition-all cursor-pointer group"
                      >
                        <FileText className="w-4 h-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-white block">Reportes</span>
                        <span className="text-[10px] text-slate-500">Nómina y RUDE</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Recent Official Communications */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        <span>Avisos de Dirección</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('comunicados')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        Ver todos →
                      </button>
                    </div>

                    <div className="space-y-3">
                      {messages.slice(0, 3).map(msg => (
                        <div
                          key={msg.id}
                          className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {msg.subject}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                msg.priority === 'urgente'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : msg.priority === 'alta'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {msg.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('comunicados');
                      setShowMessageModal(true);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Redactar Nuevo Aviso</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFESORES */}
          {activeTab === 'profesores' && (
            <div className="space-y-6">
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <span>Gestión de Profesores — U.E. Luis Espinal Tarde</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plantel docente institucional (SIE: 80730142) · Sincronizado en tiempo real con Firestore
                  </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                  {teachers.length === 0 && !loading && (
                    <button
                      onClick={handleSeedCollpaniTeachers}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Cargar la nómina sugerida oficial de la U.E. Luis Espinal Tarde"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Cargar Nómina Sugerida (Collpani)</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddTeacherModal(true)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Registrar Nuevo Profesor</span>
                  </button>
                </div>
              </div>

              {/* Alerta de solicitudes docentes pendientes */}
              {accessRequests.some(r => r.status === 'pendiente' && r.requestedRole === 'profesor') && (
                <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-200">
                        {accessRequests.filter(r => r.status === 'pendiente' && r.requestedRole === 'profesor').length} Solicitud(es) Docente(s) Pendiente(s) de Aprobación
                      </h4>
                      <p className="text-xs text-amber-300/80">
                        Profesores registrados mediante la plataforma que aguardan la autorización de la Dirección para acceder a su portal.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('solicitudes')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    Revisar y Autorizar
                  </button>
                </div>
              )}

              {/* Status Counters Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Total Registrados:</span>
                    <strong className="text-lg font-bold text-white font-mono">{teachers.length}</strong>
                  </div>
                  <Users className="w-6 h-6 text-indigo-400/50" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Docentes Activos:</span>
                    <strong className="text-lg font-bold text-emerald-400 font-mono">
                      {teachers.filter(t => t.status === 'activo').length}
                    </strong>
                  </div>
                  <UserCheck className="w-6 h-6 text-emerald-400/50" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Pendientes Activación:</span>
                    <strong className="text-lg font-bold text-amber-400 font-mono">
                      {teachers.filter(t => t.status === 'pendiente_activacion').length}
                    </strong>
                  </div>
                  <Clock className="w-6 h-6 text-amber-400/50" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">En Licencia / Inactivos:</span>
                    <strong className="text-lg font-bold text-slate-300 font-mono">
                      {teachers.filter(t => t.status === 'licencia' || t.status === 'inactivo' || t.status === 'retirado').length}
                    </strong>
                  </div>
                  <UserMinus className="w-6 h-6 text-slate-400/50" />
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
                  {/* Text search */}
                  <div className="relative w-full lg:w-96">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={teacherSearch}
                      onChange={e => setTeacherSearch(e.target.value)}
                      placeholder="Buscar por nombre, CI, materia, curso o especialidad..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Dropdowns for Specialty and Course */}
                  <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Especialidad:</span>
                      <select
                        value={teacherSpecialtyFilter}
                        onChange={e => setTeacherSpecialtyFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[180px] truncate"
                      >
                        <option value="todas">Todas las especialidades</option>
                        {STANDARD_SPECIALTIES.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Curso:</span>
                      <select
                        value={teacherGradeFilter}
                        onChange={e => setTeacherGradeFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[160px] truncate"
                      >
                        <option value="todos">Todos los cursos</option>
                        {SECONDARY_GRADES.map(g => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(teacherSearch || teacherStatusFilter !== 'todos' || teacherSpecialtyFilter !== 'todas' || teacherGradeFilter !== 'todos') && (
                      <button
                        onClick={() => {
                          setTeacherSearch('');
                          setTeacherStatusFilter('todos');
                          setTeacherSpecialtyFilter('todas');
                          setTeacherGradeFilter('todos');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Pill Filters */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span>Filtrar por estado:</span>
                  </span>
                  {(
                    [
                      { id: 'todos', label: 'Todos' },
                      { id: 'activo', label: 'Activos' },
                      { id: 'pendiente_activacion', label: 'Pendiente Activación' },
                      { id: 'licencia', label: 'En Licencia' },
                      { id: 'inactivo', label: 'Inactivos' },
                      { id: 'retirado', label: 'Retirados' },
                    ] as const
                  ).map(st => (
                    <button
                      key={st.id}
                      onClick={() => setTeacherStatusFilter(st.id as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        teacherStatusFilter === st.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teachers List Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Mostrando <strong className="text-white">{filteredTeachers.length}</strong> de{' '}
                    <strong className="text-white">{teachers.length}</strong> profesores registrados
                  </span>
                  <span className="text-[11px] text-indigo-400 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    Sincronización en tiempo real (/teachers y /users)
                  </span>
                </div>

                {loading ? (
                  <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                    <Clock className="w-6 h-6 animate-spin text-indigo-400" />
                    <span>Cargando nómina docente desde Firestore...</span>
                  </div>
                ) : teachers.length === 0 ? (
                  /* EMPTY STATE: Database has 0 teachers */
                  <div className="p-16 text-center text-slate-400 text-xs space-y-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                      <Users className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white">No hay profesores registrados en el plantel</h3>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Aún no se ha registrado ningún docente en la base de datos de la U.E. Luis Espinal Tarde de Collpani.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => setShowAddTeacherModal(true)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Registrar Primer Profesor</span>
                      </button>
                      <button
                        onClick={handleSeedCollpaniTeachers}
                        className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Cargar Nómina Inicial Sugerida</span>
                      </button>
                    </div>
                  </div>
                ) : filteredTeachers.length === 0 ? (
                  /* FILTER EMPTY STATE: Matching 0 results */
                  <div className="p-12 text-center text-slate-400 text-xs space-y-3">
                    <Search className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="font-semibold text-slate-300">No se encontraron profesores con los filtros aplicados.</p>
                    <p className="text-[11px] text-slate-500">Prueba cambiando el texto de búsqueda o el estado seleccionado.</p>
                    <button
                      onClick={() => {
                        setTeacherSearch('');
                        setTeacherStatusFilter('todos');
                        setTeacherSpecialtyFilter('todas');
                        setTeacherGradeFilter('todos');
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Restablecer Filtros
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold bg-slate-950/40">
                          <th className="py-3.5 px-4 font-semibold">Profesor(a)</th>
                          <th className="py-3.5 px-3 font-semibold">Carnet CI</th>
                          <th className="py-3.5 px-3 font-semibold">Especialidad & Cursos</th>
                          <th className="py-3.5 px-3 font-semibold">Carga Horaria</th>
                          <th className="py-3.5 px-3 font-semibold">Contacto</th>
                          <th className="py-3.5 px-3 font-semibold">Estado de Cuenta</th>
                          <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredTeachers.map(teacher => (
                          <tr key={teacher.id} className="hover:bg-slate-950/40 transition-colors">
                            {/* Name & Avatar */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0 shadow-inner">
                                  {teacher.fullName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-white truncate max-w-[200px]" title={teacher.fullName}>
                                    {teacher.fullName}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]" title={teacher.email}>
                                    {teacher.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* CI */}
                            <td className="py-3.5 px-3 font-mono text-slate-300 text-[11px]">
                              <span className="font-semibold text-white">{teacher.ci}</span>
                            </td>

                            {/* Specialty & Assignments */}
                            <td className="py-3.5 px-3">
                              <span className="font-medium text-indigo-300 block max-w-[220px] truncate" title={teacher.specialty}>
                                {teacher.specialty}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                                  {teacher.assignedGrades?.length || 0} cursos
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                                  {teacher.assignedSubjects?.length || 0} materias
                                </span>
                              </div>
                            </td>

                            {/* Hourly Load */}
                            <td className="py-3.5 px-3 font-mono text-slate-300 text-[11px]">
                              <span className="font-bold text-white">{teacher.hourlyLoad}</span> hrs/mes
                            </td>

                            {/* Phone */}
                            <td className="py-3.5 px-3 font-mono text-slate-400 text-[11px]">
                              {teacher.phone}
                            </td>

                            {/* Status with Badge and Auth Linkage indicator */}
                            <td className="py-3.5 px-3">
                              <div className="space-y-1">
                                <button
                                  onClick={() => handleToggleStatus(teacher.id, teacher.status)}
                                  title="Haga clic para alternar el estado del profesor"
                                  className="cursor-pointer transition-transform hover:scale-105 block"
                                >
                                  {renderStatusBadge(teacher.status)}
                                </button>
                                <div className="text-[10px] font-mono">
                                  {teacher.authUid ? (
                                    <span className="text-emerald-400 font-semibold flex items-center gap-1" title={`UID: ${teacher.authUid}`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                                      Auth Vinculado
                                    </span>
                                  ) : (
                                    <span className="text-amber-400/80 flex items-center gap-1" title="Pendiente de vinculación con Firebase Auth">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 inline-block"></span>
                                      Auth Pendiente
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* 1. Ver Ficha Individual */}
                                <button
                                  onClick={() => setViewingTeacher(teacher)}
                                  title="Ver Ficha Completa del Docente"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                </button>

                                {/* 2. Asignar Materias y Cursos */}
                                <button
                                  onClick={() => handleOpenAssign(teacher)}
                                  title="Asignar Materias y Cursos"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                                </button>

                                {/* 3. Editar Datos */}
                                <button
                                  onClick={() => handleOpenEdit(teacher)}
                                  title="Editar Datos del Profesor"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                </button>

                                {/* 4. Gestión de Acceso y Activación */}
                                <button
                                  onClick={() => setAccessModalTeacher(teacher)}
                                  title="Gestión de Acceso y Activación Institucional"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                                </button>

                                {/* 5. Alternar Estado Rápido */}
                                <button
                                  onClick={() => handleToggleStatus(teacher.id, teacher.status)}
                                  title="Cambiar Estado Rápido"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                                </button>

                                {/* 6. Dar de Baja / Eliminar */}
                                <button
                                  onClick={() => handleOpenDeleteModal(teacher)}
                                  title="Dar de Baja o Eliminar Docente"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                  <UserX className="w-3.5 h-3.5 text-rose-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: GESTIÓN DE CUADERNOS PEDAGÓGICOS Y ENTREGAS DIGITALES */}
          {activeTab === 'cuadernos' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span>Gestión de Cuadernos Pedagógicos y Entregas Digitales</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supervisión institucional, revisión formal, aprobación y publicación a familias bajo la Ley 070 (R.M. 001/2026)
                  </p>
                </div>

                <button
                  onClick={loadSubmissionsAndStudents}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Actualizar Entregas</span>
                </button>
              </div>

              {/* Status KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Total Presentaciones:</span>
                    <strong className="text-lg font-bold text-white font-mono">{submissions.length}</strong>
                  </div>
                  <BookOpen className="w-6 h-6 text-indigo-400/50" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Por Revisar:</span>
                    <strong className="text-lg font-bold text-amber-400 font-mono">
                      {submissions.filter(s => s.status === 'enviado' || s.status === 'en_revision').length}
                    </strong>
                  </div>
                  <Clock className="w-6 h-6 text-amber-400/50" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Aprobadas por Dirección:</span>
                    <strong className="text-lg font-bold text-emerald-400 font-mono">
                      {submissions.filter(s => s.status === 'aprobado').length}
                    </strong>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400/50" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Publicadas a Familias:</span>
                    <strong className="text-lg font-bold text-sky-400 font-mono">
                      {submissions.filter(s => s.isPublishedToParents).length}
                    </strong>
                  </div>
                  <Users className="w-6 h-6 text-sky-400/50" />
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Docente Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Docente:</span>
                    <select
                      value={subTeacherFilter}
                      onChange={e => setSubTeacherFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="todos">Todos los profesores</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.authUid || t.id}>
                          {t.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Curso Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Curso:</span>
                    <select
                      value={subCourseFilter}
                      onChange={e => setSubCourseFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="todos">Todos los cursos</option>
                      {SECONDARY_24_COURSES.map(c => (
                        <option key={c.code} value={c.code}>{c.gradeLevel} {c.parallel} ({c.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Trimestre Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Período:</span>
                    <select
                      value={subTrimesterFilter}
                      onChange={e => setSubTrimesterFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="todos">Todos los períodos</option>
                      <option value="1T">1.er Trimestre</option>
                      <option value="2T">2.° Trimestre</option>
                      <option value="3T">3.er Trimestre</option>
                      <option value="anual">Consolidado Anual</option>
                    </select>
                  </div>

                  {/* Estado Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Estado:</span>
                    <select
                      value={subStatusFilter}
                      onChange={e => setSubStatusFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="todos">Todos los estados</option>
                      <option value="enviado">Pendiente de Revisión</option>
                      <option value="aprobado">Aprobado por Dirección</option>
                      <option value="observado">Observado con Requerimientos</option>
                    </select>
                  </div>
                </div>

                {(subTeacherFilter !== 'todos' || subCourseFilter !== 'todos' || subTrimesterFilter !== 'todos' || subStatusFilter !== 'todos') && (
                  <button
                    onClick={() => {
                      setSubTeacherFilter('todos');
                      setSubCourseFilter('todos');
                      setSubTrimesterFilter('todos');
                      setSubStatusFilter('todos');
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>

              {/* Submissions List */}
              {submissions
                .filter(s => subTeacherFilter === 'todos' ? true : s.teacherUid === subTeacherFilter)
                .filter(s => subCourseFilter === 'todos' ? true : s.courseCode === subCourseFilter)
                .filter(s => subTrimesterFilter === 'todos' ? true : s.trimester === subTrimesterFilter)
                .filter(s => subStatusFilter === 'todos' ? true : s.status === subStatusFilter)
                .length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400 mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No se encontraron entregas de cuadernos pedagógicos</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {submissions.length === 0
                      ? 'Los docentes del plantel podrán remitir oficialmente sus cuadernos pedagógicos, notas y asistencias directamente desde su portal institucional ("Mi cuaderno pedagógico").'
                      : 'No hay entregas que coincidan con los criterios de filtrado seleccionados.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions
                    .filter(s => subTeacherFilter === 'todos' ? true : s.teacherUid === subTeacherFilter)
                    .filter(s => subCourseFilter === 'todos' ? true : s.courseCode === subCourseFilter)
                    .filter(s => subTrimesterFilter === 'todos' ? true : s.trimester === subTrimesterFilter)
                    .filter(s => subStatusFilter === 'todos' ? true : s.status === subStatusFilter)
                    .map(sub => {
                      const isApproved = sub.status === 'aprobado';
                      const isObserved = sub.status === 'observado';

                      return (
                        <div
                          key={sub.id}
                          className={`bg-slate-900 border rounded-3xl p-6 space-y-4 shadow-xl transition-all ${
                            isApproved
                              ? 'border-emerald-800/60 hover:border-emerald-700'
                              : isObserved
                              ? 'border-rose-800/60 hover:border-rose-700'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                            <div className="flex items-start gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 font-bold text-base shrink-0">
                                {sub.courseCode}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-base text-white">{sub.subject}</h3>
                                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-indigo-300">
                                    Curso {sub.courseCode} ({sub.gradeLevel} {sub.parallel})
                                  </span>
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
                                    {sub.trimester === 'anual' ? 'Consolidado Anual' : `${sub.trimester === '1T' ? '1.er' : sub.trimester === '2T' ? '2.°' : '3.er'} Trimestre`}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  Docente Titular: <strong className="text-slate-200">{sub.teacherName}</strong> · Presentado el {new Date(sub.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                            </div>

                            {/* Status and Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                                isApproved
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                  : isObserved
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  isApproved ? 'bg-emerald-400' : isObserved ? 'bg-rose-400' : 'bg-amber-400 animate-pulse'
                                }`}></span>
                                {isApproved ? 'Aprobado por Dirección' : isObserved ? 'Observado' : 'Pendiente de Revisión'}
                              </span>

                              {sub.isPublishedToParents ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-sky-400" />
                                  Publicado a Familias
                                </span>
                              ) : isApproved ? (
                                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                                  No publicado a padres aún
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Quantities info */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                              <span className="text-[11px] text-slate-400 block">Estudiantes en Nómina:</span>
                              <strong className="text-white text-sm font-mono">{sub.totalStudents || 0} estudiantes</strong>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                              <span className="text-[11px] text-slate-400 block">Actividades Evaluadas:</span>
                              <strong className="text-white text-sm font-mono">{sub.activitiesCount || 0} registradas</strong>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                              <span className="text-[11px] text-slate-400 block">Tipo de Documento:</span>
                              <strong className="text-indigo-300 text-xs uppercase">{sub.documentType.replace('_', ' ')}</strong>
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                              <span className="text-[11px] text-slate-400 block">Gestión Escolar:</span>
                              <strong className="text-slate-300 text-xs font-mono">2026 · Ley 070</strong>
                            </div>
                          </div>

                          {/* Observations if observed */}
                          {isObserved && sub.reviewObservations && (
                            <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                                <span>Observaciones emitidas por Dirección:</span>
                              </div>
                              <p className="text-slate-300 leading-relaxed pl-5">
                                "{sub.reviewObservations}"
                              </p>
                              {sub.reviewedAt && (
                                <span className="text-[10px] text-slate-500 font-mono block pl-5">
                                  Revisado el {new Date(sub.reviewedAt).toLocaleString('es-BO')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                            <button
                              onClick={() => handleDownloadExcel(sub)}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Descargar Excel Oficial (9 Hojas)</span>
                            </button>

                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Botón Observar */}
                              <button
                                onClick={() => handleOpenObservationModal(sub)}
                                className="px-3.5 py-2 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                <span>{isObserved ? 'Editar Observaciones' : 'Observar Entrega'}</span>
                              </button>

                              {/* Botón Aprobar */}
                              {!isApproved && (
                                <button
                                  onClick={() => handleApproveSubmission(sub)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Aprobar Entrega</span>
                                </button>
                              )}

                              {/* Botón Publicar a Familias */}
                              {isApproved && !sub.isPublishedToParents && (
                                <button
                                  onClick={() => handlePublishGrades(sub)}
                                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-600/20 transition-all"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Publicar Calificaciones a Familias</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB: SOLICITUDES DE ACCESO Y MATRÍCULA */}
          {activeTab === 'solicitudes' && (
            <div className="space-y-6">
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-400" />
                    <span>Solicitudes de Acceso y Matrícula Estudiantil</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Revisión y autorización oficial de cuentas docentes, vinculaciones familiares e incorporaciones a nómina
                  </p>
                </div>

                <button
                  onClick={loadSubmissionsAndStudents}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Actualizar</span>
                </button>
              </div>

              {/* Subtabs Selector: Cuentas vs Matrículas */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setSolicitudesSubtab('cuentas')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    solicitudesSubtab === 'cuentas'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Cuentas de Acceso Institucional</span>
                  {pendingRequestsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-bold">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSolicitudesSubtab('matriculas')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    solicitudesSubtab === 'matriculas'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Incorporaciones a Matrícula (Docentes)</span>
                  {enrollmentRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-sky-400 text-slate-950 font-mono text-[10px] font-bold">
                      {enrollmentRequests.length}
                    </span>
                  )}
                </button>
              </div>

              {solicitudesSubtab === 'cuentas' && (
                <div className="space-y-6">
                  {/* Status Counters Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Total Solicitudes:</span>
                        <strong className="text-lg font-bold text-white font-mono">{accessRequests.length}</strong>
                      </div>
                      <UserCheck className="w-6 h-6 text-indigo-400/50" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Pendientes:</span>
                        <strong className="text-lg font-bold text-amber-400 font-mono">
                          {accessRequests.filter(r => r.status === 'pendiente').length}
                        </strong>
                      </div>
                      <Clock className="w-6 h-6 text-amber-400/50" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Docentes:</span>
                        <strong className="text-lg font-bold text-indigo-400 font-mono">
                          {accessRequests.filter(r => r.requestedRole === 'profesor').length}
                        </strong>
                      </div>
                      <Users className="w-6 h-6 text-indigo-400/50" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Padres/Tutores:</span>
                        <strong className="text-lg font-bold text-emerald-400 font-mono">
                          {accessRequests.filter(r => r.requestedRole === 'padre').length}
                        </strong>
                      </div>
                      <HeartHandshake className="w-6 h-6 text-emerald-400/50" />
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-medium">Estado:</span>
                      {(['pendiente', 'todas', 'aprobada', 'rechazada'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => setReqFilter(st)}
                          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer capitalize ${
                            reqFilter === st
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {st === 'todas' ? 'Todas' : st === 'pendiente' ? 'Pendientes' : st === 'aprobada' ? 'Aprobadas' : 'Rechazadas'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-medium">Rol:</span>
                      {(['todos', 'profesor', 'padre'] as const).map(role => (
                        <button
                          key={role}
                          onClick={() => setReqRoleFilter(role)}
                          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer capitalize ${
                            reqRoleFilter === role
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {role === 'todos' ? 'Todos' : role === 'profesor' ? 'Profesores' : 'Padres'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Requests List */}
                  {accessRequests
                    .filter(r => reqFilter === 'todas' ? true : r.status === reqFilter)
                    .filter(r => reqRoleFilter === 'todos' ? true : r.requestedRole === reqRoleFilter)
                    .length === 0 ? (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                      <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-300">No hay solicitudes registradas con estos filtros</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Cuando un profesor o padre de familia registre una cuenta o solicite vinculación institucional, aparecerá aquí para su autorización.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accessRequests
                        .filter(r => reqFilter === 'todas' ? true : r.status === reqFilter)
                        .filter(r => reqRoleFilter === 'todos' ? true : r.requestedRole === reqRoleFilter)
                        .map(req => {
                          const isPending = req.status === 'pendiente';
                          const isApproved = req.status === 'aprobada';
                          const isTeacher = req.requestedRole === 'profesor';

                          return (
                            <div
                              key={req.id}
                              className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    isTeacher ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                                  }`}>
                                    {isTeacher ? <Users className="w-5 h-5" /> : <HeartHandshake className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-sm text-white">{req.displayName}</h3>
                                    <span className="text-[11px] text-slate-400">{req.email}</span>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                  isPending
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : isApproved
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {req.status}
                                </span>
                              </div>

                              <div className="bg-slate-950/60 rounded-xl p-3 space-y-1.5 text-xs border border-slate-800/60">
                                <div className="flex items-center justify-between text-slate-400">
                                  <span>Rol Solicitado:</span>
                                  <strong className="text-white capitalize">{req.requestedRole}</strong>
                                </div>
                                {req.ci && (
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span>Cédula de Identidad:</span>
                                    <span className="text-slate-200 font-mono">{req.ci}</span>
                                  </div>
                                )}
                                {req.phone && (
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span>Teléfono / WhatsApp:</span>
                                    <span className="text-slate-200 font-mono">{req.phone}</span>
                                  </div>
                                )}
                                {isTeacher && req.specialty && (
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span>Especialidad Docente:</span>
                                    <span className="text-indigo-300 font-medium">{req.specialty}</span>
                                  </div>
                                )}
                                {!isTeacher && req.studentName && (
                                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                                    <span className="text-[11px] font-bold text-emerald-400 block">Estudiante a Tutelar:</span>
                                    <div className="text-slate-200 font-medium">{req.studentName}</div>
                                    {req.studentRude && (
                                      <div className="text-[11px] text-slate-400 font-mono">RUDE: {req.studentRude}</div>
                                    )}
                                    {req.grade && (
                                      <div className="text-[11px] text-slate-400">Curso: {req.grade}</div>
                                    )}
                                    {req.relationship && (
                                      <div className="text-[11px] text-slate-400">Parentesco: {req.relationship}</div>
                                    )}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-500 pt-1">
                                  Registrado: {new Date(req.createdAt).toLocaleString('es-BO')}
                                </div>
                              </div>

                              {isPending && (
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={() => handleApproveRequest(req)}
                                    disabled={resolvingReqId === req.id}
                                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{resolvingReqId === req.id ? 'Aprobando...' : 'Aprobar y Autorizar'}</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req)}
                                    disabled={resolvingReqId === req.id}
                                    className="py-2 px-3 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Rechazar</span>
                                  </button>
                                </div>
                              )}

                              {isApproved && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 rounded-xl px-3 py-2 font-medium">
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  <span>Autorizado por Dirección Institucional</span>
                                </div>
                              )}

                              {req.status === 'rechazada' && (
                                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/30 rounded-xl px-3 py-2 font-medium">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  <span>Solicitud Rechazada</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {solicitudesSubtab === 'matriculas' && (
                <div className="space-y-4">
                  {enrollmentRequests.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
                      <GraduationCap className="w-10 h-10 text-slate-600 mx-auto" />
                      <h3 className="text-sm font-bold text-white">No hay solicitudes de incorporación pendientes</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        Cuando un docente solicite incorporar a un nuevo estudiante a su curso desde la nómina del cuaderno pedagógico, la solicitud aparecerá aquí para su aprobación y registro en el padrón institucional oficial.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {enrollmentRequests.map((req: any) => (
                        <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 font-bold text-sm">
                                {req.courseCode}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-white">{req.fullName}</h3>
                                <span className="text-[11px] text-slate-400">Curso: {req.courseCode} ({req.gradeLevel} {req.parallel})</span>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800">
                              Pendiente
                            </span>
                          </div>

                          <div className="bg-slate-950 rounded-xl p-3 space-y-1 text-xs border border-slate-800/80">
                            <div className="flex justify-between text-slate-400">
                              <span>Código RUDE:</span>
                              <span className="font-mono text-white">{req.rude}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Cédula CI:</span>
                              <span className="font-mono text-white">{req.ci}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Profesor Solicitante:</span>
                              <span className="text-indigo-300 font-semibold">{req.requestedByName}</span>
                            </div>
                            {req.reason && (
                              <div className="pt-2 border-t border-slate-800/80 text-slate-300">
                                <span className="text-[11px] text-slate-500 block">Motivo:</span>
                                <span>"{req.reason}"</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-1">
                            <button
                              onClick={() => handleApproveEnrollment(req)}
                              disabled={resolvingEnrollmentId === req.id}
                              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{resolvingEnrollmentId === req.id ? 'Aprobando e incorporando...' : 'Aprobar Incorporación a Matrícula Oficial'}</span>
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

          {/* TAB 3: ESTUDIANTES */}
          {activeTab === 'estudiantes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-sky-400" />
                    <span>Padrón Institucional de Estudiantes — U.E. Luis Espinal Tarde</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Supervisión de matrícula oficial con código RUDE en Cloud Firestore (Gestión 2026)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
                    Total Matriculados: <strong className="text-white">{realStudents.length}</strong>
                  </div>
                  <button
                    onClick={loadSubmissionsAndStudents}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                    title="Actualizar padrón"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pending Enrollment Requests Banner */}
              {enrollmentRequests.length > 0 && (
                <div className="bg-sky-950/40 border border-sky-800/60 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-900/60 border border-sky-700/50 flex items-center justify-center text-sky-300">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <strong className="text-white block">Hay {enrollmentRequests.length} solicitudes de incorporación docente pendientes</strong>
                      <span className="text-slate-400">Profesores han solicitado inscribir a nuevos estudiantes a sus paralelos.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('solicitudes');
                      setSolicitudesSubtab('matriculas');
                    }}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shrink-0 cursor-pointer transition-all shadow-sm"
                  >
                    Revisar Solicitudes →
                  </button>
                </div>
              )}

              {/* Empty State if 0 students */}
              {realStudents.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 mx-auto">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Padrón Institucional Vacío en Firestore</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      El padrón de estudiantes en Cloud Firestore no tiene registros activos aún. No se han inventado estudiantes ficticios para completar la vista.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleSeedStudents}
                      disabled={seedingStudents}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{seedingStudents ? 'Cargando padrón oficial...' : 'Cargar Padrón Institucional Oficial de Estudiantes (Roster 2026)'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Roster Table with Search */
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Buscar por nombre, RUDE o curso..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      Mostrando <strong className="text-white">{filteredStudents.length}</strong> de <strong className="text-white">{realStudents.length}</strong> estudiantes matriculados
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                          <th className="pb-3 font-semibold">Código RUDE</th>
                          <th className="pb-3 font-semibold">Cédula CI</th>
                          <th className="pb-3 font-semibold">Estudiante</th>
                          <th className="pb-3 font-semibold">Curso y Paralelo</th>
                          <th className="pb-3 font-semibold">Expediente</th>
                          <th className="pb-3 font-semibold text-right">Estado Matrícula</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredStudents.map(st => (
                          <tr key={st.id} className="hover:bg-slate-950/40 transition-colors">
                            <td className="py-3 font-mono text-slate-300 text-[11px]">
                              {st.rude}
                            </td>
                            <td className="py-3 font-mono text-slate-400 text-[11px]">
                              {st.ci ? `${st.ci} ${st.ciExpedition || ''}` : 'S/CI'}
                            </td>
                            <td className="py-3 font-bold text-white">
                              {st.fullName}
                            </td>
                            <td className="py-3 text-sky-300">
                              {st.gradeLevel} Paralelo {st.parallel}
                            </td>
                            <td className="py-3 text-slate-400 font-mono text-[11px]">
                              {st.internalCode || 'REG-2026'}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  st.enrollmentStatus === 'efectivo'
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                                }`}
                              >
                                {st.enrollmentStatus.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PADRES/MADRES */}
          {activeTab === 'padres' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <HeartHandshake className="w-5 h-5 text-emerald-400" />
                    <span>Directorio de Padres de Familia y Junta Escolar</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Coordinación institucional con tutores legales y representación de padres de Collpani
                  </p>
                </div>
              </div>

              {/* Junta Escolar Executive Card */}
              <div className="bg-gradient-to-r from-slate-900 to-emerald-950/40 border border-emerald-800/50 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Directorio de la Junta Escolar de Collpani — Gestión 2026
                    </h3>
                    <p className="text-xs text-slate-400">
                      Entidad de control social y coordinación con la Dirección de la U.E. Luis Espinal Tarde
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Presidente Junta:</span>
                    <strong className="text-white block">Don Roberto González Paredes</strong>
                    <span className="text-[11px] font-mono text-emerald-400">+591 72098415</span>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Vicepresidenta:</span>
                    <strong className="text-white block">Doña Martha Flores Quispe</strong>
                    <span className="text-[11px] font-mono text-emerald-400">+591 71239012</span>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Vocal de Hacienda:</span>
                    <strong className="text-white block">Doña Silvia Ramos Choque</strong>
                    <span className="text-[11px] font-mono text-emerald-400">+591 68901234</span>
                  </div>
                </div>
              </div>

              {/* Parents Directory Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">
                  Directorio de Tutores y Representantes Registrados
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                        <th className="pb-3 font-semibold">Padre / Tutor Legal</th>
                        <th className="pb-3 font-semibold">Cargo / Rol</th>
                        <th className="pb-3 font-semibold">Estudiante a Cargo</th>
                        <th className="pb-3 font-semibold">Teléfono de Contacto</th>
                        <th className="pb-3 font-semibold text-right">Verificación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {SAMPLE_PARENTS.map(p => (
                        <tr key={p.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="py-3 font-bold text-white">
                            {p.name}
                          </td>
                          <td className="py-3 text-indigo-300 font-medium">
                            {p.role}
                          </td>
                          <td className="py-3 text-slate-300">
                            {p.student}
                          </td>
                          <td className="py-3 font-mono text-emerald-400">
                            {p.phone}
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                              Verificado SIGAE
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CURSOS Y PARALELOS */}
          {activeTab === 'cursos' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-400" />
                    <span>Cursos y Paralelos — Secundaria Comunitaria Productiva</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Asignación de aulas físicas, profesores tutores y materias curriculares (Turno Tarde)
                  </p>
                </div>
              </div>

              {/* Grid of Courses */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {groups.map(grp => (
                  <div
                    key={grp.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white font-mono">
                          {grp.name} - Paralelo "{grp.parallel}"
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                          {grp.shift.toUpperCase()}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Aula Asignada:</span>
                          <span className="font-semibold text-slate-200">{grp.classroom || 'Aula 201'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Matriculados:</span>
                          <span className="font-mono text-white font-bold">{grp.studentCount} alumnos</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-slate-500">Profesor Tutor:</span>
                          <strong className="text-indigo-400 truncate max-w-[150px]">
                            {grp.tutorTeacherName || 'Sin asignar'}
                          </strong>
                        </div>
                      </div>

                      {/* Subjects list */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                          Materias Principales:
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {grp.subjects?.map(s => (
                            <div
                              key={s.id}
                              className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between text-[11px]"
                            >
                              <span className="font-medium text-slate-300 truncate max-w-[120px]">
                                {s.name}
                              </span>
                              <span className="text-[10px] text-indigo-300 truncate max-w-[120px]">
                                {s.teacherName}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Gestión 2026</span>
                      <span className="text-emerald-400 font-semibold">Activo</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: CALENDARIO Y GESTIÓN INSTITUCIONAL */}
          {activeTab === 'calendario' && (
            <div className="space-y-6">
              <UnifiedSchoolCalendar
                currentUser={currentUser}
                courseCode={selectedCalendarCourse}
                allowedCourseCodes={SECONDARY_24_COURSES.map(c => c.code)}
                onSelectCourse={setSelectedCalendarCourse}
                onOpenNewEventModal={() => setShowNewCommModal(true)}
              />
            </div>
          )}

          {/* TAB: HORARIOS OFICIALES */}
          {activeTab === 'horarios' && (
            <OfficialScheduleManager currentUser={currentUser} />
          )}

          {/* TAB 6: COMUNICADOS */}
          {activeTab === 'comunicados' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                    <span>Comunicados Oficiales de Dirección — U.E. Luis Espinal Tarde</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Emisión de circulares, convocatorias a consejos pedagógicos y avisos oficiales
                  </p>
                </div>

                <button
                  onClick={() => setShowMessageModal(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Send className="w-4 h-4" />
                  <span>Redactar Comunicado</span>
                </button>
              </div>

              {/* List of Messages */}
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-3xl">
                    No hay comunicados oficiales emitidos aún.
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white">
                            {msg.subject}
                          </h3>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              msg.priority === 'urgente'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                : msg.priority === 'alta'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            Prioridad: {msg.priority}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {msg.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(msg.createdAt).toLocaleDateString('es-BO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>

                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                        <div>
                          <span>Remitente: </span>
                          <strong className="text-white">{msg.senderName}</strong>
                          <span className="text-slate-600"> · </span>
                          <span>Destinatario: </span>
                          <strong className="text-indigo-300">{msg.recipientName}</strong>
                        </div>

                        <button
                          onClick={() => {
                            if (window.confirm('¿Deseas archivar o eliminar este comunicado?')) {
                              directorService.deleteMessage(msg.id);
                              showNotification('Comunicado eliminado.');
                            }
                          }}
                          className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 7: REPORTES */}
          {activeTab === 'reportes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <span>Centro de Reportes Institucionales — SIE 80730142</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generación de informes oficiales para la Dirección Distrital de Educación El Alto 1
                  </p>
                </div>
              </div>

              {/* 4 Official Report Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Nómina y Filiación del Plantel Docente
                        </h3>
                        <span className="text-[11px] text-indigo-300 font-mono">Formulario SIE-DOC-2026</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Listado oficial con CIs, expedición departamental, especialidad y carga horaria mensual de los profesores titulares de la U.E. Luis Espinal Tarde.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportModal('nomina_docente')}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ver e Imprimir Reporte Oficial</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-500/50 flex items-center justify-center text-sky-400">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Estadística de Matrícula General (RUDE)
                        </h3>
                        <span className="text-[11px] text-sky-300 font-mono">Formulario SIE-EST-2026</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Cuadro resumen de los 340 estudiantes matriculados en Secundaria (1° a 6°), segregados por curso, género y estado de inscripción regular.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportModal('matricula_estudiantil')}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ver e Imprimir Reporte Oficial</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Distribución Curricular y Cursos (Aulas)
                        </h3>
                        <span className="text-[11px] text-amber-300 font-mono">Plan de Estudios 2026</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Organización de las 12 aulas de Secundaria Comunitaria Productiva, tutores de paralelo y profesores designados por área del saber.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportModal('distribucion_curricular')}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ver e Imprimir Reporte Oficial</span>
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Acta de Auditoría y Estado de Seguridad
                        </h3>
                        <span className="text-[11px] text-emerald-300 font-mono">Firebase Security Audit</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Certificación del estado de cuentas de usuarios, reglas de acceso jerárquico (RBAC) y cumplimiento de políticas de confidencialidad institucional.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReportModal('auditoria_seguridad')}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ver e Imprimir Reporte Oficial</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: CONFIGURACIÓN */}
          {activeTab === 'configuracion' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-400" />
                    <span>Configuración Institucional — U.E. Luis Espinal Tarde</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Parámetros administrativos y técnicos del establecimiento escolar (SIE: 80730142)
                  </p>
                </div>
              </div>

              {/* Form Settings */}
              <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-400" />
                    <span>Identidad de la Unidad Educativa</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Información oficial registrada ante la Dirección Distrital de El Alto 1
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Nombre de la Unidad Educativa:</label>
                    <input
                      type="text"
                      value={cfgSchoolName}
                      onChange={e => setCfgSchoolName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Código SIE:</label>
                    <input
                      type="text"
                      value={cfgSie}
                      onChange={e => setCfgSie(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Distrito Educativo:</label>
                    <input
                      type="text"
                      value={cfgDistrict}
                      onChange={e => setCfgDistrict(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Departamento:</label>
                    <input
                      type="text"
                      value={cfgDepartment}
                      onChange={e => setCfgDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Turno Oficial:</label>
                    <select
                      value={cfgShift}
                      onChange={e => setCfgShift(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="tarde">Tarde</option>
                      <option value="mañana">Mañana</option>
                      <option value="completo">Jornada Completa</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Gestión Académica:</label>
                    <input
                      type="text"
                      value={cfgAcademicYear}
                      onChange={e => setCfgAcademicYear(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Director Titular:</label>
                    <input
                      type="text"
                      value={cfgDirectorName}
                      onChange={e => setCfgDirectorName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Teléfono Institucional:</label>
                    <input
                      type="text"
                      value={cfgPhone}
                      onChange={e => setCfgPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Correo Electrónico Institucional:</label>
                    <input
                      type="email"
                      value={cfgEmail}
                      onChange={e => setCfgEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingCfg}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingCfg ? 'Guardando en Firestore...' : 'Guardar Parámetros Institucionales'}</span>
                  </button>
                </div>
              </form>

              {/* Security Diagnostics Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Estado de Seguridad y Reglas de Firebase</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400">Rol de Usuario Autenticado:</span>
                    <strong className="text-emerald-400 text-sm block font-mono">DIRECTOR (Verificado)</strong>
                    <span className="text-[10px] text-slate-500">Acceso total a endpoints administrativos</span>
                  </div>

                  <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400">Base de Datos Firestore:</span>
                    <strong className="text-white text-sm block font-mono">Conectada y Sincronizada</strong>
                    <span className="text-[10px] text-emerald-400">ai-studio-educolegioprivad</span>
                  </div>

                  <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400">Protección contra Escalación:</span>
                    <strong className="text-emerald-400 text-sm block font-mono">Reglas RBAC Activas</strong>
                    <span className="text-[10px] text-slate-500">Usuarios no pueden modificar su propio rol</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 12. TAB: KÁRDEX INSTITUCIONAL Y CONVIVENCIA ESCOLAR */}
          {activeTab === 'kardex' && (
            <DirectorKardexView currentUser={currentUser} />
          )}
        </main>
      </div>

      {/* =========================================================================
          MODAL 1: REGISTRAR NUEVO PROFESOR
         ========================================================================= */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Nuevo Profesor</h3>
                  <p className="text-xs text-slate-400">U.E. Luis Espinal Tarde (SIE: 80730142 · El Alto)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTeacherModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Nombre Completo del Docente (Obligatorio):</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="Ej. Prof. Juan Carlos Quispe Mamani"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Correo Electrónico Institucional:</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="juan.quispe@luisespinal.edu.bo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Número de Celular:</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="73291048"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Carnet de Identidad (CI):</label>
                  <input
                    type="text"
                    required
                    value={newCi}
                    onChange={e => setNewCi(e.target.value)}
                    placeholder="Ej. 6192841"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Expedido en:</label>
                  <select
                    value={newCiExp}
                    onChange={e => setNewCiExp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {BOLIVIA_DEPARTMENTS.map(d => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Especialidad Docente:</label>
                  <select
                    value={newSpecialty}
                    onChange={e => setNewSpecialty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {STANDARD_SPECIALTIES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Carga Horaria Mensual:</label>
                  <input
                    type="number"
                    value={newHourlyLoad}
                    onChange={e => setNewHourlyLoad(Number(e.target.value))}
                    min={20}
                    max={160}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Estado Inicial de la Cuenta:</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as TeacherStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="pendiente_activacion">Pendiente de activación (Recomendado por seguridad)</option>
                  <option value="activo">Activo (Docente con credencial existente)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Observaciones / Notas de Dirección:</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles de incorporación, comisiones pedagógicas o antecedentes institucionales..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Security info box */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-indigo-700/40 text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Seguridad de Credenciales Firebase Authentication</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  Por seguridad institucional, las contraseñas nunca se almacenan en Firestore ni se generan con claves fijas. Al registrar la ficha, el profesor se creará en estado <strong>Pendiente de activación</strong> y podrá activar su cuenta de forma segura mediante su correo o Google Institucional.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Guardar Profesor en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: EDITAR FICHA DEL PROFESOR
         ========================================================================= */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Datos del Docente</h3>
                  <p className="text-xs text-slate-400">{editingTeacher.fullName} · {editingTeacher.ci}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTeacher(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacher} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Correo Electrónico:</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Número de Celular:</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Carnet de Identidad (CI):</label>
                  <input
                    type="text"
                    required
                    value={editCi}
                    onChange={e => setEditCi(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Expedido en:</label>
                  <select
                    value={editCiExp}
                    onChange={e => setEditCiExp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {BOLIVIA_DEPARTMENTS.map(d => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Especialidad Pedagógica:</label>
                  <input
                    type="text"
                    required
                    value={editSpecialty}
                    onChange={e => setEditSpecialty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Carga Horaria Mensual:</label>
                  <input
                    type="number"
                    value={editHourlyLoad}
                    onChange={e => setEditHourlyLoad(Number(e.target.value))}
                    min={20}
                    max={160}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Estado de la Cuenta Institucional:</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as TeacherStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="activo">Activo</option>
                  <option value="pendiente_activacion">Pendiente de activación</option>
                  <option value="licencia">En Licencia / Permiso</option>
                  <option value="inactivo">Inactivo / En pausa</option>
                  <option value="retirado">Retirado / Desvinculado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Observaciones y Notas:</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Guardar Cambios en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ASIGNACIÓN ACADÉMICA DE CURSOS Y MATERIAS
         ========================================================================= */}
      {assigningTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600/30 border border-sky-500/50 flex items-center justify-center text-sky-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Asignación Académica de Cursos y Materias</h3>
                  <p className="text-xs text-slate-400">{assigningTeacher.fullName} · {assigningTeacher.specialty}</p>
                </div>
              </div>
              <button
                onClick={() => setAssigningTeacher(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignments} className="space-y-5 text-xs">
              {/* 1. Selección de Cursos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold block">
                    Cursos Asignados ({assignGrades.length} seleccionados):
                  </label>
                  <span className="text-[11px] text-slate-500">Haz clic en los cursos que dicta el docente</span>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Nivel Secundaria Comunitaria Productiva:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SECONDARY_GRADES.map(grade => {
                      const isSelected = assignGrades.includes(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => toggleGradeSelection(grade)}
                          className={`p-2 rounded-xl text-left font-medium transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs">{grade}</span>
                            {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-slate-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nivel Primaria Comunitaria Vocacional:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRIMARY_GRADES.map(grade => {
                      const isSelected = assignGrades.includes(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => toggleGradeSelection(grade)}
                          className={`p-2 rounded-xl text-left font-medium transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs">{grade}</span>
                            {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-white" /> : <Square className="w-3.5 h-3.5 text-slate-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Selección de Materias / Áreas Curriculares */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold block">
                    Materias o Áreas Curriculares ({assignSubjects.length} seleccionadas):
                  </label>
                  <span className="text-[11px] text-slate-500">Campos y áreas del currículo boliviano</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CURRICULAR_AREAS.map(subj => {
                    const isSelected = assignSubjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => toggleSubjectSelection(subj)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {subj}
                      </button>
                    );
                  })}
                </div>

                {/* Add custom subject if not listed */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={e => setCustomSubjectInput(e.target.value)}
                    placeholder="Agregar otra materia (ej. Robótica Avanzada)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* 3. Carga Horaria Total */}
              <div className="space-y-1 pt-3 border-t border-slate-800">
                <label className="text-slate-300 font-semibold">Carga Horaria Total Asignada (Horas Pedagógicas / Mes):</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={assignHourlyLoad}
                    onChange={e => setAssignHourlyLoad(Number(e.target.value))}
                    min={10}
                    max={160}
                    className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-400">
                    Estándar ministerial: 72 a 88 horas pedagógicas mensuales por ítem docente.
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningTeacher(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Guardar Asignación Académica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: FICHA INSTITUCIONAL COMPLETA DEL DOCENTE
         ========================================================================= */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-bold text-base shadow-inner">
                  {viewingTeacher.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{viewingTeacher.fullName}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Ficha Oficial del Personal Docente (Collpani)</span>
                </div>
              </div>
              <button
                onClick={() => setViewingTeacher(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Datos Generales */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[11px]">Carnet de Identidad:</span>
                  <strong className="text-white font-mono text-sm">{viewingTeacher.ci}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Estado en Nómina:</span>
                  <div className="mt-0.5">{renderStatusBadge(viewingTeacher.status)}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Correo Institucional:</span>
                  <span className="text-indigo-300 font-mono truncate block" title={viewingTeacher.email}>
                    {viewingTeacher.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Teléfono de Contacto:</span>
                  <span className="text-slate-200 font-mono">{viewingTeacher.phone}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Vínculo Firebase Authentication:</span>
                  {viewingTeacher.authUid ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Vinculado (UID: {viewingTeacher.authUid.slice(0, 8)}...)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Sin Cuenta Vinculada (Pendiente)
                    </span>
                  )}
                </div>
              </div>

              {/* Especialidad & Carga Horaria */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-500 block text-[11px]">Especialidad Pedagógica:</span>
                <strong className="text-indigo-300 block text-sm">{viewingTeacher.specialty}</strong>
                <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] pt-1 border-t border-slate-800/80">
                  <span>Carga Horaria Mensual:</span>
                  <strong className="text-white">{viewingTeacher.hourlyLoad} horas pedagógicas</strong>
                </div>
              </div>

              {/* Cursos Asignados */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 block text-[11px]">Cursos y Paralelos Asignados:</span>
                  <span className="text-[10px] text-slate-400 font-mono">{viewingTeacher.assignedGrades?.length || 0} cursos</span>
                </div>
                {viewingTeacher.assignedGrades && viewingTeacher.assignedGrades.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {viewingTeacher.assignedGrades.map(g => (
                      <span key={g} className="px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-[11px] font-medium">
                        {g}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px] italic">Sin cursos asignados actualmente.</p>
                )}
              </div>

              {/* Materias Asignadas */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 block text-[11px]">Materias Curriculares Asignadas:</span>
                  <span className="text-[10px] text-slate-400 font-mono">{viewingTeacher.assignedSubjects?.length || 0} materias</span>
                </div>
                {viewingTeacher.assignedSubjects && viewingTeacher.assignedSubjects.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {viewingTeacher.assignedSubjects.map(s => (
                      <span key={s} className="px-2.5 py-1 rounded-lg bg-sky-950/70 border border-sky-800/60 text-sky-300 text-[11px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px] italic">Sin materias curriculares asignadas.</p>
                )}
              </div>

              {/* Observaciones de Dirección */}
              {viewingTeacher.notes && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[11px]">Observaciones y Antecedentes Institucionales:</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{viewingTeacher.notes}</p>
                </div>
              )}
            </div>

            {/* Direct Actions in Dossier */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setViewingTeacher(null);
                    setAccessModalTeacher(viewingTeacher);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Gestionar Acceso</span>
                </button>
                <button
                  onClick={() => {
                    setViewingTeacher(null);
                    handleOpenAssign(viewingTeacher);
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Asignar Cursos</span>
                </button>
              </div>

              <button
                onClick={() => setViewingTeacher(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: GESTIÓN DE ACCESO Y ACTIVACIÓN INSTITUCIONAL
          (CUMPLE CHECKPOINT 3: NUNCA ALMACENA NI MUESTRA CONTRASEÑAS FIJAS O EN TEXTO PLANO)
         ========================================================================= */}
      {accessModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Activación y Acceso Institucional</h3>
                  <p className="text-xs text-slate-400">Protocolo seguro de Firebase Authentication</p>
                </div>
              </div>
              <button
                onClick={() => setAccessModalTeacher(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Docente Titular:</span>
                  <strong className="text-white text-xs">{accessModalTeacher.fullName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Correo Institucional:</span>
                  <span className="text-indigo-300 font-mono font-bold text-xs">{accessModalTeacher.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Rol Institucional:</span>
                  <span className="text-emerald-400 font-bold uppercase font-mono">Profesor</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estado en Nómina:</span>
                  <div>{renderStatusBadge(accessModalTeacher.status)}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">Vínculo con Firebase Auth:</span>
                  {accessModalTeacher.authUid ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Cuenta Vinculada (UID: {accessModalTeacher.authUid.slice(0, 8)}...)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Sin Cuenta Vinculada (Pendiente)
                    </span>
                  )}
                </div>
              </div>

              {/* Explanatory security callout based on actual link state */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400 font-bold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    {accessModalTeacher.authUid
                      ? 'Cuenta de Autenticación Activa'
                      : 'Protocolo de Alta y Vinculación Segura'}
                  </span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  {accessModalTeacher.authUid
                    ? `El profesor ya completó su registro y vinculó su UID auténtico de Firebase Authentication. Si el docente olvidó su clave, puedes enviarle un enlace oficial para definir una nueva contraseña.`
                    : `El expediente institucional está registrado en Firestore con rol Profesor. Para acceder por primera vez, el docente debe ingresar a SIGAE con su correo (${accessModalTeacher.email}) o iniciar sesión mediante Google. Una vez verificado el correo, SIGAE vinculará automáticamente su UID auténtico a esta ficha institucional.`}
                </p>
              </div>

              {activationNotice && (
                <div className="p-3 bg-indigo-950/60 border border-indigo-800/80 rounded-xl text-indigo-300 text-xs">
                  {activationNotice}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                {accessModalTeacher.authUid ? (
                  <button
                    onClick={() => handleSendActivation(accessModalTeacher)}
                    disabled={sendingActivation}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{sendingActivation ? 'Enviando enlace...' : 'Enviar Restablecimiento de Clave'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendActivation(accessModalTeacher)}
                    disabled={sendingActivation}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingActivation ? 'Registrando...' : 'Registrar Invitación de Acceso'}</span>
                  </button>
                )}

                <button
                  onClick={() => handleCopyAccessInstructions(accessModalTeacher)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copiado al portapapeles' : 'Copiar Instrucciones'}</span>
                </button>
              </div>

              <button
                onClick={() => setAccessModalTeacher(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 6: DAR DE BAJA O ELIMINAR DOCENTE (CONFIRMACIÓN OBLIGATORIA)
         ========================================================================= */}
      {deleteModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-900/60 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Baja o Retiro del Personal Docente</h3>
                  <p className="text-xs text-slate-400">{deleteModalTeacher.fullName} · CI: {deleteModalTeacher.ci}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalTeacher(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Selecciona la acción institucional que deseas ejecutar sobre el registro del profesor <strong>{deleteModalTeacher.fullName}</strong>:
              </p>

              {/* Option A: Inactivar / Retirar */}
              <div
                onClick={() => setDeleteOption('retire')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  deleteOption === 'retire'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-white text-xs">Opción 1: Dar de baja institucional (Recomendado)</strong>
                  <span className={`w-3.5 h-3.5 rounded-full border ${deleteOption === 'retire' ? 'bg-indigo-600 border-indigo-400' : 'border-slate-700'}`}></span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Conserva el historial de materias y asignaciones en Firestore, pero deshabilita la cuenta institucional (estado Retirado / Inactivo) y bloquea su inicio de sesión en SIGAE.
                </p>
                {deleteOption === 'retire' && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={retireReason}
                      onChange={e => setRetireReason(e.target.value)}
                      placeholder="Motivo institucional (ej: Fin de contrato, Traslado distrital)..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Option B: Eliminar definitivamente */}
              <div
                onClick={() => setDeleteOption('permanent')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  deleteOption === 'permanent'
                    ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-rose-300 text-xs">Opción 2: Eliminar registro definitivo de Firestore</strong>
                  <span className={`w-3.5 h-3.5 rounded-full border ${deleteOption === 'permanent' ? 'bg-rose-600 border-rose-400' : 'border-slate-700'}`}></span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Borra permanentemente el documento de las colecciones <code className="text-rose-300">teachers</code> y <code className="text-rose-300">users</code>. Solo debe realizarse si el profesor fue creado por error y no tiene registros académicos dependientes.
                </p>

                {deleteOption === 'permanent' && (
                  <div className="pt-2 flex items-start gap-2 text-rose-300">
                    <input
                      type="checkbox"
                      id="confirmPermanent"
                      checked={deleteConfirmCheckbox}
                      onChange={e => setDeleteConfirmCheckbox(e.target.checked)}
                      className="mt-0.5 rounded border-rose-700 text-rose-600 focus:ring-rose-500"
                    />
                    <label htmlFor="confirmPermanent" className="text-[11px] text-rose-300 font-semibold cursor-pointer select-none">
                      Confirmo la eliminación permanente de este registro institucional en Firestore.
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalTeacher(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessDeleteOrRetire}
                disabled={deleteOption === 'permanent' && !deleteConfirmCheckbox}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  deleteOption === 'permanent'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                }`}
              >
                {deleteOption === 'permanent' ? 'Eliminar Registro Definitivo' : 'Confirmar Baja Institucional'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REDACTAR COMUNICADO OFICIAL
         ========================================================================= */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Emitir Comunicado Oficial</h3>
                  <p className="text-xs text-slate-400">Despacho de Dirección — U.E. Luis Espinal Tarde</p>
                </div>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Título o Asunto del Comunicado:</label>
                <input
                  type="text"
                  required
                  value={msgSubject}
                  onChange={e => setMsgSubject(e.target.value)}
                  placeholder="Ej. Circular N° 05/2026: Convocatoria a Consejo Pedagógico"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Destinatario:</label>
                  <select
                    value={msgRecipient}
                    onChange={e => setMsgRecipient(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all_teachers">Todo el Plantel Docente</option>
                    <option value="all_community">Comunidad Educativa en General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Tipo de Mensaje:</label>
                  <select
                    value={msgType}
                    onChange={e => setMsgType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="comunicado_general">Comunicado General</option>
                    <option value="circular">Circular Oficial</option>
                    <option value="citacion">Convocatoria / Citación</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Nivel de Prioridad:</label>
                  <select
                    value={msgPriority}
                    onChange={e => setMsgPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Cuerpo del Comunicado:</label>
                <textarea
                  required
                  rows={5}
                  value={msgContent}
                  onChange={e => setMsgContent(e.target.value)}
                  placeholder="Redacta las disposiciones oficiales, horarios, fechas límite y recomendaciones institucionales..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingMsg}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingMsg ? 'Publicando...' : 'Emitir y Publicar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VISTA DE IMPRESIÓN DE REPORTES OFICIALES
         ========================================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-3xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Official Letterhead Header */}
            <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600 block">
                ESTADO PLURINACIONAL DE BOLIVIA · MINISTERIO DE EDUCACIÓN
              </span>
              <span className="text-xs uppercase font-bold text-slate-700 block">
                DIRECCIÓN DEPARTAMENTAL DE LA PAZ · DIRECCIÓN DISTRITAL EL ALTO 1
              </span>
              <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                UNIDAD EDUCATIVA "LUIS ESPINAL TARDE DE COLLPANI"
              </h2>
              <div className="flex items-center justify-center gap-3 text-xs font-mono font-semibold text-slate-700">
                <span>CÓDIGO SIE: 80730142</span>
                <span>·</span>
                <span>TURNO: TARDE</span>
                <span>·</span>
                <span>GESTIÓN ESCOLAR: 2026</span>
              </div>
            </div>

            {/* Document Title based on selected report */}
            <div className="space-y-4 text-xs">
              {showReportModal === 'nomina_docente' && (
                <>
                  <div className="text-center">
                    <h3 className="text-sm font-black uppercase text-indigo-950">
                      NÓMINA GENERAL Y FILIACIÓN DE PERSONAL DOCENTE
                    </h3>
                    <p className="text-[11px] text-slate-600">Al 1er Trimestre de la Gestión Escolar 2026</p>
                  </div>

                  <table className="w-full text-left border border-slate-300 text-xs">
                    <thead className="bg-slate-100 border-b border-slate-300 text-[11px]">
                      <tr>
                        <th className="p-2 border-r border-slate-300">N°</th>
                        <th className="p-2 border-r border-slate-300">Apellidos y Nombres</th>
                        <th className="p-2 border-r border-slate-300">Carnet CI</th>
                        <th className="p-2 border-r border-slate-300">Especialidad</th>
                        <th className="p-2 border-r border-slate-300">Horas</th>
                        <th className="p-2 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {teachers.map((t, idx) => (
                        <tr key={t.id}>
                          <td className="p-2 border-r border-slate-300 font-mono">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-300 font-bold">{t.fullName}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{t.ci}</td>
                          <td className="p-2 border-r border-slate-300">{t.specialty}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{t.hourlyLoad}</td>
                          <td className="p-2 text-right uppercase font-semibold text-emerald-800">{t.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {showReportModal === 'matricula_estudiantil' && (
                <>
                  <div className="text-center">
                    <h3 className="text-sm font-black uppercase text-indigo-950">
                      INFORME ESTADÍSTICO DE MATRÍCULA Y REGISTRO RUDE
                    </h3>
                    <p className="text-[11px] text-slate-600">Resumen Consolidado de Secundaria Comunitaria Productiva</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Total Matriculados:</span>
                      <strong className="text-base font-black text-slate-900 font-mono">340</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Total Cursos / Aulas:</span>
                      <strong className="text-base font-black text-slate-900 font-mono">12 Aulas</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Efectividad RUDE:</span>
                      <strong className="text-base font-black text-emerald-700 font-mono">98.5%</strong>
                    </div>
                  </div>

                  <table className="w-full text-left border border-slate-300 text-xs mt-3">
                    <thead className="bg-slate-100 border-b border-slate-300 text-[11px]">
                      <tr>
                        <th className="p-2 border-r border-slate-300">Curso y Nivel</th>
                        <th className="p-2 border-r border-slate-300">Paralelo</th>
                        <th className="p-2 border-r border-slate-300">Estudiantes</th>
                        <th className="p-2">Tutor Designado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {groups.map(g => (
                        <tr key={g.id}>
                          <td className="p-2 border-r border-slate-300 font-semibold">{g.name}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{g.parallel}</td>
                          <td className="p-2 border-r border-slate-300 font-mono">{g.studentCount}</td>
                          <td className="p-2 text-slate-700">{g.tutorTeacherName || 'Prof. Carlos Mamani Quispe'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {showReportModal === 'distribucion_curricular' && (
                <>
                  <div className="text-center">
                    <h3 className="text-sm font-black uppercase text-indigo-950">
                      CUADRO DE DISTRIBUCIÓN CURRICULAR Y AULAS
                    </h3>
                    <p className="text-[11px] text-slate-600">Turno Tarde · Gestión 2026</p>
                  </div>

                  <div className="space-y-3">
                    {groups.slice(0, 4).map(grp => (
                      <div key={grp.id} className="p-3 border border-slate-300 rounded-xl space-y-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{grp.name} Paralelo "{grp.parallel}" ({grp.classroom})</span>
                          <span>Tutor: {grp.tutorTeacherName}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Materias: {grp.subjects?.map(s => `${s.name} (${s.teacherName})`).join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {showReportModal === 'auditoria_seguridad' && (
                <>
                  <div className="text-center">
                    <h3 className="text-sm font-black uppercase text-indigo-950">
                      INFORME DE AUDITORÍA Y CONTROL DE ACCESO SIGAE
                    </h3>
                    <p className="text-[11px] text-slate-600">Verificación de Reglas Jerárquicas RBAC</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                    <p className="leading-relaxed">
                      Se certifica que el sistema SIGAE de la U.E. Luis Espinal Tarde de Collpani (SIE: 80730142) cuenta con las políticas de seguridad de base de datos activas en Firestore. El rol de <strong>DIRECTOR</strong> posee la máxima potestad sobre la creación de expedientes docentes y configuración del establecimiento.
                    </p>
                    <div className="text-[11px] font-mono text-slate-700 pt-2 border-t border-slate-200">
                      Auditoría: Firebase Security Rule 2.0 · Fecha de emisión: {new Date().toLocaleDateString('es-BO')}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Signature Section */}
            <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-1">
                <div className="w-40 h-0.5 bg-slate-400 mx-auto mt-6"></div>
                <strong className="block text-slate-900 font-bold">{currentUser.displayName}</strong>
                <span className="text-[11px] text-slate-600 block">Director Titular U.E. Luis Espinal Tarde</span>
                <span className="text-[10px] font-mono text-slate-500">SIE: 80730142</span>
              </div>
              <div className="space-y-1">
                <div className="w-40 h-0.5 bg-slate-400 mx-auto mt-6"></div>
                <strong className="block text-slate-900 font-bold">Comisión Pedagógica y Administrativa</strong>
                <span className="text-[11px] text-slate-600 block">Distrito Educativo El Alto 1</span>
                <span className="text-[10px] text-slate-500">Sello Oficial Institucional</span>
              </div>
            </div>

            {/* Actions for Modal */}
            <div className="pt-4 border-t border-slate-200 flex justify-between gap-3">
              <button
                onClick={() => setShowReportModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Documento Oficial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE OBSERVACIÓN DE ENTREGA DE CUADERNO PEDAGÓGICO */}
      {observingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-950 border border-rose-800/80 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Observar Entrega de Cuaderno Pedagógico</h3>
                  <p className="text-xs text-slate-400">
                    {observingSubmission.courseCode} · {observingSubmission.subject} ({observingSubmission.trimester})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setObservingSubmission(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Docente destinatario: <strong className="text-white">{observingSubmission.teacherName}</strong>
              </p>
              <p className="text-slate-400 leading-relaxed">
                Detalla las observaciones pedagógicas, correcciones en dimensiones evaluativas (Saber, Hacer, Ser y Decidir, Autoevaluación) o documentación faltante. La entrega pasará al estado <strong>"Observado"</strong> y el profesor será notificado de inmediato para subsanar los datos.
              </p>

              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Indicaciones y Requerimientos de Dirección:
                </label>
                <textarea
                  rows={4}
                  value={observationText}
                  onChange={e => setObservationText(e.target.value)}
                  placeholder="Ej: Se solicita revisar la ponderación de la actividad evaluativa N° 3 en la dimensión Saber y completar el registro de asistencia del mes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setObservingSubmission(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitObservation}
                disabled={savingReview || !observationText.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{savingReview ? 'Enviando observación...' : 'Confirmar Observación y Notificar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NUEVA COMUNICACIÓN CON CONFIRMACIÓN OBLIGATORIA */}
      {showNewCommModal && (
        <NewCommunicationModal
          currentUser={currentUser}
          isOpen={showNewCommModal}
          onClose={() => setShowNewCommModal(false)}
          defaultCourseCode={selectedCalendarCourse}
          onSuccess={(msg) => {
            showNotification(`Mensaje "${msg.subject}" procesado y despachado con éxito.`);
            setShowNewCommModal(false);
          }}
        />
      )}
    </div>
  );
};
