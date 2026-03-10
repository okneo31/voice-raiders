const BOSSES = [
  { id: 'goblin', name: '고블린 대장', baseHp: 200, baseAttack: 8, pattern: 'basic', emoji: '👺' },
  { id: 'skeleton', name: '해골 기사', baseHp: 300, baseAttack: 12, pattern: 'shield', emoji: '💀' },
  { id: 'dragon_baby', name: '아기 드래곤', baseHp: 400, baseAttack: 15, pattern: 'breath', emoji: '🐲' },
  { id: 'dark_mage', name: '어둠의 마법사', baseHp: 350, baseAttack: 18, pattern: 'silence', emoji: '🧙' },
  { id: 'dragon', name: '고대 드래곤', baseHp: 600, baseAttack: 25, pattern: 'rage', emoji: '🐉' },
];

export function getBossForRound(round) {
  const index = Math.min(round - 1, BOSSES.length - 1);
  const boss = BOSSES[index];
  const scale = 1 + (round - 1) * 0.2;
  return {
    ...boss,
    hp: Math.round(boss.baseHp * scale),
    maxHp: Math.round(boss.baseHp * scale),
    attack: Math.round(boss.baseAttack * scale),
  };
}

export { BOSSES };
