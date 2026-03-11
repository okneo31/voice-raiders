import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GAME_CONFIG } from '../game/constants';
import soundManager from '../audio/SoundManager';
import ttsManager from '../audio/TTSManager';

function parseBidAmount(text) {
  const cleaned = text.replace(/\s/g, '');
  const koreanMap = { '십': 10, '이십': 20, '삼십': 30, '사십': 40, '오십': 50, '육십': 60, '칠십': 70, '팔십': 80, '구십': 90, '백': 100 };
  for (const [word, val] of Object.entries(koreanMap)) {
    if (cleaned.includes(word)) return val;
  }
  const num = parseInt(cleaned.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}

function spawnCoinParticles(x, y) {
  for (let i = 0; i < 5; i++) {
    const coin = document.createElement('div');
    coin.className = 'coin-particle';
    coin.textContent = '💰';
    coin.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    coin.style.top = `${y}px`;
    coin.style.setProperty('--coin-x', `${(Math.random() - 0.5) * 60}px`);
    document.body.appendChild(coin);
    setTimeout(() => coin.remove(), 800);
  }
}

export default function Auction({ socket, gameState, myId }) {
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.AUCTION_DURATION);
  const [lastBid, setLastBid] = useState(null);
  const [bidInput, setBidInput] = useState('');
  const [bidPopup, setBidPopup] = useState(null);
  const [outbidFlash, setOutbidFlash] = useState(false);
  const { volume, start: startMic, stop: stopMic } = useVoiceVolume();
  const volumeRef = useRef(0);
  const prevHighestRef = useRef(null);
  const timerWarnedRef = useRef(false);

  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const doBid = useCallback((amount) => {
    socket.emit('auction-bid', gameState.code, amount, volumeRef.current);
    soundManager.bidConfirm();
    ttsManager.confirmBid(amount);
    setBidPopup({ amount, key: Date.now() });
    setTimeout(() => setBidPopup(null), 800);
    // Coin particles from center
    spawnCoinParticles(window.innerWidth / 2, window.innerHeight * 0.4);
  }, [socket, gameState.code]);

  const handleSpeech = useCallback((text) => {
    const lower = text.toLowerCase();
    if (lower.includes('패스') || lower.includes('pass')) {
      socket.emit('auction-pass', gameState.code);
      soundManager.passSound();
      return;
    }
    const amount = parseBidAmount(text);
    if (amount && amount > 0) {
      doBid(amount);
    }
  }, [socket, gameState.code, doBid]);

  const { start: startSTT, stop: stopSTT } = useSpeechRecognition({ onResult: handleSpeech });

  useEffect(() => {
    startMic();
    startSTT();
    return () => { stopMic(); stopSTT(); };
  }, [startMic, stopMic, startSTT, stopSTT]);

  // Server-driven timer
  useEffect(() => {
    function onTimer({ phase, timeLeft: t }) {
      if (phase === 'auction') setTimeLeft(t);
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
    socket.on('bid-updated', setLastBid);
    return () => socket.off('bid-updated', setLastBid);
  }, [socket]);

  // Detect outbid
  const highest = gameState.auction?.highestBid;
  useEffect(() => {
    if (highest && prevHighestRef.current) {
      const wasWinning = prevHighestRef.current.playerId === myId;
      const nowWinning = highest.playerId === myId;
      if (wasWinning && !nowWinning) {
        soundManager.outbidAlert();
        setOutbidFlash(true);
        setTimeout(() => setOutbidFlash(false), 600);
      }
    }
    prevHighestRef.current = highest;
  }, [highest, myId]);

  const item = gameState.auction?.currentItem;
  if (!item) return null;

  const isTimerUrgent = timeLeft <= 10;

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
      {bidPopup && (
        <div className="bid-popup" key={bidPopup.key}>💰 {bidPopup.amount}G</div>
      )}

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          라운드 {gameState.round}/{gameState.maxRounds} — 경매
          ({(gameState.auction?.itemIndex || 0) + 1}/{gameState.auction?.totalItems || '?'})
        </div>
        <div className={isTimerUrgent ? 'timer-urgent' : ''} style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
          ⏱ {timeLeft}초
        </div>
        <div className="volume-bar" style={{ marginTop: 8 }}>
          <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{item.name}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          {item.role ? `${item.role} 전용` : '공용'}
          {item.attackBonus ? ` | 공격 +${item.attackBonus}` : ''}
          {item.defenseBonus ? ` | 방어 +${item.defenseBonus}` : ''}
          {item.healBonus ? ` | 치유 +${item.healBonus}` : ''}
        </div>
        <div style={{ fontSize: '0.8rem', marginTop: 4 }}>시작가: {item.basePrice}G</div>
      </div>

      {highest && (
        <div className={`card ${outbidFlash ? 'outbid-flash' : ''}`} style={{
          textAlign: 'center', borderColor: highest.playerId === myId ? 'var(--accent-green)' : 'var(--accent-red)',
          borderWidth: 2, borderStyle: 'solid',
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>현재 최고 입찰</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
            💰 {highest.amount}G
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {lastBid?.playerName || '???'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="number"
          placeholder="입찰 금액"
          value={bidInput}
          onChange={e => setBidInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && bidInput) {
              const amount = parseInt(bidInput, 10);
              if (amount > 0) {
                doBid(amount);
                setBidInput('');
              }
            }
          }}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem',
          }}
        />
        <button
          className="btn-primary"
          onClick={() => {
            const amount = parseInt(bidInput, 10);
            if (amount > 0) {
              doBid(amount);
              setBidInput('');
            }
          }}
          disabled={!bidInput}
          style={{ whiteSpace: 'nowrap' }}
        >
          입찰
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            socket.emit('auction-pass', gameState.code);
            soundManager.passSound();
          }}
        >
          패스
        </button>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
        🎤 음성으로도 가능: 금액을 외치거나 "패스!"
      </div>

      <div className="card">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>내 골드</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
          💰 {gameState.players.find(p => p.socketId === myId)?.gold || 0}G
        </div>
      </div>
    </div>
  );
}
