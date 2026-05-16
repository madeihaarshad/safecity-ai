const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
require("dotenv").config();

const Driver = require("./models/Driver");
const Violation = require("./models/Violation");
const Alert = require("./models/Alert");
const DisasterEvent = require("./models/DisasterEvent");
const Sensor = require("./models/Sensor");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// ================= STARTUP TRACKING =================
const serverStartTime = Date.now();

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    // Health check: Verify API key
    if (!process.env.OPENWEATHER_API_KEY) {
      console.warn("⚠️  WARNING: OPENWEATHER_API_KEY is missing from .env");
    }

    // Initialize sensors and log startup summary
    await initSensors();
    const sensorCount = await Sensor.countDocuments();
    console.log(`✅ DB Connected | Sensors: ${sensorCount} | Models loaded`);
  })
  .catch(err => console.log("DB Error:", err));

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// ================= AI RISK =================
function getRiskTier(speed) {
  if (speed <= 60) return { tier: "safe", color: "green" };
  if (speed <= 90) return { tier: "medium", color: "yellow" };
  if (speed <= 110) return { tier: "high", color: "orange" };
  return { tier: "critical", color: "red" };
}

// ================= SENSOR INIT =================
const sensorsList = [
  { sensorId: "S1", location: "Committee Chowk", lat: 33.6, lng: 73.0 },
  { sensorId: "S2", location: "Faizabad", lat: 33.7, lng: 73.1 },
  { sensorId: "S3", location: "Saddar", lat: 33.58, lng: 73.05 }
];

async function initSensors() {
  for (const s of sensorsList) {
    await Sensor.findOneAndUpdate(
      { sensorId: s.sensorId },
      { ...s, status: "Online" },
      { upsert: true }
    );
  }

  setInterval(async () => {
    for (const s of sensorsList) {

      const speed = Math.floor(Math.random() * 140);
      const { tier, color } = getRiskTier(speed);

      const sensor = await Sensor.findOneAndUpdate(
        { sensorId: s.sensorId },
        {
          ...s,
          status: "Online",
          lastReading: {
            value: speed,
            unit: "km/h",
            timestamp: new Date(),
            riskTier: tier,
            color
          }
        },
        { new: true }
      );

      io.emit("sensorUpdate", sensor);

      if (tier === "high" || tier === "critical") {
        const alert = await Alert.create({
          title: "AI Traffic Risk Alert",
          message: `High risk detected at ${s.location}`,
          category: "AI",
          priority: tier === "critical" ? "Critical" : "High",
          location: s.location
        });

        io.emit("newAlert", alert);
      }
    }
  }, 5000);
}

