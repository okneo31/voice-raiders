// SoundManager - Web Audio API synthesized sounds (no audio files needed)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  _ensureCtx() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  // --- Utility methods ---

  _playTone(freq, duration, type = 'sine', volume = 0.3, fadeOut = true) {
    if (!this._ensureCtx()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    if (fadeOut) {
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  _playNoise(duration, volume = 0.2, highpass = 1000) {
    if (!this._ensureCtx()) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpass, this.ctx.currentTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  // --- Auction Sounds ---

  bidConfirm() {
    // Bright ding: two quick ascending tones
    if (!this._ensureCtx()) return;
    this._playTone(880, 0.12, 'sine', 0.25);
    setTimeout(() => this._playTone(1320, 0.15, 'sine', 0.3), 80);
  }

  outbidAlert() {
    // Warning: descending minor chord
    if (!this._ensureCtx()) return;
    this._playTone(600, 0.15, 'square', 0.15);
    setTimeout(() => this._playTone(450, 0.15, 'square', 0.15), 120);
    setTimeout(() => this._playTone(350, 0.25, 'square', 0.12), 240);
  }

  passSound() {
    // Soft low tone
    this._playTone(300, 0.2, 'sine', 0.15);
  }

  auctionFanfare() {
    // Triumphant ascending arpeggio
    if (!this._ensureCtx()) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.2, 'sine', 0.25), i * 100);
    });
  }

  // --- Battle Sounds ---

  swordSlash() {
    // Noise whoosh + metallic ping
    if (!this._ensureCtx()) return;
    this._playNoise(0.15, 0.25, 2000);
    setTimeout(() => this._playTone(2500, 0.08, 'sine', 0.15), 50);
  }

  magicCast() {
    // Frequency sweep up
    if (!this._ensureCtx()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.4);
    // Shimmer overlay
    setTimeout(() => this._playTone(1500, 0.15, 'sine', 0.1), 150);
  }

  healChime() {
    // Soft ascending bell chimes
    if (!this._ensureCtx()) return;
    const notes = [523, 659, 784];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.25, 'sine', 0.15), i * 120);
    });
  }

  dodgeWhoosh() {
    // Quick noise sweep
    this._playNoise(0.2, 0.15, 800);
  }

  bossImpact() {
    // Low thump + rumble
    if (!this._ensureCtx()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.4);
    this._playNoise(0.2, 0.15, 200);
  }

  bossDefeatFanfare() {
    // Epic victory fanfare
    if (!this._ensureCtx()) return;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.25, 'sine', 0.25), i * 120);
    });
  }

  // --- UI Sounds ---

  buttonClick() {
    this._playTone(800, 0.06, 'sine', 0.1);
  }

  timerWarning() {
    // Short beep
    this._playTone(1000, 0.08, 'square', 0.12);
  }

  gameStart() {
    // Rising arpeggio
    if (!this._ensureCtx()) return;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.15, 'sine', 0.2), i * 100);
    });
  }

  victory() {
    // Triumphant melody
    if (!this._ensureCtx()) return;
    const notes = [523, 659, 784, 1047, 1047, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, i === 5 ? 0.5 : 0.18, 'sine', 0.25), i * 150);
    });
  }

  defeat() {
    // Sad descending tones
    if (!this._ensureCtx()) return;
    const notes = [440, 370, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.3, 'sine', 0.2), i * 200);
    });
  }

  criticalHit() {
    // Impactful hit with high metallic ping
    if (!this._ensureCtx()) return;
    this._playNoise(0.1, 0.3, 3000);
    this._playTone(1800, 0.1, 'sine', 0.3);
    setTimeout(() => this._playTone(2400, 0.15, 'sine', 0.2), 60);
  }
}

// Singleton export
const soundManager = new SoundManager();
export default soundManager;
