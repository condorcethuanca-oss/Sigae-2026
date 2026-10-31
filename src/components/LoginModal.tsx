import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Lock, KeyRound, AlertCircle, CheckCircle, School } from 'lucide-react';
import { api } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  availableUsers: User[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  availableUsers,
}) => {
  const [schoolCode, setSchoolCode] = useState('80730142');
  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [password, setPassword] = useState('••••••••');
  const [teacherPin, setTeacherPin] = useState('7731');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Set default user based on selected role
  React.useEffect(() => {
    const defaultUser = availableUsers.find(u => u.role === selectedRole);
    if (defaultUser) {
      setSelectedUserEmail(defaultUser.email);
      if (defaultUser.role === 'teacher' && defaultUser.teacherPin) {
        setTeacherPin(defaultUser.teacherPin);
      }
    }
  }, [selectedRole, availableUsers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.login({
        email: selectedUserEmail,
        role: selectedRole,
        schoolCode,
        teacherPin: selectedRole === 'teacher' ? teacherPin : undefined,
      });

      onLoginSuccess(response.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error en la verificación de seguridad');
    } finally {
      setLoading(false);
    }
  };

  const usersForRole = availableUsers.filter(u => u.role === selectedRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Acceso Privado Institucional
              </h2>
              <p className="text-xs text-slate-400">
                Colegio Privado San Martín de Porres
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs bg-slate-800/80 border border-slate-700 rounded-md p-2.5 text-slate-300">
            <span className="font-medium text-amber-300">Seguridad Reforzada:</span> Sistema cerrado exclusivo para miembros acreditados de la institución educativa.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* School Code Check */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Código Privado del Colegio
            </label>
            <div className="relative">
              <input
                type="text"
                value={schoolCode}
                onChange={e => setSchoolCode(e.target.value)}
                placeholder="80730142"
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Verificado
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Garantiza que nadie ajeno a este colegio pueda ingresar a los registros.
            </p>
          </div>

          {/* Role Selector Tabs */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Tipo de Usuario
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700">
              {(['teacher', 'parent', 'student', 'admin'] as UserRole[]).map(role => (
                <button
                  type="button"
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`py-1.5 px-2 rounded font-medium text-[11px] transition-colors ${
                    selectedRole === role
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  {role === 'teacher' && 'Profesor'}
                  {role === 'parent' && 'Padre'}
                  {role === 'student' && 'Alumno'}
                  {(role === 'director' || (role as string) === 'admin') && 'Director'}
                </button>
              ))}
            </div>
          </div>

          {/* User selector */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Cuenta Institucional
            </label>
            <select
              value={selectedUserEmail}
              onChange={e => {
                setSelectedUserEmail(e.target.value);
                const u = availableUsers.find(user => user.email === e.target.value);
                if (u?.teacherPin) setTeacherPin(u.teacherPin);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {usersForRole.map(u => (
                <option key={u.id} value={u.email}>
                  {u.name} — {u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Extra Teacher Private Security Shield */}
          {selectedRole === 'teacher' && (
            <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-medium">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>PIN de Seguridad Docente Privado (Requerido)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Por estricta política de confidencialidad, el profesor requiere un PIN único para asentar y publicar notas oficiales:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={teacherPin}
                  onChange={e => setTeacherPin(e.target.value)}
                  maxLength={6}
                  placeholder="Ej. 7731"
                  className="w-36 bg-slate-900 border border-indigo-700/70 rounded px-3 py-1.5 font-mono text-center tracking-widest text-amber-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <span className="text-[11px] text-slate-400">
                  (PIN demo: <strong className="text-amber-300">{teacherPin || '7731'}</strong>)
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              {loading ? 'Validando credenciales...' : 'Ingresar al Portal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
