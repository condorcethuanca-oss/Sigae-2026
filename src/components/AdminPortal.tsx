import React, { useState } from 'react';
import { User, Course, UserRole } from '../types';
import { api } from '../services/api';
import {
  Users,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  UserPlus,
  Search,
  CheckCircle2,
  Lock,
  Mail,
  BookOpen,
  Filter,
} from 'lucide-react';

interface AdminPortalProps {
  users: User[];
  courses: Course[];
  onRefreshData: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  users,
  courses,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'teachers' | 'parents' | 'courses'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for adding user
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('5to de Secundaria');
  const [newSection, setNewSection] = useState('A');
  const [newTeacherPin, setNewTeacherPin] = useState('5521');
  const [submitting, setSubmitting] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState<string | null>(null);

  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');
  const parents = users.filter(u => u.role === 'parent');

  const filteredStudents = students.filter(
    s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter(
    t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredParents = parents.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setAddSuccessMsg(null);

    try {
      await api.registerUser({
        name: newName,
        email: newEmail,
        role: newRole,
        specialty: newRole === 'teacher' ? newSpecialty : undefined,
        gradeLevel: newRole === 'student' ? newGradeLevel : undefined,
        section: newRole === 'student' ? newSection : undefined,
        teacherPin: newRole === 'teacher' ? newTeacherPin : undefined,
      });

      setAddSuccessMsg(`¡${newName} registrado con éxito en la base de datos!`);
      setTimeout(() => {
        setAddSuccessMsg(null);
        setShowAddModal(false);
        setNewName('');
        setNewEmail('');
      }, 1500);

      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Error al registrar usuario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Alumnos</span>
            <GraduationCap className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{students.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Matrículas activas 2026</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Cuerpo Docente</span>
            <Briefcase className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{teachers.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Profesores con PIN privado</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Padres / Tutores</span>
            <HeartHandshake className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{parents.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Con acceso en tiempo real</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Materias Activas</span>
            <BookOpen className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{courses.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Currícula Secundaria 2026</div>
        </div>
      </div>

      {/* Main Database Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Subtabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
            <button
              onClick={() => setActiveSubTab('students')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeSubTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Alumnos ({students.length})
            </button>
            <button
              onClick={() => setActiveSubTab('teachers')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeSubTab === 'teachers'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Profesores ({teachers.length})
            </button>
            <button
              onClick={() => setActiveSubTab('parents')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeSubTab === 'parents'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Padres ({parents.length})
            </button>
            <button
              onClick={() => setActiveSubTab('courses')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeSubTab === 'courses'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Materias ({courses.length})
            </button>
          </div>

          {/* Search & Add Action */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="bg-slate-800 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Registrar Nuevo
            </button>
          </div>
        </div>

        {/* Tab 1: Students */}
        {activeSubTab === 'students' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Código</th>
                  <th className="py-3 px-4 font-semibold">Estudiante</th>
                  <th className="py-3 px-4 font-semibold">Correo Institucional</th>
                  <th className="py-3 px-4 font-semibold">Grado / Sección</th>
                  <th className="py-3 px-4 font-semibold">Padre / Tutor Asignado</th>
                  <th className="py-3 px-4 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredStudents.map(student => {
                  const parent = parents.find(p => p.id === student.parentId);
                  return (
                    <tr key={student.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-slate-400 font-medium">
                        {student.studentCode || 'ALU-2026'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{student.name}</td>
                      <td className="py-3 px-4 text-slate-400">{student.email}</td>
                      <td className="py-3 px-4">
                        {student.gradeLevel} ({student.section || 'A'})
                      </td>
                      <td className="py-3 px-4">
                        {parent ? (
                          <span className="text-slate-300 font-medium">{parent.name}</span>
                        ) : (
                          <span className="text-slate-500 italic">No asignado</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Teachers */}
        {activeSubTab === 'teachers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Docente</th>
                  <th className="py-3 px-4 font-semibold">Correo</th>
                  <th className="py-3 px-4 font-semibold">Especialidad</th>
                  <th className="py-3 px-4 font-semibold">Cursos Asignados</th>
                  <th className="py-3 px-4 font-semibold">Seguridad PIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredTeachers.map(teacher => {
                  const teacherAssignedCourses = courses.filter(c => c.teacherId === teacher.id);
                  return (
                    <tr key={teacher.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">{teacher.name}</td>
                      <td className="py-3 px-4 text-slate-400">{teacher.email}</td>
                      <td className="py-3 px-4 text-slate-300">{teacher.specialty}</td>
                      <td className="py-3 px-4">
                        <span className="text-indigo-400 font-medium">
                          {teacherAssignedCourses.map(c => c.name).join(', ') || 'Sin cursos'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                          {teacher.teacherPin || '••••'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Parents */}
        {activeSubTab === 'parents' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Padre / Tutor</th>
                  <th className="py-3 px-4 font-semibold">Correo de Notificaciones</th>
                  <th className="py-3 px-4 font-semibold">Hijo(s) Vinculado(s)</th>
                  <th className="py-3 px-4 font-semibold">Acceso Móvil / Web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredParents.map(parent => {
                  const linked = students.filter(s => parent.linkedStudentIds?.includes(s.id));
                  return (
                    <tr key={parent.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">{parent.name}</td>
                      <td className="py-3 px-4 text-slate-400">{parent.email}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {linked.length > 0 ? (
                            linked.map(k => (
                              <span
                                key={k.id}
                                className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded text-[11px]"
                              >
                                {k.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 italic">Sin vincular</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-400 font-medium">Habilitado</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Courses */}
        {activeSubTab === 'courses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Código</th>
                  <th className="py-3 px-4 font-semibold">Nombre de Materia</th>
                  <th className="py-3 px-4 font-semibold">Nivel Escolar</th>
                  <th className="py-3 px-4 font-semibold">Profesor Asignado</th>
                  <th className="py-3 px-4 font-semibold">Horario Semanal</th>
                  <th className="py-3 px-4 font-semibold">Créditos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {courses.map(course => (
                  <tr key={course.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-400">{course.code}</td>
                    <td className="py-3 px-4 font-semibold text-white">{course.name}</td>
                    <td className="py-3 px-4 text-slate-300">{course.gradeLevel} ({course.section})</td>
                    <td className="py-3 px-4 text-indigo-400 font-medium">{course.teacherName}</td>
                    <td className="py-3 px-4 text-slate-400">{course.schedule}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{course.credits} cr.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-1">
              Registrar Nuevo Miembro en la Base de Datos Escolar
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Colegio Privado San Martín de Porres · Sistema Confidencial
            </p>

            {addSuccessMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs rounded-md mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{addSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tipo de Registro</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['student', 'teacher', 'parent'] as UserRole[]).map(role => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => setNewRole(role)}
                      className={`py-2 px-3 rounded text-center font-medium transition-colors ${
                        newRole === role
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {role === 'student' && 'Estudiante'}
                      {role === 'teacher' && 'Profesor'}
                      {role === 'parent' && 'Padre de Familia'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej. Andrés Navarro Quispe"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="andres.navarro@sanmartin.edu.pe"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {newRole === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nivel Escolar</label>
                    <select
                      value={newGradeLevel}
                      onChange={e => setNewGradeLevel(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                    >
                      <option value="5to de Secundaria">5to de Secundaria</option>
                      <option value="4to de Secundaria">4to de Secundaria</option>
                      <option value="3ro de Secundaria">3ro de Secundaria</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Sección</label>
                    <input
                      type="text"
                      value={newSection}
                      onChange={e => setNewSection(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              {newRole === 'teacher' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Especialidad Académica
                    </label>
                    <input
                      type="text"
                      value={newSpecialty}
                      onChange={e => setNewSpecialty(e.target.value)}
                      placeholder="Ej. Química y Biología Molecular"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Asignar PIN de Seguridad Privado
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={newTeacherPin}
                      onChange={e => setNewTeacherPin(e.target.value)}
                      className="w-36 bg-slate-900 border border-indigo-700 rounded px-3 py-2 font-mono text-center tracking-widest text-amber-300"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Guardando en Base de Datos...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
