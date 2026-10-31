import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SentimentAnalysisReport, WordFrequency, ActionableArea, SentimentTrendPoint } from '../types';
import {
  Sparkles,
  TrendingUp,
  Cloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  MessageSquare,
  ArrowUpRight,
  ClipboardPaste,
  RotateCcw,
  Tag,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';

export const SentimentDashboard: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [report, setReport] = useState<SentimentAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWordFilter, setActiveWordFilter] = useState<string | null>(null);
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<SentimentTrendPoint | null>(null);

  // Load initial sample data on mount
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const { sample } = await api.getSampleSentiment();
        setRawText(sample);
        const initialReport = await api.analyzeSentiment(sample);
        setReport(initialReport);
      } catch (err: any) {
        setError(err.message || 'Error cargando análisis de sentimiento');
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const handleRunAnalysis = async (customText?: string) => {
    const textToRun = customText !== undefined ? customText : rawText;
    if (!textToRun.trim()) {
      setError('Por favor ingresa o pega un lote de reseñas para analizar.');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveWordFilter(null);

    try {
      const result = await api.analyzeSentiment(textToRun);
      setReport(result);
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar análisis de sentimiento con IA');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPreset = async (presetType: 'general' | 'cafeteria' | 'tech') => {
    let presetText = '';
    if (presetType === 'general') {
      const { sample } = await api.getSampleSentiment();
      presetText = sample;
    } else if (presetType === 'cafeteria') {
      presetText = `
[2026-03-01] [Padre de Familia]: El precio del almuerzo en la cafetería escolar subió un 25% sin previo aviso y las porciones son muy reducidas.
[2026-03-12] [Estudiante]: Las colas para comprar en el quiosco duran todo el recreo. Muchos alumnos no alcanzamos a almorzar a tiempo.
[2026-03-24] [Madre de Familia]: Exigimos ensaladas frescas, frutas y opciones vegetarianas. Casi todo lo que venden son frituras, gaseosas y snacks con octógonos.
[2026-04-05] [Docente]: El concesionario no cuenta con suficientes trabajadores en hora punta. Deberían instalar dos puntos de cobro adicionales.
[2026-04-18] [Estudiante]: La comida tiene buen sabor pero los cubiertos a veces están mal lavados y las mesas se quedan con grasa.
[2026-05-02] [Padre de Familia]: La cafetería escolar debe ser supervisada por un comité de nutrición de la APAFA urgentemente.
[2026-05-15] [Madre de Familia]: Felicitaciones por incluir botellas de agua gratis en los bebederos del patio principal.
[2026-06-01] [Estudiante]: El menú económico de 8 soles ayuda mucho a los de secundaria, gracias por esa opción.
[2026-06-20] [Padre de Familia]: Siguen faltando datáfonos para pagar con tarjeta o billeteras digitales en el cafetín.
`.trim();
    } else {
      presetText = `
[2026-02-15] [Estudiante]: Los nuevos laboratorios de robótica son espectaculares. El profesor Carlos explica genial y aprendemos mucho.
[2026-02-28] [Padre de Familia]: La plataforma de notas en tiempo real funciona excelente en el celular. Puedo ver las calificaciones de mi hijo al instante.
[2026-03-10] [Docente]: El internet en las aulas del segundo piso se cae constantemente durante las clases virtuales interactivas.
[2026-03-22] [Estudiante]: Las computadoras de la biblioteca tienen programas viejos y demoran 15 minutos en prender.
[2026-04-08] [Madre de Familia]: La comunicación por correo institucional es muy rápida y ordenada. Excelente labor de secretaría.
[2026-04-20] [Docente]: Necesitamos proyectores interactivos en las aulas de 4to y 5to año para no depender de plumones.
[2026-05-05] [Padre de Familia]: Excelente el seguimiento pedagógico de los tutores cuando las notas bajan de 14.
[2026-05-19] [Estudiante]: Los talleres de programación Python extracurricular son lo mejor del colegio este año.
`.trim();
    }

    setRawText(presetText);
    handleRunAnalysis(presetText);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-700/60 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                Customer & Community Sentiment Dashboard
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Motor de Inteligencia de Opinión Escolar · Análisis temporal, nubes de términos y diagnóstico estratégico generado con IA
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Cargar Muestra:</span>
            <button
              onClick={() => handleLoadPreset('general')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 rounded transition-colors"
            >
              Lote Institucional (General)
            </button>
            <button
              onClick={() => handleLoadPreset('cafeteria')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 rounded transition-colors"
            >
              Foco Cafetería y Alimentos
            </button>
            <button
              onClick={() => handleLoadPreset('tech')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 rounded transition-colors"
            >
              Foco Docencia y Tecnología
            </button>
          </div>
        </div>
      </div>

      {/* Raw Reviews Input Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-indigo-400" />
            <span>Pegar Lote de Opiniones / Reseñas en Texto Plano (Raw Text Reviews)</span>
          </label>
          <div className="text-xs text-slate-500">
            {rawText.length} caracteres · {rawText.split('\n').filter(l => l.trim().length > 0).length} comentarios
          </div>
        </div>

        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          rows={5}
          placeholder="Pega aquí cualquier lote de comentarios de padres, alumnos o profesores en texto plano... Ejemplo: [2026-03-14] [Padre]: Excelente nivel educativo..."
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-400">
            Acepta fechas en formato <code className="text-slate-300 font-mono">[YYYY-MM-DD]</code> y etiquetas como <code className="text-slate-300 font-mono">[Padre de Familia]</code>, o texto libre continuo.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRawText('')}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Limpiar Texto
            </button>
            <button
              onClick={() => handleRunAnalysis()}
              disabled={loading}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Analizando con IA...' : 'Generar Reporte de Sentimiento'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* 1. KPIs Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400">Total Analizados</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {report.totalReviews}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Reseñas en el lote</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-emerald-400">Positivos</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {Math.round((report.sentimentDistribution.positive / Math.max(1, report.totalReviews)) * 100)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{report.sentimentDistribution.positive} opiniones</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-400">Neutrales</span>
              <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
                {Math.round((report.sentimentDistribution.neutral / Math.max(1, report.totalReviews)) * 100)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{report.sentimentDistribution.neutral} opiniones</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-rose-400">Negativos / Quejas</span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                {Math.round((report.sentimentDistribution.negative / Math.max(1, report.totalReviews)) * 100)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{report.sentimentDistribution.negative} opiniones</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-indigo-400">Net Sentiment</span>
              <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">
                {report.sentimentDistribution.netPromoterLike > 0 ? '+' : ''}
                {report.sentimentDistribution.netPromoterLike}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Índice NPS equivalente</div>
            </div>
          </div>

          {/* 2. Visual Report Part 1: Sentiment Trend Line Chart Over Time */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <span>Tendencia de Sentimiento en el Tiempo (Sentiment Trend Over Time)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Evolución cronológica de la percepción positiva vs quejas registradas mes a mes
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  Elogios / Positivo
                </span>
                <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                  Quejas / Críticas
                </span>
                <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                  Puntaje Neto
                </span>
              </div>
            </div>

            {/* SVG Trend Line Chart */}
            <div className="relative pt-4 pb-2">
              {report.timelineTrend.length > 0 ? (
                <div className="w-full h-64 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 800 220" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines */}
                    {[0, 50, 100, 150, 200].map((y, i) => (
                      <line
                        key={i}
                        x1="40"
                        y1={y}
                        x2="780"
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Compute SVG coordinates */}
                    {(() => {
                      const pts = report.timelineTrend;
                      const stepX = (780 - 60) / Math.max(1, pts.length - 1);
                      const maxVal = Math.max(1, ...pts.map(p => Math.max(p.positive, p.negative, 1)));

                      const posPoints = pts.map((p, i) => ({
                        x: 60 + i * stepX,
                        y: 190 - (p.positive / maxVal) * 150,
                      }));

                      const negPoints = pts.map((p, i) => ({
                        x: 60 + i * stepX,
                        y: 190 - (p.negative / maxVal) * 150,
                      }));

                      const posPathD = posPoints.reduce((acc, curr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '');
                      const negPathD = negPoints.reduce((acc, curr, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`, '');

                      const posAreaD = `${posPathD} L ${posPoints[posPoints.length - 1].x} 190 L ${posPoints[0].x} 190 Z`;
                      const negAreaD = `${negPathD} L ${negPoints[negPoints.length - 1].x} 190 L ${negPoints[0].x} 190 Z`;

                      return (
                        <>
                          {/* Areas */}
                          <path d={posAreaD} fill="url(#posGrad)" />
                          <path d={negAreaD} fill="url(#negGrad)" />

                          {/* Positive Trend Line */}
                          <path
                            d={posPathD}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Negative Trend Line */}
                          <path
                            d={negPathD}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Points */}
                          {pts.map((p, i) => {
                            const px = 60 + i * stepX;
                            const pyPos = 190 - (p.positive / maxVal) * 150;
                            const pyNeg = 190 - (p.negative / maxVal) * 150;

                            return (
                              <g key={i}>
                                {/* Vertical guideline on hover */}
                                <line
                                  x1={px}
                                  y1="10"
                                  x2={px}
                                  y2="190"
                                  stroke="#475569"
                                  strokeWidth={hoveredTrendPoint?.date === p.date ? '2' : '0'}
                                />

                                {/* Positive dot */}
                                <circle
                                  cx={px}
                                  cy={pyPos}
                                  r="5"
                                  fill="#10b981"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                  className="cursor-pointer transition-transform hover:scale-125"
                                  onMouseEnter={() => setHoveredTrendPoint(p)}
                                />

                                {/* Negative dot */}
                                <circle
                                  cx={px}
                                  cy={pyNeg}
                                  r="5"
                                  fill="#f43f5e"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                  className="cursor-pointer transition-transform hover:scale-125"
                                  onMouseEnter={() => setHoveredTrendPoint(p)}
                                />

                                {/* Month X-axis label */}
                                <text
                                  x={px}
                                  y="212"
                                  textAnchor="middle"
                                  fill="#94a3b8"
                                  fontSize="11"
                                  fontFamily="monospace"
                                >
                                  {p.label}
                                </text>
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Tooltip on hover */}
                  {hoveredTrendPoint && (
                    <div className="absolute top-2 right-4 bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs shadow-xl text-slate-200">
                      <div className="font-semibold text-white mb-1">
                        Periodo: {hoveredTrendPoint.label}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-emerald-400 font-medium">
                          ✓ Elogios: {hoveredTrendPoint.positive}
                        </div>
                        <div className="text-rose-400 font-medium">
                          ✕ Quejas: {hoveredTrendPoint.negative}
                        </div>
                        <div className="text-slate-400">
                          - Neutrales: {hoveredTrendPoint.neutral}
                        </div>
                        <div className="text-indigo-300 font-mono text-[11px] pt-1 border-t border-slate-700 mt-1">
                          Score Medio: {hoveredTrendPoint.averageScore > 0 ? '+' : ''}
                          {hoveredTrendPoint.averageScore}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Sin suficientes marcas de tiempo para generar línea de tendencia.
                </div>
              )}
            </div>
          </div>

          {/* 3. Visual Report Part 2: Word Clouds (Complaints & Praises) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Praise Word Cloud */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Nube de Elogios Más Frecuentes (Praise Cloud)
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono">
                  {report.topPraises.length} conceptos
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Términos clave que generan mayor satisfacción y recomendación.
              </p>

              {/* Dynamic Typography Cloud */}
              <div className="p-4 bg-slate-950/60 rounded-lg min-h-[160px] flex flex-wrap items-center justify-center gap-2.5">
                {report.topPraises.map((p, idx) => {
                  const sizeClass =
                    p.count >= 4
                      ? 'text-xl font-bold text-emerald-400'
                      : p.count >= 2
                      ? 'text-sm font-semibold text-emerald-300'
                      : 'text-xs text-emerald-200/80';

                  const isSelected = activeWordFilter === p.word;

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveWordFilter(isSelected ? null : p.word)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition-transform hover:scale-110 ${sizeClass} ${
                        isSelected ? 'bg-emerald-950 border border-emerald-600 scale-105' : 'hover:bg-slate-800/60'
                      }`}
                      title={`${p.word}: mencionado ${p.count} veces`}
                    >
                      <span>{p.word}</span>
                      <span className="text-[10px] text-slate-500 font-mono">×{p.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Complaints Word Cloud */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Nube de Quejas Más Frecuentes (Complaints Cloud)
                  </h3>
                </div>
                <span className="text-[11px] text-rose-400 font-mono">
                  {report.topComplaints.length} alertas
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Puntos de dolor y quejas reiteradas en servicios e instalaciones.
              </p>

              {/* Dynamic Typography Cloud */}
              <div className="p-4 bg-slate-950/60 rounded-lg min-h-[160px] flex flex-wrap items-center justify-center gap-2.5">
                {report.topComplaints.map((c, idx) => {
                  const sizeClass =
                    c.count >= 4
                      ? 'text-xl font-bold text-rose-400'
                      : c.count >= 2
                      ? 'text-sm font-semibold text-rose-300'
                      : 'text-xs text-rose-200/80';

                  const isSelected = activeWordFilter === c.word;

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveWordFilter(isSelected ? null : c.word)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition-transform hover:scale-110 ${sizeClass} ${
                        isSelected ? 'bg-rose-950 border border-rose-600 scale-105' : 'hover:bg-slate-800/60'
                      }`}
                      title={`${c.word}: reportado ${c.count} veces`}
                    >
                      <span>{c.word}</span>
                      <span className="text-[10px] text-slate-500 font-mono">×{c.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Visual Report Part 3: AI-Written Executive Summary & Top 3 Actionable Areas */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Resumen Ejecutivo y Áreas de Mejora Accionables (AI Executive Summary)
                </h3>
                <p className="text-xs text-slate-400">
                  Generado por Gemini 3.8 Flash · Diagnóstico directivo y matriz de priorización institucional
                </p>
              </div>
            </div>

            {/* Executive Summary Prose */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 leading-relaxed space-y-3 whitespace-pre-line font-normal">
              {report.executiveSummary}
            </div>

            {/* Top 3 Actionable Areas for Improvement */}
            <div>
              <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-3">
                Top 3 Acciones Prioritarias de Intervención:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report.actionableAreas.slice(0, 3).map((area, idx) => {
                  const priorityBg =
                    area.priority === 'alta'
                      ? 'border-rose-800/70 bg-rose-950/20'
                      : area.priority === 'media'
                      ? 'border-amber-800/70 bg-amber-950/20'
                      : 'border-indigo-800/70 bg-indigo-950/20';

                  const priorityText =
                    area.priority === 'alta'
                      ? 'text-rose-400 font-semibold'
                      : area.priority === 'media'
                      ? 'text-amber-400 font-semibold'
                      : 'text-indigo-400 font-semibold';

                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl p-5 space-y-3 flex flex-col justify-between ${priorityBg}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                            Iniciativa #{idx + 1}
                          </span>
                          <span className={`text-[10px] uppercase tracking-wider ${priorityText}`}>
                            Prioridad {area.priority}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-white leading-snug">
                          {area.title}
                        </h4>

                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{area.department}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                          <div>
                            <span className="text-slate-400 font-medium block text-[11px]">
                              Hallazgo Crítico:
                            </span>
                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              {area.finding}
                            </p>
                          </div>

                          <div>
                            <span className="text-emerald-400 font-medium block text-[11px]">
                              Acción Recomendada:
                            </span>
                            <p className="text-slate-200 text-[11px] leading-relaxed">
                              {area.recommendation}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <span className="text-indigo-300 font-medium block">Impacto Esperado:</span>
                        <span className="italic">{area.expectedImpact}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
