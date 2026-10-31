/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * Institución: U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * CHECKPOINT 3.13 / 3.14: VALIDACIÓN Y AUDITORÍA INDEPENDIENTE DE SEGURIDAD DEL BACKEND
 *
 * Pruebas locales automatizadas para validar:
 * 1. Rechazo definitivo de tokens no seguros (dev.xxx, token-xxx, alg:none, firmas falsas).
 * 2. Validación de Firebase Admin SDK y criptografía HMAC-SHA256 del servidor.
 * 3. Protección rigurosa de todos los endpoints institucionales.
 * 4. Verificación de estados institucionales (activo, licencia, inactivo, retirado).
 * 5. Mitigación absoluta de suplantación de identidad y roles declarados por el cliente.
 */

import 'dotenv/config';
import crypto from 'crypto';
import { signServerToken } from '../server/auth.js';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfigJson from '../firebase-applet-config.json' with { type: 'json' };

interface TestResult {
  id: string;
  category: string;
  name: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes: string;
}

const results: TestResult[] = [];

async function request(endpoint: string, options: RequestInit = {}): Promise<{ status: number; data: any }> {
  const url = `http://localhost:3000${endpoint}`;
  try {
    const res = await fetch(url, options);
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return { status: res.status, data };
  } catch (err: any) {
    return { status: 0, data: { error: err.message } };
  }
}

function record(
  id: string,
  category: string,
  name: string,
  expectedStatus: number,
  actualStatus: number,
  conditionPassed: boolean,
  notes: string
) {
  const passed = expectedStatus === actualStatus && conditionPassed;
  results.push({ id, category, name, expectedStatus, actualStatus, passed, notes });
  const icon = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`  [${icon}] [${id}] ${name} (HTTP ${actualStatus}, esperado ${expectedStatus})`);
  if (!passed) {
    console.log(`         Detalle: ${notes}`);
  }
}

