import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useTheme } from '../context/ThemeContext';
import { Activity, AlertTriangle, Clock, XCircle, CheckCircle, Trash2, Shield } from 'lucide-react';

const LoginAttemptMonitor = () => {
  const { securitySettings, clearLoginAttempts, getRecentFailedAttempts } = useSecurity();
  const { theme } = useTheme();
  const [filter, setFilter] = useState('all'); // all, success, failed

  const filteredAttempts = securitySettings.loginAttempts.filter(attempt => {
    if (filter === 'success') return attempt.success;
    if (filter === 'failed') return !attempt.success;
    return true;
  });

  const getStatusIcon = (success) => {
    if (success) {
      return <CheckCircle size={16} className="text-green-500" />;
    }
    return <XCircle size={16} className="text-red-500" />;
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const suspiciousAttempts = securitySettings.loginAttempts.filter(
    a => !a.success && new Date(a.timestamp) > new Date(Date.now() - 5 * 60 * 1000)
  ).length;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-[var(--text)]">Login Attempt Monitor</h3>
          <p className="text-sm text-[var(--subtle)]">Track and monitor login activity</p>
        </div>
        {suspiciousAttempts > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-500 rounded-full text-xs">
            <AlertTriangle size={12} />
            {suspiciousAttempts} suspicious attempts
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[var(--card)] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-[var(--text)]">{securitySettings.loginAttempts.length}</p>
          <p className="text-xs text-[var(--subtle)]">Total Attempts</p>
        </div>
        <div className="bg-[var(--card)] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-500">
            {securitySettings.loginAttempts.filter(a => a.success).length}
          </p>
          <p className="text-xs text-[var(--subtle)]">Successful</p>
        </div>
        <div className="bg-[var(--card)] rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-500">
            {securitySettings.loginAttempts.filter(a => !a.success).length}
          </p>
          <p className="text-xs text-[var(--subtle)]">Failed</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'success', 'failed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-lg text-sm capitalize ${
              filter === tab
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--card)] text-[var(--subtle)] hover:bg-[var(--border)]'
            }`}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={clearLoginAttempts}
          className="ml-auto px-3 py-1 rounded-lg text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center gap-1"
        >
          <Trash2 size={14} />
          Clear All
        </button>
      </div>

      {/* Attempts List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredAttempts.length === 0 ? (
          <div className="text-center py-8 text-[var(--subtle)]">
            <Shield size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No login attempts recorded</p>
          </div>
        ) : (
          filteredAttempts.map(attempt => (
            <div key={attempt.id} className="p-3 bg-[var(--card)] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(attempt.success)}
                  <span className="font-medium text-[var(--text)]">{attempt.email}</span>
                </div>
                <span className="text-xs text-[var(--subtle)]">{getTimeAgo(attempt.timestamp)}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--subtle)]">
                <span>IP: {attempt.ip || 'Unknown'}</span>
                <span>Device: {attempt.userAgent?.substring(0, 30)}...</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LoginAttemptMonitor;