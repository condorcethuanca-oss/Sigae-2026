import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Award,
  Bell,
  MessageSquare,
  PlusCircle,
  User,
  LogOut,
  RefreshCw,
  Clock,
  ChevronRight,
  AlertCircle,
  School,
  Search,
  ShieldCheck,
  Send,
  X,
  ArrowLeft,
  FileText,
  Key,
  Check,
} from 'lucide-react';
import {
  SigaeUser,
  ScheduleBlock,
  StudentInstitutionalRecord,
  AttendanceSession,
  SchoolDayOfWeek,
} from '../../types';
import { scheduleService, SCHOOL_DAYS, OFFICIAL_PERIODS } from '../../firebase/scheduleService';
import { studentService, ParentStudentLink } from '../../firebase/studentService';
import { attendanceService } from '../../firebase/attendanceService';
import { cuadernoPedagogicoService, AcademicSubmission, TrimesterCalculatedResult } from '../../firebase/cuadernoPedagogicoService';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { UnifiedSchoolCalendar } from '../calendar/UnifiedSchoolCalendar';
import { NewCommunicationModal } from '../calendar/NewCommunicationModal';
import { FamilyKardexView } from '../kardex/FamilyKardexView';
import { NotificationBellDropdown } from '../notifications/NotificationBellDropdown';

export type FamilyPortalTab =
  | 'inicio'
  | 'calendario'
  | 'hijos'
  | 'horario'
  | 'asistencia'
  | 'calificaciones'
  | 'kardex'
  | 'comunicados'
  | 'mensajeria'
  | 'vincular_hijo'
  | 'notificaciones'
  | 'perfil';

interface FamilyPortalViewProps {
  currentUser: SigaeUser;
  onLogout: () => void;
}

export interface LinkedChildItem {
  id: string;
  name: string;
  rude: string;
  ci?: string;
  grade: string;
  parallel: string;
  courseCode: string;
  relationship: string;
  isApproved: boolean;
  status: string;
}

