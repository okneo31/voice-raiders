import { useState, useRef, useCallback } from 'react';

export function useSpeechRecognition({ lang = 'ko-KR', onResult, onInterim } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  onResultRef.current = onResult;
  onInterimRef.current = onInterim;

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('이 브라우저는 음성인식을 지원하지 않습니다');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (interimTranscript) {
          onInterimRef.current?.(interimTranscript);
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          setError(null);
          onResultRef.current?.(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        const errorMessages = {
          'not-allowed': '마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.',
          'no-speech': null,
          'audio-capture': '마이크를 찾을 수 없습니다.',
          'network': '네트워크 오류. 인터넷 연결을 확인해주세요.',
          'service-not-allowed': '음성인식 서비스를 사용할 수 없습니다.',
          'aborted': null,
        };
        const msg = errorMessages[event.error];
        if (msg !== undefined) {
          if (msg) setError(msg);
        } else {
          setError(`음성인식 오류: ${event.error}`);
        }
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current) {
          try { recognition.start(); } catch (e) { /* ignore restart error */ }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch (e) {
      setError(`음성인식 시작 실패: ${e.message}`);
    }
  }, [lang]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try { ref.stop(); } catch (e) { /* ignore */ }
      setIsListening(false);
    }
  }, []);

  return { isListening, transcript, error, start, stop };
}
