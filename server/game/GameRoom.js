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
