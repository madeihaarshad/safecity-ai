import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, AlertCircle, Eye, EyeOff, User, Mail, Phone, Car, Key, UserPlus } from 'lucide-react';

const DriverSignup = () => {
  const { signupAsDriver } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    licenseNumber: '',
    email: '',
    phone: '',
    vehicleNumber: '',
    vehicleType: 'car',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...signupData } = formData;
    const result = await signupAsDriver(signupData);
    
    if (result.success) {
      navigate('/driver-dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--bg)] to-[var(--surface)]">
      <div className="max-w-md w-full bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border)] p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck size={40} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Driver Registration</h1>
          <p className="text-sm text-[var(--subtle)] mt-2">Join SafeCity AI fleet</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" size={18} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">License Number</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" size={18} />
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="LIC-12345"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" size={18} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="driver@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" size={18} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="+92 300 1234567"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Vehicle Number</label>
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" size={18} />
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="ABC-123"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Vehicle Type</label>
            <select
              name="vehicleType"
              value={formData.vehicleType}
              onChange={handleChange}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="car">Car</option>
              <option value="truck">Truck</option>
              <option value="bus">Bus</option>
              <option value="motorcycle">Motorcycle</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="Min 6 characters"
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

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2 text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-semibold py-2 rounded-lg transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Register as Driver
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--subtle)]">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent)] hover:underline font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverSignup;