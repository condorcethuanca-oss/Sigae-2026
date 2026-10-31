import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Users,
  AlertTriangle,
  FileText,
  Send,
  X,
  School,
  Sparkles,
} from 'lucide-react';
import {
  SigaeUser,
  KardexEntry,
  KardexLevel,
  KardexCategory,
} from '../../types';
import { kardexService } from '../../firebase/kardexService';
import { SECONDARY_24_COURSES } from '../../firebase/scheduleService';

interface DirectorKardexViewProps {
  currentUser: SigaeUser;
}

export const DirectorKardexView: React.FC<DirectorKardexViewProps> = ({ currentUser }) => {
  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<KardexLevel | 'todos'>('todos');
  const [filterCourse, setFilterCourse] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution modal
  const [resolvingEntry, setResolvingEntry] = useState<KardexEntry | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [savingResolution, setSavingResolution] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadAllKardex = async () => {
    setLoading(true);
    try {
      const data = await kardexService.getAllEntries();
      setEntries(data);
    } catch (err) {
      console.error('Error cargando kárdex institucional:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllKardex();
  }, []);

  const handleResolveByDirection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingEntry || !resolutionNote.trim()) return;

    setSavingResolution(true);
    try {
      await kardexService.resolveByDirection(
        resolvingEntry.id,
        currentUser.uid,
        currentUser.displayName,
        resolutionNote.trim()
      );

      setSuccessBanner(
        `Resolución de Dirección emitida y caso cerrado con éxito para ${resolvingEntry.studentName}.`
      );
      setResolvingEntry(null);
      setResolutionNote('');
      await loadAllKardex();
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err) {
      console.error('Error al resolver caso de kárdex:', err);
      alert('Ocurrió un error al emitir la resolución.');
    } finally {
      setSavingResolution(false);
    }
  };

  const getLevelBadge = (lvl: KardexLevel) => {
    switch (lvl) {
      case 1:
        return {
          label: 'N1: Informativo',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          dot: 'bg-emerald-400',
        };
      case 2:
        return {
          label: 'N2: Atención',
          badge: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
          dot: 'bg-sky-400',
        };
      case 3:
        return {
          label: 'N3: Familiar',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
          dot: 'bg-amber-400',
        };
      case 4:
        return {
          label: 'N4: Dirección',
          badge: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
          dot: 'bg-rose-400',
        };
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesLevel = filterLevel === 'todos' || e.level === filterLevel;
    const matchesCourse = filterCourse === 'todos' || e.courseCode === filterCourse;
    const matchesSearch =
      !searchQuery.trim() ||
      e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesCourse && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Banner de Éxito */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabecera de Dirección */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Auditoría y Supervisión de Kárdex Institucional
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supervisión directiva de convivencia, citaciones y resoluciones oficiales · SIE 80730142
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <School className="w-4 h-4 text-indigo-400" />
          <span>Gestión 2026 · Secundaria (24 Cursos)</span>
        </div>
      </div>

      {/* Métricas por Nivel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { lvl: 1, title: 'Nivel 1 (Formativo)', desc: 'Felicitaciones y avisos formativos', color: 'text-emerald-400' },
          { lvl: 2, title: 'Nivel 2 (Atención)', desc: 'Llamadas de atención leves', color: 'text-sky-400' },
          { lvl: 3, title: 'Nivel 3 (Familiar)', desc: 'Citaciones familiares', color: 'text-amber-400' },
          { lvl: 4, title: 'Nivel 4 (Prioritario)', desc: 'Casos críticos para Dirección', color: 'text-rose-400' },
        ].map(item => {
          const count = entries.filter(e => e.level === item.lvl).length;
          return (
            <div
              key={item.lvl}
              onClick={() => setFilterLevel(item.lvl as KardexLevel)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                filterLevel === item.lvl
                  ? 'bg-slate-800 border-indigo-500 shadow-lg'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{item.title}</span>
                <span className={`text-xl font-black font-mono ${item.color}`}>{count}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Nivel */}
          <select
            value={filterLevel}
            onChange={e =>
              setFilterLevel(e.target.value === 'todos' ? 'todos' : (Number(e.target.value) as KardexLevel))
            }
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
          >
            <option value="todos">Todos los Niveles (1 al 4)</option>
            <option value="1">Nivel 1: Informativo</option>
            <option value="2">Nivel 2: Llamada de atención</option>
            <option value="3">Nivel 3: Atención familiar</option>
            <option value="4">Nivel 4: Atención prioritaria</option>
          </select>

          {/* Curso */}
          <select
            value={filterCourse}
            onChange={e => setFilterCourse(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
          >
            <option value="todos">Todos los 24 Cursos</option>
            {SECONDARY_24_COURSES.map(c => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.gradeLevel} "{c.parallel}")
              </option>
            ))}
          </select>
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por alumno, docente, motivo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
          />
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-white text-xs">
            Casos Registrados ({filteredEntries.length})
          </span>
          <button
            onClick={loadAllKardex}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Actualizar registros
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <Clock className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-400" />
            Cargando registros institucionales...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-medium text-slate-300">No se encontraron observaciones con los filtros actuales.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredEntries.map(item => {
              const lvlInfo = getLevelBadge(item.level);
              return (
                <div key={item.id} className="p-4.5 hover:bg-slate-800/30 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase inline-flex items-center gap-1 ${lvlInfo.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${lvlInfo.dot}`}></span>
                        {lvlInfo.label}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {item.studentName}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {item.courseCode} · {item.gradeLevel}
                      </span>
                      <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded uppercase font-medium">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>{item.date} {item.time && `· ${item.time}`}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Estado: {item.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Docente emisor */}
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Registrado por Prof. <strong className="text-slate-200">{item.teacherName}</strong>
                      {item.subject && ` (${item.subject})`}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/70">
                      {item.description}
                    </p>
                  </div>

                  {/* Estado de Respuesta Familiar y de Dirección */}
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      {item.familyAcknowledged ? (
                        <div className="text-emerald-400 text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>
                            <strong>Tutor legal acusa recibo: </strong>
                            "{item.familyResponseNote || 'Notificación aceptada.'}"
                          </span>
                        </div>
                      ) : item.requiresFamilySignature ? (
                        <div className="text-amber-400 text-[11px] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Pendiente de acuse del tutor legal en el portal.</span>
                        </div>
                      ) : null}

                      {item.directionResolution && (
                        <div className="text-rose-300 text-[11px] flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>
                            <strong>Resolución de Dirección: </strong>
                            "{item.directionResolution}"
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botón Emitir Resolución (para Nivel 4 o casos abiertos) */}
                    {!item.directionResolution && (
                      <button
                        onClick={() => {
                          setResolvingEntry(item);
                          setResolutionNote('');
                        }}
                        className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Emitir Resolución Directiva</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Resolución de Dirección */}
      {resolvingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Resolución Directiva de Caso de Kárdex
                </h3>
              </div>
              <button
                onClick={() => setResolvingEntry(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveByDirection} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-white font-semibold">{resolvingEntry.title}</div>
                <div className="text-slate-300">
                  Estudiante: <strong>{resolvingEntry.studentName}</strong> ({resolvingEntry.courseCode})
                </div>
                <p className="text-[11px] text-slate-400">{resolvingEntry.description}</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Resolución Administrativa o Pedagógica de Dirección: *
                </label>
                <textarea
                  rows={4}
                  required
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  placeholder="Escriba la determinación de Dirección (ej: 'Se sostuvo audiencia reflexiva con el padre y estudiante; se acuerda seguimiento pedagógico semanal y trabajo comunitario')..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none text-xs"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingEntry(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingResolution}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm shadow-rose-600/30"
                >
                  {savingResolution ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Emitir Resolución y Cerrar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
