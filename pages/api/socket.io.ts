import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from 'net';
import type { Server as HTTPServer } from 'http';

// Extend the NextApiResponse type to include the socket property with server
interface SocketNextApiResponse extends NextApiResponse {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: Server;
    };
  };
}

let users: string[] = []; // In-memory array to store socket IDs
const userPairs: Map<string, string> = new Map(); // Track paired users
let totalConnectedUsers = 0; // Track total number of connected users

const SocketHandler = (req: NextApiRequest, res: SocketNextApiResponse) => {
  console.log('Socket.IO handler called with method:', req.method);
  console.log('Socket.IO handler headers:', JSON.stringify(req.headers));
  console.log('Socket.IO handler query:', JSON.stringify(req.query));
  
  // Set CORS headers for Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (res.socket?.server.io) {
    console.log('Socket.IO is already running');
    res.end();
    return;
  }
  
  console.log('Socket.IO is initializing');
  const io = new Server(res.socket.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: false
    },
    transports: ['polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    console.log(`Current users before adding: ${users.length}`);
    console.log(`Current user list: ${JSON.stringify(users)}`);
    users.push(socket.id);
    
    // Increment total connected users count
    totalConnectedUsers++;
    console.log(`Total connected users: ${totalConnectedUsers}`);
    
    // Broadcast updated user count to all clients
    console.log(`Broadcasting online_users_count event with count: ${totalConnectedUsers}`);
    io.emit('online_users_count', { count: totalConnectedUsers });
    console.log('Broadcast completed');
    
    console.log(`Users after connection: ${users.length}`);
    console.log(`Updated user list: ${JSON.stringify(users)}`);

    // Pair users if there are at least two
    if (users.length >= 2) {
      console.log(`Enough users to pair: ${users.length}`);
      const [user1, user2] = users.splice(0, 2);
      console.log(`Pairing ${user1} with ${user2}`);
      
      // Track the pairing
      userPairs.set(user1, user2);
      userPairs.set(user2, user1);
      
      // Designate user1 as caller and user2 as receiver
      console.log(`Emitting partner event to ${user1} (caller) with partner ${user2}`);
      io.to(user1).emit('partner', { partnerId: user2, isCaller: true });
      
      console.log(`Emitting partner event to ${user2} (receiver) with partner ${user1}`);
      io.to(user2).emit('partner', { partnerId: user1, isCaller: false });
      
      console.log(`Successfully paired ${user1} (caller) with ${user2} (receiver)`);
      console.log(`Remaining users: ${JSON.stringify(users)}`);
    } else {
      console.log(`Not enough users to pair yet. Current count: ${users.length}`);
    }

    socket.on('signal', (data) => {
      // Relay signal to the other peer
      io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
      console.log(`Relaying signal from ${socket.id} to ${data.to}`);
    });
    
    socket.on('request_online_count', () => {
      console.log(`User ${socket.id} requested current online users count: ${totalConnectedUsers}`);
      socket.emit('online_users_count', { count: totalConnectedUsers });
      console.log(`Sent online_users_count event to ${socket.id} with count: ${totalConnectedUsers}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      console.log(`Users before disconnect: ${JSON.stringify(users)}`);
      
      // Decrement total connected users count
      totalConnectedUsers = Math.max(0, totalConnectedUsers - 1);
      console.log(`Total connected users after disconnect: ${totalConnectedUsers}`);
      
      // Broadcast updated user count to all clients
      console.log(`Broadcasting online_users_count event on disconnect with count: ${totalConnectedUsers}`);
      io.emit('online_users_count', { count: totalConnectedUsers });
      console.log('Disconnect broadcast completed');
      
      // Check if this user was paired with someone
      const partnerId = userPairs.get(socket.id);
      if (partnerId) {
        console.log(`Disconnected user ${socket.id} was paired with ${partnerId}`);
        
        // Remove the pairing
        userPairs.delete(socket.id);
        userPairs.delete(partnerId);
        
        // Notify the partner about disconnection
        io.to(partnerId).emit('partner_disconnected', { disconnectedPartnerId: socket.id });
        
        // Add the remaining partner back to the waiting queue for automatic reconnection
        if (!users.includes(partnerId)) {
          users.push(partnerId);
          console.log(`Added partner ${partnerId} back to waiting queue for reconnection`);
          
          // Try to pair them immediately if there are other waiting users
          if (users.length >= 2) {
            console.log(`Attempting immediate reconnection for ${partnerId}`);
            const [user1, user2] = users.splice(0, 2);
            console.log(`Auto-pairing ${user1} with ${user2} after disconnect`);
            
            // Track the new pairing
            userPairs.set(user1, user2);
            userPairs.set(user2, user1);
            
            // Designate user1 as caller and user2 as receiver
            console.log(`Emitting partner event to ${user1} (caller) with partner ${user2}`);
            io.to(user1).emit('partner', { partnerId: user2, isCaller: true });
            
            console.log(`Emitting partner event to ${user2} (receiver) with partner ${user1}`);
            io.to(user2).emit('partner', { partnerId: user1, isCaller: false });
            
            console.log(`Successfully auto-paired ${user1} (caller) with ${user2} (receiver)`);
          }
        }
      }
      
      // Remove from users array
      users = users.filter((id) => id !== socket.id);
      console.log(`Users after disconnect: ${JSON.stringify(users)}`);
    });
  });
  
  res.end();
};

export default SocketHandler;