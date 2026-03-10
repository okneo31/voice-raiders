import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Lobby from './components/Lobby';
import Auction from './components/Auction';
import Battle from './components/Battle';
import Results from './components/Results';

export default function App() {
  const { socket, isConnected } = useSocket();
  const [gameState, setGameState] = useState(null);

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

  const phase = gameState?.phase;

  if (phase === 'auction') {
    return <Auction socket={socket} gameState={gameState} myId={socket.id} />;
  }

  if (phase === 'battle') {
    return <Battle socket={socket} gameState={gameState} myId={socket.id} />;
  }

  if (phase === 'results') {
    return (
      <Results
        gameState={gameState}
        myId={socket.id}
        onPlayAgain={() => {
          setGameState(null);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <Lobby
      socket={socket}
      roomCode={gameState?.code}
      players={gameState?.players || []}
      myId={socket.id}
    />
  );
}
