import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SecurityProvider } from '../context/SecurityContext';
import TwoFactorAuth from '../components/TwoFactorAuth';
import IpWhitelistManager from '../components/IpWhitelistManager';
import LoginAttemptMonitor from '../components/LoginAttemptMonitor';
import SessionManager from '../components/SessionManager';
import PasswordPolicy from '../components/PasswordPolicy';
import Breadcrumb from '../components/Breadcrumb';
import SectionHeader from '../components/SectionHeader';
import { Shield, Lock, Globe, Activity, Monitor, Key } from 'lucide-react';

const SecuritySettingsContent = () => {
  const { theme } = useTheme();

  const sections = [
    { icon: <Key size={20} />, title: 'Two-Factor Authentication', component: <TwoFactorAuth />, description: 'Add an extra layer of security to your account' },
    { icon: <Globe size={20} />, title: 'IP Whitelist', component: <IpWhitelistManager />, description: 'Restrict access to specific IP addresses' },
    { icon: <Activity size={20} />, title: 'Login Attempt Monitor', component: <LoginAttemptMonitor />, description: 'Monitor and track login activity' },
    { icon: <Monitor size={20} />, title: 'Session Manager', component: <SessionManager />, description: 'Manage active sessions across devices' },
    { icon: <Lock size={20} />, title: 'Password Policy', component: <PasswordPolicy />, description: 'Configure password requirements' }
  ];

  return (
    <div className="p-8">
      <Breadcrumb crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Security Settings' }]} />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
          <Shield size={24} className="text-[var(--accent)]" />
        </div>
        <div>
          <SectionHeader
            title="Security Settings"
            subtitle="Manage your account security and access controls"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[var(--accent)]">{section.icon}</div>
              <h3 className="font-semibold text-[var(--text)]">{section.title}</h3>
            </div>
            {section.component}
          </div>
        ))}
      </div>
    </div>
  );
};

const SecuritySettings = () => {
  return (
    <SecurityProvider>
      <SecuritySettingsContent />
    </SecurityProvider>
  );
};

export default SecuritySettings;