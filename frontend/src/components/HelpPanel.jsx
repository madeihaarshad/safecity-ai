import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const AccordionItem = ({ title, content, isOpen, onToggle }) => {
  return (
    <div className="border-b border-slate-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-slate-950/50 text-sm text-slate-300 leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
};

const HelpPanel = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [openSection, setOpenSection] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset open section when page changes
  useEffect(() => {
    setOpenSection(0);
  }, [location.pathname]);

  const getHelpContent = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Dashboard Help',
          sections: [
            {
              title: 'Understanding KPIs',
              content: (
                <>
                  <p className="mb-2">
                    <strong>Total Fleet:</strong> Shows the number of active registered vehicles currently monitored by the system.
                  </p>
                  <p className="mb-2">
                    <strong>Violations (24h):</strong> Displays traffic and safety violations recorded in the last 24 hours, with trend comparison to the previous day.
                  </p>
                  <p className="mb-2">
                    <strong>Disaster Events:</strong> Counts ongoing environmental or infrastructure emergencies requiring immediate attention.
                  </p>
                  <p>
                    <strong>AI Risk Index:</strong> An aggregated threat level calculated from predictive models analyzing sensor data, traffic patterns, and historical incidents.
                  </p>
                </>
              ),
            },
            {
              title: 'Risk Index Explained',
              content: (
                <>
                  <p className="mb-2">
                    The AI Risk Index updates every 30 seconds based on live sensor data from across the city. It combines multiple factors:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Traffic congestion levels</li>
                    <li>Weather conditions and environmental sensors</li>
                    <li>Historical accident patterns</li>
                    <li>Active violations and incidents</li>
                  </ul>
                  <p className="mt-2">
                    Risk levels: <span className="text-green-400">SAFE</span> (0-30), <span className="text-yellow-400">WARNING</span> (31-60), <span className="text-red-400">CRITICAL</span> (61-100).
                  </p>
                </>
              ),
            },
            {
              title: 'Alert Priorities',
              content: (
                <>
                  <p className="mb-2">Alerts are categorized by priority level:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><span className="text-red-400 font-semibold">Critical:</span> Immediate action required (e.g., flash floods, wrong-way drivers)</li>
                    <li><span className="text-orange-400 font-semibold">High:</span> Urgent attention needed (e.g., speed violations, sensor failures)</li>
                    <li><span className="text-blue-400 font-semibold">Normal:</span> Standard monitoring events (e.g., traffic congestion)</li>
                    <li><span className="text-green-400 font-semibold">Low:</span> Informational updates</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Charts & Visualizations',
              content: (
                <>
                  <p className="mb-2">
                    <strong>Accident Probability Forecast:</strong> Shows predicted accident risk over a 24-hour rolling window. Higher percentages indicate elevated risk based on AI analysis.
                  </p>
                  <p>
                    <strong>Traffic Volume by Zone:</strong> Real-time vehicle counts across city zones. Helps identify congestion hotspots and traffic flow patterns.
                  </p>
                </>
              ),
            },
          ],
        };

      case '/violations':
        return {
          title: 'Violations Help',
          sections: [
            {
              title: 'Understanding Columns',
              content: (
                <>
                  <p className="mb-2">The violations table displays:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Driver:</strong> Name of the driver involved</li>
                    <li><strong>Type:</strong> Category of violation (speeding, red light, etc.)</li>
                    <li><strong>Severity:</strong> Impact level (Low, Medium, High, Critical)</li>
                    <li><strong>Location:</strong> Where the violation occurred</li>
                    <li><strong>Time:</strong> When the incident was recorded</li>
                    <li><strong>Status:</strong> Current processing state (Pending, Reviewed, Resolved)</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Filter Options',
              content: (
                <>
                  <p className="mb-2">Use filters to narrow down violations:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Severity Filter:</strong> Show only violations of specific severity levels</li>
                    <li><strong>Type Filter:</strong> Filter by violation category</li>
                    <li><strong>Date Range:</strong> View violations within a specific time period</li>
                    <li><strong>Status Filter:</strong> Show pending, reviewed, or resolved cases</li>
                  </ul>
                  <p className="mt-2">Click column headers to sort the table by that field.</p>
                </>
              ),
            },
            {
              title: 'Severity Levels',
              content: (
                <>
                  <p className="mb-2">Violations are classified by severity:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><span className="text-red-400 font-semibold">Critical:</span> Extreme danger (e.g., 50+ km/h over limit, wrong-way driving)</li>
                    <li><span className="text-orange-400 font-semibold">High:</span> Serious safety risk (e.g., 30+ km/h over limit, running red lights)</li>
                    <li><span className="text-yellow-400 font-semibold">Medium:</span> Moderate violation (e.g., 15-30 km/h over limit)</li>
                    <li><span className="text-green-400 font-semibold">Low:</span> Minor infraction (e.g., parking violations, minor speeding)</li>
                  </ul>
                </>
              ),
            },
          ],
        };

      case '/disasters':
        return {
          title: 'Disaster Hub Help',
          sections: [
            {
              title: 'Event Types',
              content: (
                <>
                  <p className="mb-2">The system monitors various disaster categories:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Flood:</strong> Water-related emergencies, flash floods, river overflow</li>
                    <li><strong>Fire:</strong> Building fires, wildfires, industrial fires</li>
                    <li><strong>Earthquake:</strong> Seismic activity and aftershocks</li>
                    <li><strong>Storm:</strong> Severe weather, high winds, lightning</li>
                    <li><strong>Hazmat:</strong> Chemical spills, toxic material incidents</li>
                    <li><strong>Infrastructure:</strong> Power outages, structural failures</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Recommended Responses',
              content: (
                <>
                  <p className="mb-2">Each event type has standard response protocols:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Flood:</strong> Evacuate low-lying areas, close affected roads, deploy rescue teams</li>
                    <li><strong>Fire:</strong> Alert fire services, establish perimeter, evacuate buildings</li>
                    <li><strong>Earthquake:</strong> Check infrastructure, assess damage, provide medical aid</li>
                    <li><strong>Storm:</strong> Issue warnings, secure loose objects, shelter in place</li>
                    <li><strong>Hazmat:</strong> Establish exclusion zone, deploy hazmat teams, evacuate radius</li>
                  </ul>
                  <p className="mt-2">Always follow your organization's emergency response procedures.</p>
                </>
              ),
            },
            {
              title: 'Status Indicators',
              content: (
                <>
                  <p className="mb-2">Disaster events progress through status stages:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><span className="text-red-400 font-semibold">Active:</span> Event is ongoing, response in progress</li>
                    <li><span className="text-yellow-400 font-semibold">Monitoring:</span> Situation stabilized, continued observation</li>
                    <li><span className="text-green-400 font-semibold">Resolved:</span> Event concluded, area safe</li>
                  </ul>
                </>
              ),
            },
          ],
        };

      case '/map':
        return {
          title: 'Live Map Help',
          sections: [
            {
              title: 'Sensor Colors',
              content: (
                <>
                  <p className="mb-2">Sensors are color-coded by status and readings:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><span className="text-green-400 font-semibold">Green:</span> Normal operation, safe readings</li>
                    <li><span className="text-yellow-400 font-semibold">Yellow:</span> Elevated readings, monitoring required</li>
                    <li><span className="text-orange-400 font-semibold">Orange:</span> High readings, potential concern</li>
                    <li><span className="text-red-400 font-semibold">Red:</span> Critical readings, immediate attention needed</li>
                    <li><span className="text-slate-400 font-semibold">Gray:</span> Sensor offline or no data</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Cluster Icons',
              content: (
                <>
                  <p className="mb-2">
                    When multiple sensors are close together, they're grouped into clusters. The cluster icon shows:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Number:</strong> How many sensors are in the cluster</li>
                    <li><strong>Color:</strong> Highest severity level among clustered sensors</li>
                  </ul>
                  <p className="mt-2">Click a cluster to zoom in and see individual sensors.</p>
                </>
              ),
            },
            {
              title: 'Map Controls',
              content: (
                <>
                  <p className="mb-2">Navigate the map using:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Zoom:</strong> Use +/- buttons or mouse wheel</li>
                    <li><strong>Pan:</strong> Click and drag to move around</li>
                    <li><strong>Layers:</strong> Toggle different data layers (traffic, sensors, incidents)</li>
                    <li><strong>Search:</strong> Find specific locations or sensor IDs</li>
                  </ul>
                </>
              ),
            },
          ],
        };

      case '/drivers':
        return {
          title: 'Drivers Help',
          sections: [
            {
              title: 'Driver Profiles',
              content: (
                <>
                  <p className="mb-2">Each driver profile includes:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>License Number:</strong> Unique driver identification</li>
                    <li><strong>Vehicle Info:</strong> Assigned vehicle details</li>
                    <li><strong>Violation History:</strong> Past infractions and penalties</li>
                    <li><strong>Risk Score:</strong> Calculated based on driving behavior</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Risk Scoring',
              content: (
                <>
                  <p className="mb-2">
                    Driver risk scores are calculated from multiple factors including violation frequency, severity, and driving patterns. Higher scores indicate higher risk.
                  </p>
                </>
              ),
            },
          ],
        };

      case '/analytics':
        return {
          title: 'AI Analytics Help',
          sections: [
            {
              title: 'Predictive Models',
              content: (
                <>
                  <p className="mb-2">
                    The AI engine uses machine learning models trained on historical data to predict:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Accident probability by time and location</li>
                    <li>Traffic congestion patterns</li>
                    <li>High-risk driver behavior</li>
                    <li>Disaster likelihood based on environmental factors</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Data Sources',
              content: (
                <>
                  <p className="mb-2">Analytics are generated from:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Real-time sensor data (speed, weather, traffic flow)</li>
                    <li>Historical incident records</li>
                    <li>Driver behavior patterns</li>
                    <li>External data feeds (weather, events)</li>
                  </ul>
                </>
              ),
            },
          ],
        };

      case '/planner':
        return {
          title: 'Route Planner Help',
          sections: [
            {
              title: 'Route Optimization',
              content: (
                <>
                  <p className="mb-2">
                    The route planner calculates optimal paths considering:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Current traffic conditions</li>
                    <li>Active incidents and road closures</li>
                    <li>Predicted congestion</li>
                    <li>Safety risk scores</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Using the Planner',
              content: (
                <>
                  <p className="mb-2">To plan a route:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Enter start and end locations</li>
                    <li>Select route preferences (fastest, safest, shortest)</li>
                    <li>Review suggested routes with risk indicators</li>
                    <li>Choose your preferred route</li>
                  </ol>
                </>
              ),
            },
          ],
        };

      default:
        return {
          title: 'General Help',
          sections: [
            {
              title: 'Getting Started',
              content: (
                <>
                  <p className="mb-2">
                    SafeCity AI is a comprehensive city safety monitoring platform. Use the sidebar to navigate between different modules.
                  </p>
                </>
              ),
            },
            {
              title: 'Navigation',
              content: (
                <>
                  <p className="mb-2">Main sections:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Dashboard:</strong> Overview of city safety metrics</li>
                    <li><strong>Drivers:</strong> Manage driver profiles and records</li>
                    <li><strong>Violations:</strong> Track and review traffic violations</li>
                    <li><strong>Disaster Hub:</strong> Monitor emergency events</li>
                    <li><strong>Live Map:</strong> Real-time sensor and incident visualization</li>
                    <li><strong>AI Analytics:</strong> Predictive insights and trends</li>
                    <li><strong>Route Planner:</strong> Optimize routes based on safety data</li>
                  </ul>
                </>
              ),
            },
          ],
        };
    }
  };

  const helpContent = getHelpContent();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-14 bottom-0 right-0 w-80 bg-slate-900 border-l border-slate-800 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
        role="dialog"
        aria-label="Help Panel"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <h2 className="text-sm font-bold text-white">{helpContent.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
            aria-label="Close help panel"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {helpContent.sections.map((section, index) => (
            <AccordionItem
              key={index}
              title={section.title}
              content={section.content}
              isOpen={openSection === index}
              onToggle={() => setOpenSection(openSection === index ? -1 : index)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60">
          <p className="text-xs text-slate-500">
            Need more help? Contact support at{' '}
            <a href="mailto:support@safecity.ai" className="text-accent hover:underline">
              support@safecity.ai
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default HelpPanel;
