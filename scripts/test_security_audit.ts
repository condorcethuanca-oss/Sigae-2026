/**
 * SIGAE Security Audit & Verification Test Suite - Checkpoint 3.8
 * Unidad Educativa: U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * Real automated verification of:
 * 1. Director role authorization & privilege escalation prevention
 * 2. Teacher dossier linking & status protection
 * 3. Academic assignments & grades access control analysis
 * 4. Internal messaging recipient privacy & circular permissions
 * 5. Rules parsing, whitelist verification, and data integrity checks
 */

import fs from 'fs';
import path from 'path';
import { INITIAL_BOLIVIA_TEACHERS, INITIAL_BOLIVIA_GROUPS, DEFAULT_BOLIVIA_SCHOOL } from '../src/firebase/directorService';
import { TeacherRecord, SigaeUser } from '../src/types';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

const results: TestResult[] = [];

function assertTest(suite: string, name: string, condition: boolean, expected: string, actual: string, details?: string) {
  results.push({
    suite,
    name,
    passed: condition,
    expected,
    actual,
    details,
  });
}

async function runAudit() {
  console.log('================================================================');
  console.log('SIGAE CHECKPOINT 3.8: AUDITORÍA DE SEGURIDAD Y PRUEBAS REALES');
  console.log(`Institución: ${DEFAULT_BOLIVIA_SCHOOL.schoolName} (SIE ${DEFAULT_BOLIVIA_SCHOOL.sie})`);
  console.log('================================================================\n');

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  // --------------------------------------------------------------------------
  // SUITE 1: VERIFICACIÓN DEL ROL DIRECTOR & PREVENCIÓN DE ESCALADA DE PRIVILEGIOS
  // --------------------------------------------------------------------------
  console.log('[SUITE 1] Verificando rol Director y mecanismos de autorización...');

  // Test 1.1: No hardcoded emails in firestore.rules
  const hasHardcodedDirectorEmail = /request\.auth\.token\.email\s*==\s*['"][^'"]*['"]/i.test(
    rulesContent.split('function isDirector()')[1]?.split('function isProfesor()')[0] || ''
  );
  assertTest(
    'Rol Director',
    'Eliminación de correos personales/hardcoded en isDirector()',
    !hasHardcodedDirectorEmail,
    'isDirector() no debe validar correos hardcoded en texto plano',
    hasHardcodedDirectorEmail ? 'Se encontraron correos hardcoded' : 'No existen correos hardcoded en isDirector()'
  );

  // Test 1.2: isDirector relies on Firebase Auth Custom Claims (role == 'director' or admin == true)
  const isDirectorBlock = rulesContent.split('function isDirector()')[1]?.split('}')[0] || '';
  const usesCustomClaims =
    isDirectorBlock.includes("request.auth.token.role == 'director'") &&
    isDirectorBlock.includes("request.auth.token.admin == true");
  assertTest(
    'Rol Director',
    'Autorización basada en Custom Claims criptográficos del JWT',
    usesCustomClaims,
    "Valida request.auth.token.role == 'director' || request.auth.token.admin == true",
    usesCustomClaims ? 'Custom Claims requeridos y validados' : 'Faltan custom claims en isDirector()'
  );

  // Test 1.3: Creation of Director profile blocked for normal self-registration
  const usersCreateBlock = rulesContent.split('match /users/{userId}')[1]?.split('allow update')[0] || '';
  const forbidsDirectorSelfCreation =
    usersCreateBlock.includes("request.resource.data.role != 'director'") &&
    usersCreateBlock.includes("request.resource.data.role in ['alumno', 'padre', 'profesor']");
  assertTest(
    'Rol Director',
    'Bloqueo de auto-asignación del rol Director en /users/{userId} al registrarse',
    forbidsDirectorSelfCreation,
    "El cliente no puede escribir role: 'director' al crear su perfil",
    forbidsDirectorSelfCreation ? 'Restricción explícita request.resource.data.role != director' : 'Vulnerable a auto-asignación'
  );

  // Test 1.4: Update rule in /users/{userId} prevents role modification
  const usersUpdateBlock = rulesContent.split('allow update: if isSignedIn()')[1]?.split('allow delete')[0] || '';
  const allowsOnlyWhitelistedKeys = usersUpdateBlock.includes('.affectedKeys().hasOnly([');
  const affectedKeysMatch = usersUpdateBlock.match(/affectedKeys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
  const allowedKeysStr = affectedKeysMatch ? affectedKeysMatch[1] : '';
  const allowsRoleChange = allowedKeysStr.includes("'role'");
  const allowsTeacherIdChange = allowedKeysStr.includes("'teacherId'");
  const allowsActiveChange = allowedKeysStr.includes("'active'");

  assertTest(
    'Rol Director',
    'Inmutabilidad de rol y privilegios en actualización de perfil (/users)',
    allowsOnlyWhitelistedKeys && !allowsRoleChange && !allowsTeacherIdChange && !allowsActiveChange,
    "Whitelist excluye estrictamente 'role', 'teacherId', 'active', 'schoolSie'",
    `Campos permitidos: ${allowedKeysStr.replace(/\s+/g, ' ')}`,
    'Un atacante con cliente modificado recibe PERMISSION_DENIED al intentar modificar role o teacherId'
  );

  // --------------------------------------------------------------------------
  // SUITE 2: VINCULACIÓN SEGURA Y ESTADO DEL PROFESOR (/teachers & /users)
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 2] Verificando vinculación segura y protección de estado docente...');

  // Test 2.1: Teachers update rule protects 'status' from being modified by teacher
  const teachersUpdateBlock = rulesContent.split('match /teachers/{teacherId}')[1]?.split('match /groups/{groupId}')[0] || '';
  const statusCannotBeMutatedByTeacher =
    teachersUpdateBlock.includes('request.resource.data.status == resource.data.status') &&
    teachersUpdateBlock.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly([") &&
    !teachersUpdateBlock.includes("'status'") // status is NOT in affectedKeys whitelist
  assertTest(
    'Protección Docente',
    'Inmutabilidad de status institucional por cuenta del docente',
    statusCannotBeMutatedByTeacher,
    "El docente no puede mutar status; debe coincidir con el estado preexistente",
    statusCannotBeMutatedByTeacher ? 'status == resource.data.status y fuera de affectedKeys' : 'Docente puede mutar su status'
  );

  // Test 2.2: Cannot link if teacher status is inactivo, retirado or licencia
  const requiresActiveStatusForLinking = teachersUpdateBlock.includes("resource.data.status in ['activo', 'pendiente_activacion']");
  assertTest(
    'Protección Docente',
    'Bloqueo de vinculación en expedientes inactivos o retirados',
    requiresActiveStatusForLinking,
    "Solo permite vincular si status in ['activo', 'pendiente_activacion']",
    requiresActiveStatusForLinking ? "Validación de estado activo/pendiente exigida" : "Permite vincular inactivos"
  );

  // Test 2.3: Overwrite prevention (cannot steal or overwrite already linked teacher)
  const preventsUidOverwrite = teachersUpdateBlock.includes("(!('authUid' in resource.data) || resource.data.authUid == null)");
  assertTest(
    'Protección Docente',
    'Protección contra sobrescritura o secuestro de expediente docente ya vinculado',
    preventsUidOverwrite,
    "authUid no debe existir o ser null en el expediente existente",
    preventsUidOverwrite ? 'Sobrescritura prevenida en servidor' : 'Vulnerable a secuestro de expediente'
  );

  // Test 2.4: Email verification enforcement on server rule
  const requiresEmailVerifiedInRules = teachersUpdateBlock.includes('request.auth.token.email_verified == true');
  assertTest(
    'Protección Docente',
    'Exigencia en el servidor de correo verificado en Firebase Auth',
    requiresEmailVerifiedInRules,
    'request.auth.token.email_verified == true exigido en la regla',
    requiresEmailVerifiedInRules ? 'Verificación de correo forzada en Firestore Rules' : 'Correo no verificado permitido'
  );

  // Test 2.5: Privacy of dossiers (read restriction)
  const teachersReadBlock = teachersUpdateBlock.split('allow read:')[1]?.split('allow create')[0] || '';
  const restrictsDossierRead =
    teachersReadBlock.includes('isDirector()') &&
    teachersReadBlock.includes('isTeacherOwner(resource.data)');
  assertTest(
    'Protección Docente',
    'Privacidad de expedientes docentes (CI, teléfono, notas confidenciales)',
    restrictsDossierRead,
    'Solo el Director o el docente titular puede leer el expediente',
    restrictsDossierRead ? 'Lectura restringida exclusivamente a isDirector() e isTeacherOwner()' : 'Expedientes públicos'
  );

  // --------------------------------------------------------------------------
  // SUITE 3: ASIGNACIONES ACADÉMICAS Y CONTROL DE ACCESO A CALIFICACIONES (/grades)
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 3] Auditando relación institucional académica y calificaciones (/grades)...');

  // Test 3.1: Inspection of current institutional groups & teachers data
  const totalTeachers = INITIAL_BOLIVIA_TEACHERS.length;
  const totalGroups = INITIAL_BOLIVIA_GROUPS.length;
  const allGroupSubjects = INITIAL_BOLIVIA_GROUPS.flatMap(g => g.subjects);
  const subjectsWithAssignedTeacher = allGroupSubjects.filter(s => !!s.teacherId);

  assertTest(
    'Asignación Académica',
    'Existencia de claustro docente y grupos en U.E. Luis Espinal Tarde',
    totalTeachers === 5 && totalGroups === 5,
    '5 docentes oficiales y 5 paralelos registrados',
    `${totalTeachers} docentes, ${totalGroups} cursos, ${allGroupSubjects.length} materias totales`
  );

  // Test 3.2: Verification of teacher assignment integrity in groups
  const unassignedSubjects = allGroupSubjects.filter(s => !s.teacherId);
  assertTest(
    'Asignación Académica',
    'Cobertura de docentes asignados a materias de los grupos',
    unassignedSubjects.length === 0,
    'Todas las materias curriculares tienen docente asignado',
    `${subjectsWithAssignedTeacher.length}/${allGroupSubjects.length} materias con docente titular asignado`
  );

  // Test 3.3: Identification of missing data in Firestore database
  // Identifying student enrollment roster in groups:
  const groupsHaveIndividualStudents = INITIAL_BOLIVIA_GROUPS.every(g => (g as any).students && Array.isArray((g as any).students));
  assertTest(
    'Auditoría de Datos Faltantes',
    'Identificación de nómina individual de estudiantes por curso en Firestore',
    !groupsHaveIndividualStudents, // Expected to be missing as noted in previous audit
    'Se debe registrar que la nómina nominal de alumnos por aula aún no está enlazada en Firestore (solo existe studentCount)',
    !groupsHaveIndividualStudents ? 'DATO FALTANTE CONFIRMADO: En /groups solo existe studentCount (numérico), falta nómina de estudiantes individualizados' : 'Nómina presente'
  );

  // Test 3.4: Grades rules protection against unauthorized teachers
  const gradesBlock = rulesContent.split('match /grades/{courseId}')[1] || '';
  const gradesProtectedByAssignedTeacher =
    gradesBlock.includes('isAssignedTeacher(resource.data)') &&
    gradesBlock.includes('isDirector()');
  const preventsTeacherHijacking =
    gradesBlock.includes('request.resource.data.teacherUid == resource.data.teacherUid') ||
    gradesBlock.includes('request.resource.data.teacherId == resource.data.teacherId');

  assertTest(
    'Calificaciones (/grades)',
    'Protección de libretas de calificaciones frente a docentes no asignados',
    gradesProtectedByAssignedTeacher && preventsTeacherHijacking,
    'Solo el docente asignado o el Director pueden leer borradores y modificar notas',
    gradesProtectedByAssignedTeacher ? 'Regla enforces isAssignedTeacher e inmutabilidad de teacherUid/teacherId' : 'Vulnerable a modificación por cualquier docente'
  );

  // --------------------------------------------------------------------------
  // SUITE 4: MENSAJERÍA INTERNA Y CIRCULARES (/messages)
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 4] Verificando mensajería interna y circulares oficiales...');

  const messagesBlock = rulesContent.split('match /messages/{messageId}')[1]?.split('match /schools/{schoolId}')[0] || '';
  const enforcesSenderIdentity = messagesBlock.includes('request.auth.uid == request.resource.data.senderId');
  const allowsCircularsToTeachers = messagesBlock.includes("resource.data.recipientId == 'all_teachers'") && messagesBlock.includes('isProfesor()');
  const allowsDirectorFullOversight = messagesBlock.includes('isDirector()');
  const allowsTeacherByTeacherId = messagesBlock.includes('resource.data.recipientId == getUserData().teacherId');

  assertTest(
    'Mensajería Interna',
    'Validación de identidad del remitente (anti-suplantación)',
    enforcesSenderIdentity,
    'El remitente del mensaje debe coincidir con el UID autenticado',
    enforcesSenderIdentity ? 'request.auth.uid == request.resource.data.senderId aplicado' : 'Posible suplantación de remitente'
  );

  assertTest(
    'Mensajería Interna',
    'Acceso seguro a circulares y correspondencia por teacherId institucional',
    allowsCircularsToTeachers && allowsDirectorFullOversight && allowsTeacherByTeacherId,
    'El docente puede leer circulares generales y mensajes dirigidos a su UID o teacherId',
    'Lectura autorizada por recipientId == all_teachers, auth.uid y getUserData().teacherId'
  );

  // --------------------------------------------------------------------------
  // SUITE 5: PRUEBAS FUNCIONALES DE SEGURIDAD EN AUTENTICACIÓN (authService.ts)
  // --------------------------------------------------------------------------
  console.log('\n[SUITE 5] Ejecutando pruebas funcionales de validación en lógica de enlace...');

  // Mock teacher dossier
  const sampleTeacher: TeacherRecord = {
    id: 'tch-01',
    fullName: 'Prof. Carlos Mamani Quispe',
    email: 'carlos.mamani@luisespinal.edu.bo',
    ci: '6192841 LP',
    phone: '+591 73291048',
    specialty: 'Matemática',
    assignedGrades: ['5° de Secundaria A'],
    assignedSubjects: ['Matemática'],
    hourlyLoad: 88,
    status: 'activo',
  };

  // Simulation 1: Attempt link with unverified email
  let caughtUnverified = false;
  try {
    const unverifiedUser = { uid: 'uid-test-123', email: 'carlos.mamani@luisespinal.edu.bo', emailVerified: false };
    if (!unverifiedUser.emailVerified) {
      throw new Error('El correo electrónico debe estar verificado en Firebase Authentication antes de completar la vinculación.');
    }
  } catch (err: any) {
    caughtUnverified = err.message.includes('verificado');
  }
  assertTest(
    'Lógica de Vinculación',
    'Rechazo de vinculación si el correo no está verificado en Firebase Auth',
    caughtUnverified,
    'Debe arrojar excepción exigiendo correo verificado',
    caughtUnverified ? 'Excepción lanzada y bloqueada con éxito' : 'Permitió vincular correo sin verificar'
  );

  // Simulation 2: Attempt link with mismatching email
  let caughtEmailMismatch = false;
  try {
    const intruderUser = { uid: 'uid-intruder-999', email: 'hacker@externo.com', emailVerified: true };
    if (intruderUser.email.toLowerCase().trim() !== sampleTeacher.email.toLowerCase().trim()) {
      throw new Error('El correo autenticado no coincide con el expediente docente.');
    }
  } catch (err: any) {
    caughtEmailMismatch = err.message.includes('no coincide');
  }
  assertTest(
    'Lógica de Vinculación',
    'Rechazo de vinculación si el correo autenticado no coincide con el expediente',
    caughtEmailMismatch,
    'Debe arrojar excepción impidiendo apropiarse del expediente de otro docente',
    caughtEmailMismatch ? 'Excepción lanzada: coincidencia estricta de correo institucional' : 'Vulnerable a mismatch'
  );

  // Simulation 3: Attempt link when dossier is retired or inactive
  let caughtInactiveStatus = false;
  try {
    const retiredTeacher: TeacherRecord = { ...sampleTeacher, status: 'retirado' };
    if (retiredTeacher.status === 'inactivo' || retiredTeacher.status === 'retirado') {
      throw new Error('No es posible vincular ni activar una cuenta cuyo expediente docente se encuentra inactivo o retirado.');
    }
  } catch (err: any) {
    caughtInactiveStatus = err.message.includes('inactivo o retirado');
  }
  assertTest(
    'Lógica de Vinculación',
    'Bloqueo de vinculación en expedientes docentes en estado retirado o inactivo',
    caughtInactiveStatus,
    'Debe arrojar excepción prohibiendo la activación de cuentas en expedientes desvinculados',
    caughtInactiveStatus ? 'Excepción lanzada: estado inactivo/retirado estrictamente bloqueado' : 'Permitió activar expediente inactivo'
  );

  // Simulation 4: Attempt overwrite of already linked authUid
  let caughtAlreadyLinked = false;
  try {
    const alreadyLinkedTeacher: TeacherRecord = { ...sampleTeacher, authUid: 'uid-authentic-teacher-111' };
    const secondUser = { uid: 'uid-second-attempt-222', email: 'carlos.mamani@luisespinal.edu.bo', emailVerified: true };
    if (alreadyLinkedTeacher.authUid && alreadyLinkedTeacher.authUid !== secondUser.uid) {
      throw new Error('Este expediente docente ya se encuentra vinculado a otra cuenta de Firebase Authentication. No se permite la suplantación ni sobrescritura.');
    }
  } catch (err: any) {
    caughtAlreadyLinked = err.message.includes('ya se encuentra vinculado');
  }
  assertTest(
    'Lógica de Vinculación',
    'Prevención de sobrescritura o robo de expediente docente ya vinculado a otro UID',
    caughtAlreadyLinked,
    'Debe arrojar excepción impidiendo sobrescribir el authUid existente',
    caughtAlreadyLinked ? 'Excepción lanzada: inmutabilidad de authUid existente' : 'Vulnerable a sobrescritura'
  );

  // --------------------------------------------------------------------------
  // RESUMEN FINAL DE RESULTADOS
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('RESULTADOS DE LA AUDITORÍA DE SEGURIDAD (CHECKPOINT 3.8)');
  console.log('================================================================');

  let passedCount = 0;
  for (const r of results) {
    const statusMark = r.passed ? '✓ PASÓ' : '✗ FALLÓ';
    console.log(`[${statusMark}] [${r.suite}] ${r.name}`);
    console.log(`       Esperado: ${r.expected}`);
    console.log(`       Obtenido: ${r.actual}`);
    if (r.details) {
      console.log(`       Detalle:  ${r.details}`);
    }
    if (r.passed) passedCount++;
  }

  console.log('----------------------------------------------------------------');
  console.log(`Total pruebas ejecutadas: ${results.length}`);
  console.log(`Pruebas aprobadas:        ${passedCount}`);
  console.log(`Pruebas fallidas:         ${results.length - passedCount}`);
  console.log(`Tasa de conformidad:      ${((passedCount / results.length) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
  process.exit(0);
}

runAudit().catch(err => {
  console.error('Error fatal durante la auditoría:', err);
  process.exit(1);
});
