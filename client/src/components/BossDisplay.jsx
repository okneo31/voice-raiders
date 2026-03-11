import { useState, useEffect, useRef } from 'react';
import soundManager from '../audio/SoundManager';

export default function BossDisplay({ boss, lastHit }) {
  const [hitAnim, setHitAnim] = useState(false);
  const [dmgPops, setDmgPops] = useState([]);
  const [critPop, setCritPop] = useState(null);
  const [healParticles, setHealParticles] = useState([]);
  const [bossExplode, setBossExplode] = useState(false);
  const popIdRef = useRef(0);
  const healIdRef = useRef(0);
  const prevHpRef = useRef(null);

  useEffect(() => {
    if (lastHit) {
      setHitAnim(true);
      const id = ++popIdRef.current;
      setDmgPops(prev => [...prev, { id, ...lastHit }]);
      const t1 = setTimeout(() => setHitAnim(false), 300);
      const t2 = setTimeout(() => setDmgPops(prev => prev.filter(p => p.id !== id)), 900);

      // Critical hit: damage >= 15
      if (lastHit.type === 'damage' && lastHit.value >= 15) {
        soundManager.criticalHit();
        setCritPop({ value: lastHit.value, key: Date.now() });
        setTimeout(() => setCritPop(null), 1000);
      }

      // Heal particles
      if (lastHit.type === 'heal') {
        const particles = [];
        for (let i = 0; i < 3; i++) {
          particles.push({
            id: ++healIdRef.current,
            left: 30 + Math.random() * 40,
            delay: i * 100,
          });
        }
        setHealParticles(prev => [...prev, ...particles]);
        setTimeout(() => {
          setHealParticles(prev => prev.filter(p => !particles.find(pp => pp.id === p.id)));
        }, 1100);
      }

      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [lastHit]);

  // Boss defeat explosion
  useEffect(() => {
    if (boss && prevHpRef.current !== null && prevHpRef.current > 0 && boss.hp <= 0) {
      setBossExplode(true);
      soundManager.bossDefeatFanfare();
    }
    if (boss) prevHpRef.current = boss.hp;
  }, [boss?.hp]);

  if (!boss) return null;
  const hpPercent = (boss.hp / boss.maxHp) * 100;

  return (
    <div className={`card ${hitAnim ? 'boss-hit' : ''} ${bossExplode ? 'boss-explode' : ''}`}
      style={{ textAlign: 'center', position: 'relative', overflow: 'visible' }}>
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
      {critPop && (
        <div className="crit-pop" key={critPop.key}>
          💥 CRIT! -{critPop.value}
        </div>
      )}
      {healParticles.map(p => (
        <div key={p.id} className="heal-particle" style={{
          left: `${p.left}%`,
          bottom: '20%',
          animationDelay: `${p.delay}ms`,
        }}>
          💚
        </div>
      ))}
    </div>
  );
}
