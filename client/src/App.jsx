import { useState, useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import Auction from './components/Auction';
import Battle from './components/Battle';
import Results from './components/Results';
import soundManager from './audio/SoundManager';
import ttsManager from './audio/TTSManager';

export default function App() {
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState(null);
  const [phaseOverlay, setPhaseOverlay] = useState(null);
  const audioInitRef = useRef(false);
  const prevPhaseRef = useRef(null);

  // Init AudioContext on first user interaction (mobile autoplay policy)
  useEffect(() => {
    function initAudio() {
      if (audioInitRef.current) return;
      audioInitRef.current = true;
      soundManager.init();
    }
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  useEffect(() => {
    function onRoomUpdated(state) {
      setGameState(prev => ({ ...prev, ...state }));
    }
    function onGameState(state) {
      setGameState(state);
    }

    socket.on('room-updated', onRoomUpdated);
    socket.on('game-state', onGameState);

    return () => {
      socket.off('room-updated', onRoomUpdated);
      socket.off('game-state', onGameState);
    };
  }, [socket]);

  // Auction result listener
  useEffect(() => {
    function onAuctionResult(data) {
      if (data.winner && data.item && data.amount) {
        soundManager.auctionFanfare();
        ttsManager.announceAuctionResult(data.winner, data.item, data.amount);
      }
    }
    socket.on('auction-result', onAuctionResult);
    return () => socket.off('auction-result', onAuctionResult);
  }, [socket]);

  // Phase transition overlay
  const phase = gameState?.phase;
  useEffect(() => {
    if (phase && phase !== prevPhaseRef.current) {
      const prev = prevPhaseRef.current;
      prevPhaseRef.current = phase;

      if (prev !== null) {
        let text = '';
        if (phase === 'auction') text = '⚔️ 경매 시작!';
        else if (phase === 'battle') text = '🔥 전투 시작!';
        else if (phase === 'results') text = '📊 결과';

        if (text) {
          soundManager.gameStart();
          ttsManager.announcePhase(phase);
          setPhaseOverlay(text);
          setTimeout(() => setPhaseOverlay(null), 1500);
        }
      }
    }
  }, [phase]);

  if (!isConnected) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse" style={{ fontSize: '2rem' }}>⚔️</div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>서버 연결 중...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {phaseOverlay && (
        <div className="phase-overlay">
          <div className="phase-overlay-text">{phaseOverlay}</div>
        </div>
      )}

      {phase === 'auction' ? (
        <Auction socket={socket} gameState={gameState} myId={socket.id} />
      ) : phase === 'battle' ? (
        <Battle socket={socket} gameState={gameState} myId={socket.id} />
      ) : phase === 'results' ? (
        <Results
          gameState={gameState}
          myId={socket.id}
          onPlayAgain={() => {
            setGameState(null);
            window.location.reload();
          }}
        />
      ) : (
        <Lobby
          socket={socket}
          roomCode={gameState?.code}
          players={gameState?.players || []}
          myId={socket.id}
        />
      )}
    </>
  );
}
