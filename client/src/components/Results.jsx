import { ROLES } from '../game/constants';

export default function Results({ gameState, myId, onPlayAgain }) {
  const results = gameState;
  if (!results) return null;

  const sortedPlayers = [...results.players].sort(
    (a, b) => (b.stats.damage + b.stats.healing) - (a.stats.damage + a.stats.healing)
  );

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>{results.cleared ? '🎉' : '💀'}</div>
        <h2 style={{ color: results.cleared ? 'var(--accent-gold)' : 'var(--accent-red)' }}>
          {results.cleared ? '던전 클리어!' : '전멸...'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {results.round}/{5} 라운드 완료
        </p>
      </div>

      {results.mvp && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--accent-gold)', borderWidth: 2, borderStyle: 'solid' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>🏆 MVP</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{results.mvp.name}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            데미지: {results.mvp.damage} | 치유: {results.mvp.healing}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sortedPlayers.map((p, i) => {
          const role = ROLES[p.role];
          return (
            <div key={p.socketId} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              borderColor: p.socketId === myId ? role?.color : 'transparent',
              borderWidth: 1, borderStyle: 'solid',
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)', minWidth: 24 }}>
                #{i + 1}
              </div>
              <span style={{ fontSize: '1.5rem' }}>{role?.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{p.name} {p.socketId === myId ? '(나)' : ''}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  ⚔️ {p.stats.damage} 데미지 | 💚 {p.stats.healing} 치유 | 💰 {p.gold}G 잔여
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn-primary" onClick={onPlayAgain} style={{ fontSize: '1.1rem' }}>
        🔄 다시 하기
      </button>
    </div>
  );
}
