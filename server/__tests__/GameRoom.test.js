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
