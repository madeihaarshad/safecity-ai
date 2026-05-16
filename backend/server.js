const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const OTPAuth = require("otpauth");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  } 
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || "safecity_super_secret_key_2024";

// ================= MONGODB MODELS =================

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  vehicleType: { type: String, default: "car" },
  password: { type: String, required: true },
  status: { type: String, enum: ["Active", "Suspended", "Offline"], default: "Active" },
  safetyScore: { type: Number, default: 100, min: 0, max: 100 },
  violationCount: { type: Number, default: 0 },
  totalFines: { type: Number, default: 0 },
  pendingFines: { type: Number, default: 0 },
  lastLocation: { lat: { type: Number, default: null }, lng: { type: Number, default: null } },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },
  twoFactorBackupCodes: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },
  twoFactorBackupCodes: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const violationSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  driverLicense: { type: String, default: "Unknown" },
  driverName: { type: String, default: "Unknown Driver" },
  location: { type: String, required: true },
  speed: { type: Number, default: 0 },
  speedLimit: { type: Number, default: 60 },
  type: { type: String, required: true },
  severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
  confidence: { type: Number, default: 0 },
  echallanNumber: { type: String, unique: true, sparse: true },
  fineAmount: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  paidAt: { type: Date },
  paymentMethod: { type: String, enum: ["cash", "card", "online", null], default: null },
  notes: { type: String },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const alertSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  driverName: { type: String },
  location: { type: String },
  message: { type: String, required: true },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  resolved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const sensorSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  status: { type: String, enum: ["Online", "Offline", "Maintenance"], default: "Online" },
  lastReading: {
    value: { type: Number, default: 0 },
    unit: { type: String, default: "km/h" },
    riskTier: { type: String, enum: ["safe", "low", "medium", "high"], default: "safe" },
    timestamp: { type: Date, default: Date.now }
  }
});

const Driver = mongoose.model("Driver", driverSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Violation = mongoose.model("Violation", violationSchema);
const Alert = mongoose.model("Alert", alertSchema);
const Sensor = mongoose.model("Sensor", sensorSchema);

// ================= HELPER FUNCTIONS =================

function generateEChallanNumber() {
  const prefix = 'ECH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function calculateFine(violationType, severity, speed = null, speedLimit = null) {
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
  const sev = severity?.toLowerCase();
  if (sev === 'high') return fineMap.high;
  if (sev === 'medium') return fineMap.medium;
  return fineMap.low;
}

// ================= MONGODB CONNECTION =================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://username:password@cluster.mongodb.net/safecity";

mongoose.connect(MONGO_URI)
.then(async () => {
  console.log("✅ MongoDB Connected");
  const adminExists = await Admin.findOne({ email: "admin@safecity.com" });
  if (!adminExists) {
    const defaultAdmin = new Admin({
      email: "admin@safecity.com",
      password: bcrypt.hashSync("admin123", 10),
      name: "Super Admin",
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: []
    });
    await defaultAdmin.save();
    console.log("✅ Default admin created");
  }
})
.catch(err => console.error("❌ MongoDB Error:", err));

// ================= SOCKET.IO =================
io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
});

