import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  Shield,
  Briefcase,
  HeartHandshake,
  GraduationCap,
  Search,
  CheckCheck,
  Info,
} from 'lucide-react';
import { SigaeUser, SigaeRole } from '../../types';

interface MensajeriaVisualProps {
  currentUser: SigaeUser;
}

export const MensajeriaVisual: React.FC<MensajeriaVisualProps> = ({ currentUser }) => {
  const [activeChannelId, setActiveChannelId] = useState('ch-1');
  const [inputText, setInputText] = useState('');

  // Sample official contacts hierarchy
  const channels = [
    {
      id: 'ch-1',
      title: 'Despacho de Dirección Académica',
      role: 'director' as SigaeRole,
      lastMessage: 'Circular N° 04: Presentación de Planificaciones Curriculares PDC',
      time: '10:45',
      unread: 1,
    },
    {
      id: 'ch-2',
      title: 'Prof. Carlos Mamani (Matemática)',
      role: 'profesor' as SigaeRole,
      lastMessage: 'Lista de estudiantes para la Olimpiada Científica distrital',
      time: '09:20',
      unread: 0,
    },
    {
      id: 'ch-3',
      title: 'Consejo de Padres de Familia (5° Sec A)',
      role: 'padre' as SigaeRole,
      lastMessage: 'Confirmación de asistencia a la reunión de medio término',
      time: 'Ayer',
      unread: 0,
    },
  ];

  const [messagesList, setMessagesList] = useState([
    {
      id: 'm1',
      senderName: 'Lic. Gonzalo Fernández Mamani (Dirección)',
      senderRole: 'director' as SigaeRole,
      text: 'Estimada comunidad educativa: Se recuerda que este viernes vence el plazo para la presentación y visado de los planes de desarrollo curricular correspondientes al 1er Trimestre.',
      time: '10:30',
      isMe: false,
      attachment: 'Circular_04_PDC_2026.pdf',
    },
    {
      id: 'm2',
      senderName: currentUser.displayName,
      senderRole: currentUser.role,
      text: 'Recibido conforme desde el portal institucional. Estamos preparando el reporte para remitirlo a través de la plataforma.',
      time: '10:42',
      isMe: true,
    },
    {
      id: 'm3',
      senderName: 'Lic. Gonzalo Fernández Mamani (Dirección)',
      senderRole: 'director' as SigaeRole,
      text: 'Excelente. Las calificaciones y avances quedarán visados y respaldados en la base de datos oficial.',
      time: '10:45',
      isMe: false,
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setMessagesList(prev => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        senderName: currentUser.displayName,
        senderRole: currentUser.role,
        text: inputText.trim(),
        time: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      },
    ]);
    setInputText('');
  };

  const getRoleIcon = (role: SigaeRole) => {
    switch (role) {
      case 'director': return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
      case 'profesor': return <Briefcase className="w-3.5 h-3.5 text-amber-400" />;
      case 'padre': return <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />;
      case 'alumno': return <GraduationCap className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Notice header */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>Estructura Visual de Mensajería Interna:</strong> Comunicación oficial entre usuarios autorizados. No incluye llamadas de voz ni videollamadas.
          </span>
        </div>
        <span className="text-[10px] uppercase font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-slate-800 shrink-0 hidden sm:inline-block">
          Texto y Archivos
        </span>
      </div>

      {/* Main Messaging Layout */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-3 h-[600px]">
        {/* Left: Channels & Contacts list */}
        <div className="border-r border-slate-800 flex flex-col h-full bg-slate-950/40">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Bandeja Oficial</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">3 canales</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar contacto o circular..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {channels.map(ch => {
              const isActive = activeChannelId === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`w-full p-3 rounded-2xl text-left transition-all flex items-start justify-between cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      {getRoleIcon(ch.role)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {ch.title}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {ch.lastMessage}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[10px] text-slate-500 font-mono">{ch.time}</span>
                    {ch.unread > 0 && (
                      <span className="block mt-1 w-4 h-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white text-center leading-4 ml-auto">
                        {ch.unread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat Area */}
        <div className="lg:col-span-2 flex flex-col h-full bg-slate-900">
          {/* Active Chat Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400 font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Despacho de Dirección Académica</h3>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Canal institucional oficial activo
                </span>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 font-mono">Gestión 2026</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/20">
            {messagesList.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  msg.isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <span className="text-[10px] text-slate-500 px-1 mb-1">
                  {msg.senderName} · {msg.time}
                </span>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.isMe
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/60'
                  }`}
                >
                  <p>{msg.text}</p>

                  {msg.attachment && (
                    <div className="mt-2 pt-2 border-t border-slate-700/80 flex items-center gap-2 text-[11px] text-indigo-300">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="font-mono">{msg.attachment}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Message Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2"
          >
            <button
              type="button"
              className="p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Adjuntar documento o circular"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Escribe un mensaje o consulta oficial..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
