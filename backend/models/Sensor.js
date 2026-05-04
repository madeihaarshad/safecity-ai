const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema({
  sensorId: String,
  location: String,
  lat: Number,
  lng: Number,
  status: { type: String, default: "Online" },
  lastReading: {
    value: Number,
    unit: String,
    timestamp: Date
  }
});

module.exports = mongoose.model("Sensor", sensorSchema);