// ================= 📊 STATS API (COMPREHENSIVE) =================
app.get("/api/stats", async (req, res) => {
  try {
    // Run all DB queries in parallel
    const [violations, alerts, sensors, drivers] = await Promise.all([
      Violation.find(),
      Alert.find(),
      Sensor.find(),
      Driver.find()
    ]);

    // Violation stats
    const violationStats = {
      total: violations.length,
      high: violations.filter(v => v.severity === "high").length,
      medium: violations.filter(v => v.severity === "medium").length,
      low: violations.filter(v => v.severity === "low").length
    };

    // Alert stats
    const alertStats = {
      total: alerts.length,
      unresolved: alerts.filter(a => !a.resolved).length,
      critical: alerts.filter(a => a.priority === "Critical").length
    };

    // Sensor stats
    const sensorStats = {
      total: sensors.length,
      online: sensors.filter(s => s.status === "Online").length,
      offline: sensors.filter(s => s.status === "Offline").length
    };

    // Driver stats - highRisk = drivers with >2 high-severity violations
    const driverStats = {
      total: drivers.length,
      highRisk: 0
    };

    // Count high-risk drivers
    for (const driver of drivers) {
      const driverViolations = violations.filter(
        v => v.driverId && v.driverId.toString() === driver._id.toString()
      );
      const highViolations = driverViolations.filter(v => v.severity === "high").length;
      if (highViolations > 2) {
        driverStats.highRisk++;
      }
    }

    res.json({
      violations: violationStats,
      alerts: alertStats,
      sensors: sensorStats,
      drivers: driverStats,
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= AI ANALYTICS =================
app.get("/api/ai-analytics", async (req, res) => {
  try {
    const sensors = await Sensor.find();
    const alertsCount = await Alert.countDocuments();

    const eqRes = await axios.get(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    );

    const earthquakes = eqRes.data.features.map(f => ({
      magnitude: f.properties.mag
    }));

    let riskScore = 0;

    sensors.forEach(s => {
      const speed = s.lastReading?.value || 0;
      if (speed > 100) riskScore += 20;
      else if (speed > 60) riskScore += 10;
      else riskScore += 2;
    });

    riskScore += alertsCount * 2;

    res.json({
      riskScore,
      level: riskScore > 70 ? "CRITICAL" : riskScore > 40 ? "WARNING" : "SAFE"
    });

  } catch {
    res.status(500).json({ error: "AI analytics failed" });
  }
});

// ================= BASIC APIs =================
app.get("/api/sensors", async (req, res) => {
  res.json(await Sensor.find());
});

// GET: Traffic congestion analysis
app.get("/api/congestion", async (req, res) => {
  try {
    const sensors = await Sensor.find();

    // Process each sensor for congestion level
    const congestionData = sensors.map(sensor => {
      const speed = sensor.lastReading?.value ?? null;

      let congestion = "No Data";
      if (speed !== null) {
        if (speed < 20) {
          congestion = "Severe Congestion";
        } else if (speed < 50) {
          congestion = "Moderate Congestion";
        } else if (speed <= 80) {
          congestion = "Light Traffic";
        } else {
          congestion = "Free Flow";
        }
      }

      return {
        sensorId: sensor.sensorId,
        location: sensor.location,
        lat: sensor.lastLocation?.lat || sensor.lat,
        lng: sensor.lastLocation?.lng || sensor.lng,
        speed: speed,
        congestion,
        riskTier: sensor.lastReading?.riskTier || "unknown"
      };
    });

    // Calculate citywide summary
    const readingsWithData = congestionData.filter(s => s.speed !== null);
    const avgSpeed = readingsWithData.length > 0
      ? Math.round(readingsWithData.reduce((sum, s) => sum + s.speed, 0) / readingsWithData.length)
      : 0;

    // Determine dominant condition (most common congestion level)
    const conditionCounts = {};
    readingsWithData.forEach(s => {
      conditionCounts[s.congestion] = (conditionCounts[s.congestion] || 0) + 1;
    });

    const dominantCondition = Object.keys(conditionCounts).length > 0
      ? Object.keys(conditionCounts).reduce((a, b) =>
        conditionCounts[a] > conditionCounts[b] ? a : b
      )
      : "No Data";

    res.json({
      sensors: congestionData,
      summary: {
        avgSpeed,
        dominantCondition,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/alerts", async (req, res) => {
  res.json(await Alert.find().sort({ createdAt: -1 }));
});

app.get("/api/drivers", async (req, res) => {
  res.json(await Driver.find());
});

// GET: Driver safety score with violation breakdown
app.get("/api/drivers/:id/score", async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Fetch all violations for this driver
    const violations = await Violation.find({ driverId: driver._id.toString() });

    // Calculate breakdown by severity
    const breakdown = {
      high: violations.filter(v => v.severity === "high").length,
      medium: violations.filter(v => v.severity === "medium").length,
      low: violations.filter(v => v.severity === "low").length
    };

    // Calculate safety score: 100 - (10*high + 5*medium + 2*low)
    let calculatedScore = 100;
    calculatedScore -= breakdown.high * 10;
    calculatedScore -= breakdown.medium * 5;
    calculatedScore -= breakdown.low * 2;

    // Ensure score stays within 0-100 range
    calculatedScore = Math.max(0, Math.min(100, calculatedScore));

    res.json({
      driverId: driver._id,
      name: driver.name,
      safetyScore: calculatedScore,
      violationCount: violations.length,
      breakdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/violations", async (req, res) => {
  res.json(await Violation.find().sort({ createdAt: -1 }));
});

// POST: Create a new violation
app.post("/api/violations", async (req, res) => {
  try {
    const { driverId, location, speed, speedLimit, type } = req.body;

    // Auto-calculate severity based on speed difference
    let severity = "low";
    const speedDiff = speed - speedLimit;
    if (speedDiff > 50) {
      severity = "high";
    } else if (speedDiff > 20) {
      severity = "medium";
    }

    const violation = await Violation.create({
      driverId,
      location,
      speed,
      speedLimit,
      type,
      severity,
      timestamp: new Date()
    });

    // Emit socket event to all connected clients
    io.emit("newViolation", violation);

    res.status(201).json(violation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE: Remove violation by ID
app.delete("/api/violations/:id", async (req, res) => {
  try {
    await Violation.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET: Violation statistics by severity
app.get("/api/violations/stats", async (req, res) => {
  try {
    const violations = await Violation.find();

    const stats = {
      high: violations.filter(v => v.severity === "high").length,
      medium: violations.filter(v => v.severity === "medium").length,
      low: violations.filter(v => v.severity === "low").length,
      total: violations.length
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
  const uptime = Date.now() - serverStartTime;
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "healthy" : "unhealthy",
    db: dbConnected ? "connected" : "disconnected",
    uptime: Math.floor(uptime / 1000), // in seconds
    timestamp: new Date().toISOString()
  });
});

// ================= WEATHER =================
app.get("/api/weather", async (req, res) => {
  try {
    const city = "Islamabad";
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key missing" });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},PK&units=metric&appid=${apiKey}`;
    const { data } = await axios.get(url);

    console.log("Weather API response:", data); // 👈 DEBUG

    res.json({
      city: data.name,
      country: data.sys.country,
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      wind_speed: data.wind.speed,
      visibility: data.visibility / 1000,
      condition: data.weather[0].main,
      description: data.weather[0].description
    });

  } catch (err) {
    console.log("Weather error:", err.message);
    res.status(500).json({ error: "Weather API failed" });
  }
});

// ================= EARTHQUAKES =================
app.get("/api/earthquakes", async (req, res) => {
  try {
    const url =
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

    const { data } = await axios.get(url);

    const eqs = data.features.map((f, index) => ({
      id: index,
      magnitude: f.properties.mag || 0,
      place: f.properties.place || "Unknown location",
      time: f.properties.time || Date.now(),
      depth_km: f.geometry?.coordinates?.[2] ?? 0,
      severity:
        f.properties.mag >= 5 ? "Severe" :
          f.properties.mag >= 3 ? "Moderate" : "Low"
    }));

    res.json(eqs);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "Earthquake API failed" });
  }
});

// ================= START =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});