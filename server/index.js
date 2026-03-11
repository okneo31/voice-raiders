import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GameRoom } from './game/GameRoom.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
  app.get('{*path}', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const rooms = new Map();
const roomTimers = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function clearRoomTimers(code) {
  const timers = roomTimers.get(code);
  if (timers) {
    timers.forEach(t => clearInterval(t));
    roomTimers.set(code, []);
  }
}

function startAuctionTimer(code) {
  clearRoomTimers(code);
  let timeLeft = 30;
  const timer = setInterval(() => {
    timeLeft--;
    io.to(code).emit('timer', { phase: 'auction', timeLeft });
    if (timeLeft <= 0) {
      clearInterval(timer);
      const room = rooms.get(code);
      if (!room || room.phase !== 'auction') return;
      const result = room.auction.finalizeCurrentItem(room.players);
      io.to(code).emit('auction-result', result);
      if (room.auction.isComplete()) {
        room.startBattle();
        io.to(code).emit('game-state', room.getState());
        startBattleTimers(code);
      } else {
        io.to(code).emit('game-state', room.getState());
        startAuctionTimer(code);
      }
    }
  }, 1000);
  roomTimers.set(code, [timer]);
}

function startBattleTimers(code) {
  clearRoomTimers(code);
  const timers = [];

  let timeLeft = 60;
  const durationTimer = setInterval(() => {
    timeLeft--;
    io.to(code).emit('timer', { phase: 'battle', timeLeft });
    if (timeLeft <= 0) {
      clearRoomTimers(code);
      const room = rooms.get(code);
      if (!room || room.phase !== 'battle') return;
      room.endBattle(false);
      io.to(code).emit('game-state', room.getState());
    }
  }, 1000);
  timers.push(durationTimer);

  const bossTimer = setInterval(() => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'battle') { clearInterval(bossTimer); return; }
    const result = room.battle.bossAttack();
    io.to(code).emit('boss-attack', result);
    if (room.battle.isPartyWiped()) {
      clearRoomTimers(code);
      room.endBattle(false);
      io.to(code).emit('game-state', room.getState());
    }
  }, 5000);
  timers.push(bossTimer);

  roomTimers.set(code, timers);
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('create-room', (playerName, callback) => {
    const code = generateRoomCode();
    const room = new GameRoom(code);
    room.addPlayer(socket.id, playerName);
    rooms.set(code, room);
    socket.join(code);
    callback({ success: true, code, player: room.getPlayer(socket.id).toJSON() });
  });

  socket.on('join-room', (code, playerName, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ success: false, error: 'Room not found' });
    if (room.phase !== 'lobby') return callback({ success: false, error: 'Game already started' });
    try {
      room.addPlayer(socket.id, playerName);
      socket.join(code);
      io.to(code).emit('room-updated', room.getState());
      callback({ success: true, code, player: room.getPlayer(socket.id).toJSON() });
    } catch (e) {
      callback({ success: false, error: e.message });
    }
  });

  socket.on('select-role', (code, role, callback) => {
    const room = rooms.get(code);
    if (!room) return callback({ success: false, error: 'Room not found' });
    const player = room.getPlayer(socket.id);
    if (!player) return callback({ success: false, error: 'Not in room' });
    player.setRole(role);
    io.to(code).emit('room-updated', room.getState());
    callback({ success: true });
  });

  socket.on('start-game', (code) => {
    const room = rooms.get(code);
    if (!room || !room.allRolesSelected() || room.players.length < 1) return;
    room.startGame();
    io.to(code).emit('game-state', room.getState());
    startAuctionTimer(code);
  });

  socket.on('auction-bid', (code, amount, volume) => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'auction') return;
    const success = room.auction.placeBid(socket.id, amount, volume, room.players);
    if (success) {
      io.to(code).emit('bid-updated', {
        playerId: socket.id,
        playerName: room.getPlayer(socket.id)?.name,
        amount,
        volume,
      });
    }
  });

  socket.on('auction-pass', (code) => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'auction') return;
    room.auction.pass(socket.id);

    if (room.auction.allPassed(room.players)) {
      clearRoomTimers(code);
      const result = room.auction.finalizeCurrentItem(room.players);
      io.to(code).emit('auction-result', result);
      if (room.auction.isComplete()) {
        room.startBattle();
        io.to(code).emit('game-state', room.getState());
        startBattleTimers(code);
      } else {
        io.to(code).emit('game-state', room.getState());
        startAuctionTimer(code);
      }
    }
  });

  socket.on('battle-action', (code, { type, value }) => {
    const room = rooms.get(code);
    if (!room || room.phase !== 'battle') return;
    const player = room.getPlayer(socket.id);
    if (!player) return;

    let result = {};
    if (type === 'warrior-attack') {
      result.damage = room.battle.processWarriorAttack(socket.id, value);
    } else if (type === 'mage-attack') {
      result.damage = room.battle.processMageAttack(socket.id, value);
    } else if (type === 'healer-action') {
      result.healing = room.battle.processHealerAction(socket.id, value);
    } else if (type === 'dodge') {
      room.battle.registerDodge(socket.id);
      result.dodged = true;
    }

    io.to(code).emit('battle-update', {
      playerId: socket.id,
      playerName: player.name,
      ...result,
      gameState: room.battle.getState(),
    });

    if (room.battle.isBossDefeated()) {
      clearRoomTimers(code);
      room.endBattle(true);
      io.to(code).emit('game-state', room.getState());
      if (room.phase === 'auction') startAuctionTimer(code);
    }
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      const player = room.getPlayer(socket.id);
      if (player) {
        player.hp = 0;
        room.removePlayer(socket.id);
        if (room.players.length === 0) {
          clearRoomTimers(code);
          rooms.delete(code);
        } else {
          io.to(code).emit('room-updated', room.getState());
          if (room.phase === 'battle' && room.battle?.isPartyWiped()) {
            clearRoomTimers(code);
            room.endBattle(false);
            io.to(code).emit('game-state', room.getState());
          }
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
