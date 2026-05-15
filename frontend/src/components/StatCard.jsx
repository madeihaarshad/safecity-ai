import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend, unit, description, loading }) => {
  const colorClasses = {
    red: "text-red-500 bg-red-500/10 border-l-red-500",
    blue: "text-blue-500 bg-blue-500/10 border-l-blue-500",
    green: "text-green-500 bg-green-500/10 border-l-green-500",
    yellow: "text-yellow-500 bg-yellow-500/10 border-l-yellow-500",
  };

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div className={`bg-slate-800 p-6 rounded-xl border border-slate-700 border-l-4 ${colorClasses[color]?.split(' ')[2] || 'border-slate-500'} group relative`}>
      {description && (
        <span 
          role="tooltip" 
          className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 bg-slate-900 text-slate-200 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-10 shadow-lg border border-slate-700"
        >
          {description}
        </span>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color]?.split(' ').slice(0, 2).join(' ')}`}>
          <Icon size={24} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${trend > 0 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            <TrendIcon size={14} />
            {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {Math.abs(trend)}% vs yesterday
          </span>
        )}
      </div>
      <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
      {loading ? (
        <div className="animate-pulse bg-slate-700 rounded h-8 w-24 mt-1"></div>
      ) : (
        <div className="mt-1">
          <p className="text-2xl font-bold inline-block">{value}</p>
          {unit && <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">{unit}</p>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
