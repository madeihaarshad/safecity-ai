import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Check, X, AlertCircle, Save, RefreshCw } from 'lucide-react';

const PasswordPolicy = () => {
  const { securitySettings, validatePassword, updatePasswordPolicy } = useSecurity();
  const { theme } = useTheme();
  const [testPassword, setTestPassword] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [policy, setPolicy] = useState(securitySettings.passwordPolicy);
  const [saved, setSaved] = useState(false);

  const handlePolicyChange = (field, value) => {
    setPolicy(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSavePolicy = () => {
    updatePasswordPolicy(policy);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testPasswordStrength = () => {
    const result = validatePassword(testPassword);
    setValidationResult(result);
  };

  const getStrengthColor = () => {
    if (!validationResult) return 'bg-gray-500';
    if (validationResult.errors.length === 0) return 'bg-green-500';
    if (validationResult.errors.length <= 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStrengthText = () => {
    if (!validationResult) return 'Enter a password to test';
    if (validationResult.errors.length === 0) return 'Strong password!';
    if (validationResult.errors.length <= 2) return 'Weak password';
    return 'Very weak password';
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-[var(--text)]">Password Policy</h3>
          <p className="text-sm text-[var(--subtle)]">Configure password requirements</p>
        </div>
        <button
          onClick={handleSavePolicy}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/80"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Policy'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Policy Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Minimum Length
            </label>
            <input
              type="number"
              value={policy.minLength}
              onChange={(e) => handlePolicyChange('minLength', parseInt(e.target.value))}
              min="6"
              max="20"
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
            />
          </div>

          <div className="space-y-2">
            {[
              { key: 'requireUppercase', label: 'Require Uppercase Letter (A-Z)' },
              { key: 'requireLowercase', label: 'Require Lowercase Letter (a-z)' },
              { key: 'requireNumbers', label: 'Require Numbers (0-9)' },
              { key: 'requireSpecialChars', label: 'Require Special Characters (!@#$%)' }
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy[item.key]}
                  onChange={(e) => handlePolicyChange(item.key, e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text)]">{item.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Password Expiry (days)
            </label>
            <input
              type="number"
              value={policy.expiryDays}
              onChange={(e) => handlePolicyChange('expiryDays', parseInt(e.target.value))}
              min="30"
              max="365"
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Prevent Password Reuse (last N passwords)
            </label>
            <input
              type="number"
              value={policy.preventReuse}
              onChange={(e) => handlePolicyChange('preventReuse', parseInt(e.target.value))}
              min="1"
              max="10"
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
            />
          </div>
        </div>

        {/* Password Tester */}
        <div className="bg-[var(--card)] rounded-lg p-4">
          <h4 className="font-semibold text-[var(--text)] mb-3">Test Password Strength</h4>
          <div className="space-y-3">
            <input
              type="text"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              placeholder="Enter a password to test..."
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)]"
            />
            <button
              onClick={testPasswordStrength}
              className="w-full bg-[var(--accent)]/10 text-[var(--accent)] py-2 rounded-lg hover:bg-[var(--accent)]/20"
            >
              Test Strength
            </button>

            {validationResult && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--subtle)]">Strength:</span>
                  <span className="text-sm font-semibold" style={{ color: getStrengthColor().replace('bg-', 'text-') }}>
                    {getStrengthText()}
                  </span>
                </div>
                <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full ${getStrengthColor()} transition-all duration-300`}
                    style={{ width: validationResult.errors.length === 0 ? '100%' : `${100 - (validationResult.errors.length * 20)}%` }}
                  ></div>
                </div>
                {validationResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-red-500 mb-1">Requirements not met:</p>
                    {validationResult.errors.map((error, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-red-400">
                        <X size={12} />
                        {error}
                      </div>
                    ))}
                  </div>
                )}
                {validationResult.errors.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-green-500">
                    <Check size={12} />
                    All requirements satisfied!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordPolicy;