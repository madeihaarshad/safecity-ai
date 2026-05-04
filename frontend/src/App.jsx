import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, AlertTriangle, CloudRain, Map as MapIcon, BarChart3, Navigation } from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import Violations from "./pages/Violations";
import Disasters from "./pages/Disasters";
import MapView from "./pages/MapView";
import Analytics from "./pages/Analytics";
import RoutePlanner from "./pages/RoutePlanner";

const SidebarLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive ? "bg-accent text-dark font-bold" : "text-slate-400 hover:bg-slate-800"
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  );
};

const AppContent = () => {

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-accent flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded flex items-center justify-center text-dark">S</div>
            SafeCity AI
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarLink to="/drivers" icon={Users} label="Drivers" />
          <SidebarLink to="/violations" icon={AlertTriangle} label="Violations" />
          <SidebarLink to="/disasters" icon={CloudRain} label="Disaster Hub" />
          <SidebarLink to="/map" icon={MapIcon} label="Live Map" />
          <SidebarLink to="/analytics" icon={BarChart3} label="AI Analytics" />
          <SidebarLink to="/planner" icon={Navigation} label="Route Planner" />
        </nav>

        <div className="p-4 bg-slate-950 text-xs text-slate-500 text-center">
          v1.0.4 - System Secure
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-dark">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/violations" element={<Violations />} />
          <Route path="/disasters" element={<Disasters />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/planner" element={<RoutePlanner />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;