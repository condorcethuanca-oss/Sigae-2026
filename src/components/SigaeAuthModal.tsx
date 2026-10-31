import React, { useState } from 'react';
import { SigaeUser, SigaeRole } from '../types';
import { authService, DEMO_ACCOUNTS } from '../firebase/authService';
import {
  Shield,
  Lock,
  Mail,
  User,
  School,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  X,
  Phone,
  GraduationCap,
  Briefcase,
  HeartHandshake,
  UserCheck,
} from 'lucide-react';

interface SigaeAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: SigaeUser) => void;
}

const ROLES_INFO: Array<{
  role: SigaeRole;
  label: string;
  sublabel: string;
  icon: any;
  color: string;
  borderColor: string;
}> = [
  {
    role: 'director',
    label: 'DIRECTOR',
    sublabel: 'Administra y gestiona a los Profesores',
    icon: Shield,
    color: 'text-indigo-400 bg-indigo-950/60',
    borderColor: 'border-indigo-700/60',
  },
  {
    role: 'profesor',
    label: 'PROFESOR',
    sublabel: 'Gestiona su grupo de Padres y Alumnos',
    icon: Briefcase,
    color: 'text-amber-400 bg-amber-950/60',
    borderColor: 'border-amber-700/60',
  },
  {
    role: 'padre',
    label: 'PADRE / MADRE',
    sublabel: 'Accede a la información de sus hijos',
    icon: HeartHandshake,
    color: 'text-emerald-400 bg-emerald-950/60',
    borderColor: 'border-emerald-800/60',
  },
  {
    role: 'alumno',
    label: 'ALUMNO',
    sublabel: 'Accede a su propia información académica',
    icon: GraduationCap,
    color: 'text-sky-400 bg-sky-950/60',
    borderColor: 'border-sky-800/60',
  },
];

