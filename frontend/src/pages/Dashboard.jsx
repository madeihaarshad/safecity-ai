import React, { useState, useEffect, useRef } from 'react';
import { fetchStats } from "../api/api";
import socket from '../socket';
import { ShieldAlert, Car, Waves, Activity, Radio, TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, AlertCircle, RefreshCcw } from 'lucide-react';
import AlertStream from '../components/AlertStream';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import SensorGrid from '../components/SensorGrid';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { ServerCrash } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── Mock alert pool — always available even without backend ──────────────────
const MOCK_ALERTS = [
  {
    title: 'Sudden Congestion',
    message: 'Traffic build-up detected on Main St. Average delay 18 min.',
    category: 'Traffic',
    priority: 'Normal',
    area: 'Main Street — CBD',
  },
  {
    title: 'Speed Violation Detected',
    message: 'Vehicle recorded at 142 km/h in an 80 km/h zone. Unit dispatched.',
    category: 'Violation',
    priority: 'High',
    area: 'Ring Road North',
  },
  {
    title: 'Flash Flood Warning',
    message: 'Water levels rising rapidly. Evacuation recommended for low-lying areas.',
    category: 'Disaster',
    priority: 'Critical',
    area: 'Downtown Sector 4',
  },
  {
    title: 'Sensor Node Offline',
    message: 'Environmental sensor at Node 14 is unresponsive. Data gap in south grid.',
    category: 'System',
    priority: 'High',
    area: 'Node 14 — South Grid',
  },
  {
    title: 'AI Risk Score Spike',
    message: 'Predictive model flagged elevated accident probability for next 2 hours.',
    category: 'AI Engine',
    priority: 'Normal',
    area: 'City-Wide',
  },
  {
    title: 'Wrong-Way Driver',
    message: 'Vehicle detected travelling against traffic on dual carriageway.',
    category: 'Traffic',
    priority: 'Critical',
    area: 'North Expressway — KM 14',
  },
  {
    title: 'Red Light Jump',
    message: 'Signal violation captured at Intersection 5A. Penalty issued.',
    category: 'Violation',
    priority: 'Normal',
    area: 'Intersection 5A — West',
  },
  {
    title: 'Power Grid Failure',
    message: 'Partial outage affecting 3,200 residents. ETR: 45 minutes.',
    category: 'Disaster',
    priority: 'Critical',
    area: 'Zone C — Substation 2',
  },
  {
    title: 'Road Hazard Reported',
    message: 'Debris on road surface causing lane blockage. Maintenance en route.',
    category: 'Infrastructure',
    priority: 'Normal',
    area: 'Bypass Route 12',
  },
  {
    title: 'Chemical Spill Alert',
    message: 'Hazmat incident reported. Exclusion zone established at 200m radius.',
    category: 'Disaster',
    priority: 'Critical',
    area: 'Dockyard — Terminal C',
  },
];

// ── Custom chart tooltip ─────────────────────────────────────────────────────
const HackTooltip = ({ active, payload, label }) => {
  const { theme } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className={`border rounded px-3 py-2 shadow-lg ${
      theme === 'dark' ? 'bg-[var(--surface)] border-[var(--accent)]/30' : 'bg-white border-[var(--accent)]/50 shadow-sky-500/10'
    }`}>
      <p className="text-[9px] font-mono text-[var(--accent)] tracking-widest uppercase mb-1">{label}</p>
      <p className={`text-sm font-bold font-mono text-[var(--text)]`}>{payload[0].value}%</p>
    </div>
  );
};

