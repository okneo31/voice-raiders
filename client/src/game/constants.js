export const ROLES = {
  warrior: { name: '전사', emoji: '🗡️', color: '#ef4444', description: '크게 외쳐서 공격!' },
  mage:    { name: '마법사', emoji: '🔮', color: '#8b5cf6', description: '주문을 정확히 읽어서 공격!' },
  healer:  { name: '힐러', emoji: '💚', color: '#10b981', description: '부드럽게 속삭여서 치유!' },
};

export const PHASES = {
  lobby: '로비',
  auction: '경매',
  battle: '전투',
  results: '결과',
};

export const GAME_CONFIG = {
  MAX_PLAYERS: 5,
  MIN_PLAYERS: 2,
  STARTING_GOLD: 100,
  AUCTION_DURATION: 30,
  BATTLE_DURATION: 60,
  TOTAL_ROUNDS: 5,
};
