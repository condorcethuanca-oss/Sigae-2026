import React, { useState, useEffect } from 'react';
import { User, Course, AttendanceRecord } from '../types';
import { api } from '../services/api';
import { CheckCircle2, Clock, XCircle, AlertCircle, Save, Calendar, X } from 'lucide-react';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  students: User[];
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseName,
  students,
}) => {
  const [date, setDate] = useState('2026-10-05');
  const [records, setRecords] = useState<
    Record<string, { status: AttendanceRecord['status']; notes: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Default all students to 'presente'
    const initial: Record<string, { status: AttendanceRecord['status']; notes: string }> = {};
    students.forEach(s => {
      initial[s.id] = { status: 'presente', notes: '' };
    });
    setRecords(initial);
  }, [students]);

  if (!isOpen) return null;

  const handleStatusChange = (studentId: string, status: AttendanceRecord['status']) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleNoteChange = (studentId: string, notes: string) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const recordsArray = students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        status: records[s.id]?.status || 'presente',
        notes: records[s.id]?.notes || '',
      }));

      await api.saveAttendance({
        date,
        courseId,
        records: recordsArray,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Error al guardar asistencia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">
              Control Diario de Asistencia Escolar
            </h3>
            <p className="text-xs text-slate-400">
              {courseName} · Registro en tiempo real
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-xs text-slate-300 font-medium">Fecha de la Sesión:</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
          />
        </div>

        {success && (
          <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-200 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>¡Asistencia del aula registrada y sincronizada correctamente!</span>
          </div>
        )}

        {/* Students attendance list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 pr-1">
          {students.map(student => {
            const currentRec = records[student.id] || { status: 'presente', notes: '' };

            return (
              <div key={student.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-white">{student.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{student.studentCode}</div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'presente')}
                    className={`px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                      currentRec.status === 'presente'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Presente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'tarde')}
                    className={`px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                      currentRec.status === 'tarde'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Tarde
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'falta_justificada')}
                    className={`px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                      currentRec.status === 'falta_justificada'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Justificada
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(student.id, 'falta_injustificada')}
                    className={`px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                      currentRec.status === 'falta_injustificada'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Falta
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        </div>
      </div>
    </div>
  );
};
