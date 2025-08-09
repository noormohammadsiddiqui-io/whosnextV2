import { io } from 'socket.io-client';

// Get the base URL for Socket.IO connection
const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
};

const socket = io(getSocketUrl(), {
  transports: ['polling'], // Use only polling for Vercel compatibility
  autoConnect: true,
  forceNew: false,
  timeout: 60000, // Increased timeout for serverless cold starts
  reconnection: true,
  reconnectionAttempts: 20, // More attempts for serverless environment
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  // Vercel-optimized options
  upgrade: false, // Disable upgrade to websocket
  rememberUpgrade: false,
  closeOnBeforeunload: false,
  forceBase64: false,
});

// Enhanced debugging for connection events
socket.on('connect', () => {
  console.log('Socket.IO connected:', socket.id);
  console.log('Socket transport:', socket.io.engine.transport.name);
  console.log('Socket connected status:', socket.connected);
  
  // Request current online users count when connecting
  console.log('Requesting current online users count after connection');
  socket.emit('request_online_count');
});

socket.on('disconnect', (reason) => {
  console.log('Socket.IO disconnected:', reason);
  console.log('Socket connected status:', socket.connected);
  
  // Handle specific disconnect reasons
  if (reason === 'io server disconnect') {
    // Server initiated disconnect, reconnect manually
    console.log('Server disconnected, attempting manual reconnection');
    socket.connect();
  }
});

socket.on('connect_error', (error) => {
  // Handle transport errors specifically - these are normal during transport negotiation
  if ('type' in error && error.type === 'TransportError') {
    // Only log xhr poll errors if they persist, not during normal negotiation
    if (error.message === 'xhr poll error') {
      // This is a common polling transport error, usually temporary
      console.log('Polling transport error (temporary) - Socket.IO will retry automatically');
      return;
    }
    console.log('Transport error detected - this is normal during transport negotiation');
    return;
  }
  
  // Log other connection errors normally
  console.error('Socket.IO connection error:', error);
  console.error('Error details:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
  console.log('Current transport:', socket.io.engine.transport.name);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Socket.IO reconnection attempt', attemptNumber);
});

socket.on('reconnect_error', (error) => {
  console.error('Socket.IO reconnection error:', error);
  if ('type' in error) {
    console.error('Reconnection error type:', error.type);
  }
});

socket.on('reconnect_failed', () => {
  console.error('Socket.IO reconnection failed - all attempts exhausted');
  console.log('Attempting manual reconnection...');
  // Try to reconnect manually after a delay
  setTimeout(() => {
    if (!socket.connected) {
      console.log('Manual reconnection attempt');
      socket.connect();
    }
  }, 5000);
});

// Handle transport events through engine
socket.io.engine.on('upgrade', () => {
  console.log('Socket.IO transport upgraded to:', socket.io.engine.transport.name);
});

socket.io.engine.on('upgradeError', (error: Error) => {
  console.error('Socket.IO transport upgrade error:', error);
});

// Create a store for online users count that components can subscribe to
let onlineUsersCount = 0;
let onlineUsersCountListeners: ((count: number) => void)[] = [];

// Listen for online users count updates
socket.on('online_users_count', (data: { count: number }) => {
  console.log('Received online users count event:', data);
  console.log('Event data type:', typeof data);
  console.log('Event data structure:', JSON.stringify(data, null, 2));
  
  if (data && typeof data.count === 'number') {
    console.log('Setting online users count to:', data.count);
    onlineUsersCount = data.count;
    
    // Notify all listeners
    console.log('Notifying', onlineUsersCountListeners.length, 'listeners about new count');
    onlineUsersCountListeners.forEach(listener => listener(onlineUsersCount));
  } else {
    console.error('Invalid online users count data received:', data);
  }
});

// Function to subscribe to online users count updates
export const subscribeToOnlineUsersCount = (callback: (count: number) => void) => {
  console.log('New subscription to online users count, current count:', onlineUsersCount);
  console.log('Current listeners count before adding:', onlineUsersCountListeners.length);
  
  onlineUsersCountListeners.push(callback);
  
  console.log('Current listeners count after adding:', onlineUsersCountListeners.length);
  
  // Immediately call with current value
  console.log('Immediately calling callback with current count:', onlineUsersCount);
  callback(onlineUsersCount);
  
  // Return unsubscribe function
  return () => {
    console.log('Unsubscribing from online users count');
    onlineUsersCountListeners = onlineUsersCountListeners.filter(listener => listener !== callback);
    console.log('Listeners count after unsubscribe:', onlineUsersCountListeners.length);
  };
};

// Function to get current online users count
export const getOnlineUsersCount = () => onlineUsersCount;

export default socket;