import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, Users, AlertTriangle, CloudRain, Map as MapIcon, BarChart3, Navigation, Bell, BellRing, ChevronLeft, ChevronRight, Menu, HelpCircle, Sun, Moon, X, LogOut } from "lucide-react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Shield } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import Violations from "./pages/Violations";
import Disasters from "./pages/Disasters";
import MapView from "./pages/MapView";
import Analytics from "./pages/Analytics";
import RoutePlanner from "./pages/RoutePlanner";
import Login from "./pages/Login";
import DriverSignup from "./pages/DriverSignup";
import DriverDashboard from "./pages/DriverDashboard";
import SecuritySettings from './pages/SecuritySettings';
import socket from "./socket";
import Toast from "./components/Toast";
import HelpPanel from "./components/HelpPanel";
import WelcomeModal from "./components/WelcomeModal";
import ErrorBoundary from "./components/ErrorBoundary";

// ==================== SIDEBAR LINK COMPONENT ====================
const SidebarLink = ({ to, icon: Icon, label, collapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center py-3 rounded-lg transition-all ${isActive
          ? "bg-[var(--card)] text-[var(--accent)] font-bold border-l-4 border-[var(--accent)] accent-glow"
          : "text-[var(--subtle)] hover:bg-[var(--card)] hover:text-[var(--accent)] border-l-4 border-transparent"
        } ${collapsed ? 'justify-center px-0 gap-0' : 'px-4 gap-3'}`}
    >
      <Icon size={20} className={`shrink-0 ${isActive ? "text-accent" : ""}`} />
      <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
        {label}
      </span>
      {collapsed && (
        <span className="absolute left-[calc(100%+1rem)] top-1/2 -translate-y-1/2 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
          {label}
        </span>
      )}
    </Link>
  );
};

const NavLink = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-[var(--accent)] text-white shadow-lg"
          : "text-[var(--subtle)] hover:bg-[var(--card)] hover:text-[var(--accent)]"
      }`}
    >
      <Icon size={18} />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
};

