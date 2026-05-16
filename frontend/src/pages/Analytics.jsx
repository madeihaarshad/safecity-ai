import React, { useState, useRef, useEffect } from 'react';
import { predictRisk, detectFrame, fetchCameraStats } from '../api/api';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import {
  Brain, Sparkles, RefreshCcw, Camera, Upload,
  Video, VideoOff, Aperture, AlertCircle, Zap, MapPin, Navigation, LocateFixed, X,
  Activity, Car, PersonStanding, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const RiskBadge = ({ level }) => {
  const { theme } = useTheme();
  const colours = { High: 'text-red-400', Moderate: 'text-yellow-400', Low: 'text-green-400' };
  return <span className={`font-bold text-2xl ${colours[level] ?? 'text-[var(--text)]'}`}>{level}</span>;
};

const CongestionBadge = ({ level }) => {
  const map = {
    High: 'bg-red-500/20 text-red-400',
    Moderate: 'bg-yellow-500/20 text-yellow-400',
    Low: 'bg-green-500/20 text-green-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[level] ?? 'bg-[var(--card)] text-[var(--subtle)]'}`}>
      {level}
    </span>
  );
};

const RiskGauge = ({ score }) => {
  const { theme } = useTheme();
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  const angle = (normalizedScore / 100) * 180 - 90;
  const color = normalizedScore < 40 ? '#22c55e' : normalizedScore < 70 ? '#eab308' : '#ef4444';
  const cx = 120, cy = 140, r = 80;

  const startAngle = -90;
  const endAngle = startAngle + (normalizedScore / 100) * 180;
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = normalizedScore > 50 ? 1 : 0;
  const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;

  const isDark = theme === 'dark';

  return (
    <svg width="240" height="280" viewBox="0 0 240 280" className="mx-auto">
      {/* Background arc */}
      <path d={`M ${cx + r * Math.cos(((-90) * Math.PI) / 180)} ${cy + r * Math.sin(((-90) * Math.PI) / 180)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos((90 * Math.PI) / 180)} ${cy + r * Math.sin((90 * Math.PI) / 180)}`} stroke="var(--border)" strokeWidth="8" fill="none" />
      {/* Progress arc */}
      <path d={pathData} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Center circle */}
      <circle cx={cx} cy={cy} r="40" fill="var(--surface)" stroke={color} strokeWidth="2" />
      <text x={cx} y={cy + 8} fontSize="32" fontWeight="900" fill="var(--text)" textAnchor="middle" dominantBaseline="middle">
        {normalizedScore.toFixed(0)}
      </text>
      <text x={cx} y={cy + 30} fontSize="12" fill="var(--subtle)" textAnchor="middle">
        Risk Score
      </text>
    </svg>
  );
};

