const mongoose = require("mongoose");

const violationSchema = new mongoose.Schema({
  type: String,
  severity: String,
  location: Object,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Violation", violationSchema);