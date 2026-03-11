import { getBossForRound } from './bosses.js';

export class BattlePhase {
  constructor(players, round) {
    this.players = players;
    this.round = round;
    this.boss = getBossForRound(round);
    // 인원수에 따라 보스 HP/공격력 조정
    const playerScale = Math.max(0.35, players.length / 3);
    this.boss.hp = Math.round(this.boss.hp * playerScale);
    this.boss.maxHp = this.boss.hp;
    this.boss.attack = Math.round(this.boss.attack * Math.max(0.5, playerScale));
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
