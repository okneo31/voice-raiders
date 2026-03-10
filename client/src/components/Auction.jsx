import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GAME_CONFIG } from '../game/constants';

function parseBidAmount(text) {
  const cleaned = text.replace(/\s/g, '');
  const koreanMap = { '십': 10, '이십': 20, '삼십': 30, '사십': 40, '오십': 50, '육십': 60, '칠십': 70, '팔십': 80, '구십': 90, '백': 100 };
  for (const [word, val] of Object.entries(koreanMap)) {
    if (cleaned.includes(word)) return val;
  }
  const num = parseInt(cleaned.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}

export default function Auction({ socket, gameState, myId }) {
  const [timeLeft, setTimeLeft] = useState(GAME_CONFIG.AUCTION_DURATION);
  const [lastBid, setLastBid] = useState(null);
  const { volume, start: startMic, stop: stopMic } = useVoiceVolume();
  const volumeRef = useRef(0);

  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const handleSpeech = useCallback((text) => {
    const lower = text.toLowerCase();
    if (lower.includes('패스') || lower.includes('pass')) {
      socket.emit('auction-pass', gameState.code);
      return;
    }
    const amount = parseBidAmount(text);
    if (amount && amount > 0) {
      socket.emit('auction-bid', gameState.code, amount, volumeRef.current);
    }
  }, [socket, gameState.code]);

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

  useEffect(() => {
    socket.on('bid-updated', setLastBid);
    return () => socket.off('bid-updated', setLastBid);
  }, [socket]);

  const item = gameState.auction?.currentItem;
  const highest = gameState.auction?.highestBid;

  if (!item) return null;

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          라운드 {gameState.round}/{gameState.maxRounds} — 경매
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-gold)' }}>⏱ {timeLeft}초</div>
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
        <div className="card" style={{
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

      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        🎤 금액을 외치세요! ("오십!", "50!") <br />
        🤫 "패스!" 하면 포기
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
