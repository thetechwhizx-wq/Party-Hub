/**
 * audio.js — Procedural Web Audio API sound effects engine
 * Party Hub core module
 *
 * Zero external audio files required! Synthesizes authentic game sounds:
 * gavel/bid knock, countdown ticks, buzzer, sold fanfare, match whistles, victory fanfare.
 */

class SoundEngine {
  constructor() {
    this._ctx = null;
    this._muted = false;

    // Load mute preference
    try {
      this._muted = localStorage.getItem('ph_muted') === 'true';
    } catch {}
  }

  _init() {
    if (!this._ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this._ctx = new AudioCtx();
      }
    }
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }

  toggleMute() {
    this._muted = !this._muted;
    try {
      localStorage.setItem('ph_muted', String(this._muted));
    } catch {}
    return this._muted;
  }

  isMuted() {
    return this._muted;
  }

  /** Bid placed / gavel tap sound */
  playBid() {
    if (this._muted) return;
    this._init();
    if (!this._ctx) return;

    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const now = this._ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this._ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /** Urgent timer tick */
  playTick() {
    if (this._muted) return;
    this._init();
    if (!this._ctx) return;

    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const now = this._ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this._ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** SOLD / item won sound */
  playSold() {
    if (this._muted) return;
    this._init();
    if (!this._ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      const start = this._ctx.currentTime + i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(this._ctx.destination);

      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  /** Goal / Big hit celebratory sound */
  playGoal() {
    if (this._muted) return;
    this._init();
    if (!this._ctx) return;

    const now = this._ctx.currentTime;
    // Whistle
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.setValueAtTime(2800, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this._ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  /** Clash / attack sound */
  playClash() {
    if (this._muted) return;
    this._init();
    if (!this._ctx) return;

    const now = this._ctx.currentTime;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this._ctx.destination);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  /** Win / Victory fanfare */
  playVictory() {
    if (this._muted) return;
    this._init();
    if (!this._ctx) return;

    const melody = [
      { f: 523.25, d: 0.12 }, // C
      { f: 659.25, d: 0.12 }, // E
      { f: 783.99, d: 0.12 }, // G
      { f: 1046.50, d: 0.35 }, // C (high)
    ];

    let t = this._ctx.currentTime;
    melody.forEach((note) => {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this._ctx.destination);

      osc.start(t);
      osc.stop(t + note.d + 0.02);

      t += note.d;
    });
  }
}

export const Sound = new SoundEngine();
