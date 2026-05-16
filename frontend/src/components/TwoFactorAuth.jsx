import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, QrCode, Copy, Check, Lock, Unlock, AlertCircle, Download } from 'lucide-react';

const TwoFactorAuth = () => {
  const { securitySettings, enable2FA, disable2FA } = useSecurity();
  const { user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleEnable2FA = async () => {
    setLoading(true);
    const result = await enable2FA(user?.email || 'admin@safecity.com');
    setLoading(false);
    
    if (result.secret) {
      setSecret(result.secret);
      setQrUrl(result.qrUrl);
      setShowSetup(true);
      setStep(1);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    const result = await enable2FA(user?.email, verificationCode);
    setLoading(false);
    
    if (result.success) {
      setBackupCodes(result.backupCodes);
      setStep(3);
      setError('');
    } else {
      setError(result.error || 'Invalid verification code. Please try again.');
    }
  };

  const handleDisable2FA = () => {
    if (window.confirm('Are you sure you want to disable Two-Factor Authentication?')) {
      disable2FA();
      setShowSetup(false);
      setStep(1);
      setVerificationCode('');
      setError('');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadBackupCodes = () => {
    const element = document.createElement('a');
    const file = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'safecity-backup-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const finishSetup = () => {
    setShowSetup(false);
    setStep(1);
    setVerificationCode('');
    setError('');
  };

  // Time sync tip
  const TimeSyncTip = () => (
    <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg text-xs text-yellow-500">
      <p>💡 Tip: If codes don't work, make sure your device time is synced:</p>
      <p className="text-xs mt-1">
        Settings → Date & Time → Enable "Automatic date & time"
      </p>
    </div>
  );

  if (!securitySettings.twoFactorEnabled && !showSetup) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
            <Lock size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text)]">Two-Factor Authentication</h3>
            <p className="text-sm text-[var(--subtle)]">Not enabled - Your account is less secure</p>
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-blue-500/10 rounded-lg text-sm text-[var(--subtle)]">
          <p>📱 How to set up 2FA:</p>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
            <li>Download Google Authenticator or Microsoft Authenticator</li>
            <li>Scan the QR code with your authenticator app</li>
            <li>Enter the 6-digit code from the app to verify</li>
          </ol>
        </div>
        
        <button
          onClick={handleEnable2FA}
          disabled={loading}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Enable 2FA'}
        </button>
      </div>
    );
  }

  if (showSetup && step !== 3) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
            <QrCode size={20} className="text-green-500" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text)]">
              {step === 1 ? 'Scan QR Code' : 'Verify Setup'}
            </h3>
            <p className="text-sm text-[var(--subtle)]">
              {step === 1 
                ? 'Scan this QR code with your authenticator app' 
                : 'Enter the 6-digit code from your authenticator app'}
            </p>
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="bg-white rounded-lg p-4 mb-4 text-center">
              {qrUrl ? (
                <img 
                  src={qrUrl} 
                  alt="2FA QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                  <QrCode size={64} className="text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <p className="text-sm font-medium text-[var(--text)] mb-1">Manual Entry Code:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[var(--card)] p-2 rounded-lg text-center font-mono text-sm break-all">
                  {secret}
                </code>
                <button
                  onClick={() => copyToClipboard(secret)}
                  className="p-2 hover:bg-[var(--card)] rounded-lg"
                >
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-[var(--accent)] text-white font-semibold py-2 rounded-lg"
            >
              Next: Verify Code
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--text)] mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength="6"
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-wider text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
              {error && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {error}
                </p>
              )}
              <TimeSyncTip />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-[var(--card)] border border-[var(--border)] py-2 rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={loading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (showSetup && step === 3) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
            <Shield size={20} className="text-yellow-500" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text)]">Save Backup Codes</h3>
            <p className="text-sm text-[var(--subtle)]">
              Store these codes in a safe place. Each code can be used only once.
            </p>
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, idx) => (
              <code key={idx} className="font-mono text-sm p-2 bg-[var(--surface)] rounded text-center">
                {code}
              </code>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={downloadBackupCodes}
            className="flex-1 bg-[var(--card)] border border-[var(--border)] py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Download Codes
          </button>
          <button
            onClick={finishSetup}
            className="flex-1 bg-[var(--accent)] text-white py-2 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
          <Shield size={20} className="text-green-500" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--text)]">Two-Factor Authentication</h3>
          <p className="text-sm text-[var(--subtle)]">Enabled - Your account is protected</p>
        </div>
      </div>
      <button
        onClick={handleDisable2FA}
        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold py-2 rounded-lg transition-colors"
      >
        Disable 2FA
      </button>
    </div>
  );
};

export default TwoFactorAuth;