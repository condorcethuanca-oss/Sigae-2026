import React from 'react';
import {
  User,
  Shield,
  Briefcase,
  HeartHandshake,
  GraduationCap,
  Mail,
  Phone,
  School,
  Calendar,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { SigaeUser } from '../../types';

interface PerfilViewProps {
  currentUser: SigaeUser;
}

export const PerfilView: React.FC<PerfilViewProps> = ({ currentUser }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shrink-0">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-full h-full object-cover" />
            ) : (
              <span>{currentUser.displayName.charAt(0)}</span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{currentUser.displayName}</h2>
            <p className="text-xs text-slate-400 font-mono">{currentUser.email}</p>
            <div className="mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                Rol: {currentUser.role.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Profile info fields */}
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Cédula de Identidad</span>
              <div className="font-mono text-white font-semibold">
                {currentUser.ci || '4829103 LP'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Teléfono / Celular</span>
              <div className="font-mono text-white font-semibold">
                {currentUser.phone || '+591 71542389'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Unidad Educativa</span>
              <div className="text-white font-semibold">
                U.E. Luis Espinal Tarde de Collpani (SIE: 80730142)
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium">Estado en el Sistema</span>
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Activo y Autorizado</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Seguridad y Privacidad Institucional</span>
          </div>
          <p>
            Tu cuenta y perfil están protegidos mediante Firebase Authentication y reglas de seguridad jerárquicas en Cloud Firestore.
          </p>
        </div>
      </div>
    </div>
  );
};
