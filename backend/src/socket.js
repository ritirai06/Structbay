const socketIo = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL,
          process.env.ADMIN_URL,
          process.env.CUSTOMER_URL,
          process.env.VENDOR_URL,
        ].filter(Boolean),
        credentials: true,
      },
    });

    io.on('connection', (socket) => {
      // In a more complex app, we'd authenticate the socket and join rooms (e.g. 'admins', 'vendor_123').
      // For now, we will just use basic broadcasting. If the frontend emits 'join_admin', we add them to 'admins' room.
      
      socket.on('join_admin', () => {
        socket.join('admins');
      });

      socket.on('join_vendor', (vendorId) => {
        if (vendorId) socket.join(`vendor_${vendorId}`);
      });

      socket.on('join_customer', (customerId) => {
        if (customerId) socket.join(`customer_${customerId}`);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
  broadcastToAdmins: (event, payload) => {
    if (io) {
      io.to('admins').emit(event, payload);
    }
  },
  emitToVendor: (vendorId, event, payload) => {
    if (io && vendorId) {
      io.to(`vendor_${vendorId}`).emit(event, payload);
    }
  }
};
