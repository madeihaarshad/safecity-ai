import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Truck, Shield, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';

const Login = () => {
  const { login, verify2FA, loginAsDriver, verifyDriver2FA } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const [step, setStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [role, setRole] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const handleInitialLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (role === 'admin') {
      result = await login(email, password);
    } else {
      result = await loginAsDriver(licenseNumber, password);
    }
    
    if (result.success) {
      navigate(role === 'admin' ? '/' : '/driver-dashboard');
    } else if (result.requires2FA) {
      setUserId(result.userId);
      setStep('verify2fa');
      setError('');
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
  };

  const handle2FAVerification = async () => {
    if (!twoFactorCode && !backupCode) {
      setError('Please enter verification code');
      return;
    }
    
    setError('');
    setLoading(true);

    let result;
    if (role === 'admin') {
      result = await verify2FA(userId, twoFactorCode, useBackupCode ? backupCode : null);
    } else {
      result = await verifyDriver2FA(userId, twoFactorCode, useBackupCode ? backupCode : null);
    }
    
    if (result.success) {
      navigate(role === 'admin' ? '/' : '/driver-dashboard');
    } else {
      setError(result.error || 'Invalid verification code');
    }
    setLoading(false);
  };

  // 2FA Verification Screen
  if (step === 'verify2fa') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--bg)] to-[var(--surface)]">
        <div className="max-w-md w-full bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={40} className="text-[var(--accent)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Two-Factor Authentication</h1>
            <p className="text-sm text-[var(--subtle)] mt-2">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {!useBackupCode ? (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Authentication Code
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-wider text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>
              
              <button
                onClick={handle2FAVerification}
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => setUseBackupCode(true)}
                  className="text-sm text-[var(--subtle)] hover:text-[var(--accent)]"
                >
                  Use backup code instead
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Backup Code
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 text-center font-mono text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              
              <button
                onClick={handle2FAVerification}
                disabled={loading || !backupCode}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify with Backup Code'}
              </button>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => setUseBackupCode(false)}
                  className="text-sm text-[var(--subtle)] hover:text-[var(--accent)] flex items-center gap-1 justify-center"
                >
                  <ArrowLeft size={14} />
                  Back to authenticator code
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Main Login Screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--bg)] to-[var(--surface)]">
      <div className="max-w-md w-full bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-4xl">🚦</div>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">SafeCity AI</h1>
          <p className="text-sm text-[var(--subtle)] mt-2">Intelligent Traffic Management System</p>
        </div>

        {/* Role Selection */}
        <div className="flex gap-2 mb-6 bg-[var(--card)] rounded-lg p-1 border border-[var(--border)]">
          <button
            onClick={() => setRole('admin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md transition-all ${
              role === 'admin'
                ? 'bg-[var(--accent)] text-white shadow-lg'
                : 'text-[var(--subtle)] hover:text-[var(--accent)]'
            }`}
          >
            <Shield size={18} />
            <span className="font-medium">Admin</span>
          </button>
          <button
            onClick={() => setRole('driver')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md transition-all ${
              role === 'driver'
                ? 'bg-[var(--accent)] text-white shadow-lg'
                : 'text-[var(--subtle)] hover:text-[var(--accent)]'
            }`}
          >
            <Truck size={18} />
            <span className="font-medium">Driver</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleInitialLogin} className="space-y-4">
          {role === 'admin' ? (
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
                placeholder="admin@safecity.com"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">License Number</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
                placeholder="LIC-12345"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-semibold py-2 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {role === 'driver' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--subtle)]">
              New driver?{' '}
              <a href="/driver-signup" className="text-[var(--accent)] hover:underline">
                Register here
              </a>
            </p>
          </div>
        )}

        {/* Demo Credentials */}
        <div className="mt-6 p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
          <p className="text-xs text-[var(--subtle)] text-center mb-2">Demo Credentials:</p>
          <div className="text-xs text-[var(--text)] space-y-1">
            <div className="flex justify-between">
              <span>👑 Admin:</span>
              <span className="font-mono">admin@safecity.com / admin123</span>
            </div>
            <div className="flex justify-between">
              <span>🚗 Driver:</span>
              <span className="font-mono">LIC-12345 / driver123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;