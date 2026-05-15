import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import socket from "../socket";
import Breadcrumb from '../components/Breadcrumb';

// ─── Fix default marker icons ───────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Risk helpers ────────────────────────────────────────────────────────────
/**
 * speed (km/h) → risk tier
 *   0–60    → safe
 *   61–90   → medium
 *   91–110  → high
 *   >110    → critical
 */
const getRiskTier = (speed) => {
  if (!speed && speed !== 0) return "unknown";
  if (speed <= 60)  return "safe";
  if (speed <= 90)  return "medium";
  if (speed <= 110) return "high";
  return "critical";
};

const RISK_CONFIG = {
  safe:     { color: "#22c55e", fill: "#22c55e22", label: "Safe",     radius: 200,  pulse: false },
  medium:   { color: "#eab308", fill: "#eab30822", label: "Medium",   radius: 350,  pulse: false },
  high:     { color: "#f97316", fill: "#f9731622", label: "High Risk",radius: 500,  pulse: true  },
  critical: { color: "#ef4444", fill: "#ef444433", label: "Critical", radius: 700,  pulse: true  },
  unknown:  { color: "#64748b", fill: "#64748b22", label: "Unknown",  radius: 200,  pulse: false },
};

// ─── Custom animated icon ────────────────────────────────────────────────────
const buildIcon = (tier) => {
  const { color, pulse } = RISK_CONFIG[tier];
  const pulseCSS = pulse
    ? `@keyframes ping{0%{transform:scale(1);opacity:.8}70%{transform:scale(2);opacity:0}100%{transform:scale(1);opacity:0}}
       .pulse-ring{position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};animation:ping 1.4s cubic-bezier(0,0,.2,1) infinite;}`
    : "";
  const html = `
    <style>${pulseCSS}</style>
    <div style="position:relative;width:24px;height:24px;">
      ${pulse ? '<div class="pulse-ring"></div>' : ""}
      <div style="
        width:24px;height:24px;border-radius:50%;
        background:${color};border:2px solid #fff;
        box-shadow:0 0 8px ${color}88;
        display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:700;color:#fff;
      ">S</div>
    </div>`;
  return L.divIcon({ html, className: "", iconSize: [24, 24], iconAnchor: [12, 12] });
};

// ─── Incident markers (static demo data, swap with real API) ─────────────────
const INCIDENTS = [
  { id: "I1", lat: 33.705, lng: 73.062, type: "accident",    label: "Vehicle Collision",     color: "#ef4444" },
  { id: "I2", lat: 33.671, lng: 73.024, type: "roadblock",   label: "Road Blocked",          color: "#f97316" },
  { id: "I3", lat: 33.690, lng: 73.080, type: "flood",       label: "Flood Warning Zone",    color: "#3b82f6" },
  { id: "I4", lat: 33.652, lng: 73.048, type: "construction",label: "Construction Zone",     color: "#eab308" },
];

