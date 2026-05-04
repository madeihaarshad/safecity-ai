import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Zap, Shield, MapPin, Clock, Radio, Skull, Flame } from 'lucide-react';

const PRIORITY_CONFIG = {
  Critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-950/40',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
    topBar: 'from-red-500/80 via-red-400/30 to-transparent',
    badge: 'bg-red-500/20 text-red-400 border-red-500/60',
    label: 'CRITICAL',
    icon: Skull,
    iconColor: 'text-red-400',
    dotColor: 'bg-red-500',
    dotGlow: 'shadow-[0_0_6px_rgba(239,68,68,0.9)]',
    textColor: 'text-red-300',
    scanColor: 'via-red-500/10',
  },
  High: {
    border: 'border-l-orange-500',
    bg: 'bg-orange-950/30',
    glow: 'shadow-[0_0_12px_rgba(249,115,22,0.12)]',
    topBar: 'from-orange-500/70 via-orange-400/20 to-transparent',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/60',
    label: 'HIGH',
    icon: Flame,
    iconColor: 'text-orange-400',
    dotColor: 'bg-orange-500',
    dotGlow: 'shadow-[0_0_6px_rgba(249,115,22,0.9)]',
    textColor: 'text-orange-300',
    scanColor: 'via-orange-500/10',
  },
  Normal: {
    border: 'border-l-sky-500',
    bg: 'bg-sky-950/20',
    glow: 'shadow-[0_0_10px_rgba(56,189,248,0.08)]',
    topBar: 'from-sky-500/50 via-sky-400/15 to-transparent',
    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/50',
    label: 'ALERT',
    icon: Radio,
    iconColor: 'text-sky-400',
    dotColor: 'bg-sky-400',
    dotGlow: 'shadow-[0_0_6px_rgba(56,189,248,0.9)]',
    textColor: 'text-sky-300',
    scanColor: 'via-sky-500/10',
  },
};

const formatTime = (ts) => {
  if (!ts) return 'JUST NOW';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

const AlertItem = ({ alert, isNew }) => {
  const ref = useRef(null);
  const cfg = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.Normal;
  const Icon = cfg.icon;

  useEffect(() => {
    if (isNew && ref.current) {
      ref.current.animate(
        [
          { opacity: 0, transform: 'translateX(-12px)', filter: 'brightness(2)' },
          { opacity: 1, transform: 'translateX(0px)', filter: 'brightness(1)' },
        ],
        { duration: 400, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
      );
    }
  }, [isNew]);

  return (
    <div
      ref={ref}
      className={`
        relative rounded-md border-l-4 ${cfg.border} ${cfg.bg} ${cfg.glow}
        overflow-hidden cursor-default select-none
        transition-all duration-300 hover:brightness-110
      `}
    >
      {/* Glowing top edge line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${cfg.topBar}`} />

      {/* Scan sweep animation for new/critical */}
      {(isNew || alert.priority === 'Critical') && (
        <div
          className={`absolute inset-0 bg-gradient-to-r from-transparent ${cfg.scanColor} to-transparent -translate-x-full`}
          style={{ animation: 'scanSweep 2s ease-in-out infinite' }}
        />
      )}

      <div className="relative p-3 pb-2.5">
        {/* Top row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Pulsing status dot */}
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor} ${cfg.dotGlow} ${isNew ? 'animate-pulse' : ''}`}
          />

          {/* Icon */}
          <Icon size={12} className={`flex-shrink-0 ${cfg.iconColor}`} />

          {/* Title */}
          <span className="flex-1 text-[11px] font-bold text-white tracking-wide uppercase truncate">
            {alert.title || alert.type}
          </span>

          {/* Priority badge */}
          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-sm border tracking-[0.15em] uppercase flex-shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Message */}
        <p className="text-[10.5px] text-slate-300 leading-relaxed mb-2.5 pl-5 font-mono">
          {alert.message}
        </p>

        {/* Bottom meta row */}
        <div className="flex items-center justify-between pl-5">
          <div className={`flex items-center gap-1 text-[9px] font-mono ${cfg.textColor}`}>
            <MapPin size={8} />
            <span className="tracking-wide">{alert.area || alert.location || 'CITY-WIDE'}</span>
          </div>
          <div className="flex items-center gap-2">
            {alert.category && (
              <span className="text-[8px] font-mono text-slate-600 tracking-widest uppercase">
                {alert.category}
              </span>
            )}
            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
              <Clock size={8} />
              <span>{formatTime(alert.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom edge accent line */}
      <div className={`h-px bg-gradient-to-r ${cfg.topBar} opacity-40`} />
    </div>
  );
};

const AlertStream = ({ alerts }) => {
  const prevLengthRef = useRef(0);

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-4 text-slate-600">
        <div className="relative">
          <Radio size={22} className="opacity-30" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[10px] font-mono tracking-[0.25em] uppercase text-slate-500">
            Scanning city grid...
          </p>
          <p className="text-[9px] font-mono text-slate-700 tracking-widest">
            NO ACTIVE INCIDENTS
          </p>
        </div>
        {/* Fake scanning bars */}
        <div className="w-32 space-y-1.5 mt-2">
          {[60, 40, 75, 30].map((w, i) => (
            <div key={i} className="h-px bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-green-500/40 rounded"
                style={{ width: `${w}%`, animation: `pulse 2s ease-in-out ${i * 0.3}s infinite` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes scanSweep {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="space-y-2">
        {alerts.map((alert, idx) => (
          <AlertItem
            key={`${alert.timestamp}-${idx}`}
            alert={alert}
            isNew={idx === 0 && alerts.length > prevLengthRef.current}
          />
        ))}
      </div>
    </>
  );
};

export default AlertStream;