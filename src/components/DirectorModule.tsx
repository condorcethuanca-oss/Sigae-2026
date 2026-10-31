import React, { useState, useEffect } from 'react';
import { TeacherRecord, SchoolConfig, SchoolGroup, InternalMessage, SigaeUser } from '../types';
import { directorService, DEFAULT_BOLIVIA_SCHOOL } from '../firebase/directorService';
import { storageService } from '../firebase/storageService';
import {
  Users,
  UserPlus,
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  KeyRound,
  BookOpen,
  School,
  Clock,
  Save,
  X,
  Phone,
  Mail,
  FileText,
  BadgeCheck,
  GraduationCap,
  Sparkles,
  Layers,
  MessageSquare,
  Send,
  UserCheck,
  AlertTriangle,
  Building,
  Info,
  ChevronRight,
  Eye,
  Power,
  Paperclip,
  FileDown,
  UploadCloud,
} from 'lucide-react';

interface DirectorModuleProps {
  currentUser: SigaeUser;
}

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

const STANDARD_SUBJECTS = [
  'Matemática y Cálculo',
  'Comunicación y Lenguajes',
  'Física Experimental',
  'Química General',
  'Biología y Geografía',
  'Ciencias Sociales e Historia de Bolivia',
  'Artes Plásticas y Visuales',
  'Educación Musical',
  'Educación Física y Deportes',
  'Cosmovisiones y Filosofía',
  'Valores, Espiritualidad y Religiones',
  'Técnica Tecnológica (BTH - Robótica)',
  'Lengua Extranjera (Inglés)',
  'Lengua Originaria (Aymara / Quechua)',
];

