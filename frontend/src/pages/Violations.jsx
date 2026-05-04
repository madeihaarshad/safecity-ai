import React, { useState, useEffect, useRef } from 'react';
import { fetchViolations, detectViolations } from '../api/api';
import SectionHeader from '../components/SectionHeader';
import {
  Search, Filter, ExternalLink, Camera, Upload,
  RefreshCcw, ShieldAlert, Video, VideoOff, Aperture
} from 'lucide-react';

const SeverityBadge = ({ level }) => {
  const map = {
    High:   'bg-red-500/20 text-red-400',
    Medium: 'bg-orange-500/20 text-orange-400',
    Low:    'bg-yellow-500/20 text-yellow-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${map[level] ?? 'bg-slate-700 text-slate-400'}`}>
      {level}
    </span>
  );
};

const Violations = () => {
  const [tab, setTab]               = useState('db');

  // ── DB violations ────────────────────────────────────────
  const [violations, setViolations] = useState([]);
  const [dbLoading, setDbLoading]   = useState(true);

  // ── YOLO scanner ─────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageBase64, setImageBase64]     = useState(null);
  const [scanning, setScanning]           = useState(false);
  const [scanResult, setScanResult]       = useState(null);
  const fileInputRef                      = useRef(null);

  // ── Webcam ───────────────────────────────────────────────
  const [camMode, setCamMode]   = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState(null);
  const videoRef                = useRef(null);
  const streamRef               = useRef(null);
  const canvasRef               = useRef(null);

  useEffect(() => {
    const load = async () => {
      try { const res = await fetchViolations(); setViolations(res.data); }
      catch {}
      finally { setDbLoading(false); }
    };
    load();
    return () => stopWebcam();
  }, []);

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
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
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
    <div className="p-8">
      <SectionHeader
        title="Traffic Violations"
        subtitle="Database records · YOLO AI violation scanner"
        actions={
          <div className="flex gap-2">
            <button className="p-2 bg-slate-800 rounded border border-slate-700 text-slate-400 hover:text-white"><Search size={18} /></button>
            <button className="p-2 bg-slate-800 rounded border border-slate-700 text-slate-400 hover:text-white"><Filter size={18} /></button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('db')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'db' ? 'bg-accent text-dark' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
          📋 Database Records
        </button>
        <button onClick={() => setTab('yolo')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'yolo' ? 'bg-accent text-dark' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
          🎯 YOLO AI Scanner
        </button>
      </div>

      {/* ── DB Tab ── */}
      {tab === 'db' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Violation Type</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Fine</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
              {dbLoading && <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Loading…</td></tr>}
              {!dbLoading && violations.map((v) => (
                <tr key={v._id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{v.driverId?.name || 'Unknown'}</td>
                  <td className="px-6 py-4">{v.type}</td>
                  <td className="px-6 py-4"><SeverityBadge level={v.severity} /></td>
                  <td className="px-6 py-4">${v.fineAmount}</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(v.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button className="text-accent hover:underline flex items-center gap-1">Details <ExternalLink size={12} /></button>
                  </td>
                </tr>
              ))}
              {!dbLoading && violations.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500 italic">No violation records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── YOLO Tab ── */}
      {tab === 'yolo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: input */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Camera size={20} className="text-accent" />
              <div>
                <h3 className="font-bold">Traffic Image Source</h3>
                <p className="text-slate-400 text-xs">Upload a file or capture live from your camera</p>
              </div>
            </div>

            {/* Source buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { stopWebcam(); fileInputRef.current?.click(); }}
                className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-sm font-semibold transition-colors"
              >
                <Upload size={16} /> Upload Image
              </button>
              <button
                onClick={camMode ? stopWebcam : startWebcam}
                className={`flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-colors ${
                  camMode
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-accent/20 border-accent/50 text-accent hover:bg-accent/30'
                }`}
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
                <div className="relative rounded-xl overflow-hidden bg-black border border-slate-600">
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full rounded-xl" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                  {!camReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
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
                <button onClick={captureFrame} disabled={!camReady}
                  className="w-full py-3 bg-accent text-dark font-bold rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Aperture size={18} /> Capture Frame
                </button>
              </div>
            )}

            {/* Preview */}
            {!camMode && selectedImage && (
              <img src={selectedImage} alt="Selected" className="rounded-lg w-full object-cover max-h-48 border border-slate-600" />
            )}

            {/* Drop zone */}
            {!camMode && !selectedImage && (
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 hover:border-accent rounded-xl p-8 text-center cursor-pointer transition-colors">
                <Upload size={28} className="mx-auto mb-2 text-slate-500" />
                <p className="text-slate-400 text-sm">Or click here to upload</p>
              </div>
            )}

            <button onClick={runScan} disabled={!imageBase64 || scanning || camMode}
              className="w-full py-3 bg-accent text-dark font-bold rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              {scanning
                ? <><RefreshCcw className="animate-spin" size={18} /> Scanning…</>
                : <><ShieldAlert size={18} /> Scan for Violations</>}
            </button>
          </div>

          {/* Right: results */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldAlert size={18} className="text-accent" /> Scan Results</h3>
            {!scanResult && !scanning && (
              <div className="h-48 flex items-center justify-center text-slate-500 italic text-sm">
                Capture or upload an image, then click Scan
              </div>
            )}
            {scanning && (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">YOLOv8 analysing frame…</p>
              </div>
            )}
            {scanResult && !scanning && (
              scanResult.status === 'error' ? (
                <p className="text-red-400 text-sm">{scanResult.message}</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-2xl font-black text-white">{scanResult.total_violations}</p>
                      <p className="text-xs text-slate-400">Violations</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-2xl font-black text-white">{scanResult.persons_detected}</p>
                      <p className="text-xs text-slate-400">Persons</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-2xl font-black text-white">{scanResult.vehicles_detected}</p>
                      <p className="text-xs text-slate-400">Vehicles</p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  {scanResult.breakdown && (
                    <div className="bg-slate-900 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div><p className="text-white font-bold">{scanResult.breakdown.motorcycles}</p><p className="text-slate-400">Motorcycles</p></div>
                      <div><p className="text-white font-bold">{scanResult.breakdown.bicycles}</p><p className="text-slate-400">Bicycles</p></div>
                      <div><p className="text-white font-bold">{scanResult.breakdown.others}</p><p className="text-slate-400">Other Vehicles</p></div>
                    </div>
                  )}

                  {scanResult.violations?.length === 0 ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                      <p className="text-green-400 font-semibold">✓ No violations detected</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {scanResult.violations.map((v, i) => (
                        <div key={i} className="bg-slate-900 rounded-lg p-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm text-white">{v.type}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Location: {v.location}</p>
                            <p className="text-xs text-slate-500">Confidence: {(v.confidence * 100).toFixed(0)}%</p>
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