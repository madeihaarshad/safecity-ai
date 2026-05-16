import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Monitor, Smartphone, Laptop, Tablet, Trash2, Activity, LogOut, Shield } from 'lucide-react';

const SessionManager = () => {
  const { securitySettings, createSession, terminateSession, terminateAllOtherSessions, updateSessionActivity } = useSecurity();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    // Create a new session on component mount
    const session = createSession();
    setCurrentSessionId(session.id);

    // Update activity every minute
    const interval = setInterval(() => {
      if (currentSessionId) {
        updateSessionActivity(currentSessionId);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getDeviceIcon = (userAgent) => {
    const ua = userAgent?.toLowerCase() || '';
    if (ua.includes('mobile')) return <Smartphone size={16} />;
    if (ua.includes('tablet')) return <Tablet size={16} />;
    return <Monitor size={16} />;
  };

  const getLastActive = (lastActive) => {
    const seconds = Math.floor((new Date() - new Date(lastActive)) / 1000);
    if (seconds < 60) return 'Active now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  const handleTerminateAllOthers = () => {
    if (window.confirm('This will log out all other devices. Continue?')) {
      terminateAllOtherSessions(currentSessionId);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-[var(--text)]">Active Sessions</h3>
          <p className="text-sm text-[var(--subtle)]">Manage your active devices</p>
        </div>
        {securitySettings.activeSessions.length > 1 && (
          <button
            onClick={handleTerminateAllOthers}
            className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-sm hover:bg-red-500/20 flex items-center gap-1"
          >
            <LogOut size={14} />
            Logout Others
          </button>
        )}
      </div>

      <div className="space-y-3">
        {securitySettings.activeSessions.length === 0 ? (
          <div className="text-center py-8 text-[var(--subtle)]">
            <Monitor size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active sessions</p>
          </div>
        ) : (
          securitySettings.activeSessions.map(session => (
            <div
              key={session.id}
              className={`p-4 rounded-lg border ${
                session.isCurrent ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--card)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    session.isCurrent ? 'bg-[var(--accent)]/20' : 'bg-[var(--card)]'
                  }`}>
                    {getDeviceIcon(session.device)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[var(--text)]">
                        {session.device?.includes('Windows') ? 'Windows PC' :
                         session.device?.includes('Mac') ? 'Mac' :
                         session.device?.includes('iPhone') ? 'iPhone' :
                         session.device?.includes('Android') ? 'Android' : 'Unknown Device'}
                      </p>
                      {session.isCurrent && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--subtle)] mt-1">
                      <span>IP: {session.ip}</span>
                      <span>Login: {new Date(session.loginTime).toLocaleString()}</span>
                      <span className="flex items-center gap-1">
                        <Activity size={10} />
                        {getLastActive(session.lastActive)}
                      </span>
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => terminateSession(session.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                    title="Terminate Session"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SessionManager;