export const DirectorModule: React.FC<DirectorModuleProps> = ({ currentUser }) => {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(DEFAULT_BOLIVIA_SCHOOL);

  // Active view inside Director Module
  const [activeDirectorTab, setActiveDirectorTab] = useState<'teachers' | 'groups' | 'messages' | 'institution'>('teachers');

  // Search & filter for teachers
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'licencia' | 'inactivo'>('todos');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<TeacherRecord | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState<TeacherRecord | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  // Group Assignment Modals
  const [editingGroup, setEditingGroup] = useState<SchoolGroup | null>(null);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);

  // New Message Form
  const [msgRecipient, setMsgRecipient] = useState<string>('all_teachers');
  const [msgSubject, setMsgSubject] = useState<string>('');
  const [msgContent, setMsgContent] = useState<string>('');
  const [msgType, setMsgType] = useState<InternalMessage['type']>('comunicado_general');
  const [msgPriority, setMsgPriority] = useState<InternalMessage['priority']>('normal');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgFile, setMsgFile] = useState<File | null>(null);
  const [msgUploadProgress, setMsgUploadProgress] = useState<number | null>(null);

  // File states for Teacher & School
  const [teacherDocFile, setTeacherDocFile] = useState<File | null>(null);
  const [teacherDocProgress, setTeacherDocProgress] = useState<number | null>(null);
  const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null);
  const [schoolLogoProgress, setSchoolLogoProgress] = useState<number | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Teacher Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCiNumber, setNewCiNumber] = useState('');
  const [newCiExp, setNewCiExp] = useState('LP');
  const [newPhone, setNewPhone] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newHourlyLoad, setNewHourlyLoad] = useState<number>(80);
  const [newNotes, setNewNotes] = useState('');

  // New Group Form State
  const [newGroupName, setNewGroupName] = useState('5° de Secundaria');
  const [newGroupParallel, setNewGroupParallel] = useState('A');
  const [newGroupLevel, setNewGroupLevel] = useState<'primaria' | 'secundaria'>('secundaria');
  const [newGroupShift, setNewGroupShift] = useState<'mañana' | 'tarde'>('mañana');
  const [newGroupClassroom, setNewGroupClassroom] = useState('Aula 201');
  const [newGroupStudents, setNewGroupStudents] = useState<number>(30);
  const [newGroupTutorId, setNewGroupTutorId] = useState<string>('');

  // Subscribe to real-time collections from Firestore
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

    directorService.getSchoolConfig().then(cfg => {
      setSchoolConfig(cfg);
    });

    return () => {
      unsubTeachers();
      unsubGroups();
      unsubMessages();
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Create Teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newSpecialty || !newCiNumber) {
      showToast('Por favor completa todos los campos requeridos.', 'error');
      return;
    }

    try {
      const fullCi = `${newCiNumber} ${newCiExp}`;
      await directorService.createTeacher({
        fullName: newFullName,
        email: newEmail,
        ci: fullCi,
        ciExpedition: newCiExp,
        phone: newPhone.startsWith('+591') ? newPhone : `+591 ${newPhone}`,
        specialty: newSpecialty,
        assignedGrades: [],
        assignedSubjects: [newSpecialty.split('/')[0].trim()],
        hourlyLoad: newHourlyLoad,
        status: 'activo',
        notes: newNotes,
      });

      showToast(`¡Profesor(a) ${newFullName} registrado correctamente en Firestore!`);
      setShowAddTeacherModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewCiNumber('');
      setNewPhone('');
      setNewSpecialty('');
      setNewNotes('');
    } catch (err: any) {
      showToast(err.message || 'Error al registrar profesor.', 'error');
    }
  };

  // 2. Update Teacher
  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    try {
      await directorService.updateTeacher(editingTeacher.id, {
        fullName: editingTeacher.fullName,
        email: editingTeacher.email,
        phone: editingTeacher.phone,
        specialty: editingTeacher.specialty,
        hourlyLoad: editingTeacher.hourlyLoad,
        status: editingTeacher.status,
        notes: editingTeacher.notes,
      });

      showToast(`Ficha del profesor ${editingTeacher.fullName} actualizada.`);
      setEditingTeacher(null);
    } catch (err) {
      showToast('Error al actualizar datos.', 'error');
    }
  };

  // 3. Toggle Teacher Status (Activar / Desactivar / Licencia)
  const handleToggleStatus = async (teacher: TeacherRecord, newStatus: 'activo' | 'inactivo' | 'licencia') => {
    try {
      await directorService.toggleTeacherStatus(teacher.id, newStatus);
      const actionLabel = newStatus === 'activo' ? 'activada' : newStatus === 'licencia' ? 'puesta en licencia' : 'desactivada';
      showToast(`Cuenta de ${teacher.fullName} ${actionLabel}.`);
    } catch (err) {
      showToast('Error al cambiar estado.', 'error');
    }
  };

  // 4. Delete Teacher
  const handleDeleteTeacher = async (teacher: TeacherRecord) => {
    if (confirm(`¿Dar de baja definitivamente al profesor ${teacher.fullName}? El Director controla qué profesores pertenecen al sistema.`)) {
      try {
        await directorService.deleteTeacher(teacher.id);
        showToast(`Profesor ${teacher.fullName} retirado del sistema SIGAE.`);
      } catch (err) {
        showToast('Error al retirar profesor.', 'error');
      }
    }
  };

  // 5. Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tutorTeacher = teachers.find(t => t.id === newGroupTutorId);
      const initialSubjects = STANDARD_SUBJECTS.slice(0, 5).map((s, idx) => ({
        id: `sbj-${idx + 1}`,
        name: s,
        hoursWeekly: 5,
      }));

      await directorService.createGroup({
        name: newGroupName,
        parallel: newGroupParallel,
        level: newGroupLevel,
        shift: newGroupShift,
        academicYear: schoolConfig.academicYear || '2026',
        classroom: newGroupClassroom,
        studentCount: newGroupStudents,
        tutorTeacherId: tutorTeacher?.id,
        tutorTeacherName: tutorTeacher?.fullName,
        subjects: initialSubjects,
      });

      showToast(`Grupo ${newGroupName} Paralelo ${newGroupParallel} creado con éxito.`);
      setShowAddGroupModal(false);
    } catch (err) {
      showToast('Error al crear grupo.', 'error');
    }
  };

  // 6. Assign Subject Teacher in Group
  const handleAssignSubjectTeacher = async (groupId: string, subjectId: string, teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    try {
      await directorService.assignSubjectTeacher(groupId, subjectId, teacher.id, teacher.fullName);
      showToast(`Materia asignada a ${teacher.fullName}.`);
    } catch (err) {
      showToast('Error al asignar profesor.', 'error');
    }
  };

  // 7. Assign Tutor Teacher to Group
  const handleAssignGroupTutor = async (groupId: string, teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    try {
      await directorService.assignGroupTutor(groupId, teacher.id, teacher.fullName);
      showToast(`Tutoría de aula asignada a ${teacher.fullName}.`);
    } catch (err) {
      showToast('Error al asignar tutor.', 'error');
    }
  };

  // 8. Send Official Message / Circular
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject || !msgContent) {
      showToast('Por favor completa el asunto y contenido del comunicado.', 'error');
      return;
    }

    setSendingMsg(true);
    try {
      const recipientName =
        msgRecipient === 'all_teachers'
          ? 'Todo el Plantel Docente'
          : teachers.find(t => t.id === msgRecipient)?.fullName || 'Profesor';

      await directorService.sendMessage({
        senderId: currentUser.uid,
        senderName: `${currentUser.displayName} (Dirección)`,
        senderRole: 'director',
        recipientId: msgRecipient,
        recipientName,
        subject: msgSubject,
        content: msgContent,
        type: msgType,
        priority: msgPriority,
      });

      showToast('¡Comunicado oficial enviado y registrado en Firestore!');
      setMsgSubject('');
      setMsgContent('');
    } catch (err) {
      showToast('Error al enviar comunicado.', 'error');
    } finally {
      setSendingMsg(false);
    }
  };

  // 9. Save School Info
  const handleSaveSchoolConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await directorService.updateSchoolConfig(schoolConfig);
      showToast('Información general de la institución actualizada.');
    } catch (err) {
      showToast('Error al guardar datos institucionales.', 'error');
    }
  };

  // Filtered teachers list
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch =
      t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ci.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeTeachersCount = teachers.filter(t => t.status === 'activo').length;
  const onLeaveTeachersCount = teachers.filter(t => t.status === 'licencia').length;
  const inactiveTeachersCount = teachers.filter(t => t.status === 'inactivo').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Institutional Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-bold text-2xl shrink-0">
              <School className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-white">
                  {schoolConfig.schoolName}
                </h1>
                <span className="text-xs font-mono bg-indigo-950 border border-indigo-700/60 text-indigo-300 px-2.5 py-0.5 rounded">
                  CÓDIGO SIE: {schoolConfig.sie}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  MÓDULO DE DIRECCIÓN ACTIVO
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Director Titular: <strong className="text-white">{currentUser.displayName || schoolConfig.directorName}</strong> · {schoolConfig.department}, Bolivia · {schoolConfig.currentPeriod}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Nuevo Profesor</span>
            </button>
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Crear Grupo / Curso</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800/70 text-emerald-200'
              : 'bg-rose-950/70 border-rose-800/70 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Institutional KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Plantel Docente Total</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {teachers.length} <span className="text-xs font-normal text-slate-500">profesores</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1.5">
            <span>{activeTeachersCount} activos</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400">{onLeaveTeachersCount} licencia</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Grupos y Cursos Asignados</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {groups.length} <span className="text-xs font-normal text-slate-500">aulas</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {groups.reduce((acc, g) => acc + (g.studentCount || 0), 0)} estudiantes matriculados
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Comunicados y Mensajería</span>
            <MessageSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {messages.length} <span className="text-xs font-normal text-slate-500">oficiales</span>
          </div>
          <div className="text-[11px] text-sky-300 mt-1">
            Canal de Dirección activo
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Control de Seguridad</span>
            <BadgeCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-300 mt-1">
            DIRECTOR SUPREMO
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Reglas ABAC en Cloud Firestore
          </div>
        </div>
      </div>

      {/* 3. Director Module Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs overflow-x-auto">
        <button
          onClick={() => setActiveDirectorTab('teachers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeDirectorTab === 'teachers'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestión de Profesores ({teachers.length})</span>
        </button>

        <button
          onClick={() => setActiveDirectorTab('groups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeDirectorTab === 'groups'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Grupos y Asignación de Profesores ({groups.length})</span>
        </button>

        <button
          onClick={() => setActiveDirectorTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeDirectorTab === 'messages'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Mensajería y Circulares ({messages.length})</span>
        </button>

        <button
          onClick={() => setActiveDirectorTab('institution')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
            activeDirectorTab === 'institution'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Información de la Institución (SIE)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GESTIÓN DE PROFESORES                             */}
      {/* ======================================================== */}
      {activeDirectorTab === 'teachers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-0">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar profesor por nombre, CI, materia o correo..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="activo">Solo Activos ({activeTeachersCount})</option>
                <option value="licencia">En Licencia ({onLeaveTeachersCount})</option>
                <option value="inactivo">Inactivos ({inactiveTeachersCount})</option>
              </select>
            </div>

            <div className="text-slate-400 text-xs">
              El Director controla el ingreso y permanencia del cuerpo docente.
            </div>
          </div>

          {/* Teachers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Profesor(a)</th>
                  <th className="py-3 px-4 font-semibold">C.I. (Bolivia)</th>
                  <th className="py-3 px-4 font-semibold">Especialidad</th>
                  <th className="py-3 px-4 font-semibold">Cursos / Aulas</th>
                  <th className="py-3 px-4 font-semibold text-center">Carga Horaria</th>
                  <th className="py-3 px-4 font-semibold">Estado de Cuenta</th>
                  <th className="py-3 px-4 font-semibold text-right">Acciones de Dirección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredTeachers.map(teacher => {
                  const isActivo = teacher.status === 'activo';
                  const isLicencia = teacher.status === 'licencia';

                  return (
                    <tr key={teacher.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{teacher.fullName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{teacher.email}</span>
                          {teacher.phone && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span>{teacher.phone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {teacher.ci || '-'}
                      </td>

                      <td className="py-3 px-4 font-medium text-indigo-300">
                        {teacher.specialty}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {teacher.assignedGrades && teacher.assignedGrades.length > 0 ? (
                            teacher.assignedGrades.map((g, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded"
                              >
                                {g}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Sin cursos asignados</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        {teacher.hourlyLoad} hrs/mes
                      </td>

                      {/* Status column with quick toggle */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isActivo ? (
                            <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Activo
                            </span>
                          ) : isLicencia ? (
                            <span className="text-amber-400 font-semibold text-[11px] flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              Licencia
                            </span>
                          ) : (
                            <span className="text-rose-400 font-semibold text-[11px] flex items-center gap-1 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              Inactivo
                            </span>
                          )}

                          {/* Quick status switch dropdown */}
                          <select
                            value={teacher.status}
                            onChange={e => handleToggleStatus(teacher, e.target.value as any)}
                            className="bg-slate-950 border border-slate-700 text-slate-400 rounded text-[10px] py-0.5 px-1 focus:outline-none"
                            title="Cambiar estado de la cuenta"
                          >
                            <option value="activo">Activar</option>
                            <option value="licencia">Poner en Licencia</option>
                            <option value="inactivo">Desactivar</option>
                          </select>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingTeacher(teacher)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors"
                            title="Ver ficha completa"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                          </button>

                          <button
                            onClick={() => setEditingTeacher({ ...teacher })}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors"
                            title="Editar información del docente"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          <button
                            onClick={() => setShowCredentialsModal(teacher)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors"
                            title="Gestionar credenciales de acceso"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          <button
                            onClick={() => handleDeleteTeacher(teacher)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded border border-slate-700 transition-colors"
                            title="Retirar profesor del sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GRUPOS Y ASIGNACIÓN DE PROFESORES                */}
      {/* ======================================================== */}
      {activeDirectorTab === 'groups' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Gestión de Grupos y Relación con Profesores</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                El Director asigna profesores tutores de aula y profesores titulares para cada materia curricular.
              </p>
            </div>

            <button
              onClick={() => setShowAddGroupModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Grupo / Aula</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {groups.map(group => {
              return (
                <div
                  key={group.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors"
                >
                  {/* Group Header */}
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {group.name} - Paralelo {group.parallel}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {group.level.toUpperCase()} · Turno {group.shift}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Aula: <strong className="text-slate-200">{group.classroom || 'Aula asignada'}</strong> · {group.studentCount} Alumnos matriculados
                      </p>
                    </div>

                    {/* Tutor Assignment */}
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                        Profesor Tutor de Aula:
                      </span>
                      <select
                        value={group.tutorTeacherId || ''}
                        onChange={e => handleAssignGroupTutor(group.id, e.target.value)}
                        className="bg-slate-950 border border-indigo-700/60 text-indigo-300 font-semibold rounded px-2 py-1 text-xs mt-0.5 focus:outline-none"
                      >
                        <option value="">-- Seleccionar Tutor --</option>
                        {teachers.filter(t => t.status === 'activo').map(t => (
                          <option key={t.id} value={t.id}>
                            {t.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subjects & Assigned Teachers Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Materias y Docentes Asignados:
                    </span>

                    <div className="space-y-2">
                      {group.subjects && group.subjects.length > 0 ? (
                        group.subjects.map(subject => (
                          <div
                            key={subject.id}
                            className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-white">{subject.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {subject.hoursWeekly || 5} horas pedagógicas semanales
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400">Docente Titular:</span>
                              <select
                                value={subject.teacherId || ''}
                                onChange={e => handleAssignSubjectTeacher(group.id, subject.id, e.target.value)}
                                className={`text-xs rounded px-2.5 py-1 font-medium border focus:outline-none ${
                                  subject.teacherId
                                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                                    : 'bg-amber-950/40 border-amber-800 text-amber-300'
                                }`}
                              >
                                <option value="">-- Sin Docente Asignado --</option>
                                {teachers.filter(t => t.status === 'activo').map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.fullName} ({t.specialty.split('/')[0].trim()})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 italic p-3 text-center">
                          Sin materias registradas aún en este grupo.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MENSAJERÍA Y CIRCULARES OFICIALES                */}
      {/* ======================================================== */}
      {activeDirectorTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send Official Message Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Send className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">
                Emitir Comunicado o Mensaje Oficial
              </h3>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Destinatario:</label>
                <select
                  value={msgRecipient}
                  onChange={e => setMsgRecipient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="all_teachers">📢 Todo el Claustro Docente (General)</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      👤 {t.fullName} ({t.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tipo:</label>
                  <select
                    value={msgType}
                    onChange={e => setMsgType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="comunicado_general">Comunicado</option>
                    <option value="circular">Circular Oficial</option>
                    <option value="citacion">Citación a Consejo</option>
                    <option value="mensaje_directo">Mensaje Directo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Prioridad:</label>
                  <select
                    value={msgPriority}
                    onChange={e => setMsgPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Asunto o Título:</label>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={e => setMsgSubject(e.target.value)}
                  placeholder="Ej. Circular N° 05: Cronograma de Exámenes"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Contenido Oficial:</label>
                <textarea
                  rows={4}
                  value={msgContent}
                  onChange={e => setMsgContent(e.target.value)}
                  placeholder="Escribe el texto de la circular o instrucción pedagógica..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sendingMsg}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingMsg ? 'Enviando...' : 'Publicar Comunicado'}</span>
              </button>
            </form>
          </div>

          {/* Messages History List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Historial de Comunicados y Mensajes Emitidos ({messages.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Almacenado seguro en Cloud Firestore
              </span>
            </div>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {messages.map(msg => {
                const isUrgent = msg.priority === 'urgente';
                const isCircular = msg.type === 'circular';

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border space-y-2 transition-colors ${
                      isUrgent
                        ? 'bg-rose-950/20 border-rose-800/60'
                        : isCircular
                        ? 'bg-indigo-950/20 border-indigo-800/60'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">{msg.subject}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                            isUrgent
                              ? 'bg-rose-950 text-rose-300 border-rose-700'
                              : 'bg-indigo-950 text-indigo-300 border-indigo-700'
                          }`}>
                            {msg.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Para: <strong className="text-slate-300">{msg.recipientName}</strong> · De: {msg.senderName}
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(msg.createdAt).toLocaleDateString('es-BO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                      {msg.content}
                    </p>

                    {msg.attachmentName && (
                      <div className="text-[11px] text-indigo-400 flex items-center gap-1.5 pt-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Documento adjunto: {msg.attachmentName}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: INFORMACIÓN DE LA INSTITUCIÓN                     */}
      {/* ======================================================== */}
      {activeDirectorTab === 'institution' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-400" />
              <span>Información General de la Institución Educativa (Bolivia)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Datos oficiales registrados ante el Ministerio de Educación y el SIE.
            </p>
          </div>

          <form onSubmit={handleSaveSchoolConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Oficial de la Unidad Educativa</label>
                <input
                  type="text"
                  value={schoolConfig.schoolName}
                  onChange={e => setSchoolConfig({ ...schoolConfig, schoolName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Código SIE Oficial</label>
                <input
                  type="text"
                  value={schoolConfig.sie}
                  onChange={e => setSchoolConfig({ ...schoolConfig, sie: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Departamento</label>
                <select
                  value={schoolConfig.department}
                  onChange={e => setSchoolConfig({ ...schoolConfig, department: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {BOLIVIA_DEPARTMENTS.map(d => (
                    <option key={d.code} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Distrito Educativo</label>
                <input
                  type="text"
                  value={schoolConfig.district}
                  onChange={e => setSchoolConfig({ ...schoolConfig, district: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Director Titular</label>
                <input
                  type="text"
                  value={schoolConfig.directorName}
                  onChange={e => setSchoolConfig({ ...schoolConfig, directorName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Gestión y Periodo Escolar</label>
                <input
                  type="text"
                  value={schoolConfig.currentPeriod}
                  onChange={e => setSchoolConfig({ ...schoolConfig, currentPeriod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Turno de Funcionamiento</label>
                <select
                  value={schoolConfig.shift}
                  onChange={e => setSchoolConfig({ ...schoolConfig, shift: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="mañana">Mañana</option>
                  <option value="tarde">Tarde</option>
                  <option value="completo">Jornada Completa</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Teléfono Institucional</label>
                <input
                  type="text"
                  value={schoolConfig.phone || ''}
                  onChange={e => setSchoolConfig({ ...schoolConfig, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Guardar Información Institucional
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: REGISTRAR NUEVO PROFESOR                       */}
      {/* ======================================================== */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Registrar Nuevo Profesor (Dirección)
                </h3>
              </div>
              <button onClick={() => setShowAddTeacherModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo del Profesor(a) *</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="Ej. Prof. Juan Carlos Quispe Mamani"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cédula de Identidad (C.I.) *</label>
                  <input
                    type="text"
                    value={newCiNumber}
                    onChange={e => setNewCiNumber(e.target.value)}
                    placeholder="6829104"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Expedición (Bolivia)</label>
                  <select
                    value={newCiExp}
                    onChange={e => setNewCiExp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {BOLIVIA_DEPARTMENTS.map(d => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Correo Institucional *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="juan.quispe@franztamayo.edu.bo"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="71234567"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Especialidad Pedagógica *</label>
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={e => setNewSpecialty(e.target.value)}
                    placeholder="Ej. Matemática y Física"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Carga Horaria Mensual</label>
                  <input
                    type="number"
                    value={newHourlyLoad}
                    onChange={e => setNewHourlyLoad(parseInt(e.target.value) || 80)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observaciones Iniciales</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Docente titular con pertinencia académica..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Guardar y Habilitar Profesor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: VER INFORMACIÓN BÁSICA DEL PROFESOR           */}
      {/* ======================================================== */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{viewingTeacher.fullName}</h3>
                  <p className="text-[11px] text-slate-400">Ficha Básica del Profesor</p>
                </div>
              </div>
              <button onClick={() => setViewingTeacher(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Cédula de Identidad:</span>
                <span className="font-mono text-white font-semibold">{viewingTeacher.ci}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Correo Electrónico:</span>
                <span className="font-mono text-slate-300">{viewingTeacher.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Teléfono de Contacto:</span>
                <span className="text-slate-300">{viewingTeacher.phone || 'No registrado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Especialidad:</span>
                <span className="text-indigo-300 font-semibold">{viewingTeacher.specialty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Carga Horaria:</span>
                <span className="font-mono text-white">{viewingTeacher.hourlyLoad} horas/mes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Estado en el Sistema:</span>
                <span className="uppercase font-bold text-emerald-400">{viewingTeacher.status}</span>
              </div>
            </div>

            {viewingTeacher.notes && (
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                <span className="text-slate-500 font-semibold block mb-0.5">Observaciones de Dirección:</span>
                <p className="italic">"{viewingTeacher.notes}"</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingTeacher(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDITAR PROFESOR                                */}
      {/* ======================================================== */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Editar Datos del Profesor · {editingTeacher.fullName}
              </h3>
              <button onClick={() => setEditingTeacher(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacher} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={editingTeacher.fullName}
                  onChange={e => setEditingTeacher({ ...editingTeacher, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Especialidad</label>
                  <input
                    type="text"
                    value={editingTeacher.specialty}
                    onChange={e => setEditingTeacher({ ...editingTeacher, specialty: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estado</label>
                  <select
                    value={editingTeacher.status}
                    onChange={e => setEditingTeacher({ ...editingTeacher, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="activo">Activo (Habilitado)</option>
                    <option value="licencia">En Licencia</option>
                    <option value="inactivo">Inactivo (Suspendido)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editingTeacher.phone}
                    onChange={e => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Carga Horaria</label>
                  <input
                    type="number"
                    value={editingTeacher.hourlyLoad}
                    onChange={e => setEditingTeacher({ ...editingTeacher, hourlyLoad: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Observaciones de Dirección</label>
                <textarea
                  rows={3}
                  value={editingTeacher.notes || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CREAR NUEVO GRUPO / AULA                       */}
      {/* ======================================================== */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Crear Nuevo Grupo / Paralelo
              </h3>
              <button onClick={() => setShowAddGroupModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Grado o Año de Escolaridad</label>
                <select
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="1° de Secundaria">1° de Secundaria</option>
                  <option value="2° de Secundaria">2° de Secundaria</option>
                  <option value="3° de Secundaria">3° de Secundaria</option>
                  <option value="4° de Secundaria">4° de Secundaria</option>
                  <option value="5° de Secundaria">5° de Secundaria</option>
                  <option value="6° de Secundaria">6° de Secundaria</option>
                  <option value="1° de Primaria">1° de Primaria</option>
                  <option value="2° de Primaria">2° de Primaria</option>
                  <option value="3° de Primaria">3° de Primaria</option>
                  <option value="4° de Primaria">4° de Primaria</option>
                  <option value="5° de Primaria">5° de Primaria</option>
                  <option value="6° de Primaria">6° de Primaria</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Paralelo</label>
                  <select
                    value={newGroupParallel}
                    onChange={e => setNewGroupParallel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="A">Paralelo A</option>
                    <option value="B">Paralelo B</option>
                    <option value="C">Paralelo C</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Turno</label>
                  <select
                    value={newGroupShift}
                    onChange={e => setNewGroupShift(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="mañana">Mañana</option>
                    <option value="tarde">Tarde</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Aula Física</label>
                  <input
                    type="text"
                    value={newGroupClassroom}
                    onChange={e => setNewGroupClassroom(e.target.value)}
                    placeholder="Aula 204"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Capacidad Alumnos</label>
                  <input
                    type="number"
                    value={newGroupStudents}
                    onChange={e => setNewGroupStudents(parseInt(e.target.value) || 30)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Asignar Profesor Tutor Inicial</label>
                <select
                  value={newGroupTutorId}
                  onChange={e => setNewGroupTutorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">-- Sin tutor asignado por ahora --</option>
                  {teachers.filter(t => t.status === 'activo').map(t => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: GESTIÓN DE CREDENCIALES DEL PROFESOR           */}
      {/* ======================================================== */}
      {showCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-700/60 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Administración de Cuenta y Credenciales
                </h3>
                <p className="text-slate-400 text-[11px]">
                  {showCredentialsModal.fullName}
                </p>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed">
              El Director controla el acceso del profesor al sistema SIGAE. Puedes restablecer o asignar una clave provisional:
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div>
                <span className="text-slate-500 font-medium">Correo Electrónico del Docente:</span>
                <div className="font-mono text-white text-xs select-all mt-0.5">{showCredentialsModal.email}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Clave Provisional Asignada:</span>
                <input
                  type="text"
                  value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                  className="bg-slate-900 border border-amber-600/50 rounded-lg px-2.5 py-1 text-amber-300 font-mono text-xs w-full mt-1"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCredentialsModal(null)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast(`Clave actualizada para ${showCredentialsModal.fullName}.`);
                  setShowCredentialsModal(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg"
              >
                Confirmar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
