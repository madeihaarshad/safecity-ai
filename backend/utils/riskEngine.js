// utils/riskEngine.js

function calculateRisk({ weather, earthquakes, alerts }) {
  let score = 0;

  // Weather risk
  if (weather?.temp > 40) score += 2;
  if (weather?.condition?.toLowerCase().includes("storm")) score += 3;
  if (weather?.wind_speed > 10) score += 2;

  // Earthquake risk
  const highEQ = earthquakes.filter(eq => eq.magnitude >= 4).length;
  if (highEQ > 0) score += highEQ * 2;

  // Alerts risk
  if (alerts > 5) score += 3;

  // Final classification
  if (score >= 8) return { level: "HIGH", score };
  if (score >= 4) return { level: "MEDIUM", score };
  return { level: "LOW", score };
}

module.exports = calculateRisk;