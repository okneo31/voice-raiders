// TTSManager - Web Speech Synthesis API for Korean TTS
class TTSManager {
  constructor() {
    this.enabled = 'speechSynthesis' in window;
    this.speaking = false;
  }

  _speak(text, rate = 1.1) {
    if (!this.enabled || this.speaking) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // Try to find Korean voice
      const voices = window.speechSynthesis.getVoices();
      const koVoice = voices.find(v => v.lang.startsWith('ko'));
      if (koVoice) utterance.voice = koVoice;

      this.speaking = true;
      utterance.onend = () => { this.speaking = false; };
      utterance.onerror = () => { this.speaking = false; };
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.speaking = false;
    }
  }

  confirmBid(amount) {
    this._speak(`${amount}골드 입찰!`, 1.2);
  }

  announceAuctionResult(winner, item, amount) {
    this._speak(`${winner}님이 ${item}을 ${amount}골드에 낙찰!`, 1.0);
  }

  announceVictory() {
    this._speak('던전 클리어!', 0.9);
  }

  announceDefeat() {
    this._speak('전멸...', 0.8);
  }

  announcePhase(phase) {
    const text = phase === 'auction' ? '경매 시작!' : phase === 'battle' ? '전투 시작!' : '';
    if (text) this._speak(text, 1.0);
  }
}

const ttsManager = new TTSManager();
export default ttsManager;
