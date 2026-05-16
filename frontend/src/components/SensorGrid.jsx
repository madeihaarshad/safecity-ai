import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { Zap, WifiOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Helper to get color classes by riskTier
const getRiskColor = (riskTier) => {
  const colorMap = {
    safe: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
    medium: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
    high: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500' },
    critical: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' },
  };
  return colorMap[riskTier] || colorMap.safe;
};

// Helper to calculate time since update
const getTimeSinceUpdate = (timestamp) => {
  if (!timestamp) return 'unknown';
  const now = new Date();
  const updated = new Date(timestamp);
  const seconds = Math.floor((now - updated) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

// Individual Sensor Card
const SensorCard = ({ sensor }) => {
  const { theme } = useTheme();
  const [timeAgo, setTimeAgo] = useState('now');
  const speed = sensor.lastReading?.value ?? null;
  const unit = sensor.lastReading?.unit ?? 'km/h';
  const riskTier = sensor.lastReading?.riskTier ?? 'unknown';
  const timestamp = sensor.lastReading?.timestamp;
  const status = sensor.status ?? 'Offline';
  
  // Check if sensor is offline or has no data
  const isOffline = status !== 'Online' || speed === null || speed === undefined;
  
  const colorClasses = getRiskColor(riskTier);

  // Update time display every second
  useEffect(() => {
    setTimeAgo(getTimeSinceUpdate(timestamp));
    const interval = setInterval(() => {
      setTimeAgo(getTimeSinceUpdate(timestamp));
    }, 5000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className={`relative p-5 rounded-lg border transition-all group bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)] shadow-sm ${isOffline ? 'opacity-50' : ''}`}>
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${colorClasses.bg} via-transparent to-transparent`} />

      {/* Offline overlay icon */}
      {isOffline && (
        <div className="absolute top-2 right-2 z-10">
          <div className="p-1.5 bg-[var(--bg)] rounded-full border border-[var(--border)]">
            <WifiOff size={14} className="text-[var(--subtle)]" />
          </div>
        </div>
      )}

      {/* Header: Location + Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-mono text-[var(--subtle)] tracking-wider uppercase mb-1">
            Sensor {sensor.sensorId}
          </p>
          <p className={`text-sm font-bold text-[var(--text)]`}>{sensor.location}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono border ${
          status === 'Online' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-[var(--card)] border-[var(--border)] text-[var(--subtle)]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--subtle)]'
          }`} />
          <span className="text-[10px]">{isOffline ? 'Offline' : status}</span>
        </div>
      </div>

      {/* Speed Display */}
      {!isOffline && speed !== null ? (
        <div className="mb-3">
          <p className={`text-4xl font-mono font-bold ${colorClasses.text} tracking-tight`}>
            {Math.round(speed)}
          </p>
          <p className="text-xs text-[var(--subtle)] font-mono mt-1">{unit}</p>
        </div>
      ) : (
        <div className="mb-3 h-16 flex items-center justify-center">
          <p className="text-xs text-[var(--subtle)] font-mono">No reading</p>
        </div>
      )}

      {/* Risk tier badge + time */}
      <div className={`flex items-center justify-between pt-3 border-t border-[var(--border)]`}>
        {!isOffline ? (
          <>
            <div className={`px-2 py-1 rounded text-xs font-mono border ${colorClasses.border} ${colorClasses.bg}`}>
              <span className={colorClasses.text}>{riskTier.toUpperCase()}</span>
            </div>
            <span className="text-xs text-[var(--subtle)] font-mono tracking-wider">
              {timeAgo}
            </span>
          </>
        ) : (
          <div className="w-full text-center">
            <span className="text-xs text-[var(--subtle)] font-mono">
              Sensor offline
            </span>
          </div>
        )}
      </div>

      {/* Hover glow effect */}
      {!isOffline && (
        <div className={`absolute inset-0 rounded opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none ${colorClasses.dot}`} />
      )}
    </div>
  );
};

// Main SensorGrid Component
const SensorGrid = () => {
  const { theme } = useTheme();
  const [sensors, setSensors] = useState(new Map());
  const sensorsRef = useRef(new Map());

  // Listen for socket updates
  useEffect(() => {
    const handleSensorUpdate = (sensor) => {
      // Update the Map with the new sensor data
      sensorsRef.current.set(sensor.sensorId, sensor);
      // Trigger re-render with new Map
      setSensors(new Map(sensorsRef.current));
    };

    socket.on('sensorUpdate', handleSensorUpdate);

    return () => {
      socket.off('sensorUpdate', handleSensorUpdate);
    };
  }, []);

  // If no sensors yet, return empty grid
  if (sensors.size === 0) {
    return (
      <div className={`rounded-lg border p-6 text-center bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
        <Zap className="w-8 h-8 text-[var(--subtle)] mx-auto mb-2" />
        <p className="text-xs font-mono text-[var(--subtle)] tracking-wider uppercase">
          Waiting for sensor data...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from(sensors.values()).map(sensor => (
        <SensorCard key={sensor.sensorId} sensor={sensor} />
      ))}
    </div>
  );
};

export default SensorGrid;
