/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * CHECKPOINT 3.10: VALIDACIÓN TÉCNICA CON FIREBASE EMULATOR SUITE
 *
 * Este conjunto de pruebas ejecuta operaciones REALES contra la instancia local de
 * Cloud Firestore Emulator, evaluando el archivo real `firestore.rules`.
 * Ninguna regla ni condición es simulada con funciones locales TypeScript.
 * Se utilizan las librerías oficiales `@firebase/rules-unit-testing` y `firebase/firestore`.
 */

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
} from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

interface TestCaseResult {
  id: string;
  category: string;
  description: string;
  expected: 'PERMITIDO' | 'DENEGADO (PERMISSION_DENIED)';
  actual: 'PERMITIDO' | 'DENEGADO (PERMISSION_DENIED)' | 'ERROR_INESPERADO';
  passed: boolean;
  details?: string;
}

const testResults: TestCaseResult[] = [];

function recordResult(
  id: string,
  category: string,
  description: string,
  expected: 'PERMITIDO' | 'DENEGADO (PERMISSION_DENIED)',
  actual: 'PERMITIDO' | 'DENEGADO (PERMISSION_DENIED)' | 'ERROR_INESPERADO',
  details?: string
) {
  const passed = expected === actual;
  testResults.push({
    id,
    category,
    description,
    expected,
    actual,
    passed,
    details,
  });
  const icon = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`  [${icon}] [${id}] ${description}`);
  if (!passed && details) {
    console.log(`         Detalle: ${details}`);
  }
}

