import { Server } from 'socket.io';

/**
 * Socket.IO Real-Time Gateway Scaffold
 * 
 * Sets up server listeners and defines placeholders for real-time events.
 */
export const initSocketGateway = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all origins for scaffolding
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO Gateway] Client connected: ${socket.id}`);

    // Placeholder: Join Room (e.g. for specific Ride or User channels)
    socket.on('join_room', (roomName) => {
      socket.join(roomName);
      console.log(`[Socket.IO Gateway] Socket ${socket.id} joined room: ${roomName}`);
      socket.to(roomName).emit('room_event', {
        message: `User socket ${socket.id} joined the room`
      });
    });

    // Placeholder: Live Location Updates
    socket.on('share_location', (data) => {
      // data: { rideId, userId, lat, lng }
      const { rideId } = data;
      console.log(`[Socket.IO Gateway] Location update for ride ${rideId}:`, data);
      
      // Broadcast location to all clients listening to this ride room
      socket.to(`ride_${rideId}`).emit('location_update', data);
    });

    // Placeholder: SOS Alerts
    socket.on('sos_alert', (data) => {
      console.log(`[Socket.IO Gateway] SOS Real-time alert:`, data);
      // Immediately fan-out to admin consoles or emergency listeners
      io.emit('admin_sos_alert', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO Gateway] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};
