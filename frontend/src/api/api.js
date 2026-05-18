import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`,
});
const AI = axios.create({
  baseURL: import.meta.env.VITE_AI_ENGINE_URL || "http://localhost:5001",
});

// Add request interceptor for token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('driverToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for better error logging
API.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

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
export const getDriverById = (id) => API.get(`/drivers/${id}`);
export const getDriverScore = (id) => API.get(`/drivers/${id}/score`);
export const updateDriverStatus = (id, status) => API.patch(`/drivers/${id}/status`, { status });

// ===================== VIOLATIONS =====================
export const fetchViolations = () => API.get("/violations");
export const fetchViolationsByDriver = (driverId) => API.get(`/violations/driver/${driverId}`);
export const saveViolation = (violationData) => {
  console.log('📝 Saving violation to backend:', JSON.stringify(violationData, null, 2));
  return API.post("/violations", violationData);
};
export const deleteViolation = (id) => API.delete(`/violations/${id}`);
export const updateViolationStatus = (id, paid) => API.patch(`/violations/${id}/status`, { paid });

// ===================== E-CHALLANS =====================
export const fetchEChallans = () => API.get("/echallans");
export const fetchEChallanByNumber = (challanNumber) => API.get(`/echallans/${challanNumber}`);
export const updateEChallanStatus = (id, paid) => API.patch(`/echallans/${id}`, { paid });
export const getEChallanStats = () => API.get("/echallans/stats/summary");

// ===================== AI ENGINE =====================
export const predictRisk = (payload) => AI.post("/predict-risk", payload);
export const detectFrame = (imageBase64) => AI.post("/detect-frame", { image: imageBase64 });
export const detectViolations = (imageBase64) => {
  console.log('🤖 Sending to AI engine for detection...');
  return AI.post("/detect-violations", { image: imageBase64 });
};
export const fetchCameraStats = () => AI.get("/camera-stats");
export const fetchAIHealth = () => AI.get("/health");

// ===================== SENSORS =====================
export const fetchSensors = () => API.get("/sensors");

// ===================== AI ANALYTICS =====================
export const fetchAIAnalytics = () => API.get("/ai-analytics");

// ===================== AUTH =====================
export const adminLogin = (credentials) => API.post("/auth/login", credentials);
export const verify2FA = (data) => API.post("/auth/verify-2fa", data);
export const enable2FA = (data) => API.post("/auth/enable-2fa", data);
export const disable2FA = () => API.post("/auth/disable-2fa");
export const get2FAStatus = () => API.get("/auth/2fa-status");
export const getProfile = () => API.get("/auth/profile");

// ===================== DRIVER AUTH =====================
export const driverRegister = (data) => API.post("/drivers/register", data);
export const driverLogin = (data) => API.post("/drivers/login", data);
export const driverVerify2FA = (data) => API.post("/drivers/verify-2fa", data);
export const getDriverProfile = () => API.get("/drivers/profile");
