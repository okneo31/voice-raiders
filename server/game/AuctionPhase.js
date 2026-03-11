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

  allPassed(players) {
    return players.every(p => this.passedPlayers.has(p.socketId));
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
