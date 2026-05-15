import React, { useState, useRef, useEffect } from 'react';
import { predictRisk, detectFrame, fetchCameraStats, fetchAIHealth } from '../api/api';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import {
  Brain, Sparkles, RefreshCcw, Camera, Upload,
  Activity, Car, PersonStanding, AlertTriangle,
  Wifi, WifiOff, Video, VideoOff, Aperture, AlertCircle, Zap
} from 'lucide-react';

const RiskBadge = ({ level }) => {
  const colours = { High: 'text-red-400', Moderate: 'text-yellow-400', Low: 'text-green-400' };
  return <span className={`font-bold text-2xl ${colours[level] ?? 'text-white'}`}>{level}</span>;
};

const CongestionBadge = ({ level }) => {
  const map = {
    High:     'bg-red-500/20 text-red-400',
    Moderate: 'bg-yellow-500/20 text-yellow-400',
    Low:      'bg-green-500/20 text-green-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[level] ?? 'bg-slate-700 text-slate-300'}`}>
      {level}
    </span>
  );
};

const RiskGauge = ({ score }) => {
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

  return (
    <svg width="240" height="280" viewBox="0 0 240 280" className="mx-auto">
      {/* Background arc */}
      <path d={`M ${cx + r * Math.cos(((-90) * Math.PI) / 180)} ${cy + r * Math.sin(((-90) * Math.PI) / 180)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos((90 * Math.PI) / 180)} ${cy + r * Math.sin((90 * Math.PI) / 180)}`} stroke="#334155" strokeWidth="8" fill="none" />
      {/* Progress arc */}
      <path d={pathData} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Center circle */}
      <circle cx={cx} cy={cy} r="40" fill="#1e293b" stroke={color} strokeWidth="2" />
      <text x={cx} y={cy + 8} fontSize="32" fontWeight="900" fill="white" textAnchor="middle" dominantBaseline="middle">
        {normalizedScore.toFixed(0)}
      </text>
      <text x={cx} y={cy + 30} fontSize="12" fill="#94a3b8" textAnchor="middle">
        Risk Score
      </text>
    </svg>
  );
};

