import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend, unit, description, loading }) => {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  const colorClasses = {
    red: "text-red-500 bg-red-500/10 border-l-red-500",
    blue: "text-blue-500 bg-blue-500/10 border-l-blue-500",
    green: "text-green-500 bg-green-500/10 border-l-green-500",
    yellow: "text-yellow-500 bg-yellow-500/10 border-l-yellow-500",
  };

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopover]);

  return (
    <div className={`bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)] border-l-4 ${colorClasses[color]?.split(' ')[2] || 'border-slate-500'} relative accent-glow transition-all hover:scale-[1.02]`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colorClasses[color]?.split(' ').slice(0, 2).join(' ')}`}>
            <Icon size={24} />
          </div>
          {description && (
            <button
              ref={buttonRef}
              onClick={() => setShowPopover(!showPopover)}
              className="p-1 hover:bg-[var(--card)] rounded transition-colors text-[var(--subtle)] hover:text-[var(--text)]"
              aria-label={`More information about ${title}`}
              title="More info"
            >
              <Info size={14} />
            </button>
          )}
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${trend > 0 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            <TrendIcon size={14} />
            {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {Math.abs(trend)}% vs yesterday
          </span>
        )}
      </div>

      {/* Info Popover */}
      {showPopover && description && (
        <div
          ref={popoverRef}
          className="absolute top-16 left-6 right-6 bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-xl p-3 z-50 animate-fadeIn"
          role="tooltip"
        >
          <p className="text-xs text-[var(--subtle)] leading-relaxed">{description}</p>
          <div className="absolute -top-2 left-8 w-4 h-4 bg-[var(--bg)] border-l border-t border-[var(--border)] transform rotate-45"></div>
        </div>
      )}

      <h3 className="text-[var(--subtle)] text-sm font-medium">{title}</h3>
      {loading ? (
        <div className="animate-pulse bg-[var(--card)] rounded h-8 w-24 mt-1"></div>
      ) : (
        <div className="mt-1">
          <p className="text-2xl font-bold inline-block text-[var(--text)]">{value}</p>
          {unit && <p className="text-[10px] font-mono text-[var(--subtle)] uppercase tracking-widest block">{unit}</p>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