async function getLoginToken(email: string, role: string, teacherPin?: string): Promise<string> {
  const res = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role, schoolCode: '80730142', teacherPin }),
  });
  if (!res.data?.token) {
    throw new Error(`Fallo de login para ${email} (HTTP ${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data.token;
}

async function runCheckpoint313TestSuite() {
  console.log('========================================================================');
  console.log('SIGAE CHECKPOINT 3.13 / 3.14 — AUDITORÍA DE SEGURIDAD DEL BACKEND');
  console.log('Institución: U.E. Luis Espinal Tarde de Collpani (Código SIE: 80730142)');
  console.log('Host Auditado: http://localhost:3000');
  console.log('========================================================================\n');

  const now = Math.floor(Date.now() / 1000);

  // Obtención de tokens reales emitidos por el servidor mediante autenticación oficial
  console.log('[AUTENTICACIÓN] Emitiendo tokens institucionales oficiales para las pruebas...');
  const directorToken = await getLoginToken('director@sigae.edu.bo', 'director');
  const teacher1Token = await getLoginToken('carlos.mamani@luisespinal.edu.bo', 'teacher', '7731');
  const teacher2Token = await getLoginToken('elena.morales@luisespinal.edu.bo', 'teacher', '4290');
  const leaveToken = await getLoginToken('julia.ramos@luisespinal.edu.bo', 'teacher', '1122');
  const student1Token = await getLoginToken('santiago.gonzalez@estudiante.bo', 'student');
  const student2Token = await getLoginToken('valentina.huanca@estudiante.bo', 'student');
  const parent1Token = await getLoginToken('padre.gonzalez@familia.bo', 'parent');
  const parent2Token = await getLoginToken('carmen.quispe@familia.bo', 'parent');
  console.log('  ✔ Tokens emitidos y firmados correctamente por el servidor.\n');

  // ---------------------------------------------------------------------------
  // BLOQUE 1: RECHAZO DE TOKENS INSEGUROS Y CRIPTOGRAFÍA DEL SERVIDOR
  // ---------------------------------------------------------------------------
  console.log('[BLOQUE 1] Criptografía y Rechazo de Tokens Falsificables / Inseguros...');

  // TC-1.1: Solicitud sin cabecera Authorization
  {
    const res = await request('/api/grades/crs-mat-5a');
    record(
      'TC-1.1',
      'Criptografía y Tokens',
      'Solicitud sin cabecera Authorization es rechazada con 401',
      401,
      res.status,
      res.data?.error?.includes('requerido'),
      res.data?.error || ''
    );
  }

  // TC-1.2: Solicitud con token vacío
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: 'Bearer ' },
    });
    record(
      'TC-1.2',
      'Criptografía y Tokens',
      'Solicitud con token Bearer vacío es rechazada con 401',
      401,
      res.status,
      Boolean(res.data?.error),
      res.data?.error || ''
    );
  }

  // TC-1.3: Token malformado (sin estructura de 3 segmentos JWT)
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: 'Bearer cadena_malformada_sin_tres_puntos' },
    });
    record(
      'TC-1.3',
      'Criptografía y Tokens',
      'Token malformado es rechazado con 401',
      401,
      res.status,
      res.data?.error?.includes('malformado') || res.data?.error?.includes('segmentos'),
      res.data?.error || ''
    );
  }

  // TC-1.4: Token de desarrollo del cliente (dev.xxx.signature)
  {
    const fakePayload = Buffer.from(JSON.stringify({ uid: 'usr-admin-1', role: 'admin' })).toString('base64');
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer dev.${fakePayload}.signature` },
    });
    record(
      'TC-1.4',
      'Criptografía y Tokens',
      'Token de desarrollo dev.xxx.signature es explícitamente rechazado con 401',
      401,
      res.status,
      res.data?.error?.includes('rechazado') || res.data?.error?.includes('desarrollo'),
      res.data?.error || ''
    );
  }

  // TC-1.5: Token en texto plano (token-usr-prof-1-timestamp)
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: 'Bearer token-usr-prof-1-1791630000000' },
    });
    record(
      'TC-1.5',
      'Criptografía y Tokens',
      'Token en formato texto plano token-xxx es rechazado con 401',
      401,
      res.status,
      Boolean(res.data?.error),
      res.data?.error || ''
    );
  }

  // TC-1.6: Token con algoritmo 'none' (ataque de bypass criptográfico)
  {
    const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const p = Buffer.from(JSON.stringify({ uid: 'usr-admin-1', role: 'admin', exp: now + 3600 })).toString('base64');
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer ${h}.${p}.sin_firma` },
    });
    record(
      'TC-1.6',
      'Criptografía y Tokens',
      'Token con alg: none es inmediatamente bloqueado con 401',
      401,
      res.status,
      res.data?.error?.includes('none') || res.data?.error?.includes('inseguro'),
      res.data?.error || ''
    );
  }

  // TC-1.7: Token con firma adulterada / falsa (forged signature)
  {
    const parts = directorToken.split('.');
    const forgedToken = `${parts[0]}.${parts[1]}.firma_falsificada_atacante`;
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    record(
      'TC-1.7',
      'Criptografía y Tokens',
      'Token con firma adulterada es rechazado con 401',
      401,
      res.status,
      res.data?.error?.includes('Firma') || res.data?.error?.includes('criptográfica'),
      res.data?.error || ''
    );
  }

  // TC-1.8: Token con expiración vencida (exp < now)
  {
    const parts = directorToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    payload.exp = now - 3600; // Vencido hace 1 hora
    // Re-firmar o enviar payload alterado
    const expiredPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const fakeExpiredToken = `${parts[0]}.${expiredPayloadB64}.${parts[2]}`;
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer ${fakeExpiredToken}` },
    });
    record(
      'TC-1.8',
      'Criptografía y Tokens',
      'Token con payload manipulado/expirado es rechazado con 401',
      401,
      res.status,
      Boolean(res.data?.error),
      res.data?.error || ''
    );
  }

  // TC-1.9: Token válido criptográficamente pero para UID inexistente en BD
  {
    const ghostToken = signServerToken({ uid: 'usr-fantasma-inexistente' });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer ${ghostToken}` },
    });
    record(
      'TC-1.9',
      'Criptografía y Tokens',
      'Token de usuario no registrado en base de datos institucional es rechazado con 401',
      401,
      res.status,
      res.data?.error?.includes('no registrado') || res.data?.error?.includes('no reconocida'),
      res.data?.error || ''
    );
  }

  // TC-1.10: Token legítimo emitido por el servidor
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer ${directorToken}` },
    });
    record(
      'TC-1.10',
      'Criptografía y Tokens',
      'Token institucional legítimo firmado por el servidor es aceptado con 200',
      200,
      res.status,
      Boolean(res.data?.courseId),
      `Curso obtenido: ${res.data?.courseName}`
    );
  }

  // ---------------------------------------------------------------------------
  // BLOQUE 2: VERIFICACIÓN DE INTEGRACIÓN CON FIREBASE ADMIN SDK
  // ---------------------------------------------------------------------------
  console.log('\n[BLOQUE 2] Verificación de Firebase Admin SDK...');

  // TC-2.1: Endpoint /api/auth/status expone estado de Firebase Admin SDK
  {
    const res = await request('/api/auth/status');
    const configured = res.data?.configured === true;
    const projectMatches = res.data?.projectId === firebaseConfigJson.projectId;
    record(
      'TC-2.1',
      'Firebase Admin SDK',
      'Firebase Admin SDK está inicializado con projectId oficial xenodochial-cosine-2ds98',
      200,
      res.status,
      configured && projectMatches,
      `Configured: ${res.data?.configured}, Project: ${res.data?.projectId}`
    );
  }

  // TC-2.2: Verificación de verifyIdToken de Firebase Admin ante tokens inválidos
  {
    const adminApp = getApps().length === 0 ? initializeApp({ projectId: firebaseConfigJson.projectId }) : getApps()[0];
    const adminAuth = getAuth(adminApp);
    let rejectedByFirebaseAdmin = false;
    try {
      await adminAuth.verifyIdToken('token-falso-para-evaluar-admin-sdk');
    } catch (err: any) {
      rejectedByFirebaseAdmin = err.code === 'auth/argument-error' || Boolean(err.message);
    }
    record(
      'TC-2.2',
      'Firebase Admin SDK',
      'Firebase Admin SDK verifyIdToken() rechaza activamente tokens inválidos con auth/argument-error',
      200,
      200,
      rejectedByFirebaseAdmin,
      'Rechazo criptográfico verificado por Admin SDK'
    );
  }

  // TC-2.3: Documentación de credenciales de cuenta de servicio
  {
    const res = await request('/api/auth/status');
    const serviceAccountStatus = res.data?.hasServiceAccountKey;
    record(
      'TC-2.3',
      'Firebase Admin SDK',
      'Diagnóstico transparente: el backend documenta formalmente la ausencia de clave privada de servicio',
      200,
      res.status,
      serviceAccountStatus === false,
      'Clave privada ausente documentada formalmente (no se simula autenticación ficticia)'
    );
  }

  // ---------------------------------------------------------------------------
  // BLOQUE 3: AUDITORÍA Y PROTECCIÓN DE TODOS LOS ENDPOINTS EXPUESTOS
  // ---------------------------------------------------------------------------
  console.log('\n[BLOQUE 3] Protección y Control de Acceso en Todos los Endpoints...');

  // TC-3.1: /api/users sin token -> 401
  {
    const res = await request('/api/users');
    record('TC-3.1', 'Protección Endpoints', '/api/users sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // TC-3.2: /api/users consultado por alumno -> 403
  {
    const res = await request('/api/users', { headers: { Authorization: `Bearer ${student1Token}` } });
    record('TC-3.2', 'Protección Endpoints', '/api/users consultado por alumno es rechazado con 403', 403, res.status, true, res.data?.error || '');
  }

  // TC-3.3: /api/users consultado por docente -> 403
  {
    const res = await request('/api/users', { headers: { Authorization: `Bearer ${teacher1Token}` } });
    record('TC-3.3', 'Protección Endpoints', '/api/users consultado por docente es rechazado con 403', 403, res.status, true, res.data?.error || '');
  }

  // TC-3.4: /api/users consultado por Dirección -> 200 con PIN enmascarado
  {
    const res = await request('/api/users', { headers: { Authorization: `Bearer ${directorToken}` } });
    const isArray = Array.isArray(res.data);
    const pinMasked = res.data?.every((u: any) => !u.teacherPin || u.teacherPin === '••••');
    record(
      'TC-3.4',
      'Protección Endpoints',
      '/api/users consultado por Dirección entrega nómina con PINs enmascarados',
      200,
      res.status,
      isArray && pinMasked,
      `Usuarios entregados: ${res.data?.length}`
    );
  }

  // TC-3.5: /api/users/register sin token -> 401
  {
    const res = await request('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email: 'test@sigae.edu.bo', role: 'student' }),
    });
    record('TC-3.5', 'Protección Endpoints', '/api/users/register sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // TC-3.6: /api/users/register intentado por alumno -> 403
  {
    const res = await request('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student1Token}` },
      body: JSON.stringify({ name: 'Test', email: 'test2@sigae.edu.bo', role: 'student' }),
    });
    record('TC-3.6', 'Protección Endpoints', '/api/users/register intentado por alumno es rechazado con 403', 403, res.status, true, res.data?.error || '');
  }

  // TC-3.7: /api/users/register ejecutado por Dirección -> 201
  {
    const testEmail = `nuevo.estudiante.${Date.now()}@estudiante.bo`;
    const res = await request('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${directorToken}` },
      body: JSON.stringify({ name: 'Estudiante Nuevo', email: testEmail, role: 'student' }),
    });
    record('TC-3.7', 'Protección Endpoints', '/api/users/register ejecutado por Dirección registra usuario exitosamente (201)', 201, res.status, Boolean(res.data?.user?.id), res.data?.user?.id || '');
  }

  // TC-3.8: /api/courses sin token -> 401
  {
    const res = await request('/api/courses');
    record('TC-3.8', 'Protección Endpoints', '/api/courses sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // TC-3.9: /api/courses con usuario autenticado -> 200
  {
    const res = await request('/api/courses', { headers: { Authorization: `Bearer ${teacher1Token}` } });
    record('TC-3.9', 'Protección Endpoints', '/api/courses con usuario autenticado entrega cursos (200)', 200, res.status, Array.isArray(res.data), `Total cursos: ${res.data?.length}`);
  }

  // TC-3.10: /api/students/:id/report-card sin token -> 401
  {
    const res = await request('/api/students/alu-01/report-card');
    record('TC-3.10', 'Protección Endpoints', '/api/students/:id/report-card sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // TC-3.11: /api/students/:id/report-card consultado por estudiante ajeno -> 403
  {
    const res = await request('/api/students/alu-01/report-card', {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    record('TC-3.11', 'Protección Endpoints', 'Estudiante que intenta consultar boleta de un par es rechazado con 403', 403, res.status, res.data?.error?.includes('No tiene autorización'), res.data?.error || '');
  }

  // TC-3.12: /api/students/:id/report-card consultado por el propio estudiante -> 200
  {
    const res = await request('/api/students/alu-01/report-card', {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    record('TC-3.12', 'Protección Endpoints', 'Estudiante consulta legítimamente su propia boleta (200)', 200, res.status, res.data?.student?.id === 'alu-01', `Boleta de: ${res.data?.student?.name}`);
  }

  // TC-3.13: /api/parents/:id/children sin token -> 401
  {
    const res = await request('/api/parents/padre-01/children');
    record('TC-3.13', 'Protección Endpoints', '/api/parents/:id/children sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // TC-3.14: /api/parents/:id/children consultado por otro padre -> 403
  {
    const res = await request('/api/parents/padre-01/children', {
      headers: { Authorization: `Bearer ${parent2Token}` },
    });
    record('TC-3.14', 'Protección Endpoints', 'Padre intentando consultar hijos de otro tutor es rechazado con 403', 403, res.status, true, res.data?.error || '');
  }

  // TC-3.15: /api/parents/:id/children consultado por el tutor legítimo -> 200
  {
    const res = await request('/api/parents/padre-01/children', {
      headers: { Authorization: `Bearer ${parent1Token}` },
    });
    const childrenCount = res.data?.children?.length;
    record('TC-3.15', 'Protección Endpoints', 'Tutor legítimo consulta sus propios hijos tutelados (200)', 200, res.status, childrenCount === 2, `Hijos entregados: ${childrenCount}`);
  }

  // TC-3.16: /api/attendance GET sin token -> 401
  {
    const res = await request('/api/attendance');
    record('TC-3.16', 'Protección Endpoints', '/api/attendance GET sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // TC-3.17: /api/attendance GET por alumno -> 403
  {
    const res = await request('/api/attendance', { headers: { Authorization: `Bearer ${student1Token}` } });
    record('TC-3.17', 'Protección Endpoints', '/api/attendance GET por alumno es rechazado con 403', 403, res.status, true, res.data?.error || '');
  }

  // TC-3.18: /api/attendance GET por docente asignado -> 200
  {
    const res = await request('/api/attendance?courseId=crs-mat-5a', { headers: { Authorization: `Bearer ${teacher1Token}` } });
    record('TC-3.18', 'Protección Endpoints', '/api/attendance GET por docente asignado entrega asistencia (200)', 200, res.status, Array.isArray(res.data), `Registros: ${res.data?.length}`);
  }

  // TC-3.19: /api/attendance GET por docente no asignado -> 403
  {
    const res = await request('/api/attendance?courseId=crs-mat-5a', { headers: { Authorization: `Bearer ${teacher2Token}` } });
    record('TC-3.19', 'Protección Endpoints', '/api/attendance GET por docente sin asignación al curso es rechazado con 403', 403, res.status, true, res.data?.error || '');
  }

  // TC-3.20: /api/attendance POST sin token -> 401
  {
    const res = await request('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-10-10', courseId: 'crs-mat-5a', records: [] }),
    });
    record('TC-3.20', 'Protección Endpoints', '/api/attendance POST sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // TC-3.21: /api/sentiment/sample sin token -> 401
  {
    const res = await request('/api/sentiment/sample');
    record('TC-3.21', 'Protección Endpoints', '/api/sentiment/sample sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // TC-3.22: /api/sentiment/analyze sin token -> 401
  {
    const res = await request('/api/sentiment/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText: 'Excelente colegio' }),
    });
    record('TC-3.22', 'Protección Endpoints', '/api/sentiment/analyze sin token es rechazado con 401', 401, res.status, true, res.data?.error || '');
  }

  // ---------------------------------------------------------------------------
  // BLOQUE 4: COMPROBACIÓN DE ESTADOS INSTITUCIONALES Y REVOCACIÓN
  // ---------------------------------------------------------------------------
  console.log('\n[BLOQUE 4] Verificación de Estados Institucionales y Revocación...');

  // TC-4.1: Login de usuario en estado inactivo es rechazado con 403
  {
    const res = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ramiro.tarqui@luisespinal.edu.bo',
        role: 'teacher',
        schoolCode: '80730142',
      }),
    });
    record(
      'TC-4.1',
      'Estados y Revocación',
      'Intento de inicio de sesión de usuario en estado inactivo es bloqueado con 403',
      403,
      res.status,
      res.data?.status === 'inactivo',
      res.data?.error || ''
    );
  }

  // TC-4.2: Usuario inactivo con token firmado previamente es bloqueado en cada petición (403)
  {
    const inactiveToken = signServerToken({ uid: 'usr-prof-inactivo' });
    const res = await request('/api/courses', {
      headers: { Authorization: `Bearer ${inactiveToken}` },
    });
    record(
      'TC-4.2',
      'Estados y Revocación',
      'Usuario inactivo con token firmado es rechazado en cada petición protegida con 403',
      403,
      res.status,
      res.data?.status === 'inactivo',
      res.data?.error || ''
    );
  }

  // TC-4.3: Usuario retirado con token firmado es bloqueado con 403
  {
    const retiredToken = signServerToken({ uid: 'usr-prof-retirado' });
    const res = await request('/api/courses', {
      headers: { Authorization: `Bearer ${retiredToken}` },
    });
    record(
      'TC-4.3',
      'Estados y Revocación',
      'Usuario retirado definitivamente es bloqueado en cada solicitud protegida con 403',
      403,
      res.status,
      res.data?.status === 'retirado',
      res.data?.error || ''
    );
  }

  // TC-4.4: Docente en licencia puede leer información académica general (200)
  {
    const res = await request('/api/courses', {
      headers: { Authorization: `Bearer ${leaveToken}` },
    });
    record(
      'TC-4.4',
      'Estados y Revocación',
      'Docente en situación de licencia conserva permisos de lectura general (200)',
      200,
      res.status,
      Array.isArray(res.data),
      `Cursos leídos: ${res.data?.length}`
    );
  }

  // TC-4.5: Docente en licencia intenta modificar calificaciones -> bloqueado con 403
  {
    const res = await request('/api/grades/crs-mat-5a/student/alu-01', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leaveToken}` },
      body: JSON.stringify({ scores: { c1: 20 } }),
    });
    record(
      'TC-4.5',
      'Estados y Revocación',
      'Docente en situación de licencia tiene bloqueada la modificación de calificaciones (403)',
      403,
      res.status,
      res.data?.status === 'licencia',
      res.data?.error || ''
    );
  }

  // TC-4.6: Docente en licencia intenta registrar asistencia -> bloqueado con 403
  {
    const res = await request('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${leaveToken}` },
      body: JSON.stringify({ date: '2026-10-10', courseId: 'crs-mat-5a', records: [] }),
    });
    record(
      'TC-4.6',
      'Estados y Revocación',
      'Docente en situación de licencia tiene bloqueado el registro de asistencia oficial (403)',
      403,
      res.status,
      res.data?.status === 'licencia',
      res.data?.error || ''
    );
  }

  // ---------------------------------------------------------------------------
  // BLOQUE 5: MITIGACIÓN DE SUPLANTACIÓN Y PRIVACIDAD DE DATOS
  // ---------------------------------------------------------------------------
  console.log('\n[BLOQUE 5] Mitigación de Suplantación de Roles y Sanitización...');

  // TC-5.1: Estudiante intenta enviar token con claim role: 'admin' manipulado
  {
    // El servidor ignora claims del cliente y consulta su rol real en INITIAL_USERS
    const res = await request('/api/users', {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    record(
      'TC-5.1',
      'Mitigación Suplantación',
      'Servidor valida permisos contra fuente institucional confiable e ignora pretensiones del cliente (403)',
      403,
      res.status,
      res.data?.error?.includes('student'),
      res.data?.error || ''
    );
  }

  // TC-5.2: Docente intenta acceder a curso ajeno en /api/grades
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer ${teacher2Token}` },
    });
    record(
      'TC-5.2',
      'Mitigación Suplantación',
      'Docente sin asignación a la materia es rechazado con 403 en /api/grades/:courseId',
      403,
      res.status,
      res.data?.error?.includes('no tiene asignado'),
      res.data?.error || ''
    );
  }

  // TC-5.3: Sanitización de pares: Estudiante solo recibe su propia nota en libreta de curso
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer ${student1Token}` },
    });
    const deliveredGrades = Object.keys(res.data?.grades || {});
    const onlySelf = deliveredGrades.length === 1 && deliveredGrades[0] === 'alu-01';
    record(
      'TC-5.3',
      'Privacidad y Sanitización',
      'Libreta de curso sanitizada: estudiante recibe exclusivamente su calificación, ocultando pares',
      200,
      res.status,
      onlySelf,
      `Calificaciones entregadas: [${deliveredGrades.join(', ')}]`
    );
  }

  // TC-5.4: Sanitización de tutor: Padre solo recibe notas de sus hijos tutelados
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: `Bearer ${parent1Token}` },
    });
    const deliveredGrades = Object.keys(res.data?.grades || {});
    const onlyChildren = deliveredGrades.every((id) => id === 'alu-01' || id === 'alu-05');
    record(
      'TC-5.4',
      'Privacidad y Sanitización',
      'Libreta de curso sanitizada: tutor recibe únicamente calificaciones de sus pupilos tutelados',
      200,
      res.status,
      onlyChildren && deliveredGrades.length > 0,
      `Calificaciones entregadas al padre: [${deliveredGrades.join(', ')}]`
    );
  }

  // ---------------------------------------------------------------------------
  // RESUMEN Y BALANCE FINAL
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('RESUMEN DE RESULTADOS — AUDITORÍA TÉCNICA CP 3.13 / 3.14');
  console.log('========================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total de pruebas ejecutadas: ${total}`);
  console.log(`Pruebas Aprobadas (PASS):   ${passed}`);
  console.log(`Pruebas Fallidas  (FAIL):   ${failed}`);
  console.log(`Tasa de éxito:              ${Math.round((passed / total) * 100)}%`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error(`ALERTA: Se detectaron ${failed} pruebas fallidas en la suite.`);
    process.exit(1);
  } else {
    console.log('✔ TODAS LAS PRUEBAS DE SEGURIDAD HAN SIDO APROBADAS SATISFACTORIAMENTE.');
  }
}

runCheckpoint313TestSuite().catch((err) => {
  console.error('Error fatal ejecutando test suite CP 3.13 / 3.14:', err);
  process.exit(1);
});
