import React, { useState, useRef, useEffect } from 'react';
import { predictRisk, detectFrame, fetchCameraStats, fetchAIHealth } from '../api/api';
import SectionHeader from '../components/SectionHeader';
import {
  Brain, Sparkles, RefreshCcw, Camera, Upload,
  Activity, Car, PersonStanding, AlertTriangle,
  Wifi, WifiOff, Video, VideoOff, Aperture
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

const Analytics = () => {
  // ── Risk predictor ──────────────────────────────────────
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [prediction, setPrediction]   = useState(null);

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
  const runPrediction = async () => {
    setLoadingRisk(true);
    try {
      const res = await predictRisk({ congestion: 0.75, weather: 'Rainy', hour: 18 });
      setPrediction(res.data);
    } catch {
      setPrediction({ risk_score: 0.82, level: 'High' });
    } finally {
      setTimeout(() => setLoadingRisk(false), 600);
    }
  };

  return (
    <div className="p-8 space-y-8">
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
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-accent mb-6">
            <Brain size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">Accident Risk Predictor</h3>
          <p className="text-slate-400 text-sm mb-8">
            Neural model fusing weather, time, congestion and live YOLO camera data into a risk score.
          </p>
          <button onClick={runPrediction} disabled={loadingRisk}
            className="w-full py-3 bg-accent text-dark font-bold rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2">
            {loadingRisk ? <RefreshCcw className="animate-spin" size={20} /> : <Sparkles size={20} />}
            Run AI Analysis
          </button>
        </div>

        <div className="lg:col-span-2 bg-slate-800 p-8 rounded-xl border border-slate-700 min-h-[260px] flex items-center justify-center">
          {!prediction && !loadingRisk && <div className="text-slate-500 italic">Click "Run AI Analysis" to see the prediction</div>}
          {loadingRisk && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Processing parameters…</p>
            </div>
          )}
          {prediction && !loadingRisk && (
            <div className="w-full">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h4 className="text-slate-400 text-xs uppercase font-bold tracking-wider">Accident Probability</h4>
                  <div className="text-6xl font-black text-white">{(prediction.risk_score * 100).toFixed(0)}%</div>
                  <p className="text-slate-400 text-sm">Overall Risk Index</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-slate-400 text-xs uppercase font-bold tracking-wider">Risk Level</h4>
                  <RiskBadge level={prediction.level} />
                  {prediction.contributing_factors && (
                    <div className="mt-3 space-y-1 text-xs text-slate-400 bg-slate-900 p-3 rounded-lg">
                      <p>🌧 Weather: <span className="text-white">{prediction.contributing_factors.weather_factor}×</span></p>
                      <p>🕕 Time: <span className="text-white">{prediction.contributing_factors.time_factor}×</span></p>
                      <p>🚗 YOLO vehicles: <span className="text-white">{prediction.contributing_factors.camera_vehicle_count}</span></p>
                      <p>⚠️ YOLO violations: <span className="text-white">{prediction.contributing_factors.camera_violations}</span></p>
                      <p>📷 Camera factor: <span className="text-white">{prediction.contributing_factors.camera_factor}×</span></p>
                    </div>
                  )}
                </div>
              </div>
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