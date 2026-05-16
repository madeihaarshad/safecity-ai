import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});

socket.on('connect_error', (err) => {
  console.warn('⚠️ Socket error:', err.message);
});

// Export functions
export const sendEmergencySOS = (data) => {
  if (socket.connected) {
    socket.emit('emergencySOS', data);
  }
};

export const reportHazard = (data) => {
  if (socket.connected) {
    socket.emit('reportHazard', data);
  }
};

export const shareLocation = (data) => {
  if (socket.connected) {
    socket.emit('driverLocation', data);
  }
};

export const requestRouteUpdate = (data) => {
  if (socket.connected) {
    socket.emit('requestRoute', data);
  }
};

export const sendTripStatus = (data) => {
  if (socket.connected) {
    socket.emit('tripStatus', data);
  }
};

export const sendDriverFeedback = (data) => {
  if (socket.connected) {
    socket.emit('driverFeedback', data);
  }
};

export const isSocketConnected = () => socket.connected;

export const getSocketId = () => socket.id;

export default socket;