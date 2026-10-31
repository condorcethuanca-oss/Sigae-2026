import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  HeartHandshake,
  FileText,
  AlertTriangle,
  Award,
  ChevronRight,
  Send,
  X,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import {
  SigaeUser,
  KardexEntry,
  KardexLevel,
} from '../../types';
import { kardexService } from '../../firebase/kardexService';
import { studentService, ParentStudentLink } from '../../firebase/studentService';

interface FamilyKardexViewProps {
  currentUser: SigaeUser;
}

export const FamilyKardexView: React.FC<FamilyKardexViewProps> = ({ currentUser }) => {
  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChildId, setActiveChildId] = useState<string>('');
  const [childrenList, setChildrenList] = useState<{ id: string; name: string; course: string }[]>([]);

  // Response Modal State
  const [respondingEntry, setRespondingEntry] = useState<KardexEntry | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Cargar estudiantes vinculados al padre
  useEffect(() => {
    const fetchLinkedKids = async () => {
      try {
        const kids: { id: string; name: string; course: string }[] = [];

        if (currentUser.studentLinking && currentUser.studentLinking.studentName) {
          kids.push({
            id: currentUser.studentLinking.studentRude || 'child-primary',
            name: currentUser.studentLinking.studentName,
            course: currentUser.studentLinking.grade || '6° de Secundaria A',
          });
        }

        const links = await studentService.getLinksForParent(currentUser.uid);
        links.forEach((l: ParentStudentLink) => {
          if (!kids.some(k => k.id === l.studentId || k.name === l.studentName)) {
            kids.push({
              id: l.studentId,
              name: l.studentName,
              course: `${l.grade} "${l.parallel}"`,
            });
          }
        });

        setChildrenList(kids);
        if (kids.length > 0) {
          setActiveChildId(kids[0].id);
        }
      } catch (err) {
        console.error('Error cargando hijos para kárdex:', err);
      }
    };
    fetchLinkedKids();
  }, [currentUser.uid]);

  // Cargar registros de kárdex del estudiante seleccionado
  const loadKardexForChild = async () => {
    if (!activeChildId) return;
    setLoading(true);
    try {
      const data = await kardexService.getByStudent(activeChildId);
      setEntries(data);
    } catch (err) {
      console.error('Error cargando kárdex del estudiante:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKardexForChild();
  }, [activeChildId]);

  const handleSendFamilyResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingEntry) return;

    setSavingResponse(true);
    try {
      await kardexService.acknowledgeByFamily(
        respondingEntry.id,
        currentUser.uid,
        currentUser.displayName,
        responseNote.trim() || 'Notificación revisada y confirmada por el padre/madre/tutor.'
      );

      setSuccessBanner(
        'Acuse de recibo y compromiso familiar registrado con éxito. Se ha notificado al profesor.'
      );
      setRespondingEntry(null);
      setResponseNote('');
      await loadKardexForChild();
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (err) {
      console.error('Error al responder kárdex:', err);
      alert('Ocurrió un error al registrar la confirmación.');
    } finally {
      setSavingResponse(false);
    }
  };

  const getLevelInfo = (lvl: KardexLevel) => {
    switch (lvl) {
      case 1:
        return {
          label: 'Nivel 1: Informativo',
          badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          dot: 'bg-emerald-400',
        };
      case 2:
        return {
          label: 'Nivel 2: Llamada de Atención',
          badge: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
          dot: 'bg-sky-400',
        };
      case 3:
        return {
          label: 'Nivel 3: Atención Familiar / Citación',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
          dot: 'bg-amber-400',
        };
      case 4:
        return {
          label: 'Nivel 4: Atención Prioritaria / Dirección',
          badge: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
          dot: 'bg-rose-400',
        };
    }
  };

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

      {/* Cabecera del Portal de la Familia */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Seguimiento de Kárdex y Convivencia Escolar
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Expediente oficial de notas de conducta, méritos y observaciones de la U.E. Luis Espinal Tarde
          </p>
        </div>

        {/* Selector de Hijo si tiene más de uno */}
        {childrenList.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Estudiante:</span>
            <select
              value={activeChildId}
              onChange={e => setActiveChildId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-medium"
            >
              {childrenList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.course})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Alerta de Observaciones Pendientes de Firma */}
      {entries.some(e => e.requiresFamilySignature && !e.familyAcknowledged) && (
        <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-700/70 text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-300">
              Tiene observaciones que requieren revisión y confirmación del tutor
            </div>
            <p className="text-[11px] text-amber-200/90 mt-0.5">
              Por favor revise las anotaciones señaladas a continuación y registre su acuse o compromiso pedagógico.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Observaciones */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-white text-xs">
            Historial de Kárdex Escolar ({entries.length})
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Gestión 2026</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            <Clock className="w-6 h-6 mx-auto animate-spin mb-2 text-indigo-400" />
            Cargando expediente de kárdex...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <p className="font-medium text-slate-200">Kárdex sin observaciones pendientes</p>
            <p className="text-[11px] text-slate-500">
              El estudiante cuenta con un expediente escolar limpio sin llamadas de atención.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {entries.map(item => {
              const lvlInfo = getLevelInfo(item.level);
              const pendingSignature = item.requiresFamilySignature && !item.familyAcknowledged;

              return (
                <div
                  key={item.id}
                  className={`p-4.5 transition-colors space-y-3 ${
                    pendingSignature ? 'bg-amber-950/20' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase inline-flex items-center gap-1 ${lvlInfo.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${lvlInfo.dot}`}></span>
                        {lvlInfo.label}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {item.title}
                      </span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-medium">
                        {item.category}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      <span>{item.date} {item.time && `· ${item.time}`}</span>
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

                  {/* Detalle */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/70">
                    {item.description}
                  </p>

                  {item.actionTaken && (
                    <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="font-semibold text-slate-400">Acción sugerida / Medida pedagógica: </span>
                      {item.actionTaken}
                    </div>
                  )}

                  {/* Sección de Acuse y Firma Familiar */}
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      {item.familyAcknowledged ? (
                        <div className="space-y-1">
                          <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Confirmado por el tutor legal</span>
                          </div>
                          {item.familyResponseNote && (
                            <p className="text-[11px] text-slate-300 italic pl-5">
                              "{item.familyResponseNote}"
                            </p>
                          )}
                        </div>
                      ) : pendingSignature ? (
                        <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Esta observación requiere acuse de recibo y compromiso del tutor.</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Observación informativa registrada.</span>
                      )}
                    </div>

                    {pendingSignature && (
                      <button
                        onClick={() => {
                          setRespondingEntry(item);
                          setResponseNote('');
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shrink-0 shadow-sm shadow-amber-600/30 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Revisar y Confirmar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmación y Descargo Familiar */}
      {respondingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Acuse y Compromiso de la Familia
                </h3>
              </div>
              <button
                onClick={() => setRespondingEntry(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendFamilyResponse} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-white font-semibold">{respondingEntry.title}</div>
                <p className="text-[11px] text-slate-400">{respondingEntry.description}</p>
                <div className="text-[10px] text-indigo-400 mt-1 font-mono">
                  Profesor: {respondingEntry.teacherName} · Fecha: {respondingEntry.date}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Respuesta, Descargo o Compromiso del Padre / Tutor:
                </label>
                <textarea
                  rows={4}
                  required
                  value={responseNote}
                  onChange={e => setResponseNote(e.target.value)}
                  placeholder="Escriba su respuesta o compromiso como padre/madre de familia (ej: 'Enterado del informe, nos comprometemos a revisar las tareas a diario con el estudiante')..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none text-xs"
                ></textarea>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Al pulsar el botón se registrará la firma digital institucional del tutor con fecha y hora oficial.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRespondingEntry(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingResponse}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/30"
                >
                  {savingResponse ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Firmando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Firmar y Confirmar</span>
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
