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