const Analytics = () => {
  // ── Risk predictor ──────────────────────────────────────
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [prediction, setPrediction]   = useState(null);
  const [formData, setFormData] = useState({
    hour: 12,
    weather: 'Clear',
    congestion: 'Light',
    speed_avg: 60,
    incident_count: 0
  });

  // ── Image detection ─────────────────────────────────────
  const [selectedImage, setSelectedImage]   = useState(null);
  const [imageBase64, setImageBase64]       = useState(null);
  const [detecting, setDetecting]           = useState(false);
  const [detection, setDetection]           = useState(null);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const fileInputRef                        = useRef(null);

  // ── Webcam ──────────────────────────────────────────────
  const [camMode, setCamMode]         = useState(false);   // webcam panel open
  const [camReady, setCamReady]       = useState(false);   // stream active
  const [camError, setCamError]       = useState(null);
  const videoRef                      = useRef(null);
  const streamRef                     = useRef(null);
  const canvasRef                     = useRef(null);

  // ── Live camera stats polling ───────────────────────────
  const [camStats, setCamStats]   = useState(null);
  const [aiOnline, setAiOnline]   = useState(null);
  const pollRef                   = useRef(null);

  // ── Health check + poll ─────────────────────────────────
  useEffect(() => {
    const checkHealth = async () => {
      try { await fetchAIHealth(); setAiOnline(true); }
      catch { setAiOnline(false); }
    };
    checkHealth();

    const pollCam = async () => {
      try { const res = await fetchCameraStats(); setCamStats(res.data); } catch {}
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

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Get preview URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedImage(dataUrl);
    setImageBase64(dataUrl.split(',')[1]);
    setDetection(null);
    setAnnotatedFrame(null);

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

      {/* Status bar */}
      <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border text-sm w-fit ${
        aiOnline === true  ? 'border-green-500/40 bg-green-500/10 text-green-400' :
        aiOnline === false ? 'border-red-500/40 bg-red-500/10 text-red-400' :
                             'border-slate-700 bg-slate-800 text-slate-400'
      }`}>
        {aiOnline === true  ? <Wifi size={16} />    :
         aiOnline === false ? <WifiOff size={16} /> :
                              <RefreshCcw size={16} className="animate-spin" />}
        {aiOnline === true  ? 'AI Engine Online — Flask :5001 ✓' :
         aiOnline === false ? 'AI Engine Offline — start Flask on :5001' :
                              'Checking AI Engine…'}
      </div>

      {/* ── Row 1: Risk predictor ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input form */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center text-accent">
              <Brain size={20} />
            </div>
            <h3 className="text-lg font-bold">Risk Prediction</h3>
          </div>
          
          <form onSubmit={runPrediction} className="space-y-4">
            {/* Hour slider */}
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 block mb-2">Current Hour: {formData.hour}</label>
              <input
                type="range"
                min="0"
                max="23"
                value={formData.hour}
                onChange={(e) => setFormData({ ...formData, hour: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1"><span>00:00</span><span>23:00</span></div>
            </div>

            {/* Weather dropdown */}
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 block mb-2">Weather</label>
              <select
                value={formData.weather}
                onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-accent"
              >
                <option>Clear</option>
                <option>Rain</option>
                <option>Fog</option>
                <option>Storm</option>
              </select>
            </div>

            {/* Congestion dropdown */}
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 block mb-2">Congestion</label>
              <select
                value={formData.congestion}
                onChange={(e) => setFormData({ ...formData, congestion: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-accent"
              >
                <option>Free Flow</option>
                <option>Light</option>
                <option>Moderate</option>
                <option>Severe</option>
              </select>
            </div>

            {/* Average Speed */}
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 block mb-2">Avg Speed (km/h)</label>
              <input
                type="number"
                value={formData.speed_avg}
                onChange={(e) => setFormData({ ...formData, speed_avg: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-accent"
                min="0"
                max="200"
              />
            </div>

            {/* Incident Count */}
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 block mb-2">Incident Count</label>
              <input
                type="number"
                value={formData.incident_count}
                onChange={(e) => setFormData({ ...formData, incident_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-accent"
                min="0"
                max="50"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loadingRisk}
              className="w-full py-3 bg-accent text-dark font-bold rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loadingRisk ? <RefreshCcw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loadingRisk ? 'Analyzing...' : 'Predict Risk'}
            </button>
          </form>
        </div>

        {/* Results display */}
        <div className="lg:col-span-2 bg-slate-800 p-8 rounded-xl border border-slate-700">
          {!prediction && !loadingRisk && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <Brain size={48} className="mb-3 opacity-30" />
              <p className="italic">Configure parameters and click "Predict Risk" to start analysis</p>
            </div>
          )}
          
          {loadingRisk && (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Processing parameters…</p>
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
                <p className="text-slate-400 text-sm uppercase font-bold mb-2">Risk Level</p>
                <p className={`text-3xl font-black ${
                  prediction.level === 'Low' ? 'text-green-400' :
                  prediction.level === 'Moderate' ? 'text-yellow-400' :
                  prediction.level === 'High' ? 'text-orange-400' : 'text-red-500'
                }`}>
                  {prediction.level}
                </p>
              </div>

              {/* Breakdown table */}
              {prediction.breakdown && Object.keys(prediction.breakdown).length > 0 && (
                <div className="bg-slate-900 rounded-lg p-4">
                  <p className="text-xs uppercase font-bold text-slate-400 mb-3">Risk Breakdown</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(prediction.breakdown).map(([key, value]) => (
                        <tr key={key} className="border-b border-slate-700 last:border-b-0">
                          <td className="py-2 text-slate-400 capitalize">{key.replace(/_/g, ' ')}</td>
                          <td className="py-2 text-right text-white font-semibold">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recommendation */}
              {prediction.recommendation && (
                <div className="bg-blue-500/10 border border-blue-500/40 rounded-lg p-4 flex gap-3">
                  <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase font-bold text-blue-400 mb-1">Recommendation</p>
                    <p className="text-sm text-blue-300">{prediction.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: YOLO Frame Detection ── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Camera size={22} className="text-accent" />
          <div>
            <h3 className="text-lg font-bold">YOLOv8 Frame Detection</h3>
            <p className="text-slate-400 text-sm">Upload a traffic image or capture live from your camera</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: input methods */}
          <div className="space-y-4">

            {/* Source buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { stopWebcam(); fileInputRef.current?.click(); }}
                className="flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl text-sm font-semibold transition-colors"
              >
                <Upload size={18} /> Upload Image
              </button>
              <button
                onClick={camMode ? stopWebcam : startWebcam}
                className={`flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-colors ${
                  camMode
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                    : 'bg-accent/20 border-accent/50 text-accent hover:bg-accent/30'
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
                <div className="relative rounded-xl overflow-hidden bg-black border border-slate-600">
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full rounded-xl"
                    style={{ maxHeight: '220px', objectFit: 'cover' }}
                  />
                  {!camReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-400">Starting camera…</p>
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
                  className="w-full py-3 bg-accent text-dark font-bold rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Aperture size={18} /> Capture Frame
                </button>
              </div>
            )}

            {/* Captured / uploaded preview */}
            {!camMode && selectedImage && (
              <img src={selectedImage} alt="Selected" className="rounded-lg w-full object-cover max-h-48 border border-slate-600" />
            )}

            {/* Run YOLO button */}
            {!camMode && selectedImage && (
              <button onClick={runDetection} disabled={detecting}
                className="w-full py-3 bg-accent text-dark font-bold rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2">
                {detecting
                  ? <><RefreshCcw className="animate-spin" size={18} /> Running YOLO…</>
                  : <><Activity size={18} /> Detect with YOLOv8</>}
              </button>
            )}

            {/* Upload drop zone when nothing selected and cam off */}
            {!camMode && !selectedImage && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 hover:border-accent rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <Upload size={32} className="mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400 text-sm">Or click here to upload an image</p>
              </div>
            )}
          </div>

          {/* Right: annotated result */}
          <div className="space-y-4">
            {!detection && !detecting && (
              <div className="h-full min-h-[200px] flex items-center justify-center text-slate-500 italic text-sm border border-slate-700 rounded-xl">
                Annotated frame will appear here
              </div>
            )}
            {detecting && (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3 border border-slate-700 rounded-xl">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">YOLOv8 inference running…</p>
              </div>
            )}
            {detection && !detecting && (
              <div className="space-y-4">
                {annotatedFrame && (
                  <img src={annotatedFrame} alt="YOLO annotated"
                    className="rounded-xl w-full border border-accent/40 shadow-lg shadow-accent/10" />
                )}
                {detection.status === 'error' ? (
                  <p className="text-red-400 text-sm">{detection.message}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-900 rounded-lg p-3">
                        <Car size={20} className="mx-auto mb-1 text-accent" />
                        <p className="text-2xl font-black text-white">{detection.vehicle_count}</p>
                        <p className="text-xs text-slate-400">Vehicles</p>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <PersonStanding size={20} className="mx-auto mb-1 text-blue-400" />
                        <p className="text-2xl font-black text-white">{detection.pedestrian_count}</p>
                        <p className="text-xs text-slate-400">Pedestrians</p>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-3">
                        <AlertTriangle size={20} className="mx-auto mb-1 text-yellow-400" />
                        <p className="text-2xl font-black text-white">{detection.violations?.length ?? 0}</p>
                        <p className="text-xs text-slate-400">Violations</p>
                      </div>
                    </div>

                    {/* Vehicle breakdown */}
                    {detection.breakdown && (
                      <div className="bg-slate-900 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div><p className="text-white font-bold">{detection.breakdown.motorcycles}</p><p className="text-slate-400">Motorcycles</p></div>
                        <div><p className="text-white font-bold">{detection.breakdown.bicycles}</p><p className="text-slate-400">Bicycles</p></div>
                        <div><p className="text-white font-bold">{detection.breakdown.cars ?? 0}</p><p className="text-slate-400">Cars</p></div>
                      </div>
                    )}

                    <div className="bg-slate-900 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Congestion Level</span>
                        <CongestionBadge level={detection.congestion_level} />
                      </div>
                      {detection.violations?.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-700">
                          <p className="text-xs text-slate-500 uppercase font-bold">Violations</p>
                          {detection.violations.map((v, i) => <p key={i} className="text-xs text-red-400">⚠ {v}</p>)}
                        </div>
                      )}
                      {detection.detections?.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-700">
                          <p className="text-xs text-slate-500 uppercase font-bold">All Objects ({detection.detections.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {detection.detections.map((d, i) => (
                              <span key={i} className="text-[10px] bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-slate-300">
                                {d.label} {(d.confidence * 100).toFixed(0)}%
                              </span>
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
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-accent" />
            <div>
              <h3 className="text-lg font-bold">Live Camera Stats</h3>
              <p className="text-slate-400 text-sm">Aggregated from last processed frame — refreshes every 4s</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Live
          </div>
        </div>
        {!camStats ? (
          <p className="text-slate-500 italic text-sm">No frames processed yet — upload or capture an image above</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <p className="text-3xl font-black text-white">{camStats.vehicle_count}</p>
              <p className="text-xs text-slate-400 mt-1">Vehicles</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <p className="text-3xl font-black text-white">{camStats.pedestrian_count}</p>
              <p className="text-xs text-slate-400 mt-1">Pedestrians</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <CongestionBadge level={camStats.congestion_level} />
              <p className="text-xs text-slate-400 mt-2">Congestion</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 text-center">
              <p className="text-3xl font-black text-white">{camStats.frames_processed}</p>
              <p className="text-xs text-slate-400 mt-1">Frames Processed</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 col-span-2 md:col-span-4 flex items-center justify-between">
              <span className="text-slate-400 text-sm">Scene Risk Score</span>
              <div className="flex items-center gap-3">
                <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      camStats.scene_risk_score > 0.7 ? 'bg-red-500' :
                      camStats.scene_risk_score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${camStats.scene_risk_score * 100}%` }}
                  />
                </div>
                <span className="text-white font-bold text-sm">{(camStats.scene_risk_score * 100).toFixed(0)}%</span>
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
    </div>
  );
};

export default Analytics;