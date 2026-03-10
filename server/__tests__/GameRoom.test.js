import { GameRoom } from '../game/GameRoom.js';
import { Player } from '../game/Player.js';

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

describe('GameRoom state machine', () => {
  let room;

  beforeEach(() => {
    room = new GameRoom('TEST');
    room.addPlayer('s1', 'Alice');
    room.addPlayer('s2', 'Bob');
    room.players[0].setRole('warrior');
    room.players[1].setRole('mage');
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
