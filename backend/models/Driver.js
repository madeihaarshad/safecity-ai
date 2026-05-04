const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  status: { type: String, enum: ["Active", "Suspended", "Offline"], default: "Offline" },
  vehiclePlate: { type: String, required: true },
  safetyScore: { type: Number, default: 100 },
  lastLocation: {
    lat: Number,
    lng: Number
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Driver", driverSchema);