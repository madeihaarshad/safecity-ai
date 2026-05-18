import React, { createContext, useState, useContext, useEffect } from 'react';
import * as OTPAuth from 'otpauth';
import axios from 'axios';

const SecurityContext = createContext();

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: [],
    whitelistedIps: [],
    loginAttempts: [],
    activeSessions: [],
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90,
      preventReuse: 5
    }
  });
  const [loading, setLoading] = useState(true);
  const [pendingSecret, setPendingSecret] = useState(null);
  const [pendingTotp, setPendingTotp] = useState(null);

  const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

  useEffect(() => {
    loadSecuritySettings();
    fetch2FAStatus();
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  const fetch2FAStatus = async () => {
    try {
      const token = getAuthToken();
      if (token) {
        const response = await axios.get(`${API_URL}/auth/2fa-status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSecuritySettings(prev => ({
          ...prev,
          twoFactorEnabled: response.data.enabled
        }));
      }
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const loadSecuritySettings = async () => {
    try {
      const saved = localStorage.getItem('securitySettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSecuritySettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = (settings) => {
    setSecuritySettings(settings);
    localStorage.setItem('securitySettings', JSON.stringify(settings));
  };

  // ==================== 2FA Functions with Backend Persistence ====================
  
  const generate2FASecret = (email, issuer = 'SafeCity AI') => {
    const secret = new OTPAuth.Secret({ size: 20 });
    const secretBase32 = secret.base32;
    
    const totpObject = new OTPAuth.TOTP({
      issuer: issuer,
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });
    
    const otpauthUrl = totpObject.toString();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
    
    setPendingSecret(secretBase32);
    setPendingTotp(totpObject);
    
    return { secret: secretBase32, qrUrl };
  };

  const enable2FA = async (email, verificationCode) => {
    if (pendingTotp) {
      try {
        const delta = pendingTotp.validate({ token: verificationCode, window: 3 });
        const isValid = delta !== null;
        
        if (isValid) {
          const backupCodes = generateBackupCodes();
          
          // Save to backend
          const token = getAuthToken();
          await axios.post(`${API_URL}/auth/enable-2fa`, {
            secret: pendingSecret,
            backupCodes: backupCodes
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setSecuritySettings(prev => ({
            ...prev,
            twoFactorEnabled: true,
            twoFactorSecret: pendingSecret,
            twoFactorBackupCodes: backupCodes
          }));
          
          saveSettings({
            ...securitySettings,
            twoFactorEnabled: true,
            twoFactorSecret: pendingSecret,
            twoFactorBackupCodes: backupCodes
          });
          
          setPendingSecret(null);
          setPendingTotp(null);
          
          return { success: true, backupCodes };
        }
        return { success: false, error: 'Invalid verification code. Please make sure your device time is synced.' };
      } catch (error) {
        console.error('2FA verification error:', error);
        return { success: false, error: error.response?.data?.message || 'Verification failed' };
      }
    }
    
    return generate2FASecret(email);
  };

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const verify2FACode = (code, secretBase32) => {
    try {
      const totpObject = new OTPAuth.TOTP({
        issuer: 'SafeCity AI',
        label: 'user',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secretBase32
      });
      
      const delta = totpObject.validate({ token: code, window: 1 });
      return delta !== null;
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  };

  const verifyBackupCode = (code) => {
    const backupCodes = securitySettings.twoFactorBackupCodes;
    if (backupCodes.includes(code)) {
      const updatedCodes = backupCodes.filter(c => c !== code);
      setSecuritySettings(prev => ({
        ...prev,
        twoFactorBackupCodes: updatedCodes
      }));
      saveSettings({
        ...securitySettings,
        twoFactorBackupCodes: updatedCodes
      });
      return true;
    }
    return false;
  };

  const disable2FA = async () => {
    try {
      const token = getAuthToken();
      await axios.post(`${API_URL}/auth/disable-2fa`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSecuritySettings(prev => ({
        ...prev,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: []
      }));
      setPendingSecret(null);
      setPendingTotp(null);
      saveSettings({
        ...securitySettings,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: []
      });
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
    }
  };

  // ==================== IP Whitelist Functions ====================
  const addWhitelistedIp = (ip, description) => {
    const newIp = { id: Date.now(), ip, description, createdAt: new Date() };
    setSecuritySettings(prev => ({
      ...prev,
      whitelistedIps: [...prev.whitelistedIps, newIp]
    }));
    saveSettings({
      ...securitySettings,
      whitelistedIps: [...securitySettings.whitelistedIps, newIp]
    });
  };

  const removeWhitelistedIp = (ipId) => {
    setSecuritySettings(prev => ({
      ...prev,
      whitelistedIps: prev.whitelistedIps.filter(ip => ip.id !== ipId)
    }));
    saveSettings({
      ...securitySettings,
      whitelistedIps: securitySettings.whitelistedIps.filter(ip => ip.id !== ipId)
    });
  };

  const isIpWhitelisted = (ip) => {
    return securitySettings.whitelistedIps.some(w => w.ip === ip);
  };

  // ==================== Login Attempt Monitoring ====================
  const recordLoginAttempt = (email, success, ip, userAgent) => {
    const attempt = {
      id: Date.now(),
      email,
      success,
      ip,
      userAgent,
      timestamp: new Date(),
      location: 'Unknown'
    };
    
    setSecuritySettings(prev => ({
      ...prev,
      loginAttempts: [attempt, ...prev.loginAttempts].slice(0, 100)
    }));
    
    saveSettings({
      ...securitySettings,
      loginAttempts: [attempt, ...securitySettings.loginAttempts].slice(0, 100)
    });
    
    const recentFailures = getRecentFailedAttempts(email, 5);
    if (recentFailures >= 5) {
      alert('Multiple failed login attempts detected! Account temporarily locked.');
    }
  };

  const getRecentFailedAttempts = (email, minutes = 5) => {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return securitySettings.loginAttempts.filter(
      attempt => attempt.email === email && 
                 !attempt.success && 
                 new Date(attempt.timestamp) > cutoffTime
    ).length;
  };

  const clearLoginAttempts = () => {
    setSecuritySettings(prev => ({
      ...prev,
      loginAttempts: []
    }));
    saveSettings({
      ...securitySettings,
      loginAttempts: []
    });
  };

  // ==================== Session Management ====================
  const createSession = () => {
    const session = {
      id: Date.now().toString(),
      device: navigator.userAgent,
      ip: '127.0.0.1',
      loginTime: new Date(),
      lastActive: new Date(),
      isCurrent: true
    };
    
    setSecuritySettings(prev => ({
      ...prev,
      activeSessions: [session, ...prev.activeSessions]
    }));
    saveSettings({
      ...securitySettings,
      activeSessions: [session, ...securitySettings.activeSessions]
    });
    return session;
  };

  const terminateSession = (sessionId) => {
    setSecuritySettings(prev => ({
      ...prev,
      activeSessions: prev.activeSessions.filter(s => s.id !== sessionId)
    }));
    saveSettings({
      ...securitySettings,
      activeSessions: securitySettings.activeSessions.filter(s => s.id !== sessionId)
    });
  };

  const terminateAllOtherSessions = (currentSessionId) => {
    setSecuritySettings(prev => ({
      ...prev,
      activeSessions: prev.activeSessions.filter(s => s.id === currentSessionId)
    }));
    saveSettings({
      ...securitySettings,
      activeSessions: securitySettings.activeSessions.filter(s => s.id === currentSessionId)
    });
  };

  const updateSessionActivity = (sessionId) => {
    setSecuritySettings(prev => ({
      ...prev,
      activeSessions: prev.activeSessions.map(s =>
        s.id === sessionId ? { ...s, lastActive: new Date() } : s
      )
    }));
  };

  // ==================== Password Policy Functions ====================
  const validatePassword = (password) => {
    const policy = securitySettings.passwordPolicy;
    const errors = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { isValid: errors.length === 0, errors };
  };

  const updatePasswordPolicy = (newPolicy) => {
    setSecuritySettings(prev => ({
      ...prev,
      passwordPolicy: { ...prev.passwordPolicy, ...newPolicy }
    }));
    saveSettings({
      ...securitySettings,
      passwordPolicy: { ...securitySettings.passwordPolicy, ...newPolicy }
    });
  };

  const isPasswordExpired = (lastChangedDate) => {
    const expiryDays = securitySettings.passwordPolicy.expiryDays;
    if (!expiryDays) return false;
    
    const changedDate = new Date(lastChangedDate);
    const now = new Date();
    const daysDiff = (now - changedDate) / (1000 * 60 * 60 * 24);
    return daysDiff >= expiryDays;
  };

  return (
    <SecurityContext.Provider value={{
      securitySettings,
      loading,
      // 2FA
      enable2FA,
      disable2FA,
      verify2FACode,
      verifyBackupCode,
      // IP Whitelist
      addWhitelistedIp,
      removeWhitelistedIp,
      isIpWhitelisted,
      // Login Monitoring
      recordLoginAttempt,
      getRecentFailedAttempts,
      clearLoginAttempts,
      // Session Management
      createSession,
      terminateSession,
      terminateAllOtherSessions,
      updateSessionActivity,
      // Password Policy
      validatePassword,
      updatePasswordPolicy,
      isPasswordExpired
    }}>
      {children}
    </SecurityContext.Provider>
  );
};
