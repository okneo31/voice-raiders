import { describe, test, expect } from '@jest/globals';
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