export const SigaeAuthModal: React.FC<SigaeAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'demo_roles' | 'email_login' | 'register'>('demo_roles');
  const [selectedRole, setSelectedRole] = useState<SigaeRole>('director');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ci, setCi] = useState('');
  const [phone, setPhone] = useState('');
  const [regRole, setRegRole] = useState<SigaeRole>('director');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Quick Demo Login per Role
  const handleQuickRoleLogin = async (role: SigaeRole) => {
    setLoading(true);
    setError(null);
    try {
      const user = await authService.quickLoginAsRole(role);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error en inicio de sesión');
    } finally {
      setLoading(false);
    }
  };

  // Handle Standard Email Login via Firebase Auth
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await authService.loginWithEmail(email, password);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      // Check if credentials match any of our demo accounts
      const matchedDemo = Object.values(DEMO_ACCOUNTS).find(
        acc => acc.email.toLowerCase() === email.toLowerCase()
      );
      if (matchedDemo) {
        const user = await authService.quickLoginAsRole(matchedDemo.role);
        onLoginSuccess(user);
        onClose();
        return;
      }

      setError(
        err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
          ? 'Credenciales incorrectas o usuario no registrado en Firebase Auth. Puedes utilizar los botones de acceso por rol arriba.'
          : err.message || 'Error al autenticar usuario.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Register New User with Role
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await authService.registerUser({
        email,
        pass: password,
        displayName,
        role: regRole,
        ci,
        phone,
      });

      onLoginSuccess(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario en Firebase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  SIGAE · Bolivia
                </h2>
                <p className="text-xs text-slate-400">
                  Autenticación de Usuarios con Firebase
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 text-[11px] bg-slate-800/80 border border-slate-700/70 rounded-md p-2.5 text-slate-300">
            <span className="font-semibold text-emerald-400">Control de Acceso Estricto (RBAC):</span> Cada usuario ingresa únicamente al panel que le corresponde según su rol asignado.
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 text-xs">
          <button
            onClick={() => setActiveTab('demo_roles')}
            className={`flex-1 py-2.5 px-3 text-center font-medium transition-colors ${
              activeTab === 'demo_roles'
                ? 'border-b-2 border-indigo-500 text-white font-semibold bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Acceso Directo por Rol
          </button>
          <button
            onClick={() => setActiveTab('email_login')}
            className={`flex-1 py-2.5 px-3 text-center font-medium transition-colors ${
              activeTab === 'email_login'
                ? 'border-b-2 border-indigo-500 text-white font-semibold bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Correo y Clave
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2.5 px-3 text-center font-medium transition-colors ${
              activeTab === 'register'
                ? 'border-b-2 border-indigo-500 text-white font-semibold bg-slate-900/60'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registrar Usuario
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-xs space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 text-rose-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: 4 Roles Selection */}
          {activeTab === 'demo_roles' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Selecciona uno de los 4 tipos de usuario para ingresar inmediatamente con su cuenta de prueba institucional y comprobar la restricción de paneles:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {ROLES_INFO.map(r => {
                  const Icon = r.icon;
                  const account = DEMO_ACCOUNTS[r.role];

                  return (
                    <button
                      key={r.role}
                      onClick={() => handleQuickRoleLogin(r.role)}
                      disabled={loading}
                      className={`p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] flex items-center justify-between group ${r.borderColor} bg-slate-950/60 hover:bg-slate-800/60`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{r.label}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({account.ci})</span>
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">{account.displayName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{r.sublabel}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-indigo-400 text-xs font-semibold shrink-0 ml-2">
                        <span>Ingresar</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Standard Email & Password Form */}
          {activeTab === 'email_login' && (
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-[11px] space-y-2">
                <span className="text-slate-400 block">
                  Autenticación real con <strong className="text-indigo-400">Firebase Auth (Email y Contraseña)</strong>.
                  Puedes ingresar tus credenciales o hacer clic para auto-rellenar una cuenta de prueba:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('director@sigae.edu.bo');
                      setPassword('Sigae2026!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-indigo-900/60 text-indigo-300 text-[10px] text-left truncate transition-colors"
                  >
                    👑 Director (director@...)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('carlos.mamani@franztamayo.edu.bo');
                      setPassword('Sigae2026!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-900/60 text-amber-300 text-[10px] text-left truncate transition-colors"
                  >
                    📚 Profesor (carlos.mamani@...)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('padre.gonzalez@familia.bo');
                      setPassword('Sigae2026!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-900/60 text-emerald-300 text-[10px] text-left truncate transition-colors"
                  >
                    👨‍👩‍👦 Padre (padre.gonzalez@...)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('santiago.gonzalez@estudiante.bo');
                      setPassword('Sigae2026!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-sky-900/60 text-sky-300 text-[10px] text-left truncate transition-colors"
                  >
                    🎓 Alumno (santiago.gonzalez@...)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Correo Electrónico Institucional</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="director@sigae.edu.bo"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">Contraseña</label>
                  <span className="text-[10px] text-slate-400 font-mono">Clave demo: Sigae2026!</span>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{loading ? 'Validando con Firebase Auth...' : 'Iniciar Sesión por Correo'}</span>
              </button>
            </form>
          )}

          {/* TAB 3: Register New User */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterUser} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tipo de Usuario (Rol)</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES_INFO.map(r => (
                    <button
                      type="button"
                      key={r.role}
                      onClick={() => setRegRole(r.role)}
                      className={`py-2 px-2.5 rounded-lg border text-left font-medium transition-colors text-[11px] ${
                        regRole === r.role
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Ej. Carmen Quispe Choque"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">C.I. (Bolivia)</label>
                  <input
                    type="text"
                    value={ci}
                    onChange={e => setCi(e.target.value)}
                    placeholder="6829104 LP"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+591 71234567"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@franztamayo.edu.bo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Contraseña *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{loading ? 'Creando cuenta en Firebase...' : 'Registrar Cuenta'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
