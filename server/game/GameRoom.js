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
