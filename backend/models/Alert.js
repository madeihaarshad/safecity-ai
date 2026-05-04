const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  title: String,
  message: String,
  category: String,
  priority: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Alert", alertSchema);