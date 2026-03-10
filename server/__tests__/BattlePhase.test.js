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
