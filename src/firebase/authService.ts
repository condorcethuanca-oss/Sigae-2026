import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  SigaeUser,
  SigaeRole,
  TeacherRecord,
  AUTHORIZED_ADMIN_UID,
  AUTHORIZED_SUPERADMIN_UID,
  AUTHORIZED_DIRECTOR_UID,
  AUTHORIZED_DIRECTOR_UIDS,
  AUTHORIZED_DIRECTOR_EMAILS,
  INITIAL_BOLIVIA_TEACHERS,
} from '../types';
import { auth, db } from './config';

/**
 * Strips out any keys with undefined values recursively to prevent Firestore crashes:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = sanitizeFirestoreData(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Normalizes strings by lowercasing, stripping diacritics/accents, and collapsing repeated whitespace.
 */
export function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pre-configured official demo accounts for the Bolivian user types:
export const DEMO_ACCOUNTS: Record<string, SigaeUser> = {
  director: {
    uid: AUTHORIZED_DIRECTOR_UID,
    email: 'condorcethuanca@gmail.com',
    displayName: 'Director Institucional Emanuel Cóndorcet Huanca',
    role: 'director',
    ci: '80730142 LP',
    phone: '+591 71542389',
    active: true,
    emailVerified: true,
    schoolSie: '80730142',
    createdAt: '2026-02-01T08:00:00Z',
  },
  profesor: {
    uid: 'sigae-usr-profesor-01',
    email: 'carlos.mamani@franztamayo.edu.bo',
    displayName: 'Prof. Carlos Mamani Quispe',
    role: 'profesor',
    ci: '6192841 LP',
    phone: '+591 73291048',
    active: true,
    emailVerified: true,
    schoolSie: '80730142',
    createdAt: new Date().toISOString(),
  },
  padre: {
    uid: 'sigae-usr-padre-01',
    email: 'padre.gonzalez@familia.bo',
    displayName: 'Don Roberto González Paredes',
    role: 'padre',
    ci: '3948102 LP',
    phone: '+591 72098415',
    active: true,
    emailVerified: true,
    schoolSie: '80730142',
    createdAt: new Date().toISOString(),
  },
  alumno: {
    uid: 'sigae-usr-alumno-01',
    email: 'santiago.gonzalez@estudiante.bo',
    displayName: 'Santiago González Paredes',
    role: 'alumno',
    ci: '8491024 LP',
    phone: '+591 78912345',
    active: true,
    emailVerified: true,
    schoolSie: '80730142',
    createdAt: new Date().toISOString(),
  },
};

// Store phone confirmation result for SMS sessions
let globalPhoneConfirmationResult: ConfirmationResult | null = null;
let globalRecaptchaVerifier: RecaptchaVerifier | null = null;

export function getAuthErrorMessage(error: any): string {
  if (!error) return 'Error desconocido de autenticación';
  const code = error.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Contraseña incorrecta o correo no válido. Verifica tus datos de acceso.';
    case 'auth/user-not-found':
      return 'No existe ningún usuario registrado con este correo electrónico en SIGAE.';
    case 'auth/email-already-in-use':
      return 'Este correo electrónico ya está registrado en Firebase. Puedes iniciar sesión o recuperar tu contraseña.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico ingresado no es válido.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Por seguridad, el acceso se ha bloqueado temporalmente. Intenta más tarde.';
    case 'auth/network-request-failed':
      return 'Problema de conexión con los servidores de Firebase. Verifica tu conexión a internet.';
    case 'auth/user-disabled':
      return 'Esta cuenta institucional ha sido deshabilitada por la Dirección.';
    case 'auth/invalid-verification-code':
      return 'El código de verificación SMS ingresado es incorrecto.';
    case 'auth/code-expired':
      return 'El código de verificación ha expirado. Por favor solicita uno nuevo.';
    case 'auth/invalid-phone-number':
      return 'El número de teléfono ingresado no tiene un formato válido internacional (ej: +591 71234567).';
    case 'auth/quota-exceeded':
      return 'Se ha excedido el límite de SMS permitidos por Firebase. Intenta con correo electrónico.';
    case 'auth/invalid-action-code':
      return 'El enlace o código de recuperación no es válido, ha caducado o ya fue utilizado anteriormente.';
    case 'auth/expired-action-code':
      return 'El enlace o código de recuperación ha caducado. Por favor solicita un nuevo correo de restablecimiento.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente de inicio de sesión con Google. Por favor habilita los popups en este sitio.';
    case 'auth/popup-closed-by-user':
      return 'La ventana de inicio de sesión con Google fue cerrada antes de completar el acceso.';
    case 'auth/unauthorized-domain':
      return 'El dominio actual no está habilitado para autenticación en la consola de Firebase.';
    case 'auth/missing-email':
      return 'Por favor ingresa un correo electrónico válido.';
    default:
      return error.message || 'Error al autenticar con Firebase.';
  }
}

// Internal guard to prevent onAuthStateChanged from prematurely signing out a user during registration persistence
let activeRegistrationUid: string | null = null;
let isRegistrationInProgress = false;

