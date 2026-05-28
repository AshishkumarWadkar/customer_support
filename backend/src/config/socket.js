const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwtUtils');
const logger = require('../utils/logger');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Auth middleware: every socket must carry a valid JWT ──────────
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      socket.user = decoded; // attach decoded user to socket
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: user=${socket.user.id} role=${socket.user.role} socketId=${socket.id}`);

    // Each authenticated user joins their own private room
    socket.join(`user:${socket.user.id}`);

    // Staff also join a shared staff room for broadcast events
    if (['SUPER_ADMIN', 'MANAGER', 'AGENT'].includes(socket.user.role)) {
      socket.join('staff');
    }

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: user=${socket.user.id} reason=${reason}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

/**
 * Get the active Socket.IO instance.
 * Call this from services after initSocket() has been called.
 */
const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket(httpServer) first');
  return io;
};

/**
 * Broadcast a ticket reassignment event to all connected staff members.
 * The ticket list on every open browser tab will react to this.
 */
const emitTicketReassigned = (ticketId, payload) => {
  if (!io) return; // graceful no-op if sockets not up
  io.to('staff').emit('ticket:reassigned', { ticketId, ...payload });
  logger.info(`ticket:reassigned emitted for ticket ${ticketId}`);
};

/**
 * Notify a specific user that their role has changed.
 * The event is sent only to the target user's private room so that their
 * active browser session can update immediately without requiring re-login.
 *
 * @param {number} userId  - The user whose role was changed
 * @param {object} payload - { role: 'NEW_ROLE_NAME' }
 */
const emitRoleUpdated = (userId, payload) => {
  if (!io) return; // graceful no-op if sockets not up
  io.to(`user:${userId}`).emit('role:updated', payload);
  logger.info(`role:updated emitted for user ${userId} → role=${payload.role}`);
};

module.exports = { initSocket, getIO, emitTicketReassigned, emitRoleUpdated };
