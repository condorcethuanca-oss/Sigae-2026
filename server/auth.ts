import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getInstitutionalUsers } from './data.js';
import { User } from '../src/types.js';
import firebaseConfigJson from '../firebase-applet-config.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// 1. CONFIGURACIÓN Y ESTADO DE FIREBASE ADMIN SDK
// ---------------------------------------------------------------------------
let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let firebaseAdminConfigured = false;
let firebaseAdminMissingDetails = '';

try {
  if (firebaseConfigJson && firebaseConfigJson.projectId) {
    if (getApps().length === 0) {
      adminApp = initializeApp({
        projectId: firebaseConfigJson.projectId,
      });
    } else {
      adminApp = getApps()[0];
    }
    adminAuth = getAuth(adminApp);
    firebaseAdminConfigured = true;
  } else {
    firebaseAdminMissingDetails = 'Falta firebase-applet-config.json o projectId en la configuración.';
  }
} catch (err: any) {
  firebaseAdminMissingDetails = err.message || 'Error al inicializar Firebase Admin SDK';
}

// ---------------------------------------------------------------------------
// 2. POLÍTICA DE ENTORNOS Y GESTIÓN SEGURA DE CLAVE CRIPTOGRÁFICA
// ---------------------------------------------------------------------------
export function isLocalHmacAllowed(): boolean {
  if (process.env.ALLOW_LOCAL_HMAC_TOKENS === 'false') {
    return false;
  }
  if (process.env.ALLOW_LOCAL_HMAC_TOKENS === 'true') {
    return true;
  }
  // En producción el valor por defecto es FALSE (exige Firebase ID Token oficial)
  // En desarrollo/test es TRUE para permitir pruebas locales automatizadas
  return process.env.NODE_ENV !== 'production';
}

const isProduction = process.env.NODE_ENV === 'production';

// Clave HMAC del servidor: NUNCA se utiliza una constante fija en código.
let SERVER_JWT_SECRET: string;
if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32) {
  SERVER_JWT_SECRET = process.env.JWT_SECRET.trim();
} else if (process.env.JWT_SECRET) {
  SERVER_JWT_SECRET = process.env.JWT_SECRET.trim();
} else if (isProduction && isLocalHmacAllowed()) {
  throw new Error(
    '[SIGAE Seguridad] ERROR FATAL: En entorno de producción con ALLOW_LOCAL_HMAC_TOKENS=true es obligatorio configurar la variable JWT_SECRET (mínimo 32 caracteres).'
  );
} else {
  // En desarrollo/test, si no hay JWT_SECRET explícito, persistir temporalmente en node_modules/.cache
  // para que el proceso del servidor y los scripts de test compartan la misma firma HMAC
  const cacheDir = path.resolve('node_modules/.cache');
  const cacheFile = path.join(cacheDir, 'sigae-dev-hmac.key');
  try {
    if (fs.existsSync(cacheFile)) {
      SERVER_JWT_SECRET = fs.readFileSync(cacheFile, 'utf8').trim();
    } else {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      SERVER_JWT_SECRET = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(cacheFile, SERVER_JWT_SECRET, 'utf8');
    }
  } catch {
    SERVER_JWT_SECRET = crypto.randomBytes(32).toString('hex');
  }
}

export function getAuthSystemStatus() {
  const isProd = process.env.NODE_ENV === 'production';
  const hmacAllowed = isLocalHmacAllowed();
  return {
    environment: isProd ? 'production' : 'development',
    authMode: isProd
      ? (hmacAllowed ? 'production_hybrid' : 'production_firebase_strict')
      : (hmacAllowed ? 'development_hybrid' : 'development_firebase_strict'),
    allowLocalHmac: hmacAllowed,
    hasCustomJwtSecret: Boolean(process.env.JWT_SECRET),
    configured: firebaseAdminConfigured,
    projectId: firebaseConfigJson?.projectId || null,
    missingDetails: firebaseAdminMissingDetails,
    hasServiceAccountKey: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT),
  };
}

export const getFirebaseAdminStatus = getAuthSystemStatus;

// ---------------------------------------------------------------------------
// 3. CRIPTOGRAFÍA DEL SERVIDOR (HMAC-SHA256 PARA SESIONES LOCALES)
// ---------------------------------------------------------------------------
function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Emite un token criptográfico firmado por el servidor (HMAC-SHA256).
 */