// ================= AUTH MIDDLEWARE =================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ================= ADMIN LOGIN (with 2FA) =================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Admin login attempt:", email);
    
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const isValid = bcrypt.compareSync(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // CHECK IF 2FA IS ENABLED
    if (admin.twoFactorEnabled) {
      console.log("2FA enabled for admin, requiring verification");
      return res.json({ 
        requires2FA: true,
        userId: admin._id,
        email: admin.email
      });
    }
    
    const token = jwt.sign({ userId: admin._id, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ 
      token, 
      user: { 
        id: admin._id, 
        email: admin.email, 
        name: admin.name 
      } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ================= ADMIN 2FA VERIFICATION =================
app.post("/api/auth/verify-2fa", async (req, res) => {
  try {
    const { userId, code, backupCode } = req.body;
    
    const admin = await Admin.findById(userId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    if (!admin.twoFactorEnabled) return res.status(400).json({ message: "2FA not enabled" });
    
    let isValid = false;
    
    if (backupCode) {
      isValid = admin.twoFactorBackupCodes.includes(backupCode);
      if (isValid) {
        admin.twoFactorBackupCodes = admin.twoFactorBackupCodes.filter(c => c !== backupCode);
        await admin.save();
      }
    } else if (code && admin.twoFactorSecret) {
      const totp = new OTPAuth.TOTP({
        issuer: 'SafeCity AI',
        label: admin.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: admin.twoFactorSecret
      });
      const delta = totp.validate({ token: code, window: 10 });
      isValid = delta !== null;
      console.log(`2FA validation: code=${code}, delta=${delta}, isValid=${isValid}`);
    }
    
    if (isValid) {
      const token = jwt.sign({ userId: admin._id, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ success: true, token, user: { id: admin._id, email: admin.email, name: admin.name } });
    } else {
      res.status(401).json({ message: "Invalid 2FA code" });
    }
  } catch (error) {
    console.error("2FA verification error:", error);
    res.status(500).json({ message: "2FA verification failed", error: error.message });
  }
});

// ================= DRIVER LOGIN (with 2FA) =================
app.post("/api/drivers/login", async (req, res) => {
  try {
    const { licenseNumber, password } = req.body;
    console.log("Driver login attempt:", licenseNumber);
    
    const driver = await Driver.findOne({ licenseNumber });
    if (!driver) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    const isValid = bcrypt.compareSync(password, driver.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // CHECK IF 2FA IS ENABLED
    if (driver.twoFactorEnabled) {
      console.log("2FA enabled for driver, requiring verification");
      return res.json({ 
        requires2FA: true,
        userId: driver._id,
        licenseNumber: driver.licenseNumber
      });
    }
    
    driver.status = "Active";
    await driver.save();
    
    const token = jwt.sign({ userId: driver._id, role: "driver" }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ 
      token, 
      driver: { 
        id: driver._id, 
        name: driver.name, 
        licenseNumber: driver.licenseNumber,
        email: driver.email,
        phone: driver.phone,
        vehicleNumber: driver.vehicleNumber,
        vehicleType: driver.vehicleType,
        safetyScore: driver.safetyScore,
        status: driver.status
      } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ================= DRIVER 2FA VERIFICATION =================
app.post("/api/drivers/verify-2fa", async (req, res) => {
  try {
    const { userId, code, backupCode } = req.body;
    
    const driver = await Driver.findById(userId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    if (!driver.twoFactorEnabled) return res.status(400).json({ message: "2FA not enabled" });
    
    let isValid = false;
    
    if (backupCode) {
      isValid = driver.twoFactorBackupCodes.includes(backupCode);
      if (isValid) {
        driver.twoFactorBackupCodes = driver.twoFactorBackupCodes.filter(c => c !== backupCode);
        await driver.save();
      }
    } else if (code && driver.twoFactorSecret) {
      const totp = new OTPAuth.TOTP({
        issuer: 'SafeCity AI',
        label: driver.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: driver.twoFactorSecret
      });
      const delta = totp.validate({ token: code, window: 10 });
      isValid = delta !== null;
      console.log(`Driver 2FA validation: code=${code}, delta=${delta}, isValid=${isValid}`);
    }
    
    if (isValid) {
      const token = jwt.sign({ userId: driver._id, role: "driver" }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ success: true, token, driver: { id: driver._id, name: driver.name, licenseNumber: driver.licenseNumber } });
    } else {
      res.status(401).json({ message: "Invalid 2FA code" });
    }
  } catch (error) {
    console.error("Driver 2FA verification error:", error);
    res.status(500).json({ message: "2FA verification failed", error: error.message });
  }
});

// ================= AUTH PROFILE =================
app.get("/api/auth/profile", verifyToken, async (req, res) => {
  try {
    if (req.role !== "admin") return res.status(403).json({ message: "Access denied" });
    const admin = await Admin.findById(req.userId).select('-password');
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json({ id: admin._id, email: admin.email, name: admin.name, twoFactorEnabled: admin.twoFactorEnabled || false });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ================= 2FA ENABLE/DISABLE =================
app.post("/api/auth/enable-2fa", verifyToken, async (req, res) => {
  try {
    const { secret, backupCodes } = req.body;
    const admin = await Admin.findById(req.userId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    admin.twoFactorEnabled = true;
    admin.twoFactorSecret = secret;
    admin.twoFactorBackupCodes = backupCodes;
    await admin.save();
    res.json({ success: true, message: "2FA enabled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to enable 2FA", error: error.message });
  }
});

app.post("/api/auth/disable-2fa", verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = null;
    admin.twoFactorBackupCodes = [];
    await admin.save();
    res.json({ success: true, message: "2FA disabled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to disable 2FA", error: error.message });
  }
});

app.get("/api/auth/2fa-status", verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select('twoFactorEnabled');
    res.json({ enabled: admin?.twoFactorEnabled || false });
  } catch (error) {
    res.status(500).json({ message: "Failed to get 2FA status" });
  }
});

// ================= DRIVER REGISTER =================
app.post("/api/drivers/register", async (req, res) => {
  try {
    const { name, licenseNumber, email, phone, vehicleNumber, vehicleType, password } = req.body;
    const existingDriver = await Driver.findOne({ $or: [{ email }, { licenseNumber }] });
    if (existingDriver) return res.status(400).json({ message: "Driver already exists" });
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newDriver = new Driver({ name, licenseNumber, email, phone, vehicleNumber, vehicleType: vehicleType || "car", password: hashedPassword });
    await newDriver.save();
    const token = jwt.sign({ userId: newDriver._id, role: "driver" }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, driver: { id: newDriver._id, name: newDriver.name, licenseNumber: newDriver.licenseNumber, email: newDriver.email, phone: newDriver.phone, vehicleNumber: newDriver.vehicleNumber, vehicleType: newDriver.vehicleType, safetyScore: newDriver.safetyScore } });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.get("/api/drivers/profile", verifyToken, async (req, res) => {
  try {
    if (req.role !== "driver") return res.status(403).json({ message: "Access denied" });
    const driver = await Driver.findById(req.userId).select("-password");
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ================= DRIVER SCORE API =================
app.get("/api/drivers/:id/score", async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    const driverViolations = await Violation.find({ driverId: req.params.id });
    const breakdown = { high: driverViolations.filter(v => v.severity === "high").length, medium: driverViolations.filter(v => v.severity === "medium").length, low: driverViolations.filter(v => v.severity === "low").length };
    res.json({ driverId: driver._id, name: driver.name, safetyScore: driver.safetyScore, violationCount: driverViolations.length, totalFines: driver.totalFines, pendingFines: driver.pendingFines, breakdown });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= DRIVERS LIST API =================
app.get("/api/drivers", async (req, res) => {
  try {
    const drivers = await Driver.find().select("-password").sort({ createdAt: -1 });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= VIOLATIONS API =================
app.get("/api/violations", async (req, res) => {
  try {
    const violations = await Violation.find().sort({ createdAt: -1 });
    res.json(violations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/violations", async (req, res) => {
  try {
    console.log("📝 Received violation:", JSON.stringify(req.body, null, 2));
    const { location, type, severity, confidence, speed, speedLimit, notes } = req.body;
    if (!location) return res.status(400).json({ error: "Location is required" });
    if (!type) return res.status(400).json({ error: "Violation type is required" });
    const finalSeverity = severity?.toLowerCase() === 'high' ? 'high' : severity?.toLowerCase() === 'medium' ? 'medium' : 'low';
    const finalSpeed = Number(speed) || Math.floor(Math.random() * 80) + 40;
    const finalSpeedLimit = Number(speedLimit) || 60;
    const fineAmount = calculateFine(type, finalSeverity, finalSpeed, finalSpeedLimit);
    const echallanNumber = generateEChallanNumber();
    const violation = new Violation({ driverId: null, driverLicense: "Unknown", driverName: "Unknown Driver", location, speed: finalSpeed, speedLimit: finalSpeedLimit, type, severity: finalSeverity, confidence: Number(confidence) || 0.95, echallanNumber, fineAmount, paid: false, notes: notes || `Auto-detected by YOLO AI`, createdAt: new Date() });
    await violation.save();
    console.log("✅ Violation saved with E-challan:", echallanNumber);
    io.emit("newViolation", violation);
    res.status(201).json(violation);
  } catch (err) {
    console.error("❌ Violation save error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ================= STATS API =================
app.get("/api/stats", async (req, res) => {
  try {
    const violations = await Violation.find();
    const drivers = await Driver.find();
    res.json({ violations: { total: violations.length, high: violations.filter(v => v.severity === "high").length, medium: violations.filter(v => v.severity === "medium").length, low: violations.filter(v => v.severity === "low").length }, alerts: { total: 0, unresolved: 0, critical: 0 }, sensors: { total: 3, online: 3, offline: 0 }, drivers: { total: drivers.length, highRisk: drivers.filter(d => d.safetyScore < 50).length }, lastUpdated: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= AI ANALYTICS API =================
app.get("/api/ai-analytics", async (req, res) => {
  res.json({ riskScore: 25, level: "SAFE", alertsCount: 0, violationsCount: 0, sensorsCount: 3, timestamp: new Date().toISOString() });
});

// ================= SENSORS API =================
app.get("/api/sensors", async (req, res) => {
  const sensors = [ { sensorId: "S1", location: "Committee Chowk", lat: 33.6, lng: 73.0, status: "Online", lastReading: { value: 65, unit: "km/h", riskTier: "medium" } }, { sensorId: "S2", location: "Faizabad", lat: 33.7, lng: 73.1, status: "Online", lastReading: { value: 45, unit: "km/h", riskTier: "safe" } }, { sensorId: "S3", location: "Saddar", lat: 33.58, lng: 73.05, status: "Online", lastReading: { value: 85, unit: "km/h", riskTier: "high" } } ];
  res.json(sensors);
});

// ================= ALERTS API =================
app.get("/api/alerts", async (req, res) => {
  res.json([]);
});

// ================= WEATHER API =================
app.get("/api/weather", async (req, res) => {
  res.json({ city: "Islamabad", temp: 28, feels_like: 30, humidity: 65, wind_speed: 12, condition: "Clear", description: "clear sky" });
});

// ================= EARTHQUAKES API =================
app.get("/api/earthquakes", async (req, res) => {
  res.json([]);
});

// ================= HEALTH API =================
app.get("/health", (req, res) => {
  res.json({ status: "healthy", db: "MongoDB", uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 2FA: Enabled with time tolerance (±5 minutes)\n`);
});