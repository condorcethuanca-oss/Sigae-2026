import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  MessageSquare,
  Shield,
  Briefcase,
  HeartHandshake,
  GraduationCap,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  NotificationItem,
  SigaeRole,
  ROLE_NOTIFICATION_COLORS,
} from '../../types';
import { notificationService } from '../../firebase/notificationService';

interface NotificationBellDropdownProps {
  currentUserUid: string;
  onNavigateToItem?: (type: string, relatedId?: string) => void;
}

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({
  currentUserUid,
  onNavigateToItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'no_leidas'>('todas');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carga inicial y actualización periódica
  const loadNotifications = async () => {
    if (!currentUserUid) return;
    try {
      const list = await notificationService.getUserNotifications(currentUserUid, 30);
      setNotifications(list);
    } catch (err) {
      console.error('[NotificationBell] Error cargando notificaciones:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Refresco cada 15s
    return () => clearInterval(interval);
  }, [currentUserUid]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationService.markAsRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    await notificationService.markAllAsRead(currentUserUid);
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
    );
    setLoading(false);
  };

  const getRoleIcon = (role: SigaeRole) => {
    switch (role) {
      case 'director':
        return Shield;
      case 'profesor':
        return Briefcase;
      case 'padre':
        return HeartHandshake;
      case 'alumno':
      default:
        return GraduationCap;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'kardex':
        return AlertCircle;
      case 'horario':
      case 'calendario':
        return Calendar;
      case 'comunicado':
      default:
        return MessageSquare;
    }
  };

  const filteredNotifications =
    filter === 'no_leidas' ? notifications.filter(n => !n.read) : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Campana */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800/80 relative transition-colors cursor-pointer"
        aria-label="Notificaciones"
        title="Notificaciones institucionales"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-600 rounded-full min-w-4 text-center leading-none ring-2 ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Cabecera */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded-full font-mono">
                  {unreadCount} pendientes
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="text-[11px] text-slate-400 hover:text-indigo-400 font-medium px-2 py-1 rounded hover:bg-slate-800/60 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Leer todas</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filtros rápidos y Leyenda de Roles */}
          <div className="px-3.5 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex gap-1">
              <button
                onClick={() => setFilter('todas')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filter === 'todas'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('no_leidas')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filter === 'no_leidas'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Sin leer ({unreadCount})
              </button>
            </div>

            {/* Código de Color por Rol */}
            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400" title="Código de Color Oficial de Roles">
              <span className="w-2 h-2 rounded-full bg-rose-500" title="Rojo: Dirección"></span>
              <span className="w-2 h-2 rounded-full bg-blue-500" title="Azul: Profesor"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Verde: Padre"></span>
              <span className="w-2 h-2 rounded-full bg-purple-500" title="Morado: Alumno"></span>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                <p className="font-medium text-slate-300">No hay notificaciones</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {filter === 'no_leidas'
                    ? 'Todas las notificaciones están al día.'
                    : 'Aquí se mostrarán avisos de Dirección, Profesores y Kárdex.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const roleConfig = ROLE_NOTIFICATION_COLORS[item.senderRole] || ROLE_NOTIFICATION_COLORS.director;
                const RoleIcon = getRoleIcon(item.senderRole);
                const TypeIcon = getTypeIcon(item.type);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.read) notificationService.markAsRead(item.id);
                      if (onNavigateToItem && item.relatedId) {
                        onNavigateToItem(item.type, item.relatedId);
                      }
                    }}
                    className={`p-3.5 transition-all text-xs cursor-pointer hover:bg-slate-800/40 ${
                      !item.read ? 'bg-slate-950/70 border-l-4' : 'opacity-85'
                    }`}
                    style={{
                      borderLeftColor: !item.read ? roleConfig.hex : 'transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Emisor y Rol con Código de Color */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1 border ${roleConfig.badge}`}
                          style={{ borderColor: `${roleConfig.hex}40` }}
                        >
                          <RoleIcon className="w-3 h-3" />
                          <span>{roleConfig.label}</span>
                        </span>

                        <span className="font-semibold text-slate-200 text-[11px] truncate max-w-[130px]">
                          {item.senderName}
                        </span>

                        {item.priority === 'urgente' && (
                          <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                            Urgente
                          </span>
                        )}
                        {item.priority === 'prioritario' && (
                          <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                            Prioritario
                          </span>
                        )}
                      </div>

                      {/* Botón marcar individual como leída */}
                      {!item.read && (
                        <button
                          onClick={e => handleMarkAsRead(item.id, e)}
                          className="text-slate-400 hover:text-emerald-400 p-1 rounded hover:bg-slate-800"
                          title="Marcar como leída"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Título */}
                    <div className="mt-1.5 font-medium text-white flex items-center gap-1.5">
                      <TypeIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="line-clamp-1">{item.title}</span>
                    </div>

                    {/* Mensaje */}
                    <p className="mt-1 text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Timestamp */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString('es-BO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {item.read && (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Check className="w-3 h-3 text-slate-400" /> Leída
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pie informativo */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 text-center font-mono">
            U.E. Luis Espinal Tarde · SIE 80730142
          </div>
        </div>
      )}
    </div>
  );
};
