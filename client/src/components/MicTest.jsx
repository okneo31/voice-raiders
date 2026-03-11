import { useEffect } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';

export default function MicTest({ onCalibrated }) {
  const { volume, isListening, start, stop } = useVoiceVolume();

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3 style={{ marginBottom: 8 }}>🎤 마이크 테스트</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 12 }}>
        마이크에 대고 말해보세요
      </p>
      <div className="volume-bar" style={{ marginBottom: 8 }}>
        <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
      </div>
      <p style={{ fontSize: '0.85rem', color: volume > 0.1 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
        {isListening
          ? volume > 0.1 ? '✅ 마이크가 잘 작동합니다!' : '소리를 내보세요...'
          : '마이크 연결 중...'}
      </p>
      {volume > 0.1 && onCalibrated && (
        <button className="btn-primary" onClick={onCalibrated} style={{ marginTop: 12 }}>
          확인
        </button>
      )}
      {onCalibrated && (
        <button
          className="btn-secondary"
          onClick={onCalibrated}
          style={{ marginTop: 8, fontSize: '0.85rem' }}
        >
          ⌨️ 마이크 없이 진행
        </button>
      )}
    </div>
  );
}
