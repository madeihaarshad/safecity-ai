import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonTable } from '../components/Skeleton';
import { User, ShieldCheck, AlertCircle, Eye, Trash2, X, Search } from 'lucide-react';

// ── Risk level badge ────────────────────────────────────────────────────────
const RiskBadge = ({ score }) => {
  let color, label;
  if (score >= 80) {
    color = 'bg-green-500/20 text-green-400 border-green-500/30';
    label = 'Safe Driver';
  } else if (score >= 50) {
    color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    label = 'Moderate Risk';
  } else {
    color = 'bg-red-500/20 text-red-400 border-red-500/30';
    label = 'High Risk';
  }
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${color}`}>
      {label}
    </span>
  );
};

// ── Score progress bar ──────────────────────────────────────────────────────
const ScoreProgressBar = ({ score }) => {
  let bgColor = 'bg-red-500';
  if (score >= 80) bgColor = 'bg-green-500';
  else if (score >= 50) bgColor = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${bgColor} transition-all duration-300`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <span className="text-sm font-mono font-bold text-white min-w-12 text-right">
        {Math.round(score)}
      </span>
    </div>
  );
};

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterBanner, setShowFilterBanner] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((new Date() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  const filteredDrivers = React.useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    const query = searchQuery.toLowerCase().trim();
    return drivers.filter(d => 
      d.name.toLowerCase().includes(query) || 
      d.licenseId.toLowerCase().includes(query)
    );
  }, [drivers, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) setShowFilterBanner(true);
    else setShowFilterBanner(false);
  }, [searchQuery]);

  useEffect(() => {
    const fetchDriversWithScores = async () => {
      try {
        // Fetch all drivers
        const driversRes = await axios.get('http://localhost:5000/api/drivers');
        const driversList = driversRes.data;

        // Fetch safety scores for all drivers in parallel
        const scoresPromises = driversList.map(driver =>
          axios.get(`http://localhost:5000/api/drivers/${driver._id}/score`)
            .then(res => ({
              ...driver,
              safetyScore: res.data.safetyScore,
              violationCount: res.data.violationCount,
              breakdown: res.data.breakdown
            }))
            .catch(err => {
              console.error(`Failed to fetch score for driver ${driver._id}:`, err);
              // Fallback: use default score
              return {
                ...driver,
                safetyScore: 100,
                violationCount: 0,
                breakdown: { high: 0, medium: 0, low: 0 }
              };
            })
        );

        const driversWithScores = await Promise.all(scoresPromises);

        // Sort by most recent first (descending by date)
        driversWithScores.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });

        setDrivers(driversWithScores);
        setLastUpdated(new Date());
        window.dispatchEvent(new CustomEvent('data-sync'));
      } catch (err) {
        console.error('Error fetching drivers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDriversWithScores();
    const interval = setInterval(fetchDriversWithScores, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Drivers' }]} />
      <div className="flex flex-col gap-2 mb-6">
        <SectionHeader
          title="Fleet Management"
          subtitle="Monitor active drivers and safety scores"
        />
        <span className="text-[9px] font-mono text-slate-600">Last updated {secondsAgo} seconds ago</span>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search drivers by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {showFilterBanner && (
        <div className="flex items-center justify-between bg-sky-950/40 border border-sky-500/30 text-sky-400 text-xs px-4 py-3 rounded-lg mb-4">
          <span>Showing {filteredDrivers.length} results for 'Search: {searchQuery}'</span>
          <button onClick={() => setShowFilterBanner(false)} className="hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 text-center">
          <p className="text-2xl font-bold text-white">{drivers.length}</p>
          <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mt-1">
            Total Drivers
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg border border-green-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            {drivers.filter(d => d.safetyScore >= 80).length}
          </p>
          <p className="text-xs font-mono text-green-500/70 tracking-widest uppercase mt-1">
            Safe
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg border border-yellow-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {drivers.filter(d => d.safetyScore >= 50 && d.safetyScore < 80).length}
          </p>
          <p className="text-xs font-mono text-yellow-500/70 tracking-widest uppercase mt-1">
            Moderate
          </p>
        </div>
        <div className="bg-slate-900 rounded-lg border border-red-500/20 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">
            {drivers.filter(d => d.safetyScore < 50).length}
          </p>
          <p className="text-xs font-mono text-red-500/70 tracking-widest uppercase mt-1">
            High Risk
          </p>
        </div>
      </div>

      {/* Drivers table */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden min-h-[400px]">
        <table className="w-full text-left">
          <thead className="bg-slate-950 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-slate-400 tracking-widest uppercase">
                Driver Name
              </th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-slate-400 tracking-widest uppercase">
                License ID
              </th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-slate-400 tracking-widest uppercase">
                Safety Score
              </th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-slate-400 tracking-widest uppercase">
                Risk Level
              </th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-slate-400 tracking-widest uppercase">
                Violations
              </th>
              <th className="px-6 py-4 text-xs font-mono font-semibold text-slate-400 tracking-widest uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <SkeletonTable rows={8} />
            ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={32} className="opacity-30" />
                      <p className="text-sm">No drivers registered in the system.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver._id} className="cursor-pointer hover:bg-slate-800/60 transition-colors">
                    {/* Driver Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                          {driver.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{driver.name}</span>
                      </div>
                    </td>

                    {/* License ID */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-400">
                        {driver.licenseNumber}
                      </span>
                    </td>

                    {/* Safety Score */}
                    <td className="px-6 py-4">
                      <ScoreProgressBar score={driver.safetyScore} />
                    </td>

                    {/* Risk Level */}
                    <td className="px-6 py-4">
                      <RiskBadge score={driver.safetyScore} />
                    </td>

                    {/* Violations */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">
                          {driver.violationCount}
                        </span>
                        <div className="text-xs text-slate-500">
                          <span className="text-red-500">↑{driver.breakdown?.high || 0}</span>
                          <span className="mx-1">·</span>
                          <span className="text-yellow-500">↑{driver.breakdown?.medium || 0}</span>
                          <span className="mx-1">·</span>
                          <span className="text-green-500">↑{driver.breakdown?.low || 0}</span>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm text-slate-300 hover:text-white font-medium">
                          <Eye size={14} />
                          View
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Delete this driver? This cannot be undone.")) {
                              // Empty block
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-sm font-medium border border-transparent hover:border-red-500/30"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Drivers;
