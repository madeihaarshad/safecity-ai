import React, { useState, useEffect, useRef } from 'react';
import { fetchStats } from "../api/api";
import socket from '../socket';
import { ShieldAlert, Car, Waves, Activity, Radio, TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, AlertCircle, RefreshCcw } from 'lucide-react';
import AlertStream from '../components/AlertStream';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import SensorGrid from '../components/SensorGrid';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

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
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-sky-500/30 rounded px-3 py-2 shadow-lg">
      <p className="text-[9px] font-mono text-sky-400 tracking-widest uppercase mb-1">{label}</p>
      <p className="text-sm font-bold text-white font-mono">{payload[0].value}%</p>
    </div>
  );
};

// ── Live status badge ─────────────────────────────────────────────────────────
const LiveBadge = ({ hasAlerts }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono tracking-widest uppercase border transition-all duration-500 ${
    hasAlerts
      ? 'bg-red-950/50 border-red-500/40 text-red-400'
      : 'bg-slate-900 border-slate-700 text-slate-400'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
      hasAlerts
        ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'
        : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.9)]'
    }`} />
    {hasAlerts ? 'Incidents Active' : 'System Live'}
  </div>
);

// ── Stat card ────────────────────────────────────────────────────────────────
const HackStatCard = ({ title, value, icon: Icon, color, trend, sub, unit, description, loading }) => {
  const colorMap = {
    blue:   { text: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    bar: 'bg-sky-500',    topBar: 'from-sky-500/70',    borderLeft: 'border-l-sky-500' },
    red:    { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    bar: 'bg-red-500',    topBar: 'from-red-500/70',    borderLeft: 'border-l-red-500' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', bar: 'bg-yellow-500', topBar: 'from-yellow-500/70', borderLeft: 'border-l-yellow-500' },
    green:  { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  bar: 'bg-green-500',  topBar: 'from-green-500/70',  borderLeft: 'border-l-green-500' },
  };
  const c = colorMap[color] || colorMap.blue;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div className={`relative bg-slate-900 rounded-lg border ${c.border} border-l-4 ${c.borderLeft} overflow-visible group hover:brightness-110 transition-all duration-300`}>
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${c.topBar} via-transparent to-transparent`} />
      
      {/* Tooltip */}
      {description && (
        <span 
          role="tooltip" 
          className="absolute left-1/2 -top-10 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-slate-700 transition-opacity"
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
            <div className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
              trend > 0 ? 'text-red-400 border-red-500/30 bg-red-500/10'
              : trend < 0 ? 'text-green-400 border-green-500/30 bg-green-500/10'
              : 'text-slate-500 border-slate-700 bg-slate-800'
            }`}>
              <TrendIcon size={9} />
              {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {Math.abs(trend)}% vs yesterday
            </div>
          )}
        </div>
        <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-1">{title}</p>
        
        {loading ? (
           <div className="animate-pulse bg-slate-700 rounded h-8 w-24 mt-1 mb-1"></div>
        ) : (
           <>
             <p className={`text-3xl font-bold font-mono ${c.text}`}>{value}</p>
             {unit && <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">{unit}</p>}
           </>
        )}
        
        {sub && !loading && <p className="text-[9px] font-mono text-slate-600 mt-1 tracking-wide">{sub}</p>}
      </div>
      <div className={`absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-700 ${c.bar}`} />
    </div>
  );
};

// ── Panel wrapper ─────────────────────────────────────────────────────────────
const Panel = ({ title, tag, children }) => (
  <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/60">
      <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white">{title}</h3>
      {tag && <span className="text-[8px] font-mono text-slate-600 tracking-widest uppercase">{tag}</span>}
    </div>
    {children}
  </div>
);

// ── City Risk Banner ─────────────────────────────────────────────────────────────
const CityRiskBanner = () => {
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
          bg: 'bg-slate-900 border border-slate-700',
          icon: Shield,
          iconColor: 'text-slate-400',
          title: 'City Status: Unknown',
          titleColor: 'text-slate-300',
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
          <p className="text-xs text-slate-400 mt-1">
            Last updated: {getTimeString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-3xl font-bold font-mono text-white">
          {riskData.riskScore}
        </p>
        <p className="text-xs text-slate-400 mt-1">Risk Score</p>
      </div>
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [stats, setStats] = useState({ drivers: 0, violations: 0, disasters: 0, riskLevel: 'Low' });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);
  const alertCountRef = useRef(0);

  const [chartData, setChartData] = useState([
    { name: '00:00', risk: 12 },
    { name: '04:00', risk: 8  },
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
  useEffect(() => {
    const fetchData = async () => {
      try {
       const res = await fetchStats();
setStats(res.data);
      } catch {
        // backend offline — keep default zeros, don't crash
      } finally {
        setLoading(false);
      }
    };
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
    <div className="p-6 space-y-6 bg-slate-950 min-h-full">
      <Breadcrumb crumbs={[{ label: 'Dashboard' }]} />

      {/* City Risk Banner */}
      <CityRiskBanner />

      {/* Header */}
      <SectionHeader
        title="Command Centre"
        subtitle="Real-time city safety and traffic overview"
        actions={<LiveBadge hasAlerts={hasCritical} />}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Fleet Status Group */}
        <div>
          <h4 className="text-[9px] font-mono text-slate-600 tracking-[0.2em] uppercase mb-3">FLEET STATUS</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HackStatCard 
              title="Total Fleet"      
              value={stats.drivers}    
              icon={Car}        
              color="blue"   
              sub="ACTIVE VEHICLES" 
              loading={loading}
              unit="vehicles"
              description="Total number of active registered city vehicles"
            />
            <HackStatCard 
              title="AI Risk Index"    
              value={stats.riskLevel}  
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
          <h4 className="text-[9px] font-mono text-slate-600 tracking-[0.2em] uppercase mb-3">SAFETY METRICS</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HackStatCard 
              title="Violations (24h)" 
              value={stats.violations} 
              icon={ShieldAlert} 
              color="red"    
              trend={12} 
              sub="VS YESTERDAY" 
              loading={loading}
              unit="incidents"
              description="Total traffic and safety violations recorded in the last 24 hours"
            />
            <HackStatCard 
              title="Disaster Events"  
              value={stats.disasters}  
              icon={Waves}       
              color="yellow" 
              sub="ACTIVE INCIDENTS" 
              loading={loading}
              unit="active"
              description="Ongoing environmental or infrastructure emergencies"
            />
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div>
        <SectionHeader
          title="Traffic Sensors"
          subtitle="Real-time speed and congestion monitoring"
        />
        <SensorGrid />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Charts */}
        <div className="lg:col-span-2 space-y-4">
          <Panel title="Accident Probability Forecast" tag="24H ROLLING — LIVE">
            <div className="p-5">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }} />
                    <YAxis stroke="#334155" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<HackTooltip />} />
                    <Area
                      type="monotone" dataKey="risk"
                      stroke="#38bdf8" strokeWidth={2}
                      fillOpacity={1} fill="url(#riskGrad)"
                      dot={{ fill: '#38bdf8', r: 3, strokeWidth: 0 }}
                      activeDot={{ fill: '#fff', r: 4, stroke: '#38bdf8', strokeWidth: 2 }}
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }} />
                    <YAxis stroke="#334155" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e3a5f', color: '#fff', fontSize: 11, fontFamily: 'monospace' }} />
                    <Bar dataKey="vol" fill="#4ade80" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={600} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        </div>

        {/* Alert feed */}
        <div className="flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden" style={{ minHeight: '580px' }}>

          {/* Feed header */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                hasCritical
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'
                  : 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]'
              }`} />
              <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white">
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
                className={hasCritical ? 'text-red-400 animate-pulse' : 'text-slate-600'}
              />
            </div>
          </div>

          {/* Scrollable stream */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            <AlertStream alerts={alerts} />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-[8px] font-mono text-slate-600 tracking-widest uppercase">
              {alerts.length} events in session
            </span>
            <button className="text-[8px] font-mono text-slate-500 hover:text-sky-400 tracking-widest uppercase transition-colors">
              View All →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;