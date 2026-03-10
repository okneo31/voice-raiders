export default function BossDisplay({ boss }) {
  if (!boss) return null;
  const hpPercent = (boss.hp / boss.maxHp) * 100;

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>{boss.emoji}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{boss.name}</div>
      <div className="hp-bar">
        <div className="hp-bar-fill" style={{
          width: `${hpPercent}%`,
          background: hpPercent > 50 ? 'var(--accent-red)' : hpPercent > 25 ? 'var(--accent-gold)' : '#ff2222',
        }} />
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
        HP: {boss.hp} / {boss.maxHp}
      </div>
    </div>
  );
}
