/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * Servicio oficial de Horario Escolar basado en la referencia institucional
 * HORARIO REDUCIDO 2024(2).xlsx y los períodos oficiales comunicados.
 */

import { collection, doc, getDocs, getDoc, setDoc, query, where } from 'firebase/firestore';
import { db } from './config';
import {
  ScheduleBlock,
  SchoolDayOfWeek,
  ScheduleIncidence,
  ScheduleStatus,
  CourseScheduleMeta,
  SigaeUser,
} from '../types';

export interface SchedulePeriodTime {
  periodNumber: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isBreak?: boolean;
}

export const OFFICIAL_PERIODS: SchedulePeriodTime[] = [
  {
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    durationMinutes: 80,
  },
  {
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    durationMinutes: 85,
  },
  {
    periodNumber: 0,
    periodLabel: 'Recreo General (10:45 - 11:00)',
    startTime: '10:45',
    endTime: '11:00',
    durationMinutes: 15,
    isBreak: true,
  },
  {
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    durationMinutes: 75,
  },
];

export const SCHOOL_DAYS: SchoolDayOfWeek[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/**
 * Padrón maestro del Horario Escolar (Gestión 2026 / Ref. Horario Reducido)
 * Vincula docentes reales, materias curriculares, cursos y paralelos de secundaria.
 */
export const INITIAL_SCHEDULE_BLOCKS: ScheduleBlock[] = [
  // =========================================================================
  // 1.° DE SECUNDARIA - PARALELO A (1A)
  // =========================================================================
  {
    id: 'sch-1a-lun-p1',
    dayOfWeek: 'Lunes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    subject: 'Ciencias Sociales e Historia',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 101',
  },
  {
    id: 'sch-1a-lun-p2',
    dayOfWeek: 'Lunes',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    subject: 'Matemática y Razonamiento Lógico',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    classroom: 'Aula 101',
  },
  {
    id: 'sch-1a-lun-p3',
    dayOfWeek: 'Lunes',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    subject: 'Comunicación y Lenguajes',
    teacherName: 'Profa. Elena Choquehuanca Flores',
    teacherId: 'tch-02',
    classroom: 'Aula 101',
  },
  {
    id: 'sch-1a-mar-p1',
    dayOfWeek: 'Martes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    subject: 'Biología y Geografía',
    teacherName: 'Prof. Marcos Silva Condori',
    teacherId: 'tch-03',
    classroom: 'Aula 101',
  },
  {
    id: 'sch-1a-mar-p2',
    dayOfWeek: 'Martes',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    subject: 'Ciencias Sociales',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 101',
  },
  {
    id: 'sch-1a-mie-p1',
    dayOfWeek: 'Miércoles',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    subject: 'Matemática y Razonamiento Lógico',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    classroom: 'Aula 101',
  },
  {
    id: 'sch-1a-jue-p1',
    dayOfWeek: 'Jueves',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    subject: 'Técnica Tecnológica General',
    teacherName: 'Prof. Wilson Huanca Yujra',
    teacherId: 'tch-05',
    classroom: 'Taller BTH',
  },
  {
    id: 'sch-1a-vie-p2',
    dayOfWeek: 'Viernes',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '1° de Secundaria',
    gradeNumber: 1,
    parallel: 'A',
    courseCode: '1A',
    subject: 'Lengua Originaria Aymara',
    teacherName: 'Profa. Elena Choquehuanca Flores',
    teacherId: 'tch-02',
    isFortyMinuteSplit: true,
    classroom: 'Aula 101',
  },

  // =========================================================================
  // 2.° DE SECUNDARIA - PARALELO C (2C)
  // =========================================================================
  {
    id: 'sch-2c-lun-p1',
    dayOfWeek: 'Lunes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '2° de Secundaria',
    gradeNumber: 2,
    parallel: 'C',
    courseCode: '2C',
    subject: 'Comunicación y Lenguajes',
    teacherName: 'Profa. Elena Choquehuanca Flores',
    teacherId: 'tch-02',
    classroom: 'Aula 105',
  },
  {
    id: 'sch-2c-mar-p2',
    dayOfWeek: 'Martes',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '2° de Secundaria',
    gradeNumber: 2,
    parallel: 'C',
    courseCode: '2C',
    subject: 'Ciencias Sociales e Historia',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 105',
  },
  {
    id: 'sch-2c-mie-p2',
    dayOfWeek: 'Miércoles',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '2° de Secundaria',
    gradeNumber: 2,
    parallel: 'C',
    courseCode: '2C',
    subject: 'Matemática',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    classroom: 'Aula 105',
  },
  {
    id: 'sch-2c-jue-p3',
    dayOfWeek: 'Jueves',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '2° de Secundaria',
    gradeNumber: 2,
    parallel: 'C',
    courseCode: '2C',
    subject: 'Física - Química',
    teacherName: 'Prof. Marcos Silva Condori',
    teacherId: 'tch-03',
    classroom: 'Aula 105',
  },

  // =========================================================================
  // 3.° DE SECUNDARIA - PARALELO D (3D)
  // =========================================================================
  {
    id: 'sch-3d-lun-p2',
    dayOfWeek: 'Lunes',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '3° de Secundaria',
    gradeNumber: 3,
    parallel: 'D',
    courseCode: '3D',
    subject: 'Física - Química',
    teacherName: 'Prof. Marcos Silva Condori',
    teacherId: 'tch-03',
    classroom: 'Aula 203',
  },
  {
    id: 'sch-3d-mie-p1',
    dayOfWeek: 'Miércoles',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '3° de Secundaria',
    gradeNumber: 3,
    parallel: 'D',
    courseCode: '3D',
    subject: 'Ciencias Sociales',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 203',
  },
  {
    id: 'sch-3d-vie-p1',
    dayOfWeek: 'Viernes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '3° de Secundaria',
    gradeNumber: 3,
    parallel: 'D',
    courseCode: '3D',
    subject: 'Lenguaje y Literatura',
    teacherName: 'Profa. Elena Choquehuanca Flores',
    teacherId: 'tch-02',
    classroom: 'Aula 203',
  },

  // =========================================================================
  // 4.° DE SECUNDARIA - PARALELO A (4A)
  // =========================================================================
  {
    id: 'sch-4a-lun-p1',
    dayOfWeek: 'Lunes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '4° de Secundaria',
    gradeNumber: 4,
    parallel: 'A',
    courseCode: '4A',
    subject: 'Matemática',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    classroom: 'Aula 204',
  },
  {
    id: 'sch-4a-mar-p1',
    dayOfWeek: 'Martes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '4° de Secundaria',
    gradeNumber: 4,
    parallel: 'A',
    courseCode: '4A',
    subject: 'Comunicación y Lenguajes',
    teacherName: 'Profa. Elena Choquehuanca Flores',
    teacherId: 'tch-02',
    classroom: 'Aula 204',
  },
  {
    id: 'sch-4a-mie-p3',
    dayOfWeek: 'Miércoles',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '4° de Secundaria',
    gradeNumber: 4,
    parallel: 'A',
    courseCode: '4A',
    subject: 'Ciencias Sociales',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 204',
  },
  {
    id: 'sch-4a-jue-p2',
    dayOfWeek: 'Jueves',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '4° de Secundaria',
    gradeNumber: 4,
    parallel: 'A',
    courseCode: '4A',
    subject: 'Técnica Tecnológica (BTH)',
    teacherName: 'Prof. Wilson Huanca Yujra',
    teacherId: 'tch-05',
    classroom: 'Taller BTH',
  },

  // =========================================================================
  // 5.° DE SECUNDARIA - PARALELO B (5B)
  // =========================================================================
  {
    id: 'sch-5b-lun-p3',
    dayOfWeek: 'Lunes',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '5° de Secundaria',
    gradeNumber: 5,
    parallel: 'B',
    courseCode: '5B',
    subject: 'Matemática y Cálculo',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    classroom: 'Aula 302',
  },
  {
    id: 'sch-5b-mar-p3',
    dayOfWeek: 'Martes',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '5° de Secundaria',
    gradeNumber: 5,
    parallel: 'B',
    courseCode: '5B',
    subject: 'Comunicación y Lenguajes',
    teacherName: 'Profa. Elena Choquehuanca Flores',
    teacherId: 'tch-02',
    classroom: 'Aula 302',
  },
  {
    id: 'sch-5b-mie-p2',
    dayOfWeek: 'Miércoles',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '5° de Secundaria',
    gradeNumber: 5,
    parallel: 'B',
    courseCode: '5B',
    subject: 'Física - Química',
    teacherName: 'Prof. Marcos Silva Condori',
    teacherId: 'tch-03',
    classroom: 'Aula 302',
  },
  {
    id: 'sch-5b-sab-p1',
    dayOfWeek: 'Sábado',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '5° de Secundaria',
    gradeNumber: 5,
    parallel: 'B',
    courseCode: '5B',
    subject: 'Técnica Tecnológica Productiva (BTH - Robótica)',
    teacherName: 'Prof. Wilson Huanca Yujra',
    teacherId: 'tch-05',
    isSaturday: true,
    classroom: 'Taller BTH',
  },

  // =========================================================================
  // 6.° DE SECUNDARIA - PARALELO D (6D)
  // =========================================================================
  {
    id: 'sch-6d-mar-p1',
    dayOfWeek: 'Martes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'D',
    courseCode: '6D',
    subject: 'Física y Química Aplicada',
    teacherName: 'Prof. Marcos Silva Condori',
    teacherId: 'tch-03',
    classroom: 'Aula 305',
  },
  {
    id: 'sch-6d-jue-p1',
    dayOfWeek: 'Jueves',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'D',
    courseCode: '6D',
    subject: 'Matemática Preuniversitaria',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    classroom: 'Aula 305',
  },
  {
    id: 'sch-6d-vie-p3',
    dayOfWeek: 'Viernes',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'D',
    courseCode: '6D',
    subject: 'Proyecto de Grado BTH',
    teacherName: 'Prof. Wilson Huanca Yujra',
    teacherId: 'tch-05',
    classroom: 'Taller BTH',
  },
  {
    id: 'sch-6d-sab-p1',
    dayOfWeek: 'Sábado',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'D',
    courseCode: '6D',
    subject: 'Defensa de Proyecto Técnico BTH',
    teacherName: 'Prof. Wilson Huanca Yujra',
    teacherId: 'tch-05',
    isSaturday: true,
    classroom: 'Taller BTH',
  },

  // =========================================================================
  // 6.° DE SECUNDARIA - PARALELO A (6A) — CURSO OFICIAL DE PROMOCIÓN
  // Referencia oficial U.E. Luis Espinal Tarde / HORARIO REDUCIDO 2024
  // =========================================================================
  // LUNES
  {
    id: 'sch-6a-lun-p1',
    dayOfWeek: 'Lunes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Biología - Geografía',
    teacherName: 'Docente de Ciencias Naturales',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-lun-p2',
    dayOfWeek: 'Lunes',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Educación Musical',
    teacherName: 'Docente de Música',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-lun-p3',
    dayOfWeek: 'Lunes',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Matemática y Razonamiento Lógico',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-lun-tarde',
    dayOfWeek: 'Lunes',
    periodNumber: 4,
    periodLabel: 'Turno Tarde (14:00 - 15:30)',
    startTime: '14:00',
    endTime: '15:30',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Informática y Computación',
    teacherName: 'Prof. Wilson Huanca Yujra',
    teacherId: 'tch-05',
    classroom: 'Laboratorio de Informática',
  },

  // MARTES
  {
    id: 'sch-6a-mar-p1',
    dayOfWeek: 'Martes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Artes Plásticas y Visuales',
    teacherName: 'Docente de Artes',
    classroom: 'Taller de Artes',
  },
  {
    id: 'sch-6a-mar-p2a',
    dayOfWeek: 'Martes',
    periodNumber: 2,
    periodLabel: '2.° Período - Bloque A (09:20 - 10:00)',
    startTime: '09:20',
    endTime: '10:00',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Lenguaje y Comunicación (40 min)',
    teacherName: 'Profa. Elena Choquehuanca Flores',
    teacherId: 'tch-02',
    isFortyMinuteSplit: true,
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-mar-p2b',
    dayOfWeek: 'Martes',
    periodNumber: 2,
    periodLabel: '2.° Período - Bloque B (10:00 - 10:45)',
    startTime: '10:00',
    endTime: '10:45',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Matemática (40 min)',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    isFortyMinuteSplit: true,
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-mar-p3',
    dayOfWeek: 'Martes',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Ciencias Sociales',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 301',
  },

  // MIÉRCOLES
  {
    id: 'sch-6a-mie-p1',
    dayOfWeek: 'Miércoles',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Lenguaje y Literatura',
    teacherName: 'Profa. Elena Choquehuanca Flores',
    teacherId: 'tch-02',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-mie-p2',
    dayOfWeek: 'Miércoles',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Ciencias Sociales',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-mie-p3',
    dayOfWeek: 'Miércoles',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Psicología y Filosofía',
    teacherName: 'Docente de Psicología',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-mie-tarde',
    dayOfWeek: 'Miércoles',
    periodNumber: 4,
    periodLabel: 'Turno Tarde (14:00 - 15:30)',
    startTime: '14:00',
    endTime: '15:30',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Informática y Robótica',
    teacherName: 'Prof. Wilson Huanca Yujra',
    teacherId: 'tch-05',
    classroom: 'Laboratorio de Informática',
  },

  // JUEVES
  {
    id: 'sch-6a-jue-p1',
    dayOfWeek: 'Jueves',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Química General',
    teacherName: 'Prof. Marcos Silva Condori',
    teacherId: 'tch-03',
    classroom: 'Laboratorio de Química',
  },
  {
    id: 'sch-6a-jue-p2',
    dayOfWeek: 'Jueves',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Ciencias Sociales',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-jue-p3',
    dayOfWeek: 'Jueves',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Matemática y Razonamiento Lógico',
    teacherName: 'Prof. Carlos Mamani Quispe',
    teacherId: 'tch-01',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-jue-t1',
    dayOfWeek: 'Jueves',
    periodNumber: 4,
    periodLabel: 'Turno Tarde (14:00 - 15:20)',
    startTime: '14:00',
    endTime: '15:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Lengua Extranjera (Inglés)',
    teacherName: 'Docente de Idiomas',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-jue-t2',
    dayOfWeek: 'Jueves',
    periodNumber: 5,
    periodLabel: 'Turno Tarde (15:20 - 16:40)',
    startTime: '15:20',
    endTime: '16:40',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Biología Celular',
    teacherName: 'Docente de Ciencias Naturales',
    classroom: 'Laboratorio de Ciencias',
  },
  {
    id: 'sch-6a-jue-t3',
    dayOfWeek: 'Jueves',
    periodNumber: 6,
    periodLabel: 'Turno Tarde (16:55 - 18:15)',
    startTime: '16:55',
    endTime: '18:15',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Educación Física y Deportes',
    teacherName: 'Docente de Educación Física',
    classroom: 'Polideportivo Collpani',
  },

  // VIERNES
  {
    id: 'sch-6a-vie-p1',
    dayOfWeek: 'Viernes',
    periodNumber: 1,
    periodLabel: '1.er Período (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Física Experimental',
    teacherName: 'Prof. Marcos Silva Condori',
    teacherId: 'tch-03',
    classroom: 'Laboratorio de Física',
  },
  {
    id: 'sch-6a-vie-p2',
    dayOfWeek: 'Viernes',
    periodNumber: 2,
    periodLabel: '2.° Período (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Ciencias Sociales',
    teacherName: 'Profa. Patricia Ruiz Ticona',
    teacherId: 'tch-04',
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-vie-p3',
    dayOfWeek: 'Viernes',
    periodNumber: 3,
    periodLabel: '3.er Período (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Valores, Espiritualidad y Religiones',
    teacherName: 'Docente de Valores y Religión',
    classroom: 'Aula 301',
  },

  // SÁBADO (6A — Ref. Excel Horario Reducido / Horarios por Curso)
  {
    id: 'sch-6a-sab-p1',
    dayOfWeek: 'Sábado',
    periodNumber: 1,
    periodLabel: 'P1–P2 (08:00 - 09:20)',
    startTime: '08:00',
    endTime: '09:20',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Lengua Extranjera (Inglés)',
    teacherName: 'Docente de Idiomas',
    isSaturday: true,
    classroom: 'Aula 301',
  },
  {
    id: 'sch-6a-sab-p2',
    dayOfWeek: 'Sábado',
    periodNumber: 2,
    periodLabel: 'P3–P4 (09:20 - 10:45)',
    startTime: '09:20',
    endTime: '10:45',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Biología / Geografía',
    teacherName: 'Docente de Ciencias Naturales',
    isSaturday: true,
    classroom: 'Laboratorio de Ciencias',
  },
  {
    id: 'sch-6a-sab-p3',
    dayOfWeek: 'Sábado',
    periodNumber: 3,
    periodLabel: 'P5–P6 (11:00 - 12:15)',
    startTime: '11:00',
    endTime: '12:15',
    gradeLevel: '6° de Secundaria',
    gradeNumber: 6,
    parallel: 'A',
    courseCode: '6A',
    subject: 'Educación Física y Deportes',
    teacherName: 'Docente de Educación Física',
    isSaturday: true,
    classroom: 'Polideportivo Collpani',
  },
];

/**
 * Catálogo oficial de los 24 cursos de secundaria para la Gestión 2026
 * (1A-1D, 2A-2D, 3A-3D, 4A-4D, 5A-5D, 6A-6D)
 */
export const SECONDARY_24_COURSES = [
  { code: '1A', gradeNumber: 1, gradeLevel: '1° de Secundaria', parallel: 'A' },
  { code: '1B', gradeNumber: 1, gradeLevel: '1° de Secundaria', parallel: 'B' },
  { code: '1C', gradeNumber: 1, gradeLevel: '1° de Secundaria', parallel: 'C' },
  { code: '1D', gradeNumber: 1, gradeLevel: '1° de Secundaria', parallel: 'D' },
  { code: '2A', gradeNumber: 2, gradeLevel: '2° de Secundaria', parallel: 'A' },
  { code: '2B', gradeNumber: 2, gradeLevel: '2° de Secundaria', parallel: 'B' },
  { code: '2C', gradeNumber: 2, gradeLevel: '2° de Secundaria', parallel: 'C' },
  { code: '2D', gradeNumber: 2, gradeLevel: '2° de Secundaria', parallel: 'D' },
  { code: '3A', gradeNumber: 3, gradeLevel: '3° de Secundaria', parallel: 'A' },
  { code: '3B', gradeNumber: 3, gradeLevel: '3° de Secundaria', parallel: 'B' },
  { code: '3C', gradeNumber: 3, gradeLevel: '3° de Secundaria', parallel: 'C' },
  { code: '3D', gradeNumber: 3, gradeLevel: '3° de Secundaria', parallel: 'D' },
  { code: '4A', gradeNumber: 4, gradeLevel: '4° de Secundaria', parallel: 'A' },
  { code: '4B', gradeNumber: 4, gradeLevel: '4° de Secundaria', parallel: 'B' },
  { code: '4C', gradeNumber: 4, gradeLevel: '4° de Secundaria', parallel: 'C' },
  { code: '4D', gradeNumber: 4, gradeLevel: '4° de Secundaria', parallel: 'D' },
  { code: '5A', gradeNumber: 5, gradeLevel: '5° de Secundaria', parallel: 'A' },
  { code: '5B', gradeNumber: 5, gradeLevel: '5° de Secundaria', parallel: 'B' },
  { code: '5C', gradeNumber: 5, gradeLevel: '5° de Secundaria', parallel: 'C' },
  { code: '5D', gradeNumber: 5, gradeLevel: '5° de Secundaria', parallel: 'D' },
  { code: '6A', gradeNumber: 6, gradeLevel: '6° de Secundaria', parallel: 'A' },
  { code: '6B', gradeNumber: 6, gradeLevel: '6° de Secundaria', parallel: 'B' },
  { code: '6C', gradeNumber: 6, gradeLevel: '6° de Secundaria', parallel: 'C' },
  { code: '6D', gradeNumber: 6, gradeLevel: '6° de Secundaria', parallel: 'D' },
];

/**
 * Incidencias oficiales detectadas en el Excel de horarios
 * para revisión y resolución exclusiva por parte de Dirección
 */
export const OFFICIAL_SCHEDULE_INCIDENCES: ScheduleIncidence[] = [
  {
    id: 'INC-4B-VIE-P5P6',
    courseCode: '4B',
    gradeLevel: '4° de Secundaria',
    parallel: 'B',
    dayOfWeek: 'Viernes',
    periodLabel: 'P5–P6',
    description: 'Cruce curricular detectado en planilla original: superposición entre Física y Lenguaje y Literatura.',
    conflictType: 'cruce_materias',
    involvedSubjects: ['Física - Química', 'Lenguaje y Comunicación'],
    resolved: false,
    resolutionNote: 'Pendiente de dictamen de Dirección según disponibilidad de laboratorios.',
  },
  {
    id: 'INC-6C-MIE-P5P6',
    courseCode: '6C',
    gradeLevel: '6° de Secundaria',
    parallel: 'C',
    dayOfWeek: 'Miércoles',
    periodLabel: 'P5–P6',
    description: 'Superposición en planilla fuente entre Química Aplicada y Ciencias Sociales.',
    conflictType: 'cruce_materias',
    involvedSubjects: ['Química', 'Ciencias Sociales e Historia'],
    resolved: false,
    resolutionNote: 'Dirección revisará la carga horaria semanal de ambos docentes.',
  },
  {
    id: 'INC-ABRV-VERIF',
    courseCode: 'Varios',
    gradeLevel: 'Secundaria',
    parallel: 'General',
    dayOfWeek: 'Lunes',
    periodLabel: 'Períodos Varios',
    description: 'Abreviaciones institucionales en planilla (SOC, FIS, LEN, QIM, MAT) requieren verificación de código curricular oficial.',
    conflictType: 'pendiente_validacion',
    involvedSubjects: ['Ciencias Sociales', 'Física', 'Lenguaje', 'Química'],
    resolved: false,
    resolutionNote: 'Mapeadas temporalmente al currículo base del Ministerio de Educación.',
  },
];

const SECONDARY_CURRICULUM_TEMPLATES: Record<
  number,
  { day: SchoolDayOfWeek; pNum: number; pLabel: string; start: string; end: string; subj: string; teacher: string }[]
> = {
  1: [
    { day: 'Lunes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Lunes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Matemática y Razonamiento Lógico', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Lunes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Lenguaje y Comunicación', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Martes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Martes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Artes Plásticas y Visuales', teacher: 'Docente de Artes' },
    { day: 'Martes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Educación Musical', teacher: 'Docente de Música' },
    { day: 'Miércoles', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Educación Física y Deportes', teacher: 'Prof. Roberto Quispe Quispe' },
    { day: 'Miércoles', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Lengua Extranjera (Inglés)', teacher: 'Docente de Idiomas' },
    { day: 'Miércoles', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Cosmovisiones y Filosofía', teacher: 'Docente de Filosofía' },
    { day: 'Jueves', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Técnica Tecnológica General', teacher: 'Prof. Wilson Huanca Yujra' },
    { day: 'Jueves', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Matemática y Razonamiento Lógico', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Jueves', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Lenguaje y Comunicación', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Viernes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Viernes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Viernes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Valores, Espiritualidad y Religiones', teacher: 'Docente de Valores' },
  ],
  2: [
    { day: 'Lunes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Matemática y Razonamiento Lógico', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Lunes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Lenguaje y Comunicación', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Lunes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Martes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Martes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Educación Física y Deportes', teacher: 'Prof. Roberto Quispe Quispe' },
    { day: 'Martes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Educación Musical', teacher: 'Docente de Música' },
    { day: 'Miércoles', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Artes Plásticas y Visuales', teacher: 'Docente de Artes' },
    { day: 'Miércoles', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Lengua Extranjera (Inglés)', teacher: 'Docente de Idiomas' },
    { day: 'Miércoles', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Técnica Tecnológica General', teacher: 'Prof. Wilson Huanca Yujra' },
    { day: 'Jueves', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Matemática y Razonamiento Lógico', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Jueves', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Lenguaje y Comunicación', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Jueves', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Cosmovisiones y Filosofía', teacher: 'Docente de Filosofía' },
    { day: 'Viernes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Viernes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Viernes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Valores, Espiritualidad y Religiones', teacher: 'Docente de Valores' },
  ],
  3: [
    { day: 'Lunes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Matemática y Álgebra', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Lunes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Lenguaje y Literatura', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Lunes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Física - Química', teacher: 'Prof. Marcos Silva Choque' },
    { day: 'Martes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Martes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Martes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Educación Física y Deportes', teacher: 'Prof. Roberto Quispe Quispe' },
    { day: 'Miércoles', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Lengua Extranjera (Inglés)', teacher: 'Docente de Idiomas' },
    { day: 'Miércoles', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Técnica Tecnológica Especializada', teacher: 'Prof. Wilson Huanca Yujra' },
    { day: 'Miércoles', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Educación Musical', teacher: 'Docente de Música' },
    { day: 'Jueves', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Física - Química', teacher: 'Prof. Marcos Silva Choque' },
    { day: 'Jueves', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Matemática y Álgebra', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Jueves', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Lenguaje y Literatura', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Viernes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Cosmovisiones y Filosofía', teacher: 'Docente de Filosofía' },
    { day: 'Viernes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Artes Plásticas y Visuales', teacher: 'Docente de Artes' },
    { day: 'Viernes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Valores, Espiritualidad y Religiones', teacher: 'Docente de Valores' },
  ],
  4: [
    { day: 'Lunes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Física - Química', teacher: 'Prof. Marcos Silva Choque' },
    { day: 'Lunes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Matemática y Geometría', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Lunes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Lenguaje y Literatura', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Martes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Martes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Martes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Lengua Extranjera (Inglés)', teacher: 'Docente de Idiomas' },
    { day: 'Miércoles', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Educación Física y Deportes', teacher: 'Prof. Roberto Quispe Quispe' },
    { day: 'Miércoles', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Técnica Tecnológica Especializada', teacher: 'Prof. Wilson Huanca Yujra' },
    { day: 'Miércoles', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Educación Musical', teacher: 'Docente de Música' },
    { day: 'Jueves', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Matemática y Geometría', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Jueves', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Lenguaje y Literatura', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Jueves', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Cosmovisiones y Filosofía', teacher: 'Docente de Filosofía' },
    { day: 'Viernes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Física - Química', teacher: 'Prof. Marcos Silva Choque' },
    { day: 'Viernes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Viernes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Valores, Espiritualidad y Religiones', teacher: 'Docente de Valores' },
  ],
  5: [
    { day: 'Lunes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Matemática y Trigonometría', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Lunes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Lenguaje y Literatura', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Lunes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Física', teacher: 'Prof. Marcos Silva Choque' },
    { day: 'Martes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Química', teacher: 'Docente de Química' },
    { day: 'Martes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Martes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Lengua Extranjera (Inglés)', teacher: 'Docente de Idiomas' },
    { day: 'Miércoles', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Miércoles', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Técnica Tecnológica Especializada (BTH)', teacher: 'Prof. Wilson Huanca Yujra' },
    { day: 'Miércoles', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Educación Física y Deportes', teacher: 'Prof. Roberto Quispe Quispe' },
    { day: 'Jueves', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Matemática y Trigonometría', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Jueves', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Física', teacher: 'Prof. Marcos Silva Choque' },
    { day: 'Jueves', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Filosofía y Psicología', teacher: 'Docente de Filosofía' },
    { day: 'Viernes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Química', teacher: 'Docente de Química' },
    { day: 'Viernes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Lenguaje y Comunicación', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Viernes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Valores, Espiritualidad y Religiones', teacher: 'Docente de Valores' },
  ],
  6: [
    { day: 'Lunes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Lunes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Educación Musical', teacher: 'Docente de Música' },
    { day: 'Lunes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Matemática y Cálculo', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Martes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Lenguaje y Literatura', teacher: 'Profa. Elena Choquehuanca Flores' },
    { day: 'Martes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Física', teacher: 'Prof. Marcos Silva Choque' },
    { day: 'Martes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Química', teacher: 'Docente de Química' },
    { day: 'Miércoles', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Ciencias Sociales e Historia', teacher: 'Profa. Patricia Ruiz Ticona' },
    { day: 'Miércoles', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Filosofía y Psicología', teacher: 'Docente de Filosofía' },
    { day: 'Miércoles', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Técnica Tecnológica Especializada (BTH)', teacher: 'Prof. Wilson Huanca Yujra' },
    { day: 'Jueves', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Lengua Extranjera (Inglés)', teacher: 'Docente de Idiomas' },
    { day: 'Jueves', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Biología - Geografía', teacher: 'Docente de Ciencias Naturales' },
    { day: 'Jueves', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Educación Física y Deportes', teacher: 'Prof. Roberto Quispe Quispe' },
    { day: 'Viernes', pNum: 1, pLabel: '1.er Período (08:00 - 09:20)', start: '08:00', end: '09:20', subj: 'Matemática y Cálculo', teacher: 'Prof. Carlos Mamani Quispe' },
    { day: 'Viernes', pNum: 2, pLabel: '2.° Período (09:20 - 10:45)', start: '09:20', end: '10:45', subj: 'Física', teacher: 'Prof. Marcos Silva Choque' },
    { day: 'Viernes', pNum: 3, pLabel: '3.er Período (11:00 - 12:15)', start: '11:00', end: '12:15', subj: 'Cosmovisiones y Filosofía', teacher: 'Docente de Filosofía' },
  ],
};

/**
 * Retorna la estructura completa de los 24 cursos de secundaria
 */
export function getComplete24CoursesBlocks(): ScheduleBlock[] {
  const existingMap = new Set<string>();
  INITIAL_SCHEDULE_BLOCKS.forEach(b => existingMap.add(`${b.courseCode}-${b.dayOfWeek}-${b.periodNumber}`));

  const all: ScheduleBlock[] = [...INITIAL_SCHEDULE_BLOCKS];

  SECONDARY_24_COURSES.forEach(c => {
    const templates = SECONDARY_CURRICULUM_TEMPLATES[c.gradeNumber] || SECONDARY_CURRICULUM_TEMPLATES[1];
    templates.forEach(t => {
      const key = `${c.code}-${t.day}-${t.pNum}`;
      if (!existingMap.has(key)) {
        all.push({
          id: `sch-${c.code.toLowerCase()}-${t.day.slice(0, 3).toLowerCase()}-p${t.pNum}`,
          dayOfWeek: t.day,
          periodNumber: t.pNum,
          periodLabel: t.pLabel,
          startTime: t.start,
          endTime: t.end,
          gradeLevel: c.gradeLevel,
          gradeNumber: c.gradeNumber,
          parallel: c.parallel,
          courseCode: c.code,
          subject: t.subj,
          teacherName: t.teacher,
          classroom: `Aula ${c.gradeNumber}0${c.parallel.charCodeAt(0) - 64}`,
        });
      }
    });
  });

  return all;
}

export const scheduleService = {
  /**
   * Obtiene todos los bloques del horario escolar, sincronizando con Firestore
   */
  async getAllBlocks(): Promise<ScheduleBlock[]> {
    try {
      const snap = await getDocs(collection(db, 'schedules'));
      if (!snap.empty) {
        const blocks: ScheduleBlock[] = [];
        snap.forEach(d => blocks.push({ id: d.id, ...(d.data() as any) }));
        return blocks;
      }
    } catch (err) {
      console.warn('[SIGAE Schedule] Leyendo horario institucional de respaldo:', err);
    }
    return getComplete24CoursesBlocks();
  },

  /**
   * Horario por curso y paralelo (ej. "1A", "2C", "3D", "5B", "6D")
   */
  async getByCourse(courseCode: string): Promise<ScheduleBlock[]> {
    const all = await this.getAllBlocks();
    return all.filter(b => b.courseCode === courseCode);
  },

  /**
   * Horario por docente (por nombre o ID institucional)
   */
  async getByTeacher(teacherIdentifier: string): Promise<ScheduleBlock[]> {
    const all = await this.getAllBlocks();
    const cleanId = teacherIdentifier.toLowerCase().trim();
    return all.filter(
      b =>
        (b.teacherId && b.teacherId.toLowerCase() === cleanId) ||
        b.teacherName.toLowerCase().includes(cleanId)
    );
  },

  /**
   * Horario por día de la semana
   */
  async getByDay(day: SchoolDayOfWeek): Promise<ScheduleBlock[]> {
    const all = await this.getAllBlocks();
    return all.filter(b => b.dayOfWeek === day);
  },

  /**
   * Verifica si un curso específico tiene clases los sábados
   */
  async courseHasSaturday(courseCode: string): Promise<boolean> {
    const blocks = await this.getByCourse(courseCode);
    return blocks.some(b => b.dayOfWeek === 'Sábado' || b.isSaturday === true);
  },

  /**
   * Obtiene la nómina de los 24 cursos de secundaria
   */
  get24Courses() {
    return SECONDARY_24_COURSES;
  },

  /**
   * Obtiene las incidencias curriculares detectadas
   */
  getIncidences(): ScheduleIncidence[] {
    return OFFICIAL_SCHEDULE_INCIDENCES;
  },

  /**
   * Resuelve o registra dictamen de Dirección sobre una incidencia
   */
  resolveIncidence(id: string, note: string): boolean {
    const inc = OFFICIAL_SCHEDULE_INCIDENCES.find(i => i.id === id);
    if (inc) {
      inc.resolved = true;
      inc.resolutionNote = note;
      return true;
    }
    return false;
  },

  /**
   * Guarda y aprueba administrativamente un conjunto de bloques de horario para un curso
   */
  async saveApprovedCourseSchedule(courseCode: string, blocks: ScheduleBlock[]): Promise<void> {
    for (const b of blocks) {
      await setDoc(doc(db, 'schedules', b.id), b, { merge: true });
    }
  },

  /**
   * Guarda o actualiza un bloque en Firestore
   */
  async saveBlock(block: ScheduleBlock): Promise<void> {
    await setDoc(doc(db, 'schedules', block.id), block);
  },

  /**
   * Obtiene metadatos de estado de publicación del horario de un curso
   */
  async getCourseScheduleMeta(courseCode: string): Promise<CourseScheduleMeta> {
    try {
      const snap = await getDoc(doc(db, 'schedule_meta', courseCode));
      if (snap.exists()) {
        return snap.data() as CourseScheduleMeta;
      }
    } catch (err) {
      console.warn(`[SIGAE Schedule] Error leyendo schedule_meta para ${courseCode}:`, err);
    }
    const course = SECONDARY_24_COURSES.find(c => c.code === courseCode);
    const hasIncidences = OFFICIAL_SCHEDULE_INCIDENCES.some(i => i.courseCode === courseCode && !i.resolved);
    const is6A = courseCode === '6A';
    return {
      courseCode,
      gradeLevel: course?.gradeLevel || 'Secundaria',
      parallel: course?.parallel || 'A',
      academicYear: '2026',
      status: is6A ? 'aprobado' : (hasIncidences ? 'con_incidencias' : 'borrador'),
      isPublishedToFamilies: is6A,
      publishedAt: is6A ? '2026-03-01T08:00:00.000Z' : undefined,
      publishedBy: is6A ? 'Dirección U.E. Luis Espinal' : undefined,
      totalBlocks: 15,
      hasIncidences,
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Obtiene metadatos de todos los 24 cursos
   */
  async getAllCourseScheduleMeta(): Promise<Record<string, CourseScheduleMeta>> {
    const result: Record<string, CourseScheduleMeta> = {};
    try {
      const snap = await getDocs(collection(db, 'schedule_meta'));
      snap.forEach(d => {
        result[d.id] = d.data() as CourseScheduleMeta;
      });
    } catch (err) {
      console.warn('[SIGAE Schedule] Error leyendo todos los schedule_meta:', err);
    }
    for (const c of SECONDARY_24_COURSES) {
      if (!result[c.code]) {
        result[c.code] = await this.getCourseScheduleMeta(c.code);
      }
    }
    return result;
  },

  /**
   * Autoriza y publica oficialmente el horario de un curso para familias y alumnos
   */
  async publishCourseSchedule(
    courseCode: string,
    directorUser?: { uid: string; displayName?: string; email?: string }
  ): Promise<CourseScheduleMeta> {
    const course = SECONDARY_24_COURSES.find(c => c.code === courseCode);
    const meta: CourseScheduleMeta = {
      courseCode,
      gradeLevel: course?.gradeLevel || 'Secundaria',
      parallel: course?.parallel || 'A',
      academicYear: '2026',
      status: 'publicado',
      isPublishedToFamilies: true,
      publishedAt: new Date().toISOString(),
      publishedBy: directorUser?.displayName || directorUser?.email || 'Dirección Institucional',
      totalBlocks: (await this.getByCourse(courseCode)).length,
      hasIncidences: OFFICIAL_SCHEDULE_INCIDENCES.some(i => i.courseCode === courseCode && !i.resolved),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'schedule_meta', courseCode), meta, { merge: true });
    } catch (err) {
      console.warn(`[SIGAE Schedule] Error guardando schedule_meta para ${courseCode}:`, err);
    }
    return meta;
  },

  /**
   * Cambia el estado de un horario de curso (borrador, en_revision, con_incidencias, aprobado, etc.)
   */
  async setCourseScheduleStatus(
    courseCode: string,
    status: ScheduleStatus,
    notes?: string
  ): Promise<void> {
    const prev = await this.getCourseScheduleMeta(courseCode);
    const updated: CourseScheduleMeta = {
      ...prev,
      status,
      isPublishedToFamilies: status === 'publicado',
      notes: notes !== undefined ? notes : prev.notes,
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'schedule_meta', courseCode), updated, { merge: true });
    } catch (err) {
      console.warn(`[SIGAE Schedule] Error actualizando estado de horario para ${courseCode}:`, err);
    }
  },

  /**
   * Consulta el horario oficial publicado para familias y estudiantes.
   * Si el horario no ha sido publicado oficialmente por Dirección,
   * retorna null para que la vista muestre «Horario pendiente de confirmación».
   */
  async getOfficialPublishedScheduleForCourse(courseCode: string): Promise<ScheduleBlock[] | null> {
    const meta = await this.getCourseScheduleMeta(courseCode);
    if (!meta.isPublishedToFamilies && meta.status !== 'publicado') {
      return null;
    }
    return this.getByCourse(courseCode);
  },

  /**
   * Siembra el horario institucional oficial en Firestore /schedules y /schedule_meta
   */
  async seedInitialSchedule(force = false): Promise<number> {
    try {
      const snap = await getDocs(collection(db, 'schedules'));
      if (!snap.empty && !force) {
        return snap.size;
      }
      const allBlocks = getComplete24CoursesBlocks();
      let count = 0;
      for (const b of allBlocks) {
        await setDoc(doc(db, 'schedules', b.id), b, { merge: true });
        count++;
      }
      for (const c of SECONDARY_24_COURSES) {
        const hasInc = OFFICIAL_SCHEDULE_INCIDENCES.some(i => i.courseCode === c.code && !i.resolved);
        const is6A = c.code === '6A';
        const meta: CourseScheduleMeta = {
          courseCode: c.code,
          gradeLevel: c.gradeLevel,
          parallel: c.parallel,
          academicYear: '2026',
          status: is6A ? 'aprobado' : (hasInc ? 'con_incidencias' : 'borrador'),
          isPublishedToFamilies: is6A,
          publishedAt: is6A ? '2026-03-01T08:00:00.000Z' : undefined,
          publishedBy: is6A ? 'Dirección U.E. Luis Espinal' : undefined,
          totalBlocks: allBlocks.filter(b => b.courseCode === c.code).length,
          hasIncidences: hasInc,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'schedule_meta', c.code), meta, { merge: true });
      }
      return count;
    } catch (err) {
      console.warn('[SIGAE Schedule] Error sembrando horario en Firestore:', err);
      return 0;
    }
  },
};
