import { ROLES } from '../game/constants';

export default function PlayerStatus({ player, isMe }) {
  if (!player) return null;
  const role = ROLES[player.role];
  const hpPercent = (player.hp / player.maxHp) * 100;

  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
      borderColor: isMe ? role?.color : 'transparent', borderWidth: 2, borderStyle: 'solid',
      opacity: player.hp <= 0 ? 0.4 : 1,
    }}>
      <span style={{ fontSize: '1.5rem' }}>{role?.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          {player.name} {isMe ? '(나)' : ''}
        </div>
        <div className="hp-bar" style={{ height: 6, marginTop: 4 }}>
          <div className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>
          HP {player.hp}/{player.maxHp} | 💰{player.gold}G
        </div>
      </div>
    </div>
  );
}
