const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { Pool } = require('pg');

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://chat_user:chat_password@localhost:5432/chat_app';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const pool = new Pool({ connectionString: DATABASE_URL });

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] }
});

// Redis pub/sub clients
const pubClient = createClient({ url: REDIS_URL });
const subClient = createClient({ url: REDIS_URL });

async function start() {
  await pubClient.connect();
  await subClient.connect();

  // Subscribe to all room channels
  await subClient.pSubscribe('room:*', (message, channel) => {
    const roomId = channel.replace('room:', '');
    try {
      const parsed = JSON.parse(message);
      io.to(roomId).emit(parsed.event, parsed.data);
    } catch (err) {
      console.error('Redis message parse error:', err);
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected`);

    socket.on('join-room', async ({ roomId }) => {
      if (!roomId) {
        socket.emit('join-room-error', { error: 'roomId is required' });
        return;
      }
      try {
        const result = await pool.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 LIMIT 1',
          [roomId, socket.user.id]
        );
        if (result.rows.length === 0) {
          socket.emit('join-room-error', { error: 'Not authorized to join this room' });
          return;
        }
        socket.join(roomId);
        await pubClient.set(`user:socket:${socket.user.id}`, socket.id);
        socket.to(roomId).emit('user-joined', { userId: socket.user.id, username: socket.user.username });
      } catch (err) {
        console.error('Join room authorization error:', err);
        socket.emit('join-room-error', { error: 'Failed to join room' });
      }
    });

    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { userId: socket.user.id, username: socket.user.username });
    });

    socket.on('send-message', async ({ roomId, content, optimisticId }) => {
      try {
        const membership = await pool.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 LIMIT 1',
          [roomId, socket.user.id]
        );
        if (membership.rows.length === 0) {
          socket.emit('message-error', { optimisticId, error: 'Not authorized to send messages in this room' });
          return;
        }
        const result = await pool.query(
          'INSERT INTO messages (room_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
          [roomId, socket.user.id, content]
        );
        const message = { ...result.rows[0], username: socket.user.username };

        await pubClient.publish(`room:${roomId}`, JSON.stringify({
          event: 'new-message',
          data: { ...message, optimisticId }
        }));
      } catch (err) {
        console.error('Send message error:', err);
        socket.emit('message-error', { optimisticId, error: 'Failed to send message' });
      }
    });

    socket.on('heartbeat', () => {
      socket.lastHeartbeat = Date.now();
      socket.emit('heartbeat-ack');
    });

    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected`);
      await pubClient.del(`user:socket:${socket.user.id}`);
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => console.log(`WebSocket server running on port ${PORT}`));
}

start().catch(console.error);
