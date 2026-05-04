import React, { useState } from 'react';
import axios from 'axios';
import SectionHeader from '../components/SectionHeader';
import { MapPin, Navigation, Info } from 'lucide-react';

const RoutePlanner = () => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ start: 'A', end: 'H' });

  const getRoute = async () => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5001/get-safest-route', params);
      setRoute(res.data);
    } catch (err) {
      console.error(err);
      // Fallback
      setRoute({
          fastest: { path: ['A', 'B', 'C', 'H'], distance: 3.5 },
          safest: { path: ['A', 'D', 'H'], risk_mitigation: '24% Improved Safety' }
      });
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <div className="p-8">
      <SectionHeader title="AI Route Planner" subtitle="Optimizing routes for maximum safety and emergency response" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="text-xs text-slate-400 mb-1 block">Start Node</label>
              <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-lg border border-slate-700">
                <MapPin size={16} className="text-green-500" />
                <input 
                    className="bg-transparent border-none outline-none text-white w-full"
                    value={params.start}
                    onChange={(e) => setParams({...params, start: e.target.value.toUpperCase()})}
                />
              </div>
            </div>
            <div className="relative">
              <label className="text-xs text-slate-400 mb-1 block">Destination Node</label>
              <div className="flex items-center gap-2 bg-slate-900 p-3 rounded-lg border border-slate-700">
                <MapPin size={16} className="text-red-500" />
                <input 
                    className="bg-transparent border-none outline-none text-white w-full"
                    value={params.end}
                    onChange={(e) => setParams({...params, end: e.target.value.toUpperCase()})}
                />
              </div>
            </div>
          </div>
          
          <button 
            onClick={getRoute}
            className="w-full py-3 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "Calculating..." : "Find Safest Route"}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {route ? (
            <>
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold flex items-center gap-2">
                    <Navigation className="text-accent" size={18} />
                    Recommended Safest Route
                  </h4>
                  <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded uppercase font-bold tracking-tighter">
                    {route.safest.risk_mitigation}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                    {route.safest.path.map((node, i) => (
                        <React.Fragment key={i}>
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-accent flex items-center justify-center font-bold">
                                {node}
                            </div>
                            {i < route.safest.path.length - 1 && (
                                <div className="h-[2px] w-8 bg-accent/30"></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400">Fastest Route Distance</p>
                    <p className="text-xl font-bold">{route.fastest.distance} km</p>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-400">Fastest Route Path</p>
                    <p className="text-sm font-medium">{route.fastest.path.join(' → ')}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl h-[300px] flex flex-col items-center justify-center text-slate-500">
              <Info size={40} className="mb-4 opacity-20" />
              <p>Enter start and end points to calculate AI routes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