export const FamilyPortalView: React.FC<FamilyPortalViewProps> = ({
  currentUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<FamilyPortalTab>('inicio');
  const [loading, setLoading] = useState(true);

  // Lista de hijos vinculados
  const [childrenList, setChildrenList] = useState<LinkedChildItem[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [showParentCommModal, setShowParentCommModal] = useState(false);

  // Horario del hijo seleccionado
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [isSchedulePublished, setIsSchedulePublished] = useState(true);
  const [selectedDay, setSelectedDay] = useState<SchoolDayOfWeek>('Lunes');
  const [showFullWeek, setShowFullWeek] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<'todos' | 'mañana' | 'tarde'>('todos');

  // Asistencia del hijo seleccionado
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDayAttendance, setSelectedDayAttendance] = useState<any | null>(null);
  const [attHistoryDates, setAttHistoryDates] = useState<string[]>([]);
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [justifyReason, setJustifyReason] = useState('');
  const [justifyFeedback, setJustifyFeedback] = useState<string | null>(null);

  // Calificaciones
  const [selectedTrimestre, setSelectedTrimestre] = useState<'1T' | '2T' | '3T'>('1T');
  const [publishedSubmissions, setPublishedSubmissions] = useState<AcademicSubmission[]>([]);
  const [studentGradesList, setStudentGradesList] = useState<{ subject: string; teacherName: string; calculation: TrimesterCalculatedResult }[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Comunicados
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Mensajería
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [activeChatContact, setActiveChatContact] = useState<any | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Asistente de Vinculación Familiar (3 Pasos)
  const [linkStep, setLinkStep] = useState<1 | 2 | 3>(1);
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentRudeInput, setStudentRudeInput] = useState('');
  const [studentCiInput, setStudentCiInput] = useState('');
  const [studentGradeInput, setStudentGradeInput] = useState('6° de Secundaria');
  const [studentParallelInput, setStudentParallelInput] = useState('A');
  const [relationshipInput, setRelationshipInput] = useState('Padre');
  const [linkMethod, setLinkMethod] = useState<'aprobacion_directora' | 'codigo_seguro'>('aprobacion_directora');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');
  const [verifyingStudent, setVerifyingStudent] = useState(false);
  const [candidateMatchInfo, setCandidateMatchInfo] = useState<any | null>(null);
  const [linkingSuccessMsg, setLinkingSuccessMsg] = useState<string | null>(null);
  const [linkingErrorMsg, setLinkingErrorMsg] = useState<string | null>(null);

  // Perfil
  const [phoneInput, setPhoneInput] = useState(currentUser.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [pwdResetSent, setPwdResetSent] = useState(false);

  // 1. Cargar hijos vinculados y datos iniciales
  const loadFamilyData = async () => {
    setLoading(true);
    try {
      const children: LinkedChildItem[] = [];

      // A. Estudiante vinculado en el perfil de usuario
      if (currentUser.studentLinking && currentUser.studentLinking.studentName) {
        const gradeParts = (currentUser.studentLinking.grade || '6° de Secundaria A').split(' ');
        const parallel = gradeParts[gradeParts.length - 1] === 'A' || gradeParts[gradeParts.length - 1] === 'B'
          ? gradeParts[gradeParts.length - 1]
          : 'A';
        const gradeLevel = gradeParts.slice(0, -1).join(' ') || '6° de Secundaria';
        const num = parseInt(gradeLevel) || 6;
        const code = `${num}${parallel}`.toUpperCase();

        const isApproved = currentUser.studentLinking.status === 'aprobada' || currentUser.hasApprovedChildLink;

        children.push({
          id: 'child-primary',
          name: currentUser.studentLinking.studentName,
          rude: currentUser.studentLinking.studentRude,
          ci: currentUser.studentLinking.studentCi,
          grade: gradeLevel,
          parallel: parallel,
          courseCode: code,
          relationship: currentUser.studentLinking.relationship || 'Tutor Legal',
          isApproved: Boolean(isApproved),
          status: isApproved ? 'Vinculación Aprobada' : 'En Verificación Institucional',
        });
      }

      // B. Consultar vinculaciones activas en Firestore /parentStudentLinks
      try {
        const extraLinks = await studentService.getLinksForParent(currentUser.uid);
        extraLinks.forEach(l => {
          if (!children.some(c => c.rude === l.studentRude)) {
            const num = parseInt(l.grade) || 6;
            children.push({
              id: l.id,
              name: l.studentName,
              rude: l.studentRude,
              ci: l.studentCi,
              grade: l.grade,
              parallel: l.parallel,
              courseCode: `${num}${l.parallel}`.toUpperCase(),
              relationship: l.relationship,
              isApproved: true,
              status: 'Vinculación Aprobada',
            });
          }
        });
      } catch (err) {
        console.warn('[FamilyPortal] Aviso consultando /parentStudentLinks:', err);
      }

      setChildrenList(children);

      // C. Comunicados para la familia
      setAnnouncements([
        {
          id: 'ann-fam-1',
          title: 'Convocatoria a Primera Asamblea General de Padres de Familia',
          content: 'La Dirección de la U.E. Luis Espinal Tarde de Collpani convoca a los tutores a la reunión informativa sobre el plan de estudios 2026.',
          authorName: 'Lic. Gonzalo Fernández Mamani (Dirección)',
          date: '2026-03-05',
        },
        {
          id: 'ann-fam-2',
          title: 'Horario Escolar y Turnos Confirmados (Gestión 2026)',
          content: 'Se recuerda a las familias que los estudiantes de 6.º de Secundaria asisten en turno mañana y turno tarde según cronograma curricular.',
          authorName: 'Dirección General (SIE 80730142)',
          date: '2026-03-12',
        },
      ]);

      // D. Docentes relacionados para mensajería
      setTeachersList([
        { id: 'dir-01', name: 'Dirección Institucional', role: 'Dirección General' },
        { id: 'tch-01', name: 'Prof. Carlos Mamani Quispe', role: 'Matemática' },
        { id: 'tch-02', name: 'Profa. Elena Choquehuanca', role: 'Lenguaje y Comunicación' },
        { id: 'tch-04', name: 'Profa. Patricia Ruiz Ticona', role: 'Ciencias Sociales' },
        { id: 'tch-05', name: 'Prof. Wilson Huanca Yujra', role: 'Informática y Robótica' },
      ]);
    } catch (err) {
      console.error('[FamilyPortal] Error cargando datos familiares:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyData();
  }, [currentUser.uid]);

  // Estudiante activo seleccionado
  const activeChild: LinkedChildItem | undefined = childrenList[selectedChildIndex];

  // 2. Cargar horario y asistencia del estudiante activo
  useEffect(() => {
    if (activeChild) {
      // Cargar horario oficial del curso (solo si está aprobado y publicado por Dirección)
      scheduleService.getOfficialPublishedScheduleForCourse(activeChild.courseCode).then(blocks => {
        if (blocks && blocks.length > 0) {
          setScheduleBlocks(blocks);
          setIsSchedulePublished(true);
        } else {
          setScheduleBlocks([]);
          setIsSchedulePublished(false);
        }
      });

      // Cargar asistencia de la fecha seleccionada
      attendanceService.getSession(activeChild.courseCode, attDate).then(session => {
        if (session && session.records) {
          const rec = session.records.find(r => r.rude === activeChild.rude || r.studentName.toLowerCase().includes(activeChild.name.toLowerCase()));
          setSelectedDayAttendance(rec || null);
        } else {
          setSelectedDayAttendance(null);
        }
      });

      attendanceService.getRecordedDatesForCourse(activeChild.courseCode).then(setAttHistoryDates);
    } else {
      setScheduleBlocks([]);
      setSelectedDayAttendance(null);
    }
  }, [activeChild, attDate]);

  // Cargar calificaciones publicadas oficialmente por Dirección
  useEffect(() => {
    if (activeTab === 'calificaciones' && activeChild) {
      setLoadingGrades(true);
      const fetchGrades = async () => {
        try {
          const allSubs = await cuadernoPedagogicoService.getAllSubmissions();
          const filtered = allSubs.filter(
            s =>
              s.courseCode === activeChild.courseCode &&
              s.trimester === selectedTrimestre &&
              s.isPublishedToParents === true
          );
          setPublishedSubmissions(filtered);

          if (filtered.length > 0) {
            const list: { subject: string; teacherName: string; calculation: TrimesterCalculatedResult }[] = [];
            const childStudentRecord: StudentInstitutionalRecord = {
              id: activeChild.id,
              fullName: activeChild.name,
              ci: activeChild.ci || '',
              rude: activeChild.rude,
              gradeLevel: activeChild.grade,
              gradeNumber: parseInt(activeChild.courseCode) || 6,
              parallel: activeChild.parallel,
              courseCode: activeChild.courseCode,
              academicYear: '2026',
              enrollmentStatus: 'efectivo',
              internalCode: `INT-${activeChild.rude}`,
              createdAt: '',
            };

            for (const sub of filtered) {
              const activities = await cuadernoPedagogicoService.getActivities(sub.courseCode, sub.subject, sub.trimester as any);
              const scoresByActivity: Record<string, Record<string, number>> = {};
              for (const act of activities) {
                scoresByActivity[act.id] = await cuadernoPedagogicoService.getScoresByActivity(act.id);
              }
              const calculated = cuadernoPedagogicoService.calculateTrimesterConsolidated(
                [childStudentRecord],
                activities,
                scoresByActivity
              );
              if (calculated.length > 0) {
                list.push({
                  subject: sub.subject,
                  teacherName: sub.teacherName,
                  calculation: calculated[0],
                });
              }
            }
            setStudentGradesList(list);
          } else {
            setStudentGradesList([]);
          }
        } catch (err) {
          console.warn('[FamilyPortalView] Error consultando calificaciones publicadas:', err);
          setPublishedSubmissions([]);
          setStudentGradesList([]);
        } finally {
          setLoadingGrades(false);
        }
      };
      fetchGrades();
    }
  }, [activeTab, activeChild?.courseCode, activeChild?.id, selectedTrimestre]);

  // Enviar Justificativo de Falta
  const handleSendJustification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justifyReason.trim() || !activeChild) return;

    setJustifyFeedback('¡Solicitud de justificación de falta enviada formalmente a Dirección para su visado!');
    setTimeout(() => {
      setShowJustifyModal(false);
      setJustifyReason('');
      setJustifyFeedback(null);
    }, 2500);
  };

  // Enviar mensaje en mensajería
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatContact) return;

    const newM = {
      id: `fam-msg-${Date.now()}`,
      senderName: currentUser.displayName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setChatMessages(prev => [...prev, newM]);
    setChatInput('');
  };

  // Actualizar perfil del adulto
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileFeedback(null);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        phone: phoneInput.trim(),
        updatedAt: new Date().toISOString(),
      });
      setProfileFeedback('¡Teléfono personal actualizado correctamente!');
      setTimeout(() => setProfileFeedback(null), 3000);
    } catch (err: any) {
      setProfileFeedback(`Error al actualizar perfil: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // Restablecer contraseña con Firebase Auth
  const handlePasswordReset = async () => {
    if (!currentUser.email) return;
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setPwdResetSent(true);
      setTimeout(() => setPwdResetSent(false), 5000);
    } catch (err: any) {
      alert(`Error al enviar correo de recuperación: ${err.message}`);
    }
  };

  // Verificación en vivo de estudiante en el asistente de vinculación
  const handleCheckStudentCandidate = async () => {
    if (!studentRudeInput.trim()) return;
    setVerifyingStudent(true);
    try {
      const res = await studentService.verifyStudentCandidate({
        studentName: studentNameInput.trim(),
        studentRude: studentRudeInput.trim(),
        studentCi: studentCiInput.trim(),
      });
      setCandidateMatchInfo(res);
      if (res.matched) {
        setLinkStep(3);
      }
    } catch {
      setCandidateMatchInfo(null);
    } finally {
      setVerifyingStudent(false);
    }
  };

  // Enviar Vinculación Familiar (Paso 3)
  const handleSubmitLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkingSuccessMsg(null);
    setLinkingErrorMsg(null);

    try {
      if (linkMethod === 'codigo_seguro') {
        const res = await studentService.redeemInvitationCode({
          code: invitationCodeInput.trim(),
          parentUid: currentUser.uid,
          parentName: currentUser.displayName,
          studentRude: studentRudeInput.trim(),
        });
        if (!res.success) {
          setLinkingErrorMsg(res.message);
          return;
        }
        setLinkingSuccessMsg('¡Código validado exitosamente! El estudiante ha sido vinculado.');
      } else {
        await studentService.submitLinkRequest({
          id: `req-link-${currentUser.uid}-${Date.now().toString().slice(-4)}`,
          parentUid: currentUser.uid,
          parentName: currentUser.displayName,
          parentEmail: currentUser.email,
          parentCi: currentUser.ci || '',
          parentPhone: currentUser.phone || '',
          studentName: studentNameInput.trim(),
          studentRude: studentRudeInput.trim(),
          studentCi: studentCiInput.trim(),
          grade: studentGradeInput,
          parallel: studentParallelInput,
          relationship: relationshipInput,
          method: 'aprobacion_directora',
          status: 'pendiente',
          createdAt: new Date().toISOString(),
        });
        setLinkingSuccessMsg('¡Solicitud enviada a la Dirección! Será revisada y aprobada formalmente.');
      }

      await loadFamilyData();
      setTimeout(() => {
        setLinkStep(1);
        setActiveTab('hijos');
        setLinkingSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setLinkingErrorMsg(`Error al procesar la vinculación: ${err.message}`);
    }
  };

  const navMenuItems: { id: FamilyPortalTab; label: string; icon: any }[] = [
    { id: 'inicio', label: 'Inicio / Resumen', icon: HeartHandshake },
    { id: 'calendario', label: 'Calendario de mis hijos', icon: Calendar },
    { id: 'hijos', label: 'Mis hijos', icon: GraduationCap },
    { id: 'horario', label: 'Horario escolar', icon: Clock },
    { id: 'asistencia', label: 'Asistencia', icon: CheckCircle2 },
    { id: 'calificaciones', label: 'Calificaciones / Boleta', icon: Award },
    { id: 'kardex', label: 'Kárdex y conducta', icon: AlertCircle },
    { id: 'comunicados', label: 'Comunicados', icon: Bell },
    { id: 'mensajeria', label: 'Mensajería interna', icon: MessageSquare },
    { id: 'vincular_hijo', label: 'Vincular otro hijo', icon: PlusCircle },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'perfil', label: 'Mi perfil', icon: User },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-white">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-300">
          Cargando Portal de la Familia desde Cloud Firestore...
        </span>
      </div>
    );
  }

  // Clases del día para el curso del hijo
  const daySchedule = scheduleBlocks.filter(b => b.dayOfWeek === selectedDay);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-emerald-600 selection:text-white">
      {/* =========================================================================
          1. MENÚ LATERAL DEL PADRE / FAMILIA (11 FUNCIONES ESTRICTAS)
         ========================================================================= */}
      <aside className="w-full lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 lg:sticky lg:top-0 lg:h-screen z-30">
        {/* Identidad Institucional */}
        <div className="p-4.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/30 shrink-0">
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
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-300">
            FAMILIA
          </span>
        </div>

        {/* Ficha del Tutor */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold shrink-0 text-xs">
              {currentUser.displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {currentUser.displayName}
              </div>
              <div className="text-[10px] text-emerald-400">
                Padre / Tutor Acreditado
              </div>
            </div>
          </div>
        </div>

        {/* 11 Ítems de navegación */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Botón 11: Cerrar sesión */}
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
          2. ÁREA PRINCIPAL DEL PORTAL FAMILIAR
         ========================================================================= */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">
        {/* Encabezado Oficial del Panel Familiar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Portal de la Familia — SIGAE
              </h1>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                ACCESO EXCLUSIVO FAMILIAR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Seguimiento académico oficial de sus hijos · U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector Dinámico de Estudiante si tiene hijos */}
            {childrenList.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-medium">Estudiante:</span>
                <select
                  value={selectedChildIndex}
                  onChange={e => setSelectedChildIndex(parseInt(e.target.value) || 0)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  {childrenList.map((ch, idx) => (
                    <option key={ch.id} value={idx}>
                      {ch.name} ({ch.grade} {ch.parallel})
                    </option>
                  ))}
                </select>
              </div>
            )}

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

        {/* =====================================================================
            VISTA 1: INICIO / RESUMEN
           ===================================================================== */}
        {activeTab === 'inicio' && (
          <div className="space-y-6 animate-in fade-in">
            {childrenList.length === 0 ? (
              /* Estado Oficial sin Hijos Vinculados */
              <div className="p-8 bg-slate-900 border border-emerald-500/30 rounded-3xl text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="max-w-md mx-auto space-y-2">
                  <h2 className="text-base font-bold text-white">
                    Todavía no tienes estudiantes vinculados a tu cuenta
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Puedes solicitar la vinculación de tu hijo o consultar el estado de una solicitud pendiente en la Dirección de la institución.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('vincular_hijo')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Vincular a mi hijo
                  </button>
                  <button
                    onClick={() => setActiveTab('notificaciones')}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Ver solicitudes
                  </button>
                </div>
              </div>
            ) : (
              /* Resumen del Hijo Seleccionado */
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Resumen del estudiante activo
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Gestión Escolar 2026
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-400" />
                    <span>{activeChild?.name}</span>
                  </h2>
                  <p className="text-xs text-slate-300">
                    Curso: <strong className="text-white">{activeChild?.grade} · Paralelo {activeChild?.parallel}</strong> (Código {activeChild?.courseCode}) · {activeChild?.relationship}
                  </p>

                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setActiveTab('horario')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ver Horario Oficial</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('asistencia')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ver Asistencia</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('calificaciones')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-sky-400" />
                      <span>Boleta de Calificaciones</span>
                    </button>
                  </div>
                </div>

                {/* Métricas Reales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Estado de Filiación</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-sm font-bold text-emerald-400">
                      {activeChild?.status}
                    </div>
                    <div className="text-[11px] text-slate-400">Acreditado por Dirección</div>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Clases Programadas Hoy</span>
                      <Clock className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-white">
                      {daySchedule.length} <span className="text-xs font-normal text-slate-500">períodos</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Turno oficial verificado</div>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Asistencia Registrada</span>
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-sm font-bold font-mono text-white capitalize">
                      {selectedDayAttendance?.status || 'Sin reporte en la fecha'}
                    </div>
                    <div className="text-[11px] text-slate-400">Control docente diario</div>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Trimestre Curricular</span>
                      <Award className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-sm font-bold text-indigo-300">
                      1.er TRIMESTRE EN CURSO
                    </div>
                    <div className="text-[11px] text-slate-400">Gestión escolar 2026</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA: CALENDARIO ESCOLAR DE MIS HIJOS
           ===================================================================== */}
        {activeTab === 'calendario' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Selector de Hijo si tiene varios hijos registrados */}
            {childrenList.length > 1 && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-300">
                  Selecciona el estudiante para consultar su calendario:
                </span>
                <div className="flex items-center gap-2">
                  {childrenList.map((ch, idx) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChildIndex(idx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedChildIndex === idx
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ch.name.split(' ')[0]} ({ch.grade.split(' ')[0]} {ch.parallel})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <UnifiedSchoolCalendar
              currentUser={currentUser}
              courseCode={childrenList[selectedChildIndex]?.courseCode || '6A'}
              studentName={childrenList[selectedChildIndex]?.name || 'Estudiante Tutelado'}
              onOpenNewEventModal={() => setShowParentCommModal(true)}
            />
          </div>
        )}

        {/* =====================================================================
            VISTA 2: MIS HIJOS
           ===================================================================== */}
        {activeTab === 'hijos' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Mis Hijos Registrados</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Estudiantes con vínculo familiar verificado en la U.E. Luis Espinal Tarde
                </p>
              </div>

              <button
                onClick={() => setActiveTab('vincular_hijo')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Vincular otro hijo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {childrenList.map((ch, idx) => (
                <div
                  key={ch.id}
                  className={`p-5 bg-slate-900 border rounded-2xl transition-all space-y-3 ${
                    selectedChildIndex === idx
                      ? 'border-emerald-600/80 shadow-md shadow-emerald-950/50'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/60">
                        {ch.grade} · Paralelo {ch.parallel}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5">
                        {ch.name}
                      </h3>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Parentesco: {ch.relationship} · Matrícula 2026
                      </div>
                    </div>

                    {selectedChildIndex === idx ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedChildIndex(idx)}
                        className="text-xs text-slate-400 hover:text-white font-semibold underline cursor-pointer"
                      >
                        Seleccionar
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedChildIndex(idx);
                        setActiveTab('horario');
                      }}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-600 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      Ver horario
                    </button>
                    <button
                      onClick={() => {
                        setSelectedChildIndex(idx);
                        setActiveTab('asistencia');
                      }}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-600 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      Ver asistencia
                    </button>
                    <button
                      onClick={() => {
                        setSelectedChildIndex(idx);
                        setActiveTab('calificaciones');
                      }}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-600 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      Ver calificaciones
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            VISTA 3: HORARIO ESCOLAR (ESPECÍFICO DE 6.º A Y CURSOS REALES)
           ===================================================================== */}
        {activeTab === 'horario' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>Horario Escolar Oficial — {activeChild?.name || 'Estudiante'}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {activeChild?.grade} {activeChild?.parallel} · Turnos Mañana (08:00 - 12:15) y Tarde (14:00 - 18:15)
                </p>
              </div>

              {/* Botones de control de horario */}
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
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!isSchedulePublished ? (
              <div className="p-8 sm:p-10 bg-slate-900 border border-amber-900/40 rounded-3xl text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">Horario pendiente de confirmación</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  La Dirección Institucional de la U.E. Luis Espinal Tarde se encuentra revisando y oficializando la malla horaria para este curso. Una vez aprobada y publicada formalmente, estará disponible para su consulta en esta sección.
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                    Curso: {activeChild?.grade} {activeChild?.parallel} · SIE 80730142
                  </span>
                </div>
              </div>
            ) : showFullWeek ? (
              /* Cuadrícula Semanal Completa */
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {SCHOOL_DAYS.slice(0, 5).map(d => {
                  const bks = scheduleBlocks.filter(b => b.dayOfWeek === d);
                  return (
                    <div key={d} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                      <div className="text-xs font-bold text-emerald-400 pb-1.5 border-b border-slate-800">
                        {d}
                      </div>
                      {bks.length === 0 ? (
                        <div className="text-[11px] text-slate-600 py-3 text-center">Sin clases</div>
                      ) : (
                        bks.map(b => (
                          <div key={b.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] space-y-1">
                            <div className="font-bold text-white">{b.subject}</div>
                            <div className="text-slate-400 font-mono text-[10px]">{b.startTime} - {b.endTime}</div>
                            {b.teacherName && (
                              <div className="text-emerald-300 text-[10px] truncate">{b.teacherName}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Vista por Día */
              <div className="space-y-3">
                {daySchedule.length === 0 ? (
                  <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2">
                    <Clock className="w-6 h-6 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">
                      No hay clases programadas para el día <strong className="text-white">{selectedDay}</strong>.
                    </p>
                  </div>
                ) : (
                  daySchedule.map((b, idx) => (
                    <div
                      key={b.id}
                      className="p-4 bg-slate-900 border border-slate-800 hover:border-emerald-600/60 rounded-2xl transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {b.startTime} - {b.endTime} · Período {b.periodNumber}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-0.5">{b.subject}</h4>
                          <span className="text-xs text-slate-400">
                            Docente: {b.teacherName || 'Docente Oficial'} ({b.classroom || 'Aula'})
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {b.startTime < '13:00' ? 'Turno Mañana' : 'Turno Tarde'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 4: ASISTENCIA ESCOLAR
           ===================================================================== */}
        {activeTab === 'asistencia' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Control de Asistencia — {activeChild?.name}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Registros oficiales archivados por los docentes en Cloud Firestore
                </p>
              </div>

              <button
                onClick={() => setShowJustifyModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Solicitar justificación de falta
              </button>
            </div>

            {/* Selector de Fecha */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 text-xs">
              <span className="text-slate-400">Fecha de consulta:</span>
              <input
                type="date"
                value={attDate}
                onChange={e => setAttDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Estado de Asistencia en la Fecha */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <h3 className="text-sm font-bold text-white">
                Reporte del Día ({attDate})
              </h3>
              {selectedDayAttendance ? (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Estado registrado:</span>
                    <span className={`text-base font-bold capitalize ${
                      selectedDayAttendance.status === 'presente'
                        ? 'text-emerald-400'
                        : selectedDayAttendance.status === 'ausente'
                        ? 'text-rose-400'
                        : selectedDayAttendance.status === 'retraso'
                        ? 'text-amber-400'
                        : selectedDayAttendance.status === 'licencia'
                        ? 'text-sky-400'
                        : 'text-slate-400'
                    }`}>
                      {selectedDayAttendance.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Registrado por docente de aula
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No existen registros de asistencia para este período.
                </p>
              )}
            </div>

            {/* Modal Justificar Falta */}
            {showJustifyModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <form
                  onSubmit={handleSendJustification}
                  className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white">Solicitar Justificación de Falta</h3>
                    <button
                      type="button"
                      onClick={() => setShowJustifyModal(false)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">Estudiante:</span>
                      <input
                        type="text"
                        disabled
                        value={activeChild?.name}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Fecha de la inasistencia:</span>
                      <input
                        type="date"
                        value={attDate}
                        onChange={e => setAttDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Motivo o Justificación Médica:</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Describa el motivo de salud o fuerza mayor..."
                        value={justifyReason}
                        onChange={e => setJustifyReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {justifyFeedback && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold">
                      {justifyFeedback}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowJustifyModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      Enviar a Dirección
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 5: CALIFICACIONES / BOLETA DE NOTAS
           ===================================================================== */}
        {activeTab === 'calificaciones' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>Boleta Oficial de Calificaciones — {activeChild?.name}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {activeChild?.grade} {activeChild?.parallel} · Sistema de Evaluación Ley 070 sobre 100 puntos
                </p>
              </div>

              {/* Selector de Trimestre */}
              <div className="flex items-center gap-1.5">
                {(['1T', '2T', '3T'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTrimestre(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedTrimestre === t
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === '1T' ? '1.er Trimestre' : t === '2T' ? '2.° Trimestre' : '3.er Trimestre'}
                  </button>
                ))}
              </div>
            </div>

            {loadingGrades ? (
              <div className="p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
                <Clock className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Consultando registros y boletines publicados...</p>
              </div>
            ) : publishedSubmissions.length === 0 || studentGradesList.length === 0 ? (
              /* ESTADO REGLAMENTARIO INSTITUCIONAL: NO PUBLICADO AÚN */
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400 mx-auto">
                  <Award className="w-6 h-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-bold text-white">
                    {selectedTrimestre === '1T' ? '1.er' : selectedTrimestre === '2T' ? '2.°' : '3.er'} Trimestre · Gestión 2026
                  </h3>
                  <p className="text-xs text-amber-300 font-medium leading-relaxed">
                    Las calificaciones del trimestre se encuentran en revisión institucional y aún no han sido autorizadas para publicación.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    La Dirección de la U.E. Luis Espinal Tarde debe revisar y aprobar formalmente las actas y cuadernos pedagógicos remitidos por los docentes antes de liberar la boleta de notas a las familias.
                  </p>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                    Dimensiones oficiales Ley 070: Saber (35 pts), Hacer (35 pts), Ser y Decidir (20 pts), Autoevaluación (10 pts)
                  </span>
                </div>
              </div>
            ) : (
              /* TABLA DE CALIFICACIONES PUBLICADAS */
              <div className="space-y-4">
                <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-2xl p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Calificaciones aprobadas y autorizadas oficialmente por Dirección Institucional</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Gestión Escolar 2026
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold bg-slate-950/50">
                          <th className="py-3 px-4 font-semibold">Área / Materia</th>
                          <th className="py-3 px-3 font-semibold">Docente Titular</th>
                          <th className="py-3 px-3 font-semibold text-center">Saber (35)</th>
                          <th className="py-3 px-3 font-semibold text-center">Hacer (35)</th>
                          <th className="py-3 px-3 font-semibold text-center">Ser/Decidir (20)</th>
                          <th className="py-3 px-3 font-semibold text-center">Autoeval (10)</th>
                          <th className="py-3 px-4 font-semibold text-center">Nota Final (100)</th>
                          <th className="py-3 px-4 font-semibold text-right">Apreciación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {studentGradesList.map((item, idx) => {
                          const calc = item.calculation;
                          const finalScore = calc.trimesterFinalScore;
                          const isPassing = (finalScore || 0) >= 51;

                          return (
                            <tr key={idx} className="hover:bg-slate-950/40 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-white">
                                {item.subject}
                              </td>
                              <td className="py-3.5 px-3 text-slate-300 text-[11px]">
                                {item.teacherName}
                              </td>
                              <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                                {calc.saberAverage !== null ? calc.saberAverage : '—'}
                              </td>
                              <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                                {calc.hacerAverage !== null ? calc.hacerAverage : '—'}
                              </td>
                              <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                                {calc.serDecidirAverage !== null ? calc.serDecidirAverage : '—'}
                              </td>
                              <td className="py-3.5 px-3 text-center font-mono text-slate-300">
                                {calc.autoevaluacionScore !== null ? calc.autoevaluacionScore : '—'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`text-sm font-black font-mono px-2 py-0.5 rounded-lg ${
                                  finalScore === null
                                    ? 'text-slate-500'
                                    : isPassing
                                    ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-800'
                                    : 'text-rose-300 bg-rose-950/80 border border-rose-800'
                                }`}>
                                  {finalScore !== null ? finalScore : '—'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  finalScore === null
                                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                                    : isPassing
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border-rose-800'
                                }`}>
                                  {finalScore === null ? 'Pendiente' : isPassing ? 'APROBADO' : 'EN DESARROLLO'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA KÁRDEX: OBSERVACIONES Y SEGUIMIENTO FAMILIAR
           ===================================================================== */}
        {activeTab === 'kardex' && (
          <FamilyKardexView currentUser={currentUser} />
        )}

        {/* =====================================================================
            VISTA 6: COMUNICADOS
           ===================================================================== */}
        {activeTab === 'comunicados' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span>Comunicados y Avisos Institucionales</span>
              </h2>
              <p className="text-xs text-slate-400">
                Circulares y avisos dirigidos a las familias de la U.E. Luis Espinal Tarde
              </p>
            </div>

            <div className="space-y-3">
              {announcements.map(ann => (
                <div key={ann.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/60">
                      {ann.authorName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{ann.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{ann.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            VISTA 7: MENSAJERÍA INTERNA (CONTACTAR A DOCENTES AUTORIZADOS)
           ===================================================================== */}
        {activeTab === 'mensajeria' && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 animate-in fade-in">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Mensajería Institucional con Docentes y Dirección</span>
              </h2>
              <p className="text-xs text-slate-400">
                Canal oficial y exclusivo con el plantel asignado a {activeChild?.name}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
              {/* Contactos */}
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block px-1">
                  Docentes de su hijo:
                </span>
                <div className="space-y-1">
                  {teachersList.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setActiveChatContact(t)}
                      className={`p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                        activeChatContact?.id === t.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.role}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div className="md:col-span-2 p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
                {activeChatContact ? (
                  <>
                    <div className="pb-2 border-b border-slate-800 flex justify-between items-center text-xs">
                      <span className="font-bold text-white">Conversación con: {activeChatContact.name}</span>
                      <span className="text-[10px] text-emerald-400">Canal Acreditado</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                      {chatMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl max-w-[80%] text-xs ${
                            msg.isMe
                              ? 'bg-emerald-600/30 border border-emerald-600/40 text-emerald-200 ml-auto'
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
                        placeholder={`Enviar consulta a ${activeChatContact.name}...`}
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-xs text-slate-500 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-600" />
                    <span>Seleccione un docente para enviar una consulta.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VISTA 8: VINCULAR OTRO HIJO (ASISTENTE 3 PASOS)
           ===================================================================== */}
        {activeTab === 'vincular_hijo' && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 animate-in fade-in">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Asistente de Vinculación Familiar</span>
              </h2>
              <p className="text-xs text-slate-400">
                Vincule a otro de sus hijos a su misma cuenta de padre sin necesidad de crear otro usuario
              </p>
            </div>

            {/* Indicador de 3 Pasos */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 py-2">
              <div className={`flex items-center gap-2 text-xs font-bold ${linkStep >= 1 ? 'text-emerald-400' : 'text-slate-600'}`}>
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">1</span>
                <span>Datos del Adulto</span>
              </div>
              <span className="text-slate-700">──</span>
              <div className={`flex items-center gap-2 text-xs font-bold ${linkStep >= 2 ? 'text-emerald-400' : 'text-slate-600'}`}>
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">2</span>
                <span>Datos del Hijo/a</span>
              </div>
              <span className="text-slate-700">──</span>
              <div className={`flex items-center gap-2 text-xs font-bold ${linkStep >= 3 ? 'text-emerald-400' : 'text-slate-600'}`}>
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">3</span>
                <span>Autorización</span>
              </div>
            </div>

            {linkingSuccessMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold">
                {linkingSuccessMsg}
              </div>
            )}

            {linkingErrorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
                {linkingErrorMsg}
              </div>
            )}

            {/* PASO 1: DATOS DEL ADULTO YA RECUPERADOS */}
            {linkStep === 1 && (
              <div className="space-y-4 max-w-lg mx-auto text-xs">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-sm">Sus datos como tutor acreditado:</h4>
                  <div className="text-slate-400">Nombre: <strong className="text-white">{currentUser.displayName}</strong></div>
                  <div className="text-slate-400">Correo: <strong className="text-white">{currentUser.email}</strong></div>
                  <div className="text-slate-400">Cédula: <strong className="text-white">{currentUser.ci || 'Registrada'}</strong></div>
                  <div className="text-slate-400">Teléfono: <strong className="text-white">{currentUser.phone || 'Registrado'}</strong></div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setLinkStep(2)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Continuar al Paso 2 →
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: DATOS DEL HIJO */}
            {linkStep === 2 && (
              <div className="space-y-4 max-w-lg mx-auto text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Nombre completo del estudiante:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez Mamani"
                    value={studentNameInput}
                    onChange={e => setStudentNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Código RUDE Oficial (Obligatorio):</label>
                  <input
                    type="text"
                    required
                    placeholder="Código RUDE institucional de 14 a 18 dígitos"
                    value={studentRudeInput}
                    onChange={e => setStudentRudeInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Cédula de Identidad (Opcional):</label>
                    <input
                      type="text"
                      placeholder="CI del alumno"
                      value={studentCiInput}
                      onChange={e => setStudentCiInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Parentesco:</label>
                    <select
                      value={relationshipInput}
                      onChange={e => setRelationshipInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Padre">Padre</option>
                      <option value="Madre">Madre</option>
                      <option value="Tutor Legal">Tutor Legal</option>
                      <option value="Abuelo/a">Abuelo/a</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setLinkStep(1)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleCheckStudentCandidate}
                    disabled={verifyingStudent || !studentRudeInput.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {verifyingStudent ? 'Verificando con padrón...' : 'Verificar y Continuar →'}
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: AUTORIZACIÓN */}
            {linkStep === 3 && (
              <form onSubmit={handleSubmitLinkRequest} className="space-y-4 max-w-lg mx-auto text-xs">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-sm">Resumen de vinculación:</h4>
                  <div className="text-slate-300">Estudiante: <strong className="text-white">{studentNameInput}</strong></div>
                  <div className="text-slate-300 font-mono">RUDE: {studentRudeInput}</div>
                  <div className="text-slate-300">Parentesco: {relationshipInput}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-300 font-semibold block">Seleccione el método de validación:</label>
                  <div className="space-y-2">
                    <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${linkMethod === 'aprobacion_directora' ? 'bg-emerald-950/40 border-emerald-600' : 'bg-slate-950 border-slate-800'}`}>
                      <input
                        type="radio"
                        name="method"
                        checked={linkMethod === 'aprobacion_directora'}
                        onChange={() => setLinkMethod('aprobacion_directora')}
                      />
                      <div>
                        <div className="font-bold text-white">Aprobación de la Dirección</div>
                        <div className="text-[11px] text-slate-400">Se enviará la solicitud al panel de la Dirección para su revisión formal.</div>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${linkMethod === 'codigo_seguro' ? 'bg-emerald-950/40 border-emerald-600' : 'bg-slate-950 border-slate-800'}`}>
                      <input
                        type="radio"
                        name="method"
                        checked={linkMethod === 'codigo_seguro'}
                        onChange={() => setLinkMethod('codigo_seguro')}
                      />
                      <div>
                        <div className="font-bold text-white">Código Individual Seguro</div>
                        <div className="text-[11px] text-slate-400">Si el colegio le proporcionó un código único de vinculación.</div>
                      </div>
                    </label>
                  </div>
                </div>

                {linkMethod === 'codigo_seguro' && (
                  <div>
                    <label className="text-slate-400 block mb-1">Código de vinculación seguro:</label>
                    <input
                      type="text"
                      placeholder="Ej. FAM-6A-7891"
                      value={invitationCodeInput}
                      onChange={e => setInvitationCodeInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setLinkStep(2)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {linkMethod === 'codigo_seguro' ? 'Validar Código' : 'Enviar Solicitud'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =====================================================================
            VISTA 9: NOTIFICACIONES FAMILIARES
           ===================================================================== */}
        {activeTab === 'notificaciones' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span>Notificaciones y Solicitudes Familiares</span>
              </h2>
              <p className="text-xs text-slate-400">
                Historial de avisos de asistencia, notas y estado de vinculaciones
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Cuenta Familiar Activa</div>
                    <div className="text-slate-400">Su cuenta de tutor está registrada en el sistema de la U.E. Luis Espinal Tarde.</div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Gestión 2026</span>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VISTA 10: MI PERFIL (DATOS DEL ADULTO)
           ===================================================================== */}
        {activeTab === 'perfil' && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 animate-in fade-in">
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                <span>Perfil del Padre, Madre o Tutor</span>
              </h2>
              <p className="text-xs text-slate-400">
                Datos personales y estudiantes vinculados a su cuenta
              </p>
            </div>

            {profileFeedback && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold">
                {profileFeedback}
              </div>
            )}

            {pwdResetSent && (
              <div className="p-3 bg-indigo-950/80 border border-indigo-800 text-indigo-300 rounded-xl text-xs font-semibold">
                Se ha enviado un enlace de recuperación a su correo electrónico.
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block mb-1">Nombre completo del adulto:</span>
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
                  <span className="text-slate-400 block mb-1">Cédula de Identidad:</span>
                  <input
                    type="text"
                    disabled
                    value={currentUser.ci || 'Registrada en Firestore'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Número de teléfono / celular (Editable):
                  </label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    placeholder="Ej. +591 71234567"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  {savingProfile ? 'Guardando...' : 'Editar teléfono'}
                </button>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cambiar contraseña
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('hijos')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Gestionar mis hijos
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Modal de Comunicación del Padre de Familia con Confirmación Obligatoria */}
      {showParentCommModal && (
        <NewCommunicationModal
          currentUser={currentUser}
          isOpen={showParentCommModal}
          onClose={() => setShowParentCommModal(false)}
          defaultCourseCode={childrenList[selectedChildIndex]?.courseCode || '6A'}
          defaultType="comunicado"
          onSuccess={(msg) => {
            alert(`Mensaje "${msg.subject}" remitido formalmente a la institución.`);
            setShowParentCommModal(false);
          }}
        />
      )}
    </div>
  );
};
