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
