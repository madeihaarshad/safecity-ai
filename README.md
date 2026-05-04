# SafeCity AI - Intelligent Safety Monitoring & AI Routing

SafeCity AI is a comprehensive safety management system designed for smart cities. It leverages the MERN stack for real-time monitoring and a Python/Flask AI Engine for predictive risk modeling and safety-optimized pathfinding.

## 🚀 Key Features

- **Real-time Dashboard**: Live updates on city stats, traffic violations, and environmental alerts via Socket.io.
- **AI Risk Prediction**: Predictive engine calculating accident probabilities based on weather, time, and congestion.
- **Safe Routing**: Dijkstra-based routing algorithm that prioritizes safety scores over raw distance.
- **Disaster Management**: Real-time event streaming for floods, seismic activity, and emergencies.
- **Fleet Monitoring**: Real-time driver safety scoring and violation tracking.
- **Modern UI**: Dark-themed responsive dashboard built with React and Tailwind CSS.

## 🛠 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Node.js, Express, Socket.io, Mongoose
- **Database**: MongoDB Atlas (Cloud)
- **AI Engine**: Python, Flask, NetworkX (Graph Analytics), NumPy
- **Communication**: WebSockets (Real-time), REST API

## 📋 Prerequisites

- **Node.js** (v16+)
- **Python** (v3.8+)
- **MongoDB Atlas** account (or local MongoDB)

## ⚙️ Installation & Setup

### 1. Database Configuration
1. Create a MongoDB Atlas cluster.
2. Get your Connection String.
3. Replace the `MONGODB_URI` in `backend/.env`.

### 2. Backend Setup
    cd backend
    npm install
    npm start

The backend will run on `http://localhost:5000`.

### 3. AI Engine Setup
    cd ai-engine
    pip install -r requirements.txt
    python app.py

The AI Engine will run on `http://localhost:5001`.

### 4. Frontend Setup
    cd frontend
    npm install
    npm run dev

The application will be available at `http://localhost:3000`.

## 🧠 AI Engine Logic

The `ai-engine/app.py` handles two primary AI functions:
1. **Risk Prediction**: A simulated neural model that processes current environmental variables (weather, time, road density) to output a 0.0-1.0 risk score.
2. **Safe Routing**: Uses the `NetworkX` library to represent the city as a weighted graph. Unlike standard GPS which minimizes `distance`, our AI minimizes a `risk_weight`, ensuring emergency vehicles and drivers take the path of least resistance and maximum safety.

## 📁 Project Structure

    safecity-ai/
    ├── backend/           # Express Server & Socket.io
    │   ├── models/        # Mongoose Schema Definitions
    │   └── server.js      # Main entry point
    ├── ai-engine/         # Flask AI Service
    │   └── app.py         # Risk & Pathfinding Logic
    ├── frontend/          # React Vite App
    │   ├── src/
    │   │   ├── components/# Reusable UI Parts
    │   │   ├── pages/     # Dashboard Views
    │   │   └── socket.js  # WS Config
    └── README.md          # Documentation

## ⚠️ Troubleshooting

- **MongoDB Connection Error**: Ensure your IP address is whitelisted in MongoDB Atlas "Network Access".
- **AI Engine Offline**: Ensure Flask is running on port 5001 before using Analytics or Planner pages.
- **Socket Connection**: If the real-time feed isn't updating, check if the Backend is running correctly on port 5000.