async function runEmulatorTestSuite() {
  console.log('================================================================');
  console.log('SIGAE CHECKPOINT 3.10 — EJECUCIÓN CON FIREBASE EMULATOR SUITE');
  console.log('Institución: U.E. Luis Espinal Tarde de Collpani (SIE 80730142)');
  console.log('Motor de Reglas: Cloud Firestore Rules Engine (v2) en Emulador');
  console.log('================================================================\n');

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Archivo no encontrado: ${rulesPath}`);
  }
  const rules = fs.readFileSync(rulesPath, 'utf8');

  const storageRulesPath = path.resolve(process.cwd(), 'storage.rules');
  if (!fs.existsSync(storageRulesPath)) {
    throw new Error(`Archivo no encontrado: ${storageRulesPath}`);
  }
  const storageRules = fs.readFileSync(storageRulesPath, 'utf8');

  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'sigae-emulator-validation-80730142',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8085,
    },
    storage: {
      rules: storageRules,
      host: '127.0.0.1',
      port: 9199,
    },
  });

  console.log('✔ Entorno de emulador inicializado correctamente con `firestore.rules` y `storage.rules`.\n');

  try {
    // -------------------------------------------------------------------------
    // FASE 0: PREPARACIÓN DE DATOS SEMILLA AISLADOS (Modo Administrador Seguro)
    // -------------------------------------------------------------------------
    console.log('[FASE 0] Sembrando datos de prueba institucionales aislados...');
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const db = adminContext.firestore();

      // Configuración de la Unidad Educativa
      await setDoc(doc(db, 'schools', 'sec-80730142'), {
        schoolName: 'U.E. Luis Espinal Tarde de Collpani',
        sie: '80730142',
        shift: 'tarde',
        department: 'La Paz',
        district: 'El Alto 1',
        activeYear: 2026,
      });

      // Perfiles de usuario base (/users)
      await setDoc(doc(db, 'users', 'uid-dir-01'), {
        uid: 'uid-dir-01',
        email: 'director@espinal.edu.bo',
        displayName: 'Director Institucional',
        role: 'director',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-prof-01'), {
        uid: 'uid-prof-01',
        email: 'carlos.mamani@espinal.edu.bo',
        displayName: 'Prof. Carlos Mamani Quispe',
        role: 'profesor',
        teacherId: 'tch-01',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-prof-02'), {
        uid: 'uid-prof-02',
        email: 'elena.choquehuanca@espinal.edu.bo',
        displayName: 'Profa. Elena Choquehuanca Flores',
        role: 'profesor',
        teacherId: 'tch-02',
        active: true,
        schoolSie: '80730142',
      });

      // Perfil docente inactivo
      await setDoc(doc(db, 'users', 'uid-prof-inactivo'), {
        uid: 'uid-prof-inactivo',
        email: 'docente.inactivo@espinal.edu.bo',
        displayName: 'Prof. Retirado Mamani',
        role: 'profesor',
        teacherId: 'tch-inactivo',
        active: false,
        status: 'inactivo',
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-alumno-01'), {
        uid: 'uid-alumno-01',
        email: 'juan.perez@espinal.edu.bo',
        displayName: 'Juan Pérez Condori',
        role: 'alumno',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-alumno-02'), {
        uid: 'uid-alumno-02',
        email: 'maria.quispe@espinal.edu.bo',
        displayName: 'María Quispe Mamani',
        role: 'alumno',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-padre-01'), {
        uid: 'uid-padre-01',
        email: 'pedro.perez@gmail.com',
        displayName: 'Pedro Pérez (Padre Juan)',
        role: 'padre',
        childUid: 'uid-alumno-01',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-padre-02'), {
        uid: 'uid-padre-02',
        email: 'rosa.quispe@gmail.com',
        displayName: 'Rosa Mamani (Madre María)',
        role: 'padre',
        childUid: 'uid-alumno-02',
        active: true,
        schoolSie: '80730142',
      });

      // Expedientes docentes en /teachers
      await setDoc(doc(db, 'teachers', 'tch-01'), {
        id: 'tch-01',
        teacherId: 'tch-01',
        fullName: 'Prof. Carlos Mamani Quispe',
        email: 'carlos.mamani@espinal.edu.bo',
        authUid: 'uid-prof-01',
        ci: '4891023 LP',
        phone: '+591 73291048',
        specialty: 'Matemática y Física',
        status: 'activo',
        assignedGrades: ['4°', '5°', '6°'],
        assignedSubjects: ['Matemática'],
        hourlyLoad: 88,
        confidentialNotes: 'Expediente docente institucional auditado',
      });

      await setDoc(doc(db, 'teachers', 'tch-02'), {
        id: 'tch-02',
        teacherId: 'tch-02',
        fullName: 'Profa. Elena Choquehuanca Flores',
        email: 'elena.choquehuanca@espinal.edu.bo',
        authUid: 'uid-prof-02',
        ci: '5120934 LP',
        phone: '+591 76543210',
        specialty: 'Lenguaje y Literatura',
        status: 'activo',
        assignedGrades: ['3°', '4°', '5°'],
        assignedSubjects: ['Comunicación y Lenguajes'],
        hourlyLoad: 96,
      });

      await setDoc(doc(db, 'teachers', 'tch-inactivo'), {
        id: 'tch-inactivo',
        teacherId: 'tch-inactivo',
        fullName: 'Prof. Retirado Mamani',
        email: 'docente.inactivo@espinal.edu.bo',
        authUid: 'uid-prof-inactivo',
        ci: '3910294 LP',
        phone: '+591 71000000',
        specialty: 'Artes Plásticas',
        status: 'inactivo',
        hourlyLoad: 0,
      });

      // Calificaciones /grades
      // 1. Matemáticas (Prof. Carlos Mamani / tch-01), PUBLICADA a la comunidad escolar, notas autorizadas para Alumno 1
      await setDoc(doc(db, 'grades', 'curso-matematica-5sec'), {
        courseId: 'curso-matematica-5sec',
        courseName: '5° Secundaria Matemática',
        subjectName: 'Matemática',
        teacherId: 'tch-01',
        teacherUid: 'uid-prof-01',
        isPublishedToSchool: true,
        authorizedStudentIds: ['uid-alumno-01'],
        students: [
          { studentId: 'uid-alumno-01', name: 'Juan Pérez', saber: 35, hacer: 35, decidir: 10, ser: 10, total: 90 },
        ],
      });

      // 2. Lenguaje (Profa. Elena / tch-02), BORRADOR PRIVADO (NO publicado)
      await setDoc(doc(db, 'grades', 'curso-lenguaje-4sec'), {
        courseId: 'curso-lenguaje-4sec',
        courseName: '4° Secundaria Lenguaje',
        subjectName: 'Comunicación y Lenguajes',
        teacherId: 'tch-02',
        teacherUid: 'uid-prof-02',
        isPublishedToSchool: false,
        authorizedStudentIds: ['uid-alumno-02'],
        students: [
          { studentId: 'uid-alumno-02', name: 'María Quispe', saber: 30, hacer: 30, decidir: 10, ser: 10, total: 80 },
        ],
      });

      // Mensajes en /messages
      await setDoc(doc(db, 'messages', 'msg-privado-docente-padre'), {
        id: 'msg-privado-docente-padre',
        senderId: 'uid-prof-01',
        recipientId: 'uid-padre-01',
        subject: 'Citación para entrega de libreta',
        body: 'Estimado Sr. Pérez, se solicita su presencia en dirección.',
      });

      await setDoc(doc(db, 'messages', 'msg-circular-docentes'), {
        id: 'msg-circular-docentes',
        senderId: 'uid-dir-01',
        recipientId: 'all_teachers',
        subject: 'Circular 04/2026 - Consejo de Profesores',
        body: 'Reunión de consejo de profesores el día viernes.',
      });
      // Solicitud de acceso institucional inicial
      await setDoc(doc(db, 'access_requests', 'req-alumno-01'), {
        requestId: 'req-alumno-01',
        uid: 'uid-alumno-01',
        requestedRole: 'alumno',
        status: 'pendiente',
        createdAt: '2026-03-01T10:00:00Z',
      });

      // Registro de auditoría inicial (inmutable)
      await setDoc(doc(db, 'audit_logs', 'log-init-01'), {
        logId: 'log-init-01',
        action: 'BOOT_SYSTEM',
        adminUid: '385JXeNTGcNrZvV2casb8ICaQvE2',
        timestamp: '2026-03-01T10:00:00Z',
        details: 'Arranque seguro del sistema SIGAE',
      });
    });
    console.log('✔ Base de datos semilla creada exitosamente en el emulador.\n');

    // Superadministrador oficial (único autorizado por UID)
    const superadminContext = testEnv.authenticatedContext('385JXeNTGcNrZvV2casb8ICaQvE2', {
      email: 'superadmin@espinal.edu.bo',
      email_verified: true,
    });
    const superadminDb = superadminContext.firestore();
    const superadminStorage = superadminContext.storage();

    // Contextos de prueba autenticados
    const dirContext = testEnv.authenticatedContext('uid-dir-01', {
      role: 'director',
      email: 'director@espinal.edu.bo',
      email_verified: true,
    });
    const dirDb = dirContext.firestore();
    const dirStorage = dirContext.storage();

    const prof1Context = testEnv.authenticatedContext('uid-prof-01', {
      role: 'profesor',
      teacherId: 'tch-01',
      email: 'carlos.mamani@espinal.edu.bo',
      email_verified: true,
    });
    const prof1Db = prof1Context.firestore();
    const prof1Storage = prof1Context.storage();

    const prof2Context = testEnv.authenticatedContext('uid-prof-02', {
      role: 'profesor',
      teacherId: 'tch-02',
      email: 'elena.choquehuanca@espinal.edu.bo',
      email_verified: true,
    });
    const prof2Db = prof2Context.firestore();
    const prof2Storage = prof2Context.storage();

    const profInactivoContext = testEnv.authenticatedContext('uid-prof-inactivo', {
      role: 'profesor',
      active: false,
      email: 'docente.inactivo@espinal.edu.bo',
      email_verified: true,
    });
    const profInactivoDb = profInactivoContext.firestore();

    const alumno1Context = testEnv.authenticatedContext('uid-alumno-01', {
      role: 'alumno',
      email: 'juan.perez@espinal.edu.bo',
      email_verified: true,
    });
    const alumno1Db = alumno1Context.firestore();
    const alumno1Storage = alumno1Context.storage();

    const alumno2Context = testEnv.authenticatedContext('uid-alumno-02', {
      role: 'alumno',
      email: 'maria.quispe@espinal.edu.bo',
      email_verified: true,
    });
    const alumno2Db = alumno2Context.firestore();
    const alumno2Storage = alumno2Context.storage();

    const padre1Context = testEnv.authenticatedContext('uid-padre-01', {
      role: 'padre',
      childUid: 'uid-alumno-01',
      email: 'pedro.perez@gmail.com',
      email_verified: true,
    });
    const padre1Db = padre1Context.firestore();
    const padre1Storage = padre1Context.storage();

    const padre2Context = testEnv.authenticatedContext('uid-padre-02', {
      role: 'padre',
      childUid: 'uid-alumno-02',
      email: 'rosa.quispe@gmail.com',
      email_verified: true,
    });
    const padre2Db = padre2Context.firestore();
    const padre2Storage = padre2Context.storage();

    const anonContext = testEnv.unauthenticatedContext();
    const anonDb = anonContext.firestore();
    const anonStorage = anonContext.storage();

    // =========================================================================
    // PRUEBA 1: PRIVACIDAD DE CALIFICACIONES ENTRE ALUMNOS
    // =========================================================================
    console.log('[SUITE 1] Prueba de privacidad de calificaciones entre estudiantes...');
    try {
      await assertFails(getDoc(doc(alumno2Db, 'grades', 'curso-matematica-5sec')));
      recordResult(
        'TC-1.1',
        'Calificaciones / Alumnos',
        'Alumno 2 intenta leer las notas publicadas de Alumno 1',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-1.1',
        'Calificaciones / Alumnos',
        'Alumno 2 intenta leer las notas publicadas de Alumno 1',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      await assertSucceeds(getDoc(doc(alumno1Db, 'grades', 'curso-matematica-5sec')));
      recordResult(
        'TC-1.2',
        'Calificaciones / Alumnos',
        'Alumno 1 consulta sus propias notas publicadas autorizadas',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-1.2',
        'Calificaciones / Alumnos',
        'Alumno 1 consulta sus propias notas publicadas autorizadas',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 2: PRIVACIDAD DE CALIFICACIONES PARA TUTORES / PADRES DE FAMILIA
    // =========================================================================
    console.log('[SUITE 2] Prueba de acceso a calificaciones por padres y apoderados...');
    try {
      await assertFails(getDoc(doc(padre2Db, 'grades', 'curso-matematica-5sec')));
      recordResult(
        'TC-2.1',
        'Calificaciones / Padres',
        'Padre 2 (hijo no vinculado) intenta leer libreta de Alumno 1',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-2.1',
        'Calificaciones / Padres',
        'Padre 2 (hijo no vinculado) intenta leer libreta de Alumno 1',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      await assertSucceeds(getDoc(doc(padre1Db, 'grades', 'curso-matematica-5sec')));
      recordResult(
        'TC-2.2',
        'Calificaciones / Padres',
        'Padre 1 (hijo legítimamente vinculado) lee notas de Alumno 1',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-2.2',
        'Calificaciones / Padres',
        'Padre 1 (hijo legítimamente vinculado) lee notas de Alumno 1',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 3: AISLAMIENTO DE ASIGNATURAS ENTRE PROFESORES
    // =========================================================================
    console.log('[SUITE 3] Prueba de materias no asignadas entre profesores...');
    try {
      // Prof 1 intenta leer libreta borrador de Lenguaje de Profa. Elena (Prof 2)
      await assertFails(getDoc(doc(prof1Db, 'grades', 'curso-lenguaje-4sec')));
      recordResult(
        'TC-3.1',
        'Materias No Asignadas',
        'Profesor 1 intenta leer libreta privada no asignada (Profesor 2)',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-3.1',
        'Materias No Asignadas',
        'Profesor 1 intenta leer libreta privada no asignada (Profesor 2)',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Prof 1 intenta modificar notas de la materia de Profa. Elena
      await assertFails(updateDoc(doc(prof1Db, 'grades', 'curso-lenguaje-4sec'), {
        subjectName: 'Materia Modificada por Intruso',
      }));
      recordResult(
        'TC-3.2',
        'Materias No Asignadas',
        'Profesor 1 intenta modificar calificaciones de materia no asignada',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-3.2',
        'Materias No Asignadas',
        'Profesor 1 intenta modificar calificaciones de materia no asignada',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Prof 2 (asignado legítimo) lee y actualiza su propia libreta
      await assertSucceeds(getDoc(doc(prof2Db, 'grades', 'curso-lenguaje-4sec')));
      await assertSucceeds(updateDoc(doc(prof2Db, 'grades', 'curso-lenguaje-4sec'), {
        courseName: '4° Secundaria Lenguaje y Literatura Actualizado',
      }));
      recordResult(
        'TC-3.3',
        'Materias No Asignadas',
        'Profesor 2 lee y actualiza su propia materia asignada',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-3.3',
        'Materias No Asignadas',
        'Profesor 2 lee y actualiza su propia materia asignada',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 4: PREVENCIÓN DE CREACIÓN DE LIBRETAS CON ASIGNACIÓN FALSIFICADA
    // =========================================================================
    console.log('[SUITE 4] Prueba de creación de libreta falsificando asignación...');
    try {
      // Prof 1 intenta crear libreta haciéndose pasar por Profa. Elena (tch-02 / uid-prof-02)
      await assertFails(setDoc(doc(prof1Db, 'grades', 'curso-falsificado-quimica'), {
        courseId: 'curso-falsificado-quimica',
        courseName: 'Química Falsificada',
        teacherId: 'tch-02',
        teacherUid: 'uid-prof-02',
        students: [],
      }));
      recordResult(
        'TC-4.1',
        'Falsificación de Asignación',
        'Docente 1 intenta crear libreta suplantando la asignación del Docente 2',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-4.1',
        'Falsificación de Asignación',
        'Docente 1 intenta crear libreta suplantando la asignación del Docente 2',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Prof 1 crea libreta declarando legítimamente su propio teacherUid y teacherId
      await assertSucceeds(setDoc(doc(prof1Db, 'grades', 'curso-matematica-6sec'), {
        courseId: 'curso-matematica-6sec',
        courseName: '6° Secundaria Matemática y Cálculo',
        teacherId: 'tch-01',
        teacherUid: 'uid-prof-01',
        students: [],
      }));
      recordResult(
        'TC-4.2',
        'Falsificación de Asignación',
        'Docente 1 crea libreta con su asignación docente legítima comprobada',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-4.2',
        'Falsificación de Asignación',
        'Docente 1 crea libreta con su asignación docente legítima comprobada',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 5: PREVENCIÓN DE ESCALADA DE PRIVILEGIOS AL ROL DIRECTOR
    // =========================================================================
    console.log('[SUITE 5] Prueba de escalada de privilegios al rol Director...');
    try {
      // Usuario común intenta modificar su propio perfil para asignarse role: director
      await assertFails(updateDoc(doc(alumno1Db, 'users', 'uid-alumno-01'), {
        role: 'director',
      }));
      recordResult(
        'TC-5.1',
        'Rol Director / Escalada',
        'Usuario intenta cambiar su rol a director mediante update en /users',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-5.1',
        'Rol Director / Escalada',
        'Usuario intenta cambiar su rol a director mediante update en /users',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Usuario común intenta crear perfil nuevo asignándose role: director
      const randomUserContext = testEnv.authenticatedContext('uid-atacante-01', {
        email: 'atacante@gmail.com',
        email_verified: true,
      });
      await assertFails(setDoc(doc(randomUserContext.firestore(), 'users', 'uid-atacante-01'), {
        uid: 'uid-atacante-01',
        email: 'atacante@gmail.com',
        role: 'director',
      }));
      recordResult(
        'TC-5.2',
        'Rol Director / Escalada',
        'Usuario no autorizado intenta auto-registrarse con rol director',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-5.2',
        'Rol Director / Escalada',
        'Usuario no autorizado intenta auto-registrarse con rol director',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Usuario común actualiza sus campos permitidos (displayName, phone, ci)
      await assertSucceeds(updateDoc(doc(alumno1Db, 'users', 'uid-alumno-01'), {
        displayName: 'Juan Pérez Condori (Actualizado)',
        phone: '+591 79998877',
      }));
      recordResult(
        'TC-5.3',
        'Rol Director / Escalada',
        'Usuario común actualiza campos personales permitidos (whitelist)',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-5.3',
        'Rol Director / Escalada',
        'Usuario común actualiza campos personales permitidos (whitelist)',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 6: CONFIDENCIALIDAD DE EXPEDIENTES DOCENTES (/teachers)
    // =========================================================================
    console.log('[SUITE 6] Prueba de confidencialidad de expedientes docentes...');
    try {
      // Alumno intenta leer expediente de Profesor Carlos Mamani
      await assertFails(getDoc(doc(alumno1Db, 'teachers', 'tch-01')));
      recordResult(
        'TC-6.1',
        'Expedientes Docentes',
        'Alumno intenta leer expediente docente privado ajeno (/teachers/tch-01)',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-6.1',
        'Expedientes Docentes',
        'Alumno intenta leer expediente docente privado ajeno (/teachers/tch-01)',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Docente 2 intenta leer expediente de Docente 1
      await assertFails(getDoc(doc(prof2Db, 'teachers', 'tch-01')));
      recordResult(
        'TC-6.2',
        'Expedientes Docentes',
        'Docente 2 intenta leer expediente privado del Docente 1',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-6.2',
        'Expedientes Docentes',
        'Docente 2 intenta leer expediente privado del Docente 1',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Docente 1 consulta su propio expediente vinculado legítimo
      await assertSucceeds(getDoc(doc(prof1Db, 'teachers', 'tch-01')));
      recordResult(
        'TC-6.3',
        'Expedientes Docentes',
        'Docente 1 consulta su propio expediente docente vinculado',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-6.3',
        'Expedientes Docentes',
        'Docente 1 consulta su propio expediente docente vinculado',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 7: BLOQUEO DE DOCENTE INACTIVO / RETIRADO
    // =========================================================================
    console.log('[SUITE 7] Prueba de bloqueo de accesos para docente inactivo...');
    try {
      // Docente inactivo intenta leer expediente propio
      await assertFails(getDoc(doc(profInactivoDb, 'teachers', 'tch-inactivo')));
      recordResult(
        'TC-7.1',
        'Docente Inactivo',
        'Docente inactivo intenta leer expediente con status: inactivo',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-7.1',
        'Docente Inactivo',
        'Docente inactivo intenta leer expediente con status: inactivo',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Docente inactivo intenta crear o modificar libreta de notas
      await assertFails(setDoc(doc(profInactivoDb, 'grades', 'curso-artes-inactivo'), {
        courseId: 'curso-artes-inactivo',
        courseName: 'Artes Plásticas Inactivas',
        teacherId: 'tch-inactivo',
        teacherUid: 'uid-prof-inactivo',
      }));
      recordResult(
        'TC-7.2',
        'Docente Inactivo',
        'Docente inactivo intenta crear libreta de calificaciones',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-7.2',
        'Docente Inactivo',
        'Docente inactivo intenta crear libreta de calificaciones',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Docente inactivo intenta acceder a circular exclusiva para profesores activos (all_teachers)
      await assertFails(getDoc(doc(profInactivoDb, 'messages', 'msg-circular-docentes')));
      recordResult(
        'TC-7.3',
        'Docente Inactivo',
        'Docente inactivo intenta leer comunicaciones exclusivas all_teachers',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-7.3',
        'Docente Inactivo',
        'Docente inactivo intenta leer comunicaciones exclusivas all_teachers',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 8: PRIVACIDAD DE MENSAJERÍA DIRECTA (/messages)
    // =========================================================================
    console.log('[SUITE 8] Prueba de privacidad de mensajes privados e institucionales...');
    try {
      // Alumno intenta leer mensaje privado entre Profesor 1 y Padre 1
      await assertFails(getDoc(doc(alumno1Db, 'messages', 'msg-privado-docente-padre')));
      recordResult(
        'TC-8.1',
        'Mensajería Privada',
        'Usuario tercero ajeno intenta leer mensaje privado confidencial',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-8.1',
        'Mensajería Privada',
        'Usuario tercero ajeno intenta leer mensaje privado confidencial',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Destinatario legítimo (Padre 1) lee su mensaje
      await assertSucceeds(getDoc(doc(padre1Db, 'messages', 'msg-privado-docente-padre')));
      recordResult(
        'TC-8.2',
        'Mensajería Privada',
        'Destinatario legítimo consulta mensaje privado dirigido a su cuenta',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-8.2',
        'Mensajería Privada',
        'Destinatario legítimo consulta mensaje privado dirigido a su cuenta',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Remitente legítimo (Prof 1) lee el mensaje que envió
      await assertSucceeds(getDoc(doc(prof1Db, 'messages', 'msg-privado-docente-padre')));
      recordResult(
        'TC-8.3',
        'Mensajería Privada',
        'Remitente legítimo consulta mensaje emitido por su cuenta',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-8.3',
        'Mensajería Privada',
        'Remitente legítimo consulta mensaje emitido por su cuenta',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 9: OPERACIONES LEGÍTIMAS DEL DIRECTOR AUTORIZADO (Custom Claims)
    // =========================================================================
    console.log('[SUITE 9] Prueba de facultades administrativas del Director autorizado...');
    try {
      // Director lee cualquier expediente docente
      await assertSucceeds(getDoc(doc(dirDb, 'teachers', 'tch-01')));
      await assertSucceeds(getDoc(doc(dirDb, 'teachers', 'tch-02')));
      recordResult(
        'TC-9.1',
        'Director Autorizado',
        'Director consulta cualquier expediente docente de la planta institucional',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-9.1',
        'Director Autorizado',
        'Director consulta cualquier expediente docente de la planta institucional',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Director lee libretas de cualquier materia (incluso borradores privados)
      await assertSucceeds(getDoc(doc(dirDb, 'grades', 'curso-matematica-5sec')));
      await assertSucceeds(getDoc(doc(dirDb, 'grades', 'curso-lenguaje-4sec')));
      recordResult(
        'TC-9.2',
        'Director Autorizado',
        'Director consulta libretas académicas de cualquier curso o docente',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-9.2',
        'Director Autorizado',
        'Director consulta libretas académicas de cualquier curso o docente',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Director crea o actualiza calificaciones de cualquier materia
      await assertSucceeds(updateDoc(doc(dirDb, 'grades', 'curso-matematica-5sec'), {
        isPublishedToSchool: true,
        academicNote: 'Aprobado por Dirección Distrital',
      }));
      recordResult(
        'TC-9.3',
        'Director Autorizado',
        'Director realiza ajustes administrativos en calificaciones institucionales',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-9.3',
        'Director Autorizado',
        'Director realiza ajustes administrativos en calificaciones institucionales',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Director lee y supervisa todas las comunicaciones
      await assertSucceeds(getDoc(doc(dirDb, 'messages', 'msg-privado-docente-padre')));
      recordResult(
        'TC-9.4',
        'Director Autorizado',
        'Director supervisa comunicaciones institucionales de la unidad educativa',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-9.4',
        'Director Autorizado',
        'Director supervisa comunicaciones institucionales de la unidad educativa',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Director actualiza configuración oficial del colegio
      await assertSucceeds(updateDoc(doc(dirDb, 'schools', 'sec-80730142'), {
        district: 'El Alto 1 - Distrito Educativo Oficial',
      }));
      recordResult(
        'TC-9.5',
        'Director Autorizado',
        'Director actualiza configuración institucional en /schools',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-9.5',
        'Director Autorizado',
        'Director actualiza configuración institucional en /schools',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 10: PROTECCIÓN CONTRA ACCESOS ANÓNIMOS NO AUTENTICADOS
    // =========================================================================
    console.log('[SUITE 10] Prueba de denegación a usuarios anónimos o no autenticados...');
    try {
      await assertFails(getDoc(doc(anonDb, 'grades', 'curso-matematica-5sec')));
      await assertFails(getDoc(doc(anonDb, 'teachers', 'tch-01')));
      await assertFails(getDoc(doc(anonDb, 'messages', 'msg-privado-docente-padre')));
      recordResult(
        'TC-10.1',
        'Acceso Público / Anónimo',
        'Usuario no autenticado es bloqueado en calificaciones, docentes y mensajes',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult(
        'TC-10.1',
        'Acceso Público / Anónimo',
        'Usuario no autenticado es bloqueado en calificaciones, docentes y mensajes',
        'DENEGADO (PERMISSION_DENIED)',
        'ERROR_INESPERADO',
        err.message
      );
    }

    try {
      // Información pública del colegio es accesible (SIE, nombre)
      await assertSucceeds(getDoc(doc(anonDb, 'schools', 'sec-80730142')));
      recordResult(
        'TC-10.2',
        'Acceso Público / Anónimo',
        'Usuario anónimo consulta datos públicos institucionales en /schools',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult(
        'TC-10.2',
        'Acceso Público / Anónimo',
        'Usuario anónimo consulta datos públicos institucionales en /schools',
        'PERMITIDO',
        'ERROR_INESPERADO',
        err.message
      );
    }

    // =========================================================================
    // PRUEBA 11: PRIVILEGIOS DEL SUPERADMINISTRADOR OFICIAL (UID 385JXeNTGcNrZvV2casb8ICaQvE2)
    // =========================================================================
    console.log('[SUITE 11] Prueba de privilegios exclusivos del Superadministrador oficial...');
    try {
      // Superadmin lee cualquier perfil de usuario
      await assertSucceeds(getDoc(doc(superadminDb, 'users', 'uid-alumno-01')));
      recordResult(
        'TC-11.1',
        'Superadmin Oficial',
        'Superadmin consulta perfiles de usuario en /users',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-11.1', 'Superadmin Oficial', 'Superadmin consulta perfiles de usuario en /users', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Superadmin actualiza perfil y roles en /users
      await assertSucceeds(updateDoc(doc(superadminDb, 'users', 'uid-alumno-01'), {
        needsProfileCompletion: false,
        active: true,
      }));
      recordResult(
        'TC-11.2',
        'Superadmin Oficial',
        'Superadmin actualiza atributos institucionales en /users',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-11.2', 'Superadmin Oficial', 'Superadmin actualiza atributos institucionales en /users', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Superadmin lee expedientes docentes
      await assertSucceeds(getDoc(doc(superadminDb, 'teachers', 'tch-01')));
      recordResult(
        'TC-11.3',
        'Superadmin Oficial',
        'Superadmin consulta expedientes docentes en /teachers',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-11.3', 'Superadmin Oficial', 'Superadmin consulta expedientes docentes en /teachers', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Superadmin consulta libretas y calificaciones de cualquier materia
      await assertSucceeds(getDoc(doc(superadminDb, 'grades', 'curso-matematica-5sec')));
      recordResult(
        'TC-11.4',
        'Superadmin Oficial',
        'Superadmin consulta libretas de calificaciones en /grades',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-11.4', 'Superadmin Oficial', 'Superadmin consulta libretas de calificaciones en /grades', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Superadmin supervisa mensajes institucionales
      await assertSucceeds(getDoc(doc(superadminDb, 'messages', 'msg-privado-docente-padre')));
      recordResult(
        'TC-11.5',
        'Superadmin Oficial',
        'Superadmin supervisa mensajes institucionales en /messages',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-11.5', 'Superadmin Oficial', 'Superadmin supervisa mensajes institucionales en /messages', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Superadmin lee todas las solicitudes de acceso
      await assertSucceeds(getDoc(doc(superadminDb, 'access_requests', 'req-alumno-01')));
      recordResult(
        'TC-11.6',
        'Superadmin Oficial',
        'Superadmin consulta solicitudes de acceso en /access_requests',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-11.6', 'Superadmin Oficial', 'Superadmin consulta solicitudes de acceso en /access_requests', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Superadmin registra evento trazable de auditoría
      await assertSucceeds(setDoc(doc(superadminDb, 'audit_logs', 'log-superadmin-01'), {
        logId: 'log-superadmin-01',
        action: 'SUPERADMIN_AUDIT_CHECK',
        adminUid: '385JXeNTGcNrZvV2casb8ICaQvE2',
        timestamp: '2026-03-01T12:00:00Z',
        details: 'Verificación oficial de seguridad por Superadministrador',
      }));
      recordResult(
        'TC-11.7',
        'Superadmin Oficial',
        'Superadmin registra evento trazable en /audit_logs',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-11.7', 'Superadmin Oficial', 'Superadmin registra evento trazable en /audit_logs', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Superadmin lee registros de auditoría
      await assertSucceeds(getDoc(doc(superadminDb, 'audit_logs', 'log-superadmin-01')));
      recordResult(
        'TC-11.8',
        'Superadmin Oficial',
        'Superadmin consulta bitácora de auditoría en /audit_logs',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-11.8', 'Superadmin Oficial', 'Superadmin consulta bitácora de auditoría en /audit_logs', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // =========================================================================
    // PRUEBA 12: SOLICITUDES DE ACCESO INSTITUCIONAL (/access_requests/{requestId})
    // =========================================================================
    console.log('[SUITE 12] Prueba de solicitudes de acceso institucional (/access_requests)...');
    try {
      // Usuario común crea su propia solicitud en estado 'pendiente'
      await assertSucceeds(setDoc(doc(alumno2Db, 'access_requests', 'req-alumno-02'), {
        requestId: 'req-alumno-02',
        uid: 'uid-alumno-02',
        requestedRole: 'alumno',
        status: 'pendiente',
        createdAt: '2026-03-01T11:00:00Z',
      }));
      recordResult(
        'TC-12.1',
        'Solicitudes de Acceso',
        'Usuario común crea su propia solicitud legítima con status: pendiente',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-12.1', 'Solicitudes de Acceso', 'Usuario común crea su propia solicitud legítima con status: pendiente', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Usuario común intenta crear solicitud suplantando a otro UID
      await assertFails(setDoc(doc(alumno2Db, 'access_requests', 'req-falso-01'), {
        requestId: 'req-falso-01',
        uid: 'uid-dir-01',
        requestedRole: 'director',
        status: 'pendiente',
      }));
      recordResult(
        'TC-12.2',
        'Solicitudes de Acceso',
        'Intento de crear solicitud suplantando a otro usuario es bloqueado',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-12.2', 'Solicitudes de Acceso', 'Intento de crear solicitud suplantando a otro usuario es bloqueado', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Usuario común intenta crear solicitud directamente en estado 'aprobado'
      await assertFails(setDoc(doc(alumno2Db, 'access_requests', 'req-autoaprobado'), {
        requestId: 'req-autoaprobado',
        uid: 'uid-alumno-02',
        requestedRole: 'profesor',
        status: 'aprobado',
      }));
      recordResult(
        'TC-12.3',
        'Solicitudes de Acceso',
        'Intento de crear solicitud auto-aprobada es inmediatamente bloqueado',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-12.3', 'Solicitudes de Acceso', 'Intento de crear solicitud auto-aprobada es inmediatamente bloqueado', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque crítico: Solicitante intenta auto-aprobar su solicitud modificando su propio documento
      await assertFails(updateDoc(doc(alumno1Db, 'access_requests', 'req-alumno-01'), {
        status: 'aprobado',
        assignedRole: 'director',
      }));
      recordResult(
        'TC-12.4',
        'Solicitudes de Acceso',
        'Solicitante que intenta auto-aprobar o modificar su solicitud es bloqueado',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-12.4', 'Solicitudes de Acceso', 'Solicitante que intenta auto-aprobar o modificar su solicitud es bloqueado', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Solicitante consulta legítimamente su propia solicitud
      await assertSucceeds(getDoc(doc(alumno1Db, 'access_requests', 'req-alumno-01')));
      recordResult(
        'TC-12.5',
        'Solicitudes de Acceso',
        'Solicitante consulta el estado de su propia solicitud de acceso',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-12.5', 'Solicitudes de Acceso', 'Solicitante consulta el estado de su propia solicitud de acceso', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Usuario común intenta ver la solicitud de otro usuario
      await assertFails(getDoc(doc(alumno2Db, 'access_requests', 'req-alumno-01')));
      recordResult(
        'TC-12.6',
        'Solicitudes de Acceso',
        'Usuario común es bloqueado al intentar ver solicitud de acceso ajena',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-12.6', 'Solicitudes de Acceso', 'Usuario común es bloqueado al intentar ver solicitud de acceso ajena', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Director institucional aprueba formalmente la solicitud
      await assertSucceeds(updateDoc(doc(dirDb, 'access_requests', 'req-alumno-01'), {
        status: 'aprobado',
        resolvedBy: 'uid-dir-01',
        resolvedAt: '2026-03-01T12:00:00Z',
      }));
      recordResult(
        'TC-12.7',
        'Solicitudes de Acceso',
        'Director institucional resuelve y aprueba formalmente solicitud de acceso',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-12.7', 'Solicitudes de Acceso', 'Director institucional resuelve y aprueba formalmente solicitud de acceso', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // =========================================================================
    // PRUEBA 13: BITÁCORA DE AUDITORÍA Y TRAZABILIDAD INMUTABLE (/audit_logs/{logId})
    // =========================================================================
    console.log('[SUITE 13] Prueba de bitácora de auditoría y trazabilidad inmutable (/audit_logs)...');
    try {
      // Director registra evento trazable de auditoría
      await assertSucceeds(setDoc(doc(dirDb, 'audit_logs', 'log-dir-01'), {
        logId: 'log-dir-01',
        action: 'RESOLVE_ACCESS_REQUEST',
        adminUid: 'uid-dir-01',
        timestamp: '2026-03-01T12:05:00Z',
        details: 'Aprobación formal de solicitud de acceso institucional',
      }));
      recordResult(
        'TC-13.1',
        'Bitácora de Auditoría',
        'Director institucional registra evento trazable en /audit_logs',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-13.1', 'Bitácora de Auditoría', 'Director institucional registra evento trazable en /audit_logs', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Usuario común intenta inyectar log en /audit_logs
      await assertFails(setDoc(doc(alumno1Db, 'audit_logs', 'log-fake-01'), {
        logId: 'log-fake-01',
        action: 'FAKE_LOG',
        adminUid: 'uid-alumno-01',
      }));
      recordResult(
        'TC-13.2',
        'Bitácora de Auditoría',
        'Usuario común es bloqueado al intentar registrar eventos en /audit_logs',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-13.2', 'Bitácora de Auditoría', 'Usuario común es bloqueado al intentar registrar eventos en /audit_logs', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Usuario común intenta leer la bitácora de auditoría
      await assertFails(getDoc(doc(alumno1Db, 'audit_logs', 'log-init-01')));
      recordResult(
        'TC-13.3',
        'Bitácora de Auditoría',
        'Usuario común es bloqueado al intentar leer la bitácora en /audit_logs',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-13.3', 'Bitácora de Auditoría', 'Usuario común es bloqueado al intentar leer la bitácora en /audit_logs', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Inmutabilidad absoluta: Intento de modificar un registro de auditoría existente
      await assertFails(updateDoc(doc(dirDb, 'audit_logs', 'log-init-01'), {
        details: 'Intento de alteración de trazabilidad histórica',
      }));
      recordResult(
        'TC-13.4',
        'Bitácora de Auditoría',
        'Inmutabilidad verificada: Intento de modificar registro de auditoría es bloqueado',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-13.4', 'Bitácora de Auditoría', 'Inmutabilidad verificada: Intento de modificar registro de auditoría es bloqueado', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Inmutabilidad absoluta: Intento de eliminar un registro de auditoría existente
      await assertFails(deleteDoc(doc(superadminDb, 'audit_logs', 'log-init-01')));
      recordResult(
        'TC-13.5',
        'Bitácora de Auditoría',
        'Inmutabilidad verificada: Intento de borrar registro de auditoría es bloqueado',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-13.5', 'Bitácora de Auditoría', 'Inmutabilidad verificada: Intento de borrar registro de auditoría es bloqueado', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // =========================================================================
    // PRUEBA 14: CLOUD STORAGE EMULATOR CON RUTAS REALES DEL SERVICIO DE CARGA
    // =========================================================================
    console.log('[SUITE 14] Prueba de Cloud Storage Emulator con rutas reales de subida...');
    const dummyImage = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // Cabecera PNG válida
    const dummyPdf = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]); // Cabecera PDF válida

    try {
      // Director sube firma institucional oficial a /sigae/director/signatures/
      const dirSigRef = ref(dirStorage, 'sigae/director/signatures/firma_directora.png');
      await assertSucceeds(uploadBytes(dirSigRef, dummyImage, { contentType: 'image/png' }));
      recordResult(
        'TC-14.1',
        'Cloud Storage',
        'Director sube firma directiva oficial a /sigae/director/signatures/',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-14.1', 'Cloud Storage', 'Director sube firma directiva oficial a /sigae/director/signatures/', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Docente o alumno intenta subir archivo a /sigae/director/signatures/
      const fakeDirSigRef = ref(prof1Storage, 'sigae/director/signatures/firma_falsa.png');
      await assertFails(uploadBytes(fakeDirSigRef, dummyImage, { contentType: 'image/png' }));
      recordResult(
        'TC-14.2',
        'Cloud Storage',
        'Intento no directivo de subir firma a /sigae/director/signatures/ es bloqueado',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-14.2', 'Cloud Storage', 'Intento no directivo de subir firma a /sigae/director/signatures/ es bloqueado', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Docente titular verificado (tch-01) sube su firma a su ruta propia
      const teacherSigRef = ref(prof1Storage, 'sigae/teachers/tch-01/signatures/carlos_mamani_firma.png');
      await assertSucceeds(uploadBytes(teacherSigRef, dummyImage, { contentType: 'image/png' }));
      recordResult(
        'TC-14.3',
        'Cloud Storage',
        'Docente titular verificado sube su firma a /sigae/teachers/{teacherId}/signatures/',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-14.3', 'Cloud Storage', 'Docente titular verificado sube su firma a /sigae/teachers/{teacherId}/signatures/', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Docente 2 intenta modificar o escribir en la carpeta de firma del Docente 1
      const teacherSigAlienRef = ref(prof2Storage, 'sigae/teachers/tch-01/signatures/firma_suplantada.png');
      await assertFails(uploadBytes(teacherSigAlienRef, dummyImage, { contentType: 'image/png' }));
      recordResult(
        'TC-14.4',
        'Cloud Storage',
        'Docente ajeno es bloqueado al intentar escribir en carpeta de firma de otro docente',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-14.4', 'Cloud Storage', 'Docente ajeno es bloqueado al intentar escribir en carpeta de firma de otro docente', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Docente titular verificado sube expediente académico (RDA/título) en PDF
      const teacherDocRef = ref(prof1Storage, 'sigae/teachers/tch-01/titulos/titulo_profesional.pdf');
      await assertSucceeds(uploadBytes(teacherDocRef, dummyPdf, { contentType: 'application/pdf' }));
      recordResult(
        'TC-14.5',
        'Cloud Storage',
        'Docente titular verificado sube título en /sigae/teachers/{teacherId}/{docType}/',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-14.5', 'Cloud Storage', 'Docente titular verificado sube título en /sigae/teachers/{teacherId}/{docType}/', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Estudiante titular sube su documento personal a /sigae/students/{studentId}/
      const studentDocRef = ref(alumno1Storage, 'sigae/students/uid-alumno-01/certificado_nacimiento.pdf');
      await assertSucceeds(uploadBytes(studentDocRef, dummyPdf, { contentType: 'application/pdf' }));
      recordResult(
        'TC-14.6',
        'Cloud Storage',
        'Estudiante titular sube documento a su expediente /sigae/students/{studentId}/',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-14.6', 'Cloud Storage', 'Estudiante titular sube documento a su expediente /sigae/students/{studentId}/', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Estudiante 2 intenta leer documento del Estudiante 1
      const studentDocAlienRef = ref(alumno2Storage, 'sigae/students/uid-alumno-01/certificado_nacimiento.pdf');
      await assertFails(getBytes(studentDocAlienRef));
      recordResult(
        'TC-14.7',
        'Cloud Storage',
        'Estudiante ajeno es bloqueado al intentar leer expediente de otro alumno',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-14.7', 'Cloud Storage', 'Estudiante ajeno es bloqueado al intentar leer expediente de otro alumno', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Tutor verificado (padre1 con childUid: uid-alumno-01) lee documento de su hijo
      const tutorDocRef = ref(padre1Storage, 'sigae/students/uid-alumno-01/certificado_nacimiento.pdf');
      await assertSucceeds(getBytes(tutorDocRef));
      recordResult(
        'TC-14.8',
        'Cloud Storage',
        'Padre tutor legal verificado consulta documento de su hijo tutelado',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-14.8', 'Cloud Storage', 'Padre tutor legal verificado consulta documento de su hijo tutelado', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Tutor 2 (padre2 de alumno 2) intenta leer documento de Alumno 1
      const unlinkedTutorDocRef = ref(padre2Storage, 'sigae/students/uid-alumno-01/certificado_nacimiento.pdf');
      await assertFails(getBytes(unlinkedTutorDocRef));
      recordResult(
        'TC-14.9',
        'Cloud Storage',
        'Padre de otro estudiante es bloqueado al intentar leer documento de alumno no tutelado',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-14.9', 'Cloud Storage', 'Padre de otro estudiante es bloqueado al intentar leer documento de alumno no tutelado', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Ataque: Subida con tipo de archivo no permitido (ejecutable o tipo arbitrario) en firma
      const invalidMimeRef = ref(dirStorage, 'sigae/director/signatures/malicious.exe');
      await assertFails(uploadBytes(invalidMimeRef, new Uint8Array([77, 90]), { contentType: 'application/x-msdownload' }));
      recordResult(
        'TC-14.10',
        'Cloud Storage',
        'Subida de archivo con tipo MIME no autorizado es inmediatamente bloqueada',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-14.10', 'Cloud Storage', 'Subida de archivo con tipo MIME no autorizado es inmediatamente bloqueada', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Director sube circular institucional a /sigae/circulars/
      const circularRef = ref(dirStorage, 'sigae/circulars/circular_04_2026.pdf');
      await assertSucceeds(uploadBytes(circularRef, dummyPdf, { contentType: 'application/pdf' }));
      recordResult(
        'TC-14.11',
        'Cloud Storage',
        'Director sube anexo de circular oficial a /sigae/circulars/',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-14.11', 'Cloud Storage', 'Director sube anexo de circular oficial a /sigae/circulars/', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    try {
      // Miembro autenticado de la comunidad lee circular institucional
      const circularReadRef = ref(alumno1Storage, 'sigae/circulars/circular_04_2026.pdf');
      await assertSucceeds(getBytes(circularReadRef));
      recordResult(
        'TC-14.12',
        'Cloud Storage',
        'Comunidad educativa autenticada consulta circular oficial en /sigae/circulars/',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-14.12', 'Cloud Storage', 'Comunidad educativa autenticada consulta circular oficial en /sigae/circulars/', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

  } finally {
    await testEnv.cleanup();
  }

  // Resumen final
  console.log('\n================================================================');
  console.log('RESUMEN DE EJECUCIÓN CON CLOUD FIRESTORE EMULATOR');
  console.log('================================================================');
  const total = testResults.length;
  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = total - passedCount;
  console.log(`Pruebas totales ejecutadas: ${total}`);
  console.log(`Pruebas aprobadas:         ${passedCount}`);
  console.log(`Pruebas fallidas:          ${failedCount}`);
  console.log(`Tasa de éxito:             ${((passedCount / total) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEmulatorTestSuite().catch((err) => {
  console.error('Error fatal al ejecutar la suite del emulador:', err);
  process.exit(1);
});