const incidentIcon = (color) =>
  L.divIcon({
    html: `<div style="
      width:20px;height:20px;border-radius:4px;
      background:${color};border:2px solid #fff;
      box-shadow:0 0 6px ${color}aa;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;color:#fff;font-weight:700;">!</div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

// ─── Heatmap overlay (pure Leaflet canvas) ───────────────────────────────────
const HeatmapLayer = ({ sensors }) => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) map.removeLayer(layerRef.current);

    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    sensors.forEach((s) => {
      const speed = s.lastReading?.value ?? 0;
      const tier = getRiskTier(speed);
      const point = map.latLngToContainerPoint([s.lat, s.lng]);
      const r = tier === "critical" ? 90 : tier === "high" ? 70 : tier === "medium" ? 50 : 30;
      const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, r);
      const alpha = tier === "critical" ? "55" : tier === "high" ? "40" : tier === "medium" ? "28" : "18";
      const baseColor = RISK_CONFIG[tier].color;
      grad.addColorStop(0, baseColor + alpha);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(point.x - r, point.y - r, r * 2, r * 2);
    });

    // We use a simple Leaflet imageOverlay approximating the map bounds
    // For production use leaflet-heat plugin for true heatmaps
    layerRef.current = null; // canvas heatmap is drawn on sensors change
    return () => {};
  }, [sensors, map]);

  return null;
};

// ─── Legend panel ─────────────────────────────────────────────────────────────
const Legend = ({ sensors }) => {
  const counts = { safe: 0, medium: 0, high: 0, critical: 0 };
  sensors.forEach((s) => {
    const t = getRiskTier(s.lastReading?.value ?? 0);
    if (counts[t] !== undefined) counts[t]++;
  });

  return (
    <div style={{
      position: "absolute", bottom: 32, left: 16, zIndex: 1000,
      background: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
      padding: "14px 18px", color: "#f1f5f9", fontFamily: "'JetBrains Mono',monospace",
      fontSize: 12, minWidth: 190,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: "#94a3b8", marginBottom: 10 }}>
        LIVE RISK ZONES
      </div>
      {Object.entries(RISK_CONFIG).filter(([k]) => k !== "unknown").map(([tier, cfg]) => (
        <div key={tier} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`,
          }} />
          <span style={{ flex: 1, color: "#cbd5e1" }}>{cfg.label}</span>
          <span style={{
            background: "rgba(255,255,255,0.08)", borderRadius: 6,
            padding: "1px 7px", color: cfg.color, fontWeight: 700,
          }}>{counts[tier] ?? 0}</span>
        </div>
      ))}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 10, paddingTop: 10 }}>
        <div style={{ color: "#94a3b8", fontSize: 10 }}>Speed thresholds</div>
        <div style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>
          ≤60 Safe · 61–90 Medium<br />91–110 High · &gt;110 Critical
        </div>
      </div>
    </div>
  );
};

