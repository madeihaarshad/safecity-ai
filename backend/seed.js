const mongoose = require('mongoose');
require('dotenv').config();
const Violation = require('./models/Violation');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/safecity';

const types = ['Speeding', 'Red Light', 'Wrong Way', 'No Seatbelt', 'Mobile Use', 'Illegal Parking'];
const severities = ['high', 'medium', 'low'];
const locations = [
  { name: 'Faisal Avenue, Islamabad', lat: 33.7215, lng: 73.0433 },
  { name: 'Blue Area, Islamabad',     lat: 33.7298, lng: 73.0931 },
  { name: 'G-9 Markaz, Islamabad',   lat: 33.6938, lng: 73.0651 },
  { name: 'F-6, Islamabad',          lat: 33.7385, lng: 73.0817 },
  { name: 'Rawalpindi Saddar',       lat: 33.5973, lng: 73.0479 },
  { name: 'Bahria Town Phase 4',     lat: 33.5333, lng: 73.0833 },
  { name: 'I-8 Markaz, Islamabad',   lat: 33.6781, lng: 73.0814 },
  { name: 'G-11 Markaz, Islamabad',  lat: 33.6983, lng: 73.0133 },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
  await mongoose.connect(MONGO_URI);
  await Violation.deleteMany({});

  const docs = Array.from({ length: 60 }, (_, i) => {
    const loc = rand(locations);
    const severity = rand(severities);
    return {
      type: rand(types),
      severity,
      location: { name: loc.name, lat: loc.lat, lng: loc.lng },
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    };
  });

  await Violation.insertMany(docs);
  console.log(`✅ Seeded ${docs.length} violations`);
  await mongoose.disconnect();
}

seed().catch(console.error);
