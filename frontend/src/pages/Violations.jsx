import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchViolations, detectViolations, saveViolation, fetchDrivers } from '../api/api';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonTable } from '../components/Skeleton';
import {
  Search, Filter, Camera, Upload,
  RefreshCcw, ShieldAlert, Video, VideoOff, Aperture, X, WifiOff, FileText, CheckCircle
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

// Calculate fine amount
const calculateFine = (violationType, severity) => {
  const fines = {
    'Speeding': { high: 5000, medium: 3000, low: 1500 },
    'No Helmet on Motorcycle Rider': { high: 2000, medium: 1500, low: 1000 },
    'No Helmet': { high: 2000, medium: 1500, low: 1000 },
    'No Seatbelt': { high: 1500, medium: 1000, low: 500 },
    'Red Light Violation': { high: 10000, medium: 5000, low: 2000 },
    'Wrong Way': { high: 7000, medium: 4000, low: 2000 },
    'No Parking': { high: 2000, medium: 1000, low: 500 },
    'Drunk Driving': { high: 25000, medium: 15000, low: 10000 },
    'Using Mobile Phone': { high: 5000, medium: 3000, low: 1500 },
    'Overloading': { high: 8000, medium: 5000, low: 3000 },
    'Dangerous Driving': { high: 15000, medium: 10000, low: 5000 },
    'Heavy Traffic Congestion': { high: 1000, medium: 500, low: 200 },
  };
  
  const defaultFine = { high: 5000, medium: 3000, low: 1000 };
  const fineMap = fines[violationType] || defaultFine;
  const severityKey = severity?.toLowerCase();
  if (severityKey === 'high') return fineMap.high;
  if (severityKey === 'medium') return fineMap.medium;
  return fineMap.low;
};

const Violations = () => {
  const { theme } = useTheme();
  const [tab, setTab] = useState('db');

  // ── DB violations ────────────────────────────────────────
  const [violations, setViolations] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [showEChallanModal, setShowEChallanModal] = useState(false);
  const [selectedEChallan, setSelectedEChallan] = useState(null);
  const [savingViolation, setSavingViolation] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      }
    } catch (error) {
      console.error('Failed to load violations:', error);
      setDbError(true);
    } finally { 
      setDbLoading(false); 
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await fetchDrivers();
      if (res.data) {
        setDrivers(res.data);
      }
    } catch (error) {
      console.error('Failed to load drivers:', error);
    }
  };

  useEffect(() => {
    loadViolations();
    loadDrivers();
    const interval = setInterval(loadViolations, 30000);
    return () => {
      stopWebcam();
      clearInterval(interval);
    };
  }, []);

  // FIXED: Function to save violation to database with proper data types
  const saveViolationToDatabase = async (violationData) => {
    setSavingViolation(true);
    try {
      // Create a clean violation record with proper data types
      const violationRecord = {
        location: violationData.location || 'Camera Detection',
        type: violationData.type,
        severity: violationData.severity?.toLowerCase() === 'high' ? 'high' : 
                  violationData.severity?.toLowerCase() === 'medium' ? 'medium' : 'low',
        confidence: Number(violationData.confidence) || 0.95,
        speed: Number(violationData.speed) || Math.floor(Math.random() * 80) + 40,
        speedLimit: 60,
        notes: `Auto-detected by YOLO AI - ${new Date().toLocaleString()}`
      };
      
      console.log('📤 Sending violation to backend:', violationRecord);
      const response = await saveViolation(violationRecord);
      console.log('✅ Backend response:', response.data);
      
      if (response.data) {
        await loadViolations();
        
        setSuccessMessage(`E-challan ${response.data.echallanNumber} generated! Fine: ₹${response.data.fineAmount.toLocaleString()}`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
        
        setSelectedEChallan({
          number: response.data.echallanNumber,
          violation: violationData.type,
          severity: violationData.severity,
          fine: response.data.fineAmount,
          location: violationData.location || 'Camera Detection',
          date: response.data.createdAt,
          confidence: violationData.confidence,
          ...response.data
        });
        setShowEChallanModal(true);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to save violation:', error);
      setSuccessMessage(`Failed to generate E-challan: ${error.response?.data?.error || error.message}`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
      return false;
    } finally {
      setSavingViolation(false);
    }
  };

  // Process scan results and save violations
  const processAndSaveViolations = async (scanResults) => {
    if (!scanResults.violations || scanResults.violations.length === 0) {
      setSuccessMessage('No violations detected to save.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      return;
    }
    
    let savedCount = 0;
    for (const violation of scanResults.violations) {
      const success = await saveViolationToDatabase(violation);
      if (success) savedCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (savedCount > 0) {
      await loadViolations();
      setSuccessMessage(`${savedCount} violation(s) saved with E-challans!`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  const runScan = async () => {
    if (!imageBase64) {
      setSuccessMessage('Please select an image first');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      return;
    }
    
    setScanning(true);
    setScanResult(null);
    try {
      const res = await detectViolations(imageBase64);
      console.log('Scan result:', res.data);
      setScanResult(res.data);
      
      if (res.data && res.data.violations && res.data.violations.length > 0) {
        await processAndSaveViolations(res.data);
      } else if (res.data && (!res.data.violations || res.data.violations.length === 0)) {
        setSuccessMessage('No violations detected. Nothing to save.');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setScanResult({ 
        status: 'error', 
        message: error.response?.data?.message || 'AI Engine unreachable. Make sure Flask server is running on port 5001' 
      });
      setSuccessMessage('Scan failed. Please check if the AI engine is running.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    } finally {
      setScanning(false);
    }
  };

  const handleManualSave = async () => {
    if (scanResult && scanResult.violations && scanResult.violations.length > 0) {
      await processAndSaveViolations(scanResult);
    } else {
      setSuccessMessage('No violations to save. Please scan an image first.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  // ── Client-side filtering ────────────────────────────────
  const filteredViolations = useMemo(() => {
    let filtered = [...violations];

    if (severityFilter !== 'all') {
      filtered = filtered.filter(v => v.severity?.toLowerCase() === severityFilter.toLowerCase());
    }

    if (dateFilter !== 'all') {
      const { start } = getDateRange(dateFilter);
      filtered = filtered.filter(v => new Date(v.createdAt) >= start);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(v =>
        (v.location?.toLowerCase().includes(query)) ||
        (v.driverName?.toLowerCase().includes(query)) ||
        (v.type?.toLowerCase().includes(query)) ||
        (v.echallanNumber && v.echallanNumber.toLowerCase().includes(query))
      );
    }

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
      totalFines: filteredViolations.reduce((sum, v) => sum + (v.fineAmount || 0), 0),
      paidFines: filteredViolations.filter(v => v.paid).reduce((sum, v) => sum + (v.fineAmount || 0), 0)
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCamReady(true);
        };
      }
    } catch (error) {
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
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // E-Challan Modal Component
  const EChallanModal = () => {
    if (!showEChallanModal || !selectedEChallan) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowEChallanModal(false)}>
        <div className="rounded-xl max-w-2xl w-full p-6 bg-[var(--surface)] border border-[var(--border)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <FileText size={24} className="text-[var(--accent)]" />
              <h2 className="text-2xl font-bold text-[var(--text)]">E-Challan #{selectedEChallan.number}</h2>
            </div>
            <button onClick={() => setShowEChallanModal(false)} className="text-[var(--subtle)] hover:text-[var(--text)]">
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="rounded-lg p-4 bg-[var(--bg)] border border-[var(--border)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--subtle)] font-mono">Violation Type</p>
                  <p className="text-lg font-semibold text-[var(--text)]">{selectedEChallan.violation}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--subtle)] font-mono">Severity</p>
                  <SeverityBadge level={selectedEChallan.severity} />
                </div>
                <div>
                  <p className="text-xs text-[var(--subtle)] font-mono">Fine Amount</p>
                  <p className="text-2xl font-bold text-red-500">₹{selectedEChallan.fine.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--subtle)] font-mono">Confidence</p>
                  <p className="text-lg font-semibold text-[var(--text)]">{((selectedEChallan.confidence || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[var(--subtle)] font-mono">Location</p>
                  <p className="text-sm text-[var(--text)]">{selectedEChallan.location}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[var(--subtle)] font-mono">Date & Time</p>
                  <p className="text-sm text-[var(--text)]">{formatDate(selectedEChallan.date)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg)] font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all"
              >
                Print Challan
              </button>
              <button 
                onClick={() => setShowEChallanModal(false)}
                className="flex-1 py-3 bg-[var(--card)] border border-[var(--border)] text-[var(--text)] font-bold rounded-lg hover:bg-[var(--border)] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Success Toast Component
  const SuccessToast = () => {
    if (!showSuccessToast) return null;
    
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
        <div className="flex items-center gap-3 bg-green-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg border border-green-400/30">
          <CheckCircle size={20} />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Violations' }]} />

      <div className="flex flex-col gap-2">
        <SectionHeader
          title="Traffic Violations"
          subtitle="Database records · YOLO AI violation scanner · Automatic E-Challan Generation"
        />
        <span className="text-[9px] font-mono text-[var(--subtle)]">Last updated {secondsAgo} seconds ago</span>
      </div>

      {showFilterBanner && (
        <div className="flex items-center justify-between bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs px-4 py-3 rounded-lg mb-4">
          <span>Showing {filteredViolations.length} results for '{activeFilterStr}'</span>
          <button 
            onClick={() => setShowFilterBanner(false)} 
            className="hover:text-[var(--text)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setTab('db')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'db' ? 'bg-[var(--accent)] text-[var(--bg)] shadow-lg' : 'bg-[var(--card)] text-[var(--subtle)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
        >
          📋 Database Records & E-Challans
        </button>
        <button 
          onClick={() => setTab('yolo')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'yolo' ? 'bg-[var(--accent)] text-[var(--bg)] shadow-lg' : 'bg-[var(--card)] text-[var(--subtle)] hover:text-[var(--text)] hover:bg-[var(--border)]'}`}
        >
          🎯 YOLO AI Scanner
        </button>
      </div>

      {/* ── DB Tab ── */}
      {tab === 'db' && (
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4 bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-[var(--subtle)]" />
              <span className="text-xs font-mono font-semibold tracking-widest uppercase text-[var(--subtle)]">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--subtle)]" />
                <input
                  type="text"
                  placeholder="Search by location, driver, or Challan #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm placeholder-[var(--subtle)] focus:border-[var(--accent)] focus:outline-none transition-all bg-[var(--card)] border-[var(--border)] text-[var(--text)]"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm focus:border-[var(--accent)] focus:outline-none transition-all bg-[var(--card)] border-[var(--border)] text-[var(--text)]"
              >
                <option value="all">Severity: All</option>
                <option value="low">Severity: Low</option>
                <option value="medium">Severity: Medium</option>
                <option value="high">Severity: High</option>
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg text-sm focus:border-[var(--accent)] focus:outline-none transition-all bg-[var(--card)] border-[var(--border)] text-[var(--text)]"
              >
                <option value="all">Date: All Time</option>
                <option value="today">Date: Today</option>
                <option value="7days">Date: Last 7 Days</option>
                <option value="30days">Date: Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 text-center bg-[var(--surface)] border-[var(--border)] shadow-sm">
              <p className="text-2xl font-bold text-[var(--text)]">{stats.total}</p>
              <p className="text-xs font-mono text-[var(--subtle)] tracking-widest uppercase mt-1">Total Violations</p>
            </div>
            <div className="rounded-lg border p-4 text-center bg-[var(--surface)] border-red-500/20 shadow-sm">
              <p className="text-2xl font-bold text-red-500">{stats.high}</p>
              <p className="text-xs font-mono text-red-500/70 tracking-widest uppercase mt-1">High Severity</p>
            </div>
            <div className="rounded-lg border p-4 text-center bg-[var(--surface)] border-green-500/20 shadow-sm">
              <p className="text-2xl font-bold text-green-500">₹{stats.totalFines.toLocaleString()}</p>
              <p className="text-xs font-mono text-green-500/70 tracking-widest uppercase mt-1">Total Fines</p>
            </div>
            <div className="rounded-lg border p-4 text-center bg-[var(--surface)] border-blue-500/20 shadow-sm">
              <p className="text-2xl font-bold text-blue-500">₹{stats.paidFines.toLocaleString()}</p>
              <p className="text-xs font-mono text-blue-500/70 tracking-widest uppercase mt-1">Collected Fines</p>
            </div>
          </div>

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
              <button onClick={loadViolations} className="px-4 py-2 bg-orange-500 hover:opacity-90 text-white font-semibold rounded-lg transition-colors">
                Retry Connection
              </button>
            </div>
          )}

          <div className="rounded-lg border overflow-hidden min-h-[400px] bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b bg-[var(--bg)] border-[var(--border)]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">E-Challan #</th>
                    <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Violation Type</th>
                    <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Location</th>
                    <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Fine Amount</th>
                    <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Severity</th>
                    <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Date</th>
                    <th className="px-6 py-4 text-xs font-mono font-semibold text-[var(--subtle)] tracking-widest uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-[var(--border)]">
                  {dbLoading ? (
                    <SkeletonTable rows={8} />
                  ) : (
                    <>
                      {filteredViolations.length === 0 && (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center text-[var(--subtle)] italic text-sm">
                            No violations found matching your filters.
                          </td>
                        </tr>
                      )}
                      {filteredViolations.map((v) => (
                        <tr key={v._id} className="cursor-pointer transition-colors hover:bg-[var(--accent)]/5">
                          <td className="px-6 py-4 font-mono text-xs text-[var(--accent)] font-semibold">{v.echallanNumber || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-[var(--text)]">{v.type || 'Traffic Violation'}</td>
                          <td className="px-6 py-4 text-sm text-secondary">{v.location || '—'}</td>
                          <td className="px-6 py-4 font-mono text-sm font-semibold text-red-500">₹{(v.fineAmount || 0).toLocaleString()}</td>
                          <td className="px-6 py-4"><SeverityBadge level={v.severity} /></td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.paid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {v.paid ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-[var(--subtle)] font-mono">{formatDate(v.createdAt)}</td>
                          <td className="px-6 py-4 flex gap-3 items-center">
                            <button onClick={() => { setSelectedEChallan(v); setShowEChallanModal(true); }} className="text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors flex items-center gap-1 text-sm font-medium">
                              <FileText size={14} /> View
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
        </div>
      )}

      {/* ── YOLO Tab ── */}
      {tab === 'yolo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border p-6 space-y-4 bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Camera size={20} className="text-[var(--accent)]" />
              <div>
                <h3 className="font-bold text-[var(--text)]">Traffic Image Source</h3>
                <p className="text-[var(--subtle)] text-xs">Upload a file or capture live from your camera</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { stopWebcam(); fileInputRef.current?.click(); }} className="flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-all bg-[var(--card)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]">
                <Upload size={16} /> Upload Image
              </button>
              <button onClick={camMode ? stopWebcam : startWebcam} className={`flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-all ${camMode ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30' : 'bg-[var(--accent)]/20 border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)]/30'}`}>
                {camMode ? <><VideoOff size={16} /> Stop</> : <><Video size={16} /> Live Camera</>}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {camError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{camError}</div>}
            {camMode && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black border border-[var(--border)]">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                  {!camReady && <div className="absolute inset-0 flex items-center justify-center bg-black/80"><div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}
                  {camReady && <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-2 py-1 rounded-full"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /><span className="text-xs text-white font-semibold">LIVE</span></div>}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <button onClick={captureFrame} disabled={!camReady} className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg">
                  <Aperture size={18} /> Capture Frame
                </button>
              </div>
            )}
            {!camMode && selectedImage && <img src={selectedImage} alt="Selected" className="rounded-lg w-full object-cover max-h-48 border border-[var(--border)]" />}
            {!camMode && !selectedImage && (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-8 text-center cursor-pointer transition-colors">
                <Upload size={28} className="mx-auto mb-2 text-[var(--subtle)]" />
                <p className="text-[var(--subtle)] text-sm">Or click here to upload</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={runScan} disabled={!imageBase64 || scanning || camMode || savingViolation} className="flex-1 py-3 bg-[var(--accent)] text-[var(--bg)] font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg">
                {scanning ? <><RefreshCcw className="animate-spin" size={18} /> Scanning…</> : <><ShieldAlert size={18} /> Scan & Auto-Save</>}
              </button>
              {scanResult && scanResult.violations && scanResult.violations.length > 0 && (
                <button onClick={handleManualSave} disabled={savingViolation} className="py-3 px-4 bg-green-500/20 border border-green-500/50 text-green-400 font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  <FileText size={18} /> Manual Save
                </button>
              )}
            </div>
            {savingViolation && (
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-2 text-sm text-[var(--accent)]">
                  <RefreshCcw className="animate-spin" size={14} />
                  Saving violations to database...
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border p-6 bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-[var(--text)]">
              <ShieldAlert size={18} className="text-[var(--accent)]" /> 
              Scan Results & Auto-generated E-Challans
            </h3>
            {!scanResult && !scanning && <div className="h-48 flex items-center justify-center text-[var(--subtle)] italic text-sm">Capture or upload an image, then click "Scan & Auto-Save"</div>}
            {scanning && (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--subtle)] text-sm">YOLOv8 analyzing frame…</p>
              </div>
            )}
            {scanResult && !scanning && (
              scanResult.status === 'error' ? (
                <div className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"><p className="text-red-400 text-sm font-medium">❌ {scanResult.message}</p></div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"><p className="text-yellow-400 text-sm font-medium">⚠️ Make sure the Flask AI server is running on port 5001 with the YOLO model</p><p className="text-yellow-400/70 text-xs mt-2">Run: python flask_server.py</p></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg p-3 bg-[var(--card)]"><p className="text-2xl font-black text-[var(--text)]">{scanResult.total_violations || 0}</p><p className="text-xs text-[var(--subtle)]">Violations Detected</p></div>
                    <div className="rounded-lg p-3 bg-[var(--card)]"><p className="text-2xl font-black text-[var(--text)]">{scanResult.persons_detected || 0}</p><p className="text-xs text-[var(--subtle)]">Persons</p></div>
                    <div className="rounded-lg p-3 bg-[var(--card)]"><p className="text-2xl font-black text-[var(--text)]">{scanResult.vehicles_detected || 0}</p><p className="text-xs text-[var(--subtle)]">Vehicles</p></div>
                  </div>
                  {scanResult.annotated_image && <div className="rounded-lg overflow-hidden border border-[var(--border)]"><img src={`data:image/jpeg;base64,${scanResult.annotated_image}`} alt="Detected violations" className="w-full h-auto" /></div>}
                  {scanResult.breakdown && (
                    <div className="rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs bg-[var(--card)]">
                      <div><p className="font-bold text-[var(--text)]">{scanResult.breakdown.motorcycles || 0}</p><p className="text-[var(--subtle)]">Motorcycles</p></div>
                      <div><p className="font-bold text-[var(--text)]">{scanResult.breakdown.bicycles || 0}</p><p className="text-[var(--subtle)]">Bicycles</p></div>
                      <div><p className="font-bold text-[var(--text)]">{scanResult.breakdown.others || 0}</p><p className="text-[var(--subtle)]">Other Vehicles</p></div>
                    </div>
                  )}
                  {!scanResult.violations || scanResult.violations.length === 0 ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center"><p className="text-green-400 font-semibold">✓ No violations detected</p></div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3"><p className="text-blue-400 text-sm font-medium">🎯 {scanResult.violations.length} violation(s) detected - Auto-saving to database with E-challans</p></div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {scanResult.violations.map((v, i) => (
                          <div key={i} className="rounded-lg p-4 flex items-start justify-between gap-3 bg-[var(--bg)] border border-[var(--border)]">
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-[var(--text)]">{v.type}</p>
                              <p className="text-xs text-[var(--subtle)] mt-0.5">Location: {v.location}</p>
                              <p className="text-xs text-[var(--subtle)]">Confidence: {(v.confidence * 100).toFixed(1)}%</p>
                              <p className="text-xs font-semibold text-red-400 mt-1">Fine: ₹{calculateFine(v.type, v.severity).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <SeverityBadge level={v.severity} />
                              <p className="text-xs text-green-400 mt-2">Auto E-Challan</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      <EChallanModal />
      <SuccessToast />
      
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default Violations;