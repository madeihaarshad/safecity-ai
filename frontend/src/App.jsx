import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, AlertTriangle, CloudRain, Map as MapIcon, BarChart3, Navigation, Bell, BellRing, X } from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import Violations from "./pages/Violations";
import Disasters from "./pages/Disasters";
import MapView from "./pages/MapView";
import Analytics from "./pages/Analytics";
import RoutePlanner from "./pages/RoutePlanner";
import socket from "./socket";
import Toast from "./components/Toast";

const SidebarLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      title={label}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        isActive 
          ? "bg-slate-800 text-white font-bold border-l-2 border-accent" 
          : "text-slate-400 hover:bg-slate-800 border-l-2 border-transparent"
      }`}
    >
      <Icon size={20} className={isActive ? "text-accent" : ""} />
      <span>{label}</span>
      {/* Custom CSS tooltip */}
      <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
        {label}
      </span>
    </Link>
  );
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    // Listen for newAlert events
    const handleNewAlert = (alert) => {
      setNotifications(prev => {
        const updated = [
          { ...alert, id: Date.now(), timestamp: new Date() },
          ...prev
        ];
        return updated.slice(0, 20); // Keep max 20 notifications
      });
    };

    socket.on("newAlert", handleNewAlert);

    return () => {
      socket.off("newAlert", handleNewAlert);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && 
          bellRef.current && !bellRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleClearAll = () => {
    setNotifications([]);
    setIsOpen(false);
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    const map = {
      Critical: "text-red-500 bg-red-500/10",
      High: "text-orange-500 bg-orange-500/10",
      Normal: "text-blue-500 bg-blue-500/10",
      Low: "text-green-500 bg-green-500/10"
    };
    return map[priority] || "text-slate-400 bg-slate-700/10";
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "Critical":
        return <AlertTriangle size={16} />;
      case "High":
        return <AlertTriangle size={16} />;
      case "Normal":
        return <Bell size={16} />;
      default:
        return <Bell size={16} />;
    }
  };

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={handleBellClick}
        className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="Notifications"
      >
        {notifications.length > 0 && !isOpen ? <BellRing size={20} /> : <Bell size={20} />}
        {notifications.length > 0 && !isOpen && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-12 right-0 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50"
        >
          {/* Header with Clear All button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-bold text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors font-semibold"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="px-4 py-3 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Priority icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getPriorityColor(notif.priority)}`}>
                      {getPriorityIcon(notif.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {getTimeAgo(notif.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TopHeader = () => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = (path) => {
    if (path === "/") return "Dashboard";
    const routeName = path.substring(1);
    const title = routeName.charAt(0).toUpperCase() + routeName.slice(1).replace(/-/g, " ");
    return title;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 flex items-center justify-between px-6 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-white text-lg">{getPageTitle(location.pathname)}</h2>
        <div className="text-slate-400 text-sm font-mono bg-slate-800/50 px-2 py-1 rounded">
          {formatTime(time)}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
          <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold text-accent border border-slate-700">
             <Users size={16} />
          </div>
          <span className="text-sm font-semibold text-white">SafeCity AI</span>
        </div>
      </div>
    </header>
  );
};

const AppContent = () => {

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
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

        <div className="p-4 bg-slate-950 text-[8px] text-slate-500 text-center">
          v1.0.4 - System Secure
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-dark">
        <TopHeader />
        <main className="flex-1 overflow-y-auto">
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
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
      <Toast />
    </Router>
  );
};

export default App;