const Analytics = () => {
  const { theme } = useTheme();
  // ── Risk predictor ──────────────────────────────────────
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [formData, setFormData] = useState({
    hour: 12,
    weather: 'Clear',
    congestion: 'Free Flow',
    speed_avg: 60,
    incident_count: 0,
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState(null);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const fileInputRef = useRef(null);

  // ── Webcam ──────────────────────────────────────────────
  const [camMode, setCamMode] = useState(false);   // webcam panel open
  const [camReady, setCamReady] = useState(false);   // stream active
  const [camError, setCamError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  // ── Live camera stats polling ───────────────────────────
  const [camStats, setCamStats] = useState(null);
  const [cameraLocation, setCameraLocation] = useState({
    lat: 33.6844, lng: 73.0479,
    address: 'Faisal Avenue, Islamabad, Pakistan'
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const locationInputRef = useRef(null);
  const pollRef = useRef(null);

  // ── Health check + poll ─────────────────────────────────
  useEffect(() => {
    const pollCam = async () => {
      try { const res = await fetchCameraStats(); setCamStats(res.data); } catch { }
    };
    pollCam();
    pollRef.current = setInterval(pollCam, 4000);
    return () => {
      clearInterval(pollRef.current);
      stopWebcam();
    };
  }, []);

  // ── Webcam helpers ──────────────────────────────────────
  const startWebcam = async () => {
    setCamError(null);
    setCamMode(true);
    setCamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      // wait for panel to render before assigning
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCamReady(true);
          };
        }
      }, 100);
    } catch (err) {
      setCamError('Camera access denied. Please allow camera permissions in your browser.');
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

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        const address = data.results[0]?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setCameraLocation({ lat, lng, address });
      } catch (err) {
        console.error("Geocoding failed", err);
      }
    }, (err) => {
      console.warn("Geolocation denied or failed", err);
    });
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Get preview URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedImage(dataUrl);
    setImageBase64(dataUrl.split(',')[1]);
    setDetection(null);
    setAnnotatedFrame(null);

    // Attempt to get location
    fetchCurrentLocation();

    // Stop webcam after capture
    stopWebcam();
  };

  // ── File upload ─────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImage(URL.createObjectURL(file));
    setDetection(null);
    setAnnotatedFrame(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImageBase64(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);

    // Attempt to get location
    fetchCurrentLocation();
  };

  // ── Run YOLO ────────────────────────────────────────────
  const runDetection = async () => {
    if (!imageBase64) return;
    setDetecting(true);
    setDetection(null);
    setAnnotatedFrame(null);
    try {
      const res = await detectFrame(imageBase64);
      setDetection(res.data);
      if (res.data.annotated_frame)
        setAnnotatedFrame(`data:image/jpeg;base64,${res.data.annotated_frame}`);
    } catch {
      setDetection({ status: 'error', message: 'Detection failed — is the AI engine running?' });
    } finally {
      setDetecting(false);
    }
  };

  // ── Risk prediction ─────────────────────────────────────
  const runPrediction = async (e) => {
    e.preventDefault();
    setLoadingRisk(true);
    try {
      const payload = {
        hour: formData.hour,
        weather: formData.weather,
        congestion: formData.congestion,
        speed_avg: formData.speed_avg,
        incident_count: formData.incident_count
      };
      const res = await predictRisk(payload);
      setPrediction(res.data);
    } catch (err) {
      setPrediction({ risk_score: 65, level: 'High', breakdown: {}, recommendation: 'Unable to reach AI engine' });
    } finally {
      setTimeout(() => setLoadingRisk(false), 600);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'AI Analytics' }]} />
      <SectionHeader title="AI Analytics" subtitle="YOLO vision detection · Predictive risk modelling · Live camera stats" />

      {/* ── Row 1: Risk predictor ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input form */}
        <div className={`p-6 rounded-xl border bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[var(--accent)]/20 rounded-lg flex items-center justify-center text-[var(--accent)]">
              <Brain size={20} />
            </div>
            <h3 className={`text-lg font-bold text-[var(--text)]`}>Risk Prediction</h3>
          </div>

          <form onSubmit={runPrediction} className="space-y-4">
            {/* Hour slider */}
            <div>
              <label className="text-xs uppercase font-bold text-[var(--subtle)] block mb-2">Current Hour: {formData.hour}</label>
              <input
                type="range"
                min="0"
                max="23"
                value={formData.hour}
                onChange={(e) => setFormData({ ...formData, hour: parseInt(e.target.value) })}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--accent)] bg-[var(--card)]`}
              />
              <div className="flex justify-between text-xs text-[var(--subtle)] mt-1"><span>00:00</span><span>23:00</span></div>
            </div>

            {/* Weather dropdown */}
            <div>
              <label className="text-xs uppercase font-bold text-[var(--subtle)] block mb-2">Weather</label>
              <select
                value={formData.weather}
                onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] bg-[var(--card)] border-[var(--border)] text-[var(--text)]`}
              >
                <option>Clear</option>
                <option>Rain</option>
                <option>Fog</option>
                <option>Storm</option>
              </select>
            </div>

            {/* Congestion dropdown */}
            <div>
              <label className="text-xs uppercase font-bold text-[var(--subtle)] block mb-2">Congestion</label>
              <select
                value={formData.congestion}
                onChange={(e) => setFormData({ ...formData, congestion: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] bg-[var(--card)] border-[var(--border)] text-[var(--text)]`}
              >
                <option>Free Flow</option>
                <option>Light</option>
                <option>Moderate</option>
                <option>Severe</option>
              </select>
            </div>

            {/* Average Speed */}
            <div>
              <label className="text-xs uppercase font-bold text-[var(--subtle)] block mb-2">Avg Speed (km/h)</label>
              <input
                type="number"
                value={formData.speed_avg}
                onChange={(e) => setFormData({ ...formData, speed_avg: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] bg-[var(--card)] border-[var(--border)] text-[var(--text)]`}
                min="0"
                max="200"
              />
            </div>

            {/* Incident Count */}
            <div>
              <label className="text-xs uppercase font-bold text-[var(--subtle)] block mb-2">Incident Count</label>
              <input
                type="number"
                value={formData.incident_count}
                onChange={(e) => setFormData({ ...formData, incident_count: parseInt(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] bg-[var(--card)] border-[var(--border)] text-[var(--text)]`}
                min="0"
                max="50"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loadingRisk}
              className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-lg accent-glow"
            >
              {loadingRisk ? <RefreshCcw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loadingRisk ? 'Analyzing...' : 'Predict Risk'}
            </button>
          </form>
        </div>

        {/* Results display */}
        <div className={`lg:col-span-2 p-8 rounded-xl border bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
          {!prediction && !loadingRisk && (
            <div className="h-full flex flex-col items-center justify-center text-[var(--subtle)]">
              <Brain size={48} className="mb-3 opacity-30" />
              <p className="italic">Configure parameters and click "Predict Risk" to start analysis</p>
            </div>
          )}

          {loadingRisk && (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--subtle)]">Processing parameters…</p>
            </div>
          )}

          {prediction && !loadingRisk && (
            <div className="space-y-6">
              {/* Gauge */}
              <div className="flex justify-center">
                <RiskGauge score={typeof prediction.risk_score === 'number' ? prediction.risk_score : (prediction.risk_score * 100)} />
              </div>

              {/* Risk level */}
              <div className="text-center">
                <p className="text-[var(--subtle)] text-sm uppercase font-bold mb-2">Risk Level</p>
                <p className={`text-3xl font-black ${prediction.level === 'Low' ? 'text-green-400' :
                    prediction.level === 'Moderate' ? 'text-yellow-400' :
                      prediction.level === 'High' ? 'text-orange-400' : 'text-red-500'
                  }`}>
                  {prediction.level}
                </p>
              </div>

              {/* Breakdown table */}
              {prediction.breakdown && Object.keys(prediction.breakdown).length > 0 && (
                <div className={`rounded-lg p-4 bg-[var(--bg)] border border-[var(--border)]`}>
                  <p className="text-xs uppercase font-bold text-[var(--subtle)] mb-3">Risk Breakdown</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(prediction.breakdown).map(([key, value]) => (
                        <tr key={key} className={`border-b last:border-b-0 border-[var(--border)]`}>
                          <td className="py-2 text-[var(--subtle)] capitalize">{key.replace(/_/g, ' ')}</td>
                          <td className={`py-2 text-right font-semibold text-[var(--text)]`}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recommendation */}
              {prediction.recommendation && (
                <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4 flex gap-3">
                  <AlertCircle size={20} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase font-bold text-[var(--accent)] mb-1">Recommendation</p>
                    <p className="text-sm text-[var(--subtle)]">{prediction.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: YOLO Frame Detection ── */}
      <div className={`p-6 rounded-xl border bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
        <div className="flex items-center gap-3 mb-6">
          <Camera size={22} className="text-[var(--accent)]" />
          <div>
            <h3 className={`font-bold text-[var(--text)]`}>YOLOv8 Frame Detection</h3>
            <p className="text-[var(--subtle)] text-sm">Upload a traffic image or capture live from your camera</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: input methods */}
          <div className="space-y-4">

            {/* Source buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { stopWebcam(); fileInputRef.current?.click(); }}
                className={`flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-colors bg-[var(--card)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]`}
              >
                <Upload size={18} /> Upload Image
              </button>
              <button
                onClick={camMode ? stopWebcam : startWebcam}
                className={`flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-colors ${camMode
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-[var(--accent)]/20 border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)]/30'
                  }`}
              >
                {camMode ? <><VideoOff size={18} /> Stop Camera</> : <><Video size={18} /> Live Camera</>}
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* Camera error */}
            {camError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {camError}
              </div>
            )}

            {/* Live webcam feed */}
            {camMode && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden bg-black border border-[var(--border)]">
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full rounded-xl"
                    style={{ maxHeight: '220px', objectFit: 'cover' }}
                  />
                  {!camReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-[var(--subtle)]">Starting camera…</p>
                      </div>
                    </div>
                  )}
                  {/* Live indicator */}
                  {camReady && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-white font-semibold">LIVE</span>
                    </div>
                  )}
                </div>
                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={captureFrame}
                  disabled={!camReady}
                  className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                >
                  <Aperture size={18} /> Capture Frame
                </button>
              </div>
            )}

            {/* Captured / uploaded preview */}
            {!camMode && selectedImage && (
              <img src={selectedImage} alt="Selected" className="rounded-lg w-full object-cover max-h-48 border border-[var(--border)]" />
            )}

            {/* Run YOLO button */}
            {!camMode && selectedImage && (
              <button onClick={runDetection} disabled={detecting}
                className="w-full py-3 bg-[var(--accent)] text-[var(--bg)] font-bold rounded-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg accent-glow">
                {detecting
                  ? <><RefreshCcw className="animate-spin" size={18} /> Running YOLO…</>
                  : <><Activity size={18} /> Detect with YOLOv8</>}
              </button>
            )}

            {/* Upload drop zone when nothing selected and cam off */}
            {!camMode && !selectedImage && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <Upload size={32} className="mx-auto mb-3 text-[var(--subtle)]" />
                <p className="text-[var(--subtle)] text-sm">Or click here to upload an image</p>
              </div>
            )}
          </div>

          {/* Right: annotated result */}
          <div className="space-y-4">
            {!detection && !detecting && (
              <div className="h-full min-h-[200px] flex items-center justify-center text-[var(--subtle)] italic text-sm border border-[var(--border)] rounded-xl">
                Annotated frame will appear here
              </div>
            )}
            {detecting && (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3 border border-[var(--border)] rounded-xl">
                <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--subtle)] text-sm">YOLOv8 inference running…</p>
              </div>
            )}
            {detection && !detecting && (
              <div className="space-y-4">
                {/* Camera Location Pill */}
                <div className="flex justify-between items-center">
                  <div
                    onClick={() => setShowLocationModal(true)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95 bg-[var(--card)] border-[var(--border)] text-[var(--subtle)]`}>
                    <MapPin size={12} className="text-[var(--accent)]" />
                    <span className="text-[10px] font-bold truncate max-w-[180px] uppercase tracking-wider">{cameraLocation.address}</span>
                    <RefreshCcw size={10} className="text-[var(--subtle)]" />
                  </div>
                </div>

                {annotatedFrame && (
                  <img src={annotatedFrame} alt="YOLO annotated"
                    className="rounded-xl w-full border border-[var(--accent)]/40 shadow-lg shadow-[var(--accent)]/10" />
                )}
                {detection.status === 'error' ? (
                  <p className="text-red-400 text-sm">{detection.message}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className={`rounded-lg p-3 bg-[var(--card)]`}>
                        <Car size={20} className="mx-auto mb-1 text-[var(--accent)]" />
                        <p className={`text-2xl font-black text-[var(--text)]`}>{detection.vehicle_count}</p>
                        <p className="text-xs text-[var(--subtle)]">Vehicles</p>
                      </div>
                      <div className={`rounded-lg p-3 bg-[var(--card)]`}>
                        <PersonStanding size={20} className="mx-auto mb-1 text-blue-400" />
                        <p className={`text-2xl font-black text-[var(--text)]`}>{detection.pedestrian_count}</p>
                        <p className="text-xs text-[var(--subtle)]">Pedestrians</p>
                      </div>
                      <div className={`rounded-lg p-3 bg-[var(--card)]`}>
                        <AlertTriangle size={20} className="mx-auto mb-1 text-yellow-400" />
                        <p className={`text-2xl font-black text-[var(--text)]`}>{detection.violations?.length ?? 0}</p>
                        <p className="text-xs text-[var(--subtle)]">Violations</p>
                      </div>
                    </div>

                    {/* Vehicle breakdown */}
                    {detection.breakdown && (
                      <div className={`rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs bg-[var(--card)]`}>
                        <div><p className={`font-bold text-[var(--text)]`}>{detection.breakdown.motorcycles}</p><p className="text-[var(--subtle)]">Motorcycles</p></div>
                        <div><p className={`font-bold text-[var(--text)]`}>{detection.breakdown.bicycles}</p><p className="text-[var(--subtle)]">Bicycles</p></div>
                        <div><p className={`font-bold text-[var(--text)]`}>{detection.breakdown.cars ?? 0}</p><p className="text-[var(--subtle)]">Cars</p></div>
                      </div>
                    )}

                    <div className={`rounded-lg p-4 space-y-4 bg-[var(--bg)] border border-[var(--border)]`}>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[var(--subtle)]">Congestion Level</span>
                        <CongestionBadge level={detection.congestion_level} />
                      </div>

                      {detection.violations?.length > 0 && (
                        <div className={`space-y-1 pt-2 border-t border-[var(--border)]`}>
                          <p className="text-xs text-[var(--subtle)] uppercase font-bold">Violations</p>
                          {detection.violations.map((v, i) => <p key={i} className="text-xs text-red-400">⚠ {v}</p>)}
                        </div>
                      )}

                      {detection.detections?.length > 0 && (
                        <div className={`space-y-3 pt-2 border-t border-[var(--border)]`}>
                          <p className="text-xs text-[var(--subtle)] uppercase font-bold">Detections ({detection.detections.length})</p>
                          <div className="space-y-2">
                            {detection.detections.map((d, i) => (
                              <div key={i} className={`flex items-center justify-between p-2 rounded-lg border bg-[var(--surface)] border-[var(--border)]`}>
                                <div className="flex flex-col">
                                  <span className={`text-xs font-bold text-[var(--text)]`}>{d.label}</span>
                                  <span className="text-[10px] text-[var(--subtle)] truncate max-w-[200px]">{cameraLocation.address}</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-[var(--accent)]">{(d.confidence * 100).toFixed(0)}% CONF</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Live Camera Stats ── */}
      <div className={`p-6 rounded-xl border bg-[var(--surface)] border-[var(--border)] shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-[var(--accent)]" />
            <div>
              <h3 className={`font-bold text-[var(--text)]`}>Live Camera Stats</h3>
              <p className="text-[var(--subtle)] text-sm">Aggregated from last processed frame — refreshes every 4s</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Live
          </div>
        </div>
        {!camStats ? (
          <p className="text-[var(--subtle)] italic text-sm">No frames processed yet — upload or capture an image above</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`rounded-lg p-4 text-center bg-[var(--card)]`}>
              <p className={`text-3xl font-black text-[var(--text)]`}>{camStats.vehicle_count}</p>
              <p className="text-xs text-[var(--subtle)] mt-1">Vehicles</p>
            </div>
            <div className={`rounded-lg p-4 text-center bg-[var(--card)]`}>
              <p className={`text-3xl font-black text-[var(--text)]`}>{camStats.pedestrian_count}</p>
              <p className="text-xs text-[var(--subtle)] mt-1">Pedestrians</p>
            </div>
            <div className={`rounded-lg p-4 text-center bg-[var(--card)]`}>
              <CongestionBadge level={camStats.congestion_level} />
              <p className="text-xs text-[var(--subtle)] mt-2">Congestion</p>
            </div>
            <div className={`rounded-lg p-4 text-center bg-[var(--card)]`}>
              <p className={`text-3xl font-black text-[var(--text)]`}>{camStats.frames_processed}</p>
              <p className="text-xs text-[var(--subtle)] mt-1">Frames Processed</p>
            </div>
            <div className={`rounded-lg p-4 col-span-2 md:col-span-4 flex items-center justify-between bg-[var(--card)]`}>
              <span className="text-[var(--subtle)] text-sm">Scene Risk Score</span>
              <div className="flex items-center gap-3">
                <div className={`w-48 h-2 rounded-full overflow-hidden bg-[var(--surface)]`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${camStats.scene_risk_score > 0.7 ? 'bg-red-500' :
                        camStats.scene_risk_score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    style={{ width: `${camStats.scene_risk_score * 100}%` }}
                  />
                </div>
                <span className={`font-bold text-sm text-[var(--text)]`}>{(camStats.scene_risk_score * 100).toFixed(0)}%</span>
              </div>
            </div>
            {camStats.active_violations?.length > 0 && (
              <div className="col-span-2 md:col-span-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs text-red-400 font-bold uppercase mb-1">Active Violations</p>
                {camStats.active_violations.map((v, i) => <p key={i} className="text-xs text-red-300">⚠ {v}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Location Selection Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border bg-[var(--surface)] border-[var(--border)]`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-lg font-bold flex items-center gap-2 text-[var(--text)]`}>
                  <Navigation size={20} className="text-[var(--accent)]" /> Set Camera Location
                </h3>
                <button onClick={() => setShowLocationModal(false)} className="text-[var(--subtle)] hover:text-[var(--accent)] transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-[var(--subtle)]">Enter a street address or landmark to pinpoint where this detection took place.</p>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" />
                  <input
                    ref={(el) => {
                      if (el && !locationInputRef.current) {
                        locationInputRef.current = el;
                        const autocomplete = new window.google.maps.places.Autocomplete(el, {
                          componentRestrictions: { country: 'PK' },
                          fields: ['geometry', 'formatted_address']
                        });
                        autocomplete.addListener('place_changed', () => {
                          const place = autocomplete.getPlace();
                          if (place.geometry) {
                            setCameraLocation({
                              lat: place.geometry.location.lat(),
                              lng: place.geometry.location.lng(),
                              address: place.formatted_address
                            });
                            setShowLocationModal(false);
                          }
                        });
                      }
                    }}
                    type="text"
                    placeholder="Search location in Pakistan..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 bg-[var(--card)] border-[var(--border)] text-[var(--text)] placeholder-[var(--subtle)]`}
                  />
                </div>

                <button
                  onClick={() => { fetchCurrentLocation(); setShowLocationModal(false); }}
                  className="w-full py-3 bg-[var(--bg)] hover:bg-[var(--card)] text-[var(--text)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border border-[var(--border)]"
                >
                  <LocateFixed size={16} /> Use Current Geolocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;