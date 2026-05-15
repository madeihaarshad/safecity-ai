import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ShieldCheck, X } from 'lucide-react';

const PRIORITY_CONFIG = {
  Critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-500/[.08]',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
    label: 'CRITICAL'
  },
  High: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-500/[.08]',
    icon: AlertCircle,
    iconColor: 'text-orange-400',
    badge: 'bg-orange-500/20 text-orange-400',
    label: 'HIGH'
  },
  Normal: {
    border: 'border-l-sky-500',
    bg: 'bg-sky-500/[.08]',
    icon: Info,
    iconColor: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-400',
    label: 'NORMAL'
  },
  Low: {
    border: 'border-l-green-500',
    bg: 'bg-green-500/[.08]',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    badge: 'bg-green-500/20 text-green-400',
    label: 'LOW'
  }
};

const formatTime = (ts) => {
  if (!ts) return 'JUST NOW';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

const AlertItem = ({ alert, onDismiss }) => {
  const [isDismissing, setIsDismissing] = useState(false);
  const cfg = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.Normal;
  const Icon = cfg.icon;

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => onDismiss(alert), 300);
  };

  return (
    <div
      className={`
        relative rounded-md border border-slate-800 border-l-4 ${cfg.border} ${cfg.bg}
        overflow-hidden transition-all duration-300
        ${isDismissing ? 'opacity-0 scale-95' : 'opacity-100'}
      `}
      style={{ animation: 'slideInAlert 0.25s ease-out' }}
    >
      {/* Dismiss Button */}
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors p-1 z-10 rounded hover:bg-slate-800"
        aria-label="Dismiss alert"
      >
        <X size={12} />
      </button>

      <div className="p-3 pr-8">
        {/* Row 1: Priority Icon, Title, Badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <Icon size={14} className={cfg.iconColor} />
          <span className="text-[13px] font-semibold text-white flex-1 truncate">
            {alert.title || alert.type}
          </span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Row 2: Message */}
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug mb-2.5">
          {alert.message}
        </p>

        {/* Row 3: Category, Area, Timestamp */}
        <div className="flex items-center gap-2">
          {alert.category && (
            <span className="text-[10px] bg-slate-800/50 border border-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
              {alert.category}
            </span>
          )}
          {(alert.area || alert.location) && (
            <span className="text-[10px] bg-slate-800/50 border border-slate-700/50 text-slate-300 px-2 py-0.5 rounded truncate max-w-[120px]">
              {alert.area || alert.location || 'CITY-WIDE'}
            </span>
          )}
          <span className="text-[9px] font-mono text-slate-500 ml-auto pt-0.5">
            {formatTime(alert.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

const AlertStream = ({ alerts }) => {
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const handleDismiss = (alert) => {
    // Generate a unique key for the alert to dismiss
    const key = alert.id || alert.timestamp;
    setDismissedIds(prev => new Set([...prev, key]));
  };

  const visibleAlerts = alerts?.filter(a => !dismissedIds.has(a.id || a.timestamp)) || [];
  const cappedAlerts = visibleAlerts.slice(0, 50);
  const isCapped = visibleAlerts.length > 50;

  if (cappedAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600 h-full">
        <ShieldCheck size={32} className="text-green-500 mb-2" />
        <p className="text-sm font-semibold text-white">
          All clear — no active alerts
        </p>
        <p className="text-[11px] text-slate-500">
          Monitoring 24 sensors across 6 zones
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideInAlert {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <div className="space-y-2 relative">
        {isCapped && (
          <div className="text-[9px] font-mono text-slate-600 text-center pb-2 uppercase tracking-wider">
            Showing latest 50 alerts
          </div>
        )}
        {cappedAlerts.map((alert, idx) => (
          <AlertItem
            key={`${alert.id || alert.timestamp}-${idx}`}
            alert={alert}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </>
  );
};

export default AlertStream;