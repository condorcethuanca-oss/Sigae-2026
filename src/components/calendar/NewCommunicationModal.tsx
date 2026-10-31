import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  ShieldCheck,
  Search,
  ChevronLeft,
  FileText,
  Bell,
  Award,
  Sparkles,
  Lock,
} from 'lucide-react';
import { SigaeUser, SigaeRole, InternalMessage } from '../../types';
import { messagingService, RecipientResolutionResult } from '../../firebase/messagingService';
import { SECONDARY_24_COURSES } from '../../firebase/scheduleService';

interface NewCommunicationModalProps {
  currentUser: SigaeUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: InternalMessage) => void;
  defaultCourseCode?: string;
  defaultType?: 'comunicado' | 'recordatorio' | 'actividad' | 'tarea' | 'evaluacion' | 'reunion';
}

export const NewCommunicationModal: React.FC<NewCommunicationModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
  defaultCourseCode = '6A',
  defaultType = 'comunicado',
}) => {
  // Step 1: Formulario | Step 2: Pantalla de Confirmación Obligatoria
  const [step, setStep] = useState<1 | 2>(1);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [msgType, setMsgType] = useState<
    'comunicado' | 'recordatorio' | 'actividad' | 'tarea' | 'evaluacion' | 'reunion'
  >(defaultType);
  const [priority, setPriority] = useState<'normal' | 'importante' | 'prioritario'>('normal');

  // Destinatarios
  const [recipientMode, setRecipientMode] = useState<'grupo' | 'individual'>('grupo');
  const [targetGroup, setTargetGroup] = useState<
    'all_teachers' | 'all_parents' | 'all_students' | 'course_parents' | 'course_students'
  >(currentUser.role === 'director' ? 'all_teachers' : 'course_parents');
  const [targetCourseCode, setTargetCourseCode] = useState(defaultCourseCode);

  // Búsqueda individual
  const [individualSearch, setIndividualSearch] = useState('');
  const [selectedIndividual, setSelectedIndividual] = useState<{
    uid: string;
    displayName: string;
    role: SigaeRole;
  } | null>(null);

  // Fechas: Envío vs Evento
  const [sendScheduleType, setSendScheduleType] = useState<'ahora' | 'programado'>('ahora');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date(2026, 9, 22);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('08:00');

  // Fecha del evento en calendario
  const [hasEventDate, setHasEventDate] = useState(
    ['evaluacion', 'tarea', 'actividad', 'reunion'].includes(defaultType)
  );
  const [eventDate, setEventDate] = useState(() => '2026-10-23');
  const [eventTime, setEventTime] = useState('10:00');

  // Estado de resolución y confirmación
  const [resolution, setResolution] = useState<RecipientResolutionResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Calcular resolución de destinatarios en tiempo real
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const resolve = async () => {
      setIsResolving(true);
      try {
        const res = await messagingService.resolveRecipients(
          recipientMode === 'individual' ? 'individual' : targetGroup,
          targetCourseCode,
          selectedIndividual || undefined
        );
        if (isMounted) {
          setResolution(res);
        }
      } catch (err) {
        console.warn('Error resolviendo destinatarios:', err);
      } finally {
        if (isMounted) setIsResolving(false);
      }
    };

    resolve();
    return () => {
      isMounted = false;
    };
  }, [isOpen, recipientMode, targetGroup, targetCourseCode, selectedIndividual]);

  if (!isOpen) return null;

  // Validación para pasar a la confirmación
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!title.trim()) {
      setErrorNotice('Debes ingresar un título para el mensaje.');
      return;
    }
    if (!content.trim()) {
      setErrorNotice('El contenido del mensaje no puede estar vacío.');
      return;
    }
    if (recipientMode === 'individual' && !selectedIndividual) {
      setErrorNotice('Selecciona un destinatario individual específico.');
      return;
    }

    setStep(2); // Pasar a Pantalla de Confirmación Obligatoria
  };

  // Envío final confirmado a Firestore
  const handleConfirmSend = async () => {
    setIsSubmitting(true);
    setErrorNotice(null);

    try {
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const isScheduled = sendScheduleType === 'programado';

      const newMessage: InternalMessage = {
        id: messageId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        senderRole: currentUser.role,
        recipientId:
          recipientMode === 'individual' && selectedIndividual
            ? selectedIndividual.uid
            : targetGroup,
        recipientName: resolution?.groupLabel || 'Destinatarios Oficiales',
        subject: title.trim(),
        content: content.trim(),
        type: msgType,
        priority: priority,
        targetGroup: recipientMode === 'individual' ? 'individual' : targetGroup,
        targetCourseCode: targetCourseCode,
        eventDate: hasEventDate ? eventDate : undefined,
        eventTime: hasEventDate ? eventTime : undefined,
        scheduledAt: isScheduled ? `${scheduledDate}T${scheduledTime}:00` : undefined,
        sentAt: !isScheduled ? new Date().toISOString() : undefined,
        status: isScheduled ? 'programado' : 'enviado',
        recipientCount: resolution?.count || 1,
        createdAt: new Date().toISOString(),
      };

      await messagingService.dispatchMessage(newMessage);
      onSuccess(newMessage);
      onClose();
    } catch (err: any) {
      setErrorNotice(`Error al despachar el comunicado: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-white shadow-2xl flex flex-col">
        {/* Encabezado del modal */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              {step === 1 ? <Bell className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {step === 1 ? 'Nuevo mensaje escolar' : 'Confirmación obligatoria antes de enviar'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 1
                  ? 'Redacta un comunicado, tarea, evaluación o reunión institucional'
                  : 'Verifica los destinatarios y datos antes de realizar el despacho'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación de error si existe */}
        {errorNotice && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-2xl flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* =========================================================================
            PASO 1: FORMULARIO DE REDACCIÓN
            ========================================================================= */}
        {step === 1 && (
          <form onSubmit={handleProceedToConfirmation} className="p-5 sm:p-6 space-y-5 flex-1">
            {/* 1. Título */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Título de la comunicación *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej. Evaluación trimestral de saberes y conocimientos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 2. Tipo y Prioridad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Tipo de actividad / comunicado
                </label>
                <select
                  value={msgType}
                  onChange={e => {
                    const val = e.target.value as any;
                    setMsgType(val);
                    if (['evaluacion', 'tarea', 'actividad', 'reunion'].includes(val)) {
                      setHasEventDate(true);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="comunicado">Comunicado Oficial</option>
                  <option value="evaluacion">Evaluación Pedagógica</option>
                  <option value="tarea">Tarea / Trabajo Práctico</option>
                  <option value="actividad">Actividad de Curso</option>
                  <option value="reunion">Convocatoria a Reunión</option>
                  <option value="recordatorio">Recordatorio</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Nivel de prioridad
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="normal">Normal (Informativa)</option>
                  <option value="importante">Importante (Revisión obligatoria)</option>
                  <option value="prioritario">Prioritario (Acción inmediata)</option>
                </select>
              </div>
            </div>

            {/* 3. Selección de Destinatarios */}
            <div className="space-y-2.5 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Destinatarios autorizados</span>
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('grupo')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      recipientMode === 'grupo'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Por Grupo
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('individual')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      recipientMode === 'individual'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              {recipientMode === 'grupo' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Grupo institucional
                    </label>
                    <select
                      value={targetGroup}
                      onChange={e => setTargetGroup(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white cursor-pointer"
                    >
                      {currentUser.role === 'director' && (
                        <>
                          <option value="all_teachers">Todos los profesores</option>
                          <option value="all_parents">Todos los padres (Colegio completo)</option>
                          <option value="all_students">Todos los estudiantes</option>
                        </>
                      )}
                      <option value="course_parents">Padres de un curso específico</option>
                      <option value="course_students">Estudiantes de un curso específico</option>
                    </select>
                  </div>

                  {['course_parents', 'course_students'].includes(targetGroup) && (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Curso de secundaria
                      </label>
                      <select
                        value={targetCourseCode}
                        onChange={e => setTargetCourseCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white cursor-pointer font-bold"
                      >
                        {SECONDARY_24_COURSES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.gradeLevel} Paralelo {c.parallel}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={individualSearch}
                      onChange={e => setIndividualSearch(e.target.value)}
                      placeholder="Buscar por nombre (ej. Don Roberto González, Prof. Carlos Mamani)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500"
                    />
                  </div>

                  {/* Ejemplo de contactos autorizados rápidos */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { uid: 'tch-01', displayName: 'Prof. Carlos Mamani Quispe', role: 'profesor' as SigaeRole },
                      { uid: 'tch-02', displayName: 'Profa. Elena Choquehuanca', role: 'profesor' as SigaeRole },
                      { uid: 'par-1', displayName: 'Don Roberto González Paredes (Junta Escolar)', role: 'padre' as SigaeRole },
                      { uid: 'dir-1', displayName: 'Despacho de Dirección', role: 'director' as SigaeRole },
                    ].map(u => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => setSelectedIndividual(u)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                          selectedIndividual?.uid === u.uid
                            ? 'bg-blue-600 border-blue-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span>{u.displayName}</span>
                        <span className="text-[9px] uppercase text-slate-400">({u.role})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicador de destinatarios activos resueltos */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Destinatarios alcanzados:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {isResolving ? 'Calculando...' : `${resolution?.count || 0} personas activas`}
                </span>
              </div>
            </div>

            {/* 4. Fecha de Envío (Ahora vs Programado) */}
            <div className="space-y-2 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Fecha y momento de despacho</span>
              </label>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="sendSchedule"
                    checked={sendScheduleType === 'ahora'}
                    onChange={() => setSendScheduleType('ahora')}
                    className="accent-blue-600"
                  />
                  <span>Enviar inmediatamente</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="sendSchedule"
                    checked={sendScheduleType === 'programado'}
                    onChange={() => setSendScheduleType('programado')}
                    className="accent-blue-600"
                  />
                  <span>Programar envío futuro</span>
                </label>
              </div>

              {sendScheduleType === 'programado' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Fecha de despacho</span>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Hora estimada</span>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. Fecha del Evento en Calendario (si aplica) */}
            <div className="space-y-2 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Publicar como evento en el calendario escolar</span>
                </label>
                <input
                  type="checkbox"
                  checked={hasEventDate}
                  onChange={e => setHasEventDate(e.target.checked)}
                  className="accent-blue-600 cursor-pointer"
                />
              </div>

              {hasEventDate && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Fecha de la actividad</span>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Hora de inicio</span>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={e => setEventTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Contenido del Mensaje */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Contenido del comunicado *
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                placeholder="Escribe detalladamente las instrucciones, temarios, requerimientos o información oficial..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
              />
            </div>

            {/* Botones de acción del paso 1 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Revisar y continuar</span>
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            PASO 2: PANTALLA DE CONFIRMACIÓN OBLIGATORIA (MANDATORY CONFIRMATION)
            ========================================================================= */}
        {step === 2 && (
          <div className="p-5 sm:p-6 space-y-6 flex-1">
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    ¿Estás seguro de enviar este mensaje escolar?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Revisa atentamente el resumen de despacho antes de emitir la comunicación institucional.
                  </p>
                </div>
              </div>

              {/* Ficha Resumen de Despacho */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black">
                    Título del Mensaje
                  </span>
                  <p className="font-bold text-white text-sm">{title}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black">Remitente</span>
                  <p className="font-semibold text-slate-200">
                    {currentUser.displayName} ·{' '}
                    <span className="text-blue-400 uppercase font-mono font-bold">
                      {currentUser.role}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black">
                    Destinatarios Oficiales
                  </span>
                  <p className="font-bold text-emerald-400">
                    {resolution?.groupLabel || 'Destinatarios'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black">
                    Cantidad Real de Destinatarios
                  </span>
                  <p className="font-mono font-black text-white text-sm">
                    {resolution?.count || 1} persona(s) registradas y activas
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black">
                    Momento de Despacho
                  </span>
                  <p className="font-semibold text-slate-200">
                    {sendScheduleType === 'ahora' ? (
                      <span className="text-emerald-400 font-bold">Inmediato</span>
                    ) : (
                      `Programado para: ${scheduledDate} a las ${scheduledTime}`
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black">
                    Tipo y Prioridad
                  </span>
                  <p className="font-semibold text-slate-200 capitalize">
                    {msgType} · Prioridad {priority}
                  </p>
                </div>

                {hasEventDate && (
                  <div className="sm:col-span-2 p-2.5 bg-blue-950/40 border border-blue-800/60 rounded-xl text-[11px] text-blue-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      Se registrará en el calendario para el:{' '}
                      <strong>{eventDate}</strong> ({eventTime})
                    </span>
                  </div>
                )}
              </div>

              {/* Vista previa del contenido */}
              <div className="space-y-1.5 pt-3 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-black">
                  Vista Previa del Texto
                </span>
                <p className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                  {content}
                </p>
              </div>
            </div>

            {/* Botones de Confirmación y Protección Contra Doble Envío */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Volver y editar</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSend}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Procesando envío seguro...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {sendScheduleType === 'ahora'
                        ? 'Confirmar y enviar ahora'
                        : 'Confirmar programación'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
