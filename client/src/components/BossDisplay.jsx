import { useState, useEffect, useRef } from 'react';

export default function BossDisplay({ boss, lastHit }) {
  const [hitAnim, setHitAnim] = useState(false);
  const [dmgPops, setDmgPops] = useState([]);
  const popIdRef = useRef(0);

  useEffect(() => {
    if (lastHit) {
      setHitAnim(true);
      const id = ++popIdRef.current;
      setDmgPops(prev => [...prev, { id, ...lastHit }]);
      const t1 = setTimeout(() => setHitAnim(false), 300);
      const t2 = setTimeout(() => setDmgPops(prev => prev.filter(p => p.id !== id)), 900);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [lastHit]);

  if (!boss) return null;
  const hpPercent = (boss.hp / boss.maxHp) * 100;

  return (
    <div className={`card ${hitAnim ? 'boss-hit' : ''}`} style={{ textAlign: 'center', position: 'relative', overflow: 'visible' }}>
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
      {dmgPops.map(pop => (
        <div key={pop.id} className="dmg-pop" style={{
          color: pop.type === 'heal' ? 'var(--accent-green)' : 'var(--accent-gold)',
        }}>
          {pop.type === 'heal' ? `+${pop.value}` : `-${pop.value}`}
        </div>
      ))}
    </div>
  );
}
