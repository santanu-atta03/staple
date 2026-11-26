// Lightweight Web Audio ambient sound synthesizer for Explore Audio Trends
class AmbientAudioEngine {
  constructor() {
    this.ctx = null;
    this.activeId = null;
    this.oscillators = [];
    this.gainNode = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTrack(trackId) {
    this.stop();
    this.init();
    if (!this.ctx) return;

    this.activeId = trackId;

    // Define soothing harmonic frequencies based on the track
    let freqs = [261.63, 329.63, 392.0, 523.25]; // C major 7 chord
    if (trackId === "tokyo-rain") {
      freqs = [220.0, 261.63, 329.63, 440.0]; // A minor 7 (Lo-fi)
    } else if (trackId === "analog-tape") {
      freqs = [174.61, 220.0, 261.63, 349.23]; // F major 7 (Warm tape)
    } else if (trackId === "cafe-paris") {
      freqs = [196.0, 246.94, 293.66, 392.0]; // G major 7 (Acoustic)
    }

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.gainNode.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.8);

    // Warm filter for vinyl / analog tone
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.gainNode.connect(filter);
    filter.connect(this.ctx.destination);

    this.oscillators = freqs.map((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      // Subtle vibrato/detune
      osc.detune.setValueAtTime((i - 1.5) * 4, this.ctx.currentTime);
      osc.connect(this.gainNode);
      osc.start();
      return osc;
    });
  }

  stop() {
    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
      } catch (e) {}
    }
    setTimeout(() => {
      this.oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      this.oscillators = [];
      this.activeId = null;
    }, 320);
  }

  toggle(trackId) {
    if (this.activeId === trackId) {
      this.stop();
      return false;
    } else {
      this.playTrack(trackId);
      return true;
    }
  }
}

export const audioEngine = new AmbientAudioEngine();
