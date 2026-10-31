import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';

interface PrintReportCardProps {
  data: any;
  onClose: () => void;
}

export const PrintReportCard: React.FC<PrintReportCardProps> = ({ data, onClose }) => {
  if (!data) return null;

  const { student, parent, academicPeriod, overallAverage, subjectGrades, attendanceSummary } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-3xl w-full p-8 space-y-6 print:p-0 print:shadow-none print:max-w-none">
        {/* Actions bar for screen view */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Documento Oficial Certificado</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Descargar PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Institutional Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4">
          <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
            República del Perú · Ministerio de Educación
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase mt-1">
            Colegio Privado San Martín de Porres
          </h1>
          <p className="text-xs text-slate-600 italic">
            "Excelencia Académica y Formación Ética" · Código Modular: 0382910
          </p>
          <div className="mt-2 text-xs font-bold uppercase tracking-wider bg-slate-100 py-1 border border-slate-300">
            Boleta Oficial de Calificaciones y Rendimiento Académico · {academicPeriod}
          </div>
        </div>

        {/* Student Data Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs border border-slate-300 p-4 bg-slate-50/50 rounded">
          <div>
            <div className="text-slate-500 font-medium">Estudiante:</div>
            <div className="font-bold text-slate-900 text-sm">{student?.name}</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium">Código de Matrícula:</div>
            <div className="font-mono font-bold text-slate-900">{student?.studentCode}</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium">Grado y Sección:</div>
            <div className="font-bold text-slate-900">{student?.gradeLevel} - Sección {student?.section || 'A'}</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium">Padre o Tutor Responsable:</div>
            <div className="font-bold text-slate-900">{parent?.name || 'Titular acreditado'}</div>
          </div>
        </div>

        {/* Official Grades Table */}
        <table className="w-full text-left text-xs border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-800 font-bold">
              <th className="border border-slate-300 py-2 px-3">Área Curricular / Materia</th>
              <th className="border border-slate-300 py-2 px-3">Docente Titular</th>
              <th className="border border-slate-300 py-2 px-3 text-center">Promedio (0-20)</th>
              <th className="border border-slate-300 py-2 px-3 text-center">Nivel de Logro</th>
              <th className="border border-slate-300 py-2 px-3">Apreciación del Docente</th>
            </tr>
          </thead>
          <tbody>
            {subjectGrades?.map((sub: any, idx: number) => {
              const avg = sub.finalAverage;
              let scale = '-';
              if (avg !== null) {
                if (avg >= 18) scale = 'AD (Destacado)';
                else if (avg >= 14) scale = 'A (Logrado)';
                else if (avg >= 11) scale = 'B (En Proceso)';
                else scale = 'C (En Inicio)';
              }

              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 py-2 px-3 font-semibold text-slate-900">
                    {sub.courseName}
                  </td>
                  <td className="border border-slate-300 py-2 px-3 text-slate-600">
                    {sub.teacherName}
                  </td>
                  <td className="border border-slate-300 py-2 px-3 text-center font-bold font-mono">
                    {avg !== null ? avg.toFixed(1) : '-'}
                  </td>
                  <td className="border border-slate-300 py-2 px-3 text-center font-medium">
                    {scale}
                  </td>
                  <td className="border border-slate-300 py-2 px-3 text-slate-700 italic text-[11px]">
                    {sub.teacherFeedback || 'Sin observaciones.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <td colSpan={2} className="py-2.5 px-3 text-right">
                PROMEDIO PONDERADO GENERAL BIMESTRAL:
              </td>
              <td className="py-2.5 px-3 text-center font-mono text-sm text-indigo-900">
                {overallAverage !== null ? overallAverage.toFixed(2) : '-'}
              </td>
              <td colSpan={2} className="py-2.5 px-3 text-slate-700">
                Asistencia Oficial: {attendanceSummary?.attendancePercentage}% ({attendanceSummary?.presents || 0} sesiones presentes)
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures & Seal section */}
        <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xs text-slate-700">
          <div className="border-t border-slate-400 pt-2">
            <div className="font-bold text-slate-900">Profesor Tutor de Aula</div>
            <div>Colegio Privado San Martín de Porres</div>
          </div>
          <div className="border-t border-slate-400 pt-2">
            <div className="font-bold text-slate-900">Dra. Teresa Alarcón</div>
            <div>Directora Académica General</div>
          </div>
        </div>

        {/* Certified timestamp footer */}
        <div className="text-[10px] text-slate-400 text-center pt-4 border-t border-slate-200">
          Documento generado automáticamente por el Sistema Integral de Gestión Escolar Privado · Fecha de emisión: {new Date().toLocaleDateString('es-PE')} · Código de verificación criptográfica institucional: {student?.studentCode}-CERT-2026
        </div>
      </div>
    </div>
  );
};
