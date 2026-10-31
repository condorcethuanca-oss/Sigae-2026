import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  BookOpen,
  MessageSquare,
  BadgeCheck,
  School,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  UserPlus,
  Search,
  Filter,
  FileText,
  Building,
  Sparkles,
} from 'lucide-react';
import { SigaeUser, TeacherRecord } from '../../types';
import { directorService } from '../../firebase/directorService';
import { studentService } from '../../firebase/studentService';

interface DirectorDashboardProps {
  currentUser: SigaeUser;
  onNavigateToTab: (tab: 'inicio' | 'academico' | 'mensajeria' | 'perfil') => void;
}

export const DirectorDashboard: React.FC<DirectorDashboardProps> = ({
  currentUser,
  onNavigateToTab,
}) => {
  const [searchDocente, setSearchDocente] = useState('');
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = directorService.subscribeTeachers(list => {
      setTeachers(list);
      setLoading(false);
    });

    studentService.getAllStudents().then(st => {
      setStudentCount(st.length);
    }).catch(() => setStudentCount(0));

    return () => unsub();
  }, []);

  const filteredTeachers = teachers.filter(t =>
    t.fullName.toLowerCase().includes(searchDocente.toLowerCase()) ||
    t.specialty.toLowerCase().includes(searchDocente.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. INSTITUTIONAL BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shrink-0">
              <School className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Despacho de Dirección Académica
                </h1>
                <span className="text-xs font-mono bg-indigo-950 border border-indigo-700/60 text-indigo-300 px-2.5 py-0.5 rounded-full">
                  SIE: 80730142
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  NIVEL MÁXIMO
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Director Titular: <strong className="text-white">{currentUser.displayName}</strong> · U.E. Luis Espinal Tarde de Collpani (SIE 80730142) · El Alto, Bolivia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateToTab('mensajeria')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Emitir Comunicado</span>
            </button>
            <button
              onClick={() => onNavigateToTab('academico')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gestionar Cursos</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. INSTITUTIONAL KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Plantel Docente</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {teachers.length} <span className="text-xs font-normal text-slate-500">profesores</span>
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <span>{teachers.filter(t => t.status === 'activo').length} activos</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400">{teachers.filter(t => t.status === 'licencia').length} en licencia</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Cursos y Paralelos</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            12 <span className="text-xs font-normal text-slate-500">aulas</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Secundaria Comunitaria Productiva
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Estudiantes Matriculados</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {studentCount} <span className="text-xs font-normal text-slate-500">estudiantes</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {studentCount > 0 ? 'Registro institucional verificado' : 'Padrón en carga oficial'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Seguridad de Acceso</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400">
            FIREBASE EN LÍNEA
          </div>
          <div className="text-[11px] text-slate-400">
            Reglas jerárquicas activas
          </div>
        </div>
      </div>

      {/* 3. TEACHERS MANAGEMENT INITIAL VISUAL TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Plantel Docente Institucional</span>
            </h2>
            <p className="text-xs text-slate-400">
              Supervisión de profesores asignados a la unidad educativa ({teachers.length} registrados)
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchDocente}
              onChange={e => setSearchDocente(e.target.value)}
              placeholder="Buscar profesor o materia..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Teachers Table */}
        <div className="overflow-x-auto">
          {filteredTeachers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No hay profesores registrados que coincidan con la búsqueda.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                  <th className="pb-3 font-semibold">Docente Titular</th>
                  <th className="pb-3 font-semibold">Especialidad</th>
                  <th className="pb-3 font-semibold">Cursos Asignados</th>
                  <th className="pb-3 font-semibold">Contacto</th>
                  <th className="pb-3 font-semibold text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTeachers.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 font-semibold text-white">
                      {teacher.fullName}
                    </td>
                    <td className="py-3 text-indigo-300">
                      {teacher.specialty}
                    </td>
                    <td className="py-3 text-slate-300">
                      {teacher.assignedGrades && teacher.assignedGrades.length > 0
                        ? teacher.assignedGrades.join(', ')
                        : 'Sin asignación'}
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {teacher.phone || teacher.email}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        teacher.status === 'activo'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : teacher.status === 'licencia'
                          ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}>
                        {teacher.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. RECENT OFFICIAL COMMUNICATIONS PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>Últimos Comunicados de Dirección</span>
            </h3>
            <button
              onClick={() => onNavigateToTab('mensajeria')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Ver todos →
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Circular N° 04/2026: Planificación Curricular Trimestral
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Ayer</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recordatorio a todos los profesores para la presentación de los Planes de Desarrollo Curricular (PDC).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Convocatoria a Consejo Pedagógico de Evaluación
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Hoy</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Reunión técnica de seguimiento de medio término con plantel docente.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              <span>Identidad Institucional (Bolivia)</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">SIE 80730142</span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500 font-medium">Unidad Educativa:</span>
              <span className="font-semibold text-white">Luis Espinal (Collpani)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500 font-medium">Departamento / Distrito:</span>
              <span>La Paz · El Alto 1</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/50">
              <span className="text-slate-500 font-medium">Turno:</span>
              <span>Tarde</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Periodo Escolar:</span>
              <span className="text-indigo-400 font-semibold">Gestión 2026 · Trimestral</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
