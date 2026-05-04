const mongoose = require("mongoose");

const disasterSchema = new mongoose.Schema({
  type: String,
  severity: String,
  area: String,
  isActive: Boolean
});

module.exports = mongoose.model("DisasterEvent", disasterSchema);