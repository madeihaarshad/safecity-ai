import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const AccordionItem = ({ title, content, isOpen, onToggle }) => {
  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--accent)]/5 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-[var(--text)]">{title}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-[var(--subtle)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--subtle)]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-[var(--bg)]/50 text-sm text-[var(--subtle)] leading-relaxed">
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
              title: 'KPI Cards Overview',
              content: (
                <>
                  <p className="mb-2">The top row displays four <strong>Key Performance Indicators (KPIs)</strong> that give you a quick snapshot of city safety:</p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><strong>Total Fleet:</strong> Number of active registered vehicles currently monitored by the system.</li>
                    <li><strong>Active Sensors:</strong> Count of operational sensors across all city zones providing real-time data.</li>
                    <li><strong>Violations Today:</strong> Traffic and safety violations recorded in the last 24 hours.</li>
                    <li><strong>AI Risk Index:</strong> Aggregated threat level (0–100) calculated from predictive models.</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Alert Stream',
              content: (
                <>
                  <p className="mb-2">The <strong>Alert Stream</strong> shows real-time alerts sorted by priority:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                    <li><span className="text-red-400 font-semibold">Critical</span> → <span className="text-orange-400 font-semibold">High</span> → <span className="text-sky-400 font-semibold">Normal</span> → <span className="text-green-400 font-semibold">Low</span></li>
                  </ul>
                  <p className="mb-2"><strong>How to manage alerts:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Click the <strong>X</strong> on any alert to dismiss it.</li>
                    <li>Click <strong>"Clear All"</strong> to dismiss all visible alerts at once.</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'AI Risk Index Gauge',
              content: (
                <>
                  <p className="mb-2">The gauge updates in real-time and changes color based on the safety level:</p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li><span className="text-red-400 font-semibold">Red (70+):</span> Critical — immediate attention required.</li>
                    <li><span className="text-yellow-400 font-semibold">Yellow (40–70):</span> Caution — elevated risk.</li>
                    <li><span className="text-green-400 font-semibold">Green (Below 40):</span> Safe — normal operations.</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Accident Probability Chart',
              content: (
                <>
                  <p className="mb-2">
                    The <strong>24-hour Accident Probability</strong> chart shows predicted risks over the next day.
                  </p>
                  <p className="mb-2"><strong>Tip:</strong> This chart <strong>auto-refreshes every 30 seconds</strong> to ensure you are seeing the most current AI-driven predictions.</p>
                </>
              ),
            },
          ],
        };

      case '/planner':
      case '/route-planner':
        return {
          title: 'AI Route Planner Help',
          sections: [
            {
              title: 'Setting Your Journey',
              content: (
                <>
                  <p className="mb-3"><strong>Option 1: Using the Map</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2 mb-3">
                    <li>Click the <strong>"Set Start"</strong> button, then click anywhere on the map to drop your start pin.</li>
                    <li>Click the <strong>"Set Destination"</strong> button, then click on the map to drop your end pin.</li>
                  </ol>
                  <p className="mb-2"><strong>Option 2: Typing Addresses</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                    <li>Type in the <strong>Start Address</strong> or <strong>Destination Address</strong> text boxes.</li>
                    <li><strong>Google Places autocomplete</strong> will suggest real addresses as you type — click a suggestion to confirm it.</li>
                  </ul>
                </>
              ),
            },
            {
              title: 'Route Comparison',
              content: (
                <>
                  <p className="mb-2">Once both points are set, the system queries the backend and draws two paths:</p>
                  <ul className="list-disc list-inside space-y-2 ml-2 mb-3">
                    <li><span className="text-blue-400 font-semibold">Fastest Route (Blue):</span> The quickest way to your destination.</li>
                    <li><span className="text-green-400 font-semibold">Safest Route (Green):</span> Optimized to avoid high-risk zones.</li>
                  </ul>
                  <p className="mb-2">The <strong>Left Panel</strong> displays the <strong>Distance</strong>, <strong>Estimated Travel Time</strong>, and <strong>Risk Score</strong> for each option.</p>
                </>
              ),
            },
            {
              title: 'Resetting & Editing',
              content: (
                <>
                  <p className="mb-2">Need to change your route?</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                    <li>Click the <strong>trash icon</strong> next to either address field to reset that specific point.</li>
                  </ul>
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
              title: 'Risk Prediction',
              content: (
                <>
                  <p className="mb-2">Manually forecast risks by filling in the details:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                    <li>Fill in <strong>Hour</strong>, <strong>Weather</strong>, <strong>Congestion</strong>, <strong>Avg Speed</strong>, and <strong>Incident Count</strong>.</li>
                    <li>Click <strong>"Predict Risk"</strong> to run the model.</li>
                  </ul>
                  <p className="mb-2"><strong>Results:</strong> The gauge on the right shows <strong>Low / Moderate / High</strong> risk levels, followed by a <strong>full breakdown table</strong> of the findings.</p>
                </>
              ),
            },
            {
              title: 'YOLOv8 Frame Detection',
              content: (
                <>
                  <p className="mb-2">Analyze traffic imagery in real-time:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2 mb-3">
                    <li><strong>Upload</strong> a traffic image (JPG/PNG) or use the <strong>live camera feed</strong>.</li>
                    <li>Click <strong>"Analyse"</strong> to process the frame.</li>
                  </ol>
                  <p className="mb-2"><strong>Output:</strong> Detected objects appear as <strong>labelled overlays</strong> with <strong>confidence scores</strong> and their <strong>real-world address</strong>.</p>
                </>
              ),
            },
          ],
        };

      case '/violations':
        return {
          title: 'Traffic Violations Help',
          sections: [
            {
              title: 'Database Records',
              content: (
                <>
                  <p className="mb-2">The <strong>Database Records</strong> table shows every violation currently stored in MongoDB.</p>
                  <p className="mb-2"><strong>Searching & Filtering:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                    <li>Use the <strong>Search Bar</strong> to filter by driver name or location.</li>
                    <li>Use the dropdowns to filter by <strong>Severity</strong>, <strong>Type</strong>, or <strong>Date Range</strong>.</li>
                    <li>Click any <strong>column header</strong> to sort the data ascending or descending.</li>
                  </ul>
                  <p className="text-xs text-amber-400 font-semibold mt-2">Note: If the table is empty, the MongoDB collection has no data — run the seed script to populate sample records.</p>
                </>
              ),
            },
            {
              title: 'AI Violation Detection',
              content: (
                <>
                  <p className="mb-2">The <strong>Camera Panel</strong> on the right lets you upload a frame for automatic analysis.</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                    <li>Once uploaded, <strong>YOLO</strong> will detect violations and <strong>add them to the database automatically</strong>.</li>
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
              title: 'Real-time Monitoring',
              content: (
                <>
                  <p className="mb-2">This hub tracks environmental threats:</p>
                  <ul className="list-disc list-inside space-y-2 ml-2 mb-3">
                    <li><strong>Live Weather:</strong> Fetched via OpenWeatherMap.</li>
                    <li><strong>Earthquakes:</strong> Recent M2.5+ events fetched via USGS.</li>
                  </ul>
                  <p>Click <strong>"Refresh"</strong> to force a manual data reload at any time.</p>
                </>
              ),
            },
            {
              title: 'Troubleshooting',
              content: (
                <>
                  <p className="mb-2"><strong>Weather Error?</strong> Ensure your <code className="bg-[var(--card)] border border-[var(--border)] px-1 rounded text-xs text-[var(--accent)]">OPENWEATHERMAP_API_KEY</code> is set in the backend <code className="bg-[var(--card)] border border-[var(--border)] px-1 rounded text-xs text-[var(--accent)]">.env</code> file.</p>
                  <p className="mb-2"><strong>Earthquake Data Fails?</strong> This service is free and requires no key — please check your internet connection.</p>
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
              title: 'Driver Management',
              content: (
                <>
                  <p className="mb-2">This section lists all <strong>registered drivers</strong> along with their <strong>safety score</strong> and <strong>violation history</strong>.</p>
                  <p className="mb-2"><strong>Details:</strong> Click any <strong>driver card</strong> to expand their profile and see a full breakdown of their violations.</p>
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
              title: 'Sensor Monitoring',
              content: (
                <>
                  <p className="mb-2">The map shows real-time sensor locations and status:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><span className="text-green-400 font-semibold">Green:</span> Normal / Safe.</li>
                    <li><span className="text-yellow-400 font-semibold">Yellow:</span> Elevated risk.</li>
                    <li><span className="text-red-400 font-semibold">Red:</span> Critical readings.</li>
                  </ul>
                  <p className="mt-2"><strong>Clustering:</strong> Sensors close together are grouped into clusters. Click a cluster to zoom in.</p>
                </>
              ),
            },
            {
              title: 'Map Navigation',
              content: (
                <>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Zoom/Pan</strong> to explore different city zones.</li>
                    <li>Click individual <strong>markers</strong> to see detailed sensor readings.</li>
                  </ul>
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
                <p>Welcome to <strong>SafeCity AI</strong>. Use the sidebar on the left to navigate between different monitoring modules. Each section provides unique insights into city safety and traffic management.</p>
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
        className={`fixed top-14 bottom-0 right-0 w-80 bg-[var(--surface)] border-l border-[var(--border)] z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
        role="dialog"
        aria-label="Help Panel"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg)]/60">
          <h2 className="text-sm font-bold text-[var(--text)]">{helpContent.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--border)] rounded transition-all text-[var(--subtle)] hover:text-[var(--text)]"
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
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)]/60">
          <p className="text-xs text-[var(--subtle)]">
            Need more help? Contact support at{' '}
            <a href="mailto:support@safecity.ai" className="text-[var(--accent)] hover:underline">
              support@safecity.ai
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default HelpPanel;
