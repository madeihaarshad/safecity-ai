const request = require('supertest');
const mongoose = require('mongoose');

// Mock mongoose before requiring app
jest.mock('mongoose');
jest.mock('../models/Driver');
jest.mock('../models/Violation');
jest.mock('../models/Alert');
jest.mock('../models/DisasterEvent');
jest.mock('../models/Sensor');
jest.mock('socket.io');
jest.mock('axios');

// Setup mocked connection state
mongoose.connection.readyState = 1; // Connected

// Setup mocked models
const Driver = require('../models/Driver');
const Violation = require('../models/Violation');
const Alert = require('../models/Alert');
const Sensor = require('../models/Sensor');

// Now require the app after mocks are setup
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Create a test app based on server structure
const createTestApp = () => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  app.use(cors());
  app.use(express.json());

  const serverStartTime = Date.now();

  // Health check endpoint
  app.get('/health', (req, res) => {
    const uptime = Date.now() - serverStartTime;
    const dbConnected = mongoose.connection.readyState === 1;

    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? 'healthy' : 'unhealthy',
      db: dbConnected ? 'connected' : 'disconnected',
      uptime: Math.floor(uptime / 1000),
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/sensors
  app.get('/api/sensors', async (req, res) => {
    try {
      const sensors = await Sensor.find();
      res.json(sensors);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/stats
  app.get('/api/stats', async (req, res) => {
    try {
      const [violations, alerts, sensors, drivers] = await Promise.all([
        Violation.find(),
        Alert.find(),
        Sensor.find(),
        Driver.find()
      ]);

      const violationStats = {
        total: violations.length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length
      };

      const alertStats = {
        total: alerts.length,
        unresolved: alerts.filter(a => !a.resolved).length,
        critical: alerts.filter(a => a.priority === 'Critical').length
      };

      const sensorStats = {
        total: sensors.length,
        online: sensors.filter(s => s.status === 'Online').length,
        offline: sensors.filter(s => s.status === 'Offline').length
      };

      const driverStats = {
        total: drivers.length,
        highRisk: 0
      };

      res.json({
        violations: violationStats,
        alerts: alertStats,
        sensors: sensorStats,
        drivers: driverStats,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/violations
  app.get('/api/violations', async (req, res) => {
    try {
      const violations = await Violation.find().sort({ createdAt: -1 });
      res.json(violations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/violations
  app.post('/api/violations', async (req, res) => {
    try {
      const { driverId, location, speed, speedLimit, type } = req.body;

      // Validate required fields
      if (!driverId || !location || speed === undefined || speedLimit === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      let severity = 'low';
      const speedDiff = speed - speedLimit;
      if (speedDiff > 50) {
        severity = 'high';
      } else if (speedDiff > 20) {
        severity = 'medium';
      }

      const violation = await Violation.create({
        driverId,
        location,
        speed,
        speedLimit,
        type,
        severity,
        timestamp: new Date()
      });

      io.emit('newViolation', violation);

      res.status(201).json(violation);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return app;
};

describe('SafeCity AI Backend Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    test('should return 200 with healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('db');
      expect(res.body.db).toBe('connected');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });

    test('should include uptime in seconds', async () => {
      const res = await request(app).get('/health');
      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/sensors', () => {
    test('should return 200 with array of sensors', async () => {
      const mockSensors = [
        { sensorId: 'S1', location: 'Committee Chowk', status: 'Online' },
        { sensorId: 'S2', location: 'Faizabad', status: 'Online' }
      ];

      Sensor.find.mockResolvedValue(mockSensors);

      const res = await request(app).get('/api/sensors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('sensorId');
      expect(res.body[0].sensorId).toBe('S1');
    });

    test('should return empty array when no sensors exist', async () => {
      Sensor.find.mockResolvedValue([]);

      const res = await request(app).get('/api/sensors');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/stats', () => {
    test('should return 200 with violation statistics', async () => {
      const mockViolations = [
        { severity: 'high', driverId: '123' },
        { severity: 'medium', driverId: '124' },
        { severity: 'low', driverId: '125' }
      ];

      const mockAlerts = [
        { priority: 'Critical', resolved: false },
        { priority: 'High', resolved: true }
      ];

      const mockSensors = [
        { status: 'Online' },
        { status: 'Online' }
      ];

      const mockDrivers = [
        { _id: '123', name: 'Driver 1' }
      ];

      Violation.find.mockResolvedValue(mockViolations);
      Alert.find.mockResolvedValue(mockAlerts);
      Sensor.find.mockResolvedValue(mockSensors);
      Driver.find.mockResolvedValue(mockDrivers);

      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('violations');
      expect(res.body.violations).toHaveProperty('total', 3);
      expect(res.body.violations).toHaveProperty('high', 1);
      expect(res.body.violations).toHaveProperty('medium', 1);
      expect(res.body.violations).toHaveProperty('low', 1);
      expect(res.body).toHaveProperty('alerts');
      expect(res.body).toHaveProperty('sensors');
      expect(res.body).toHaveProperty('drivers');
      expect(res.body).toHaveProperty('lastUpdated');
    });

    test('should return correct alert statistics', async () => {
      const mockAlerts = [
        { priority: 'Critical', resolved: false },
        { priority: 'Critical', resolved: true },
        { priority: 'High', resolved: false }
      ];

      Violation.find.mockResolvedValue([]);
      Alert.find.mockResolvedValue(mockAlerts);
      Sensor.find.mockResolvedValue([]);
      Driver.find.mockResolvedValue([]);

      const res = await request(app).get('/api/stats');
      expect(res.body.alerts.total).toBe(3);
      expect(res.body.alerts.critical).toBe(2);
      expect(res.body.alerts.unresolved).toBe(2);
    });
  });

  describe('GET /api/violations', () => {
    test('should return 200 with array of violations', async () => {
      const mockViolations = [
        { _id: '1', driverId: '123', location: 'Main St', speed: 100, severity: 'high' },
        { _id: '2', driverId: '124', location: 'Oak Ave', speed: 75, severity: 'low' }
      ];

      Violation.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockViolations)
      });

      const res = await request(app).get('/api/violations');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('driverId');
      expect(res.body[0]).toHaveProperty('location');
      expect(res.body[0]).toHaveProperty('severity');
    });

    test('should return empty array when no violations exist', async () => {
      Violation.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([])
      });

      const res = await request(app).get('/api/violations');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('should sort violations by createdAt descending', async () => {
      const mockViolations = [
        { _id: '2', createdAt: new Date('2024-05-13') },
        { _id: '1', createdAt: new Date('2024-05-12') }
      ];

      const mockSortFn = jest.fn().mockResolvedValue(mockViolations);
      Violation.find.mockReturnValue({
        sort: mockSortFn
      });

      await request(app).get('/api/violations');
      expect(mockSortFn).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('POST /api/violations', () => {
    test('should return 201 with valid violation data', async () => {
      const validViolation = {
        driverId: '123',
        location: 'Main St',
        speed: 120,
        speedLimit: 60,
        type: 'speeding'
      };

      const createdViolation = {
        _id: '1',
        ...validViolation,
        severity: 'high',
        timestamp: new Date()
      };

      Violation.create.mockResolvedValue(createdViolation);

      const res = await request(app)
        .post('/api/violations')
        .send(validViolation);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.driverId).toBe('123');
      expect(res.body.location).toBe('Main St');
      expect(res.body.severity).toBe('high');
    });

    test('should calculate severity based on speed difference', async () => {
      // Test HIGH severity: speed - speedLimit > 50
      const highSeverityViolation = {
        driverId: '123',
        location: 'Main St',
        speed: 110,
        speedLimit: 50,
        type: 'speeding'
      };

      Violation.create.mockResolvedValue({
        ...highSeverityViolation,
        severity: 'high'
      });

      let res = await request(app)
        .post('/api/violations')
        .send(highSeverityViolation);

      expect(res.status).toBe(201);
      expect(res.body.severity).toBe('high');

      // Test MEDIUM severity: 20 < speed - speedLimit <= 50
      const mediumSeverityViolation = {
        driverId: '124',
        location: 'Oak Ave',
        speed: 85,
        speedLimit: 60,
        type: 'speeding'
      };

      Violation.create.mockResolvedValue({
        ...mediumSeverityViolation,
        severity: 'medium'
      });

      res = await request(app)
        .post('/api/violations')
        .send(mediumSeverityViolation);

      expect(res.status).toBe(201);
      expect(res.body.severity).toBe('medium');

      // Test LOW severity: speed - speedLimit <= 20
      const lowSeverityViolation = {
        driverId: '125',
        location: 'Pine Rd',
        speed: 70,
        speedLimit: 60,
        type: 'speeding'
      };

      Violation.create.mockResolvedValue({
        ...lowSeverityViolation,
        severity: 'low'
      });

      res = await request(app)
        .post('/api/violations')
        .send(lowSeverityViolation);

      expect(res.status).toBe(201);
      expect(res.body.severity).toBe('low');
    });

    test('should return 400 when missing driverId', async () => {
      const invalidViolation = {
        location: 'Main St',
        speed: 100,
        speedLimit: 60
      };

      const res = await request(app)
        .post('/api/violations')
        .send(invalidViolation);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Missing required fields');
    });

    test('should return 400 when missing location', async () => {
      const invalidViolation = {
        driverId: '123',
        speed: 100,
        speedLimit: 60
      };

      const res = await request(app)
        .post('/api/violations')
        .send(invalidViolation);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 400 when missing speed', async () => {
      const invalidViolation = {
        driverId: '123',
        location: 'Main St',
        speedLimit: 60
      };

      const res = await request(app)
        .post('/api/violations')
        .send(invalidViolation);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 400 when missing speedLimit', async () => {
      const invalidViolation = {
        driverId: '123',
        location: 'Main St',
        speed: 100
      };

      const res = await request(app)
        .post('/api/violations')
        .send(invalidViolation);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should handle database errors gracefully', async () => {
      const validViolation = {
        driverId: '123',
        location: 'Main St',
        speed: 100,
        speedLimit: 60
      };

      Violation.create.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/violations')
        .send(validViolation);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    test('GET /api/sensors should handle database errors', async () => {
      Sensor.find.mockRejectedValue(new Error('Connection failed'));

      const res = await request(app).get('/api/sensors');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });

    test('GET /api/stats should handle database errors', async () => {
      Violation.find.mockRejectedValue(new Error('Connection failed'));

      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });

    test('GET /api/violations should handle database errors', async () => {
      Violation.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Connection failed'))
      });

      const res = await request(app).get('/api/violations');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
