import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, AlertTriangle, CloudRain, Map as MapIcon, BarChart3, Navigation, Bell, BellRing, ChevronLeft, ChevronRight, Menu, HelpCircle, Sun, Moon } from "lucide-react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/Drivers";
import Violations from "./pages/Violations";
import Disasters from "./pages/Disasters";
import MapView from "./pages/MapView";
import Analytics from "./pages/Analytics";
import RoutePlanner from "./pages/RoutePlanner";
import socket from "./socket";
import Toast from "./components/Toast";
import HelpPanel from "./components/HelpPanel";
import WelcomeModal from "./components/WelcomeModal";
import ErrorBoundary from "./components/ErrorBoundary";

const SidebarLink = ({ to, icon: Icon, label, collapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex items-center py-3 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${isActive
          ? "bg-[var(--card)] text-[var(--accent)] font-bold border-l-4 border-[var(--accent)] accent-glow"
          : "text-[var(--subtle)] hover:bg-[var(--card)] hover:text-[var(--accent)] border-l-4 border-transparent"
        } ${collapsed ? 'justify-center px-0 gap-0' : 'px-4 gap-3'}`}
    >
      <Icon size={20} className={`shrink-0 ${isActive ? "text-accent" : ""}`} />
      <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${collapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100"}`}>
        {label}
      </span>
      {/* Custom CSS tooltip */}
      {collapsed && (
        <span className="absolute left-[calc(100%+1rem)] top-1/2 -translate-y-1/2 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
          {label}
        </span>
      )}
    </Link>
  );
};

const NotificationBell = () => {
  const { theme } = useTheme();
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
      Normal: "text-lime-400 bg-lime-500/10",
      Low: "text-green-500 bg-green-500/10"
    };
    return map[priority] || "text-[var(--subtle)] bg-[var(--muted)]/10";
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
        className={`relative p-2 rounded-lg transition-colors text-[var(--subtle)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
          theme === 'dark' ? 'hover:bg-[var(--card)]' : 'hover:bg-[var(--muted)]/20'
        }`}
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
          className={`absolute top-12 right-0 w-80 border rounded-lg shadow-lg z-50 transition-all duration-200 ${
            theme === 'dark'
              ? 'bg-[var(--surface)] border-[var(--border)] shadow-black/40'
              : 'bg-[var(--surface)] border-[var(--border)] shadow-black/10'
          }`}
        >
          {/* Header with Clear All button */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${
            theme === 'dark' ? 'border-[var(--border)]' : 'border-[var(--border)]'
          }`}>
            <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-[var(--text)]' : 'text-[var(--text)]'}`}>Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-[var(--subtle)] hover:text-[var(--danger)] transition-colors font-semibold"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-[var(--subtle)] text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-4 py-3 border-b last:border-b-0 transition-colors ${
                    theme === 'dark'
                      ? 'border-[var(--border)] hover:bg-[var(--muted)]/30'
                      : 'border-[var(--border)] hover:bg-[var(--muted)]/15'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Priority icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getPriorityColor(notif.priority)}`}>
                      {getPriorityIcon(notif.priority)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${theme === 'dark' ? 'text-[var(--text)]' : 'text-[var(--text)]'}`}>
                        {notif.title}
                      </p>
                      <p className={`text-xs line-clamp-2 mt-1 ${theme === 'dark' ? 'text-[var(--subtle)]' : 'text-[var(--subtle)]'}`}>
                        {notif.message}
                      </p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-[var(--subtle)]/70' : 'text-[var(--subtle)]/80'}`}>
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