// ── Live status badge ─────────────────────────────────────────────────────────
const LiveBadge = ({ hasAlerts }) => {
  const { theme } = useTheme();
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono tracking-widest uppercase border transition-all duration-500 ${
      hasAlerts
        ? 'bg-red-950/50 border-red-500/40 text-red-400'
        : theme === 'dark'
          ? 'bg-[var(--surface)] border-[var(--border)] text-[var(--subtle)]'
          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--subtle)] shadow-sm'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${hasAlerts
          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'
          : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.9)]'
        }`} />
      {hasAlerts ? 'Incidents Active' : 'System Live'}
    </div>
  );
};

// ── Stat card ────────────────────────────────────────────────────────────────
const safeDisplay = (v) =>
  v === null || v === undefined ? '—'
  : typeof v === 'object' ? (v.total ?? v.level ?? '—')
  : String(v);

const HackStatCard = ({ title, value, icon: Icon, color, trend, sub, unit, description, loading }) => {
  const { theme } = useTheme();
  const colorMap = {
    blue: { text: 'text-lime-400', bg: 'bg-lime-500/10', border: 'border-lime-500/20', bar: 'bg-lime-500', topBar: 'from-lime-500/70', borderLeft: 'border-l-lime-500' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', bar: 'bg-red-500', topBar: 'from-red-500/70', borderLeft: 'border-l-red-500' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', bar: 'bg-yellow-500', topBar: 'from-yellow-500/70', borderLeft: 'border-l-yellow-500' },
    green: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', bar: 'bg-emerald-500', topBar: 'from-emerald-500/70', borderLeft: 'border-l-emerald-500' },
  };
  const c = colorMap[color] || colorMap.blue;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div className={`relative rounded-lg border ${c.border} border-l-4 ${c.borderLeft} overflow-visible group hover:brightness-110 transition-all duration-300 accent-glow ${
      theme === 'dark' ? 'bg-[var(--surface)]' : 'bg-white shadow-sm'
    }`}>
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${c.topBar} via-transparent to-transparent`} />

      {/* Tooltip */}
      {description && (
        <span
          role="tooltip"
          className="absolute left-1/2 -top-10 -translate-x-1/2 px-2 py-1 bg-[var(--card)] text-[var(--text)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-[var(--border)] transition-opacity"
        >
          {description}
        </span>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2 rounded ${c.bg} ${c.text}`}>
            <Icon size={18} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${trend > 0 ? 'text-red-400 border-red-500/30 bg-red-500/10'
                : trend < 0 ? 'text-green-400 border-green-500/30 bg-green-500/10'
                  : 'text-slate-500 border-slate-700 bg-slate-800'
              }`}>
              <TrendIcon size={9} />
              {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {Math.abs(trend)}% vs yesterday
            </div>
          )}
        </div>
        <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-[var(--subtle)] mb-1">{title}</p>

        {loading ? (
          <div className="animate-pulse bg-slate-700 rounded h-8 w-24 mt-1 mb-1"></div>
        ) : (
          <>
            <p className={`text-3xl font-bold font-mono ${c.text}`}>{safeDisplay(value)}</p>
            {unit && <p className="text-[10px] font-mono text-[var(--subtle)] uppercase tracking-widest block">{unit}</p>}
          </>
        )}

        {sub && !loading && <p className="text-[9px] font-mono text-slate-600 mt-1 tracking-wide">{sub}</p>}
      </div>
      <div className={`absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-700 ${c.bar}`} />
    </div>
  );
};

// ── Panel wrapper ─────────────────────────────────────────────────────────────
const Panel = ({ title, tag, children }) => {
  const { theme } = useTheme();
  return (
    <div className={`rounded-lg border overflow-hidden ${
      theme === 'dark' ? 'bg-[var(--surface)] border-[var(--border)]' : 'bg-white border-gray-100 shadow-sm'
    }`}>
      <div className={`flex items-center justify-between px-5 py-3 border-b ${
        theme === 'dark' ? 'border-[var(--border)] bg-[var(--bg)]/60' : 'border-gray-50 bg-gray-50/50'
      }`}>
        <h3 className={`text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[var(--text)]`}>{title}</h3>
        {tag && <span className="text-[8px] font-mono text-[var(--subtle)] tracking-widest uppercase">{tag}</span>}
      </div>
      {children}
    </div>
  );
};

