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

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    initSensors();
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

// ================= 📊 STATS API (FIXED) =================
app.get("/api/stats", async (req, res) => {
  try {
    const violations = await Violation.find();

    const stats = {
      low: violations.filter(v => v.severity === "low").length,
      medium: violations.filter(v => v.severity === "medium").length,
      high: violations.filter(v => v.severity === "high").length
    };

    res.json(stats);
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

app.get("/api/alerts", async (req, res) => {
  res.json(await Alert.find().sort({ createdAt: -1 }));
});

app.get("/api/drivers", async (req, res) => {
  res.json(await Driver.find());
});

app.get("/api/violations", async (req, res) => {
  res.json(await Violation.find().sort({ createdAt: -1 }));
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