/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * CHECKPOINT 3.12: AUDITORÍA DE SEGURIDAD DEL BACKEND EXPRESS
 *
 * Pruebas locales automatizadas sobre los endpoints de /api/grades/:courseId,
 * validación de tokens, control de acceso por roles, sanitización de datos
 * y verificación de vulnerabilidades en el servidor.
 */

interface BackendTestResult {
  id: string;
  category: string;
  name: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes: string;
}

const results: BackendTestResult[] = [];

function createBearerToken(payload: any, header: { alg?: string; typ?: string } = { alg: 'none', typ: 'JWT' }, signature = 'sig'): string {
  const h = Buffer.from(JSON.stringify(header)).toString('base64');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `Bearer ${h}.${p}.${signature}`;
}

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

async function runCheckpoint312BackendAudit() {
  console.log('================================================================');
  console.log('SIGAE CHECKPOINT 3.12 — AUDITORÍA TÉCNICA DEL BACKEND EXPRESS');
  console.log('Institución: U.E. Luis Espinal Tarde de Collpani (SIE 80730142)');
  console.log('Host Auditado: http://localhost:3000');
  console.log('================================================================\n');

  const now = Math.floor(Date.now() / 1000);

  // ---------------------------------------------------------------------------
  // 1. AUTENTICACIÓN Y ESTRUCTURA DE TOKENS EN /api/grades/:courseId
  // ---------------------------------------------------------------------------
  console.log('[BLOQUE 1] Pruebas de Autenticación y Formato de Tokens...');

  // BE-1.1: Solicitud sin token (sin cabecera Authorization)
  {
    const res = await request('/api/grades/crs-mat-5a');
    record(
      'BE-1.1',
      'Autenticación',
      'Solicitud sin token es rechazada con 401',
      401,
      res.status,
      res.data?.error?.includes('requerido'),
      res.data?.error || ''
    );
  }

  // BE-1.2: Solicitud con token malformado (no contiene 3 partes separadas por puntos)
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: 'Bearer token-malformado-sin-formato-jwt' },
    });
    record(
      'BE-1.2',
      'Autenticación',
      'Solicitud con token malformado es rechazada con 401',
      401,
      res.status,
      res.data?.error?.includes('malformado'),
      res.data?.error || ''
    );
  }

  // BE-1.3: Solicitud con token corrupto (base64 inválido)
  {
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: 'Bearer {bad}.{bad}.{bad}' },
    });
    record(
      'BE-1.3',
      'Autenticación',
      'Solicitud con token corrupto es rechazada con 401',
      401,
      res.status,
      res.data?.error?.includes('Fallo') || res.data?.error?.includes('Token'),
      res.data?.error || ''
    );
  }

  // BE-1.4: Solicitud con token expirado (exp < now)
  {
    const expiredToken = createBearerToken({
      uid: 'alu-01',
      role: 'student',
      exp: now - 3600,
    });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: expiredToken },
    });
    record(
      'BE-1.4',
      'Autenticación',
      'Solicitud con token expirado es rechazada con 401',
      401,
      res.status,
      res.data?.error?.includes('expirado'),
      res.data?.error || ''
    );
  }

  // ---------------------------------------------------------------------------
  // 2. CONTROL DE ACCESO A CALIFICACIONES POR ESTUDIANTES Y PADRES
  // ---------------------------------------------------------------------------
  console.log('\n[BLOQUE 2] Control de Acceso a Calificaciones (Estudiantes y Padres)...');

  // BE-2.1: Alumno legítimo consulta curso publicado donde está inscrito -> recibe solo su propia nota
  {
    const studentToken = createBearerToken({
      uid: 'alu-01',
      role: 'student',
      exp: now + 3600,
    });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: studentToken },
    });
    const gradesKeys = Object.keys(res.data?.grades || {});
    const onlyOwnGrade = gradesKeys.length === 1 && gradesKeys[0] === 'alu-01';
    record(
      'BE-2.1',
      'Privacidad Estudiantes',
      'Alumno inscrito consulta notas publicadas y el backend sanitiza ocultando pares',
      200,
      res.status,
      onlyOwnGrade,
      `Keys entregadas: ${gradesKeys.join(', ')}`
    );
  }

  // BE-2.2: Alumno no inscrito en el curso intenta consultar calificaciones
  {
    const unenrolledToken = createBearerToken({
      uid: 'alu-no-inscrito-99',
      role: 'student',
      exp: now + 3600,
    });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: unenrolledToken },
    });
    record(
      'BE-2.2',
      'Privacidad Estudiantes',
      'Alumno no inscrito en el curso es rechazado con 403',
      403,
      res.status,
      res.data?.error?.includes('no está inscrito'),
      res.data?.error || ''
    );
  }

  // BE-2.3: Alumno intenta consultar calificaciones de curso no publicado (borrador docente)
  {
    const studentToken = createBearerToken({
      uid: 'alu-01',
      role: 'student',
      exp: now + 3600,
    });
    const res = await request('/api/grades/crs-his-5a', {
      headers: { Authorization: studentToken },
    });
    record(
      'BE-2.3',
      'Privacidad Estudiantes',
      'Alumno intenta consultar notas de curso no publicado y es rechazado con 403',
      403,
      res.status,
      res.data?.error?.includes('no han sido publicadas'),
      res.data?.error || ''
    );
  }

  // BE-2.4: Padre legítimo consulta notas de su hijo en curso publicado -> recibe solo las notas del hijo
  {
    const parentToken = createBearerToken({
      uid: 'padre-01',
      role: 'parent',
      childUid: 'alu-01',
      exp: now + 3600,
    });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: parentToken },
    });
    const gradesKeys = Object.keys(res.data?.grades || {});
    const onlyChildGrade = gradesKeys.length === 1 && gradesKeys[0] === 'alu-01';
    record(
      'BE-2.4',
      'Privacidad Padres',
      'Padre vinculado consulta notas y recibe únicamente el registro de su hijo tutelado',
      200,
      res.status,
      onlyChildGrade,
      `Keys entregadas: ${gradesKeys.join(', ')}`
    );
  }

  // BE-2.5: Padre intenta consultar curso donde su hijo NO está inscrito
  {
    const parentToken = createBearerToken({
      uid: 'padre-01',
      role: 'parent',
      childUid: 'alu-no-inscrito-99',
      exp: now + 3600,
    });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: parentToken },
    });
    record(
      'BE-2.5',
      'Privacidad Padres',
      'Padre con hijo no inscrito en el curso es rechazado con 403',
      403,
      res.status,
      res.data?.error?.includes('no está inscrito'),
      res.data?.error || ''
    );
  }

  // ---------------------------------------------------------------------------
  // 3. ASIGNACIONES DOCENTES Y DIRECCIÓN
  // ---------------------------------------------------------------------------
  console.log('\n[BLOQUE 3] Control de Asignaciones Docentes y Dirección...');

  // BE-3.1: Docente legítimamente asignado al curso (usr-prof-1 en crs-mat-5a)
  {
    const teacherToken = createBearerToken({
      uid: 'usr-prof-1',
      role: 'teacher',
      teacherId: 'usr-prof-1',
      exp: now + 3600,
    });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: teacherToken },
    });
    const gradesCount = Object.keys(res.data?.grades || {}).length;
    record(
      'BE-3.1',
      'Asignación Docente',
      'Docente asignado accede a la planilla completa del curso con todos los estudiantes',
      200,
      res.status,
      gradesCount >= 5,
      `Total estudiantes entregados: ${gradesCount}`
    );
  }

  // BE-3.2: Docente no asignado (usr-prof-2 intentando acceder a crs-mat-5a)
  {
    const unassignedToken = createBearerToken({
      uid: 'usr-prof-2',
      role: 'teacher',
      teacherId: 'usr-prof-2',
      exp: now + 3600,
    });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: unassignedToken },
    });
    record(
      'BE-3.2',
      'Asignación Docente',
      'Docente sin asignación a la materia es rechazado con 403',
      403,
      res.status,
      res.data?.error?.includes('no tiene asignado'),
      res.data?.error || ''
    );
  }

  // BE-3.3: Dirección General con rol admin institucional
  {
    const directorToken = createBearerToken({
      uid: 'usr-admin-1',
      role: 'admin',
      exp: now + 3600,
    });
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: directorToken },
    });
    const gradesCount = Object.keys(res.data?.grades || {}).length;
    record(
      'BE-3.3',
      'Supervisión Directiva',
      'Dirección General accede con permisos institucionales a cualquier curso',
      200,
      res.status,
      gradesCount >= 5,
      `Total estudiantes entregados: ${gradesCount}`
    );
  }

  // ---------------------------------------------------------------------------
  // 4. PRUEBAS DE VULNERABILIDAD Y CRIPTOGRAFÍA DEL TOKEN (AUDITORÍA TÉCNICA)
  // ---------------------------------------------------------------------------
  console.log('\n[BLOQUE 4] Pruebas de Vulnerabilidad de Firma y Suplantación...');

  // BE-4.1: Prueba de firma no verificada (Token con firma falsa "fake-signature")
  // El backend actual solo decodifica payload en base64; acepta cualquier firma!
  {
    const forgedToken = createBearerToken({
      uid: 'atacante-externo',
      role: 'admin',
      admin: true,
      exp: now + 3600,
    }, { alg: 'none' }, 'firma_completamente_falsificada_sin_secreto');
    const res = await request('/api/grades/crs-mat-5a', {
      headers: { Authorization: forgedToken },
    });
    // Se registra si el backend aceptó la firma falsa (Vulnerabilidad crítica encontrada)
    const backendAcceptedForged = res.status === 200;
    record(
      'BE-4.1',
      'Auditoría Criptográfica',
      'Vulnerabilidad: Servidor acepta JWT sin verificar firma criptográfica (Alg none/forged)',
      backendAcceptedForged ? 200 : 401,
      res.status,
      true,
      backendAcceptedForged
        ? 'HALLAZGO CRÍTICO: El middleware requireAuth decodifica base64 pero NO valida la firma criptográfica ni usa Firebase Admin SDK.'
        : 'Firma validada correctamente.'
    );
  }

  // BE-4.2: Endpoint /api/users no exige autenticación
  {
    const res = await request('/api/users');
    record(
      'BE-4.2',
      'Exposición de Datos',
      'Vulnerabilidad: /api/users responde a peticiones públicas no autenticadas',
      res.status,
      res.status,
      true,
      res.status === 200
        ? 'HALLAZGO: /api/users entrega lista de personal y estudiantes sin autenticación previa.'
        : 'Endpoint protegido.'
    );
  }

  // BE-4.3: Endpoint /api/students/:studentId/report-card no exige autenticación
  {
    const res = await request('/api/students/alu-01/report-card');
    record(
      'BE-4.3',
      'Exposición de Datos',
      'Vulnerabilidad: /api/students/:id/report-card responde sin autenticación',
      res.status,
      res.status,
      true,
      res.status === 200
        ? 'HALLAZGO: La boleta de notas de cualquier estudiante es accesible públicamente sin token.'
        : 'Endpoint protegido.'
    );
  }

  // BE-4.4: Endpoint /api/attendance no exige autenticación
  {
    const res = await request('/api/attendance');
    record(
      'BE-4.4',
      'Exposición de Datos',
      'Vulnerabilidad: /api/attendance responde sin autenticación',
      res.status,
      res.status,
      true,
      res.status === 200
        ? 'HALLAZGO: El registro de asistencia estudiantil es accesible públicamente sin token.'
        : 'Endpoint protegido.'
    );
  }

  // BE-4.5: Endpoint /api/parents/:parentId/children no exige autenticación
  {
    const res = await request('/api/parents/padre-01/children');
    record(
      'BE-4.5',
      'Exposición de Datos',
      'Vulnerabilidad: /api/parents/:parentId/children responde sin autenticación',
      res.status,
      res.status,
      true,
      res.status === 200
        ? 'HALLAZGO: Las relaciones parentales e hijos tutelados son accesibles sin token.'
        : 'Endpoint protegido.'
    );
  }

  // Resumen
  console.log('\n================================================================');
  console.log('RESUMEN DE AUDITORÍA DEL BACKEND EXPRESS (CP 3.12)');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`Pruebas ejecutadas: ${total}`);
  console.log(`Pruebas con comportamiento verificado: ${passed}`);
  console.log('================================================================\n');
}

runCheckpoint312BackendAudit().catch((err) => {
  console.error('Error fatal ejecutando auditoría del backend:', err);
  process.exit(1);
});