export const authService = {
  // Look up an authorized teacher record by email in /teachers
  async findAuthorizedTeacherByEmail(email: string): Promise<TeacherRecord | null> {
    const cleanEmail = email.toLowerCase().trim();
    try {
      const q = query(collection(db, 'teachers'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data() as TeacherRecord;
        return { ...docData, id: snap.docs[0].id };
      }
    } catch (err) {
      console.warn('[SIGAE Auth] Aviso al consultar /teachers:', err);
    }
    // Verificación de respaldo en nómina institucional sugerida
    const fallback = INITIAL_BOLIVIA_TEACHERS.find(t => t.email.toLowerCase().trim() === cleanEmail);
    if (fallback) return fallback;
    return null;
  },

  // Securely link a verified Firebase Auth user to their institutional /teachers record
  async linkTeacherToAuthUser(fbUser: FirebaseUser, teacher: TeacherRecord): Promise<SigaeUser> {
    if (!fbUser || !fbUser.uid) {
      throw new Error('Sesión de Firebase Authentication no válida.');
    }

    const cleanTeacherEmail = teacher.email.toLowerCase().trim();
    const cleanAuthEmail = (fbUser.email || '').toLowerCase().trim();

    // 1. Strict validation: email must match
    if (!cleanAuthEmail || cleanAuthEmail !== cleanTeacherEmail) {
      throw new Error(
        `El correo autenticado (${cleanAuthEmail}) no coincide con el correo registrado en el expediente docente (${cleanTeacherEmail}).`
      );
    }

    // 2. Teacher status cannot be inactivo or retirado
    if (teacher.status === 'inactivo' || teacher.status === 'retirado') {
      throw new Error('No es posible vincular ni activar una cuenta cuyo expediente docente se encuentra inactivo o retirado.');
    }

    // 3. Strict validation: teacher cannot already be linked to a different authUid
    if (teacher.authUid && teacher.authUid !== fbUser.uid) {
      throw new Error('Este expediente docente ya se encuentra vinculado a otra cuenta de Firebase Authentication. No se permite la suplantación ni sobrescritura.');
    }

    const now = new Date().toISOString();

    // 5. Update institutional document in /teachers/{teacher.id}
    if (teacher.id) {
      try {
        await updateDoc(doc(db, 'teachers', teacher.id), sanitizeFirestoreData({
          authUid: fbUser.uid,
          uid: fbUser.uid,
          linkedAt: now,
          linkedEmail: cleanAuthEmail,
          updatedAt: now,
        }));
      } catch (tErr) {
        console.warn('[SIGAE Auth] Aviso actualizando /teachers:', tErr);
      }
    }

    // 6. Create or update profile in /users/{fbUser.uid} (REAL Auth UID!)
    const userProfile: SigaeUser = {
      uid: fbUser.uid,
      email: cleanAuthEmail,
      displayName: teacher.fullName || fbUser.displayName || 'Profesor(a)',
      role: 'profesor',
      ...(teacher.id ? { teacherId: teacher.id } : {}),
      ci: teacher.ci || '',
      phone: teacher.phone || '',
      schoolSie: '80730142',
      active: true,
      emailVerified: true,
      createdAt: teacher.createdAt || now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', fbUser.uid), sanitizeFirestoreData(userProfile), { merge: true });
    return userProfile;
  },

  // Listen to Firebase Auth state
  onAuthChange(callback: (user: SigaeUser | null) => void) {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        callback(null);
        return;
      }

      // If registration is currently in flight, let registerUser finish its writes without onAuthChange interfering
      if (isRegistrationInProgress || (activeRegistrationUid && fbUser.uid === activeRegistrationUid)) {
        return;
      }

      try {
        const cleanEmail = (fbUser.email || '').toLowerCase().trim();
        const userDocRef = doc(db, 'users', fbUser.uid);

        // 1. Authorized Institutional Director or SuperAdmin
        const isAuthorizedDirectorAccount =
          AUTHORIZED_DIRECTOR_UIDS.includes(fbUser.uid) ||
          fbUser.uid === AUTHORIZED_SUPERADMIN_UID ||
          AUTHORIZED_DIRECTOR_EMAILS.includes(cleanEmail);

        let userDoc: any = null;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (fetchErr: any) {
          console.warn('[SIGAE Auth] Advertencia: No se pudo verificar el perfil institucional en Firestore:', fetchErr?.message || fetchErr);
          // Zero-Trust: NO generar perfiles administrativos provisionales sin conexión
          console.warn('[SIGAE Auth] Estado: Sin conexión o permisos no verificados con el servidor.');
          callback(null);
          return;
        }

        if (isAuthorizedDirectorAccount) {
          const designatedRole: SigaeRole = 'director';
          if (userDoc && userDoc.exists()) {
            const data = userDoc.data() as SigaeUser;
            callback({ ...data, role: designatedRole, emailVerified: true });
            return;
          }
          const directorProfile: SigaeUser = {
            uid: fbUser.uid,
            email: cleanEmail,
            displayName: fbUser.displayName || (cleanEmail === 'gamacondorilopez74@gmail.com' ? 'Directora Institucional' : 'Director Institucional'),
            role: designatedRole,
            active: true,
            emailVerified: true,
            schoolSie: '80730142',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, sanitizeFirestoreData(directorProfile)).catch(() => {});
          callback(directorProfile);
          return;
        }

        // 2. Existing profile in Firestore
        if (userDoc && userDoc.exists()) {
          const data = userDoc.data() as SigaeUser;
          const isVerified = fbUser.emailVerified || data.emailVerified || false;

          // Prohibit unauthorized director escalation
          if (
            data.role === 'director' &&
            !AUTHORIZED_DIRECTOR_UIDS.includes(fbUser.uid) &&
            !AUTHORIZED_DIRECTOR_EMAILS.includes(cleanEmail)
          ) {
            console.warn('[SIGAE Auth] Acceso revocado: UID no autorizado para rol de Director.');
            await signOut(auth);
            callback(null);
            return;
          }

          // If role is profesor, check status
          if (data.role === 'profesor') {
            // Check if pending
            if (data.approvalStatus === 'pendiente' || data.active === false) {
              callback({
                ...data,
                emailVerified: isVerified,
                active: false,
                approvalStatus: 'pendiente',
              });
              return;
            }

            // Check if rejected
            if (data.approvalStatus === 'rechazada') {
              callback({
                ...data,
                emailVerified: isVerified,
                active: false,
                approvalStatus: 'rechazada',
              });
              return;
            }

            // Check if deactivated
            if ((data as any).status === 'inactivo' || (data as any).status === 'retirado') {
              await signOut(auth);
              callback(null);
              return;
            }

            // Approved teacher: attempt background sync with /teachers if unlinked
            if (isVerified) {
              const teacher = await authService.findAuthorizedTeacherByEmail(cleanEmail);
              if (teacher && !teacher.authUid) {
                await authService.linkTeacherToAuthUser(fbUser, teacher).catch((err) => {
                  console.warn('[SIGAE Auth] Aviso al sincronizar vinculación:', err);
                });
              }
            }
          }

          // General check for deactivated non-teacher accounts
          if (data.role !== 'profesor' && data.active === false) {
            console.warn('[SIGAE Auth] Cuenta desactivada en /users. Cerrando sesión...');
            await signOut(auth);
            callback(null);
            return;
          }

          const updatedUser: SigaeUser = {
            ...data,
            emailVerified: isVerified,
          };
          callback(updatedUser);
        } else {
          // If first login and no Firestore profile under /users/{fbUser.uid}
          // 1. Check if there is a recorded access request in /access_requests/req-${fbUser.uid} or by email
          try {
            let reqData: any = null;
            const reqDoc = await getDoc(doc(db, 'access_requests', `req-${fbUser.uid}`));
            if (reqDoc.exists()) {
              reqData = reqDoc.data();
            } else {
              const reqQ = query(collection(db, 'access_requests'), where('email', '==', cleanEmail));
              const reqSnap = await getDocs(reqQ);
              if (!reqSnap.empty) {
                reqData = reqSnap.docs[0].data();
              }
            }

            if (reqData) {
              const isTeacher = reqData.requestedRole === 'profesor';
              const restoredProfile: SigaeUser = {
                uid: fbUser.uid,
                email: cleanEmail,
                displayName: reqData.displayName || fbUser.displayName || 'Usuario SIGAE',
                role: reqData.requestedRole || (isTeacher ? 'profesor' : 'padre'),
                active: isTeacher ? (reqData.status === 'aprobada') : true,
                approvalStatus: reqData.status || (isTeacher ? 'pendiente' : 'aprobada'),
                ci: reqData.ci || '',
                phone: reqData.phone || '',
                schoolSie: '80730142',
                createdAt: reqData.createdAt || new Date().toISOString(),
                emailVerified: fbUser.emailVerified,
                ...(reqData.matchedTeacherId ? { teacherId: reqData.matchedTeacherId } : {}),
                ...(reqData.specialty ? { specialty: reqData.specialty } : {}),
                ...(reqData.studentRude ? {
                  studentLinking: {
                    studentName: reqData.studentName || 'Estudiante Tutelado',
                    studentRude: reqData.studentRude,
                    studentCi: reqData.studentCi || '',
                    grade: reqData.grade || '',
                    relationship: reqData.relationship || 'Tutor Legal',
                    status: reqData.status === 'aprobada' ? 'aprobada' : 'pendiente_validacion',
                  }
                } : {}),
              };
              await setDoc(userDocRef, sanitizeFirestoreData(restoredProfile));
              callback(restoredProfile);
              return;
            }
          } catch (rErr) {
            console.warn('[SIGAE Auth] Aviso restaurando solicitud:', rErr);
          }

          // 2. Check if this email corresponds to an authorized teacher in /teachers
          const authorizedTeacher = await authService.findAuthorizedTeacherByEmail(cleanEmail);
          if (authorizedTeacher) {
            if (authorizedTeacher.status === 'retirado' || authorizedTeacher.status === 'inactivo') {
              await signOut(auth);
              callback(null);
              return;
            }

            if (authorizedTeacher.authUid && authorizedTeacher.authUid !== fbUser.uid) {
              console.warn('[SIGAE Auth] Conflicto: Expediente ya vinculado a otra cuenta.');
              await signOut(auth);
              callback(null);
              return;
            }

            if (fbUser.emailVerified) {
              const linkedUser = await authService.linkTeacherToAuthUser(fbUser, authorizedTeacher);
              callback(linkedUser);
              return;
            }

            const provisionalProfile: SigaeUser = {
              uid: fbUser.uid,
              email: cleanEmail,
              displayName: authorizedTeacher.fullName || fbUser.displayName || 'Profesor(a)',
              role: 'profesor',
              teacherId: authorizedTeacher.id,
              ci: authorizedTeacher.ci,
              phone: authorizedTeacher.phone,
              active: false,
              approvalStatus: 'pendiente',
              emailVerified: false,
              schoolSie: '80730142',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, sanitizeFirestoreData(provisionalProfile));
            callback(provisionalProfile);
            return;
          }

          // Non-authorized account: DO NOT auto-create account on login attempt!
          console.warn('[SIGAE Auth] Cuenta sin registro institucional activo:', cleanEmail);
          await signOut(auth);
          callback(null);
        }
      } catch (err) {
        console.error('[SIGAE Auth] Error fetching user profile from Firestore:', err);
        callback(null);
      }
    });
  },

  // Current Firebase Auth user accessor
  getCurrentFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  // Reload current user state to check if email was verified
  async reloadCurrentUser(): Promise<boolean> {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const userData = snap.data() as SigaeUser;
            // If it's a teacher, activate them in both /users and /teachers!
            if (userData.role === 'profesor') {
              const teacher = await this.findAuthorizedTeacherByEmail(userData.email);
              if (teacher) {
                await this.linkTeacherToAuthUser(auth.currentUser, teacher);
              }
            }
            await updateDoc(userDocRef, { emailVerified: true, active: true });
          }
        } catch (e) {
          console.warn('[SIGAE Auth] Error updating verified status in doc:', e);
        }
      }
      return auth.currentUser.emailVerified;
    }
    return false;
  },

  // Resend email verification
  async resendVerificationEmail(): Promise<void> {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    } else {
      throw new Error('No hay una sesión activa para reenviar el correo de verificación.');
    }
  },

  // Sign in with email and password via Firebase Auth
  async loginWithEmail(email: string, pass: string): Promise<SigaeUser> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      // Autenticación legítima en Firebase Authentication
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const targetUid = cred.user.uid;
      const userDocRef = doc(db, 'users', targetUid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as SigaeUser;

        // Si es el UID del director o su correo institucional oficial, asegurar rol 'director'
        if (
          AUTHORIZED_DIRECTOR_UIDS.includes(targetUid) ||
          AUTHORIZED_DIRECTOR_EMAILS.includes(cleanEmail)
        ) {
          userData.role = 'director';
          userData.active = true;
        }

        // Si es profesor, verificar estado de autorización
        if (userData.role === 'profesor') {
          if (userData.approvalStatus === 'pendiente' || userData.active === false) {
            await signOut(auth);
            const err = new Error(
              'PENDING_TEACHER_APPROVAL: Tu solicitud de acceso como profesor se encuentra en revisión. La Dirección debe autorizar tu cuenta antes de que puedas ingresar.'
            ) as any;
            err.code = 'auth/teacher-pending-approval';
            err.teacherName = userData.displayName;
            err.teacherEmail = userData.email;
            throw err;
          }

          if (userData.approvalStatus === 'rechazada') {
            await signOut(auth);
            const err = new Error(
              'Tu solicitud de registro como profesor fue rechazada por la Dirección Institucional.'
            ) as any;
            err.code = 'auth/teacher-rejected';
            err.teacherName = userData.displayName;
            err.teacherEmail = userData.email;
            throw err;
          }

          // Docente activo y aprobado: verificar expediente en /teachers
          const teacher = await this.findAuthorizedTeacherByEmail(cleanEmail);
          if (teacher) {
            if (teacher.status === 'inactivo' || teacher.status === 'retirado') {
              await signOut(auth);
              throw new Error('Esta cuenta institucional se encuentra inactiva o retirada por la Dirección.');
            }
            if (teacher.authUid && teacher.authUid !== targetUid) {
              await signOut(auth);
              throw new Error('Este expediente docente ya se encuentra vinculado a otra cuenta institucional.');
            }
            if (cred.user.emailVerified && !teacher.authUid) {
              await this.linkTeacherToAuthUser(cred.user, teacher).catch((e) => {
                console.warn('[SIGAE Auth] Aviso al vincular docente aprobado:', e);
              });
            }
          }
        }

        // Verificar desactivación de cuentas generales no docentes
        if (userData.role !== 'profesor' && userData.active === false) {
          await signOut(auth);
          throw new Error('Esta cuenta institucional ha sido desactivada por la Dirección de la Unidad Educativa.');
        }

        return {
          ...userData,
          emailVerified: cred.user.emailVerified || userData.emailVerified || false,
        };
      }

      // Si el documento en /users/{targetUid} no existe aún:
      // 1. Director institucional o Superadministrador
      if (
        AUTHORIZED_DIRECTOR_UIDS.includes(targetUid) ||
        AUTHORIZED_DIRECTOR_EMAILS.includes(cleanEmail)
      ) {
        const designatedRole: SigaeRole = 'director';
        const defaultName = cleanEmail === 'gamacondorilopez74@gmail.com'
          ? 'Directora Profa. Gama Condori Lopez'
          : cleanEmail === 'condorcethuanca@gmail.com'
          ? 'Director Institucional Emanuel Cóndorcet Huanca'
          : 'Director Institucional';
        const directorProfile: SigaeUser = {
          uid: targetUid,
          email: cleanEmail,
          displayName: cred.user.displayName || defaultName,
          role: designatedRole,
          active: true,
          emailVerified: cred.user.emailVerified,
          schoolSie: '80730142',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, sanitizeFirestoreData(directorProfile));
        return directorProfile;
      }

      // 2. Recuperar si existe solicitud previa en /access_requests/req-${targetUid} o por UID/correo
      try {
        let reqData: any = null;
        const reqDoc = await getDoc(doc(db, 'access_requests', `req-${targetUid}`));
        if (reqDoc.exists()) {
          reqData = reqDoc.data();
        } else {
          try {
            const reqQ = query(collection(db, 'access_requests'), where('uid', '==', targetUid));
            const reqSnap = await getDocs(reqQ);
            if (!reqSnap.empty) {
              reqData = reqSnap.docs[0].data();
            }
          } catch {
            // fallback
          }
          if (!reqData) {
            try {
              const reqQ2 = query(collection(db, 'access_requests'), where('email', '==', cleanEmail));
              const reqSnap2 = await getDocs(reqQ2);
              if (!reqSnap2.empty) {
                reqData = reqSnap2.docs[0].data();
              }
            } catch {
              // fallback
            }
          }
        }

        if (reqData) {
          const isTeacher = reqData.requestedRole === 'profesor';
          const isApproved = reqData.status === 'aprobada';
          const restoredProfile: SigaeUser = {
            uid: targetUid,
            email: cleanEmail,
            displayName: reqData.displayName || cred.user.displayName || 'Usuario SIGAE',
            role: reqData.requestedRole || (isTeacher ? 'profesor' : 'padre'),
            active: isTeacher ? isApproved : true,
            approvalStatus: reqData.status || (isTeacher ? 'pendiente' : 'aprobada'),
            ci: reqData.ci || '',
            phone: reqData.phone || '',
            schoolSie: '80730142',
            createdAt: reqData.createdAt || new Date().toISOString(),
            emailVerified: cred.user.emailVerified,
            ...(reqData.matchedTeacherId ? { teacherId: reqData.matchedTeacherId } : {}),
            ...(reqData.specialty ? { specialty: reqData.specialty } : {}),
            ...(reqData.studentRude ? {
              studentLinking: {
                studentName: reqData.studentName || 'Estudiante Tutelado',
                studentRude: reqData.studentRude,
                studentCi: reqData.studentCi || '',
                grade: reqData.grade || '',
                relationship: reqData.relationship || 'Tutor Legal',
                status: isApproved ? 'aprobada' : 'pendiente_validacion',
              }
            } : {}),
          };
          await setDoc(userDocRef, sanitizeFirestoreData(restoredProfile));

          if (restoredProfile.role === 'profesor' && !restoredProfile.active) {
            await signOut(auth);
            const err = new Error(
              'PENDING_TEACHER_APPROVAL: Tu solicitud de acceso como profesor se encuentra en revisión. La Dirección debe autorizar tu cuenta antes de que puedas ingresar.'
            ) as any;
            err.code = 'auth/teacher-pending-approval';
            err.teacherName = restoredProfile.displayName;
            err.teacherEmail = restoredProfile.email;
            throw err;
          }
          return restoredProfile;
        }
      } catch (restErr: any) {
        if (restErr.code === 'auth/teacher-pending-approval') throw restErr;
        console.warn('[SIGAE Auth] Aviso al restaurar perfil desde solicitud:', restErr);
      }

      // 3. Verificar si corresponde a un profesor del padrón /teachers
      const authorizedTeacher = await this.findAuthorizedTeacherByEmail(cleanEmail);
      if (authorizedTeacher) {
        if (authorizedTeacher.status === 'retirado' || authorizedTeacher.status === 'inactivo') {
          await signOut(auth);
          throw new Error('Esta cuenta docente se encuentra inactiva o retirada por Dirección.');
        }
        if (authorizedTeacher.authUid && authorizedTeacher.authUid !== cred.user.uid) {
          await signOut(auth);
          throw new Error('Este expediente docente ya se encuentra vinculado a otra cuenta de Firebase.');
        }
        if (authorizedTeacher.status === 'activo') {
          return await this.linkTeacherToAuthUser(cred.user, authorizedTeacher);
        }
        const provisionalProfile: SigaeUser = {
          uid: cred.user.uid,
          email: cleanEmail,
          displayName: authorizedTeacher.fullName || cred.user.displayName || 'Profesor(a)',
          role: 'profesor',
          teacherId: authorizedTeacher.id,
          ci: authorizedTeacher.ci,
          phone: authorizedTeacher.phone,
          active: false,
          approvalStatus: 'pendiente',
          emailVerified: false,
          schoolSie: '80730142',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, sanitizeFirestoreData(provisionalProfile));
        await signOut(auth);
        const err = new Error('PENDING_TEACHER_APPROVAL: Tu solicitud de acceso como profesor se encuentra en revisión. La Dirección debe autorizar tu cuenta antes de que puedas ingresar.') as any;
        err.code = 'auth/teacher-pending-approval';
        err.teacherName = provisionalProfile.displayName;
        err.teacherEmail = provisionalProfile.email;
        throw err;
      }

      // 4. Si la cuenta existe en Firebase Auth y no es docente ni director, inicializar perfil familiar
      const fallbackParentProfile: SigaeUser = {
        uid: targetUid,
        email: cleanEmail,
        displayName: cred.user.displayName || 'Padre de Familia / Tutor',
        role: 'padre',
        active: true,
        approvalStatus: 'aprobada',
        hasApprovedChildLink: false,
        emailVerified: cred.user.emailVerified,
        schoolSie: '80730142',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, sanitizeFirestoreData(fallbackParentProfile));
      return fallbackParentProfile;
    } catch (error: any) {
      if (error.code === 'auth/teacher-pending-approval' || error.code === 'auth/teacher-rejected') {
        throw error;
      }
      console.warn('[SIGAE Auth] Login notice:', error.code, error.message);
      const friendlyMsg = getAuthErrorMessage(error);
      const err = new Error(friendlyMsg) as any;
      err.code = error.code;
      throw err;
    }
  },

  // Register new user in Firebase Auth with strict role verification
  async registerUser(params: {
    email: string;
    pass: string;
    displayName: string;
    role: SigaeRole;
    ci?: string;
    phone?: string;
    specialty?: string;
    schoolSie?: string;
    studentLinking?: {
      studentName: string;
      studentRude: string;
      studentCi?: string;
      grade?: string;
      relationship?: string;
      invitationCode?: string;
      status?: 'pendiente_validacion' | 'aprobada' | 'rechazada' | 'validada';
    };
  }): Promise<{ user: SigaeUser; verificationSent: boolean }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.displayName.trim();
    const cleanCi = (params.ci || '').trim();
    const cleanPhone = (params.phone || '').trim();

    // 1. Direct protection against self-escalation to Director
    if (params.role === 'director') {
      throw new Error('El rol de Dirección no está disponible para autorregistro libre.');
    }

    // 2. Validate teacher against institutional roster
    let matchedTeacher: TeacherRecord | null = null;
    let officialName = cleanName;

    if (params.role === 'profesor') {
      const cleanCiDigits = cleanCi.replace(/[^0-9]/g, '');
      const normInputName = normalizeText(cleanName);

      // Check against initial official teachers list
      for (const t of INITIAL_BOLIVIA_TEACHERS) {
        const tDigits = (t.ci || '').replace(/[^0-9]/g, '');
        const tNormName = normalizeText(t.fullName);
        const emailMatch = t.email.toLowerCase().trim() === cleanEmail;
        const ciMatch = cleanCiDigits && tDigits === cleanCiDigits;

        if (emailMatch || ciMatch) {
          const nameMatches =
            tNormName === normInputName ||
            tNormName.includes(normInputName) ||
            normInputName.includes(tNormName);
          if (nameMatches || emailMatch) {
            matchedTeacher = t;
            officialName = t.fullName;
            break;
          }
        }
      }
    }

    // 3. Create account via Firebase Auth
    isRegistrationInProgress = true;
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.pass);
      activeRegistrationUid = cred.user.uid;
    } catch (authErr: any) {
      isRegistrationInProgress = false;
      if (authErr.code === 'auth/email-already-in-use') {
        const friendlyMsg = 'Este correo electrónico ya se encuentra registrado en SIGAE. Si ya enviaste tu solicitud, se encuentra pendiente de autorización por la Dirección. Si olvidaste tu contraseña, utiliza la opción de recuperación.';
        const err = new Error(friendlyMsg) as any;
        err.code = 'auth/email-already-in-use';
        throw err;
      }
      throw authErr;
    }

    try {
      try {
        await updateProfile(cred.user, { displayName: officialName });
      } catch (pErr) {
        console.warn('[SIGAE Auth] Aviso al actualizar perfil Auth:', pErr);
      }

      // 4. Send email verification
      let verificationSent = false;
      try {
        await sendEmailVerification(cred.user);
        verificationSent = true;
        console.log('[SIGAE Auth] Correo de verificación enviado exitosamente a:', cleanEmail);
      } catch (vErr) {
        console.warn('[SIGAE Auth] Aviso al enviar verificación de correo:', vErr);
      }

      // 5. Create basic profile in Firestore /users/{uid}
      const isTeacher = params.role === 'profesor';
      const now = new Date().toISOString();

      const newProfile: SigaeUser = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: officialName,
        role: params.role,
        ci: matchedTeacher?.ci || cleanCi,
        phone: matchedTeacher?.phone || cleanPhone,
        active: isTeacher ? false : true, // Teachers must be approved by Director before activation
        approvalStatus: isTeacher ? 'pendiente' : 'aprobada',
        hasApprovedChildLink: false,
        emailVerified: cred.user.emailVerified,
        schoolSie: params.schoolSie || '80730142',
        createdAt: now,
        updatedAt: now,
        ...(matchedTeacher?.id ? { teacherId: matchedTeacher.id } : {}),
        ...(params.specialty ? { specialty: params.specialty } : {}),
        ...(params.studentLinking ? {
          studentLinking: {
            studentName: params.studentLinking.studentName.trim(),
            studentRude: params.studentLinking.studentRude.trim(),
            studentCi: (params.studentLinking.studentCi || '').trim(),
            grade: (params.studentLinking.grade || '').trim(),
            relationship: params.studentLinking.relationship || 'Tutor Legal',
            status: params.studentLinking.status || 'pendiente_validacion',
          }
        } : {}),
      };

      const userDocRef = doc(db, 'users', cred.user.uid);
      try {
        await setDoc(userDocRef, sanitizeFirestoreData(newProfile));
      } catch (docErr: any) {
        console.error('[SIGAE Auth] Error guardando perfil en /users:', docErr);
        const friendlyErr = new Error(`No se pudo guardar el perfil institucional: ${docErr.message}`) as any;
        friendlyErr.code = docErr.code;
        throw friendlyErr;
      }

      // 6. Record persistent access request in /access_requests
      const reqId = `req-${cred.user.uid}`;
      const accessReqData = {
        id: reqId,
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: officialName,
        requestedRole: params.role,
        ci: cleanCi,
        phone: cleanPhone,
        specialty: params.specialty || matchedTeacher?.specialty || '',
        status: (params.studentLinking && params.studentLinking.status === 'validada') ? 'aprobada' : 'pendiente',
        createdAt: now,
        ...(matchedTeacher?.id ? { matchedTeacherId: matchedTeacher.id } : {}),
        ...(params.studentLinking ? {
          studentName: params.studentLinking.studentName.trim(),
          studentRude: params.studentLinking.studentRude.trim(),
          studentCi: (params.studentLinking.studentCi || '').trim(),
          grade: (params.studentLinking.grade || '').trim(),
          relationship: params.studentLinking.relationship || 'Tutor Legal',
        } : {}),
      };

      try {
        await setDoc(doc(db, 'access_requests', reqId), sanitizeFirestoreData(accessReqData));
      } catch (reqErr: any) {
        console.error('[SIGAE Auth] Error registrando solicitud en /access_requests:', reqErr);
        const friendlyErr = new Error(`No se pudo registrar la solicitud institucional: ${reqErr.message}`) as any;
        friendlyErr.code = reqErr.code;
        throw friendlyErr;
      }

      // 7. Si es padre, guardar expediente en /parents y solicitud en /parentStudentLinkRequests
      if (params.role === 'padre') {
        try {
          const parentDoc = {
            id: cred.user.uid,
            uid: cred.user.uid,
            displayName: officialName,
            email: cleanEmail,
            ci: cleanCi,
            phone: cleanPhone,
            status: 'activo',
            schoolSie: params.schoolSie || '80730142',
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(doc(db, 'parents', cred.user.uid), sanitizeFirestoreData(parentDoc));

          if (params.studentLinking) {
            const isApproved = params.studentLinking.status === 'validada';
            const linkReqId = `link-req-${cred.user.uid}`;
            const linkReqData = {
              id: linkReqId,
              parentUid: cred.user.uid,
              parentName: officialName,
              parentEmail: cleanEmail,
              parentCi: cleanCi,
              parentPhone: cleanPhone,
              studentName: params.studentLinking.studentName.trim(),
              studentRude: params.studentLinking.studentRude.trim(),
              studentCi: (params.studentLinking.studentCi || '').trim(),
              grade: (params.studentLinking.grade || '').trim(),
              relationship: params.studentLinking.relationship || 'Tutor Legal',
              method: params.studentLinking.invitationCode ? 'codigo_seguro' : 'aprobacion_directora',
              status: isApproved ? 'aprobada' : 'pendiente',
              createdAt: now,
            };
            await setDoc(doc(db, 'parentStudentLinkRequests', linkReqId), sanitizeFirestoreData(linkReqData));
          }
        } catch (parErr) {
          console.warn('[SIGAE Auth] Aviso guardando colecciones de padre:', parErr);
        }
      }

      // Cerrar la sesión temporal para que el usuario inicie sesión de forma controlada
      await signOut(auth);

      return { user: newProfile, verificationSent };
    } finally {
      isRegistrationInProgress = false;
      activeRegistrationUid = null;
    }
  },

  // Send Password Reset Email via Firebase Auth (Only for accounts that already exist in Auth!)
  async resetPassword(email: string): Promise<void> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        const err = new Error('Por favor ingresa tu correo electrónico.') as any;
        err.code = 'auth/missing-email';
        throw err;
      }
      auth.languageCode = 'es';
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (error: any) {
      console.warn('[SIGAE Auth] Password reset notice:', error.code, error.message);
      const friendlyMsg = getAuthErrorMessage(error);
      const err = new Error(friendlyMsg) as any;
      err.code = error.code;
      throw err;
    }
  },

  // Verify a password reset code (oobCode) received in an action link
  async verifyResetCode(code: string): Promise<string> {
    try {
      auth.languageCode = 'es';
      const cleanCode = code.trim();
      const userEmail = await verifyPasswordResetCode(auth, cleanCode);
      return userEmail;
    } catch (error: any) {
      console.warn('[SIGAE Auth] Verify reset code notice:', error.code, error.message);
      const friendlyMsg = getAuthErrorMessage(error);
      const err = new Error(friendlyMsg) as any;
      err.code = error.code;
      throw err;
    }
  },

  // Confirm password reset with the verified code
  async confirmNewPassword(code: string, newPass: string): Promise<void> {
    try {
      if (!newPass || newPass.length < 6) {
        const err = new Error('La nueva contraseña debe tener al menos 6 caracteres.') as any;
        err.code = 'auth/weak-password';
        throw err;
      }
      auth.languageCode = 'es';
      const cleanCode = code.trim();
      await confirmPasswordReset(auth, cleanCode, newPass);
    } catch (error: any) {
      console.warn('[SIGAE Auth] Confirm new password notice:', error.code, error.message);
      const friendlyMsg = getAuthErrorMessage(error);
      const err = new Error(friendlyMsg) as any;
      err.code = error.code;
      throw err;
    }
  },

  // Sign In / Register with Google Provider (verifying teacher record link)
  async loginWithGoogle(): Promise<{ user: SigaeUser; isNewUser: boolean }> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const cleanEmail = (fbUser.email || '').toLowerCase().trim();

      const userDocRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const existingData = userDoc.data() as SigaeUser;
        if (existingData.active === false) {
          await signOut(auth);
          throw new Error('Esta cuenta institucional ha sido desactivada por la Dirección.');
        }

        // Ensure director role is respected
        if (
          AUTHORIZED_DIRECTOR_UIDS.includes(fbUser.uid) ||
          AUTHORIZED_DIRECTOR_EMAILS.includes(cleanEmail)
        ) {
          existingData.role = 'director';
          existingData.active = true;
        }

        // Ensure teacher link is up to date
        if (existingData.role === 'profesor') {
          const teacher = await this.findAuthorizedTeacherByEmail(cleanEmail);
          if (teacher) {
            if (teacher.status === 'inactivo' || teacher.status === 'retirado') {
              await signOut(auth);
              throw new Error('Esta cuenta institucional se encuentra inactiva o retirada por la Dirección.');
            }
            if (teacher.authUid && teacher.authUid !== fbUser.uid) {
              await signOut(auth);
              throw new Error('Este expediente docente ya se encuentra vinculado a otra cuenta de Firebase.');
            }
            if (!teacher.authUid || teacher.status === 'pendiente_activacion') {
              await this.linkTeacherToAuthUser(fbUser, teacher);
            }
          } else {
            await signOut(auth);
            throw new Error('No se encontró un expediente docente institucional asociado a este correo.');
          }
        }

        return {
          user: {
            ...existingData,
            emailVerified: true, // Google accounts have pre-verified emails
          },
          isNewUser: false,
        };
      }

      // New Google User: Check institutional authorizations
      // 1. Institutional Director (ONLY for verified authorized UID or authorized director emails)
      if (
        AUTHORIZED_DIRECTOR_UIDS.includes(fbUser.uid) ||
        AUTHORIZED_DIRECTOR_EMAILS.includes(cleanEmail)
      ) {
        const designatedRole: SigaeRole = 'director';
        const defaultName = cleanEmail === 'gamacondorilopez74@gmail.com'
          ? 'Directora Profa. Gama Condori Lopez'
          : cleanEmail === 'condorcethuanca@gmail.com'
          ? 'Director Institucional Emanuel Cóndorcet Huanca'
          : 'Director Institucional';
        const directorProfile: SigaeUser = {
          uid: fbUser.uid,
          email: cleanEmail || 'gamacondorilopez74@gmail.com',
          displayName: fbUser.displayName || defaultName,
          role: designatedRole,
          active: true,
          emailVerified: true,
          schoolSie: '80730142',
          photoURL: fbUser.photoURL || undefined,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, directorProfile);
        return { user: directorProfile, isNewUser: true };
      }

      // If user typed director email with an unauthorized UID, deny elevation
      if (
        AUTHORIZED_DIRECTOR_EMAILS.includes(cleanEmail) &&
        !AUTHORIZED_DIRECTOR_UIDS.includes(fbUser.uid)
      ) {
        await signOut(auth);
        throw new Error(
          'Acceso denegado: Esta cuenta de Google no corresponde a la Dirección autorizada para la U.E. Luis Espinal Tarde.'
        );
      }

      // 2. Authorized Institutional Teacher: link automatically!
      const authorizedTeacher = await this.findAuthorizedTeacherByEmail(cleanEmail);
      if (authorizedTeacher) {
        if (authorizedTeacher.status === 'retirado' || authorizedTeacher.status === 'inactivo') {
          await signOut(auth);
          throw new Error('Tu registro docente institucional se encuentra inactivo o retirado por Dirección.');
        }
        if (authorizedTeacher.authUid && authorizedTeacher.authUid !== fbUser.uid) {
          await signOut(auth);
          throw new Error('Este expediente docente ya se encuentra vinculado a otra cuenta de Firebase Authentication.');
        }

        const linkedUser = await this.linkTeacherToAuthUser(fbUser, authorizedTeacher);
        return { user: linkedUser, isNewUser: false };
      }

      // 3. Regular student/parent user
      const studentProfile: SigaeUser = {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: fbUser.displayName || 'Usuario Google',
        role: 'alumno',
        active: true,
        emailVerified: true,
        schoolSie: '80730142',
        photoURL: fbUser.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };

      await setDoc(userDocRef, studentProfile);
      return { user: studentProfile, isNewUser: true };
    } catch (error: any) {
      console.warn('[SIGAE Auth] Google sign in notice:', error.code, error.message);
      if (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/popup-closed-by-user'
      ) {
        throw new Error('La ventana emergente de Google fue cerrada o bloqueada por el navegador.');
      }
      const friendlyMsg = getAuthErrorMessage(error);
      const err = new Error(friendlyMsg) as any;
      err.code = error.code;
      throw err;
    }
  },

  // Update profile details: strictly whitelisted presentation and contact fields
  async updateProfileData(uid: string, updates: Partial<SigaeUser>): Promise<void> {
    const userDocRef = doc(db, 'users', uid);
    // Strict whitelist: cannot self-modify role, active, schoolSie, uid, teacherId, email, or emailVerified
    const safeUpdates: Partial<SigaeUser> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.displayName !== undefined) safeUpdates.displayName = updates.displayName.trim();
    if (updates.phone !== undefined) safeUpdates.phone = updates.phone.trim();
    if (updates.photoURL !== undefined) safeUpdates.photoURL = updates.photoURL;
    if (updates.ci !== undefined) safeUpdates.ci = updates.ci.trim();
    if (updates.needsProfileCompletion !== undefined) safeUpdates.needsProfileCompletion = updates.needsProfileCompletion;

    await updateDoc(userDocRef, safeUpdates);
  },

  // Setup reCAPTCHA for Phone Authentication
  setupRecaptcha(containerId: string): RecaptchaVerifier {
    if (globalRecaptchaVerifier) {
      try {
        globalRecaptchaVerifier.clear();
      } catch (e) {
        // ignore
      }
    }
    globalRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('[SIGAE Auth] reCAPTCHA verificado exitosamente');
      },
      'expired-callback': () => {
        console.warn('[SIGAE Auth] reCAPTCHA expirado');
      },
    });
    return globalRecaptchaVerifier;
  },

  // Phone verification code sending
  async sendPhoneCode(phone: string, containerId = 'recaptcha-container'): Promise<{ verificationId: string; isRealSms: boolean }> {
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      const err = new Error('Por favor ingresa un número de teléfono válido.');
      (err as any).code = 'auth/invalid-phone-number';
      throw err;
    }

    try {
      // Attempt real Firebase Phone Auth if recaptcha element is mounted
      const element = document.getElementById(containerId);
      if (element) {
        const verifier = this.setupRecaptcha(containerId);
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+591${cleanPhone.replace(/\s+/g, '')}`;
        globalPhoneConfirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
        return {
          verificationId: globalPhoneConfirmationResult.verificationId,
          isRealSms: true,
        };
      }
    } catch (fbPhoneErr: any) {
      console.warn('[SIGAE Auth] Phone SMS direct fallback mode:', fbPhoneErr.code, fbPhoneErr.message);
      if (fbPhoneErr.code === 'auth/invalid-phone-number' || fbPhoneErr.code === 'auth/too-many-requests') {
        throw fbPhoneErr;
      }
      // If recaptcha is blocked in preview iframe or test numbers, enable smooth fallback
    }

    // Fallback simulation mode for testing environments
    return {
      verificationId: `sigae-phone-sess-${Date.now()}`,
      isRealSms: false,
    };
  },

  // Verify Phone Code (supports both real Firebase ConfirmationResult and fallback token)
  async verifyPhoneCode(params: {
    phone: string;
    code: string;
    fullName?: string;
    role?: SigaeRole;
  }): Promise<SigaeUser> {
    const cleanCode = params.code.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      const err = new Error('El código de verificación SMS debe tener exactamente 6 dígitos.');
      (err as any).code = 'auth/invalid-verification-code';
      throw err;
    }

    // 1. If we have a real Firebase Phone ConfirmationResult
    if (globalPhoneConfirmationResult) {
      try {
        const credential = await globalPhoneConfirmationResult.confirm(cleanCode);
        const fbUser = credential.user;

        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as SigaeUser;
          if (userData.active === false) {
            await signOut(auth);
            throw new Error('Esta cuenta institucional ha sido desactivada por la Dirección.');
          }
          return userData;
        }

        // Phone auth is restricted to families (padres) and students (alumnos)
        const role: SigaeRole = params.role === 'alumno' ? 'alumno' : 'padre';
        const newProfile: SigaeUser = {
          uid: fbUser.uid,
          email: `${params.phone.replace(/[^0-9]/g, '')}@telefono.sigae.bo`,
          displayName: params.fullName || `Usuario Móvil (${params.phone})`,
          phone: params.phone.trim(),
          role,
          active: true,
          emailVerified: true,
          schoolSie: '80730142',
          createdAt: new Date().toISOString(),
        };

        await setDoc(userDocRef, newProfile);
        return newProfile;
      } catch (err: any) {
        console.warn('[SIGAE Auth] Error validating SMS code with Firebase:', err.code, err.message);
        if (err.code === 'auth/invalid-verification-code' || err.code === 'auth/code-expired') {
          throw err;
        }
        // If expired or invalid
        const friendlyMsg = getAuthErrorMessage(err);
        const customErr = new Error(friendlyMsg) as any;
        customErr.code = err.code;
        throw customErr;
      }
    }

    // 2. Fallback mode (e.g. simulated code)
    const cleanPhone = params.phone.trim();
    const uid = `phone-usr-${cleanPhone.replace(/[^0-9]/g, '').slice(-8)}`;
    const userDocRef = doc(db, 'users', uid);
    const existing = await getDoc(userDocRef);

    if (existing.exists()) {
      const userData = existing.data() as SigaeUser;
      if (userData.active === false) {
        throw new Error('Esta cuenta institucional ha sido desactivada por la Dirección.');
      }
      return userData;
    }

    const role: SigaeRole = params.role === 'alumno' ? 'alumno' : 'padre';
    const newProfile: SigaeUser = {
      uid,
      email: `${cleanPhone.replace(/[^0-9]/g, '')}@telefono.sigae.bo`,
      displayName: params.fullName || `Usuario Móvil (${cleanPhone})`,
      phone: cleanPhone,
      role,
      active: true,
      emailVerified: true,
      schoolSie: '80730142',
      createdAt: new Date().toISOString(),
    };

    await setDoc(userDocRef, newProfile);
    return newProfile;
  },

  // Quick Sign In for Testing / Evaluation across the roles
  async quickLoginAsRole(role: SigaeRole): Promise<SigaeUser> {
    if (role === 'director' || (role as string) === 'superadmin') {
      try {
        await signInWithEmailAndPassword(auth, 'director@sigae.edu.bo', 'Sigae2026!');
      } catch (err) {
        console.warn('[SIGAE Auth] Aviso al iniciar sesión administrativa rápida:', err);
      }
      const userDocRef = doc(db, 'users', AUTHORIZED_DIRECTOR_UID);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data() as SigaeUser;
          return {
            ...data,
            uid: AUTHORIZED_DIRECTOR_UID,
            email: 'condorcethuanca@gmail.com',
            role: 'director',
            active: true,
            emailVerified: true,
          };
        }
      } catch (docErr) {
        console.warn('[SIGAE Auth] Aviso al leer doc director:', docErr);
      }
      return {
        ...DEMO_ACCOUNTS.director,
        uid: AUTHORIZED_DIRECTOR_UID,
        email: 'condorcethuanca@gmail.com',
        role: 'director',
        active: true,
        emailVerified: true,
      };
    }

    const targetUser = { ...DEMO_ACCOUNTS[role] };
    const defaultPassword = 'Sigae2026!';

    // Sign in explicitly with Firebase Auth
    const cred = await signInWithEmailAndPassword(auth, targetUser.email, defaultPassword);
    const userDocRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data() as SigaeUser;
      return {
        ...data,
        uid: cred.user.uid,
      };
    }

    targetUser.uid = cred.user.uid;
    await setDoc(userDocRef, targetUser, { merge: true });
    return targetUser;
  },

  // Logout from Firebase
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out note:', e);
    }
  },
};
