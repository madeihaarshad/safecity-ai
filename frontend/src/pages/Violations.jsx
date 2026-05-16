import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchViolations, detectViolations } from '../api/api';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonTable } from '../components/Skeleton';
import {
  Search, Filter, ExternalLink, Camera, Upload,
  RefreshCcw, ShieldAlert, Video, VideoOff, Aperture, Trash2, X, WifiOff
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const SeverityBadge = ({ level }) => {
  const map = {
    high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  };
  const style = map[level?.toLowerCase()] || map.low;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      {level}
    </span>
  );
};

// Format date helper
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Get date range helper
const getDateRange = (range) => {
  const now = new Date();
  const start = new Date();

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case '7days':
      start.setDate(start.getDate() - 7);
      return { start, end: now };
    case '30days':
      start.setDate(start.getDate() - 30);
      return { start, end: now };
    default:
      return { start: new Date(0), end: now };
  }
};

const Violations = () => {
  const { theme } = useTheme();
  const [tab, setTab] = useState('db');

  // ── DB violations ────────────────────────────────────────
  const [violations, setViolations] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((new Date() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // ── Filters ──────────────────────────────────────────────
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showFilterBanner, setShowFilterBanner] = useState(false);
  const [activeFilterStr, setActiveFilterStr] = useState('');

  useEffect(() => {
    const activeFilters = [];
    if (searchQuery.trim()) activeFilters.push(`Search: ${searchQuery}`);
    if (severityFilter !== 'all') activeFilters.push(`Severity: ${severityFilter}`);
    if (dateFilter !== 'all') activeFilters.push(`Date: ${dateFilter}`);

    if (activeFilters.length > 0) {
      setActiveFilterStr(activeFilters.join(', '));
      setShowFilterBanner(true);
    } else {
      setShowFilterBanner(false);
    }
  }, [searchQuery, severityFilter, dateFilter]);

  // ── YOLO scanner ─────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const fileInputRef = useRef(null);

  // ── Webcam ───────────────────────────────────────────────
  const [camMode, setCamMode] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const loadViolations = async () => {
    setDbLoading(true);
    setDbError(false);
    try {
      const res = await fetchViolations();
      if (res.data) {
        setViolations(res.data);
        setLastUpdated(new Date());
        setDbError(false);
        window.dispatchEvent(new CustomEvent('data-sync'));
      }
    }
    catch {
      setDbError(true);
    }
    finally { 
      setDbLoading(false); 
    }
  };

  useEffect(() => {
    loadViolations();
    const interval = setInterval(loadViolations, 30000);
    return () => {
      stopWebcam();
      clearInterval(interval);
    };
  }, []);

  // ── Client-side filtering ────────────────────────────────
  const filteredViolations = useMemo(() => {
    let filtered = [...violations];

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(v => v.severity?.toLowerCase() === severityFilter.toLowerCase());
    }

    // Filter by date range
    if (dateFilter !== 'all') {
      const { start } = getDateRange(dateFilter);
      filtered = filtered.filter(v => new Date(v.createdAt) >= start);
    }

    // Filter by search (location/driverId)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(v =>
        (v.location?.name?.toLowerCase().includes(query) || (typeof v.location === 'string' && v.location.toLowerCase().includes(query))) ||
        (v.driverId && v.driverId.toLowerCase().includes(query))
      );
    }

    // Sort by Most Recent First (descending by date)
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return filtered;
  }, [violations, severityFilter, dateFilter, searchQuery]);

  // ── Calculate summary stats ──────────────────────────────
  const stats = useMemo(() => {
    return {
      total: filteredViolations.length,
      high: filteredViolations.filter(v => v.severity?.toLowerCase() === 'high').length,
      medium: filteredViolations.filter(v => v.severity?.toLowerCase() === 'medium').length,
      low: filteredViolations.filter(v => v.severity?.toLowerCase() === 'low').length,
    };
  }, [filteredViolations]);

  // ── Webcam helpers ───────────────────────────────────────
  const startWebcam = async () => {
    setCamError(null);
    setCamMode(true);
    setCamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCamReady(true);
          };
        }
      }, 100);
    } catch {
      setCamError('Camera access denied. Please allow camera permissions.');
      setCamMode(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCamMode(false);
    setCamReady(false);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedImage(dataUrl);
    setImageBase64(dataUrl.split(',')[1]);
    setScanResult(null);
    stopWebcam();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImage(URL.createObjectURL(file));
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImageBase64(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  const runScan = async () => {
    if (!imageBase64) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await detectViolations(imageBase64);
      setScanResult(res.data);
    } catch {
      setScanResult({ status: 'error', message: 'AI Engine unreachable — is Flask running on :5001?' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Violations' }]} />

      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Traffic Violations"
          subtitle="Database records · YOLO AI violation scanner"
        />
        <span className="text-[9px] font-mono text-[var(--subtle)]">Last updated {secondsAgo} seconds ago</span>
      </div>

      {showFilterBanner && (
        <div className="flex items-center justify-between bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs px-4 py-3 rounded-lg mb-4">
          <span>Showing {filteredViolations.length} results for '{activeFilterStr}'</span>
          <button 
            onClick={() => setShowFilterBanner(false)} 
            className="hover:text-[var(--text)] transition-colors"
            aria-label="Close filter banner"
            title="Close filter banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setTab('db')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'db' ? 'bg-[var(--accent)] text-[var(--bg)] shadow-lg accent-glow' : 'bg-[var(--card)] text-[var(--subtle)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
          aria-label="View database records"
          title="View database records"
        >
          📋 Database Records
        </button>
        <button 
          onClick={() => setTab('yolo')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'yolo' ? 'bg-[var(--accent)] text-[var(--bg)] shadow-lg accent-glow' : 'bg-[var(--card)] text-[var(--subtle)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
          aria-label="Open YOLO AI scanner"
          title="Open YOLO AI scanner"
        >
          🎯 YOLO AI Scanner
        </button>
      </div>

      {/* ── DB Tab with Filtering ── */}
      {tab === 'db' && (
        <div className="space-y-6">

          {/* Filter Bar */}
          <div className={`rounded-lg border p-4 space-y-4 bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-[var(--subtle)]" />
              <span className="text-xs font-mono font-semibold tracking-widest uppercase text-[var(--subtle)]">Filters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--subtle)]" />
                <input
                  type="text"
                  tabIndex={1}
                  placeholder="Search by location or driver ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm placeholder-[var(--subtle)] focus:border-[var(--accent)] focus:outline-none transition-all bg-[var(--card)] border-[var(--border)] text-[var(--text)]`}
                />
              </div>

              {/* Severity Dropdown */}
              <select
                tabIndex={2}
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className={`px-4 py-2 border rounded-lg text-sm focus:border-[var(--accent)] focus:outline-none transition-all bg-[var(--card)] border-[var(--border)] text-[var(--text)]`}
              >
                <option value="all">Severity: All</option>
                <option value="low">Severity: Low</option>
                <option value="medium">Severity: Medium</option>
                <option value="high">Severity: High</option>
              </select>

              {/* Date Range Dropdown */}
              <select
                tabIndex={3}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`px-4 py-2 border rounded-lg text-sm focus:border-[var(--accent)] focus:outline-none transition-all bg-[var(--card)] border-[var(--border)] text-[var(--text)]`}
              >
                <option value="all">Date: All Time</option>
                <option value="today">Date: Today</option>
                <option value="7days">Date: Last 7 Days</option>
                <option value="30days">Date: Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`rounded-lg border p-4 text-center bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
              <p className={`text-2xl font-bold text-[var(--text)]`}>{stats.total}</p>
              <p className="text-xs font-mono text-[var(--subtle)] tracking-widest uppercase mt-1">Total</p>
            </div>
            <div className={`rounded-lg border p-4 text-center bg-[var(--surface)] border-red-500/20 shadow-sm`}>
              <p className="text-2xl font-bold text-red-500">{stats.high}</p>
              <p className="text-xs font-mono text-red-500/70 tracking-widest uppercase mt-1">High</p>
            </div>
            <div className={`rounded-lg border p-4 text-center bg-[var(--surface)] border-yellow-500/20 shadow-sm`}>
              <p className="text-2xl font-bold text-yellow-500">{stats.medium}</p>
              <p className="text-xs font-mono text-yellow-500/70 tracking-widest uppercase mt-1">Medium</p>
            </div>
            <div className={`rounded-lg border p-4 text-center bg-[var(--surface)] border-green-500/20 shadow-sm`}>
              <p className="text-2xl font-bold text-green-500">{stats.low}</p>
              <p className="text-xs font-mono text-green-500/70 tracking-widest uppercase mt-1">Low</p>
            </div>
          </div>

          {/* Error State */}
          {dbError && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 text-center">
              <div className="flex justify-center mb-3">
                <WifiOff size={32} className="text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-orange-300 mb-2">
                Unable to reach SafeCity servers
              </h3>
              <p className="text-sm text-orange-400/80 mb-4">
                Showing last known data. Live updates paused.
              </p>
              <button
                onClick={loadViolations}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Violations Table */}
          <div className={`rounded-lg border overflow-hidden min-h-[400px] bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
            <table className="w-full text-left">
              <thead className={`border-b bg-[var(--bg)] border-[var(--border)]`}>
                <tr>
                  <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Driver ID</th>
                  <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Location</th>
                  <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Speed / Limit</th>
                  <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Severity</th>
                  <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y border-[var(--border)]`}>
                {dbLoading ? (
                  <SkeletonTable rows={8} />
                ) : (
                  <>

                    {!dbLoading && filteredViolations.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-[var(--subtle)] italic text-sm">
                          No violations found matching your filters.
                        </td>
                      </tr>
                    )}

                    {!dbLoading && filteredViolations.map((v) => (
                      <tr key={v._id} className={`cursor-pointer transition-colors hover:bg-[var(--accent)]/5`}>
                        <td className={`px-6 py-4 font-mono text-sm text-[var(--text)]`}>{v.driverId}</td>
                        <td className="px-6 py-4 text-sm text-secondary">{v.location?.name || (typeof v.location === 'string' ? v.location : '—')}</td>
                        <td className="px-6 py-4 font-mono text-sm">
                          <span className="text-[var(--text)]">{v.speed}</span>
                          <span className="text-[var(--subtle)] mx-1">/</span>
                          <span className="text-secondary">{v.speedLimit}</span>
                          <span className="text-[var(--subtle)] text-xs ml-1">km/h</span>
                        </td>
                        <td className="px-6 py-4">
                          <SeverityBadge level={v.severity} />
                        </td>
                        <td className="px-6 py-4 text-xs text-[var(--subtle)] font-mono">
                          {formatDate(v.createdAt)}
                        </td>
                        <td className="px-6 py-4 flex gap-3 items-center">
                          <button 
                            className="text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors flex items-center gap-1 text-sm font-medium"
                            aria-label={`View violation details for ${v.driverId}`}
                            title="View violation details"
                          >
                            <ExternalLink size={14} /> View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this violation? This cannot be undone.")) {
                                // Empty block
                              }
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 text-sm font-medium"
                            aria-label={`Delete violation for ${v.driverId}`}
                            title="Delete violation"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── YOLO Tab ── */}
      {tab === 'yolo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: input */}
          <div className={`rounded-xl border p-6 space-y-4 bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
            <div className="flex items-center gap-3 mb-2">
              <Camera size={20} className="text-[var(--accent)]" />
              <div>
                <h3 className={`font-bold text-[var(--text)]`}>Traffic Image Source</h3>
                <p className="text-[var(--subtle)] text-xs">Upload a file or capture live from your camera</p>
              </div>
            </div>

            {/* Source buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { stopWebcam(); fileInputRef.current?.click(); }}
                className={`flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-all bg-[var(--card)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]`}
                aria-label="Upload image file"
                title="Upload image file"
              >
                <Upload size={16} /> Upload Image
              </button>
              <button
                onClick={camMode ? stopWebcam : startWebcam}
                className={`flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-all ${camMode
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-[var(--accent)]/20 border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)]/30'
                  }`}
                aria-label={camMode ? "Stop camera" : "Start live camera"}
                title={camMode ? "Stop camera" : "Start live camera"}
              >
                {camMode ? <><VideoOff size={16} /> Stop</> : <><Video size={16} /> Live Camera</>}
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {camError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{camError}</div>
            )}

            {/* Webcam feed */}
            {camMode && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black border border-[var(--border)]">
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full rounded-xl" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                  {!camReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {camReady && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-white font-semibold">LIVE</span>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <button 
                  onClick={captureFrame} 
                  disabled={!camReady}
                  className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                  aria-label="Capture frame from camera"
                  title="Capture frame from camera"
                >
                  <Aperture size={18} /> Capture Frame
                </button>
              </div>
            )}

            {/* Preview */}
            {!camMode && selectedImage && (
              <img src={selectedImage} alt="Selected" className="rounded-lg w-full object-cover max-h-48 border border-[var(--border)]" />
            )}

            {/* Drop zone */}
            {!camMode && !selectedImage && (
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-8 text-center cursor-pointer transition-colors">
                <Upload size={28} className="mx-auto mb-2 text-[var(--subtle)]" />
                <p className="text-[var(--subtle)] text-sm">Or click here to upload</p>
              </div>
            )}

            <button 
              onClick={runScan} 
              disabled={!imageBase64 || scanning || camMode}
              className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg accent-glow"
              aria-label="Scan image for violations"
              title="Scan image for violations"
            >
              {scanning
                ? <><RefreshCcw className="animate-spin" size={18} /> Scanning…</>
                : <><ShieldAlert size={18} /> Scan for Violations</>}
            </button>
          </div>

          {/* Right: results */}
          <div className={`rounded-xl border p-6 bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 text-[var(--text)]`}><ShieldAlert size={18} className="text-[var(--accent)]" /> Scan Results</h3>
            {!scanResult && !scanning && (
              <div className="h-48 flex items-center justify-center text-[var(--subtle)] italic text-sm">
                Capture or upload an image, then click Scan
              </div>
            )}
            {scanning && (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--subtle)] text-sm">YOLOv8 analysing frame…</p>
              </div>
            )}
            {scanResult && !scanning && (
              scanResult.status === 'error' ? (
                <p className="text-red-400 text-sm">{scanResult.message}</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className={`rounded-lg p-3 bg-[var(--card)]`}>
                      <p className={`text-2xl font-black text-[var(--text)]`}>{scanResult.total_violations}</p>
                      <p className="text-xs text-[var(--subtle)]">Violations</p>
                    </div>
                    <div className={`rounded-lg p-3 bg-[var(--card)]`}>
                      <p className={`text-2xl font-black text-[var(--text)]`}>{scanResult.persons_detected}</p>
                      <p className="text-xs text-[var(--subtle)]">Persons</p>
                    </div>
                    <div className={`rounded-lg p-3 bg-[var(--card)]`}>
                      <p className={`text-2xl font-black text-[var(--text)]`}>{scanResult.vehicles_detected}</p>
                      <p className="text-xs text-[var(--subtle)]">Vehicles</p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  {scanResult.breakdown && (
                    <div className={`rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs bg-[var(--card)]`}>
                      <div><p className={`font-bold text-[var(--text)]`}>{scanResult.breakdown.motorcycles}</p><p className="text-[var(--subtle)]">Motorcycles</p></div>
                      <div><p className={`font-bold text-[var(--text)]`}>{scanResult.breakdown.bicycles}</p><p className="text-[var(--subtle)]">Bicycles</p></div>
                      <div><p className={`font-bold text-[var(--text)]`}>{scanResult.breakdown.others}</p><p className="text-[var(--subtle)]">Other Vehicles</p></div>
                    </div>
                  )}

                  {scanResult.violations?.length === 0 ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                      <p className="text-green-400 font-semibold">✓ No violations detected</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {scanResult.violations.map((v, i) => (
                        <div key={i} className={`rounded-lg p-4 flex items-start justify-between gap-3 bg-[var(--bg)] border border-[var(--border)]`}>
                          <div>
                            <p className={`font-semibold text-sm text-[var(--text)]`}>{v.type}</p>
                            <p className="text-xs text-[var(--subtle)] mt-0.5">Location: {v.location}</p>
                            <p className="text-xs text-[var(--subtle)]">Confidence: {(v.confidence * 100).toFixed(0)}%</p>
                          </div>
                          <SeverityBadge level={v.severity} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Violations;