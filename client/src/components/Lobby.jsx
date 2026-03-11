import { useState } from 'react';
import MicTest from './MicTest';
import RoleSelect from './RoleSelect';

export default function Lobby({ socket, roomCode, players, myId, onStart }) {
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(!!roomCode);
  const [code, setCode] = useState(roomCode || '');
  const [micReady, setMicReady] = useState(false);
  const [error, setError] = useState('');

  const me = players.find(p => p.socketId === myId);
  const takenRoles = players.filter(p => p.role && p.socketId !== myId).map(p => p.role);
  const allReady = players.length >= 1 && players.every(p => p.role);

  function handleCreate() {
    if (!name.trim()) return;
    socket.emit('create-room', name.trim(), (res) => {
      if (res.success) { setJoined(true); setCode(res.code); }
      else { setError(res.error); }
    });
  }

  function handleJoin() {
    if (!name.trim() || !code.trim()) return;
    socket.emit('join-room', code.trim().toUpperCase(), name.trim(), (res) => {
      if (res.success) { setJoined(true); setCode(res.code); }
      else { setError(res.error); }
    });
  }

  function handleSelectRole(role) {
    socket.emit('select-role', code, role, (res) => {
      if (!res.success) setError(res.error);
    });
  }

  if (!joined) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 48 }}>
        <h1 style={{ textAlign: 'center', fontSize: '2rem' }}>⚔️ Voice Raiders</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>목소리로 전투하는 RPG</p>
        <input
          placeholder="닉네임 입력"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem',
          }}
        />
        <button className="btn-primary" onClick={handleCreate} disabled={!name.trim()}>
          🏰 방 만들기
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="방 코드"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            style={{
              flex: 1, padding: '14px 16px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '1rem',
              textAlign: 'center', letterSpacing: 4,
            }}
          />
          <button className="btn-secondary" onClick={handleJoin} disabled={!name.trim() || !code.trim()}>
            참가
          </button>
        </div>
        {error && <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <h2>⚔️ Voice Raiders</h2>
        <div style={{
          background: 'var(--bg-card)', display: 'inline-block', padding: '8px 20px',
          borderRadius: 8, marginTop: 8, letterSpacing: 4, fontSize: '1.2rem', fontWeight: 700,
        }}>
          {code}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
          이 코드를 친구에게 공유하세요
        </p>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>참가자 ({players.length}/5)</h3>
        {players.map(p => (
          <div key={p.socketId} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span>{p.name} {p.socketId === myId ? '(나)' : ''}</span>
            <span>{p.role ? `${p.role === 'warrior' ? '🗡️' : p.role === 'mage' ? '🔮' : '💚'}` : '⏳'}</span>
          </div>
        ))}
      </div>
      {!micReady ? (
        <MicTest onCalibrated={() => setMicReady(true)} />
      ) : (
        <RoleSelect selectedRole={me?.role} onSelect={handleSelectRole} takenRoles={takenRoles} />
      )}
      {allReady && me?.socketId === players[0]?.socketId && (
        <button className="btn-primary" onClick={() => socket.emit('start-game', code)} style={{ fontSize: '1.1rem' }}>
          🎮 게임 시작!
        </button>
      )}
      {error && <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}
