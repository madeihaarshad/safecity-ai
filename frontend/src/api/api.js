import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

const AI = axios.create({
  baseURL: "http://localhost:5001",
});

// ===================== STATS =====================
export const fetchStats = () => API.get("/stats");

// ===================== ALERTS =====================
export const fetchAlerts = () => API.get("/alerts");

// ===================== WEATHER =====================
export const fetchWeather = () => API.get("/weather");

// ===================== EARTHQUAKES =====================
export const fetchEarthquakes = () => API.get("/earthquakes");

// ===================== DRIVERS =====================
export const fetchDrivers = () => API.get("/drivers");

// ===================== VIOLATIONS =====================
export const fetchViolations = () => API.get("/violations");

// ===================== AI ENGINE =====================
export const predictRisk = (payload) => AI.post("/predict-risk", payload);
export const detectFrame = (imageBase64) => AI.post("/detect-frame", { image: imageBase64 });
export const detectViolations = (imageBase64) => AI.post("/detect-violations", { image: imageBase64 });
export const fetchCameraStats = () => AI.get("/camera-stats");
export const fetchAIHealth = () => AI.get("/health");