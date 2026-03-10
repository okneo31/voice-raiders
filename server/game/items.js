const ITEMS = [
  { id: 'sword1', name: '불꽃의 검', role: 'warrior', attackBonus: 10, defenseBonus: 0, basePrice: 20 },
  { id: 'sword2', name: '번개의 도끼', role: 'warrior', attackBonus: 18, defenseBonus: 0, basePrice: 35 },
  { id: 'shield1', name: '강철 방패', role: 'warrior', attackBonus: 0, defenseBonus: 10, basePrice: 25 },
  { id: 'staff1', name: '마력의 지팡이', role: 'mage', attackBonus: 12, defenseBonus: 0, basePrice: 22 },
  { id: 'staff2', name: '폭풍의 오브', role: 'mage', attackBonus: 20, defenseBonus: 0, basePrice: 40 },
  { id: 'robe1', name: '마법사의 로브', role: 'mage', attackBonus: 5, defenseBonus: 8, basePrice: 28 },
  { id: 'wand1', name: '치유의 완드', role: 'healer', attackBonus: 5, defenseBonus: 0, healBonus: 10, basePrice: 20 },
  { id: 'wand2', name: '생명의 성배', role: 'healer', attackBonus: 0, defenseBonus: 0, healBonus: 20, basePrice: 38 },
  { id: 'cloak1', name: '수호의 망토', role: 'healer', attackBonus: 0, defenseBonus: 12, healBonus: 5, basePrice: 30 },
  { id: 'potion1', name: 'HP 포션', role: null, attackBonus: 0, defenseBonus: 0, hpRestore: 30, basePrice: 15 },
  { id: 'ring1', name: '용기의 반지', role: null, attackBonus: 8, defenseBonus: 5, basePrice: 30 },
];

export function getRandomItems(count, round) {
  const shuffled = [...ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(item => ({
    ...item,
    attackBonus: Math.round(item.attackBonus * (1 + round * 0.15)),
    defenseBonus: Math.round(item.defenseBonus * (1 + round * 0.15)),
    basePrice: Math.round(item.basePrice * (1 + round * 0.1)),
  }));
}

export { ITEMS };