// ==================== NOTIFICATION BELL ====================
const NotificationBell = () => {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    const handleNewAlert = (alert) => {
      setNotifications(prev => [{ ...alert, id: Date.now(), timestamp: new Date() }, ...prev].slice(0, 20));
    };

    socket.on("newAlert", handleNewAlert);
    return () => socket.off("newAlert", handleNewAlert);
  }, []);

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

  const handleBellClick = () => setIsOpen(!isOpen);
  const handleClearAll = () => { setNotifications([]); setIsOpen(false); };

  const getTimeAgo = (date) => {
    const diffMins = Math.floor((new Date() - new Date(date)) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  const getPriorityColor = (priority) => {
    const map = { Critical: "text-red-500 bg-red-500/10", High: "text-orange-500 bg-orange-500/10", Normal: "text-lime-400 bg-lime-500/10", Low: "text-green-500 bg-green-500/10" };
    return map[priority] || "text-[var(--subtle)] bg-[var(--muted)]/10";
  };

  const getPriorityIcon = (priority) => {
    if (priority === "Critical" || priority === "High") return <AlertTriangle size={16} />;
    return <Bell size={16} />;
  };

  return (
    <div className="relative">
      <button ref={bellRef} onClick={handleBellClick} className="relative p-2 rounded-lg text-[var(--subtle)] hover:text-[var(--accent)]">
        {notifications.length > 0 && !isOpen ? <BellRing size={20} /> : <Bell size={20} />}
        {notifications.length > 0 && !isOpen && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>
      {isOpen && (
        <div ref={dropdownRef} className="absolute top-12 right-0 w-80 border rounded-lg shadow-lg z-50 bg-[var(--surface)] border-[var(--border)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-bold text-[var(--text)]">Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={handleClearAll} className="text-xs text-[var(--subtle)] hover:text-red-500">Clear All</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[var(--subtle)] text-sm">No notifications yet</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--muted)]/15">
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getPriorityColor(notif.priority)}`}>
                      {getPriorityIcon(notif.priority)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--text)]">{notif.title}</p>
                      <p className="text-xs text-[var(--subtle)] mt-1 line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-[var(--subtle)]/70 mt-1">{getTimeAgo(notif.timestamp)}</p>
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

// ==================== ADMIN TOP NAVBAR ====================
const AdminTopNavbar = () => {
  const { theme, toggle } = useTheme();
  const { logout, user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const handleLogout = () => { logout(); window.location.href = '/login'; };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-colors ${theme === 'dark' ? 'bg-[var(--bg)]/90 border-[var(--border)]' : 'bg-[var(--surface)]/95 border-[var(--border)]'}`}>
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center text-[var(--bg)] font-bold shadow-lg">S</div>
              <span className="font-bold text-lg hidden sm:block text-[var(--text)]">SafeCity AI - Admin</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavLink to="/admin/drivers" icon={Users} label="Drivers" />
              <NavLink to="/admin/violations" icon={AlertTriangle} label="Violations" />
              <NavLink to="/admin/disasters" icon={CloudRain} label="Disaster Hub" />
              <NavLink to="/admin/map" icon={MapIcon} label="Live Map" />
              <NavLink to="/admin/analytics" icon={BarChart3} label="AI Analytics" />
              <NavLink to="/admin/planner" icon={Navigation} label="Route Planner" />
              <NavLink to="/admin/security" icon={Shield} label="Security" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-mono px-2 py-1 rounded hidden lg:block bg-[var(--card)]/50 text-[var(--subtle)]">{formatTime(time)}</div>
              <button onClick={() => setHelpPanelOpen(true)} className="p-2 rounded-lg text-[var(--subtle)] hover:text-[var(--accent)]"><HelpCircle size={20} /></button>
              <button onClick={toggle} className="relative flex items-center w-14 h-7 rounded-full p-1 bg-[var(--card)]">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-7 bg-[var(--accent)]' : 'translate-x-0 bg-[var(--surface)]'}`}>
                  {theme === 'dark' ? <Sun size={12} className="text-[var(--bg)]" /> : <Moon size={12} className="text-[var(--bg)]" />}
                </div>
              </button>
              <NotificationBell />
              <div className="flex items-center gap-2 border-l pl-3 border-[var(--border)]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[var(--accent)] border bg-[var(--surface)] border-[var(--border)]"><Users size={16} /></div>
                <span className="text-sm font-semibold hidden lg:block text-[var(--text)]">{user?.name || 'Admin'}</span>
              </div>
              <button onClick={handleLogout} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"><LogOut size={20} /></button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-[var(--subtle)] hover:text-[var(--accent)]">
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t p-4 flex flex-col gap-2 bg-[var(--bg)]">
            <NavLink to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
            <NavLink to="/admin/drivers" icon={Users} label="Drivers" onClick={() => setMobileMenuOpen(false)} />
            <NavLink to="/admin/violations" icon={AlertTriangle} label="Violations" onClick={() => setMobileMenuOpen(false)} />
            <NavLink to="/admin/disasters" icon={CloudRain} label="Disaster Hub" onClick={() => setMobileMenuOpen(false)} />
            <NavLink to="/admin/map" icon={MapIcon} label="Live Map" onClick={() => setMobileMenuOpen(false)} />
            <NavLink to="/admin/analytics" icon={BarChart3} label="AI Analytics" onClick={() => setMobileMenuOpen(false)} />
            <NavLink to="/admin/planner" icon={Navigation} label="Route Planner" onClick={() => setMobileMenuOpen(false)} />
            <NavLink to="/admin/security" icon={Shield} label="Security" onClick={() => setMobileMenuOpen(false)} />
            <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-500/10 mt-2"><LogOut size={18} /> Logout</button>
          </div>
        )}
      </nav>
      <HelpPanel isOpen={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
    </>
  );
};

// ==================== ADMIN LAYOUT ====================
const AdminLayout = () => {
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('safecity-sidebar');
    return saved !== null ? JSON.parse(saved) : window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { localStorage.setItem('safecity-sidebar', JSON.stringify(sidebarOpen)); }, [sidebarOpen]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setShowOnlineBanner(true); setTimeout(() => setShowOnlineBanner(false), 3000); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const isCollapsed = !sidebarOpen && !isMobile;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <AdminTopNavbar />
      {!isOnline && <div className="fixed top-16 left-0 right-0 z-40 bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/30 px-6 py-2 text-center text-sm">⚠ No internet connection — data may be outdated</div>}
      {isOnline && showOnlineBanner && <div className="fixed top-16 left-0 right-0 z-40 bg-green-500/20 text-green-300 border-b border-green-500/30 px-6 py-2 text-center text-sm animate-fadeIn">✓ Back online</div>}
      <div className="flex pt-16">
        {isMobile && sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}
        <aside className={`${isMobile ? "fixed inset-y-0 left-0 z-30" : "relative z-20"} border-r flex flex-col shrink-0 transition-all duration-300 bg-[var(--surface)] border-[var(--border)] ${isMobile ? (sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full") : (sidebarOpen ? "w-64" : "w-16")}`} style={{ top: '64px', height: 'calc(100vh - 64px)' }}>
          <div className="relative p-6 border-b flex items-center min-h-[81px] border-[var(--border)]">
            <h1 className={`text-xl font-bold text-[var(--accent)] flex items-center gap-2 transition-all duration-300 ${isCollapsed ? 'opacity-0 translate-x-[-20px]' : 'opacity-100 translate-x-0'}`}>
              <div className="w-8 h-8 bg-[var(--accent)] rounded flex items-center justify-center text-[var(--bg)] font-bold shadow-lg">S</div>
              <span className="whitespace-nowrap">Menu</span>
            </h1>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-[var(--card)] text-[var(--subtle)] hover:text-[var(--accent)] transition-all z-10 ${isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-4'}`}>
              {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
          <nav className={`flex-1 space-y-2 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <SidebarLink to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
            <SidebarLink to="/admin/drivers" icon={Users} label="Drivers" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
            <SidebarLink to="/admin/violations" icon={AlertTriangle} label="Violations" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
            <SidebarLink to="/admin/disasters" icon={CloudRain} label="Disaster Hub" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
            <SidebarLink to="/admin/map" icon={MapIcon} label="Live Map" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
            <SidebarLink to="/admin/analytics" icon={BarChart3} label="AI Analytics" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
            <SidebarLink to="/admin/planner" icon={Navigation} label="Route Planner" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
            <SidebarLink to="/admin/security" icon={Shield} label="Security" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
          </nav>
          <div className={`text-[8px] text-[var(--subtle)] text-center transition-all duration-300 bg-[var(--bg)] border-t border-[var(--border)] ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'p-4 opacity-100'}`}>v1.0.4 - System Secure</div>
        </aside>
        <main className="flex-1 px-4 pb-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/admin/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="/admin/drivers" element={<ErrorBoundary><Drivers /></ErrorBoundary>} />
            <Route path="/admin/violations" element={<ErrorBoundary><Violations /></ErrorBoundary>} />
            <Route path="/admin/disasters" element={<ErrorBoundary><Disasters /></ErrorBoundary>} />
            <Route path="/admin/map" element={<ErrorBoundary><MapView /></ErrorBoundary>} />
            <Route path="/admin/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
            <Route path="/admin/planner" element={<ErrorBoundary><RoutePlanner /></ErrorBoundary>} />
            <Route path="/admin/security" element={<ErrorBoundary><SecuritySettings /></ErrorBoundary>} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// ==================== APP ====================
// ==================== APP ====================
const App = () => {
  const { isAdmin, isDriver, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--subtle)]">Loading...</p>
        </div>
      </div>
    );
  }

  // If admin is logged in, show admin layout
  if (isAdmin) {
    return <AdminLayout />;
  }

  // If driver is logged in, show driver dashboard
  if (isDriver) {
    return <DriverDashboard />;
  }

  // Not logged in - show public routes
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/driver-signup" element={<DriverSignup />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// ==================== WRAPPED APP ====================
const WrappedApp = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <App />
          <Toast />
          <WelcomeModal />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default WrappedApp;