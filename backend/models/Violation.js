const mongoose = require("mongoose");

const violationSchema = new mongoose.Schema({
  type:      { type: String },
  severity:  { type: String, enum: ['high', 'medium', 'low'] },
  location:  {
    name: String,
    lat:  Number,
    lng:  Number,
  },
  driverId:  { type: String, default: null },
  speed:     { type: Number, default: null },
  speedLimit:{ type: Number, default: null },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Violation", violationSchema);