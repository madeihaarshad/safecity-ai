import React, { useEffect, useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import {
  CloudRain, AlertCircle, Wind, Thermometer, Droplets,
  Eye, Activity, Globe, RefreshCw, CheckCircle, Wifi
} from 'lucide-react';

const API_BASE = 'http://localhost:5000';

const severityColor = (s) => {
  if (!s) return 'text-slate-400';
  if (s === 'Severe')   return 'text-red-400';
  if (s === 'Moderate') return 'text-orange-400';
  return 'text-yellow-400';
};

const severityBg = (s) => {
  if (!s) return 'border-slate-600 bg-slate-800';
  if (s === 'Severe')   return 'border-red-500/40 bg-red-950/30';
  if (s === 'Moderate') return 'border-orange-500/40 bg-orange-950/20';
  return 'border-yellow-500/40 bg-yellow-950/10';
};

const weatherConditionIcon = (condition) => {
  const icons = {
    Rain: '🌧️', Drizzle: '🌦️', Thunderstorm: '⛈️',
    Snow: '❄️', Clear: '☀️', Clouds: '☁️',
    Fog: '🌫️', Mist: '🌫️', Tornado: '🌪️',
    Squall: '💨', Haze: '🌁',
  };
  return icons[condition] || '🌡️';
};

const Disasters = () => {
  const [weather, setWeather]       = useState(null);
  const [earthquakes, setEarthquakes] = useState([]);
  const [weatherError, setWeatherError]   = useState(null);
  const [eqError, setEqError]       = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingEq, setLoadingEq]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchWeather = async () => {
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const res = await fetch(`${API_BASE}/api/weather`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWeather(data);
    } catch (err) {
      setWeatherError(err.message);
    } finally {
      setLoadingWeather(false);
    }
  };

  const fetchEarthquakes = async () => {
    setLoadingEq(true);
    setEqError(null);
    try {
      const res = await fetch(`${API_BASE}/api/earthquakes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEarthquakes(Array.isArray(data) ? data : (data.earthquakes || data.data || []));
    } catch (err) {
      setEqError(err.message);
    } finally {
      setLoadingEq(false);
    }
  };

  const refreshAll = () => {
    fetchWeather();
    fetchEarthquakes();
    setLastRefresh(new Date());
  };

  useEffect(() => {
    refreshAll();
    // Auto-refresh every 5 minutes
    const interval = setInterval(refreshAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const dangerousWeather = weather && ['Thunderstorm', 'Rain', 'Snow', 'Fog', 'Tornado', 'Squall'].includes(weather.condition);
  const safeEarthquakes = Array.isArray(earthquakes) ? earthquakes : [];
const severeEqs = safeEarthquakes.filter(eq => eq.magnitude >= 5.0);

  return (
    <div className="p-8 space-y-6">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Disaster Hub' }]} />
      <div className="flex items-center justify-between">
        <SectionHeader title="Disaster Hub" subtitle="Live data from OpenWeatherMap & USGS Earthquake Hazards" />
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 border border-slate-700 rounded-lg hover:border-slate-500 hover:text-white transition-all"
        >
          <RefreshCw size={12} className={loadingWeather || loadingEq ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Live status badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-950/30 border border-green-500/30 px-2.5 py-1 rounded-full">
          <Wifi size={10} className="animate-pulse" /> OpenWeatherMap — Live
        </span>
        <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-950/30 border border-blue-500/30 px-2.5 py-1 rounded-full">
          <Globe size={10} /> USGS Earthquakes — Free, No Key
        </span>
        {lastRefresh && (
          <span className="text-xs text-slate-600 font-mono">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ── WEATHER SECTION ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
            <CloudRain className="text-blue-400" />
            Live Weather Conditions
            {!loadingWeather && weather && (
              <span className="ml-auto text-[10px] font-mono text-green-400 bg-green-950/40 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle size={8} /> LIVE
              </span>
            )}
          </h3>

          {loadingWeather ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-slate-500" />
              <span className="ml-2 text-sm text-slate-500">Fetching live weather...</span>
            </div>
          ) : weatherError ? (
            <div className="py-8 text-center space-y-2">
              <AlertCircle className="mx-auto text-red-400" size={28} />
              <p className="text-red-400 text-sm font-medium">Weather unavailable</p>
              <p className="text-slate-500 text-xs max-w-xs mx-auto">{weatherError}</p>
              <p className="text-slate-600 text-xs">Add OPENWEATHER_API_KEY to backend/.env</p>
            </div>
          ) : weather ? (
            <div className="space-y-4">
              {/* Main weather card */}
              <div className={`rounded-xl p-4 border ${dangerousWeather ? 'border-orange-500/40 bg-orange-950/20' : 'border-slate-600 bg-slate-900'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-400">{weather.city}, {weather.country}</p>
                    <p className="text-3xl font-bold text-white">{weather.temp}°C</p>
                    <p className="text-sm text-slate-300 capitalize mt-0.5">{weather.description}</p>
                  </div>
                  <div className="text-5xl">{weatherConditionIcon(weather.condition)}</div>
                </div>
                {dangerousWeather && (
                  <div className="flex items-center gap-1.5 text-orange-400 text-xs bg-orange-950/40 border border-orange-500/30 rounded-lg px-3 py-1.5">
                    <AlertCircle size={12} />
                    ⚠️ Adverse conditions may affect road safety
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-3">
                  <Thermometer size={14} className="text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500">Feels Like</p>
                    <p className="text-sm font-bold">{weather.feels_like}°C</p>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-3">
                  <Droplets size={14} className="text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500">Humidity</p>
                    <p className="text-sm font-bold">{weather.humidity}%</p>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-3">
                  <Wind size={14} className="text-cyan-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500">Wind Speed</p>
                    <p className="text-sm font-bold">{weather.wind_speed} m/s</p>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 flex items-center gap-3">
                  <Eye size={14} className="text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500">Visibility</p>
                    <p className="text-sm font-bold">{weather.visibility} km</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* ── EARTHQUAKE SECTION ─────────────────────────────── */}
        <div className={`p-6 rounded-xl border ${severeEqs.length > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800 border-slate-700'}`}>
          <h3 className={`text-lg font-bold mb-5 flex items-center gap-2 ${severeEqs.length > 0 ? 'text-red-400' : 'text-white'}`}>
            <Activity />
            Live Seismic Activity
            {!loadingEq && (
              <span className="ml-auto text-[10px] font-mono text-green-400 bg-green-950/40 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle size={8} /> USGS LIVE
              </span>
            )}
          </h3>

          {loadingEq ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-slate-500" />
              <span className="ml-2 text-sm text-slate-500">Fetching earthquake data...</span>
            </div>
          ) : eqError ? (
            <div className="py-8 text-center">
              <AlertCircle className="mx-auto text-red-400 mb-2" size={28} />
              <p className="text-red-400 text-sm">{eqError}</p>
            </div>
          ) : earthquakes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle size={36} className="text-green-500 mb-3" />
              <h4 className="text-white font-medium">No Significant Earthquakes</h4>
              <p className="text-slate-500 text-sm mt-1">No M2.5+ events in the past 24 hours</p>
              <p className="text-slate-600 text-xs mt-1">Source: USGS Earthquake Hazards Program</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {safeEarthquakes.map((eq) => (
                <div
                  key={eq.id || eq._id || Math.random()}
                  className={`rounded-lg border p-3 ${severityBg(eq.severity)} transition-all`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold font-mono ${severityColor(eq.severity)}`}>
                          M{eq.magnitude}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-mono uppercase border ${
                          eq.severity === 'Severe'   ? 'border-red-500/50 text-red-400 bg-red-950/30' :
                          eq.severity === 'Moderate' ? 'border-orange-500/50 text-orange-400 bg-orange-950/30' :
                          'border-yellow-500/50 text-yellow-400 bg-yellow-950/20'
                        }`}>
                          {eq.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate">{eq.place}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-slate-500 font-mono">Depth: {eq.depth_km ?? 0} km</span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {eq.time ? new Date(eq.time).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit'
}) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-slate-600 text-center pt-1 font-mono">
                Showing M2.5+ events · Source: USGS
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── COMBINED STATUS SUMMARY ─────────────────────────── */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Globe size={14} className="text-blue-400" />
          Real-Time Risk Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Weather risk */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Weather Risk</p>
            <p className={`text-lg font-bold ${dangerousWeather ? 'text-orange-400' : 'text-green-400'}`}>
              {loadingWeather ? '—' : dangerousWeather ? 'Elevated' : 'Normal'}
            </p>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">
              {weather ? weather.condition : '—'}
            </p>
          </div>
          {/* Seismic risk */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Seismic Activity</p>
            <p className={`text-lg font-bold ${severeEqs.length > 0 ? 'text-red-400' : earthquakes.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {loadingEq ? '—' : severeEqs.length > 0 ? 'High Alert' : earthquakes.length > 0 ? 'Active' : 'Quiet'}
            </p>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">
              {earthquakes.length} events (24h)
            </p>
          </div>
          {/* Overall */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Overall Status</p>
            <p className={`text-lg font-bold ${
              severeEqs.length > 0 || dangerousWeather ? 'text-red-400' :
              earthquakes.length > 3 ? 'text-orange-400' :
              'text-green-400'
            }`}>
              {severeEqs.length > 0 ? '🔴 High Risk' :
               dangerousWeather ? '🟠 Caution' :
               earthquakes.length > 0 ? '🟡 Monitoring' :
               '🟢 All Clear'}
            </p>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">Live · Auto-refresh 5 min</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Disasters;