const TopHeader = ({ onMenuClick, isMobile, onHelpClick }) => {
  const { theme, toggle } = useTheme();
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
    <header className={`h-14 backdrop-blur-md border-b flex items-center justify-between px-6 z-10 shrink-0 transition-colors ${
      theme === 'dark'
        ? 'bg-[var(--bg)]/80 border-[var(--border)]'
        : 'bg-[var(--surface)]/90 border-[var(--border)]'
    }`}>
      <div className="flex items-center gap-4">
        {isMobile && (
          <button 
            onClick={onMenuClick} 
            className="md:hidden p-1.5 -ml-2 text-[var(--subtle)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--card)] transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}
        <h2 className={`font-bold text-lg text-[var(--text)]`}>{getPageTitle(location.pathname)}</h2>
        <div className={`text-sm font-mono px-2 py-1 rounded hidden sm:block ${
          theme === 'dark' ? 'text-[var(--subtle)] bg-[var(--card)]/50' : 'text-[var(--subtle)] bg-[var(--muted)]/20'
        }`}>
          {formatTime(time)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onHelpClick}
          className={`p-2 rounded-lg transition-colors text-[var(--subtle)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            theme === 'dark' ? 'hover:bg-[var(--card)]' : 'hover:bg-[var(--muted)]/20'
          }`}
          aria-label="Open help panel"
          title="Help"
        >
          <HelpCircle size={20} />
        </button>
        <button
          onClick={toggle}
          className={`relative flex items-center w-14 h-7 rounded-full p-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
            theme === 'dark' ? 'bg-[var(--card)]' : 'bg-[var(--border)]'
          }`}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div className={`flex items-center justify-center w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
            theme === 'dark' ? 'translate-x-7 bg-[var(--accent)]' : 'translate-x-0 bg-[var(--surface)]'
          }`}>
            {theme === 'dark' ? <Sun size={12} className="text-[var(--bg)]" /> : <Moon size={12} className="text-[var(--bg)]" />}
          </div>
        </button>
        <NotificationBell />
        <div className={`flex items-center gap-3 border-l pl-4 border-[var(--border)]`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[var(--accent)] border ${
            theme === 'dark' ? 'bg-[var(--surface)] border-[var(--border)]' : 'bg-[var(--muted)]/30 border-[var(--border)]'
          }`}>
            <Users size={16} />
          </div>
          <span className={`text-sm font-semibold hidden sm:block text-[var(--text)]`}>SafeCity AI</span>
        </div>
      </div>
    </header>
  );
};

const AppContent = () => {
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('safecity-sidebar');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile((prev) => {
        if (!prev && mobile) {
          setSidebarOpen(false);
        }
        return mobile;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('safecity-sidebar', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineBanner(true);
      // Auto-dismiss "Back online" banner after 3 seconds
      setTimeout(() => setShowOnlineBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineBanner(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isCollapsed = !sidebarOpen && !isMobile;

  return (
    <div 
      className={`flex h-screen overflow-hidden relative transition-colors duration-300 bg-[var(--bg)]`}
    >
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile ? "fixed inset-y-0 left-0 z-30" : "relative z-20"}
          border-r flex flex-col shrink-0
          transition-all duration-300 ease-in-out
          bg-[var(--surface)] border-[var(--border)]
          ${isMobile
            ? (sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full")
            : (sidebarOpen ? "w-64" : "w-16")
          }
        `}
      >
        <div className={`relative p-6 border-b flex items-center min-h-[81px] overflow-hidden border-[var(--border)]`}>
          <h1 className={`text-xl font-bold text-[var(--accent)] flex items-center gap-2 transition-all duration-300 ${isCollapsed ? 'opacity-0 translate-x-[-20px]' : 'opacity-100 translate-x-0'}`}>
            <div className="w-8 h-8 bg-[var(--accent)] rounded flex items-center justify-center text-[var(--bg)] font-bold shrink-0 shadow-lg accent-glow">S</div>
            <span className="whitespace-nowrap">SafeCity AI</span>
          </h1>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-[var(--card)] text-[var(--subtle)] hover:text-[var(--accent)] transition-all z-10 ${isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-4'}`}
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <nav className={`flex-1 space-y-2 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'p-2' : 'p-4'}`}>
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
          <SidebarLink to="/drivers" icon={Users} label="Drivers" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
          <SidebarLink to="/violations" icon={AlertTriangle} label="Violations" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
          <SidebarLink to="/disasters" icon={CloudRain} label="Disaster Hub" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
          <SidebarLink to="/map" icon={MapIcon} label="Live Map" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
          <SidebarLink to="/analytics" icon={BarChart3} label="AI Analytics" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
          <SidebarLink to="/planner" icon={Navigation} label="Route Planner" collapsed={isCollapsed} onClick={() => isMobile && setSidebarOpen(false)} />
        </nav>

        <div className={`text-[8px] text-[var(--subtle)] text-center transition-all duration-300 whitespace-nowrap bg-[var(--bg)] border-t border-[var(--border)] ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'p-4 opacity-100'}`}>
          v1.0.4 - System Secure
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full transition-colors duration-300 bg-[var(--bg)]">
        <TopHeader 
          onMenuClick={() => setSidebarOpen(true)} 
          isMobile={isMobile}
          onHelpClick={() => setHelpPanelOpen(!helpPanelOpen)}
        />

        {/* Offline/Online Banner */}
        {!isOnline && (
          <div className="w-full bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/30 px-6 py-3 flex items-center justify-center gap-2 z-50">
            <span className="text-sm font-semibold">⚠ No internet connection — data may be outdated</span>
          </div>
        )}
        {isOnline && showOnlineBanner && (
          <div className="w-full bg-green-500/20 text-green-300 border-b border-green-500/30 px-6 py-3 flex items-center justify-center gap-2 z-50 animate-fadeIn">
            <span className="text-sm font-semibold">✓ Back online</span>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="/drivers" element={<ErrorBoundary><Drivers /></ErrorBoundary>} />
            <Route path="/violations" element={<ErrorBoundary><Violations /></ErrorBoundary>} />
            <Route path="/disasters" element={<ErrorBoundary><Disasters /></ErrorBoundary>} />
            <Route path="/map" element={<ErrorBoundary><MapView /></ErrorBoundary>} />
            <Route path="/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
            <Route path="/planner" element={<ErrorBoundary><RoutePlanner /></ErrorBoundary>} />
          </Routes>
        </main>
      </div>

      {/* Help Panel */}
      <HelpPanel isOpen={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
        <Toast />
        <WelcomeModal />
      </Router>
    </ThemeProvider>
  );
};

export default App;