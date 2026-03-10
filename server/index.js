import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './game/GameRoom.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('create-room', (playerName, callback) => {
    const code = generateRoomCode();
    const room = new GameRoom(code);
    room.addPlayer(socket.id, playerName);
    rooms.set(code, room);
    socket.join(code);
    callback({ success: true, code, player: room.getPlayer(socket.id) });
  });

  socket.on('join-room', (code, playerName, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ success: false, error: 'Room not found' });
    if (room.phase !== 'lobby') return callback({ success: false, error: 'Game already started' });
    try {
      room.addPlayer(socket.id, playerName);
      socket.join(code);
      io.to(code).emit('room-updated', { players: room.players, phase: room.phase });
      callback({ success: true, code, player: room.getPlayer(socket.id) });
    } catch (e) {
      callback({ success: false, error: e.message });
    }
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      const player = room.getPlayer(socket.id);
      if (player) {
        room.removePlayer(socket.id);
        io.to(code).emit('room-updated', { players: room.players, phase: room.phase });
        if (room.players.length === 0) rooms.delete(code);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
