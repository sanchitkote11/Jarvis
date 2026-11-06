/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class MusicEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: any = null;
  private masterGain: GainNode | null = null;
  private currentStyle = 'stark_ambient';

  public playMusic(style = 'ambient') {
    this.stopMusic();
    this.currentStyle = style.toLowerCase();
    this.isPlaying = true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Stark Ambient / Synthwave chords & arpeggios
      const chordFrequencies = this.getChordFrequencies(this.currentStyle);
      let step = 0;

      // Play continuous ambient chord pad
      for (const freq of chordFrequencies) {
        this.playPadVoice(freq);
      }

      // Play rhythmic arpeggio loop
      this.intervalId = setInterval(() => {
        if (!this.isPlaying || !this.audioCtx || !this.masterGain) return;
        const note = chordFrequencies[step % chordFrequencies.length] * (step % 2 === 0 ? 1 : 1.5);
        this.playArpNote(note);
        step++;
      }, 350);

    } catch (err) {
      console.warn('Music engine error:', err);
    }
  }

  public stopMusic() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.8);
        setTimeout(() => {
          if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close();
            this.audioCtx = null;
          }
        }, 900);
      } catch (_) {
        this.audioCtx = null;
      }
    } else if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (_) {}
      this.audioCtx = null;
    }
  }

  public getStatus(): boolean {
    return this.isPlaying;
  }

  private getChordFrequencies(style: string): number[] {
    if (style.includes('jazz') || style.includes('smooth')) {
      return [220.00, 261.63, 329.63, 392.00, 493.88]; // A minor 9
    } else if (style.includes('rock') || style.includes('beats') || style.includes('protocol')) {
      return [164.81, 196.00, 246.94, 293.66, 329.63]; // E minor synth
    } else if (style.includes('chill') || style.includes('relax')) {
      return [130.81, 164.81, 196.00, 246.94, 293.66]; // C major 9
    }
    // Default Stark Futuristic Ambient
    return [146.83, 220.00, 293.66, 369.99, 440.00]; // D minor 9 ethereal pad
  }

  private playPadVoice(freq: number) {
    if (!this.audioCtx || !this.masterGain) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.audioCtx.currentTime + 2.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start();

      // Keep playing until stopMusic is called
      const checkInterval = setInterval(() => {
        if (!this.isPlaying) {
          clearInterval(checkInterval);
          try { osc.stop(); } catch (_) {}
        }
      }, 500);
    } catch (_) {}
  }

  private playArpNote(freq: number) {
    if (!this.audioCtx || !this.masterGain) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.5, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, this.audioCtx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    } catch (_) {}
  }
}

export const musicEngine = new MusicEngine();
