import React from 'react';
import { ShieldAlert, ArrowLeft, School } from 'lucide-react';
import { SigaeRole } from '../types';

interface AccessDeniedNoticeProps {
  userRole: SigaeRole;
  attemptedPanel: string;
  onGoToAuthorizedPanel: () => void;
}

export const AccessDeniedNotice: React.FC<AccessDeniedNoticeProps> = ({
  userRole,
  attemptedPanel,
  onGoToAuthorizedPanel,
}) => {
  const getRoleLabel = (r: SigaeRole) => {
    switch (r) {
      case 'director':
        return 'DIRECTOR';
      case 'profesor':
        return 'PROFESOR';
      case 'padre':
        return 'PADRE / MADRE';
      case 'alumno':
        return 'ALUMNO';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-800/60 rounded-3xl p-8 max-w-lg w-full text-center text-slate-200 shadow-2xl space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/70 border border-rose-700/60 flex items-center justify-center text-rose-400 mx-auto shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            U.E. Luis Espinal Tarde de Collpani · SIE: 80730142
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Acceso Restringido por Nivel Jerárquico
          </h2>
          <p className="text-xs text-rose-300 font-medium">
            Ruta solicitada: <span className="underline">{attemptedPanel}</span>
          </p>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
          Tu cuenta actual está registrada con el rol de <strong className="text-white uppercase">{getRoleLabel(userRole)}</strong>.
          Por políticas de control de acceso institucional (RBAC) y las directrices del Checkpoint actual, los módulos de Profesor, Padre/Madre y Alumno no están activos todavía.
        </p>

        <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
          <span className="font-semibold text-slate-300 block mb-1">Estructura Jerárquica de SIGAE:</span>
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong className="text-indigo-300">DIRECTOR:</strong> Administra la institución y gestiona al personal docente (Módulo activo).</li>
            <li><strong className="text-amber-300">PROFESOR:</strong> Próxima etapa (calificaciones y asistencia).</li>
            <li><strong className="text-emerald-300">PADRE/MADRE:</strong> Próxima etapa (seguimiento familiar).</li>
            <li><strong className="text-sky-300">ALUMNO:</strong> Próxima etapa (boletines y tareas).</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGoToAuthorizedPanel}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cerrar sesión institucional</span>
          </button>
        </div>
      </div>
    </div>
  );
};