// ── City Risk Banner ─────────────────────────────────────────────────────────────
const CityRiskBanner = ({ theme }) => {
  const [riskData, setRiskData] = useState({ riskScore: 0, level: 'SAFE' });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAIAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai-analytics');
      if (res.ok) {
        const data = await res.json();
        setRiskData(data);
        setLastUpdated(new Date());
        window.dispatchEvent(new CustomEvent('data-sync'));
      }
    } catch (err) {
      // Keep existing data if fetch fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIAnalytics();
    const interval = setInterval(fetchAIAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTimeString = () => {
    return lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const getBannerStyle = () => {
    switch (riskData.level) {
      case 'SAFE':
        return {
          bg: 'bg-green-900/40 border border-green-700/50',
          icon: Shield,
          iconColor: 'text-green-400',
          title: 'City Status: All Clear',
          titleColor: 'text-green-300',
        };
      case 'WARNING':
        return {
          bg: 'bg-yellow-900/40 border border-yellow-700/50',
          icon: AlertTriangle,
          iconColor: 'text-yellow-400',
          title: 'City Status: Elevated Risk',
          titleColor: 'text-yellow-300',
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-900/50 border border-red-700/50 animate-pulse',
          icon: AlertCircle,
          iconColor: 'text-red-400',
          title: 'City Status: CRITICAL — Action Required',
          titleColor: 'text-red-200',
        };
      default:
        return {
          bg: 'bg-[var(--surface)] border border-[var(--border)]',
          icon: Shield,
          iconColor: 'text-[var(--subtle)]',
          title: 'City Status: Unknown',
          titleColor: 'text-[var(--subtle)]',
        };
    }
  };

  const style = getBannerStyle();
  const IconComponent = style.icon;

  return (
    <div className={`w-full ${style.bg} rounded-lg p-5 flex items-center justify-between mb-6 transition-all duration-500`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${style.iconColor} opacity-80`}>
          {loading ? (
            <RefreshCcw size={24} className="animate-spin" />
          ) : (
            <IconComponent size={24} />
          )}
        </div>
        <div>
          <h2 className={`text-lg font-bold ${style.titleColor}`}>
            {style.title}
          </h2>
          <p className="text-xs text-[var(--subtle)] mt-1">
            Last updated: {getTimeString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-3xl font-bold font-mono text-[var(--text)]`}>
          {riskData.riskScore}
        </p>
        <p className="text-xs text-[var(--subtle)] mt-1">Risk Score</p>
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState({ drivers: 0, violations: 0, disasters: 0, riskLevel: 'Low' });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const alertCountRef = useRef(0);

  const [chartData, setChartData] = useState([
    { name: '00:00', risk: 12 },
    { name: '04:00', risk: 8 },
    { name: '08:00', risk: 45 },
    { name: '12:00', risk: 38 },
    { name: '16:00', risk: 65 },
    { name: '20:00', risk: 22 },
  ]);

  const [trafficData, setTrafficData] = useState([
    { name: 'Z1', vol: 320 },
    { name: 'Z2', vol: 480 },
    { name: 'Z3', vol: 210 },
    { name: 'Z4', vol: 550 },
    { name: 'Z5', vol: 390 },
    { name: 'Z6', vol: 280 },
  ]);

  // helper — push one alert into state
  const pushAlert = (alert) => {
    setAlerts(prev => [{ ...alert, timestamp: new Date() }, ...prev].slice(0, 10));
    alertCountRef.current += 1;
    setAlertCount(alertCountRef.current);
  };

  // ── Fetch stats from backend (graceful fallback) ──────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchStats();
      setStats(res.data);
      setError(false);
      window.dispatchEvent(new CustomEvent('data-sync'));
    } catch {
      // backend offline — keep default zeros, show error state
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Mock alerts — fire immediately then every 5s ───────────────────────────
  useEffect(() => {
    // Seed 3 staggered alerts right away so feed is never empty
    MOCK_ALERTS.slice(0, 3).forEach((alert, i) => {
      setTimeout(() => pushAlert(alert), i * 1000);
    });

    // Keep firing random mock alerts every 5s
    const mockInterval = setInterval(() => {
      const alert = MOCK_ALERTS[Math.floor(Math.random() * MOCK_ALERTS.length)];
      pushAlert(alert);
    }, 5000);

    return () => clearInterval(mockInterval);
  }, []);

  // ── Real socket listeners (fire alongside mocks when backend is up) ────────
  useEffect(() => {
    socket.on('new-alert', (alert) => {
      pushAlert({ ...alert });
    });

    socket.on('disaster-alert', (data) => {
      pushAlert({ ...data, title: data.type, priority: 'Critical' });
    });

    return () => {
      socket.off('new-alert');
      socket.off('disaster-alert');
    };
  }, []);

  // ── Live chart ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const label = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      setChartData(prev => [
        ...prev.slice(-5),
        { name: label, risk: Math.floor(10 + Math.random() * 75) }
      ]);
      setTrafficData(prev =>
        prev.map(z => ({ ...z, vol: Math.max(80, z.vol + Math.floor(Math.random() * 100 - 50)) }))
      );
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const hasCritical = alerts.some(a => a.priority === 'Critical');

  return (
    <div className={`p-6 space-y-6 min-h-full transition-colors duration-300 bg-[var(--bg)]`}>
      <Breadcrumb crumbs={[{ label: 'Dashboard' }]} />

      {/* City Risk Banner */}
      <CityRiskBanner theme={theme} />

      {/* Header */}
      <SectionHeader
        title="Command Centre"
        subtitle="Real-time city safety and traffic overview"
        actions={<LiveBadge hasAlerts={hasCritical} />}
      />

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 min-h-[140px]">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 text-center mb-8">
          <div className="flex justify-center mb-3">
            <ServerCrash size={32} className="text-orange-400" />
          </div>
          <h3 className="text-lg font-bold text-orange-300 mb-2">
            Unable to reach SafeCity servers
          </h3>
          <p className="text-sm text-orange-400/80 mb-4">
            Showing last known data. Live updates paused.
          </p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Fleet Status Group */}
          <div>
            <h4 className="text-[9px] font-mono text-[var(--subtle)] tracking-[0.2em] uppercase mb-3">FLEET STATUS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HackStatCard
                title="Total Fleet"
                value={typeof stats.drivers === 'object' ? stats.drivers.total : stats.drivers}
                icon={Car}
                color="blue"
                sub="ACTIVE VEHICLES"
                loading={loading}
                unit="vehicles"
                description="Total number of active registered city vehicles"
              />
              <HackStatCard
                title="AI Risk Index"
                value={typeof stats.riskLevel === 'object' ? (stats.riskLevel.level ?? stats.riskLevel.total ?? JSON.stringify(stats.riskLevel)) : stats.riskLevel}
                icon={Activity}
                color="green"
                sub="CITY-WIDE THREAT LEVEL"
                loading={loading}
                unit="threat level"
                description="Aggregated risk score from predictive models"
              />
            </div>
          </div>

          {/* Safety Metrics Group */}
          <div>
            <h4 className="text-[9px] font-mono text-[var(--subtle)] tracking-[0.2em] uppercase mb-3">SAFETY METRICS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HackStatCard
                title="Violations (24h)"
                value={typeof stats.violations === 'object' ? stats.violations.total : stats.violations}
                icon={ShieldAlert}
                color="red"
                trend={12}
                sub={typeof stats.violations === 'object' && stats.violations.high !== undefined ? `HIGH: ${stats.violations.high} · MED: ${stats.violations.medium} · LOW: ${stats.violations.low}` : "VS YESTERDAY"}
                loading={loading}
                unit="incidents"
                description="Total traffic and safety violations recorded in the last 24 hours"
              />
              <HackStatCard
                title="Disaster Events"
                value={typeof stats.disasters === 'object' ? stats.disasters.total : stats.disasters}
                icon={Waves}
                color="yellow"
                sub={typeof stats.disasters === 'object' && stats.disasters.high !== undefined ? `HIGH: ${stats.disasters.high} · MED: ${stats.disasters.medium} · LOW: ${stats.disasters.low}` : "ACTIVE INCIDENTS"}
                loading={loading}
                unit="active"
                description="Ongoing environmental or infrastructure emergencies"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sensor Grid */}
      <div>
        <SectionHeader
          title="Traffic Sensors"
          subtitle="Real-time speed and congestion monitoring"
        />
        <SensorGrid />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[600px]">
        {loading ? (
          <div className={`lg:col-span-3 rounded-lg border p-6 bg-[var(--surface)] border-[var(--border)]`}>
            <table className="w-full">
              <tbody className="divide-y divide-slate-800"><SkeletonTable rows={6} /></tbody>
            </table>
          </div>
        ) : (
          <>
            {/* Charts */}
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Accident Probability Forecast" tag="24H ROLLING — LIVE">
                <div className="p-5">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--border)" tick={{ fill: 'var(--subtle)', fontSize: 9, fontFamily: 'monospace' }} />
                      <YAxis stroke="var(--border)" tick={{ fill: 'var(--subtle)', fontSize: 9, fontFamily: 'monospace' }} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<HackTooltip />} />
                        <Area
                          type="monotone" dataKey="risk"
                          stroke="#38bdf8" strokeWidth={2}
                          fillOpacity={1} fill="url(#riskGrad)"
                          dot={{ fill: '#38bdf8', r: 3, strokeWidth: 0 }}
                          activeDot={{ fill: theme === 'dark' ? '#fff' : '#0ea5e9', r: 4, stroke: '#38bdf8', strokeWidth: 2 }}
                          isAnimationActive animationDuration={800}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Panel>

              <Panel title="Traffic Volume by Zone" tag="LIVE">
                <div className="p-5">
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trafficData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--border)" tick={{ fill: 'var(--subtle)', fontSize: 9, fontFamily: 'monospace' }} />
                        <YAxis stroke="var(--border)" tick={{ fill: 'var(--subtle)', fontSize: 9, fontFamily: 'monospace' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 11, fontFamily: 'monospace' }} />
                        <Bar dataKey="vol" fill="#4ade80" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={600} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Alert feed */}
            <div className={`flex flex-col rounded-lg border overflow-hidden bg-[var(--surface)] border-[var(--border)] shadow-sm`} style={{ minHeight: '580px' }}>

              {/* Feed header */}
              <div className={`px-5 py-3 border-b flex items-center justify-between ${
                theme === 'dark' ? 'border-[var(--border)] bg-[var(--bg)]/60' : 'border-gray-50 bg-gray-50/50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${hasCritical
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'
                      : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]'
                    }`} />
                  <h3 className={`text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[var(--text)]`}>
                    Real-Time Feed
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {alertCount > 0 && (
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 tracking-widest">
                      {alertCount} TOTAL
                    </span>
                  )}
                  <Radio
                    size={11}
                    className={hasCritical ? 'text-red-400 animate-pulse' : 'text-[var(--subtle)]'}
                  />
                </div>
              </div>

              {/* Scrollable stream */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <AlertStream alerts={alerts} />
              </div>

              {/* Footer */}
              <div className={`px-4 py-3 border-t flex items-center justify-between ${
                theme === 'dark' ? 'border-[var(--border)] bg-[var(--bg)]/60' : 'border-gray-50 bg-gray-50/50'
              }`}>
                <span className="text-[8px] font-mono text-[var(--subtle)] tracking-widest uppercase">
                  {alerts.length} events in session
                </span>
                <button className={`text-[8px] font-mono tracking-widest uppercase transition-colors text-[var(--subtle)] hover:text-[var(--accent)]`}>
                  View All →
                </button>
              </div>
            </div>
          </>)}
      </div>
    </div>
  );
};

export default Dashboard;