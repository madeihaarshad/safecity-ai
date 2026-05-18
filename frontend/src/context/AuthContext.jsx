import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [driverToken, setDriverToken] = useState(localStorage.getItem('driverToken'));

  const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else if (driverToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${driverToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token, driverToken]);

  // Fetch admin profile
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else if (driverToken) {
      fetchDriverProfile();
    } else {
      setLoading(false);
    }
  }, [token, driverToken]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/profile`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/drivers/profile`);
      setDriver(response.data);
    } catch (error) {
      console.error('Failed to fetch driver profile:', error);
      localStorage.removeItem('driverToken');
      setDriverToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Admin login
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const data = response.data;
      
      if (data.requires2FA) {
        return { 
          success: false, 
          requires2FA: true,
          userId: data.userId,
          email: data.email
        };
      }
      
      const { token, user } = data;
      localStorage.setItem('token', token);
      localStorage.removeItem('driverToken');
      setToken(token);
      setDriverToken(null);
      setUser(user);
      setDriver(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  // Verify 2FA for admin
  const verify2FA = async (userId, code, backupCode = null) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-2fa`, { userId, code, backupCode });
      
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.removeItem('driverToken');
        setToken(token);
        setDriverToken(null);
        setUser(user);
        setDriver(null);
        return { success: true };
      }
      return { success: false, error: response.data.message || '2FA verification failed' };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || '2FA verification failed' };
    }
  };

  // Driver login
  const loginAsDriver = async (licenseNumber, password) => {
    try {
      const response = await axios.post(`${API_URL}/drivers/login`, { licenseNumber, password });
      const data = response.data;
      
      if (data.requires2FA) {
        return { 
          success: false, 
          requires2FA: true,
          userId: data.userId,
          licenseNumber: data.licenseNumber
        };
      }
      
      const { token, driver } = data;
      localStorage.setItem('driverToken', token);
      localStorage.removeItem('token');
      setDriverToken(token);
      setToken(null);
      setDriver(driver);
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  // Verify 2FA for driver
  const verifyDriver2FA = async (userId, code, backupCode = null) => {
    try {
      const response = await axios.post(`${API_URL}/drivers/verify-2fa`, { userId, code, backupCode });
      
      if (response.data.success) {
        const { token, driver } = response.data;
        localStorage.setItem('driverToken', token);
        localStorage.removeItem('token');
        setDriverToken(token);
        setToken(null);
        setDriver(driver);
        setUser(null);
        return { success: true };
      }
      return { success: false, error: response.data.message || '2FA verification failed' };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || '2FA verification failed' };
    }
  };

  // Driver signup
  const signupAsDriver = async (driverData) => {
    try {
      const response = await axios.post(`${API_URL}/drivers/register`, driverData);
      const { token, driver } = response.data;
      localStorage.setItem('driverToken', token);
      localStorage.removeItem('token');
      setDriverToken(token);
      setToken(null);
      setDriver(driver);
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Signup failed' };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('driverToken');
    setToken(null);
    setDriverToken(null);
    setUser(null);
    setDriver(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const isAuthenticated = !!user || !!driver;
  const isAdmin = !!user;
  const isDriver = !!driver;

  return (
    <AuthContext.Provider value={{
      user,
      driver,
      loading,
      login,
      verify2FA,
      loginAsDriver,
      verifyDriver2FA,
      signupAsDriver,
      logout,
      isAuthenticated,
      isAdmin,
      isDriver
    }}>
      {children}
    </AuthContext.Provider>
  );
};
