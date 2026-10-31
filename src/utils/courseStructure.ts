/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * Estructura oficial de cursos y paralelos para Secundaria Comunitaria Productiva
 * Solo se definen los paralelos reales existentes en el colegio.
 */

export interface ParallelDefinition {
  parallel: string; // 'A', 'B', 'C', 'D'
  courseCode: string; // '1A', '2C', '3D', '5B', '6D'
  classroom: string;
  shift: 'tarde';
  estimatedStudents: number;
}

export interface SecondaryGradeDefinition {
  gradeNumber: number; // 1 to 6
  name: string; // '1.° de Secundaria'
  label: string; // '1.° Secundaria'
  shortCode: string; // '1SEC'
  description: string;
  colorTheme: {
    bgLight: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    cardBg: string;
    hoverBorder: string;
    accent: string;
  };
  parallels: ParallelDefinition[];
}

export const OFFICIAL_SECONDARY_GRADES: SecondaryGradeDefinition[] = [
  {
    gradeNumber: 1,
    name: '1.° de Secundaria',
    label: '1.° Secundaria',
    shortCode: '1SEC',
    description: 'Primer año de Secundaria Comunitaria Productiva',
    colorTheme: {
      bgLight: 'bg-blue-500/10',
      border: 'border-blue-400/30',
      text: 'text-blue-400',
      badgeBg: 'bg-blue-950/70',
      badgeText: 'text-blue-300',
      cardBg: 'from-blue-950/40 via-slate-900/80 to-slate-950',
      hoverBorder: 'hover:border-blue-400/60',
      accent: '#3b82f6',
    },
    parallels: [
      { parallel: 'A', courseCode: '1A', classroom: 'Aula 101 - Pabellón A', shift: 'tarde', estimatedStudents: 32 },
      { parallel: 'B', courseCode: '1B', classroom: 'Aula 102 - Pabellón A', shift: 'tarde', estimatedStudents: 30 },
    ],
  },
  {
    gradeNumber: 2,
    name: '2.° de Secundaria',
    label: '2.° Secundaria',
    shortCode: '2SEC',
    description: 'Segundo año de Secundaria Comunitaria Productiva',
    colorTheme: {
      bgLight: 'bg-emerald-500/10',
      border: 'border-emerald-400/30',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/70',
      badgeText: 'text-emerald-300',
      cardBg: 'from-emerald-950/40 via-slate-900/80 to-slate-950',
      hoverBorder: 'hover:border-emerald-400/60',
      accent: '#10b981',
    },
    parallels: [
      { parallel: 'A', courseCode: '2A', classroom: 'Aula 103 - Pabellón A', shift: 'tarde', estimatedStudents: 31 },
      { parallel: 'B', courseCode: '2B', classroom: 'Aula 104 - Pabellón A', shift: 'tarde', estimatedStudents: 30 },
      { parallel: 'C', courseCode: '2C', classroom: 'Aula 105 - Pabellón A', shift: 'tarde', estimatedStudents: 29 },
    ],
  },
  {
    gradeNumber: 3,
    name: '3.° de Secundaria',
    label: '3.° Secundaria',
    shortCode: '3SEC',
    description: 'Tercer año de Secundaria Comunitaria Productiva',
    colorTheme: {
      bgLight: 'bg-amber-500/10',
      border: 'border-amber-400/30',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-950/70',
      badgeText: 'text-amber-300',
      cardBg: 'from-amber-950/40 via-slate-900/80 to-slate-950',
      hoverBorder: 'hover:border-amber-400/60',
      accent: '#f59e0b',
    },
    parallels: [
      { parallel: 'A', courseCode: '3A', classroom: 'Aula 201 - Pabellón B', shift: 'tarde', estimatedStudents: 33 },
      { parallel: 'B', courseCode: '3B', classroom: 'Aula 202 - Pabellón B', shift: 'tarde', estimatedStudents: 31 },
      { parallel: 'D', courseCode: '3D', classroom: 'Aula 203 - Pabellón B', shift: 'tarde', estimatedStudents: 28 },
    ],
  },
  {
    gradeNumber: 4,
    name: '4.° de Secundaria',
    label: '4.° Secundaria',
    shortCode: '4SEC',
    description: 'Cuarto año de Secundaria Comunitaria Productiva',
    colorTheme: {
      bgLight: 'bg-purple-500/10',
      border: 'border-purple-400/30',
      text: 'text-purple-400',
      badgeBg: 'bg-purple-950/70',
      badgeText: 'text-purple-300',
      cardBg: 'from-purple-950/40 via-slate-900/80 to-slate-950',
      hoverBorder: 'hover:border-purple-400/60',
      accent: '#8b5cf6',
    },
    parallels: [
      { parallel: 'A', courseCode: '4A', classroom: 'Aula 204 - Pabellón B', shift: 'tarde', estimatedStudents: 34 },
      { parallel: 'B', courseCode: '4B', classroom: 'Aula 205 - Pabellón B', shift: 'tarde', estimatedStudents: 32 },
    ],
  },
  {
    gradeNumber: 5,
    name: '5.° de Secundaria',
    label: '5.° Secundaria',
    shortCode: '5SEC',
    description: 'Quinto año - Bachillerato Técnico Humanístico (BTH)',
    colorTheme: {
      bgLight: 'bg-indigo-500/10',
      border: 'border-indigo-400/30',
      text: 'text-indigo-400',
      badgeBg: 'bg-indigo-950/70',
      badgeText: 'text-indigo-300',
      cardBg: 'from-indigo-950/40 via-slate-900/80 to-slate-950',
      hoverBorder: 'hover:border-indigo-400/60',
      accent: '#6366f1',
    },
    parallels: [
      { parallel: 'A', courseCode: '5A', classroom: 'Aula 301 - Pabellón BTH', shift: 'tarde', estimatedStudents: 32 },
      { parallel: 'B', courseCode: '5B', classroom: 'Aula 302 - Pabellón BTH', shift: 'tarde', estimatedStudents: 30 },
    ],
  },
  {
    gradeNumber: 6,
    name: '6.° de Secundaria',
    label: '6.° Secundaria (Promoción)',
    shortCode: '6SEC',
    description: 'Sexto año de Secundaria - Promoción Gestión 2026',
    colorTheme: {
      bgLight: 'bg-rose-500/10',
      border: 'border-rose-400/30',
      text: 'text-rose-400',
      badgeBg: 'bg-rose-950/70',
      badgeText: 'text-rose-300',
      cardBg: 'from-rose-950/40 via-slate-900/80 to-slate-950',
      hoverBorder: 'hover:border-rose-400/60',
      accent: '#f43f5e',
    },
    parallels: [
      { parallel: 'A', courseCode: '6A', classroom: 'Aula Magna 303 - BTH', shift: 'tarde', estimatedStudents: 28 },
      { parallel: 'B', courseCode: '6B', classroom: 'Aula 304 - Pabellón BTH', shift: 'tarde', estimatedStudents: 27 },
      { parallel: 'D', courseCode: '6D', classroom: 'Aula 305 - Pabellón BTH', shift: 'tarde', estimatedStudents: 26 },
    ],
  },
];

export function findGradeByNumber(gradeNum: number): SecondaryGradeDefinition | undefined {
  return OFFICIAL_SECONDARY_GRADES.find(g => g.gradeNumber === gradeNum);
}

export function findParallelByCode(courseCode: string): { grade: SecondaryGradeDefinition; parallel: ParallelDefinition } | null {
  for (const grade of OFFICIAL_SECONDARY_GRADES) {
    const p = grade.parallels.find(item => item.courseCode === courseCode);
    if (p) return { grade, parallel: p };
  }
  return null;
}