// ─── Stats bar ────────────────────────────────────────────────────────────────
const StatsBar = ({ sensors }) => {
  const maxSpeed = Math.max(...sensors.map(s => s.lastReading?.value ?? 0), 0);
  const critCount = sensors.filter(s => getRiskTier(s.lastReading?.value ?? 0) === "critical").length;
  const avgSpeed = sensors.length
    ? Math.round(sensors.reduce((a, s) => a + (s.lastReading?.value ?? 0), 0) / sensors.length)
    : 0;

  const stats = [
    { label: "Active Sensors", value: sensors.length, color: "#38bdf8" },
    { label: "Max Speed", value: `${maxSpeed} km/h`, color: "#f97316" },
    { label: "Avg Speed", value: `${avgSpeed} km/h`, color: "#a78bfa" },
    { label: "Critical Zones", value: critCount, color: "#ef4444" },
  ];

  return (
    <div style={{
      position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 1000, display: "flex", gap: 10,
    }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          padding: "8px 14px", textAlign: "center",
          fontFamily: "'JetBrains Mono',monospace",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          <div style={{ color: s.color, fontWeight: 700, fontSize: 16 }}>{s.value}</div>
          <div style={{ color: "#64748b", fontSize: 9, letterSpacing: "0.08em", marginTop: 2 }}>
            {s.label.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const MapView = () => {
  const [sensors, setSensors] = useState([]);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const defaultPosition = [33.6844, 73.0479]; // Islamabad

  useEffect(() => {
    // Fetch initial sensor state from REST
    const fetchSensors = async () => {
      try {
        const res = await fetch("/api/sensors");
        const data = await res.json();
        setSensors(data);
      } catch (error) {
        console.error("Failed to fetch sensors:", error);
      }
    };

    // Fetch on mount
    fetchSensors();

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(fetchSensors, 10000);

    // Live updates via socket
    socket.on("sensorUpdate", (data) => {
      setSensors((prev) => {
        const filtered = prev.filter((s) => s.sensorId !== data.sensorId);
        return [...filtered, data];
      });
    });

    return () => {
      clearInterval(refreshInterval);
      socket.off("sensorUpdate");
    };
  }, []);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <div style={{ position: "absolute", top: 16, left: 16, zIndex: 1000 }}>
        <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Live Map' }]} />
      </div>
      {/* ── Top controls ── */}
      <div style={{
        position: "absolute", top: 16, right: 16, zIndex: 1000,
        display: "flex", gap: 8, flexDirection: "column",
      }}>
        {[
          { label: "Risk Zones",  state: showZones,     set: setShowZones },
          { label: "Incidents",   state: showIncidents, set: setShowIncidents },
        ].map(({ label, state, set }) => (
          <button key={label} onClick={() => set(!state)} style={{
            background: state ? "rgba(56,189,248,0.15)" : "rgba(15,23,42,0.85)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${state ? "#38bdf8" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 8, padding: "6px 14px",
            color: state ? "#38bdf8" : "#64748b",
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
            cursor: "pointer", fontWeight: 700, letterSpacing: "0.05em",
          }}>
            {state ? "✓ " : ""}{label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Stats bar ── */}
      <StatsBar sensors={sensors} />

      {/* ── Map ── */}
      <MapContainer center={defaultPosition} zoom={12} style={{ height: "100%", width: "100%" }}
        zoomControl={false}>
        {/* Dark map tiles for better contrast */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Heatmap canvas layer */}
        <HeatmapLayer sensors={sensors} />

        {/* ── Sensor markers + risk circles ── */}
        {sensors.map((sensor) => {
          const speed = sensor.lastReading?.value ?? 0;
          const tier = getRiskTier(speed);
          const cfg = RISK_CONFIG[tier];

          return (
            <React.Fragment key={sensor.sensorId}>
              {/* Outer ambient circle */}
              {showZones && (
                <Circle
                  center={[sensor.lat, sensor.lng]}
                  radius={cfg.radius * 2.5}
                  pathOptions={{ color: cfg.color, fillColor: cfg.fill, fillOpacity: 0.06, weight: 0 }}
                />
              )}
              {/* Inner risk zone circle */}
              {showZones && (
                <Circle
                  center={[sensor.lat, sensor.lng]}
                  radius={cfg.radius}
                  pathOptions={{ color: cfg.color, fillColor: cfg.fill, fillOpacity: 0.25, weight: 1.5, dashArray: tier === "safe" ? null : "6 4" }}
                />
              )}
              {/* Sensor marker */}
              <Marker
                position={[sensor.lat, sensor.lng]}
                icon={buildIcon(tier)}
              >
                <Popup>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                      📡 {sensor.location}
                    </div>
                    <div style={{ color: cfg.color, fontWeight: 700, fontSize: 16 }}>
                      {speed} km/h
                    </div>
                    <div style={{
                      display: "inline-block", background: cfg.color + "22",
                      color: cfg.color, borderRadius: 4, padding: "2px 8px",
                      fontSize: 11, fontWeight: 700, marginTop: 4,
                    }}>
                      {cfg.label.toUpperCase()}
                    </div>
                    <hr style={{ margin: "8px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />
                    <div style={{ color: "#64748b", fontSize: 10 }}>
                      Sensor ID: {sensor.sensorId}<br />
                      Status: {sensor.status ?? "Online"}<br />
                      Updated: {sensor.lastReading?.timestamp
                        ? new Date(sensor.lastReading.timestamp).toLocaleTimeString()
                        : "—"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* ── Incident markers ── */}
        {showIncidents && INCIDENTS.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.lat, inc.lng]}
            icon={incidentIcon(inc.color)}
          >
            <Popup>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: inc.color }}>{inc.label}</div>
                <div style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>
                  Type: {inc.type}<br />
                  Lat: {inc.lat}, Lng: {inc.lng}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ── Legend ── */}
        <div className="leaflet-bottom leaflet-left">
          <Legend sensors={sensors} />
        </div>
      </MapContainer>
    </div>
  );
};

export default MapView;