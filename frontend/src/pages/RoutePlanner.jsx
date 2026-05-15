import React, { useState } from 'react';
import axios from 'axios';
import SectionHeader from '../components/SectionHeader';
import Breadcrumb from '../components/Breadcrumb';
import { MapPin, Navigation, Info } from 'lucide-react';

// ── Node positions (fixed 2D grid layout) ────────────────────────────────────
const NODE_POSITIONS = {
  A: { x: 50,   y: 150 },
  B: { x: 150,  y: 80 },
  C: { x: 250,  y: 80 },
  D: { x: 150,  y: 220 },
  E: { x: 250,  y: 220 },
  F: { x: 350,  y: 80 },
  G: { x: 350,  y: 220 },
  H: { x: 450,  y: 150 },
};

// ── City graph edges ─────────────────────────────────────────────────────────
const EDGES = [
  ['A', 'B'], ['B', 'C'], ['C', 'D'],
  ['D', 'E'], ['E', 'F'], ['F', 'G'],
  ['G', 'H'], ['H', 'A'], ['B', 'F'],
  ['C', 'G'], ['D', 'H']
];

// ── SVG Graph Visualization ──────────────────────────────────────────────────
const GraphVisualization = ({ route, params }) => {
  const svgWidth = 520;
  const svgHeight = 300;

  // Helper to check if an edge is in a path
  const isEdgeInPath = (from, to, path) => {
    for (let i = 0; i < path.length - 1; i++) {
      if ((path[i] === from && path[i + 1] === to) || 
          (path[i] === to && path[i + 1] === from)) {
        return true;
      }
    }
    return false;
  };

  const startNode = params.start;
  const endNode = params.end;
  const fastestPath = route?.fastest?.path || [];
  const safestPath = route?.safest?.path || [];

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h3 className="font-bold mb-4 text-white">Network Visualization</h3>
      
      <svg width="100%" height="auto" viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
           className="border border-slate-700 rounded-lg bg-slate-900/50"
           style={{ minHeight: '320px' }}>
        
        {/* ── Draw edges (gray by default) ── */}
        {EDGES.map((edge, idx) => {
          const [from, to] = edge;
          const start = NODE_POSITIONS[from];
          const end = NODE_POSITIONS[to];
          
          const isFastest = isEdgeInPath(from, to, fastestPath);
          const isSafest = isEdgeInPath(from, to, safestPath);
          
          let strokeColor = '#64748b';   // gray
          let strokeWidth = 1.5;
          let strokeDasharray = 'none';
          let strokeDashoffset = 0;
          let animationClass = '';

          if (isFastest) {
            strokeColor = '#60a5fa';     // blue
            strokeWidth = 2.5;
            animationClass = 'animate-dash-fastest';
            strokeDasharray = '8 4';
          } else if (isSafest) {
            strokeColor = '#4ade80';     // green
            strokeWidth = 2.5;
            animationClass = 'animate-dash-safest';
            strokeDasharray = '8 4';
          }

          return (
            <g key={`edge-${idx}`}>
              {/* Define animation keyframes */}
              <style>{`
                @keyframes dash-anim {
                  to { stroke-dashoffset: -12px; }
                }
                .animate-dash-fastest {
                  animation: dash-anim 1s linear infinite;
                }
                .animate-dash-safest {
                  animation: dash-anim 1s linear infinite;
                }
              `}</style>
              
              {/* Edge line */}
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                className={animationClass}
                style={{ 
                  transition: 'stroke 0.3s ease',
                  opacity: isFastest || isSafest ? 1 : 0.6
                }}
              />
            </g>
          );
        })}

        {/* ── Draw nodes ── */}
        {Object.entries(NODE_POSITIONS).map(([nodeId, pos]) => {
          const isStart = nodeId === startNode;
          const isEnd = nodeId === endNode;
          
          let fillColor = '#ffffff';      // default white
          let borderColor = '#1e293b';    // dark border
          
          if (isStart) {
            fillColor = '#22c55e';        // green for start
            borderColor = '#16a34a';
          } else if (isEnd) {
            fillColor = '#ef4444';        // red for end
            borderColor = '#dc2626';
          }

          return (
            <g key={`node-${nodeId}`}>
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={18}
                fill={fillColor}
                stroke={borderColor}
                strokeWidth={2}
                style={{ transition: 'all 0.3s ease' }}
              />
              {/* Node label */}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isStart || isEnd ? '#ffffff' : '#1e293b'}
                fontSize={14}
                fontWeight={700}
                fontFamily="monospace"
              >
                {nodeId}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Legend ── */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-blue-400"></div>
          <span className="text-slate-400">Fastest Route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-green-400"></div>
          <span className="text-slate-400">Safest Route</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span className="text-slate-400">Start</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <span className="text-slate-400">End</span>
        </div>
      </div>
    </div>
  );
};

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
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Route Planner' }]} />
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

              {/* Graph Visualization */}
              <GraphVisualization route={route} params={params} />
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
