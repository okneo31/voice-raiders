# Voice Raiders Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-optimized multiplayer voice-controlled RPG web game where 2-5 players bid on items via voice auction and fight bosses using role-specific voice mechanics.

**Architecture:** Monorepo with React+Vite frontend and Node.js+Socket.io backend. Voice input processed client-side (Web Audio API for volume/pitch, Web Speech API for STT), results sent to server via Socket.io. Server manages game state machine (lobby → auction → battle → results).

**Tech Stack:** React 18, Vite, Node.js, Express, Socket.io, Web Audio API, Web Speech API, Jest (server tests), cross-env

**Spec:** `docs/superpowers/specs/2026-03-11-voice-raiders-design.md`

---

## File Structure

```
voicegame/
├── package.json                        # Root workspace config
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx                    # React entry point
│   │   ├── App.jsx                     # Root component with game state routing
│   │   ├── socket.js                   # Socket.io client singleton
│   │   ├── hooks/
│   │   │   ├── useVoiceVolume.js       # Web Audio API: real-time volume level
│   │   │   ├── useSpeechRecognition.js # Web Speech API: speech-to-text
│   │   │   └── useSocket.js            # Socket.io event helpers
│   │   ├── components/
│   │   │   ├── Lobby.jsx               # Room creation/join, role select, mic test
│   │   │   ├── MicTest.jsx             # Volume calibration widget
│   │   │   ├── RoleSelect.jsx          # Warrior/Mage/Healer selection
│   │   │   ├── Auction.jsx             # Auction phase UI
│   │   │   ├── Battle.jsx              # Battle phase UI
│   │   │   ├── BossDisplay.jsx         # Boss HP bar and attack display
│   │   │   ├── PlayerStatus.jsx        # Individual player HUD
│   │   │   └── Results.jsx             # End-game results screen
│   │   ├── game/
│   │   │   └── constants.js            # Shared constants (roles, items, bosses)
│   │   └── styles/
│   │       └── global.css              # Mobile-first global styles
│   └── public/
│       └── favicon.ico
├── server/
│   ├── package.json
│   ├── index.js                        # Express + Socket.io server entry
│   ├── game/
│   │   ├── GameRoom.js                 # Game state machine per room
│   │   ├── AuctionPhase.js             # Auction round logic
│   │   ├── BattlePhase.js              # Battle round logic
│   │   ├── Player.js                   # Player state class
│   │   ├── items.js                    # Item definitions and generation
│   │   └── bosses.js                   # Boss definitions and scaling
│   └── __tests__/
│       ├── GameRoom.test.js
│       ├── AuctionPhase.test.js
│       ├── BattlePhase.test.js
│       └── Player.test.js
```

---

## Chunk 1: Project Setup & Socket.io Connection

### Task 1: Initialize Monorepo

**Files:**
- Create: `package.json`
- Create: `client/package.json`
- Create: `server/package.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "voice-raiders",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server"
  }
}
```

- [ ] **Step 2: Initialize client with Vite + React**

Run:
```bash
cd client
npm create vite@latest . -- --template react
```

- [ ] **Step 3: Initialize server**

Create `server/package.json`:
```json
{
  "name": "voice-raiders-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node --watch index.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  }
}
```

- [ ] **Step 4: Install dependencies**

Run from root:
```bash
npm install concurrently cross-env -D
cd server && npm install express socket.io cors
cd server && npm install jest @jest/globals -D
cd client && npm install socket.io-client
```

- [ ] **Step 4b: Create Jest ESM config for server**

Create `server/jest.config.js`:
```javascript
export default {
  testEnvironment: 'node',
  transform: {},
};
```

- [ ] **Step 5: Commit**

```bash
git init
echo "node_modules\ndist\n.superpowers" > .gitignore
git add -A
git commit -m "chore: initialize monorepo with client (React+Vite) and server (Express+Socket.io)"
```

---

### Task 2: Basic Socket.io Server

**Files:**
- Create: `server/index.js`
- Test: `server/__tests__/GameRoom.test.js`

- [ ] **Step 1: Write the failing test for room creation**

Create `server/__tests__/GameRoom.test.js`:
```javascript
import { GameRoom } from '../game/GameRoom.js';

describe('GameRoom', () => {
  test('creates room with code and empty players', () => {
    const room = new GameRoom('ABC123');
    expect(room.code).toBe('ABC123');
    expect(room.players).toEqual([]);
    expect(room.phase).toBe('lobby');
  });

  test('adds player to room', () => {
    const room = new GameRoom('ABC123');
    room.addPlayer('socket1', 'Player1');
    expect(room.players).toHaveLength(1);
    expect(room.players[0].name).toBe('Player1');
  });

  test('rejects player when room is full (5 max)', () => {
    const room = new GameRoom('ABC123');
    for (let i = 0; i < 5; i++) {
      room.addPlayer(`socket${i}`, `Player${i}`);
    }
    expect(() => room.addPlayer('socket5', 'Player5')).toThrow('Room is full');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module '../game/GameRoom.js'`

- [ ] **Step 3: Implement GameRoom class**

Create `server/game/GameRoom.js`:
```javascript
export class GameRoom {
  constructor(code) {
    this.code = code;
    this.players = [];
    this.phase = 'lobby';
    this.round = 0;
    this.maxRounds = 5;
  }

  addPlayer(socketId, name) {
    if (this.players.length >= 5) {
      throw new Error('Room is full');
    }
    this.players.push({
      socketId,
      name,
      role: null,
      gold: 100,
      hp: 100,
      items: [],
      stats: { damage: 0, healing: 0 },
    });
  }

  removePlayer(socketId) {
    this.players = this.players.filter(p => p.socketId !== socketId);
  }

  getPlayer(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test`
Expected: 3 tests PASS

- [ ] **Step 5: Create Socket.io server entry point**

Create `server/index.js`:
```javascript
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
        player.hp = 0; // Mark as dead if in-game
        room.removePlayer(socket.id);
        if (room.players.length === 0) {
          clearRoomTimers(code);
          rooms.delete(code);
        } else {
          io.to(code).emit('room-updated', room.getState());
          // Check if party wiped after disconnect
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
```

- [ ] **Step 6: Commit**

```bash
git add server/
git commit -m "feat: add GameRoom class and Socket.io server with room create/join"
```

---

### Task 3: Socket.io Client Setup

**Files:**
- Create: `client/src/socket.js`
- Create: `client/src/hooks/useSocket.js`
- Modify: `client/vite.config.js`

- [ ] **Step 1: Configure Vite proxy for dev**

Replace `client/vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 2: Create Socket.io client singleton**

Create `client/src/socket.js`:
```javascript
import { io } from 'socket.io-client';

const URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: false,
});
```

- [ ] **Step 3: Create useSocket hook**

Create `client/src/hooks/useSocket.js`:
```javascript
import { useEffect, useState } from 'react';
import { socket } from '../socket';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.connect();

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket, isConnected };
}
```

- [ ] **Step 4: Test connection manually**

Run: `npm run dev` (starts both client and server)
Open browser, check console for "Connected: <socket_id>" on server.

- [ ] **Step 5: Commit**

```bash
git add client/
git commit -m "feat: add Socket.io client with dev proxy and useSocket hook"
```

---

## Chunk 2: Voice Input System

### Task 4: Volume Detection Hook (Web Audio API)

**Files:**
- Create: `client/src/hooks/useVoiceVolume.js`

- [ ] **Step 1: Implement useVoiceVolume hook**

Create `client/src/hooks/useVoiceVolume.js`:
```javascript
import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceVolume() {
  const [volume, setVolume] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function updateVolume() {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        const normalized = Math.min(avg / 128, 1);
        setVolume(normalized);
        rafRef.current = requestAnimationFrame(updateVolume);
      }

      updateVolume();
      setIsListening(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setVolume(0);
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { volume, isListening, start, stop };
}
```

- [ ] **Step 2: Manual test — create a quick test component**

Temporarily add to `App.jsx` to verify volume detection works with microphone. Check that the volume value changes when speaking.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useVoiceVolume.js
git commit -m "feat: add useVoiceVolume hook with Web Audio API volume detection"
```

---

### Task 5: Speech Recognition Hook (Web Speech API)

**Files:**
- Create: `client/src/hooks/useSpeechRecognition.js`

- [ ] **Step 1: Implement useSpeechRecognition hook**

Create `client/src/hooks/useSpeechRecognition.js`:
```javascript
import { useState, useRef, useCallback } from 'react';

export function useSpeechRecognition({ lang = 'ko-KR', onResult } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('SpeechRecognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        onResultRef.current?.(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      ref.stop();
      setIsListening(false);
    }
  }, []);

  return { isListening, transcript, start, stop };
}
```

- [ ] **Step 2: Manual test with temporary UI**

Verify STT works: speak Korean words, check transcript updates in real-time.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useSpeechRecognition.js
git commit -m "feat: add useSpeechRecognition hook with Web Speech API for Korean STT"
```

---

## Chunk 3: Game State Machine & Core Logic

### Task 6: Player Class

**Files:**
- Create: `server/game/Player.js`
- Test: `server/__tests__/Player.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/__tests__/Player.test.js`:
```javascript
import { Player } from '../game/Player.js';

describe('Player', () => {
  test('creates player with default stats', () => {
    const p = new Player('sock1', 'Hero');
    expect(p.name).toBe('Hero');
    expect(p.gold).toBe(100);
    expect(p.hp).toBe(100);
    expect(p.role).toBeNull();
  });

  test('selects role and gets role-specific stats', () => {
    const p = new Player('sock1', 'Hero');
    p.setRole('warrior');
    expect(p.role).toBe('warrior');
    expect(p.hp).toBe(120);
  });

  test('can equip items matching role', () => {
    const p = new Player('sock1', 'Hero');
    p.setRole('warrior');
    const item = { id: 'sword1', name: '불꽃의 검', role: 'warrior', attackBonus: 15 };
    p.addItem(item);
    expect(p.items).toHaveLength(1);
    expect(p.getAttackBonus()).toBe(15);
  });

  test('spending gold reduces balance', () => {
    const p = new Player('sock1', 'Hero');
    p.spendGold(30);
    expect(p.gold).toBe(70);
  });

  test('cannot spend more gold than available', () => {
    const p = new Player('sock1', 'Hero');
    expect(() => p.spendGold(150)).toThrow('Not enough gold');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- Player`
Expected: FAIL

- [ ] **Step 3: Implement Player class**

Create `server/game/Player.js`:
```javascript
const ROLE_STATS = {
  warrior: { hp: 120, baseAttack: 10 },
  mage:    { hp: 80,  baseAttack: 15 },
  healer:  { hp: 100, baseAttack: 5 },
};

export class Player {
  constructor(socketId, name) {
    this.socketId = socketId;
    this.name = name;
    this.role = null;
    this.gold = 100;
    this.hp = 100;
    this.maxHp = 100;
    this.items = [];
    this.stats = { damage: 0, healing: 0 };
  }

  setRole(role) {
    if (!ROLE_STATS[role]) throw new Error(`Invalid role: ${role}`);
    this.role = role;
    this.hp = ROLE_STATS[role].hp;
    this.maxHp = ROLE_STATS[role].hp;
  }

  addItem(item) {
    this.items.push(item);
  }

  getAttackBonus() {
    return this.items.reduce((sum, item) => sum + (item.attackBonus || 0), 0);
  }

  getDefenseBonus() {
    return this.items.reduce((sum, item) => sum + (item.defenseBonus || 0), 0);
  }

  spendGold(amount) {
    if (amount > this.gold) throw new Error('Not enough gold');
    this.gold -= amount;
  }

  takeDamage(amount) {
    const reduced = Math.max(0, amount - this.getDefenseBonus());
    this.hp = Math.max(0, this.hp - reduced);
    return this.hp > 0;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.stats.healing += amount;
  }

  toJSON() {
    return {
      socketId: this.socketId,
      name: this.name,
      role: this.role,
      gold: this.gold,
      hp: this.hp,
      maxHp: this.maxHp,
      items: this.items,
      stats: this.stats,
    };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd server && npm test -- Player`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/game/Player.js server/__tests__/Player.test.js
git commit -m "feat: add Player class with role stats, items, and gold management"
```

---

### Task 7: Item & Boss Definitions

**Files:**
- Create: `server/game/items.js`
- Create: `server/game/bosses.js`

- [ ] **Step 1: Create item definitions**

Create `server/game/items.js`:
```javascript
const ITEMS = [
  // Warrior items
  { id: 'sword1', name: '불꽃의 검', role: 'warrior', attackBonus: 10, defenseBonus: 0, basePrice: 20 },
  { id: 'sword2', name: '번개의 도끼', role: 'warrior', attackBonus: 18, defenseBonus: 0, basePrice: 35 },
  { id: 'shield1', name: '강철 방패', role: 'warrior', attackBonus: 0, defenseBonus: 10, basePrice: 25 },
  // Mage items
  { id: 'staff1', name: '마력의 지팡이', role: 'mage', attackBonus: 12, defenseBonus: 0, basePrice: 22 },
  { id: 'staff2', name: '폭풍의 오브', role: 'mage', attackBonus: 20, defenseBonus: 0, basePrice: 40 },
  { id: 'robe1', name: '마법사의 로브', role: 'mage', attackBonus: 5, defenseBonus: 8, basePrice: 28 },
  // Healer items
  { id: 'wand1', name: '치유의 완드', role: 'healer', attackBonus: 5, defenseBonus: 0, healBonus: 10, basePrice: 20 },
  { id: 'wand2', name: '생명의 성배', role: 'healer', attackBonus: 0, defenseBonus: 0, healBonus: 20, basePrice: 38 },
  { id: 'cloak1', name: '수호의 망토', role: 'healer', attackBonus: 0, defenseBonus: 12, healBonus: 5, basePrice: 30 },
  // Universal items
  { id: 'potion1', name: 'HP 포션', role: null, attackBonus: 0, defenseBonus: 0, hpRestore: 30, basePrice: 15 },
  { id: 'ring1', name: '용기의 반지', role: null, attackBonus: 8, defenseBonus: 5, basePrice: 30 },
];

export function getRandomItems(count, round) {
  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(item => ({
    ...item,
    attackBonus: Math.round(item.attackBonus * (1 + round * 0.15)),
    defenseBonus: Math.round(item.defenseBonus * (1 + round * 0.15)),
    basePrice: Math.round(item.basePrice * (1 + round * 0.1)),
  }));
}

export { ITEMS };
```

- [ ] **Step 2: Create boss definitions**

Create `server/game/bosses.js`:
```javascript
const BOSSES = [
  { id: 'goblin', name: '고블린 대장', baseHp: 200, baseAttack: 8, pattern: 'basic', emoji: '👺' },
  { id: 'skeleton', name: '해골 기사', baseHp: 300, baseAttack: 12, pattern: 'shield', emoji: '💀' },
  { id: 'dragon_baby', name: '아기 드래곤', baseHp: 400, baseAttack: 15, pattern: 'breath', emoji: '🐲' },
  { id: 'dark_mage', name: '어둠의 마법사', baseHp: 350, baseAttack: 18, pattern: 'silence', emoji: '🧙' },
  { id: 'dragon', name: '고대 드래곤', baseHp: 600, baseAttack: 25, pattern: 'rage', emoji: '🐉' },
];

export function getBossForRound(round) {
  const index = Math.min(round - 1, BOSSES.length - 1);
  const boss = BOSSES[index];
  const scale = 1 + (round - 1) * 0.2;
  return {
    ...boss,
    hp: Math.round(boss.baseHp * scale),
    maxHp: Math.round(boss.baseHp * scale),
    attack: Math.round(boss.baseAttack * scale),
  };
}

export { BOSSES };
```

- [ ] **Step 3: Commit**

```bash
git add server/game/items.js server/game/bosses.js
git commit -m "feat: add item and boss definitions with round-based scaling"
```

---

### Task 8: Auction Phase Logic

**Files:**
- Create: `server/game/AuctionPhase.js`
- Test: `server/__tests__/AuctionPhase.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/__tests__/AuctionPhase.test.js`:
```javascript
import { AuctionPhase } from '../game/AuctionPhase.js';
import { Player } from '../game/Player.js';

describe('AuctionPhase', () => {
  let players;

  beforeEach(() => {
    players = [
      new Player('s1', 'Alice'),
      new Player('s2', 'Bob'),
    ];
    players[0].setRole('warrior');
    players[1].setRole('mage');
  });

  test('creates auction with items for the round', () => {
    const auction = new AuctionPhase(players, 1);
    expect(auction.items.length).toBeGreaterThanOrEqual(1);
    expect(auction.currentItemIndex).toBe(0);
  });

  test('processes bid from player', () => {
    const auction = new AuctionPhase(players, 1);
    auction.placeBid('s1', 30, 0.8, players);
    expect(auction.highestBid.playerId).toBe('s1');
    expect(auction.highestBid.amount).toBe(30);
  });

  test('higher bid replaces lower bid', () => {
    const auction = new AuctionPhase(players, 1);
    auction.placeBid('s1', 30, 0.5, players);
    auction.placeBid('s2', 50, 0.5, players);
    expect(auction.highestBid.playerId).toBe('s2');
  });

  test('same amount bid: higher volume wins', () => {
    const auction = new AuctionPhase(players, 1);
    auction.placeBid('s1', 50, 0.3, players);
    auction.placeBid('s2', 50, 0.8, players);
    expect(auction.highestBid.playerId).toBe('s2');
  });

  test('rejects bid exceeding player gold', () => {
    const auction = new AuctionPhase(players, 1);
    const result = auction.placeBid('s1', 150, 0.5, players);
    expect(result).toBe(false);
    expect(auction.highestBid).toBeNull();
  });

  test('finalize gives item to winner and deducts gold', () => {
    const auction = new AuctionPhase(players, 1);
    auction.placeBid('s1', 30, 0.5, players);
    const result = auction.finalizeCurrentItem(players);
    expect(result.winner).toBe('s1');
    expect(players[0].gold).toBe(70);
    expect(players[0].items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd server && npm test -- Auction`

- [ ] **Step 3: Implement AuctionPhase**

Create `server/game/AuctionPhase.js`:
```javascript
import { getRandomItems } from './items.js';

export class AuctionPhase {
  constructor(players, round) {
    this.round = round;
    this.items = getRandomItems(2, round);
    this.currentItemIndex = 0;
    this.highestBid = null;
    this.bids = [];
    this.passedPlayers = new Set();
  }

  getCurrentItem() {
    return this.items[this.currentItemIndex] || null;
  }

  placeBid(playerId, amount, volume, players) {
    const player = players.find(p => p.socketId === playerId);
    if (!player || amount > player.gold) return false;

    this.bids.push({ playerId, amount, volume, timestamp: Date.now() });

    if (!this.highestBid) {
      this.highestBid = { playerId, amount, volume };
      return true;
    }

    if (
      amount > this.highestBid.amount ||
      (amount === this.highestBid.amount && volume > this.highestBid.volume)
    ) {
      this.highestBid = { playerId, amount, volume };
      return true;
    }

    return false;
  }

  pass(playerId) {
    this.passedPlayers.add(playerId);
  }

  finalizeCurrentItem(players) {
    const item = this.getCurrentItem();
    if (!item || !this.highestBid) {
      return { winner: null, item: null };
    }

    const winner = players.find(p => p.socketId === this.highestBid.playerId);
    if (winner) {
      winner.spendGold(this.highestBid.amount);
      winner.addItem(item);
    }

    const result = {
      winner: this.highestBid.playerId,
      winnerName: winner?.name,
      item,
      amount: this.highestBid.amount,
    };

    this.currentItemIndex++;
    this.highestBid = null;
    this.bids = [];
    this.passedPlayers.clear();

    return result;
  }

  isComplete() {
    return this.currentItemIndex >= this.items.length;
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd server && npm test -- Auction`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/game/AuctionPhase.js server/__tests__/AuctionPhase.test.js
git commit -m "feat: add AuctionPhase with bidding, volume priority, and item assignment"
```

---

### Task 9: Battle Phase Logic

**Files:**
- Create: `server/game/BattlePhase.js`
- Test: `server/__tests__/BattlePhase.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/__tests__/BattlePhase.test.js`:
```javascript
import { BattlePhase } from '../game/BattlePhase.js';
import { Player } from '../game/Player.js';

describe('BattlePhase', () => {
  let players;

  beforeEach(() => {
    players = [
      new Player('s1', 'Warrior'),
      new Player('s2', 'Mage'),
      new Player('s3', 'Healer'),
    ];
    players[0].setRole('warrior');
    players[1].setRole('mage');
    players[2].setRole('healer');
  });

  test('creates battle with boss for round', () => {
    const battle = new BattlePhase(players, 1);
    expect(battle.boss.name).toBe('고블린 대장');
    expect(battle.boss.hp).toBeGreaterThan(0);
  });

  test('warrior attack: volume-based damage', () => {
    const battle = new BattlePhase(players, 1);
    const dmg = battle.processWarriorAttack('s1', 0.9);
    expect(dmg).toBeGreaterThan(0);
    expect(battle.boss.hp).toBeLessThan(battle.boss.maxHp);
  });

  test('mage attack: accuracy-based damage', () => {
    const battle = new BattlePhase(players, 1);
    const dmg = battle.processMageAttack('s2', 0.95);
    expect(dmg).toBeGreaterThan(0);
  });

  test('healer: low volume = more healing', () => {
    const battle = new BattlePhase(players, 1);
    players[0].hp = 50;
    const heal = battle.processHealerAction('s3', 0.1);
    expect(heal).toBeGreaterThan(0);
    expect(players[0].hp).toBeGreaterThan(50);
  });

  test('boss attacks reduce player HP', () => {
    const battle = new BattlePhase(players, 1);
    const result = battle.bossAttack();
    const totalHp = players.reduce((sum, p) => sum + p.hp, 0);
    expect(totalHp).toBeLessThan(players.reduce((sum, p) => sum + p.maxHp, 0));
    expect(result.targets.length).toBeGreaterThan(0);
  });

  test('dodge with STT keyword avoids damage', () => {
    const battle = new BattlePhase(players, 1);
    battle.registerDodge('s1');
    const result = battle.bossAttack();
    const dodged = result.targets.find(t => t.playerId === 's1');
    if (dodged) {
      expect(dodged.dodged).toBe(true);
    }
  });

  test('boss defeated when HP reaches 0', () => {
    const battle = new BattlePhase(players, 1);
    battle.boss.hp = 1;
    battle.processWarriorAttack('s1', 1.0);
    expect(battle.isBossDefeated()).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd server && npm test -- Battle`

- [ ] **Step 3: Implement BattlePhase**

Create `server/game/BattlePhase.js`:
```javascript
import { getBossForRound } from './bosses.js';

export class BattlePhase {
  constructor(players, round) {
    this.players = players;
    this.round = round;
    this.boss = getBossForRound(round);
    this.dodging = new Set();
    this.attackCooldowns = new Map();
  }

  processWarriorAttack(socketId, volume) {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player || player.role !== 'warrior' || player.hp <= 0) return 0;

    const baseAttack = 10 + player.getAttackBonus();
    const damage = Math.round(baseAttack * volume);
    this.boss.hp = Math.max(0, this.boss.hp - damage);
    player.stats.damage += damage;
    return damage;
  }

  processMageAttack(socketId, accuracy) {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player || player.role !== 'mage' || player.hp <= 0) return 0;

    const baseAttack = 15 + player.getAttackBonus();
    const damage = Math.round(baseAttack * accuracy);
    this.boss.hp = Math.max(0, this.boss.hp - damage);
    player.stats.damage += damage;
    return damage;
  }

  processHealerAction(socketId, volume) {
    const player = this.players.find(p => p.socketId === socketId);
    if (!player || player.role !== 'healer' || player.hp <= 0) return 0;

    const healBonus = player.items.reduce((sum, item) => sum + (item.healBonus || 0), 0);
    const baseHeal = 10 + healBonus;
    const quietness = Math.max(0, 1 - volume);
    const healAmount = Math.round(baseHeal * quietness);

    const injured = this.players
      .filter(p => p.hp > 0 && p.hp < p.maxHp)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));

    if (injured.length > 0) {
      injured[0].heal(healAmount);
      player.stats.healing += healAmount;
    }

    return healAmount;
  }

  registerDodge(socketId) {
    this.dodging.add(socketId);
  }

  bossAttack() {
    const aliveTargets = this.players.filter(p => p.hp > 0);
    if (aliveTargets.length === 0) return { targets: [] };

    const targetCount = Math.min(2, aliveTargets.length);
    const shuffled = [...aliveTargets].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, targetCount);

    const results = targets.map(target => {
      if (this.dodging.has(target.socketId)) {
        return { playerId: target.socketId, name: target.name, dodged: true, damage: 0 };
      }
      const damage = this.boss.attack;
      target.takeDamage(damage);
      return { playerId: target.socketId, name: target.name, dodged: false, damage };
    });

    this.dodging.clear();
    return { targets: results };
  }

  isBossDefeated() {
    return this.boss.hp <= 0;
  }

  isPartyWiped() {
    return this.players.every(p => p.hp <= 0);
  }

  getState() {
    return {
      boss: {
        name: this.boss.name,
        emoji: this.boss.emoji,
        hp: this.boss.hp,
        maxHp: this.boss.maxHp,
      },
      players: this.players.map(p => p.toJSON()),
    };
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd server && npm test -- Battle`
Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/game/BattlePhase.js server/__tests__/BattlePhase.test.js
git commit -m "feat: add BattlePhase with role-based voice mechanics and boss AI"
```

---

### Task 10: Game State Machine in GameRoom

**Files:**
- Modify: `server/game/GameRoom.js`
- Modify: `server/__tests__/GameRoom.test.js`

- [ ] **Step 1: Add state machine tests**

Add to `server/__tests__/GameRoom.test.js`:
```javascript
import { Player } from '../game/Player.js';

// ... existing tests ...

describe('GameRoom state machine', () => {
  let room;

  beforeEach(() => {
    room = new GameRoom('TEST');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.players = room.players.map((p, i) => {
      const player = new Player(p.socketId, p.name);
      player.setRole(i === 0 ? 'warrior' : 'mage');
      return player;
    });
  });

  test('starts game and transitions to auction phase', () => {
    room.startGame();
    expect(room.phase).toBe('auction');
    expect(room.round).toBe(1);
    expect(room.auction).not.toBeNull();
  });

  test('transitions from auction to battle', () => {
    room.startGame();
    room.startBattle();
    expect(room.phase).toBe('battle');
    expect(room.battle).not.toBeNull();
  });

  test('transitions to next round after battle', () => {
    room.startGame();
    room.startBattle();
    room.endBattle(true);
    expect(room.round).toBe(2);
    expect(room.phase).toBe('auction');
  });

  test('game ends after 5 rounds', () => {
    room.startGame();
    for (let i = 0; i < 5; i++) {
      room.startBattle();
      room.endBattle(true);
    }
    expect(room.phase).toBe('results');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Update GameRoom with state machine**

Update `server/game/GameRoom.js` — add imports for `Player`, `AuctionPhase`, `BattlePhase` and add `startGame`, `startBattle`, `endBattle`, `getResults` methods:

```javascript
import { Player } from './Player.js';
import { AuctionPhase } from './AuctionPhase.js';
import { BattlePhase } from './BattlePhase.js';

export class GameRoom {
  constructor(code) {
    this.code = code;
    this.players = [];
    this.phase = 'lobby';
    this.round = 0;
    this.maxRounds = 5;
    this.auction = null;
    this.battle = null;
  }

  addPlayer(socketId, name) {
    if (this.players.length >= 5) throw new Error('Room is full');
    const player = new Player(socketId, name);
    this.players.push(player);
    return player;
  }

  removePlayer(socketId) {
    this.players = this.players.filter(p => p.socketId !== socketId);
  }

  getPlayer(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  allRolesSelected() {
    return this.players.every(p => p.role !== null);
  }

  startGame() {
    this.round = 1;
    this.phase = 'auction';
    this.auction = new AuctionPhase(this.players, this.round);
  }

  startBattle() {
    this.phase = 'battle';
    this.battle = new BattlePhase(this.players, this.round);
  }

  endBattle(bossDefeated) {
    this.battle = null;
    if (this.round >= this.maxRounds || !bossDefeated) {
      this.phase = 'results';
    } else {
      this.round++;
      this.phase = 'auction';
      this.auction = new AuctionPhase(this.players, this.round);
    }
  }

  getResults() {
    const scoredPlayers = this.players.map(p => ({
      ...p.toJSON(),
      score: p.stats.damage + p.stats.healing + p.gold,
    }));
    const mvpData = [...scoredPlayers].sort((a, b) => b.score - a.score)[0];

    return {
      cleared: this.round >= this.maxRounds,
      round: this.round,
      mvp: mvpData ? { name: mvpData.name, damage: mvpData.stats.damage, healing: mvpData.stats.healing, gold: mvpData.gold, score: mvpData.score } : null,
      players: scoredPlayers,
    };
  }

  getState() {
    return {
      code: this.code,
      phase: this.phase,
      round: this.round,
      maxRounds: this.maxRounds,
      players: this.players.map(p => p.toJSON()),
      auction: this.auction ? {
        currentItem: this.auction.getCurrentItem(),
        highestBid: this.auction.highestBid,
      } : null,
      battle: this.battle ? this.battle.getState() : null,
    };
  }
}
```

- [ ] **Step 4: Run all tests**

Run: `cd server && npm test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/game/GameRoom.js server/__tests__/GameRoom.test.js
git commit -m "feat: add game state machine (lobby → auction → battle → results)"
```

---

### Task 11: Wire Game Events to Socket.io Server

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add game event handlers**

Add to `server/index.js` inside the `io.on('connection')` block, after existing handlers:

```javascript
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
    if (!room || !room.allRolesSelected() || room.players.length < 2) return;
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

// --- Server-side timers ---
const roomTimers = new Map();

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

  // Battle duration timer (60s)
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

  // Boss attack every 5 seconds
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
```

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat: wire all game events (auction, battle, roles) to Socket.io"
```

---

## Chunk 4: Frontend — Lobby & Shared Components

### Task 12: Game Constants & Global Styles

**Files:**
- Create: `client/src/game/constants.js`
- Create: `client/src/styles/global.css`

- [ ] **Step 1: Create shared constants**

Create `client/src/game/constants.js`:
```javascript
export const ROLES = {
  warrior: { name: '전사', emoji: '🗡️', color: '#ef4444', description: '크게 외쳐서 공격!' },
  mage:    { name: '마법사', emoji: '🔮', color: '#8b5cf6', description: '주문을 정확히 읽어서 공격!' },
  healer:  { name: '힐러', emoji: '💚', color: '#10b981', description: '부드럽게 속삭여서 치유!' },
};

export const PHASES = {
  lobby: '로비',
  auction: '경매',
  battle: '전투',
  results: '결과',
};

export const GAME_CONFIG = {
  MAX_PLAYERS: 5,
  MIN_PLAYERS: 2,
  STARTING_GOLD: 100,
  AUCTION_DURATION: 30,
  BATTLE_DURATION: 60,
  TOTAL_ROUNDS: 5,
};
```

- [ ] **Step 2: Create mobile-first global styles**

Create `client/src/styles/global.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a2e;
  --bg-card: #16213e;
  --text-primary: #e8e8f0;
  --text-secondary: #a0a0b8;
  --accent-red: #ef4444;
  --accent-purple: #8b5cf6;
  --accent-green: #10b981;
  --accent-gold: #fbbf24;
  --accent-blue: #3b82f6;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100dvh;
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

#root {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

button {
  border: none;
  outline: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  transition: transform 0.1s, opacity 0.2s;
  -webkit-tap-highlight-color: transparent;
}

button:active {
  transform: scale(0.96);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-gold);
  color: #000;
}

.btn-danger {
  background: var(--accent-red);
  color: #fff;
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid rgba(255,255,255,0.1);
}

.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.05);
}

.container {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
  width: 100%;
}

.volume-bar {
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.volume-bar-fill {
  height: 100%;
  background: var(--accent-green);
  border-radius: 4px;
  transition: width 0.05s;
}

.hp-bar {
  height: 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  overflow: hidden;
}

.hp-bar-fill {
  height: 100%;
  background: var(--accent-red);
  border-radius: 6px;
  transition: width 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.shake {
  animation: shake 0.3s ease-in-out;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.pulse {
  animation: pulse 1s ease-in-out infinite;
}
```

- [ ] **Step 3: Update main.jsx to import styles**

Update `client/src/main.jsx`:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add client/src/game/ client/src/styles/ client/src/main.jsx
git commit -m "feat: add game constants and mobile-first global CSS"
```

---

### Task 13: Lobby Component

**Files:**
- Create: `client/src/components/Lobby.jsx`
- Create: `client/src/components/MicTest.jsx`
- Create: `client/src/components/RoleSelect.jsx`

- [ ] **Step 1: Create MicTest component**

Create `client/src/components/MicTest.jsx`:
```jsx
import { useEffect } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';

export default function MicTest({ onCalibrated }) {
  const { volume, isListening, start, stop } = useVoiceVolume();

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3 style={{ marginBottom: 8 }}>🎤 마이크 테스트</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 12 }}>
        마이크에 대고 말해보세요
      </p>
      <div className="volume-bar" style={{ marginBottom: 8 }}>
        <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
      </div>
      <p style={{ fontSize: '0.85rem', color: volume > 0.1 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
        {isListening
          ? volume > 0.1 ? '✅ 마이크가 잘 작동합니다!' : '소리를 내보세요...'
          : '마이크 연결 중...'}
      </p>
      {volume > 0.1 && onCalibrated && (
        <button className="btn-primary" onClick={onCalibrated} style={{ marginTop: 12 }}>
          확인
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create RoleSelect component**

Create `client/src/components/RoleSelect.jsx`:
```jsx
import { ROLES } from '../game/constants';

export default function RoleSelect({ selectedRole, onSelect, takenRoles = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 style={{ marginBottom: 4 }}>역할 선택</h3>
      {Object.entries(ROLES).map(([key, role]) => {
        const taken = takenRoles.includes(key) && selectedRole !== key;
        return (
          <button
            key={key}
            className={selectedRole === key ? 'btn-primary' : 'btn-secondary'}
            onClick={() => !taken && onSelect(key)}
            disabled={taken}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              borderColor: selectedRole === key ? role.color : undefined,
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{role.emoji}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{role.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                {role.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create Lobby component**

Create `client/src/components/Lobby.jsx`:
```jsx
import { useState } from 'react';
import MicTest from './MicTest';
import RoleSelect from './RoleSelect';

export default function Lobby({ socket, roomCode, players, myId, onStart }) {
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(!!roomCode);
  const [code, setCode] = useState(roomCode || '');
  const [micReady, setMicReady] = useState(false);
  const [error, setError] = useState('');

  const me = players.find(p => p.socketId === myId);
  const takenRoles = players.filter(p => p.role && p.socketId !== myId).map(p => p.role);
  const allReady = players.length >= 2 && players.every(p => p.role);

  function handleCreate() {
    if (!name.trim()) return;
    socket.emit('create-room', name.trim(), (res) => {
      if (res.success) {
        setJoined(true);
        setCode(res.code);
      } else {
        setError(res.error);
      }
    });
  }

  function handleJoin() {
    if (!name.trim() || !code.trim()) return;
    socket.emit('join-room', code.trim().toUpperCase(), name.trim(), (res) => {
      if (res.success) {
        setJoined(true);
        setCode(res.code);
      } else {
        setError(res.error);
      }
    });
  }

  function handleSelectRole(role) {
    socket.emit('select-role', code, role, (res) => {
      if (!res.success) setError(res.error);
    });
  }

  if (!joined) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 48 }}>
        <h1 style={{ textAlign: 'center', fontSize: '2rem' }}>⚔️ Voice Raiders</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>목소리로 전투하는 RPG</p>

        <input
          placeholder="닉네임 입력"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem',
          }}
        />

        <button className="btn-primary" onClick={handleCreate} disabled={!name.trim()}>
          🏰 방 만들기
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="방 코드"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{
              flex: 1, padding: '14px 16px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem',
              textAlign: 'center', letterSpacing: 4,
            }}
          />
          <button className="btn-secondary" onClick={handleJoin} disabled={!name.trim() || !code.trim()}>
            참가
          </button>
        </div>

        {error && <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <h2>⚔️ Voice Raiders</h2>
        <div style={{
          background: 'var(--bg-card)', display: 'inline-block', padding: '8px 20px',
          borderRadius: 8, marginTop: 8, letterSpacing: 4, fontSize: '1.2rem', fontWeight: 700,
        }}>
          {code}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
          이 코드를 친구에게 공유하세요
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>참가자 ({players.length}/5)</h3>
        {players.map(p => (
          <div key={p.socketId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span>{p.name} {p.socketId === myId ? '(나)' : ''}</span>
            <span>{p.role ? `${p.role === 'warrior' ? '🗡️' : p.role === 'mage' ? '🔮' : '💚'}` : '⏳'}</span>
          </div>
        ))}
      </div>

      {!micReady ? (
        <MicTest onCalibrated={() => setMicReady(true)} />
      ) : (
        <RoleSelect selectedRole={me?.role} onSelect={handleSelectRole} takenRoles={takenRoles} />
      )}

      {allReady && me?.socketId === players[0]?.socketId && (
        <button className="btn-primary" onClick={() => socket.emit('start-game', code)} style={{ fontSize: '1.1rem' }}>
          🎮 게임 시작!
        </button>
      )}

      {error && <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/
git commit -m "feat: add Lobby, MicTest, and RoleSelect components"
```

---

## Chunk 5: Frontend — Auction & Battle

### Task 14: Auction Component

**Files:**
- Create: `client/src/components/Auction.jsx`

- [ ] **Step 1: Create Auction component**

Create `client/src/components/Auction.jsx`:
```jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GAME_CONFIG } from '../game/constants';

function parseBidAmount(text) {
  const cleaned = text.replace(/\s/g, '');
  const koreanMap = { '십': 10, '이십': 20, '삼십': 30, '사십': 40, '오십': 50, '육십': 60, '칠십': 70, '팔십': 80, '구십': 90, '백': 100 };
  for (const [word, val] of Object.entries(koreanMap)) {
    if (cleaned.includes(word)) return val;
  }
  const num = parseInt(cleaned.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}

export default function Auction({ socket, gameState, myId }) {
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.AUCTION_DURATION);
  const [lastBid, setLastBid] = useState(null);
  const { volume, start: startMic, stop: stopMic } = useVoiceVolume();
  const volumeRef = useRef(0);

  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const handleSpeech = useCallback((text) => {
    const lower = text.toLowerCase();
    if (lower.includes('패스') || lower.includes('pass')) {
      socket.emit('auction-pass', gameState.code);
      return;
    }
    const amount = parseBidAmount(text);
    if (amount && amount > 0) {
      socket.emit('auction-bid', gameState.code, amount, volumeRef.current);
    }
  }, [socket, gameState.code]);

  const { start: startSTT, stop: stopSTT } = useSpeechRecognition({ onResult: handleSpeech });

  useEffect(() => {
    startMic();
    startSTT();
    return () => { stopMic(); stopSTT(); };
  }, [startMic, stopMic, startSTT, stopSTT]);

  // Server-driven timer
  useEffect(() => {
    function onTimer({ phase, timeLeft: t }) {
      if (phase === 'auction') setTimeLeft(t);
    }
    socket.on('timer', onTimer);
    return () => socket.off('timer', onTimer);
  }, [socket]);

  useEffect(() => {
    socket.on('bid-updated', setLastBid);
    return () => socket.off('bid-updated', setLastBid);
  }, [socket]);

  const item = gameState.auction?.currentItem;
  const highest = gameState.auction?.highestBid;

  if (!item) return null;

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          라운드 {gameState.round}/{gameState.maxRounds} — 경매
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>⏱ {timeLeft}초</div>
        <div className="volume-bar" style={{ marginTop: 8 }}>
          <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{item.name}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          {item.role ? `${item.role} 전용` : '공용'}
          {item.attackBonus ? ` | 공격 +${item.attackBonus}` : ''}
          {item.defenseBonus ? ` | 방어 +${item.defenseBonus}` : ''}
          {item.healBonus ? ` | 치유 +${item.healBonus}` : ''}
        </div>
        <div style={{ fontSize: '0.8rem', marginTop: 4 }}>시작가: {item.basePrice}G</div>
      </div>

      {highest && (
        <div className="card" style={{
          textAlign: 'center', borderColor: highest.playerId === myId ? 'var(--accent-green)' : 'var(--accent-red)',
          borderWidth: 2, borderStyle: 'solid',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>현재 최고 입찰</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
            💰 {highest.amount}G
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {lastBid?.playerName || '???'}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        🎤 금액을 외치세요! ("오십!", "50!") <br />
        🤫 "패스!" 하면 포기
      </div>

      <div className="card">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>내 골드</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
          💰 {gameState.players.find(p => p.socketId === myId)?.gold || 0}G
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Auction.jsx
git commit -m "feat: add Auction component with STT bidding and volume priority"
```

---

### Task 15: Battle Component

**Files:**
- Create: `client/src/components/BossDisplay.jsx`
- Create: `client/src/components/PlayerStatus.jsx`
- Create: `client/src/components/Battle.jsx`

- [ ] **Step 1: Create BossDisplay component**

Create `client/src/components/BossDisplay.jsx`:
```jsx
export default function BossDisplay({ boss }) {
  if (!boss) return null;
  const hpPercent = (boss.hp / boss.maxHp) * 100;

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>{boss.emoji}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{boss.name}</div>
      <div className="hp-bar">
        <div className="hp-bar-fill" style={{
          width: `${hpPercent}%`,
          background: hpPercent > 50 ? 'var(--accent-red)' : hpPercent > 25 ? 'var(--accent-gold)' : '#ff2222',
        }} />
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
        HP: {boss.hp} / {boss.maxHp}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create PlayerStatus component**

Create `client/src/components/PlayerStatus.jsx`:
```jsx
import { ROLES } from '../game/constants';

export default function PlayerStatus({ player, isMe }) {
  if (!player) return null;
  const role = ROLES[player.role];
  const hpPercent = (player.hp / player.maxHp) * 100;

  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
      borderColor: isMe ? role?.color : 'transparent', borderWidth: 2, borderStyle: 'solid',
      opacity: player.hp <= 0 ? 0.4 : 1,
    }}>
      <span style={{ fontSize: '1.5rem' }}>{role?.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          {player.name} {isMe ? '(나)' : ''}
        </div>
        <div className="hp-bar" style={{ height: 6, marginTop: 4 }}>
          <div className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
          HP {player.hp}/{player.maxHp} | 💰{player.gold}G
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Battle component**

Create `client/src/components/Battle.jsx`:
```jsx
import { useEffect, useRef, useCallback, useState } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import BossDisplay from './BossDisplay';
import PlayerStatus from './PlayerStatus';

const SPELLS = ['파이어볼', '아이스볼트', '번개폭풍', '메테오', '블리자드'];

export default function Battle({ socket, gameState, myId }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [actionLog, setActionLog] = useState([]);
  const [currentSpell, setCurrentSpell] = useState('');
  const { volume, start: startMic, stop: stopMic } = useVoiceVolume();
  const volumeRef = useRef(0);
  const lastActionTime = useRef(0);
  const me = gameState.players.find(p => p.socketId === myId);

  useEffect(() => { volumeRef.current = volume; }, [volume]);

  useEffect(() => {
    setCurrentSpell(SPELLS[Math.floor(Math.random() * SPELLS.length)]);
  }, []);

  const handleSpeech = useCallback((text) => {
    const now = Date.now();
    if (now - lastActionTime.current < 1000) return;
    lastActionTime.current = now;

    const lower = text.toLowerCase();

    if (lower.includes('피해') || lower.includes('회피') || lower.includes('dodge')) {
      socket.emit('battle-action', gameState.code, { type: 'dodge' });
      return;
    }

    if (!me) return;

    if (me.role === 'warrior') {
      socket.emit('battle-action', gameState.code, { type: 'warrior-attack', value: volumeRef.current });
    } else if (me.role === 'mage') {
      const accuracy = calculateAccuracy(text, currentSpell);
      socket.emit('battle-action', gameState.code, { type: 'mage-attack', value: accuracy });
      setCurrentSpell(SPELLS[Math.floor(Math.random() * SPELLS.length)]);
    } else if (me.role === 'healer') {
      socket.emit('battle-action', gameState.code, { type: 'healer-action', value: volumeRef.current });
    }
  }, [socket, gameState.code, me, currentSpell]);

  const { start: startSTT, stop: stopSTT } = useSpeechRecognition({ onResult: handleSpeech });

  useEffect(() => {
    startMic();
    startSTT();
    return () => { stopMic(); stopSTT(); };
  }, [startMic, stopMic, startSTT, stopSTT]);

  // Server-driven timer
  useEffect(() => {
    function onTimer({ phase, timeLeft: t }) {
      if (phase === 'battle') setTimeLeft(t);
    }
    socket.on('timer', onTimer);
    return () => socket.off('timer', onTimer);
  }, [socket]);

  // Listen for battle updates
  useEffect(() => {
    function onBattleUpdate(data) {
      const msg = data.damage
        ? `${data.playerName}: ${data.damage} 데미지!`
        : data.healing
        ? `${data.playerName}: ${data.healing} 치유!`
        : `${data.playerName}: 회피!`;
      setActionLog(prev => [...prev.slice(-4), msg]);
    }
    function onBossAttack(data) {
      data.targets.forEach(t => {
        const msg = t.dodged
          ? `${t.name} 회피 성공!`
          : `${t.name} ${t.damage} 피해!`;
        setActionLog(prev => [...prev.slice(-4), msg]);
      });
    }
    socket.on('battle-update', onBattleUpdate);
    socket.on('boss-attack', onBossAttack);
    return () => {
      socket.off('battle-update', onBattleUpdate);
      socket.off('boss-attack', onBossAttack);
    };
  }, [socket]);

  const battleState = gameState.battle;
  if (!battleState) return null;

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          라운드 {gameState.round}/{gameState.maxRounds} — 전투
        </span>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: timeLeft <= 10 ? 'var(--accent-red)' : 'var(--accent-gold)' }}>
          ⏱ {timeLeft}초
        </div>
      </div>

      <BossDisplay boss={battleState.boss} />

      <div className="volume-bar" style={{ height: 12 }}>
        <div className="volume-bar-fill" style={{
          width: `${volume * 100}%`,
          background: me?.role === 'healer'
            ? (volume < 0.3 ? 'var(--accent-green)' : 'var(--accent-red)')
            : 'var(--accent-green)',
        }} />
      </div>

      {me?.role === 'warrior' && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--accent-red)', borderWidth: 1, borderStyle: 'solid' }}>
          🗡️ <strong>크게 외쳐서 공격!</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>볼륨이 클수록 데미지 UP</div>
        </div>
      )}
      {me?.role === 'mage' && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--accent-purple)', borderWidth: 1, borderStyle: 'solid' }}>
          🔮 주문을 읽으세요: <strong style={{ color: 'var(--accent-purple)', fontSize: '1.2rem' }}>{currentSpell}</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>정확할수록 데미지 UP</div>
        </div>
      )}
      {me?.role === 'healer' && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--accent-green)', borderWidth: 1, borderStyle: 'solid' }}>
          💚 <strong>부드럽게 속삭이세요</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>볼륨이 낮을수록 치유력 UP</div>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        ⚠️ "피해!" 라고 외치면 보스 공격 회피
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gameState.players.map(p => (
          <PlayerStatus key={p.socketId} player={p} isMe={p.socketId === myId} />
        ))}
      </div>

      <div className="card" style={{ maxHeight: 100, overflow: 'auto', fontSize: '0.8rem' }}>
        {actionLog.map((msg, i) => (
          <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{msg}</div>
        ))}
        {actionLog.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>전투 시작...</div>}
      </div>
    </div>
  );
}

function calculateAccuracy(spoken, target) {
  const s = spoken.replace(/\s/g, '').toLowerCase();
  const t = target.replace(/\s/g, '').toLowerCase();
  if (s.includes(t)) return 1.0;

  let matches = 0;
  const tChars = [...t];
  for (const char of tChars) {
    if (s.includes(char)) matches++;
  }
  return matches / tChars.length;
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/
git commit -m "feat: add Battle, BossDisplay, PlayerStatus with role-based voice combat"
```

---

## Chunk 6: Frontend — Results & App Assembly

### Task 16: Results Component

**Files:**
- Create: `client/src/components/Results.jsx`

- [ ] **Step 1: Create Results component**

Create `client/src/components/Results.jsx`:
```jsx
import { ROLES } from '../game/constants';

export default function Results({ gameState, myId, onPlayAgain }) {
  const results = gameState;
  if (!results) return null;

  const sortedPlayers = [...results.players].sort(
    (a, b) => (b.stats.damage + b.stats.healing) - (a.stats.damage + a.stats.healing)
  );

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>{results.cleared ? '🎉' : '💀'}</div>
        <h2 style={{ color: results.cleared ? 'var(--accent-gold)' : 'var(--accent-red)' }}>
          {results.cleared ? '던전 클리어!' : '전멸...'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {results.round}/{5} 라운드 완료
        </p>
      </div>

      {results.mvp && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--accent-gold)', borderWidth: 2, borderStyle: 'solid' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>🏆 MVP</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{results.mvp.name}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            데미지: {results.mvp.damage} | 치유: {results.mvp.healing}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sortedPlayers.map((p, i) => {
          const role = ROLES[p.role];
          return (
            <div key={p.socketId} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              borderColor: p.socketId === myId ? role?.color : 'transparent',
              borderWidth: 1, borderStyle: 'solid',
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)', minWidth: 24 }}>
                #{i + 1}
              </div>
              <span style={{ fontSize: '1.5rem' }}>{role?.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.name} {p.socketId === myId ? '(나)' : ''}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  ⚔️ {p.stats.damage} 데미지 | 💚 {p.stats.healing} 치유 | 💰 {p.gold}G 잔여
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn-primary" onClick={onPlayAgain} style={{ fontSize: '1.1rem' }}>
        🔄 다시 하기
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Results.jsx
git commit -m "feat: add Results component with MVP display and player rankings"
```

---

### Task 17: App.jsx — Wire Everything Together

**Files:**
- Modify: `client/src/App.jsx`

- [ ] **Step 1: Implement App with game state routing**

Replace `client/src/App.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import Auction from './components/Auction';
import Battle from './components/Battle';
import Results from './components/Results';

export default function App() {
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    function onRoomUpdated(state) {
      setGameState(prev => ({ ...prev, ...state }));
    }
    function onGameState(state) {
      setGameState(state);
    }

    socket.on('room-updated', onRoomUpdated);
    socket.on('game-state', onGameState);

    return () => {
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-state', onGameState);
    };
  }, [socket]);

  if (!isConnected) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse" style={{ fontSize: '2rem' }}>⚔️</div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>서버 연결 중...</p>
        </div>
      </div>
    );
  }

  const phase = gameState?.phase;

  if (phase === 'auction') {
    return <Auction socket={socket} gameState={gameState} myId={socket.id} />;
  }

  if (phase === 'battle') {
    return <Battle socket={socket} gameState={gameState} myId={socket.id} />;
  }

  if (phase === 'results') {
    return (
      <Results
        gameState={gameState}
        myId={socket.id}
        onPlayAgain={() => {
          setGameState(null);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <Lobby
      socket={socket}
      roomCode={gameState?.code}
      players={gameState?.players || []}
      myId={socket.id}
    />
  );
}
```

- [ ] **Step 2: Run dev server and test full flow manually**

Run: `npm run dev`
Test: Create room → Join → Select roles → Start → Auction → Battle → Results

- [ ] **Step 3: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: wire App.jsx with phase-based routing for full game flow"
```

---

## Chunk 7: Polish & Deployment

### Task 18: Mobile Optimization

**Files:**
- Modify: `client/index.html`

- [ ] **Step 1: Add mobile meta tags**

Update `client/index.html` `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<meta name="theme-color" content="#0f0f23" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<title>Voice Raiders ⚔️</title>
```

- [ ] **Step 2: Commit**

```bash
git add client/index.html
git commit -m "feat: add mobile meta tags and PWA-ready head config"
```

---

### Task 19: Production Build Config

**Files:**
- Modify: `server/index.js` (serve static files in production)

- [ ] **Step 1: Add static file serving for production**

Add to top of `server/index.js`, after `app.use(cors())`:
```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/dist/index.html'));
  });
}
```

- [ ] **Step 2: Add build script to root package.json**

Add to root `package.json` scripts:
```json
"build": "npm run build --workspace=client",
"start": "cross-env NODE_ENV=production node server/index.js"
```

- [ ] **Step 3: Add render.yaml for Render deployment**

Create `render.yaml`:
```yaml
services:
  - type: web
    name: voice-raiders
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

- [ ] **Step 4: Commit**

```bash
git add server/index.js package.json render.yaml
git commit -m "feat: add production build config and Render deployment setup"
```

---

### Task 20: Final Integration Test

- [ ] **Step 1: Run all server tests**

Run: `cd server && npm test`
Expected: All tests pass

- [ ] **Step 2: Build client**

Run: `npm run build`
Expected: Successful build in `client/dist/`

- [ ] **Step 3: Test production mode locally**

Run: `npx cross-env NODE_ENV=production node server/index.js`
Open `http://localhost:3001`, test full game flow.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify full build and integration test passes"
```
