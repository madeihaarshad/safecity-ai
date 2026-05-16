import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useTheme } from '../context/ThemeContext';
import { Plus, Trash2, Globe, Monitor, X, Check } from 'lucide-react';

const IpWhitelistManager = () => {
  const { securitySettings, addWhitelistedIp, removeWhitelistedIp } = useSecurity();
  const { theme } = useTheme();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [description, setDescription] = useState('');

  const handleAddIp = () => {
    if (newIp.trim()) {
      addWhitelistedIp(newIp.trim(), description.trim() || 'No description');
      setNewIp('');
      setDescription('');
      setShowAddForm(false);
    }
  };

  const getCurrentIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setNewIp(data.ip);
      setDescription('My Current IP');
    } catch (error) {
      console.error('Failed to get current IP:', error);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-[var(--text)]">IP Whitelist</h3>
          <p className="text-sm text-[var(--subtle)]">Only whitelisted IPs can access the system</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent)]/80"
        >
          <Plus size={16} />
          Add IP
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-[var(--text)]">Add IP Address</h4>
            <button onClick={() => setShowAddForm(false)} className="text-[var(--subtle)] hover:text-red-500">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">IP Address</label>
              <input
                type="text"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="e.g., 192.168.1.1"
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Office IP, Home IP, etc."
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={getCurrentIp}
                className="flex-1 bg-[var(--card)] border border-[var(--border)] py-2 rounded-lg text-sm hover:bg-[var(--bg)]"
              >
                Use My Current IP
              </button>
              <button
                onClick={handleAddIp}
                className="flex-1 bg-[var(--accent)] text-white py-2 rounded-lg text-sm hover:bg-[var(--accent)]/80"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {securitySettings.whitelistedIps.length === 0 ? (
          <div className="text-center py-8 text-[var(--subtle)]">
            <Globe size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No IPs whitelisted</p>
            <p className="text-xs">Add IP addresses to restrict access</p>
          </div>
        ) : (
          securitySettings.whitelistedIps.map(ip => (
            <div key={ip.id} className="flex items-center justify-between p-3 bg-[var(--card)] rounded-lg">
              <div className="flex items-center gap-3">
                <Monitor size={16} className="text-[var(--subtle)]" />
                <div>
                  <p className="font-mono text-sm font-semibold text-[var(--text)]">{ip.ip}</p>
                  <p className="text-xs text-[var(--subtle)]">{ip.description}</p>
                </div>
              </div>
              <button
                onClick={() => removeWhitelistedIp(ip.id)}
                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IpWhitelistManager;