/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * CHECKPOINT 3.11: AUDITORÍA DE CONSULTAS, ASIGNACIONES, MENSAJES Y ESTADOS DOCENTES
 *
 * Ejecutado contra Cloud Firestore Emulator Suite (v2)
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
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
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

async function runCheckpoint311Tests() {
  console.log('================================================================');
  console.log('SIGAE CHECKPOINT 3.11 — AUDITORÍA AVANZADA EN FIRESTORE EMULATOR');
  console.log('Institución: U.E. Luis Espinal Tarde de Collpani (SIE 80730142)');
  console.log('================================================================\n');

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'sigae-cp311-audit-80730142',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8085,
    },
  });

  try {
    // -------------------------------------------------------------------------
    // SEMILLA INSTITUCIONAL AISLADA
    // -------------------------------------------------------------------------
    console.log('[FASE 0] Sembrando datos institucionales para CP 3.11...');
    await testEnv.withSecurityRulesDisabled(async (adminContext) => {
      const db = adminContext.firestore();

      // Perfiles /users
      await setDoc(doc(db, 'users', 'uid-dir'), {
        uid: 'uid-dir',
        role: 'director',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-prof-mamani'), {
        uid: 'uid-prof-mamani',
        role: 'profesor',
        teacherId: 'tch-mamani',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-prof-elena'), {
        uid: 'uid-prof-elena',
        role: 'profesor',
        teacherId: 'tch-elena',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-prof-licencia'), {
        uid: 'uid-prof-licencia',
        role: 'profesor',
        teacherId: 'tch-licencia',
        active: true,
        status: 'licencia',
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-prof-inactivo'), {
        uid: 'uid-prof-inactivo',
        role: 'profesor',
        teacherId: 'tch-inactivo',
        active: false,
        status: 'inactivo',
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-prof-retirado'), {
        uid: 'uid-prof-retirado',
        role: 'profesor',
        teacherId: 'tch-retirado',
        active: false,
        status: 'retirado',
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-alumno-1'), {
        uid: 'uid-alumno-1',
        role: 'alumno',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-alumno-2'), {
        uid: 'uid-alumno-2',
        role: 'alumno',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-padre-1'), {
        uid: 'uid-padre-1',
        role: 'padre',
        childUid: 'uid-alumno-1',
        active: true,
        schoolSie: '80730142',
      });

      await setDoc(doc(db, 'users', 'uid-padre-2'), {
        uid: 'uid-padre-2',
        role: 'padre',
        childUid: 'uid-alumno-2',
        active: true,
        schoolSie: '80730142',
      });

      // Expedientes docentes /teachers
      await setDoc(doc(db, 'teachers', 'tch-mamani'), {
        id: 'tch-mamani',
        fullName: 'Prof. Carlos Mamani Quispe',
        email: 'carlos.mamani@espinal.edu.bo',
        authUid: 'uid-prof-mamani',
        status: 'activo',
        assignedSubjects: ['Matemática'],
        assignedGrades: ['4°', '5°', '6°'],
      });

      await setDoc(doc(db, 'teachers', 'tch-elena'), {
        id: 'tch-elena',
        fullName: 'Profa. Elena Choquehuanca',
        email: 'elena.choquehuanca@espinal.edu.bo',
        authUid: 'uid-prof-elena',
        status: 'activo',
        assignedSubjects: ['Comunicación y Lenguajes'],
        assignedGrades: ['3°', '4°'],
      });

      await setDoc(doc(db, 'teachers', 'tch-licencia'), {
        id: 'tch-licencia',
        fullName: 'Profa. Patricia Ruiz (En Licencia)',
        email: 'patricia.ruiz@espinal.edu.bo',
        authUid: 'uid-prof-licencia',
        status: 'licencia',
        assignedSubjects: ['Ciencias Sociales'],
        assignedGrades: ['1°', '2°', '3°'],
      });

      await setDoc(doc(db, 'teachers', 'tch-pendiente'), {
        id: 'tch-pendiente',
        fullName: 'Prof. Nuevo Postulante',
        email: 'nuevo.postulante@espinal.edu.bo',
        status: 'pendiente_activacion',
        assignedSubjects: ['Física'],
        assignedGrades: ['5°'],
      });

      await setDoc(doc(db, 'teachers', 'tch-inactivo'), {
        id: 'tch-inactivo',
        fullName: 'Prof. Suspendido',
        email: 'suspendido@espinal.edu.bo',
        authUid: 'uid-prof-inactivo',
        status: 'inactivo',
      });

      await setDoc(doc(db, 'teachers', 'tch-retirado'), {
        id: 'tch-retirado',
        fullName: 'Prof. Ex-Docente Retirado',
        email: 'retirado@espinal.edu.bo',
        authUid: 'uid-prof-retirado',
        status: 'retirado',
      });

      // Calificaciones /grades
      await setDoc(doc(db, 'grades', 'cur-mat-5sec'), {
        courseId: 'cur-mat-5sec',
        courseName: '5° Secundaria Matemática',
        subjectName: 'Matemática',
        teacherId: 'tch-mamani',
        teacherUid: 'uid-prof-mamani',
        gradeLevel: '5°',
        parallel: 'A',
        isPublishedToSchool: true,
        authorizedStudentIds: ['uid-alumno-1'],
        students: [{ studentId: 'uid-alumno-1', total: 95 }],
      });

      await setDoc(doc(db, 'grades', 'cur-len-4sec'), {
        courseId: 'cur-len-4sec',
        courseName: '4° Secundaria Lenguaje',
        subjectName: 'Comunicación y Lenguajes',
        teacherId: 'tch-elena',
        teacherUid: 'uid-prof-elena',
        gradeLevel: '4°',
        parallel: 'B',
        isPublishedToSchool: false,
        authorizedStudentIds: ['uid-alumno-2'],
        students: [{ studentId: 'uid-alumno-2', total: 88 }],
      });

      // Mensajes /messages
      await setDoc(doc(db, 'messages', 'msg-dir-comunidad'), {
        id: 'msg-dir-comunidad',
        senderId: 'uid-dir',
        senderRole: 'director',
        recipientId: 'all_community',
        body: 'Comunicado institucional general',
      });

      await setDoc(doc(db, 'messages', 'msg-dir-docentes'), {
        id: 'msg-dir-docentes',
        senderId: 'uid-dir',
        senderRole: 'director',
        recipientId: 'all_teachers',
        body: 'Circular interna docente',
      });

      await setDoc(doc(db, 'messages', 'msg-privado-1-2'), {
        id: 'msg-privado-1-2',
        senderId: 'uid-prof-mamani',
        senderRole: 'profesor',
        recipientId: 'uid-padre-1',
        body: 'Cita con el apoderado',
      });
    });

    console.log('✔ Datos sembrados correctamente.\n');

    // Contextos
    const dirDb = testEnv.authenticatedContext('uid-dir', { role: 'director', admin: true }).firestore();
    const mamaniDb = testEnv.authenticatedContext('uid-prof-mamani', { role: 'profesor' }).firestore();
    const elenaDb = testEnv.authenticatedContext('uid-prof-elena', { role: 'profesor' }).firestore();
    const licenciaDb = testEnv.authenticatedContext('uid-prof-licencia', { role: 'profesor' }).firestore();
    const inactivoDb = testEnv.authenticatedContext('uid-prof-inactivo', { role: 'profesor', active: false }).firestore();
    const retiradoDb = testEnv.authenticatedContext('uid-prof-retirado', { role: 'profesor', active: false }).firestore();
    const alumno1Db = testEnv.authenticatedContext('uid-alumno-1', { role: 'alumno' }).firestore();
    const alumno2Db = testEnv.authenticatedContext('uid-alumno-2', { role: 'alumno' }).firestore();
    const padre1Db = testEnv.authenticatedContext('uid-padre-1', { role: 'padre' }).firestore();
    const padre2Db = testEnv.authenticatedContext('uid-padre-2', { role: 'padre' }).firestore();

    // =========================================================================
    // SECCIÓN 1: PRUEBAS DE CONSULTAS DE COLECCIÓN (QUERIES / LIST)
    // =========================================================================
    console.log('[SECCIÓN 1] Pruebas de consultas de colección (Queries / List)...');

    // TC-Q1: Alumno 1 intenta consulta amplia de toda la colección /grades
    try {
      await assertFails(getDocs(collection(alumno1Db, 'grades')));
      recordResult(
        'TC-Q1',
        'Consultas de Colección',
        'Alumno intenta listar toda la colección /grades sin filtros (rechazo por reglas no-filtro)',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-Q1', 'Consultas de Colección', 'Alumno intenta listar toda la colección /grades', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-Q2: Alumno 2 intenta consultar calificaciones con filtro de otro alumno
    try {
      const q = query(collection(alumno2Db, 'grades'), where('authorizedStudentIds', 'array-contains', 'uid-alumno-1'));
      await assertFails(getDocs(q));
      recordResult(
        'TC-Q2',
        'Consultas de Colección',
        'Alumno intenta consultar calificaciones con filtro apuntando a otro estudiante',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-Q2', 'Consultas de Colección', 'Alumno consulta notas de otro estudiante', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-Q3: Alumno 1 consulta notas legítimas filtrando por su UID y publicación oficial
    try {
      const q = query(
        collection(alumno1Db, 'grades'),
        where('authorizedStudentIds', 'array-contains', 'uid-alumno-1'),
        where('isPublishedToSchool', '==', true)
      );
      await assertSucceeds(getDocs(q));
      recordResult(
        'TC-Q3',
        'Consultas de Colección',
        'Alumno 1 consulta sus calificaciones legítimas filtrando por su propio UID y estado publicado',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-Q3', 'Consultas de Colección', 'Alumno 1 consulta sus calificaciones legítimas', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // TC-Q4: Padre 2 intenta consultar calificaciones del hijo de Padre 1
    try {
      const q = query(
        collection(padre2Db, 'grades'),
        where('authorizedStudentIds', 'array-contains', 'uid-alumno-1'),
        where('isPublishedToSchool', '==', true)
      );
      await assertFails(getDocs(q));
      recordResult(
        'TC-Q4',
        'Consultas de Colección',
        'Padre intenta consultar libreta de un estudiante no vinculado a su tutela',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-Q4', 'Consultas de Colección', 'Padre consulta estudiante ajeno', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-Q5: Padre 1 consulta calificaciones de su propio hijo vinculado y publicado
    try {
      const q = query(
        collection(padre1Db, 'grades'),
        where('authorizedStudentIds', 'array-contains', 'uid-alumno-1'),
        where('isPublishedToSchool', '==', true)
      );
      await assertSucceeds(getDocs(q));
      recordResult(
        'TC-Q5',
        'Consultas de Colección',
        'Padre 1 consulta notas publicadas de su hijo legítimamente vinculado',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-Q5', 'Consultas de Colección', 'Padre 1 consulta notas de su hijo', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // TC-Q6: Docente Mamani intenta listar todas las calificaciones sin filtrar por su UID
    try {
      await assertFails(getDocs(collection(mamaniDb, 'grades')));
      recordResult(
        'TC-Q6',
        'Consultas de Colección',
        'Docente intenta consulta amplia no filtrada de todas las libretas del colegio',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-Q6', 'Consultas de Colección', 'Docente consulta amplia no filtrada', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-Q7: Docente Mamani consulta sus propias libretas asignadas filtrando por su teacherUid
    try {
      const q = query(collection(mamaniDb, 'grades'), where('teacherUid', '==', 'uid-prof-mamani'));
      await assertSucceeds(getDocs(q));
      recordResult(
        'TC-Q7',
        'Consultas de Colección',
        'Docente consulta sus libretas asignadas filtrando por su teacherUid verificado',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-Q7', 'Consultas de Colección', 'Docente consulta sus libretas asignadas', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // =========================================================================
    // SECCIÓN 2: ASIGNACIONES INSTITUCIONALES DOCENTES (ANTI-SPOOFING / INMUTABILIDAD)
    // =========================================================================
    console.log('[SECCIÓN 2] Pruebas de asignaciones institucionales y prevención de secuestro...');

    // TC-A1: Docente Mamani (Matemática) intenta crear libreta para "Ciencias Sociales"
    try {
      await assertFails(setDoc(doc(mamaniDb, 'grades', 'cur-soc-4sec-secuestrado'), {
        courseId: 'cur-soc-4sec-secuestrado',
        courseName: '4° Secundaria Ciencias Sociales',
        subjectName: 'Ciencias Sociales',
        teacherId: 'tch-mamani',
        teacherUid: 'uid-prof-mamani',
        gradeLevel: '4°',
        parallel: 'A',
      }));
      recordResult(
        'TC-A1',
        'Asignaciones Docentes',
        'Docente intenta crear libreta para una materia que no tiene asignada oficialmente',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-A1', 'Asignaciones Docentes', 'Docente crea materia no asignada', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-A2: Docente Mamani intenta crear libreta con teacherId de Profa. Elena
    try {
      await assertFails(setDoc(doc(mamaniDb, 'grades', 'cur-len-falsificado'), {
        courseId: 'cur-len-falsificado',
        courseName: 'Lenguaje Falsificado',
        subjectName: 'Comunicación y Lenguajes',
        teacherId: 'tch-elena',
        teacherUid: 'uid-prof-mamani',
      }));
      recordResult(
        'TC-A2',
        'Asignaciones Docentes',
        'Docente intenta crear libreta falsificando el teacherId de otro docente',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-A2', 'Asignaciones Docentes', 'Docente falsifica teacherId', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-A3: Docente Mamani intenta modificar el courseId o subjectName de su libreta existente
    try {
      await assertFails(updateDoc(doc(mamaniDb, 'grades', 'cur-mat-5sec'), {
        subjectName: 'Química Avanzada',
      }));
      recordResult(
        'TC-A3',
        'Asignaciones Docentes',
        'Docente intenta mutar el subjectName de una libreta existente (inmutabilidad estricta)',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-A3', 'Asignaciones Docentes', 'Docente muta subjectName', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-A4: Docente Mamani intenta transferir el teacherUid de su libreta a otro docente
    try {
      await assertFails(updateDoc(doc(mamaniDb, 'grades', 'cur-mat-5sec'), {
        teacherUid: 'uid-prof-elena',
      }));
      recordResult(
        'TC-A4',
        'Asignaciones Docentes',
        'Docente intenta transferir la autoría/teacherUid de su libreta a otro UID',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-A4', 'Asignaciones Docentes', 'Docente transfiere teacherUid', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-A5: Docente Mamani crea libreta para su materia institucionalmente asignada ("Matemática")
    try {
      await assertSucceeds(setDoc(doc(mamaniDb, 'grades', 'cur-mat-6sec-legitimo'), {
        courseId: 'cur-mat-6sec-legitimo',
        courseName: '6° Secundaria Matemática',
        subjectName: 'Matemática',
        teacherId: 'tch-mamani',
        teacherUid: 'uid-prof-mamani',
        gradeLevel: '6°',
        parallel: 'A',
      }));
      recordResult(
        'TC-A5',
        'Asignaciones Docentes',
        'Docente crea libreta para su materia y grado oficialmente asignados',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-A5', 'Asignaciones Docentes', 'Docente crea libreta legítima', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // =========================================================================
    // SECCIÓN 3: MENSAJERÍA INSTITUCIONAL Y PREVENCIÓN DE SUPLANTACIÓN
    // =========================================================================
    console.log('[SECCIÓN 3] Pruebas de mensajería, control de audiencias y no suplantación...');

    // TC-M1: Alumno intenta enviar mensaje a canal general 'all_community'
    try {
      await assertFails(setDoc(doc(alumno1Db, 'messages', 'msg-spam-comunidad'), {
        id: 'msg-spam-comunidad',
        senderId: 'uid-alumno-1',
        recipientId: 'all_community',
        body: 'Mensaje no autorizado a toda la comunidad',
      }));
      recordResult(
        'TC-M1',
        'Mensajería Institucional',
        'Alumno intenta emitir circular institucional masiva a all_community',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-M1', 'Mensajería Institucional', 'Alumno emite a all_community', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-M2: Alumno intenta enviar mensaje al canal reservado 'all_teachers'
    try {
      await assertFails(setDoc(doc(alumno1Db, 'messages', 'msg-spam-docentes'), {
        id: 'msg-spam-docentes',
        senderId: 'uid-alumno-1',
        recipientId: 'all_teachers',
        body: 'Mensaje no autorizado a todos los profesores',
      }));
      recordResult(
        'TC-M2',
        'Mensajería Institucional',
        'Alumno intenta emitir comunicado al canal exclusivo de docentes all_teachers',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-M2', 'Mensajería Institucional', 'Alumno emite a all_teachers', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-M3: Alumno intenta enviar mensaje haciéndose pasar por Director en senderRole
    try {
      await assertFails(setDoc(doc(alumno1Db, 'messages', 'msg-spoof-rol'), {
        id: 'msg-spoof-rol',
        senderId: 'uid-alumno-1',
        senderRole: 'director',
        recipientId: 'uid-alumno-2',
        body: 'Falsa orden de dirección',
      }));
      recordResult(
        'TC-M3',
        'Mensajería Institucional',
        'Alumno intenta falsificar su rol a director en los metadatos del mensaje',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-M3', 'Mensajería Institucional', 'Alumno falsifica senderRole', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-M4: Padre intenta enviar mensaje suplantando el senderId de un docente
    try {
      await assertFails(setDoc(doc(padre1Db, 'messages', 'msg-spoof-docente'), {
        id: 'msg-spoof-docente',
        senderId: 'uid-prof-mamani',
        recipientId: 'uid-alumno-2',
        body: 'Falsa comunicación docente',
      }));
      recordResult(
        'TC-M4',
        'Mensajería Institucional',
        'Padre intenta enviar mensaje declarando el UID de un docente en senderId',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-M4', 'Mensajería Institucional', 'Padre suplanta senderId docente', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-M5: Docente activo emite comunicado legítimo a all_teachers
    try {
      await assertSucceeds(setDoc(doc(mamaniDb, 'messages', 'msg-prof-docentes'), {
        id: 'msg-prof-docentes',
        senderId: 'uid-prof-mamani',
        senderRole: 'profesor',
        recipientId: 'all_teachers',
        body: 'Convocatoria a feria de matemáticas',
      }));
      recordResult(
        'TC-M5',
        'Mensajería Institucional',
        'Docente activo emite comunicación legítima al canal all_teachers',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-M5', 'Mensajería Institucional', 'Docente emite a all_teachers', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // TC-M6: Director emite comunicado institucional a all_community
    try {
      await assertSucceeds(setDoc(doc(dirDb, 'messages', 'msg-dir-nueva-circular'), {
        id: 'msg-dir-nueva-circular',
        senderId: 'uid-dir',
        senderRole: 'director',
        recipientId: 'all_community',
        body: 'Circular Oficial de Dirección',
      }));
      recordResult(
        'TC-M6',
        'Mensajería Institucional',
        'Director emite circular oficial abierta a all_community',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-M6', 'Mensajería Institucional', 'Director emite a all_community', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // TC-M7: Alumno intenta consulta amplia getDocs sobre /messages sin filtrar
    try {
      await assertFails(getDocs(collection(alumno1Db, 'messages')));
      recordResult(
        'TC-M7',
        'Mensajería Institucional',
        'Alumno intenta consulta amplia de todos los mensajes (protección contra espionaje)',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-M7', 'Mensajería Institucional', 'Alumno consulta amplia de mensajes', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // =========================================================================
    // SECCIÓN 4: ESTADOS DE LOS DOCENTES (ACTIVO, PENDIENTE, LICENCIA, INACTIVO, RETIRADO)
    // =========================================================================
    console.log('[SECCIÓN 4] Pruebas exhaustivas por estado del docente...');

    // TC-E1: Docente con status 'licencia' intenta crear libreta de notas
    try {
      await assertFails(setDoc(doc(licenciaDb, 'grades', 'cur-soc-licencia'), {
        courseId: 'cur-soc-licencia',
        courseName: 'Ciencias Sociales Licencia',
        subjectName: 'Ciencias Sociales',
        teacherId: 'tch-licencia',
        teacherUid: 'uid-prof-licencia',
      }));
      recordResult(
        'TC-E1',
        'Estados Docentes',
        'Docente en estado licencia intenta calificar/crear libreta de notas',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-E1', 'Estados Docentes', 'Docente en licencia crea libreta', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-E2: Docente con status 'licencia' consulta su propio expediente
    try {
      await assertSucceeds(getDoc(doc(licenciaDb, 'teachers', 'tch-licencia')));
      recordResult(
        'TC-E2',
        'Estados Docentes',
        'Docente en estado licencia consulta su propio expediente institucional',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-E2', 'Estados Docentes', 'Docente en licencia lee su expediente', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // TC-E3: Docente con status 'licencia' lee circulares del canal all_teachers
    try {
      await assertSucceeds(getDoc(doc(licenciaDb, 'messages', 'msg-dir-docentes')));
      recordResult(
        'TC-E3',
        'Estados Docentes',
        'Docente en estado licencia accede a circulares informativas all_teachers',
        'PERMITIDO',
        'PERMITIDO'
      );
    } catch (err: any) {
      recordResult('TC-E3', 'Estados Docentes', 'Docente en licencia lee all_teachers', 'PERMITIDO', 'ERROR_INESPERADO', err.message);
    }

    // TC-E4: Docente en status 'inactivo' intenta consultar su expediente
    try {
      await assertFails(getDoc(doc(inactivoDb, 'teachers', 'tch-inactivo')));
      recordResult(
        'TC-E4',
        'Estados Docentes',
        'Docente en estado inactivo intenta consultar su expediente institucional',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-E4', 'Estados Docentes', 'Docente inactivo lee expediente', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-E5: Docente en status 'retirado' intenta consultar su expediente
    try {
      await assertFails(getDoc(doc(retiradoDb, 'teachers', 'tch-retirado')));
      recordResult(
        'TC-E5',
        'Estados Docentes',
        'Docente en estado retirado intenta consultar su expediente institucional',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-E5', 'Estados Docentes', 'Docente retirado lee expediente', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

    // TC-E6: Docente en status 'retirado' intenta acceder a all_teachers
    try {
      await assertFails(getDoc(doc(retiradoDb, 'messages', 'msg-dir-docentes')));
      recordResult(
        'TC-E6',
        'Estados Docentes',
        'Docente en estado retirado intenta leer mensajes docentes all_teachers',
        'DENEGADO (PERMISSION_DENIED)',
        'DENEGADO (PERMISSION_DENIED)'
      );
    } catch (err: any) {
      recordResult('TC-E6', 'Estados Docentes', 'Docente retirado lee all_teachers', 'DENEGADO (PERMISSION_DENIED)', 'ERROR_INESPERADO', err.message);
    }

  } finally {
    await testEnv.cleanup();
  }

  // Resumen
  console.log('\n================================================================');
  console.log('RESUMEN DE PRUEBAS CHECKPOINT 3.11 (EMULADOR FIRESTORE)');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`Pruebas ejecutadas: ${total}`);
  console.log(`Aprobadas:          ${passed}`);
  console.log(`Fallidas:           ${failed}`);
  console.log(`Tasa de éxito:      ${((passed / total) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCheckpoint311Tests().catch((e) => {
  console.error('Error fatal en ejecución de pruebas CP 3.11:', e);
  process.exit(1);
});
