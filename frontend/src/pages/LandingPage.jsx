import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowRight, ChevronDown, Sun, Moon, FileText, Zap, MapPin, Car, AlertTriangle } from 'lucide-react';
import trafficImage from '../assets/pexels-pamanjoe-18622859.jpg';

const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    navigate('/login');
  };

  const stats = [
    { value: '50K+', label: 'Vehicles Monitored', icon: Car },
    { value: '98%', label: 'Detection Accuracy', icon: Zap },
    { value: '24/7', label: 'Real-time Monitoring', icon: AlertTriangle },
    { value: '100+', label: 'Cities Deployed', icon: MapPin }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[var(--surface)]/95 backdrop-blur-md shadow-lg border-b border-[var(--border)]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <span className="text-2xl">🚦</span>
              </div>
              <span className="font-bold text-xl text-[var(--text)]">SafeCity AI</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-[var(--subtle)] hover:text-[var(--accent)] transition-colors">Home</a>
              <a href="#stats" className="text-[var(--subtle)] hover:text-[var(--accent)] transition-colors">Stats</a>
              <a href="#about" className="text-[var(--subtle)] hover:text-[var(--accent)] transition-colors">About</a>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={toggle}
                className="p-2 rounded-lg bg-[var(--card)] text-[var(--subtle)] hover:text-[var(--accent)] transition-colors"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={handleGetStarted}
                className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold hover:bg-[var(--accent)]/80 transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Minimal */}
      <section id="home" className="pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/20 rounded-full mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-[var(--accent)] font-semibold">AI-Powered Traffic Controlling System</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text)] mb-4 leading-tight">
            SmartCity AI-
            <span className="text-[var(--accent)]"> Smarter Traffic, Safer Cities</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--subtle)] mb-6 max-w-2xl mx-auto">
            Real-time traffic monitoring, automated E-challan system, and AI-powered analytics
          </p>
          
          <button
            onClick={handleGetStarted}
            className="group px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-semibold text-lg hover:bg-[var(--accent)]/90 transition-all inline-flex items-center gap-2"
          >
            Get Started
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Full Width Image Section - Moved Up */}
      <section className="w-full px-0">
        <div className="w-full">
          <img 
            src={trafficImage}
            alt="Traffic Management System"
            className="w-full h-[50vh] md:h-[60vh] lg:h-[70vh] object-cover"
          />
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-16 px-4 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => {
              const IconComponent = stat.icon;
              return (
                <div key={idx} className="text-center">
                  <div className="flex justify-center mb-3">
                    <IconComponent size={24} className="text-[var(--accent)]" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-[var(--accent)]">{stat.value}</div>
                  <div className="text-sm text-[var(--subtle)] mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">About SafeCity AI</h2>
              <p className="text-[var(--subtle)] mb-6 leading-relaxed">
                SafeCity AI is an intelligent traffic controlling system that uses artificial intelligence and computer vision 
                to monitor traffic, detect violations, and manage E-challans automatically. Our system helps cities reduce 
                traffic congestion, improve road safety, and enforce traffic rules efficiently.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[var(--accent)]/20 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[var(--accent)] rounded-full"></div>
                  </div>
                  <span className="text-[var(--text)]">Real-time vehicle detection and tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[var(--accent)]/20 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[var(--accent)] rounded-full"></div>
                  </div>
                  <span className="text-[var(--text)]">Automatic violation detection and E-challan generation</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[var(--accent)]/20 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[var(--accent)] rounded-full"></div>
                  </div>
                  <span className="text-[var(--text)]">AI-powered traffic prediction and congestion alerts</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[var(--accent)]/20 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[var(--accent)] rounded-full"></div>
                  </div>
                  <span className="text-[var(--text)]">Driver behavior monitoring and safety scoring</span>
                </li>
              </ul>
            </div>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={24} className="text-[var(--accent)]" />
                  <h3 className="font-bold text-[var(--text)]">E-Challan Sample</h3>
                </div>
                <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-semibold">UNPAID</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--subtle)]">Vehicle Number</span>
                  <span className="font-mono font-bold text-[var(--text)]">ABC-1234</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--subtle)]">Violation Type</span>
                  <span className="text-red-500 font-semibold">Speeding (85/60 km/h)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--subtle)]">Location</span>
                  <span className="text-[var(--text)]">Committee Chowk, Islamabad</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--subtle)]">Date & Time</span>
                  <span className="text-[var(--text)]">15 May 2026, 10:30 AM</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[var(--subtle)] font-semibold">Fine Amount</span>
                  <span className="text-[var(--accent)] font-bold text-xl">₹1,500</span>
                </div>
              </div>
              <button className="w-full mt-4 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold hover:bg-[var(--accent)]/80 transition-all">
                Pay Online
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-[var(--accent)]/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4">Ready to transform your city's traffic?</h2>
          <p className="text-[var(--subtle)] mb-8">Join leading cities using SafeCity AI for smarter traffic management</p>
          <button
            onClick={handleGetStarted}
            className="px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-semibold text-lg hover:bg-[var(--accent)]/90 transition-all inline-flex items-center gap-2"
          >
            Get Started
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[var(--subtle)] text-sm">© 2026 SafeCity AI-Smarter Traffic, Safer Citiesm</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;