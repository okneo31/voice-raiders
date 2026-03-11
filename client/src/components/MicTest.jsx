import { useEffect, useState, useCallback } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const TEST_WORDS = ['파이어볼', '아이스볼트', '번개폭풍', '메테오', '패스', '피해'];

export default function MicTest({ onCalibrated }) {
  const [step, setStep] = useState('volume'); // 'volume' | 'stt'
  const [targetWord, setTargetWord] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  const [sttResult, setSttResult] = useState(null); // null | 'success' | 'fail'
  const [testedCount, setTestedCount] = useState(0);

  const { volume, isListening, start: startMic, stop: stopMic } = useVoiceVolume();

  const pickNewWord = useCallback(() => {
    setTargetWord(TEST_WORDS[Math.floor(Math.random() * TEST_WORDS.length)]);
    setLastHeard('');
    setSttResult(null);
  }, []);

  const handleSpeech = useCallback((text) => {
    setLastHeard(text);
    const clean = text.replace(/\s/g, '').toLowerCase();
    if (clean.includes(targetWord.toLowerCase())) {
      setSttResult('success');
      setTestedCount(prev => prev + 1);
    } else {
      setSttResult('fail');
    }
  }, [targetWord]);

  const { start: startSTT, stop: stopSTT } = useSpeechRecognition({ onResult: handleSpeech });

  useEffect(() => {
    startMic();
    return () => stopMic();
  }, [startMic, stopMic]);

  useEffect(() => {
    if (step === 'stt') {
      pickNewWord();
      startSTT();
      return () => stopSTT();
    }
  }, [step, startSTT, stopSTT, pickNewWord]);

  if (step === 'volume') {
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
        {volume > 0.1 && (
          <button className="btn-primary" onClick={() => setStep('stt')} style={{ marginTop: 12 }}>
            음성인식 테스트 →
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

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3 style={{ marginBottom: 8 }}>🗣️ 음성인식 테스트</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
        아래 단어를 소리내어 읽어보세요
      </p>

      <div style={{
        fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-purple)',
        padding: '16px', background: 'rgba(139,92,246,0.15)', borderRadius: 12, marginBottom: 12,
      }}>
        🔮 "{targetWord}"
      </div>

      <div className="volume-bar" style={{ marginBottom: 8, height: 8 }}>
        <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
      </div>

      {lastHeard && (
        <div style={{
          padding: '8px 16px', borderRadius: 8, marginBottom: 8,
          background: sttResult === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
          border: `1px solid ${sttResult === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>인식된 음성:</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>"{lastHeard}"</div>
          {sttResult === 'success' && <div style={{ color: 'var(--accent-green)' }}>✅ 정확!</div>}
          {sttResult === 'fail' && <div style={{ color: 'var(--accent-red)' }}>❌ 다시 시도해보세요</div>}
        </div>
      )}

      {!lastHeard && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          🎤 듣고 있어요...
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn-secondary" onClick={pickNewWord} style={{ flex: 1 }}>
          🔄 다른 단어
        </button>
        {testedCount >= 1 && onCalibrated && (
          <button className="btn-primary" onClick={onCalibrated} style={{ flex: 1 }}>
            완료! →
          </button>
        )}
      </div>

      {onCalibrated && testedCount < 1 && (
        <button
          className="btn-secondary"
          onClick={onCalibrated}
          style={{ marginTop: 8, fontSize: '0.85rem', width: '100%' }}
        >
          건너뛰기
        </button>
      )}
    </div>
  );
}
