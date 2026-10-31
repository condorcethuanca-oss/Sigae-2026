import React, { useState, useEffect } from 'react';
import {
  School,
  Lock,
  Mail,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  HeartHandshake,
  Clock,
  Loader2,
  Inbox,
  Send,
  UserCheck,
  KeyRound,
  AlertTriangle,
  HelpCircle,
  Check,
  ShieldAlert,
  User,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { SigaeUser, SigaeRole } from '../types';
import { authService } from '../firebase/authService';
import { studentService } from '../firebase/studentService';

export type AuthScreenView =
  | 'login'                       // 1. Pantalla principal según referencia visual
  | 'select_role'                 // 2. Elección inicial obligatoria de rol (Profesor vs Padre/Tutor)
  | 'register_teacher'            // 3. Formulario específico docente
  | 'register_parent'             // 4. Formulario específico familiar
  | 'teacher_registered_pending'  // 5. Confirmación post-registro docente (espera de Dirección)
  | 'teacher_pending_notice'      // 6. Aviso si docente intenta ingresar antes de aprobación
  | 'parent_registered_confirm'   // 7. Confirmación post-registro familiar (vinculación pendiente)
  | 'forgot_password'             // 8. Solicitud de recuperación de contraseña
  | 'forgot_password_success'     // 9. Instrucciones detalladas de correo y Spam
  | 'reset_password_code_entry'   // 10. Validar enlace o código recibido
  | 'reset_password_confirm'      // 11. Definición de nueva contraseña en SIGAE
  | 'secondary_access';           // 12. Métodos secundarios (Celular SMS / Google)

interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  prefilledEmail?: string;
  onLoginSuccess: (user: SigaeUser) => void;
  onGoToHome?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  prefilledEmail = '',
  onLoginSuccess,
  onGoToHome,
}) => {
  // Current screen view
  const [currentView, setCurrentView] = useState<AuthScreenView>(
    initialMode === 'register' ? 'select_role' : 'login'
  );

  // Login form state
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration form fields
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [ci, setCi] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('Matemática y Razonamiento Lógico');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Parent student linking state (3-step flow)
  const [parentStep, setParentStep] = useState<1 | 2 | 3>(1);
  const [parentLinkMethod, setParentLinkMethod] = useState<'director_approval' | 'invitation_code'>('director_approval');
  const [invitationCode, setInvitationCode] = useState('');
  const [verifyingStudent, setVerifyingStudent] = useState(false);
  const [studentCandidateMatch, setStudentCandidateMatch] = useState<{
    matched: boolean;
    studentName?: string;
    courseSuggestion?: string;
  } | null>(null);

  const [studentFullName, setStudentFullName] = useState('');
  const [studentRude, setStudentRude] = useState('');
  const [studentCi, setStudentCi] = useState('');
  const [studentGrade, setStudentGrade] = useState('6° de Secundaria A');
  const [parentRelationship, setParentRelationship] = useState('Padre');
  const [pendingParentInfo, setPendingParentInfo] = useState<{
    parentName: string;
    parentEmail: string;
    studentName: string;
    studentRude: string;
    method?: string;
    isApproved?: boolean;
  } | null>(null);

  // Phone SMS state (+591 Bolivia)
  const [phoneDigits, setPhoneDigits] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  // Password recovery state
  const [forgotEmail, setForgotEmail] = useState(prefilledEmail);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // In-app password reset confirmation state
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetEmailAccount, setResetEmailAccount] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmittingNewPassword, setIsSubmittingNewPassword] = useState(false);

  // Pending teacher info for notification screen
  const [pendingTeacherInfo, setPendingTeacherInfo] = useState<{ name: string; email: string } | null>(null);

  // Loading & feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Cooldown timers
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resetCooldown > 0) {
      timer = setTimeout(() => setResetCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resetCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phoneCooldown > 0) {
      timer = setTimeout(() => setPhoneCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [phoneCooldown]);

  // Check URL parameters for password reset links (e.g. ?mode=resetPassword&oobCode=XYZ)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const oobCode = params.get('oobCode');

      if (mode === 'resetPassword' && oobCode) {
        setResetCode(oobCode);
        verifyAndOpenResetForm(oobCode);
      }
    } catch (e) {
      console.warn('[SIGAE Auth] Notice parsing action URL params:', e);
    }
  }, []);

  const navigateTo = (view: AuthScreenView) => {
    setCurrentView(view);
    setErrorMessage(null);
    setFeedbackSuccess(null);
  };

  // Friendly error mapping
  const mapFriendlyError = (err: any): string => {
    const code = err?.code || '';
    const msg = String(err?.message || '').toLowerCase();

    if (msg.includes('pending_teacher_approval') || code === 'auth/teacher-pending-approval') {
      return 'PENDING_TEACHER_APPROVAL';
    }
    if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
      return 'El formato del correo electrónico ingresado no es válido.';
    }
    if (code === 'auth/wrong-password' || msg.includes('wrong-password') || code === 'auth/invalid-credential') {
      if (email.trim().toLowerCase() === 'condorcethuanca@gmail.com') {
        return 'La cuenta de Dirección General (condorcethuanca@gmail.com) está vinculada a Google. Por favor haz clic en "Continuar con Google" abajo para ingresar al Panel Institucional, o solicita recuperación de contraseña si deseas ingresar con clave.';
      }
      return 'Usuario o contraseña incorrectos. Por favor verifica tus credenciales.';
    }
    if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
      return 'El navegador bloqueó la ventana emergente de inicio de sesión de Google. Por favor permite las ventanas emergentes (popups) en la configuración de tu navegador.';
    }
    if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed')) {
      return 'La ventana de inicio de sesión con Google fue cerrada antes de completar el acceso.';
    }
    if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
      return 'El dominio actual no está habilitado en Firebase Authentication. Contacte al administrador.';
    }
    if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
      return 'No existe ninguna cuenta registrada con este correo en SIGAE.';
    }
    if (code === 'auth/user-disabled' || msg.includes('desactivada') || msg.includes('deshabilitada')) {
      return 'Esta cuenta institucional ha sido desactivada por la Dirección.';
    }
    if (code === 'auth/network-request-failed' || msg.includes('network')) {
      return 'Problema de conexión con los servidores. Verifica tu acceso a internet.';
    }
    if (code === 'auth/email-already-in-use' || msg.includes('already-in-use')) {
      return 'Este correo electrónico ya se encuentra registrado. Inicia sesión o recupera tu contraseña.';
    }
    if (code === 'auth/weak-password' || msg.includes('weak-password')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Demasiados intentos fallidos. Por seguridad, espera 2 minutos antes de reintentar.';
    }
    if (code === 'auth/invalid-verification-code') {
      return 'El código SMS de 6 dígitos ingresado no es correcto.';
    }
    if (code === 'auth/code-expired') {
      return 'El código SMS ha expirado. Por favor solicita uno nuevo.';
    }
    if (code === 'auth/invalid-action-code') {
      return 'El enlace o código de recuperación no es válido o ya fue utilizado.';
    }
    return err?.message || 'Ocurrió un error al procesar tu solicitud. Intenta nuevamente.';
  };

  // ---------------------------------------------------------------------------
  // 1. INICIO DE SESIÓN CENTRALIZADO
  // ---------------------------------------------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Por favor ingrese su usuario o correo electrónico.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor ingrese su contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const user = await authService.loginWithEmail(cleanEmail, password);

      // Verificación de estado de docente pendiente
      if (user.role === 'profesor' && (!user.active || user.approvalStatus === 'pendiente')) {
        setPendingTeacherInfo({
          name: user.displayName || cleanEmail,
          email: user.email || cleanEmail,
        });
        setLoading(false);
        setCurrentView('teacher_pending_notice');
        return;
      }

      setLoading(false);
      onLoginSuccess(user);
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/teacher-pending-approval' || String(err.message).includes('PENDING_TEACHER_APPROVAL')) {
        setPendingTeacherInfo({
          name: err.teacherName || cleanEmail,
          email: err.teacherEmail || cleanEmail,
        });
        setCurrentView('teacher_pending_notice');
        return;
      }
      if (err.code === 'auth/teacher-rejected') {
        setErrorMessage('Tu solicitud de registro como profesor fue rechazada por la Dirección Institucional.');
        return;
      }
      setErrorMessage(mapFriendlyError(err));
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await authService.loginWithGoogle();
      setLoading(false);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(mapFriendlyError(err));
    }
  };

  // ---------------------------------------------------------------------------
  // 2. REGISTRO DE PROFESOR (SOLICITUD INSTITUCIONAL)
  // ---------------------------------------------------------------------------
  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanCi = ci.trim();
    const cleanPhone = phone.trim();
    const cleanSpecialty = specialty.trim() || 'Matemática y Razonamiento Lógico';

    if (!cleanName || !cleanEmail || !cleanCi || !cleanPhone || !regPassword || !regConfirmPassword) {
      setErrorMessage('Por favor complete todos los campos obligatorios del formulario.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Por favor verifique que sean idénticas.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('La contraseña debe tener como mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Crear identidad en Firebase Authentication y registrar solicitud en Firestore
      const result = await authService.registerUser({
        email: cleanEmail,
        pass: regPassword,
        displayName: cleanName,
        role: 'profesor',
        ci: cleanCi,
        phone: cleanPhone,
        specialty: cleanSpecialty,
        schoolSie: '80730142',
      });

      setPendingTeacherInfo({
        name: result.user.displayName,
        email: cleanEmail,
      });

      setLoading(false);
      setCurrentView('teacher_registered_pending');
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage(
          'Este correo ya se encuentra registrado. Si tu solicitud ya fue enviada, está pendiente de autorización por la Dirección. Puedes volver al inicio de sesión o recuperar tu contraseña.'
        );
        return;
      }
      setErrorMessage(mapFriendlyError(err));
    }
  };

  // ---------------------------------------------------------------------------
  // 3. REGISTRO DE PADRE/MADRE O TUTOR EN 3 PASOS DIFERENCIADOS
  // ---------------------------------------------------------------------------

  // Paso 1: Validación de Datos Personales del Adulto
  const handleParentStep1Continue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanCi = ci.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanEmail || !cleanCi || !cleanPhone || !regPassword || !regConfirmPassword) {
      setErrorMessage('Por favor complete todos los campos obligatorios de sus datos personales.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Por favor ingrese un correo electrónico válido (ej: tutor@familia.bo).');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Verifique que ambas sean idénticas.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setErrorMessage(null);
    setParentStep(2);
  };

  // Paso 2: Validación de Datos del Estudiante a Tutelar
  const handleParentStep2Continue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanStudentName = studentFullName.trim();
    const cleanStudentRude = studentRude.trim();
    const cleanStudentCi = studentCi.trim();

    if (!cleanStudentRude || !cleanStudentCi) {
      setErrorMessage('Por favor ingrese el número RUDE y la cédula de identidad del estudiante a tutelar.');
      return;
    }

    // Validación de seguridad: el carnet del estudiante debe ser distinto al del adulto
    if (cleanStudentCi.toLowerCase() === ci.trim().toLowerCase()) {
      setErrorMessage('La cédula del estudiante debe ser distinta a la de usted como padre o tutor.');
      return;
    }

    setVerifyingStudent(true);
    setErrorMessage(null);

    try {
      // Verificar coincidencia con el Padrón Institucional oficial
      const match = await studentService.verifyStudentCandidate({
        studentName: cleanStudentName,
        studentRude: cleanStudentRude,
        studentCi: cleanStudentCi,
      });

      setStudentCandidateMatch(match);

      if (match.matched && match.student) {
        if (!cleanStudentName) {
          setStudentFullName(match.student.fullName);
        }
        if (match.courseSuggestion) {
          setStudentGrade(match.courseSuggestion);
        }
      }

      setVerifyingStudent(false);
      setParentStep(3);
    } catch {
      setVerifyingStudent(false);
      setParentStep(3);
    }
  };

  // Paso 3: Envío Final y Autorización del Vínculo Familiar
  const handleParentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanCi = ci.trim();
    const cleanPhone = phone.trim();
    const cleanStudentName = studentFullName.trim() || studentCandidateMatch?.studentName || 'Estudiante Tutelado';
    const cleanStudentRude = studentRude.trim();
    const cleanStudentCi = studentCi.trim();
    const cleanCode = invitationCode.trim().toUpperCase();

    if (parentLinkMethod === 'invitation_code' && !cleanCode) {
      setErrorMessage('Por favor ingrese el código individual seguro entregado por el colegio.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const isWithCode = parentLinkMethod === 'invitation_code';

      // 1. Crear cuenta en Firebase Auth y perfil familiar con persistencia en Firestore
      const result = await authService.registerUser({
        email: cleanEmail,
        pass: regPassword,
        displayName: cleanName,
        role: 'padre',
        ci: cleanCi,
        phone: cleanPhone,
        schoolSie: '80730142',
        studentLinking: {
          studentName: cleanStudentName,
          studentRude: cleanStudentRude,
          studentCi: cleanStudentCi,
          grade: studentGrade,
          relationship: parentRelationship,
          invitationCode: isWithCode ? cleanCode : undefined,
          status: isWithCode ? 'validada' : 'pendiente_validacion',
        },
      });

      let codeRedeemed = false;
      // 2. Si seleccionó Código Seguro, canjearlo atómicamente
      if (isWithCode && cleanCode) {
        const redeemRes = await studentService.redeemInvitationCode({
          code: cleanCode,
          parentUid: result.user.uid,
          parentName: cleanName,
          studentRude: cleanStudentRude,
        });

        if (!redeemRes.success) {
          console.warn('[SIGAE Auth] Aviso al canjear código:', redeemRes.message);
          // La cuenta del tutor se creó exitosamente, la solicitud quedó registrada para revisión
        } else {
          codeRedeemed = true;
        }
      }

      setPendingParentInfo({
        parentName: cleanName,
        parentEmail: cleanEmail,
        studentName: cleanStudentName,
        studentRude: cleanStudentRude,
        method: parentLinkMethod,
        isApproved: codeRedeemed,
      });

      setLoading(false);
      setCurrentView('parent_registered_confirm');
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage(
          'Este correo electrónico ya se encuentra registrado. Por favor inicie sesión o utilice la opción de recuperación de contraseña.'
        );
        return;
      }
      setErrorMessage(mapFriendlyError(err));
    }
  };

  // ---------------------------------------------------------------------------
  // 4. RECUPERACIÓN DE CONTRASEÑA
  // ---------------------------------------------------------------------------
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Por favor ingrese un correo electrónico válido.');
      return;
    }

    setIsSendingReset(true);
    setErrorMessage(null);

    try {
      await authService.resetPassword(cleanEmail);
      setIsSendingReset(false);
      setResetCooldown(45);
      setCurrentView('forgot_password_success');
    } catch (err: any) {
      setIsSendingReset(false);
      setErrorMessage(mapFriendlyError(err));
    }
  };

  const verifyAndOpenResetForm = async (codeOrLink: string) => {
    let cleanCode = codeOrLink.trim();
    if (cleanCode.includes('oobCode=')) {
      try {
        const url = new URL(cleanCode);
        const extracted = url.searchParams.get('oobCode');
        if (extracted) cleanCode = extracted;
      } catch {
        const match = cleanCode.match(/oobCode=([^&]+)/);
        if (match && match[1]) cleanCode = match[1];
      }
    }

    if (!cleanCode) {
      setErrorMessage('Por favor ingrese el código o enlace recibido.');
      return;
    }

    setIsVerifyingCode(true);
    setErrorMessage(null);

    try {
      const emailFound = await authService.verifyResetCode(cleanCode);
      setResetCode(cleanCode);
      setResetEmailAccount(emailFound);
      setIsVerifyingCode(false);
      setCurrentView('reset_password_confirm');
    } catch (err: any) {
      setIsVerifyingCode(false);
      setErrorMessage(mapFriendlyError(err));
    }
  };

  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmittingNewPassword(true);
    setErrorMessage(null);

    try {
      await authService.confirmNewPassword(resetCode, newPassword);
      setIsSubmittingNewPassword(false);
      setFeedbackSuccess('¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión.');
      setTimeout(() => {
        setEmail(resetEmailAccount || forgotEmail);
        setPassword('');
        navigateTo('login');
      }, 1500);
    } catch (err: any) {
      setIsSubmittingNewPassword(false);
      setErrorMessage(mapFriendlyError(err));
    }
  };

  // ---------------------------------------------------------------------------
  // 5. ACCESO SECUNDARIO (TELÉFONO / GOOGLE)
  // ---------------------------------------------------------------------------
  const handleSendPhoneCode = async () => {
    const cleanDigits = phoneDigits.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 8) {
      setErrorMessage('Ingrese un número de celular boliviano de 8 dígitos (ej: 71234567).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const fullPhone = `+591${cleanDigits}`;
      const result = await authService.sendPhoneCode(fullPhone, 'recaptcha-verifier-box');
      setCodeSent(true);
      setPhoneCooldown(60);
      setFeedbackSuccess(`Código SMS enviado al ${fullPhone}. Ingrese los 6 dígitos recibidos.`);
    } catch (err: any) {
      setErrorMessage(mapFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMessage('El código debe tener exactamente 6 dígitos.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const fullPhone = `+591${phoneDigits.replace(/[^0-9]/g, '')}`;
      const user = await authService.verifyPhoneCode({
        phone: fullPhone,
        code: cleanCode,
      });
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(mapFriendlyError(err));
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await authService.loginWithGoogle();
      onLoginSuccess(result.user);
    } catch (err: any) {
      setErrorMessage(mapFriendlyError(err));
      setLoading(false);
    }
  };

  // Emblema institucional idéntico a la referencia
  const InstitutionalLogo = () => (
    <div className="w-13 h-13 mx-auto bg-white rounded-xl shadow-md p-1.5 flex flex-col items-center justify-center mb-2.5 border border-blue-100 text-[#123663]">
      <svg viewBox="0 0 64 64" className="w-8 h-8 text-[#123663]" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="10" y="8" width="44" height="48" rx="6" className="fill-[#123663] stroke-[#123663]" />
        <path
          d="M42 24 C40 20 35 18 30 18 C22 18 18 24 18 32 C18 40 22 46 30 46 C37 46 41 42 42 36 L30 36"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="28" y1="28" x2="38" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-[7.5px] font-black uppercase tracking-tight text-[#123663] leading-none mt-0.5 font-sans">
        Gestión Escolar
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-[#123663] selection:text-white">
      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="recaptcha-verifier-box" className="hidden" />

      {/* Fondo institucional suave y limpio: ambiente escolar sutil y cálido */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-200/50 via-slate-100 to-slate-200/40 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#123663_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      {/* =========================================================================
          TARJETA PRINCIPAL CENTRADA (REFERENCIA VISUAL EXACTA DE LA IMAGEN)
         ========================================================================= */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-xl shadow-slate-300/60 overflow-hidden border border-slate-200/90 relative z-10 transition-all">

        {/* ENCABEZADO AZUL OSCURO INSTITUCIONAL (Idéntico a la captura) */}
        <div className="bg-[#123663] px-6 pt-7 pb-6 text-center text-white relative">
          {/* Botón para volver a la página de inicio institucional */}
          {onGoToHome && (
            <button
              type="button"
              onClick={onGoToHome}
              className="absolute left-3.5 top-3.5 text-blue-200/80 hover:text-white transition-colors text-xs flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-white/10"
              title="Volver a la portada principal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Inicio</span>
            </button>
          )}

          {/* Badge superior */}
          <div className="inline-block px-3 py-0.5 rounded-full bg-[#1b4375] border border-[#2b5d9e]/50 text-blue-100 text-[10px] font-bold tracking-widest uppercase mb-3.5 shadow-sm">
            {currentView === 'select_role' || currentView === 'register_teacher' || currentView === 'register_parent'
              ? 'REGISTRO INSTITUCIONAL'
              : currentView === 'forgot_password' || currentView === 'forgot_password_success' || currentView === 'reset_password_confirm'
              ? 'SEGURIDAD INSTITUCIONAL'
              : 'ACCESO INSTITUCIONAL'}
          </div>

          {/* Logotipo institucional en recuadro blanco */}
          <InstitutionalLogo />

          {/* Título y subtítulos */}
          <h1 className="text-2xl font-black tracking-tight text-white mb-0.5 font-sans">
            SIGAE
          </h1>
          <p className="text-xs text-blue-100/90 font-normal leading-snug">
            Sistema Integral de Gestión Académica Escolar
          </p>
          <p className="text-[11px] text-blue-200/75 mt-0.5 font-medium">
            U.E. Luis Espinal Tarde de Collpani
          </p>
        </div>

        {/* NOTIFICACIONES Y MENSAJES DE ESTADO */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{errorMessage}</div>
          </div>
        )}

        {feedbackSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{feedbackSuccess}</div>
          </div>
        )}

        {/* =====================================================================
            1. PANTALLA PRINCIPAL: INICIO DE SESIÓN (REFERENCIA VISUAL DE LA IMAGEN)
           ===================================================================== */}
        {currentView === 'login' && (
          <div className="p-6 sm:p-7 space-y-4 bg-white">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ingrese su correo electrónico"
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#123663] focus:border-transparent placeholder:text-slate-400 bg-white transition-all disabled:opacity-50"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    disabled={loading}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#123663] focus:border-transparent placeholder:text-slate-400 bg-white transition-all font-mono disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    navigateTo('forgot_password');
                  }}
                  className="text-xs text-slate-500 hover:text-[#123663] font-medium transition-colors cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Iniciar sesión</span>
                )}
              </button>
            </form>

            {/* Divisor */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-500 font-medium">o accede con</span>
              </div>
            </div>

            {/* Acceso con Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuar con Google</span>
            </button>

            {/* Texto inferior de registro */}
            <div className="text-center text-xs text-slate-600 pt-2">
              ¿No tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => navigateTo('select_role')}
                className="font-bold text-[#123663] hover:underline cursor-pointer"
              >
                Regístrate
              </button>
            </div>

            {/* Opciones secundarias discretas (SMS / Google) */}
            <div className="pt-3 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigateTo('secondary_access')}
                className="text-[11px] text-slate-400 hover:text-[#123663] transition-colors cursor-pointer"
              >
                Otras opciones de acceso (Celular / Google)
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            2. ELECCIÓN OBLIGATORIA DEL ROL AL PULSAR «REGÍSTRATE» (PARTE 4)
           ===================================================================== */}
        {currentView === 'select_role' && (
          <div className="p-6 sm:p-7 space-y-4 bg-white animate-in fade-in">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900">
                ¿Qué tipo de usuario deseas registrar?
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Selecciona tu función en la institución para iniciar el trámite de acceso:
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Opción 1: Profesor */}
              <button
                type="button"
                onClick={() => navigateTo('register_teacher')}
                className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-[#123663] bg-white hover:bg-slate-50/70 text-left transition-all cursor-pointer group flex items-start gap-3.5 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#123663] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5 text-[#123663]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#123663] transition-colors">
                      Profesor
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#123663] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Solicita acceso docente a la institución. Tu cuenta deberá ser revisada y autorizada por la Dirección antes de que puedas acceder a las funciones docentes.
                  </p>
                </div>
              </button>

              {/* Opción 2: Padre/Madre o tutor */}
              <button
                type="button"
                onClick={() => navigateTo('register_parent')}
                className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-[#123663] bg-white hover:bg-slate-50/70 text-left transition-all cursor-pointer group flex items-start gap-3.5 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HeartHandshake className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#123663] transition-colors">
                      Padre/Madre o tutor
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#123663] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Registra tu cuenta para solicitar acceso a la información escolar del estudiante que te corresponda. La vinculación deberá verificarse antes de habilitar el acceso.
                  </p>
                </div>
              </button>
            </div>

            {/* Nota institucional de seguridad: Director no tiene autorregistro */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed">
              <strong className="text-slate-700 font-semibold">Aviso institucional:</strong> Por normativa de seguridad, las cuentas de Dirección son asignadas administrativamente y no admiten autorregistro público.
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al inicio de sesión</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            3. REGISTRO DE PROFESORES (PARTE 4)
           ===================================================================== */}
        {currentView === 'register_teacher' && (
          <div className="p-6 sm:p-7 space-y-4 bg-white animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Registro de Profesor</h2>
                <p className="text-[11px] text-slate-500">Solicitud de incorporación al plantel docente</p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('select_role')}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cambiar</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-blue-50/70 p-3 rounded-xl border border-blue-100">
              Completa tus datos profesionales. Una vez enviada la solicitud, la Dirección revisará y autorizará tu acceso para habilitar tu panel docente.
            </p>

            <form onSubmit={handleTeacherRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ej. Lic. Sonia Choque Mamani"
                  disabled={loading}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] placeholder:text-slate-400 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Correo electrónico institucional o personal *
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="profesor@sigae.edu.bo"
                  disabled={loading}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] placeholder:text-slate-400 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Cédula C.I. *
                  </label>
                  <input
                    type="text"
                    value={ci}
                    onChange={e => setCi(e.target.value)}
                    placeholder="6192841 LP"
                    disabled={loading}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Celular *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="71234567"
                    disabled={loading}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Mín. 6 car."
                      disabled={loading}
                      className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Confirmar clave *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita clave"
                      disabled={loading}
                      className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando solicitud...</span>
                  </>
                ) : (
                  <span>Enviar solicitud de registro</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            4. CONFIRMACIÓN POST-REGISTRO DOCENTE (PARTE 4.4)
           ===================================================================== */}
        {currentView === 'teacher_registered_pending' && (
          <div className="p-6 sm:p-7 space-y-5 text-center bg-white animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-[#123663] flex items-center justify-center mx-auto shadow-sm">
              <Clock className="w-7 h-7 text-[#123663]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">
                ¡Solicitud registrada correctamente!
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed px-1">
                Tu solicitud de acceso como profesor se registró correctamente. La Dirección debe revisar y autorizar tu solicitud antes de que puedas ingresar al panel docente.
              </p>
            </div>

            {pendingTeacherInfo && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
                <div className="text-[11px] text-slate-500 font-medium">Datos del solicitante:</div>
                <div className="font-bold text-slate-800">{pendingTeacherInfo.name}</div>
                <div className="font-mono text-slate-600 text-[11px]">{pendingTeacherInfo.email}</div>
                <div className="pt-1 flex items-center gap-1.5 text-amber-700 font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Estado: Pendiente de autorización por Dirección</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* =====================================================================
            5. AVISO: DOCENTE PENDIENTE AL INTENTAR LOGUEARSE (PARTE 4.5)
           ===================================================================== */}
        {currentView === 'teacher_pending_notice' && (
          <div className="p-6 sm:p-7 space-y-5 text-center bg-white animate-in fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-7 h-7 text-amber-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-bold text-slate-900">
                Cuenta en espera de autorización
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed px-1">
                Tu solicitud de acceso como profesor se encuentra registrada en el sistema de la U.E. Luis Espinal Tarde, pero todavía está pendiente de revisión y autorización por parte de la Dirección.
              </p>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-left text-xs space-y-1.5 text-amber-900">
              <div className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Acceso restringido hasta aprobación</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Por seguridad de la unidad educativa, no podrás acceder a los cursos, listas de alumnos ni calificaciones hasta que el Director formalice la aprobación de tu expediente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              Entendido · Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* =====================================================================
            6. REGISTRO DE PADRES/MADRES O TUTORES EN 3 PASOS (PARTE 5)
           ===================================================================== */}
        {currentView === 'register_parent' && (
          <div className="p-5 sm:p-7 space-y-4 bg-white animate-in fade-in">
            {/* Header del formulario */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-[#123663]" />
                  <span>Registro de Padre, Madre o Tutor</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  U.E. Luis Espinal Tarde de Collpani (SIE: 80730142)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParentStep(1);
                  navigateTo('select_role');
                }}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cambiar rol</span>
              </button>
            </div>

            {/* Indicador visual de los 3 pasos */}
            <div className="py-1">
              <div className="flex items-center justify-between text-center relative">
                {/* Línea conectora */}
                <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-slate-200 -z-0">
                  <div
                    className="h-full bg-[#123663] transition-all duration-300"
                    style={{
                      width: parentStep === 1 ? '0%' : parentStep === 2 ? '50%' : '100%',
                    }}
                  />
                </div>

                {/* Paso 1 */}
                <div className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setParentStep(1)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      parentStep === 1
                        ? 'bg-[#123663] text-white ring-4 ring-blue-100'
                        : parentStep > 1
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {parentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </button>
                  <span className={`text-[10px] mt-1 font-semibold ${parentStep === 1 ? 'text-[#123663]' : 'text-slate-500'}`}>
                    Mis datos
                  </span>
                </div>

                {/* Paso 2 */}
                <div className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (fullName && regEmail && ci && phone) setParentStep(2);
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      parentStep === 2
                        ? 'bg-[#123663] text-white ring-4 ring-blue-100'
                        : parentStep > 2
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {parentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
                  </button>
                  <span className={`text-[10px] mt-1 font-semibold ${parentStep === 2 ? 'text-[#123663]' : 'text-slate-500'}`}>
                    Datos de mi hijo
                  </span>
                </div>

                {/* Paso 3 */}
                <div className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (fullName && regEmail && studentRude) setParentStep(3);
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      parentStep === 3
                        ? 'bg-[#123663] text-white ring-4 ring-blue-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    3
                  </button>
                  <span className={`text-[10px] mt-1 font-semibold ${parentStep === 3 ? 'text-[#123663]' : 'text-slate-500'}`}>
                    Autorización
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================================
                PASO 1: DATOS PERSONALES DEL PADRE, MADRE O TUTOR
               ================================================================= */}
            {parentStep === 1 && (
              <form onSubmit={handleParentStep1Continue} className="space-y-3.5 animate-in fade-in">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#123663]" />
                    <span>Paso 1: Mis datos personales</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Introduce tus datos como padre, madre o tutor. En el siguiente paso registrarás la información de tu hijo o hija.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nombre completo del adulto titular *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ej: Roberto González Paredes"
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] placeholder:text-slate-400 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Correo electrónico del adulto *
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="tutor@familia.bo"
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] placeholder:text-slate-400 bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Cédula C.I. del adulto *
                    </label>
                    <input
                      type="text"
                      value={ci}
                      onChange={e => setCi(e.target.value)}
                      placeholder="3948102 LP"
                      disabled={loading}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Teléfono / Celular WhatsApp *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="72098415"
                      disabled={loading}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="Mín. 6 caracteres"
                        disabled={loading}
                        className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Confirmar contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        placeholder="Repita contraseña"
                        disabled={loading}
                        className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Continuar: datos de mi hijo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* =================================================================
                PASO 2: DATOS DEL ESTUDIANTE A TUTELAR
               ================================================================= */}
            {parentStep === 2 && (
              <form onSubmit={handleParentStep2Continue} className="space-y-3.5 animate-in fade-in">
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-1 text-emerald-950">
                  <h3 className="text-xs font-bold flex items-center gap-1.5 text-emerald-900">
                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                    <span>Paso 2: Datos de mi hijo o hija</span>
                  </h3>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Introduce los datos escolares de tu hijo. SIGAE comprobará que estén registrados en la institución.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Código RUDE del estudiante *
                    </label>
                    <input
                      type="text"
                      value={studentRude}
                      onChange={e => setStudentRude(e.target.value)}
                      placeholder="Ej: 807301422019001"
                      disabled={loading || verifyingStudent}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Figura en la libreta o certificado RUDE oficial
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Cédula C.I. del estudiante *
                    </label>
                    <input
                      type="text"
                      value={studentCi}
                      onChange={e => setStudentCi(e.target.value)}
                      placeholder="Ej: 8492015"
                      disabled={loading || verifyingStudent}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Distinta a la cédula de usted como padre
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nombre completo del estudiante
                  </label>
                  <input
                    type="text"
                    value={studentFullName}
                    onChange={e => setStudentFullName(e.target.value)}
                    placeholder="Ej: Emanuel Cóndorcet Huanca"
                    disabled={loading || verifyingStudent}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] placeholder:text-slate-400 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Tal como figura en su partida de nacimiento o cédula
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Curso y paralelo *
                    </label>
                    <select
                      value={studentGrade}
                      onChange={e => setStudentGrade(e.target.value)}
                      disabled={loading || verifyingStudent}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] bg-white cursor-pointer"
                    >
                      <option value="6° de Secundaria A">6° de Secundaria — Paralelo A</option>
                      <option value="6° de Secundaria B">6° de Secundaria — Paralelo B</option>
                      <option value="5° de Secundaria A">5° de Secundaria — Paralelo A</option>
                      <option value="5° de Secundaria B">5° de Secundaria — Paralelo B</option>
                      <option value="4° de Secundaria A">4° de Secundaria — Paralelo A</option>
                      <option value="4° de Secundaria B">4° de Secundaria — Paralelo B</option>
                      <option value="3° de Secundaria A">3° de Secundaria — Paralelo A</option>
                      <option value="2° de Secundaria A">2° de Secundaria — Paralelo A</option>
                      <option value="1° de Secundaria A">1° de Secundaria — Paralelo A</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Parentesco / Relación legal *
                    </label>
                    <select
                      value={parentRelationship}
                      onChange={e => setParentRelationship(e.target.value)}
                      disabled={loading || verifyingStudent}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] bg-white cursor-pointer"
                    >
                      <option value="Padre">Padre</option>
                      <option value="Madre">Madre</option>
                      <option value="Tutor Legal">Tutor Legal</option>
                      <option value="Apoderado">Apoderado</option>
                      <option value="Abuelo/a">Abuelo / Abuela</option>
                    </select>
                  </div>
                </div>

                {/* Coincidencia institucional si ya fue verificada */}
                {studentCandidateMatch?.matched && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1 text-emerald-950">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Coincidencia encontrada en el Padrón Institucional</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Estudiante: <strong>{studentCandidateMatch.studentName || studentFullName}</strong> · Curso sugerido: <strong>{studentCandidateMatch.courseSuggestion || studentGrade}</strong>
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setParentStep(1)}
                    disabled={verifyingStudent}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                  </button>
                  <button
                    type="submit"
                    disabled={verifyingStudent}
                    className="flex-1 py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {verifyingStudent ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando con el padrón...</span>
                      </>
                    ) : (
                      <>
                        <span>Verificar y continuar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* =================================================================
                PASO 3: AUTORIZACIÓN DEL VÍNCULO FAMILIAR
               ================================================================= */}
            {parentStep === 3 && (
              <form onSubmit={handleParentRegister} className="space-y-4 animate-in fade-in">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#123663]" />
                    <span>Paso 3: Verificación y autorización del vínculo</span>
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    ¿Cómo deseas verificar tu vinculación familiar con <strong>{studentFullName || 'tu hijo o hija'}</strong>?
                  </p>
                </div>

                {/* Resumen de los datos a vincular */}
                <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Resumen de Vinculación Familiar
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Adulto titular:</span>
                    <strong className="text-white">{fullName} (CI: {ci})</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Estudiante:</span>
                    <strong className="text-white">{studentFullName || 'Estudiante'} (RUDE: {studentRude})</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Curso y parentesco:</span>
                    <span className="text-indigo-300 font-medium">{studentGrade} · {parentRelationship}</span>
                  </div>
                </div>

                {/* Opciones de Método */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Selecciona el método de verificación:
                  </label>

                  {/* Opción A: Aprobación de la Directora */}
                  <div
                    onClick={() => setParentLinkMethod('director_approval')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      parentLinkMethod === 'director_approval'
                        ? 'bg-blue-50/70 border-[#123663] ring-2 ring-blue-100'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          parentLinkMethod === 'director_approval'
                            ? 'border-[#123663] bg-[#123663] text-white'
                            : 'border-slate-400 bg-white'
                        }`}>
                          {parentLinkMethod === 'director_approval' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          Método A: Solicitar aprobación de la Dirección
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#123663] bg-blue-100 px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 pl-6 leading-relaxed">
                      Se registrará tu cuenta familiar y la Directora revisará el expediente escolar para autorizar la visualización de notas y asistencia.
                    </p>
                  </div>

                  {/* Opción B: Código Individual Seguro */}
                  <div
                    onClick={() => setParentLinkMethod('invitation_code')}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      parentLinkMethod === 'invitation_code'
                        ? 'bg-blue-50/70 border-[#123663] ring-2 ring-blue-100'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          parentLinkMethod === 'invitation_code'
                            ? 'border-[#123663] bg-[#123663] text-white'
                            : 'border-slate-400 bg-white'
                        }`}>
                          {parentLinkMethod === 'invitation_code' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          Método B: Utilizar un código individual del colegio
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Instantáneo
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 pl-6 leading-relaxed">
                      Si la Dirección ya te entregó un código seguro de vinculación de un solo uso para tu hijo.
                    </p>

                    {parentLinkMethod === 'invitation_code' && (
                      <div className="pt-2 pl-6 space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-800">
                          Código de verificación individual seguro:
                        </label>
                        <input
                          type="text"
                          value={invitationCode}
                          onChange={e => setInvitationCode(e.target.value.toUpperCase())}
                          placeholder="Ej: ESP-6A-84920"
                          disabled={loading}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono tracking-wider uppercase bg-white"
                          required={parentLinkMethod === 'invitation_code'}
                        />
                        <span className="text-[10px] text-slate-500 block">
                          Código único emitido para la U.E. Luis Espinal Tarde
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setParentStep(2)}
                    disabled={loading}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creando cuenta institucional...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {parentLinkMethod === 'invitation_code'
                            ? 'Registrar cuenta y validar con código'
                            : 'Registrar cuenta y solicitar vinculación'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =====================================================================
            7. CONFIRMACIÓN POST-REGISTRO FAMILIAR
           ===================================================================== */}
        {currentView === 'parent_registered_confirm' && (
          <div className="p-6 sm:p-7 space-y-5 text-center bg-white animate-in fade-in">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
              pendingParentInfo?.isApproved
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-blue-50 border border-blue-200 text-[#123663]'
            }`}>
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-slate-900">
                ¡Cuenta familiar creada exitosamente!
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed px-1">
                Bienvenido(a) a SIGAE. Tu identidad ha sido registrada en la base de datos institucional de la U.E. Luis Espinal Tarde.
              </p>
            </div>

            {/* Ficha resumen con datos reales */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-2 text-slate-700">
              <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-200 flex items-center justify-between">
                <span>Expediente de Acceso Familiar</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  pendingParentInfo?.isApproved
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingParentInfo?.isApproved ? 'Vinculación Validada' : 'En Revisión por Dirección'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tutor registrado:</span>
                  <strong className="text-slate-900">{pendingParentInfo?.parentName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Correo institucional:</span>
                  <span className="text-slate-700 font-mono text-[11px]">{pendingParentInfo?.parentEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estudiante tutelado:</span>
                  <strong className="text-slate-900">{pendingParentInfo?.studentName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Código RUDE:</span>
                  <span className="text-emerald-700 font-mono font-bold">{pendingParentInfo?.studentRude}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200 leading-relaxed">
                {pendingParentInfo?.isApproved
                  ? '¡Excelente! Tu relación familiar fue verificada con el código seguro. Al iniciar sesión tendrás acceso inmediato a las calificaciones, asistencia y horarios de tu hijo.'
                  : 'Tu solicitud de vinculación familiar ya fue enviada al despacho de la Dirección. Podrás iniciar sesión en tu portal familiar; la visualización completa de notas y asistencia se habilitará tan pronto como la Directora formalice la autorización.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setParentStep(1);
                navigateTo('login');
              }}
              className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Iniciar sesión con mi cuenta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =====================================================================
            8. RECUPERACIÓN DE CONTRASEÑA (PARTE 7)
           ===================================================================== */}
        {currentView === 'forgot_password' && (
          <div className="p-6 sm:p-7 space-y-4 bg-white animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#123663]" />
                <span>Recuperar contraseña</span>
              </h2>
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Escribe el correo electrónico asociado a tu cuenta institucional en SIGAE y te enviaremos instrucciones seguras para recuperar el acceso.
            </p>

            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="usuario@sigae.edu.bo"
                    disabled={isSendingReset}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] placeholder:text-slate-400 bg-white"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingReset}
                className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingReset ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando correo...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar instrucciones</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigateTo('reset_password_code_entry')}
                className="text-xs text-[#123663] hover:underline font-medium cursor-pointer"
              >
                ¿Ya tienes un código o enlace de recuperación? Haz clic aquí
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            9. CONFIRMACIÓN POST-ENVÍO: GUÍA CLARA DE CORREO Y SPAM (PARTE 7)
           ===================================================================== */}
        {currentView === 'forgot_password_success' && (
          <div className="p-6 sm:p-7 space-y-4 bg-white animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-200 text-[#123663] flex items-center justify-center mx-auto shadow-sm">
                <Inbox className="w-7 h-7 text-[#123663]" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                ¡Correo de recuperación enviado!
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hemos enviado las instrucciones para restablecer tu contraseña a:
              </p>
              <div className="p-2 rounded-lg bg-slate-100 font-mono text-xs font-bold text-[#123663] break-all">
                {forgotEmail}
              </div>
            </div>

            {/* AVISO CRÍTICO DE SPAM Y REMITENTE CON VISTA PREVIA DEL CORREO */}
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2.5 text-xs text-amber-900 shadow-sm">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>¿Cómo reconocer el correo que te llegará?</span>
              </div>

              {/* Simulación visual de cabecera de correo */}
              <div className="bg-white p-2.5 rounded-lg border border-amber-200/80 space-y-1 font-sans text-[11px]">
                <div className="flex items-center gap-1 text-slate-500">
                  <span className="font-semibold text-slate-700">De:</span>
                  <code className="text-[#123663] bg-blue-50 px-1 rounded font-mono text-[10px]">noreply@xenodochial-cosine-2ds98.firebaseapp.com</code>
                </div>
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-700">Asunto:</span>
                  <span className="text-slate-800 ml-1 font-medium">Restablecer contraseña para xenodochial-cosine-2ds98</span>
                </div>
                <div className="text-[10px] text-slate-400 italic pt-0.5 border-t border-slate-100">
                  Nota: «xenodochial-cosine-2ds98» es el identificador técnico del servidor oficial de Firebase de la U.E. Luis Espinal Tarde. Es un correo oficial y legítimo.
                </div>
              </div>

              {/* Pasos claros */}
              <div className="space-y-1.5 text-[11px] text-amber-900/90 pt-1">
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                  <span><strong>Revisa tu carpeta de SPAM / Correo no deseado</strong> o la pestaña «Promociones» si no lo ves en tu bandeja de entrada en 1-2 minutos.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                  <span><strong>Abre el correo</strong> y haz clic en el enlace azul para ingresar tu nueva contraseña.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                  <span>O si prefieres, copia el enlace o código del correo y pégalo directamente aquí abajo para cambiarla en SIGAE.</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {/* Botón directo para pegar el código o enlace en SIGAE */}
              <button
                type="button"
                onClick={() => navigateTo('reset_password_code_entry')}
                className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-[#123663] border border-blue-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Tengo el enlace o código y quiero cambiarla aquí</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigateTo('forgot_password')}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer text-center"
                >
                  Corregir correo
                </button>

                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={isSendingReset || resetCooldown > 0}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 text-center"
                >
                  {resetCooldown > 0 ? `Reenviar en ${resetCooldown}s` : 'Reenviar correo'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEmail(forgotEmail);
                  navigateTo('login');
                }}
                className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer mt-1"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            10. INGRESAR CÓDIGO O ENLACE DIRECTO EN SIGAE (PARTE 7.1)
           ===================================================================== */}
        {currentView === 'reset_password_code_entry' && (
          <div className="p-6 sm:p-7 space-y-4 bg-white animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#123663]" />
                <span>Validar código de acción</span>
              </h2>
              <button
                type="button"
                onClick={() => navigateTo('forgot_password')}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pega aquí el enlace de restablecimiento o el código recibido para asignar tu nueva clave sin salir de SIGAE:
            </p>

            <form
              onSubmit={e => {
                e.preventDefault();
                verifyAndOpenResetForm(manualCodeInput);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Enlace o código recibido
                </label>
                <textarea
                  rows={3}
                  value={manualCodeInput}
                  onChange={e => setManualCodeInput(e.target.value)}
                  placeholder="https://...oobCode=XYZ... o código de restablecimiento"
                  disabled={isVerifyingCode}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingCode || !manualCodeInput.trim()}
                className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifyingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando código...</span>
                  </>
                ) : (
                  <span>Continuar a nueva contraseña</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            11. ESTABLECER NUEVA CONTRASEÑA VALIDADA (PARTE 7.1)
           ===================================================================== */}
        {currentView === 'reset_password_confirm' && (
          <div className="p-6 sm:p-7 space-y-4 bg-white animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Nueva contraseña</h2>
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            </div>

            {resetEmailAccount && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-[#123663] font-medium">
                Restableciendo contraseña para: <strong className="font-mono">{resetEmailAccount}</strong>
              </div>
            )}

            <form onSubmit={handleConfirmNewPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nueva contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isSubmittingNewPassword}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Confirmar nueva contraseña *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  disabled={isSubmittingNewPassword}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#123663] font-mono"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingNewPassword}
                className="w-full py-3 bg-[#123663] hover:bg-[#0c2749] text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingNewPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando contraseña...</span>
                  </>
                ) : (
                  <span>Guardar contraseña y entrar</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            12. ACCESO SECUNDARIO DISCRETO: CELULAR SMS O GOOGLE (PARTE 8)
           ===================================================================== */}
        {currentView === 'secondary_access' && (
          <div className="p-6 sm:p-7 space-y-4 bg-white animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Otras opciones de acceso</h2>
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            {/* Opción A: Google */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">Acceso con cuenta de Google</label>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continuar con Google</span>
              </button>
            </div>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">o con celular</div>
            </div>

            {/* Opción B: Teléfono SMS */}
            <form onSubmit={handlePhoneVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Celular (Bolivia +591)
                </label>
                <div className="flex gap-2">
                  <span className="px-2.5 py-2 rounded-lg bg-slate-100 border border-slate-300 text-xs font-bold font-mono text-slate-700 flex items-center">
                    🇧🇴 +591
                  </span>
                  <input
                    type="tel"
                    maxLength={8}
                    value={phoneDigits}
                    onChange={e => setPhoneDigits(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="71234567"
                    disabled={loading || codeSent}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono"
                  />
                  {!codeSent ? (
                    <button
                      type="button"
                      onClick={handleSendPhoneCode}
                      disabled={loading || phoneDigits.length < 8}
                      className="px-3 py-2 bg-[#123663] text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      Enviar SMS
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCodeSent(false)}
                      className="px-2 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              </div>

              {codeSent && (
                <div className="space-y-2 p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <label className="block text-xs font-bold text-[#123663]">
                    Código de 6 dígitos SMS
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full py-2 px-3 rounded-lg border border-blue-300 text-center font-mono text-base font-bold tracking-widest text-[#123663] bg-white"
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full py-2.5 bg-[#123663] text-white font-bold rounded-lg text-xs shadow-sm cursor-pointer disabled:opacity-50 mt-1"
                  >
                    Confirmar e ingresar
                  </button>
                </div>
              )}
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← Volver al acceso principal
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Pie de página institucional discreto */}
      <div className="mt-4 text-center text-[11px] text-slate-500 font-medium space-y-1">
        <div>SIGAE · U.E. Luis Espinal Tarde de Collpani · Código SIE: 80730142</div>
        {onGoToHome && (
          <div>
            <button
              type="button"
              onClick={onGoToHome}
              className="text-xs text-slate-500 hover:text-[#123663] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Volver a la portada principal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