export function signServerToken(payload: { uid: string; email?: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    sub: payload.uid,
    uid: payload.uid,
    email: payload.email,
    iss: 'sigae-backend-80730142',
    aud: 'sigae-80730142',
    iat: now,
    exp: now + 8 * 3600, // 8 horas de vigencia
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(jwtPayload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = crypto
    .createHmac('sha256', SERVER_JWT_SECRET)
    .update(unsignedToken)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signature}`;
}

/**
 * Valida la firma criptográfica HMAC-SHA256 del servidor.
 */
function verifyServerHmacToken(token: string): { uid: string } {
  if (!isLocalHmacAllowed()) {
    throw new Error('Autenticación mediante tokens locales HMAC deshabilitada en este entorno. Se requiere Firebase ID Token oficial.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token inválido o malformado');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: any;
  try {
    header = JSON.parse(base64UrlDecode(headerB64));
  } catch {
    throw new Error('Cabecera de token inválida');
  }

  if (header.alg !== 'HS256') {
    throw new Error('Algoritmo de firma no soportado o inseguro (alg: none rechazado)');
  }

  const unsignedToken = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto
    .createHmac('sha256', SERVER_JWT_SECRET)
    .update(unsignedToken)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signatureB64);
  const expectedBuffer = Buffer.from(expectedSig);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Firma criptográfica inválida o no verificada');
  }

  let payload: any;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    throw new Error('Payload del token ilegible');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && typeof payload.exp === 'number' && payload.exp < now) {
    throw new Error('Token de autenticación expirado');
  }

  const uid = payload.sub || payload.uid;
  if (!uid) {
    throw new Error('Token no contiene identificador de usuario válido');
  }

  return { uid };
}

// ---------------------------------------------------------------------------
// 4. VERIFICACIÓN CENTRALIZADA DE TOKENS (FIREBASE ADMIN + HMAC SERVIDOR)
// ---------------------------------------------------------------------------
export async function verifyTokenHeader(authHeader: string | undefined): Promise<{ uid: string; authSource: 'firebase_admin' | 'server_hmac' }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token de autenticación Bearer requerido');
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error('Token de autenticación vacío');
  }

  // Rechazo explícito inmediato de tokens de desarrollo o plantillas vulnerables
  if (token.startsWith('dev.') || token.startsWith('token-')) {
    throw new Error('Token de desarrollo o formato no seguro rechazado por el servidor');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token inválido o malformado: debe contener 3 segmentos separados por punto');
  }

  // Intento 1: Validar mediante Firebase Admin SDK oficial
  if (adminAuth) {
    try {
      const decodedFirebase = await adminAuth.verifyIdToken(token);
      if (decodedFirebase && decodedFirebase.uid) {
        return {
          uid: decodedFirebase.uid,
          authSource: 'firebase_admin',
        };
      }
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/id-token-expired') {
        throw new Error('Token de autenticación de Firebase expirado');
      }
      // Si no es un token de Google/Firebase, continuará para verificar si es un token firmado por el backend
    }
  }

  // Intento 2: Validar mediante firma HMAC-SHA256 del servidor si está habilitado
  try {
    const verified = verifyServerHmacToken(token);
    return {
      uid: verified.uid,
      authSource: 'server_hmac',
    };
  } catch (hmacErr: any) {
    throw new Error(`Fallo de verificación de token: ${hmacErr.message}`);
  }
}

// ---------------------------------------------------------------------------
// 5. TIPOS Y EXTENSIÓN DE EXPRESS
// ---------------------------------------------------------------------------
export interface VerifiedUserSession {
  uid: string;
  id: string;
  role: string;
  status: 'activo' | 'pendiente_activacion' | 'licencia' | 'inactivo' | 'retirado';
  name: string;
  email: string;
  schoolCode: string;
  teacherId?: string;
  teacherPin?: string;
  specialty?: string;
  parentId?: string;
  linkedStudentIds?: string[];
  authSource: 'firebase_admin' | 'server_hmac';
}

declare global {
  namespace Express {
    interface Request {
      user?: VerifiedUserSession;
    }
  }
}

// ---------------------------------------------------------------------------
// 6. MIDDLEWARE DE AUTENTICACIÓN Y VERIFICACIÓN DE ESTADO INSTITUCIONAL
// ---------------------------------------------------------------------------
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { uid, authSource } = await verifyTokenHeader(req.headers.authorization);

    // Consulta del repositorio institucional unificado
    const currentUsers = getInstitutionalUsers();
    const trustedUser = currentUsers.find(
      (u) =>
        u.id === uid ||
        u.email.toLowerCase() === uid.toLowerCase() ||
        (uid === 'At1j9MIIu1ZN0ZRZDas28ILQn2y1' && (u.email === 'condorcethuanca@gmail.com' || u.id === 'At1j9MIIu1ZN0ZRZDas28ILQn2y1')) ||
        (uid === '0zHkg7u1XsaJ15EiXtVNzY8qTWt2' && (u.email === 'gamacondorilopez74@gmail.com' || u.id === '0zHkg7u1XsaJ15EiXtVNzY8qTWt2')) ||
        (uid === 'gamacondorilopez74@gmail.com' && (u.email === 'gamacondorilopez74@gmail.com' || u.id === '0zHkg7u1XsaJ15EiXtVNzY8qTWt2')) ||
        (uid === 'condorcethuanca@gmail.com' && (u.email === 'condorcethuanca@gmail.com' || u.id === 'At1j9MIIu1ZN0ZRZDas28ILQn2y1' || u.id === 'sigae-director-condorcet')) ||
        (uid === 'sigae-director-condorcet' && u.email === 'condorcethuanca@gmail.com') ||
        (uid === '385JXeNTGcNrZvV2casb8ICaQvE2' && (u.id === '385JXeNTGcNrZvV2casb8ICaQvE2' || u.id === 'usr-admin-1' || u.id === 'sigae-usr-director-01')) ||
        (uid === 'sigae-usr-director-01' && u.id === 'usr-admin-1') ||
        (uid === 'usr-admin-1' && u.id === 'sigae-usr-director-01') ||
        (uid === 'sigae-usr-profesor-01' && u.id === 'usr-prof-1') ||
        (uid === 'sigae-usr-padre-01' && u.id === 'padre-01') ||
        (uid === 'sigae-usr-alumno-01' && u.id === 'alu-01')
    );

    if (!trustedUser) {
      return res.status(401).json({
        error: 'Identidad no reconocida: Usuario no registrado en la base de datos institucional de la U.E. Luis Espinal.',
      });
    }

    const status = trustedUser.status || 'activo';

    if (status === 'inactivo') {
      return res.status(403).json({
        error: 'Acceso denegado: Cuenta institucional inactiva. Los permisos han sido revocados por Dirección.',
        status: 'inactivo',
      });
    }

    if (status === 'retirado') {
      return res.status(403).json({
        error: 'Acceso denegado: El usuario ha sido retirado definitivamente de la institución educativa.',
        status: 'retirado',
      });
    }

    if (status === 'pendiente_activacion') {
      return res.status(403).json({
        error: 'Acceso denegado: Cuenta institucional en espera de activación oficial por Dirección.',
        status: 'pendiente_activacion',
      });
    }

    // Identidad y permisos resueltos desde la fuente institucional confiable
    req.user = {
      uid: trustedUser.id,
      id: trustedUser.id,
      role: trustedUser.role,
      status: status,
      name: trustedUser.name,
      email: trustedUser.email,
      schoolCode: trustedUser.schoolCode,
      teacherId: trustedUser.role === 'teacher' || trustedUser.role === 'profesor' ? trustedUser.id : undefined,
      teacherPin: trustedUser.teacherPin,
      specialty: trustedUser.specialty,
      parentId: trustedUser.parentId,
      linkedStudentIds: trustedUser.linkedStudentIds,
      authSource,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({
      error: err.message || 'Fallo de autenticación: Token no verificado o corrupto',
    });
  }
}

// ---------------------------------------------------------------------------
// 7. GUARDIAS DE ROL Y ESTADO INSTITUCIONAL
// ---------------------------------------------------------------------------
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const currentRole = req.user.role;
    const isDirector = (currentRole === 'admin' || currentRole === 'director') && allowedRoles.some((r) => r === 'admin' || r === 'director');
    const isTeacher = (currentRole === 'teacher' || currentRole === 'profesor') && allowedRoles.some((r) => r === 'teacher' || r === 'profesor');
    const isStudent = (currentRole === 'student' || currentRole === 'alumno') && allowedRoles.some((r) => r === 'student' || r === 'alumno');
    const isParent = (currentRole === 'parent' || currentRole === 'padre') && allowedRoles.some((r) => r === 'parent' || r === 'padre');

    if (isDirector || isTeacher || isStudent || isParent || allowedRoles.includes(currentRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Acceso denegado: Su rol institucional (${currentRole}) no tiene autorización para realizar esta acción.`,
    });
  };
}

export function requireNotOnLeave(req: Request, res: Response, next: NextFunction) {
  if (req.user?.status === 'licencia') {
    return res.status(403).json({
      error: 'Acceso denegado: Docente en situación de licencia temporal. No está habilitado para asentar calificaciones ni registrar asistencia.',
      status: 'licencia',
    });
  }
  next();
}
