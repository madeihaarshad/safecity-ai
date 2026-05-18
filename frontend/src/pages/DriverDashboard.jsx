import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, Navigation, Bell, AlertTriangle, CloudRain, 
  Sun, Cloud, Wind, Thermometer, LogOut, MapPin,
  Clock, Shield, Car, Wifi, WifiOff, Award, TrendingUp,
  Fuel, Calendar, Phone, Mail, FileText, Camera,
  Star, Medal, Zap, Battery, Settings, User, Key,
  PhoneCall, Map, Activity, BarChart3, Play, Square,
  History, DollarSign, Gift, Crown, Flame, Droplet,
  Eye, CheckCircle, XCircle, AlertCircle as AlertIcon
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import socket, { 
  sendEmergencySOS, 
  reportHazard, 
  shareLocation,
  requestRouteUpdate,
  sendTripStatus,
  sendDriverFeedback,
  isSocketConnected,
  getSocketId
} from '../socket';

const DriverDashboard = () => {
  const { driver, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
// Calculate fine amount
const calculateFine = (violationType, severity) => {
  const fines = {
    'Speeding': { high: 5000, medium: 3000, low: 1500 },
    'No Helmet': { high: 2000, medium: 1500, low: 1000 },
    'No Seatbelt': { high: 1500, medium: 1000, low: 500 },
    'Red Light Violation': { high: 10000, medium: 5000, low: 2000 },
    'Wrong Way': { high: 7000, medium: 4000, low: 2000 },
    'No Parking': { high: 2000, medium: 1000, low: 500 },
    'Drunk Driving': { high: 25000, medium: 15000, low: 10000 },
    'Using Mobile Phone': { high: 5000, medium: 3000, low: 1500 },
    'Overloading': { high: 8000, medium: 5000, low: 3000 },
    'Dangerous Driving': { high: 15000, medium: 10000, low: 5000 },
  };
  
  const defaultFine = { high: 5000, medium: 3000, low: 1000 };
  const fineMap = fines[violationType] || defaultFine;
  return fineMap[severity?.toLowerCase()] || fineMap.low;
};
  // State Management
  const [weather, setWeather] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [routeAlerts, setRouteAlerts] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Trip Management
  const [currentTrip, setCurrentTrip] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [isTripActive, setIsTripActive] = useState(false);
  const [tripDistance, setTripDistance] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);
  
  // Safety Score History
  const [safetyHistory, setSafetyHistory] = useState([]);
  const [weeklyScore, setWeeklyScore] = useState([]);
  
  // Rewards & Achievements
  const [achievements, setAchievements] = useState([
    { id: 1, name: "Safe Driver - 7 Days", icon: "🏆", earned: true, date: "2024-01-15" },
    { id: 2, name: "1000 KM Safely", icon: "🎯", earned: true, date: "2024-01-10" },
    { id: 3, name: "30 Days No Violation", icon: "⭐", earned: false, progress: 85 },
    { id: 4, name: "Early Bird", icon: "🌅", earned: false, progress: 60 },
    { id: 5, name: "Night Owl Safe Driver", icon: "🌙", earned: true, date: "2024-01-05" },
    { id: 6, name: "Perfect Week", icon: "💯", earned: false, progress: 70 }
  ]);
  const [points, setPoints] = useState(1250);
  
  // Vehicle Health
  const [vehicleHealth, setVehicleHealth] = useState({
    fuelLevel: 65,
    batteryHealth: 92,
    tirePressure: 34,
    engineStatus: "Good",
    nextService: "2024-03-15",
    oilLife: 45
  });
  
  // Notifications Settings
  const [notificationSettings, setNotificationSettings] = useState({
    weatherAlerts: true,
    trafficAlerts: true,
    maintenanceReminders: true,
    safetyTips: true
  });
  
  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: "Police", number: "15", type: "police" },
    { name: "Ambulance", number: "1122", type: "medical" },
    { name: "Road Rescue", number: "130", type: "rescue" }
  ]);
  
  // Monthly Stats
  const [monthlyStats, setMonthlyStats] = useState({
    totalDistance: 2450,
    totalTrips: 32,
    avgSpeed: 52,
    fuelUsed: 180,
    savedCO2: 45
  });

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/weather`);
        setWeather(response.data);
        
        // Weather-based alerts
        if (response.data.condition === "Rain") {
          addAlert({
            title: "🌧️ Rain Alert",
            message: "Wet roads detected! Reduce speed and maintain safe distance.",
            priority: "High"
          });
        }
        if (response.data.temp > 38) {
          addAlert({
            title: "🔥 Heat Alert",
            message: "Extreme heat! Stay hydrated and take regular breaks.",
            priority: "Normal"
          });
        }
      } catch (error) {
        console.error('Weather fetch failed:', error);
        setWeather({
          temp: 28,
          feels_like: 30,
          humidity: 65,
          condition: 'Clear',
          description: 'clear sky',
          wind_speed: 12
        });
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, []);

  // Get user location and share automatically when trip is active
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed || 0
          };
          setLocation(newLocation);
          
          // Track distance during active trip
          if (isTripActive && tripStartTime) {
            setTripDistance(prev => prev + (newLocation.speed * 0.001));
            
            // Auto-share location during active trip
            shareCurrentLocation();
            
            // Send trip status update
            sendTripStatusUpdate();
          }
        },
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isTripActive, tripStartTime]);

  // Listen for real-time alerts
  useEffect(() => {
    const handleNewAlert = (alert) => {
      addAlert(alert);
      if (Notification.permission === 'granted') {
        new Notification(`🚨 ${alert.title}`, { body: alert.message });
      }
    };

    const handleWeatherAlert = (alert) => {
      addAlert(alert);
    };

    socket.on('driverAlert', handleNewAlert);
    socket.on('weatherAlert', handleWeatherAlert);

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.off('driverAlert');
      socket.off('weatherAlert');
    };
  }, []);

  // Online/Offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Live updates resumed.");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline. Showing cached data.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Generate safety score history
  useEffect(() => {
    const generateHistory = () => {
      const history = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        history.push({
          date: date.toLocaleDateString(),
          score: Math.floor(Math.random() * 30) + 70
        });
      }
      setSafetyHistory(history);
      
      // Weekly scores
      const weekly = [];
      for (let i = 3; i >= 0; i--) {
        weekly.push({
          week: `Week ${4 - i}`,
          score: Math.floor(Math.random() * 30) + 70
        });
      }
      setWeeklyScore(weekly);
    };
    generateHistory();
  }, []);

  const addAlert = (alert) => {
    setAlerts(prev => [{
      ...alert,
      id: Date.now(),
      timestamp: new Date()
    }, ...prev].slice(0, 20));
  };

  const getWeatherAdvice = () => {
    if (!weather) return 'Drive safely!';
    const temp = weather.temp;
    const condition = weather.condition;
    
    if (condition === 'Rain') return '⚠️ Rain detected! Reduce speed and maintain distance.';
    if (temp > 35) return '🔥 Extreme heat! Stay hydrated and take breaks.';
    if (temp < 10) return '❄️ Cold weather! Watch for icy roads.';
    if (weather.wind_speed > 30) return '💨 Strong winds! Be cautious on bridges.';
    return '✅ Weather conditions are favorable for driving.';
  };

  // Trip Management Functions
  const startTrip = () => {
    const newTrip = {
      id: Date.now(),
      startTime: new Date(),
      startLocation: location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Current Location",
      status: "active"
    };
    setCurrentTrip(newTrip);
    setTripStartTime(new Date());
    setIsTripActive(true);
    setTripDistance(0);
    
    // Send trip status via socket
    sendTripStatus({
      driverId: driver?.id,
      driverName: driver?.name,
      status: "started",
      tripId: newTrip.id,
      startLocation: newTrip.startLocation,
      timestamp: new Date()
    });
    
    toast.success("Trip started! Drive safely 🚗");
  };

  const endTrip = () => {
    if (currentTrip) {
      const endTime = new Date();
      const duration = Math.floor((endTime - new Date(currentTrip.startTime)) / 60000);
      const endedTrip = {
        ...currentTrip,
        endTime,
        duration,
        distance: (tripDistance / 1000).toFixed(1),
        status: "completed"
      };
      setTripHistory([endedTrip, ...tripHistory]);
      
      // Send trip status via socket
      sendTripStatus({
        driverId: driver?.id,
        driverName: driver?.name,
        status: "completed",
        tripId: currentTrip.id,
        duration: duration,
        distance: (tripDistance / 1000).toFixed(1),
        timestamp: new Date()
      });
      
      // Update monthly stats
      setMonthlyStats(prev => ({
        ...prev,
        totalDistance: prev.totalDistance + parseFloat(endedTrip.distance),
        totalTrips: prev.totalTrips + 1
      }));
      
      // Add points for completing trip
      const tripPoints = Math.floor(duration * 2);
      setPoints(prev => prev + tripPoints);
      toast.success(`Trip completed! +${tripPoints} points earned! 🎉`);
      
      setCurrentTrip(null);
      setIsTripActive(false);
      setTripStartTime(null);
      setTripDistance(0);
    }
  };

  // ================= SOCKET FUNCTIONS (UPDATED) =================
  
  // Emergency SOS - Using the exported function
  const triggerSOS = () => {
    if (location) {
      sendEmergencySOS({
        driverId: driver?.id,
        name: driver?.name,
        location: {
          lat: location.lat,
          lng: location.lng,
          speed: location.speed
        },
        message: "Emergency! Need immediate assistance!",
        timestamp: new Date().toISOString()
      });
      
      toast.error("🚨 SOS Triggered! Emergency services notified.");
      
      // Also show alert in the alerts list
      addAlert({
        title: "🚨 SOS Sent",
        message: "Emergency services have been notified of your location.",
        priority: "Critical"
      });
    } else {
      toast.error("Cannot get location. Please enable GPS.");
    }
  };

  // Report hazard - Using the exported function
  const reportRoadHazard = () => {
    if (location) {
      reportHazard({
        driverId: driver?.id,
        name: driver?.name,
        location: {
          lat: location.lat,
          lng: location.lng
        },
        type: "road_hazard",
        description: "Road hazard detected",
        timestamp: new Date().toISOString()
      });
      
      toast.info("⚠️ Hazard reported! Authorities notified.");
      
      addAlert({
        title: "⚠️ Hazard Reported",
        message: "Thank you for reporting. Authorities have been notified.",
        priority: "Normal"
      });
    } else {
      toast.error("Cannot get location. Please enable GPS.");
    }
  };

  // Share location - Using the exported function
  const shareCurrentLocation = () => {
    if (location && isTripActive) {
      shareLocation({
        driverId: driver?.id,
        name: driver?.name,
        location: {
          lat: location.lat,
          lng: location.lng,
          speed: location.speed
        },
        tripId: currentTrip?.id,
        shareWith: "fleet_manager",
        timestamp: new Date().toISOString()
      });
    }
  };

  // Send trip status update
  const sendTripStatusUpdate = () => {
    if (currentTrip && isTripActive) {
      sendTripStatus({
        driverId: driver?.id,
        driverName: driver?.name,
        status: "in_progress",
        tripId: currentTrip.id,
        currentLocation: location,
        distance: (tripDistance / 1000).toFixed(1),
        timestamp: new Date()
      });
    }
  };

  // Request route update
  const requestRouteUpdate = () => {
    if (location) {
      requestRouteUpdate({
        driverId: driver?.id,
        currentLocation: location,
        destination: null // Can be specified by user
      });
      toast.info("Fetching optimal route...");
    }
  };

  // Submit feedback
  const submitFeedback = (feedback) => {
    sendDriverFeedback({
      driverId: driver?.id,
      driverName: driver?.name,
      feedback: feedback,
      rating: 5,
      timestamp: new Date()
    });
    toast.success("Thank you for your feedback!");
  };

  const getWeatherIcon = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'clear': return <Sun size={48} className="text-yellow-500" />;
      case 'clouds': return <Cloud size={48} className="text-gray-400" />;
      case 'rain': return <CloudRain size={48} className="text-blue-400" />;
      default: return <Sun size={48} className="text-yellow-500" />;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <ToastContainer position="top-right" theme={theme} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--surface)] border-b border-[var(--border)] px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-full flex items-center justify-center">
              <Truck className="text-[var(--accent)]" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-[var(--text)]">Driver Dashboard</h1>
              <p className="text-xs text-[var(--subtle)]">{driver?.name} • {driver?.licenseNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isOnline ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 px-4 pb-8 max-w-7xl mx-auto">
        {/* Online Status Banner */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-500 text-sm text-center">
            ⚠️ You are offline. Showing cached data. Connect to internet for live updates.
          </div>
        )}

        {/* Socket Connection Status */}
        <div className="mb-4 text-right">
          <span className={`text-xs px-2 py-1 rounded ${isSocketConnected() ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            Socket: {isSocketConnected() ? 'Connected' : 'Disconnected'}
            {isSocketConnected() && ` (ID: ${getSocketId()})`}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--accent)]">{points}</div>
            <p className="text-xs text-[var(--subtle)] mt-1">Total Points</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--accent)]">{achievements.filter(a => a.earned).length}/{achievements.length}</div>
            <p className="text-xs text-[var(--subtle)] mt-1">Achievements</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--accent)]">{monthlyStats.totalTrips}</div>
            <p className="text-xs text-[var(--subtle)] mt-1">Trips (Month)</p>
          </div>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[var(--accent)]">{monthlyStats.totalDistance} km</div>
            <p className="text-xs text-[var(--subtle)] mt-1">Distance (Month)</p>
          </div>
        </div>

        {/* Trip Management Card */}
        <div className="bg-gradient-to-r from-[var(--accent)]/10 to-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[var(--accent)]/20 rounded-full flex items-center justify-center">
                <Navigation className="text-[var(--accent)]" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text)]">Trip Management</h3>
                {isTripActive ? (
                  <p className="text-sm text-[var(--subtle)]">Trip in progress • Distance: {tripDistance.toFixed(1)} km</p>
                ) : (
                  <p className="text-sm text-[var(--subtle)]">Ready for new trip</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {!isTripActive ? (
                <button
                  onClick={startTrip}
                  className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                >
                  <Play size={18} />
                  Start Trip
                </button>
              ) : (
                <button
                  onClick={endTrip}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  <Square size={18} />
                  End Trip
                </button>
              )}
            </div>
          </div>
          {isTripActive && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--subtle)]">Started at</p>
                <p className="font-semibold text-[var(--text)]">{new Date(tripStartTime).toLocaleTimeString()}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--subtle)]">Current Speed</p>
                <p className="font-semibold text-[var(--text)]">{location?.speed ? `${location.speed.toFixed(1)} km/h` : '-- km/h'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Weather Widget */}
        {weather && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-[var(--border)] rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {getWeatherIcon(weather.condition)}
                <div>
                  <p className="text-3xl font-bold text-[var(--text)]">{Math.round(weather.temp)}°C</p>
                  <p className="text-sm text-[var(--subtle)] capitalize">{weather.description}</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div>
                  <Thermometer size={16} className="text-[var(--subtle)] mb-1" />
                  <p className="text-xs text-[var(--subtle)]">Feels like</p>
                  <p className="font-semibold text-[var(--text)]">{Math.round(weather.feels_like)}°C</p>
                </div>
                <div>
                  <Wind size={16} className="text-[var(--subtle)] mb-1" />
                  <p className="text-xs text-[var(--subtle)]">Wind</p>
                  <p className="font-semibold text-[var(--text)]">{weather.wind_speed} km/h</p>
                </div>
                <div>
                  <Droplet size={16} className="text-[var(--subtle)] mb-1" />
                  <p className="text-xs text-[var(--subtle)]">Humidity</p>
                  <p className="font-semibold text-[var(--text)]">{weather.humidity}%</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-[var(--accent)]/10 rounded-lg">
              <p className="text-sm text-[var(--accent)] font-medium">{getWeatherAdvice()}</p>
            </div>
          </div>
        )}

        {/* Live Alerts */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="text-red-500" size={20} />
              <h2 className="font-bold text-[var(--text)]">Live Alerts</h2>
            </div>
            {alerts.length > 0 && (
              <button onClick={() => setAlerts([])} className="text-xs text-[var(--subtle)] hover:text-red-500">
                Clear All
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
              <Shield className="mx-auto mb-2 text-green-500" size={32} />
              <p className="text-[var(--subtle)]">No active alerts. Drive safe!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.map((alert, idx) => (
                <div key={alert.id || idx} className={`p-4 rounded-xl border ${
                  alert.priority === 'Critical' ? 'bg-red-500/10 border-red-500/30' :
                  alert.priority === 'High' ? 'bg-orange-500/10 border-orange-500/30' :
                  'bg-yellow-500/10 border-yellow-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`mt-0.5 ${
                      alert.priority === 'Critical' ? 'text-red-500' :
                      alert.priority === 'High' ? 'text-orange-500' : 'text-yellow-500'
                    }`} size={20} />
                    <div className="flex-1">
                      <h3 className="font-bold text-[var(--text)]">{alert.title}</h3>
                      <p className="text-sm text-[var(--text)]">{alert.message}</p>
                      <p className="text-xs text-[var(--subtle)] mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Score & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-[var(--accent)]" size={20} />
              <h3 className="font-bold text-[var(--text)]">Safety Score Trend</h3>
            </div>
            <div className="space-y-3">
              {safetyHistory.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--subtle)]">{item.date}</span>
                    <span className="font-semibold text-[var(--text)]">{item.score}%</span>
                  </div>
                  <div className="h-2 bg-[var(--card)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${item.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-[var(--accent)]" size={20} />
              <h3 className="font-bold text-[var(--text)]">Achievements</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {achievements.map(achievement => (
                <div key={achievement.id} className={`p-3 rounded-lg border ${
                  achievement.earned ? 'border-green-500/30 bg-green-500/10' : 'border-[var(--border)] bg-[var(--card)]'
                }`}>
                  <div className="text-2xl mb-1">{achievement.icon}</div>
                  <p className="text-sm font-semibold text-[var(--text)]">{achievement.name}</p>
                  {achievement.earned ? (
                    <p className="text-xs text-green-500 mt-1">✓ Earned</p>
                  ) : (
                    <div className="mt-2">
                      <div className="h-1 bg-[var(--card)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${achievement.progress}%` }}></div>
                      </div>
                      <p className="text-xs text-[var(--subtle)] mt-1">{achievement.progress}%</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Health */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Battery className="text-[var(--accent)]" size={20} />
            <h3 className="font-bold text-[var(--text)]">Vehicle Health</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-[var(--subtle)]">Fuel Level</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-[var(--card)] rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${vehicleHealth.fuelLevel}%` }}></div>
                </div>
                <span className="text-sm font-semibold">{vehicleHealth.fuelLevel}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--subtle)]">Battery Health</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-[var(--card)] rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${vehicleHealth.batteryHealth}%` }}></div>
                </div>
                <span className="text-sm font-semibold">{vehicleHealth.batteryHealth}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--subtle)]">Tire Pressure</p>
              <p className="font-semibold text-[var(--text)]">{vehicleHealth.tirePressure} PSI</p>
            </div>
            <div>
              <p className="text-xs text-[var(--subtle)]">Engine Status</p>
              <p className="font-semibold text-green-500">{vehicleHealth.engineStatus}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--subtle)]">Next Service</p>
              <p className="font-semibold text-[var(--text)]">{new Date(vehicleHealth.nextService).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Emergency & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <PhoneCall className="text-red-500" size={20} />
              <h3 className="font-bold text-[var(--text)]">Emergency Contacts</h3>
            </div>
            <div className="space-y-2">
              {emergencyContacts.map(contact => (
                <div key={contact.name} className="flex items-center justify-between p-3 bg-[var(--card)] rounded-lg">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{contact.name}</p>
                    <p className="text-sm text-[var(--subtle)]">{contact.number}</p>
                  </div>
                  <button 
                    onClick={() => window.location.href = `tel:${contact.number}`}
                    className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-sm hover:bg-red-500/20"
                  >
                    Call
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={20} />
              <h3 className="font-bold text-[var(--text)]">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={triggerSOS}
                className="flex items-center justify-center gap-2 p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <AlertTriangle size={18} />
                SOS Emergency
              </button>
              <button
                onClick={reportRoadHazard}
                className="flex items-center justify-center gap-2 p-3 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20 transition-colors"
              >
                <Camera size={18} />
                Report Hazard
              </button>
              <button 
                onClick={shareCurrentLocation}
                className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                <Map size={18} />
                Share Location
              </button>
              <button 
                onClick={() => requestRouteUpdate()}
                className="flex items-center justify-center gap-2 p-3 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors"
              >
                <Navigation size={18} />
                Get Route
              </button>
            </div>
          </div>
        </div>

        {/* Recent Trips */}
        {tripHistory.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="text-[var(--accent)]" size={20} />
              <h3 className="font-bold text-[var(--text)]">Recent Trips</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tripHistory.slice(0, 5).map(trip => (
                <div key={trip.id} className="flex items-center justify-between p-3 bg-[var(--card)] rounded-lg">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{new Date(trip.startTime).toLocaleDateString()}</p>
                    <p className="text-xs text-[var(--subtle)]">{trip.distance} km • {trip.duration} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--accent)]">+{Math.floor(trip.duration * 2)} pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DriverDashboard;
