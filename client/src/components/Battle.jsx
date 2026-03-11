import { useEffect, useRef, useCallback, useState } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import BossDisplay from './BossDisplay';
import PlayerStatus from './PlayerStatus';
import soundManager from '../audio/SoundManager';

const SPELLS = ['파이어볼', '아이스볼트', '번개폭풍', '메테오', '블리자드'];

export default function Battle({ socket, gameState, myId }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [actionLog, setActionLog] = useState([]);
  const [currentSpell, setCurrentSpell] = useState('');
  const [lastHit, setLastHit] = useState(null);
  const [screenEffect, setScreenEffect] = useState('');
  const [spellFlash, setSpellFlash] = useState(null);
  const [combo, setCombo] = useState(0);
  const { volume, start: startMic, stop: stopMic } = useVoiceVolume();
  const volumeRef = useRef(0);
  const lastActionTime = useRef(0);
  const hitCounter = useRef(0);
  const comboTimerRef = useRef(null);
  const timerWarnedRef = useRef(false);
  const me = gameState.players.find(p => p.socketId === myId);

  useEffect(() => { volumeRef.current = volume; }, [volume]);

  useEffect(() => {
    setCurrentSpell(SPELLS[Math.floor(Math.random() * SPELLS.length)]);
  }, []);

  // Combo reset timer
  const bumpCombo = useCallback(() => {
    setCombo(prev => prev + 1);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => setCombo(0), 3000);
  }, []);

  const handleSpeech = useCallback((text) => {
    const now = Date.now();
    if (now - lastActionTime.current < 1000) return;
    lastActionTime.current = now;

    const lower = text.toLowerCase();

    if (lower.includes('피해') || lower.includes('회피') || lower.includes('dodge')) {
      socket.emit('battle-action', gameState.code, { type: 'dodge' });
      soundManager.dodgeWhoosh();
      return;
    }

    if (!me) return;

    if (me.role === 'warrior') {
      socket.emit('battle-action', gameState.code, { type: 'warrior-attack', value: volumeRef.current });
      soundManager.swordSlash();
      bumpCombo();
    } else if (me.role === 'mage') {
      const accuracy = calculateAccuracy(text, currentSpell);
      socket.emit('battle-action', gameState.code, { type: 'mage-attack', value: accuracy });
      soundManager.magicCast();
      setSpellFlash({ text: currentSpell, key: Date.now() });
      setTimeout(() => setSpellFlash(null), 700);
      setCurrentSpell(SPELLS[Math.floor(Math.random() * SPELLS.length)]);
      bumpCombo();
    } else if (me.role === 'healer') {
      socket.emit('battle-action', gameState.code, { type: 'healer-action', value: volumeRef.current });
      soundManager.healChime();
      bumpCombo();
    }
  }, [socket, gameState.code, me, currentSpell, bumpCombo]);

  const { start: startSTT, stop: stopSTT } = useSpeechRecognition({ onResult: handleSpeech });

  useEffect(() => {
    startMic();
    startSTT();
    return () => { stopMic(); stopSTT(); };
  }, [startMic, stopMic, startSTT, stopSTT]);

  useEffect(() => {
    function onTimer({ phase, timeLeft: t }) {
      if (phase === 'battle') setTimeLeft(t);
    }
    socket.on('timer', onTimer);
    return () => socket.off('timer', onTimer);
  }, [socket]);

  // Timer warning at 10 seconds
  useEffect(() => {
    if (timeLeft <= 10 && timeLeft > 0) {
      if (!timerWarnedRef.current || timeLeft <= 5) {
        soundManager.timerWarning();
        timerWarnedRef.current = true;
      }
    } else {
      timerWarnedRef.current = false;
    }
  }, [timeLeft]);

  useEffect(() => {
    function onBattleUpdate(data) {
      if (data.damage) {
        setLastHit({ type: 'damage', value: data.damage, key: ++hitCounter.current });
        setScreenEffect('');
        requestAnimationFrame(() => setScreenEffect('hit-flash'));
        // Play appropriate sound based on action type
        if (data.actionType === 'mage-attack') {
          // magicCast already played on action
        } else {
          // swordSlash already played on action
        }
        bumpCombo();
      } else if (data.healing) {
        setLastHit({ type: 'heal', value: data.healing, key: ++hitCounter.current });
        setScreenEffect('');
        requestAnimationFrame(() => setScreenEffect('heal-flash'));
      } else if (data.dodged) {
        setScreenEffect('');
        requestAnimationFrame(() => setScreenEffect('dodge-anim'));
        soundManager.dodgeWhoosh();
      }
      const msg = data.damage
        ? `⚔️ ${data.playerName}: ${data.damage} 데미지!`
        : data.healing
        ? `💚 ${data.playerName}: ${data.healing} 치유!`
        : `🏃 ${data.playerName}: 회피!`;
      setActionLog(prev => [...prev.slice(-4), msg]);
    }
    function onBossAttack(data) {
      setScreenEffect('');
      requestAnimationFrame(() => setScreenEffect('screen-shake-hard'));
      soundManager.bossImpact();
      data.targets.forEach(t => {
        const msg = t.dodged
          ? `🏃 ${t.name} 회피 성공!`
          : `💥 ${t.name} ${t.damage} 피해!`;
        setActionLog(prev => [...prev.slice(-4), msg]);
      });
    }
    socket.on('battle-update', onBattleUpdate);
    socket.on('boss-attack', onBossAttack);
    return () => {
      socket.off('battle-update', onBattleUpdate);
      socket.off('boss-attack', onBossAttack);
    };
  }, [socket, bumpCombo]);

  // Clear screen effect
  useEffect(() => {
    if (screenEffect) {
      const t = setTimeout(() => setScreenEffect(''), 500);
      return () => clearTimeout(t);
    }
  }, [screenEffect]);

  const battleState = gameState.battle;
  if (!battleState) return null;

  const isTimerUrgent = timeLeft <= 10;

  return (
    <div className={`container ${screenEffect}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      {spellFlash && (
        <div className="spell-flash" key={spellFlash.key}>✨ {spellFlash.text}</div>
      )}
      {combo >= 2 && (
        <div className="combo-counter" key={combo}>
          🔥 {combo} COMBO!
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          라운드 {gameState.round}/{gameState.maxRounds} — 전투
        </span>
        <div className={isTimerUrgent ? 'timer-urgent' : ''} style={{ fontSize: '1.5rem', fontWeight: 700, color: timeLeft <= 10 ? 'var(--accent-red)' : 'var(--accent-gold)' }}>
          ⏱ {timeLeft}초
        </div>
      </div>

      <BossDisplay boss={battleState.boss} lastHit={lastHit} />

      <div className="volume-bar" style={{ height: 12 }}>
        <div className="volume-bar-fill" style={{
          width: `${volume * 100}%`,
          background: me?.role === 'healer'
            ? (volume < 0.3 ? 'var(--accent-green)' : 'var(--accent-red)')
            : 'var(--accent-green)',
        }} />
      </div>

      {me?.role === 'warrior' && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--accent-red)', borderWidth: 1, borderStyle: 'solid' }}>
          🗡️ <strong>크게 외쳐서 공격!</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>볼륨이 클수록 데미지 UP</div>
        </div>
      )}
      {me?.role === 'mage' && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--accent-purple)', borderWidth: 1, borderStyle: 'solid' }}>
          🔮 주문을 읽으세요: <strong style={{ color: 'var(--accent-purple)', fontSize: '1.2rem' }}>{currentSpell}</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>정확할수록 데미지 UP</div>
        </div>
      )}
      {me?.role === 'healer' && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--accent-green)', borderWidth: 1, borderStyle: 'solid' }}>
          💚 <strong>부드럽게 속삭이세요</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>볼륨이 낮을수록 치유력 UP</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {me?.role === 'warrior' && (
          <button className="btn-primary" onClick={() => {
            const now = Date.now();
            if (now - lastActionTime.current < 1000) return;
            lastActionTime.current = now;
            socket.emit('battle-action', gameState.code, { type: 'warrior-attack', value: 0.7 });
            soundManager.swordSlash();
            bumpCombo();
          }} style={{ flex: 1 }}>
            🗡️ 공격
          </button>
        )}
        {me?.role === 'mage' && (
          <button className="btn-primary" onClick={() => {
            const now = Date.now();
            if (now - lastActionTime.current < 1000) return;
            lastActionTime.current = now;
            socket.emit('battle-action', gameState.code, { type: 'mage-attack', value: 0.85 });
            soundManager.magicCast();
            setSpellFlash({ text: currentSpell, key: Date.now() });
            setTimeout(() => setSpellFlash(null), 700);
            setCurrentSpell(SPELLS[Math.floor(Math.random() * SPELLS.length)]);
            bumpCombo();
          }} style={{ flex: 1, background: 'var(--accent-purple)' }}>
            🔮 {currentSpell}
          </button>
        )}
        {me?.role === 'healer' && (
          <button className="btn-primary" onClick={() => {
            const now = Date.now();
            if (now - lastActionTime.current < 1000) return;
            lastActionTime.current = now;
            socket.emit('battle-action', gameState.code, { type: 'healer-action', value: 0.15 });
            soundManager.healChime();
            bumpCombo();
          }} style={{ flex: 1, background: 'var(--accent-green)' }}>
            💚 치유
          </button>
        )}
        <button className="btn-danger" onClick={() => {
          socket.emit('battle-action', gameState.code, { type: 'dodge' });
          soundManager.dodgeWhoosh();
        }} style={{ minWidth: 80 }}>
          🏃 회피
        </button>
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        🎤 음성으로도 가능 | ⚠️ "피해!" 외치면 회피
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {gameState.players.map(p => (
          <PlayerStatus key={p.socketId} player={p} isMe={p.socketId === myId} />
        ))}
      </div>

      <div className="card" style={{ maxHeight: 120, overflow: 'auto', fontSize: '0.8rem' }}>
        {actionLog.map((msg, i) => (
          <div key={i} style={{
            padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            color: msg.startsWith('💥') ? 'var(--accent-red)' :
                   msg.startsWith('💚') ? 'var(--accent-green)' :
                   msg.startsWith('⚔️') ? 'var(--accent-gold)' : 'var(--text-primary)',
          }}>{msg}</div>
        ))}
        {actionLog.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>전투 시작...</div>}
      </div>
    </div>
  );
}

function calculateAccuracy(spoken, target) {
  const s = spoken.replace(/\s/g, '').toLowerCase();
  const t = target.replace(/\s/g, '').toLowerCase();
  if (s.includes(t)) return 1.0;

  let matches = 0;
  const tChars = [...t];
  for (const char of tChars) {
    if (s.includes(char)) matches++;
  }
  return matches / tChars.length;
}
