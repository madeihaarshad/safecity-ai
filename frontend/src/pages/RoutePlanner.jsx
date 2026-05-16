import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import { MapPin, Navigation, Info, Trash2, Map as MapIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── Node positions (Islamabad center approx grid) ────────────────────────────
const NODE_COORDS = {
  A: { lat: 33.6900, lng: 73.0400 },
  B: { lat: 33.6900, lng: 73.0550 },
  C: { lat: 33.6900, lng: 73.0700 },
  D: { lat: 33.6800, lng: 73.0400 },
  E: { lat: 33.6800, lng: 73.0550 },
  F: { lat: 33.6800, lng: 73.0700 },
  G: { lat: 33.6700, lng: 73.0400 },
  H: { lat: 33.6700, lng: 73.0550 },
};

const DEFAULT_CENTER = { lat: 33.6844, lng: 73.0479 };

// ─────────────────────────────────────────────────────────────────────────────
// THE FIX: Load Google Maps dynamically from inside JSX.
// Vite replaces import.meta.env.VITE_* in JS/JSX files — but NOT in index.html.
// So we remove the <script> from index.html and inject it here instead.
// ─────────────────────────────────────────────────────────────────────────────
let googleMapsPromise = null;

function loadGoogleMaps() {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    // Remove any broken script left over from index.html (key was never substituted)
    document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach(s => s.remove());

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google Maps failed to load. Check your API key in frontend/.env'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

const RoutePlanner = () => {
  const { theme } = useTheme();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const startMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const fastestPolylineRef = useRef(null);
  const safestPolylineRef = useRef(null);

  const startInputRef = useRef(null);
  const destInputRef = useRef(null);

  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  const [params, setParams] = useState({ start: null, end: null });
  const [mode, setMode] = useState(null); // 'start' | 'end'

  // ── Step 1: Load the Maps script ─────────────────────────────────────────
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapReady(true))
      .catch((err) => setMapError(err.message));
  }, []);

  // ── Step 2: Initialize map once script is ready ───────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      styles: theme === 'dark' ? [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
        { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
        { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
        { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
      ] : [],
      disableDefaultUI: true,
      zoomControl: true,
    });

    mapInstanceRef.current.addListener('click', (e) => {
      handleMapClick(e.latLng);
    });

    setupAutocomplete(startInputRef.current, 'start');
    setupAutocomplete(destInputRef.current, 'end');
  }, [mapReady]);

  // ── Update map style on theme change ─────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setOptions({
      styles: theme === 'dark' ? [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
      ] : [],
    });
  }, [theme]);

  // ── Autocomplete setup ────────────────────────────────────────────────────
  const setupAutocomplete = (inputEl, type) => {
    if (!inputEl || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
      componentRestrictions: { country: 'PK' },
      fields: ['geometry', 'formatted_address', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      const pointData = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address || place.name,
        node: type === 'start' ? 'A' : 'H',
      };

      if (type === 'start') {
        if (startMarkerRef.current) startMarkerRef.current.setMap(null);
        startMarkerRef.current = new window.google.maps.Marker({
          position: place.geometry.location,
          map: mapInstanceRef.current,
          icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
          title: 'Start',
          animation: window.google.maps.Animation.DROP,
        });
        setParams(prev => ({ ...prev, start: pointData }));
      } else {
        if (destMarkerRef.current) destMarkerRef.current.setMap(null);
        destMarkerRef.current = new window.google.maps.Marker({
          position: place.geometry.location,
          map: mapInstanceRef.current,
          icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          title: 'Destination',
          animation: window.google.maps.Animation.DROP,
        });
        setParams(prev => ({ ...prev, end: pointData }));
      }

      mapInstanceRef.current.panTo(place.geometry.location);
      mapInstanceRef.current.setZoom(15);
    });
  };

  // ── Map click handler ─────────────────────────────────────────────────────
  const handleMapClick = (latLng) => {
    setMode(currentMode => {
      if (!currentMode) return null;

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: latLng }, (results, status) => {
        let address = `${latLng.lat().toFixed(4)}, ${latLng.lng().toFixed(4)}`;
        if (status === 'OK' && results[0]) {
          address = results[0].formatted_address;
        }

        const pointData = {
          lat: latLng.lat(),
          lng: latLng.lng(),
          address,
          node: currentMode === 'start' ? 'A' : 'H',
        };

        if (currentMode === 'start') {
          if (startMarkerRef.current) startMarkerRef.current.setMap(null);
          startMarkerRef.current = new window.google.maps.Marker({
            position: latLng,
            map: mapInstanceRef.current,
            icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
            title: 'Start',
          });
          setParams(prev => ({ ...prev, start: pointData }));
          if (startInputRef.current) startInputRef.current.value = address;
        } else if (currentMode === 'end') {
          if (destMarkerRef.current) destMarkerRef.current.setMap(null);
          destMarkerRef.current = new window.google.maps.Marker({
            position: latLng,
            map: mapInstanceRef.current,
            icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            title: 'Destination',
          });
          setParams(prev => ({ ...prev, end: pointData }));
          if (destInputRef.current) destInputRef.current.value = address;
        }
      });

      return null; // turn off mode after pin placed
    });
  };

  const clearMarkers = () => {
    if (startMarkerRef.current) startMarkerRef.current.setMap(null);
    if (destMarkerRef.current) destMarkerRef.current.setMap(null);
    if (fastestPolylineRef.current) fastestPolylineRef.current.setMap(null);
    if (safestPolylineRef.current) safestPolylineRef.current.setMap(null);
    setParams({ start: null, end: null });
    setRoute(null);
    setMode(null);
    if (startInputRef.current) startInputRef.current.value = '';
    if (destInputRef.current) destInputRef.current.value = '';
  };

  // ── Draw routes ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!route || !mapInstanceRef.current) return;

    if (fastestPolylineRef.current) fastestPolylineRef.current.setMap(null);
    if (safestPolylineRef.current) safestPolylineRef.current.setMap(null);

    const fastestCoords = route.fastest.path.map(node => NODE_COORDS[node] || NODE_COORDS['A']);
    const safestCoords = route.safest.path.map(node => NODE_COORDS[node] || NODE_COORDS['A']);

    fastestPolylineRef.current = new window.google.maps.Polyline({
      path: fastestCoords,
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstanceRef.current,
    });

    safestPolylineRef.current = new window.google.maps.Polyline({
      path: safestCoords,
      geodesic: true,
      strokeColor: '#22c55e',
      strokeOpacity: 1.0,
      strokeWeight: 6,
      map: mapInstanceRef.current,
    });

    const bounds = new window.google.maps.LatLngBounds();
    safestCoords.forEach(coord => bounds.extend(coord));
    fastestCoords.forEach(coord => bounds.extend(coord));
    if (params.start) bounds.extend({ lat: params.start.lat, lng: params.start.lng });
    if (params.end) bounds.extend({ lat: params.end.lat, lng: params.end.lng });
    mapInstanceRef.current.fitBounds(bounds, { padding: 60 });
  }, [route]);

  // ── Fetch route from backend ──────────────────────────────────────────────
  const getRoute = async () => {
    if (!params.start || !params.end) return;
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5001/get-safest-route', {
        start: params.start.node || 'A',
        end: params.end.node || 'H',
      });
      setRoute(res.data);
    } catch (err) {
      console.error(err);
      // Fallback demo data so UI still shows while backend is offline
      setRoute({
        fastest: { path: ['A', 'B', 'C', 'H'], distance: 3.5 },
        safest: { path: ['A', 'D', 'H'], risk_mitigation: '24% Improved Safety' },
      });
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  // ── Error screen ──────────────────────────────────────────────────────────
  if (mapError) {
    return (
      <div className="p-8">
        <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Route Planner' }]} />
        <SectionHeader title="AI Route Planner" subtitle="Interactive map routing for maximum safety" />
        <div className="flex flex-col items-center justify-center h-96 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
          <div className="text-5xl mb-4">🗺️</div>
          <h3 className="text-lg font-bold text-[var(--text)] mb-2">Maps Failed to Load</h3>
          <p className="text-sm text-[var(--subtle)] text-center max-w-md px-6 mb-4">{mapError}</p>
          <div className="px-4 py-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs font-mono text-[var(--subtle)]">
            frontend/.env → VITE_GOOGLE_MAPS_API_KEY=AIza...
          </div>
          <p className="text-xs text-[var(--subtle)] mt-3">Then restart: <span className="font-mono">npm run dev</span></p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Route Planner' }]} />
      <SectionHeader title="AI Route Planner" subtitle="Interactive map routing for maximum safety and emergency response" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left Panel ── */}
        <div className="lg:col-span-1 p-6 rounded-xl border space-y-6 flex flex-col h-full bg-[var(--surface)] border-[var(--border)] shadow-sm">

          <div className="space-y-4">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-[var(--text)]">
              <MapIcon className="text-[var(--subtle)]" size={18} />
              Route Details
            </h3>

            {/* Start input */}
            <div className="relative">
              <label className="text-xs text-[var(--subtle)] mb-1 block">Start Address</label>
              <div className="flex items-center gap-3 p-3 rounded-lg border focus-within:ring-2 focus-within:ring-[var(--accent)] transition-all bg-[var(--card)] border-[var(--border)]">
                <MapPin size={18} className="text-green-500 shrink-0" />
                <input
                  ref={startInputRef}
                  type="text"
                  placeholder="Type to search start location..."
                  className="bg-transparent border-none focus:outline-none text-sm w-full text-[var(--text)] placeholder:text-[var(--subtle)]"
                />
              </div>
              {params.start && (
                <p className="text-xs text-green-400 mt-1 truncate px-1">✓ {params.start.address}</p>
              )}
            </div>

            {/* Destination input */}
            <div className="relative">
              <label className="text-xs text-[var(--subtle)] mb-1 block">Destination Address</label>
              <div className="flex items-center gap-3 p-3 rounded-lg border focus-within:ring-2 focus-within:ring-[var(--accent)] transition-all bg-[var(--card)] border-[var(--border)]">
                <MapPin size={18} className="text-red-500 shrink-0" />
                <input
                  ref={destInputRef}
                  type="text"
                  placeholder="Type to search destination..."
                  className="bg-transparent border-none focus:outline-none text-sm w-full text-[var(--text)] placeholder:text-[var(--subtle)]"
                />
              </div>
              {params.end && (
                <p className="text-xs text-red-400 mt-1 truncate px-1">✓ {params.end.address}</p>
              )}
            </div>

            <p className="text-xs text-[var(--subtle)] italic">
              💡 Type an address for suggestions, or use the map buttons to drop a pin.
            </p>

            {(params.start || params.end) && (
              <button
                onClick={clearMarkers}
                className="w-full py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 mt-2 bg-[var(--card)] text-[var(--subtle)] hover:bg-[var(--border)] hover:text-[var(--text)]"
              >
                <Trash2 size={14} /> Clear Selection
              </button>
            )}
          </div>

          <div className="flex-grow" />

          {route && (
            <div className="p-4 rounded-xl border space-y-4 mb-4 bg-[var(--card)] border-[var(--border)]">
              <h4 className="font-bold flex items-center gap-2 text-sm text-[var(--text)]">
                <Navigation className="text-green-400" size={16} />
                Route Summary
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg border bg-[var(--surface)] border-[var(--border)]">
                  <p className="text-[10px] text-[var(--subtle)] uppercase tracking-wider mb-1">Risk Mitigated</p>
                  <p className="text-sm font-bold text-green-400">{route.safest.risk_mitigation}</p>
                </div>
                <div className="p-3 rounded-lg border bg-[var(--surface)] border-[var(--border)]">
                  <p className="text-[10px] text-[var(--subtle)] uppercase tracking-wider mb-1">Fastest Dist</p>
                  <p className="text-sm font-bold text-blue-400">{route.fastest.distance} km</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={getRoute}
            disabled={!params.start || !params.end || loading}
            className={`w-full py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${params.start && params.end && !loading
                ? 'bg-[var(--accent)] text-navy hover:bg-[var(--accent-light)] accent-glow'
                : 'bg-[var(--card)] text-[var(--subtle)] cursor-not-allowed opacity-50'
              }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Navigation size={16} />
                Find Safest Route
              </>
            )}
          </button>
        </div>

        {/* ── Right Panel: Map ── */}
        <div className="lg:col-span-2 space-y-4">

          <div className="flex items-center gap-4 p-2 rounded-xl border bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <button
              onClick={() => setMode(m => m === 'start' ? null : 'start')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all ${mode === 'start'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-[var(--card)] text-[var(--subtle)] border border-transparent hover:bg-[var(--border)] hover:text-[var(--text)]'
                }`}
            >
              📍 {mode === 'start' ? 'Click map to pin start...' : 'Pin Start on Map'}
            </button>
            <button
              onClick={() => setMode(m => m === 'end' ? null : 'end')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all ${mode === 'end'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-[var(--card)] text-[var(--subtle)] border border-transparent hover:bg-[var(--border)] hover:text-[var(--text)]'
                }`}
            >
              🏁 {mode === 'end' ? 'Click map to pin destination...' : 'Pin Destination on Map'}
            </button>
          </div>

          <div
            ref={mapRef}
            className="w-full h-[600px] rounded-xl border overflow-hidden relative bg-[var(--card)] border-[var(--border)] shadow-sm"
          >
            {!mapReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--subtle)] bg-[var(--card)] z-10">
                <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse">Loading Google Maps...</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 text-xs py-3 rounded-xl border bg-[var(--surface)] border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded bg-blue-500" />
              <span className="text-[var(--subtle)]">Fastest Route</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1.5 rounded bg-green-500" />
              <span className="text-[var(--subtle)]">Safest Route</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RoutePlanner;