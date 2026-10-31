import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from './config';
import { TeacherRecord, TeacherStatus, SchoolConfig, SchoolGroup, InternalMessage, GroupSubject, INITIAL_BOLIVIA_TEACHERS } from '../types';
import { authService, sanitizeFirestoreData } from './authService';

export { INITIAL_BOLIVIA_TEACHERS };

export const DEFAULT_BOLIVIA_SCHOOL: SchoolConfig = {
  id: 'sigae-bolivia',
  schoolName: 'U.E. Luis Espinal Tarde de Collpani',
  sie: '80730142',
  academicYear: '2026',
  currentPeriod: '1er Trimestre (Gestión Escolar 2026)',
  directorName: 'Lic. Gonzalo Fernández Mamani',
  department: 'La Paz',
  district: 'Distrito Educativo El Alto 1',
  shift: 'tarde',
  phone: '+591 2 2840192',
  email: 'direccion@luisespinal.edu.bo',
};

export const INITIAL_BOLIVIA_GROUPS: SchoolGroup[] = [
  // 1° de Secundaria
  {
    id: 'grp-sec-1a',
    name: '1° de Secundaria',
    level: 'secundaria',
    parallel: 'A',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 101 - Pabellón A',
    studentCount: 32,
    tutorTeacherId: 'tch-04',
    tutorTeacherName: 'Profa. Patricia Ruiz Ticona',
    subjects: [
      { id: 'sbj-1a-1', name: 'Ciencias Sociales e Historia', teacherId: 'tch-04', teacherName: 'Profa. Patricia Ruiz Ticona', hoursWeekly: 5 },
      { id: 'sbj-1a-2', name: 'Matemática y Razonamiento Lógico', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-1a-3', name: 'Comunicación y Lenguajes', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-1a-4', name: 'Biología y Geografía', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 4 },
      { id: 'sbj-1a-5', name: 'Técnica Tecnológica General', teacherId: 'tch-05', teacherName: 'Prof. Wilson Huanca Yujra', hoursWeekly: 4 },
    ],
  },
  {
    id: 'grp-sec-1b',
    name: '1° de Secundaria',
    level: 'secundaria',
    parallel: 'B',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 102 - Pabellón A',
    studentCount: 30,
    tutorTeacherId: 'tch-01',
    tutorTeacherName: 'Prof. Carlos Mamani Quispe',
    subjects: [
      { id: 'sbj-1b-1', name: 'Matemática', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-1b-2', name: 'Lenguaje y Literatura', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-1b-3', name: 'Ciencias Sociales', teacherId: 'tch-04', teacherName: 'Profa. Patricia Ruiz Ticona', hoursWeekly: 5 },
    ],
  },
  // 2° de Secundaria
  {
    id: 'grp-sec-2a',
    name: '2° de Secundaria',
    level: 'secundaria',
    parallel: 'A',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 103 - Pabellón A',
    studentCount: 31,
    tutorTeacherId: 'tch-02',
    tutorTeacherName: 'Profa. Elena Choquehuanca Flores',
    subjects: [
      { id: 'sbj-2a-1', name: 'Comunicación y Lenguajes', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-2a-2', name: 'Matemática', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-2a-3', name: 'Ciencias Sociales', teacherId: 'tch-04', teacherName: 'Profa. Patricia Ruiz Ticona', hoursWeekly: 4 },
    ],
  },
  {
    id: 'grp-sec-2b',
    name: '2° de Secundaria',
    level: 'secundaria',
    parallel: 'B',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 104 - Pabellón A',
    studentCount: 30,
    tutorTeacherId: 'tch-03',
    tutorTeacherName: 'Prof. Marcos Silva Condori',
    subjects: [
      { id: 'sbj-2b-1', name: 'Física - Química', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 5 },
      { id: 'sbj-2b-2', name: 'Matemática', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
    ],
  },
  {
    id: 'grp-sec-2c',
    name: '2° de Secundaria',
    level: 'secundaria',
    parallel: 'C',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 105 - Pabellón A',
    studentCount: 29,
    tutorTeacherId: 'tch-04',
    tutorTeacherName: 'Profa. Patricia Ruiz Ticona',
    subjects: [
      { id: 'sbj-2c-1', name: 'Ciencias Sociales e Historia', teacherId: 'tch-04', teacherName: 'Profa. Patricia Ruiz Ticona', hoursWeekly: 5 },
      { id: 'sbj-2c-2', name: 'Comunicación y Lenguajes', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-2c-3', name: 'Matemática', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-2c-4', name: 'Física - Química', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 5 },
    ],
  },
  // 3° de Secundaria
  {
    id: 'grp-sec-3a',
    name: '3° de Secundaria',
    level: 'secundaria',
    parallel: 'A',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 201 - Pabellón B',
    studentCount: 33,
    tutorTeacherId: 'tch-04',
    tutorTeacherName: 'Profa. Patricia Ruiz Ticona',
    subjects: [
      { id: 'sbj-3a-1', name: 'Comunicación y Literatura', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-3a-2', name: 'Ciencias Sociales e Historia', teacherId: 'tch-04', teacherName: 'Profa. Patricia Ruiz Ticona', hoursWeekly: 5 },
      { id: 'sbj-3a-3', name: 'Física - Química', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 5 },
    ],
  },
  {
    id: 'grp-sec-3b',
    name: '3° de Secundaria',
    level: 'secundaria',
    parallel: 'B',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 202 - Pabellón B',
    studentCount: 31,
    tutorTeacherId: 'tch-02',
    tutorTeacherName: 'Profa. Elena Choquehuanca Flores',
    subjects: [
      { id: 'sbj-3b-1', name: 'Lenguaje y Literatura', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-3b-2', name: 'Matemática', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
    ],
  },
  {
    id: 'grp-sec-3d',
    name: '3° de Secundaria',
    level: 'secundaria',
    parallel: 'D',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 203 - Pabellón B',
    studentCount: 28,
    tutorTeacherId: 'tch-03',
    tutorTeacherName: 'Prof. Marcos Silva Condori',
    subjects: [
      { id: 'sbj-3d-1', name: 'Física - Química', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 5 },
      { id: 'sbj-3d-2', name: 'Ciencias Sociales', teacherId: 'tch-04', teacherName: 'Profa. Patricia Ruiz Ticona', hoursWeekly: 5 },
      { id: 'sbj-3d-3', name: 'Lenguaje y Literatura', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
    ],
  },
  // 4° de Secundaria
  {
    id: 'grp-sec-4a',
    name: '4° de Secundaria',
    level: 'secundaria',
    parallel: 'A',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 204 - Pabellón B',
    studentCount: 34,
    tutorTeacherId: 'tch-02',
    tutorTeacherName: 'Profa. Elena Choquehuanca Flores',
    subjects: [
      { id: 'sbj-4a-1', name: 'Matemática', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-4a-2', name: 'Comunicación y Lenguajes', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-4a-3', name: 'Ciencias Sociales', teacherId: 'tch-04', teacherName: 'Profa. Patricia Ruiz Ticona', hoursWeekly: 4 },
      { id: 'sbj-4a-4', name: 'Técnica Tecnológica (BTH)', teacherId: 'tch-05', teacherName: 'Prof. Wilson Huanca Yujra', hoursWeekly: 4 },
    ],
  },
  {
    id: 'grp-sec-4b',
    name: '4° de Secundaria',
    level: 'secundaria',
    parallel: 'B',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 205 - Pabellón B',
    studentCount: 32,
    tutorTeacherId: 'tch-01',
    tutorTeacherName: 'Prof. Carlos Mamani Quispe',
    subjects: [
      { id: 'sbj-4b-1', name: 'Matemática', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-4b-2', name: 'Física - Química', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 5 },
    ],
  },
  // 5° de Secundaria
  {
    id: 'grp-sec-5a',
    name: '5° de Secundaria',
    level: 'secundaria',
    parallel: 'A',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 301 - Pabellón BTH',
    studentCount: 32,
    tutorTeacherId: 'tch-01',
    tutorTeacherName: 'Prof. Carlos Mamani Quispe',
    subjects: [
      { id: 'sbj-5a-1', name: 'Matemática y Cálculo', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-5a-2', name: 'Comunicación y Lenguajes', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-5a-3', name: 'Física - Química', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 5 },
      { id: 'sbj-5a-4', name: 'Técnica Tecnológica (BTH - Robótica)', teacherId: 'tch-05', teacherName: 'Prof. Wilson Huanca Yujra', hoursWeekly: 6 },
    ],
  },
  {
    id: 'grp-sec-5b',
    name: '5° de Secundaria',
    level: 'secundaria',
    parallel: 'B',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 302 - Pabellón BTH',
    studentCount: 30,
    tutorTeacherId: 'tch-03',
    tutorTeacherName: 'Prof. Marcos Silva Condori',
    subjects: [
      { id: 'sbj-5b-1', name: 'Matemática y Cálculo', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-5b-2', name: 'Comunicación y Lenguajes', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
      { id: 'sbj-5b-3', name: 'Física - Química', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 5 },
      { id: 'sbj-5b-4', name: 'Técnica Tecnológica Productiva (BTH)', teacherId: 'tch-05', teacherName: 'Prof. Wilson Huanca Yujra', hoursWeekly: 6 },
    ],
  },
  // 6° de Secundaria
  {
    id: 'grp-sec-6a',
    name: '6° de Secundaria',
    level: 'secundaria',
    parallel: 'A',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula Magna 303 - BTH',
    studentCount: 28,
    tutorTeacherId: 'tch-05',
    tutorTeacherName: 'Prof. Wilson Huanca Yujra',
    subjects: [
      { id: 'sbj-6a-1', name: 'Matemática Preuniversitaria', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-6a-2', name: 'Física y Química Aplicada', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 6 },
      { id: 'sbj-6a-3', name: 'Proyecto de Grado BTH', teacherId: 'tch-05', teacherName: 'Prof. Wilson Huanca Yujra', hoursWeekly: 6 },
    ],
  },
  {
    id: 'grp-sec-6b',
    name: '6° de Secundaria',
    level: 'secundaria',
    parallel: 'B',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 304 - Pabellón BTH',
    studentCount: 27,
    tutorTeacherId: 'tch-01',
    tutorTeacherName: 'Prof. Carlos Mamani Quispe',
    subjects: [
      { id: 'sbj-6b-1', name: 'Matemática Preuniversitaria', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-6b-2', name: 'Lenguaje y Literatura', teacherId: 'tch-02', teacherName: 'Profa. Elena Choquehuanca Flores', hoursWeekly: 5 },
    ],
  },
  {
    id: 'grp-sec-6d',
    name: '6° de Secundaria',
    level: 'secundaria',
    parallel: 'D',
    shift: 'tarde',
    academicYear: '2026',
    classroom: 'Aula 305 - Pabellón BTH',
    studentCount: 26,
    tutorTeacherId: 'tch-03',
    tutorTeacherName: 'Prof. Marcos Silva Condori',
    subjects: [
      { id: 'sbj-6d-1', name: 'Física y Química Aplicada', teacherId: 'tch-03', teacherName: 'Prof. Marcos Silva Condori', hoursWeekly: 6 },
      { id: 'sbj-6d-2', name: 'Matemática Preuniversitaria', teacherId: 'tch-01', teacherName: 'Prof. Carlos Mamani Quispe', hoursWeekly: 6 },
      { id: 'sbj-6d-3', name: 'Defensa de Proyecto Técnico BTH', teacherId: 'tch-05', teacherName: 'Prof. Wilson Huanca Yujra', hoursWeekly: 6 },
    ],
  },
];

export const INITIAL_INTERNAL_MESSAGES: InternalMessage[] = [
  {
    id: 'msg-01',
    senderId: 'sigae-usr-director-01',
    senderName: 'Lic. Gonzalo Fernández Mamani (Dirección)',
    senderRole: 'director',
    recipientId: 'all_teachers',
    recipientName: 'Todo el Plantel Docente',
    subject: 'Circular N° 04/2026: Presentación de Planificaciones Curriculares Trimestrales',
    content: 'Estimados profesores y profesoras: Se recuerda que el plazo impostergable para la carga de los Planes de Desarrollo Curricular (PDC) correspondientes al 1er Trimestre vence este viernes. Favor remitir sus planificaciones a través de la plataforma para su visado correspondiente.',
    type: 'circular',
    priority: 'alta',
    createdAt: '2026-10-06T08:30:00Z',
    attachmentName: 'Circular_04_PDC_2026.pdf',
  },
  {
    id: 'msg-02',
    senderId: 'sigae-usr-director-01',
    senderName: 'Lic. Gonzalo Fernández Mamani (Dirección)',
    senderRole: 'director',
    recipientId: 'tch-01',
    recipientName: 'Prof. Carlos Mamani Quispe',
    subject: 'Coordinación: Olimpiadas Científicas Estudiantiles Plurinacionales',
    content: 'Profesor Carlos, por favor preparar la lista de estudiantes preseleccionados de 4° y 5° de Secundaria para la fase distrital de las Olimpiadas en el área de Matemática. Quedo atento a su informe.',
    type: 'mensaje_directo',
    priority: 'normal',
    createdAt: '2026-10-07T10:15:00Z',
  },
  {
    id: 'msg-03',
    senderId: 'sigae-usr-director-01',
    senderName: 'Lic. Gonzalo Fernández Mamani (Dirección)',
    senderRole: 'director',
    recipientId: 'all_teachers',
    recipientName: 'Todo el Plantel Docente',
    subject: 'Convocatoria a Consejo de Profesores - Evaluación de Medio Término',
    content: 'Se convoca a todos los docentes titulares al Consejo Pedagógico de Evaluación que se llevará a cabo el próximo martes a horas 15:30 en la sala audiovisual. Se ruega estricta puntualidad.',
    type: 'comunicado_general',
    priority: 'urgente',
    createdAt: '2026-10-07T11:45:00Z',
  },
];

export const directorService = {
  // ----------------------------------------------------
  // 1. TEACHERS MANAGEMENT (Director -> Teachers)
  // ----------------------------------------------------
  subscribeTeachers(callback: (teachers: TeacherRecord[]) => void) {
    const colRef = collection(db, 'teachers');
    return onSnapshot(
      colRef,
      snapshot => {
        if (!snapshot.empty) {
          const list: TeacherRecord[] = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          callback(list);
        } else {
          callback([]);
        }
      },
      error => {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          console.error('[SIGAE Director] PERMISSION DENIED: Usuario no autorizado para listar la colección teachers.');
        } else {
          console.warn('[SIGAE Director] Snapshot listener fallback:', error.message);
          callback([]);
        }
      }
    );
  },

  async getTeachers(): Promise<TeacherRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'teachers'));
      if (!snap.empty) {
        const list: TeacherRecord[] = [];
        snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
        return list;
      }
      return [];
    } catch (e: any) {
      if (e?.code === 'permission-denied' || e?.message?.includes('permission')) {
        console.error('[SIGAE Director] PERMISSION DENIED al consultar expedientes docentes.');
        throw new Error('ACCESO_DENEGADO: Permisos insuficientes para listar la planta docente institucional.');
      }
      console.warn('[SIGAE Director] Error fetching teachers:', e);
      return [];
    }
  },

  async seedDefaultTeachers(): Promise<TeacherRecord[]> {
    try {
      for (const t of INITIAL_BOLIVIA_TEACHERS) {
        await setDoc(doc(db, 'teachers', t.id), sanitizeFirestoreData({
          ...t,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        await setDoc(
          doc(db, 'users', t.id),
          sanitizeFirestoreData({
            uid: t.id,
            email: t.email,
            displayName: t.fullName,
            role: 'profesor',
            ci: t.ci,
            phone: t.phone,
            active: t.status === 'activo',
            schoolSie: DEFAULT_BOLIVIA_SCHOOL.sie,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('[SIGAE Director] Seed notice:', err);
    }
    return INITIAL_BOLIVIA_TEACHERS;
  },

  async createTeacher(data: Omit<TeacherRecord, 'id'>): Promise<TeacherRecord> {
    // 1. Strict Validations
    if (!data.fullName || data.fullName.trim().length < 3) {
      throw new Error('El nombre completo del profesor es obligatorio y debe tener al menos 3 caracteres.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = (data.email || '').toLowerCase().trim();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      throw new Error('Debe proporcionar un correo electrónico válido para el docente.');
    }
    if (!data.ci || data.ci.trim().length === 0) {
      throw new Error('El Carnet de Identidad (CI) del docente es obligatorio.');
    }
    if (!data.specialty || data.specialty.trim().length === 0) {
      throw new Error('La especialidad pedagógica del docente es obligatoria.');
    }
    const cleanPhone = (data.phone || '').trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error('Debe ingresar un número de celular de contacto válido (mínimo 7 dígitos).');
    }
    const hourlyNum = Number(data.hourlyLoad);
    if (isNaN(hourlyNum) || hourlyNum <= 0) {
      throw new Error('La carga horaria debe ser un número válido mayor a 0 horas.');
    }

    // Check if a teacher with this email already exists in /teachers
    const existingTeacherQuery = query(collection(db, 'teachers'), where('email', '==', cleanEmail));
    const existingTeacherSnap = await getDocs(existingTeacherQuery);
    if (!existingTeacherSnap.empty) {
      throw new Error(`Ya existe una ficha docente registrada con el correo: ${cleanEmail}`);
    }

    // Check if a teacher with this CI already exists in /teachers (preserving initial zeros)
    const cleanCiDigits = data.ci.replace(/[^0-9]/g, '');
    const allTeachers = await getDocs(collection(db, 'teachers'));
    for (const docItem of allTeachers.docs) {
      const t = docItem.data() as TeacherRecord;
      const existingDigits = (t.ci || '').replace(/[^0-9]/g, '');
      if (existingDigits && cleanCiDigits && existingDigits === cleanCiDigits) {
        throw new Error(`Ya existe un docente registrado en el padrón con el Carnet de Identidad: ${t.ci} (${t.fullName})`);
      }
    }

    // Institutional identifier (separated from Firebase Auth UID)
    const institutionalId = `tch-${Date.now().toString().slice(-6)}`;
    const fullCi = `${data.ci.trim()}${data.ciExpedition ? ` ${data.ciExpedition}` : ''}`.trim();

    // Check if an authorized user with this email has already signed up in Firebase Auth
    let linkedAuthUid: string | undefined = undefined;
    try {
      const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', cleanEmail)));
      if (!userSnap.empty) {
        const existingUserDoc = userSnap.docs[0];
        linkedAuthUid = existingUserDoc.id;
        // Link existing user profile with teacherId and role
        await updateDoc(doc(db, 'users', linkedAuthUid), {
          role: 'profesor',
          teacherId: institutionalId,
          displayName: data.fullName.trim(),
          ci: fullCi,
          phone: data.phone.trim(),
          active: data.status === 'activo',
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch (uErr) {
      console.warn('[SIGAE Director] Notice checking existing users:', uErr);
    }

    const newTeacher: TeacherRecord = {
      ...data,
      id: institutionalId,
      teacherId: institutionalId,
      email: cleanEmail,
      ci: fullCi,
      hourlyLoad: hourlyNum,
      status: linkedAuthUid ? (data.status || 'activo') : (data.status || 'pendiente_activacion'),
      assignedGrades: data.assignedGrades || [],
      assignedSubjects: data.assignedSubjects || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(linkedAuthUid ? {
        authUid: linkedAuthUid,
        uid: linkedAuthUid,
        linkedAt: new Date().toISOString(),
        linkedEmail: cleanEmail,
      } : {}),
    };

    // 2. Persist ONLY in /teachers/{institutionalId}
    // We do NOT create a fake /users/{institutionalId} document because institutionalId is not a real Firebase Auth UID!
    await setDoc(doc(db, 'teachers', institutionalId), sanitizeFirestoreData(newTeacher));

    return newTeacher;
  },

  async updateTeacher(id: string, updates: Partial<TeacherRecord>): Promise<void> {
    try {
      const docRef = doc(db, 'teachers', id);
      const currentSnap = await getDoc(docRef);
      const currentData = currentSnap.exists() ? (currentSnap.data() as TeacherRecord) : null;

      const cleanedUpdates: Partial<TeacherRecord> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      if (updates.email) {
        cleanedUpdates.email = updates.email.toLowerCase().trim();
      }

      await updateDoc(docRef, sanitizeFirestoreData(cleanedUpdates));

      // If this teacher has a real linked Firebase Auth UID, synchronize to /users/{authUid}
      const targetAuthUid = updates.authUid || currentData?.authUid;
      if (targetAuthUid) {
        const userUpdates: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };
        if (updates.email) userUpdates.email = updates.email.toLowerCase().trim();
        if (updates.fullName) userUpdates.displayName = updates.fullName.trim();
        if (updates.ci) userUpdates.ci = updates.ci.trim();
        if (updates.phone) userUpdates.phone = updates.phone.trim();
        if (updates.status !== undefined) {
          userUpdates.active = updates.status === 'activo';
        }
        await updateDoc(doc(db, 'users', targetAuthUid), sanitizeFirestoreData(userUpdates)).catch(() => {});
      }
    } catch (e) {
      console.error('[SIGAE Director] Error updating teacher:', e);
      throw e;
    }
  },

  async updateTeacherAssignments(
    teacherId: string,
    assignedGrades: string[],
    assignedSubjects: string[],
    hourlyLoad: number
  ): Promise<void> {
    const docRef = doc(db, 'teachers', teacherId);
    await updateDoc(docRef, {
      assignedGrades,
      assignedSubjects,
      hourlyLoad: Number(hourlyLoad) || 0,
      updatedAt: new Date().toISOString(),
    });
  },

  async setTeacherStatus(id: string, newStatus: TeacherStatus): Promise<void> {
    await this.updateTeacher(id, { status: newStatus });
  },

  async toggleTeacherStatus(id: string, currentStatus: TeacherStatus, targetStatus?: TeacherStatus): Promise<TeacherStatus> {
    const nextStatus: TeacherStatus = targetStatus || (
      currentStatus === 'activo'
        ? 'licencia'
        : currentStatus === 'licencia'
        ? 'inactivo'
        : currentStatus === 'inactivo'
        ? 'pendiente_activacion'
        : 'activo'
    );

    await this.updateTeacher(id, { status: nextStatus });
    return nextStatus;
  },

  // Check if a teacher account has an active link with Firebase Auth
  async checkTeacherAuthStatus(email: string): Promise<{ isLinked: boolean; authUid?: string }> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { isLinked: true, authUid: snap.docs[0].id };
      }
      return { isLinked: false };
    } catch {
      return { isLinked: false };
    }
  },

  // Official invitation / password setup handler
  async sendActivationEmail(teacher: TeacherRecord): Promise<{ success: boolean; isInvite: boolean; message: string }> {
    try {
      // 1. Check if the teacher already has a linked Firebase Auth account
      if (teacher.authUid) {
        // Teacher ALREADY has an authenticated account in Firebase Auth:
        // Calling resetPassword is legitimate for password setting/resetting!
        await authService.resetPassword(teacher.email.trim());
        return {
          success: true,
          isInvite: false,
          message: `Enlace seguro para definir/restablecer contraseña enviado a: ${teacher.email}`,
        };
      }

      // 2. If NOT linked:
      // In client-side Firebase Auth, sendPasswordResetEmail will fail if user does not exist in Auth.
      // Therefore, do NOT pretend sendPasswordReset creates accounts!
      // Register formal invitation timestamp in Firestore
      await updateDoc(doc(db, 'teachers', teacher.id), {
        invitationSentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});

      return {
        success: true,
        isInvite: true,
        message: `Invitación oficial registrada para ${teacher.fullName}. El docente debe ingresar a SIGAE con su correo (${teacher.email}) o con Google para activar su acceso.`,
      };
    } catch (err: any) {
      console.warn('[SIGAE Director] Aviso en gestión de acceso:', err);
      return {
        success: false,
        isInvite: true,
        message: err?.message || 'No se pudo procesar la solicitud de acceso.',
      };
    }
  },

  // Soft delete / Retiro institucional
  async retireTeacher(id: string, reason?: string): Promise<void> {
    await this.updateTeacher(id, {
      status: 'retirado',
      notes: reason ? `[Retiro Institucional]: ${reason}` : undefined,
    });
  },

  // Permanent Delete
  async deleteTeacher(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'teachers', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const t = snap.data() as TeacherRecord;
        if (t.authUid) {
          // Deactivate or delete the linked user profile
          await deleteDoc(doc(db, 'users', t.authUid)).catch(() => {});
        }
      }
      await deleteDoc(docRef);
    } catch (e) {
      console.error('[SIGAE Director] Error deleting teacher:', e);
      throw e;
    }
  },

  // ----------------------------------------------------
  // 2. GROUPS & TEACHER ASSIGNMENTS (Director -> Groups)
  // ----------------------------------------------------
  subscribeGroups(callback: (groups: SchoolGroup[]) => void) {
    const colRef = collection(db, 'groups');
    return onSnapshot(
      colRef,
      snapshot => {
        const list: SchoolGroup[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list);
      },
      error => {
        console.warn('[SIGAE Director] Groups listener notice:', error.message);
        callback([]);
      }
    );
  },

  async getGroups(): Promise<SchoolGroup[]> {
    try {
      const snap = await getDocs(collection(db, 'groups'));
      const list: SchoolGroup[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      return list;
    } catch {
      return [];
    }
  },

  async seedDefaultGroups(): Promise<SchoolGroup[]> {
    try {
      for (const g of INITIAL_BOLIVIA_GROUPS) {
        await setDoc(doc(db, 'groups', g.id), {
          ...g,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[SIGAE Director] Groups seed notice:', err);
    }
    return INITIAL_BOLIVIA_GROUPS;
  },

  async createGroup(data: Omit<SchoolGroup, 'id'>): Promise<SchoolGroup> {
    const id = `grp-${data.level.slice(0, 3)}-${data.name.replace(/\D/g, '')}${data.parallel.toLowerCase()}`;
    const newGroup: SchoolGroup = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'groups', id), newGroup);
    } catch (e) {
      console.error('[SIGAE Director] Error creating group in Firestore:', e);
    }

    return newGroup;
  },

  async updateGroup(id: string, updates: Partial<SchoolGroup>): Promise<void> {
    try {
      const docRef = doc(db, 'groups', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[SIGAE Director] Error updating group:', e);
    }
  },

  // Assign or change teacher for a subject within a group
  async assignSubjectTeacher(groupId: string, subjectId: string, teacherId: string, teacherName: string): Promise<void> {
    const groups = await this.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const updatedSubjects = group.subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, teacherId, teacherName };
      }
      return s;
    });

    await this.updateGroup(groupId, { subjects: updatedSubjects });
  },

  // Assign classroom tutor teacher
  async assignGroupTutor(groupId: string, tutorTeacherId: string, tutorTeacherName: string): Promise<void> {
    await this.updateGroup(groupId, { tutorTeacherId, tutorTeacherName });
  },

  // ----------------------------------------------------
  // 3. INTERNAL MESSAGING & CIRCULARS (Director -> Teachers)
  // ----------------------------------------------------
  subscribeMessages(callback: (messages: InternalMessage[]) => void) {
    const colRef = collection(db, 'messages');
    return onSnapshot(
      colRef,
      snapshot => {
        const list: InternalMessage[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      error => {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          console.error('[SIGAE Director] PERMISSION DENIED: Usuario no autorizado para acceder al canal de mensajes.');
        } else {
          console.warn('[SIGAE Director] Messages listener notice:', error.message);
        }
        callback([]);
      }
    );
  },

  async seedDefaultMessages(): Promise<InternalMessage[]> {
    try {
      for (const m of INITIAL_INTERNAL_MESSAGES) {
        await setDoc(doc(db, 'messages', m.id), m);
      }
    } catch (err) {
      console.warn('[SIGAE Director] Messages seed notice:', err);
    }
    return INITIAL_INTERNAL_MESSAGES;
  },

  async sendMessage(data: Omit<InternalMessage, 'id' | 'createdAt'>): Promise<InternalMessage> {
    const id = `msg-${Date.now().toString().slice(-6)}`;
    const newMsg: InternalMessage = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'messages', id), newMsg);
    } catch (e) {
      console.error('[SIGAE Director] Error saving internal message:', e);
    }

    return newMsg;
  },

  async deleteMessage(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (e) {
      console.error('[SIGAE Director] Error deleting message:', e);
    }
  },

  // ----------------------------------------------------
  // 4. SCHOOL CONFIGURATION
  // ----------------------------------------------------
  async getSchoolConfig(): Promise<SchoolConfig> {
    try {
      const docRef = doc(db, 'schools', 'sigae-bolivia');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as SchoolConfig) };
      }
      await setDoc(docRef, DEFAULT_BOLIVIA_SCHOOL);
      return DEFAULT_BOLIVIA_SCHOOL;
    } catch (e) {
      return DEFAULT_BOLIVIA_SCHOOL;
    }
  },

  async updateSchoolConfig(updates: Partial<SchoolConfig>): Promise<void> {
    try {
      const docRef = doc(db, 'schools', 'sigae-bolivia');
      await setDoc(docRef, updates, { merge: true });
    } catch (e) {
      console.error('[SIGAE Director] Error updating school config:', e);
    }
  },

  async updateSchoolLogo(logoUrl: string): Promise<void> {
    await this.updateSchoolConfig({ logoUrl });
  },

  async updateTeacherDocument(teacherId: string, documentUrl: string, documentName: string): Promise<void> {
    try {
      const docRef = doc(db, 'teachers', teacherId);
      await updateDoc(docRef, {
        documentUrl,
        documentName,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[SIGAE Director] Error updating teacher document:', e);
    }
  },
};
