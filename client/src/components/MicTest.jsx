import { useEffect, useState, useCallback } from 'react';
import { useVoiceVolume } from '../hooks/useVoiceVolume';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const TEST_WORDS = ['파이어볼', '아이스볼트', '번개폭풍', '메테오', '패스', '피해'];

export default function MicTest({ onCalibrated }) {
  const [step, setStep] = useState('volume'); // 'volume' | 'stt'
  const [targetWord, setTargetWord] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  const [interim, setInterim] = useState('');
  const [sttResult, setSttResult] = useState(null);
  const [testedCount, setTestedCount] = useState(0);
  const [sttStarted, setSttStarted] = useState(false);

  const { volume, isListening: micListening, start: startMic, stop: stopMic } = useVoiceVolume();

  const pickNewWord = useCallback(() => {
    setTargetWord(TEST_WORDS[Math.floor(Math.random() * TEST_WORDS.length)]);
    setLastHeard('');
    setInterim('');
    setSttResult(null);
  }, []);

  const handleSpeech = useCallback((text) => {
    setLastHeard(text);
    setInterim('');
    const clean = text.replace(/\s/g, '').toLowerCase();
    if (clean.includes(targetWord.toLowerCase())) {
      setSttResult('success');
      setTestedCount(prev => prev + 1);
    } else {
      setSttResult('fail');
    }
  }, [targetWord]);

  const handleInterim = useCallback((text) => {
    setInterim(text);
  }, []);

  const { isListening: sttListening, error: sttError, start: startSTT, stop: stopSTT } =
    useSpeechRecognition({ onResult: handleSpeech, onInterim: handleInterim });

  // Volume step: start mic
  useEffect(() => {
    if (step === 'volume') {
      startMic();
      return () => stopMic();
    }
  }, [step, startMic, stopMic]);

  // STT step: stop mic first
  useEffect(() => {
    if (step === 'stt') {
      stopMic();
      pickNewWord();
    }
  }, [step, stopMic, pickNewWord]);

  function handleStartSTT() {
    setSttStarted(true);
    startSTT();
  }

  function handleStopAndNext() {
    stopSTT();
    setSttStarted(false);
    onCalibrated();
  }

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
          {micListening
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

      {!sttStarted ? (
        <>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
            버튼을 누르고 아래 단어를 말해보세요
          </p>
          <div style={{
            fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-purple)',
            padding: '16px', background: 'rgba(139,92,246,0.15)', borderRadius: 12, marginBottom: 12,
          }}>
            🔮 "{targetWord}"
          </div>
          <button className="btn-primary" onClick={handleStartSTT} style={{ width: '100%', fontSize: '1.1rem' }}>
            🎤 음성인식 시작
          </button>
        </>
      ) : (
        <>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
            아래 단어를 소리내어 읽어보세요
          </p>
          <div style={{
            fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-purple)',
            padding: '16px', background: 'rgba(139,92,246,0.15)', borderRadius: 12, marginBottom: 12,
          }}>
            🔮 "{targetWord}"
          </div>

          <div style={{
            padding: '8px', borderRadius: 8, marginBottom: 8, fontSize: '0.8rem',
            color: sttListening ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {sttListening ? '🎤 듣고 있어요...' : '⏳ 음성인식 준비 중...'}
          </div>

          {interim && !lastHeard && (
            <div style={{
              padding: '8px 16px', borderRadius: 8, marginBottom: 8,
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>인식 중...</div>
              <div style={{ fontSize: '1rem', color: 'var(--accent-purple)' }}>"{interim}"</div>
            </div>
          )}

          {lastHeard && (
            <div style={{
              padding: '8px 16px', borderRadius: 8, marginBottom: 8,
              background: sttResult === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              border: `1px solid ${sttResult === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>인식 결과:</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>"{lastHeard}"</div>
              {sttResult === 'success' && <div style={{ color: 'var(--accent-green)' }}>✅ 정확!</div>}
              {sttResult === 'fail' && <div style={{ color: 'var(--accent-red)' }}>❌ 다시 시도해보세요</div>}
            </div>
          )}
        </>
      )}

      {sttError && (
        <div style={{
          padding: '8px 16px', borderRadius: 8, marginBottom: 8,
          background: 'rgba(239,68,68,0.15)', border: '1px solid var(--accent-red)',
          fontSize: '0.85rem', color: 'var(--accent-red)',
        }}>
          ⚠️ {sttError}
        </div>
      )}

      {sttStarted && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn-secondary" onClick={() => { stopSTT(); setSttStarted(false); pickNewWord(); }} style={{ flex: 1 }}>
            🔄 다른 단어
          </button>
          {testedCount >= 1 && onCalibrated && (
            <button className="btn-primary" onClick={handleStopAndNext} style={{ flex: 1 }}>
              완료! →
            </button>
          )}
        </div>
      )}

      {onCalibrated && (
        <button
          className="btn-secondary"
          onClick={() => { stopSTT(); onCalibrated(); }}
          style={{ marginTop: 8, fontSize: '0.85rem', width: '100%' }}
        >
          {testedCount >= 1 ? '완료 →' : '건너뛰기'}
        </button>
      )}
    </div>
  );
}
