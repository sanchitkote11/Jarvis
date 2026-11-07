/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * AtmosphericHumEngine
 * Generates a subtle, low-frequency atmospheric sound loop using the Web Audio API
 * that reacts dynamically to the user's voice intensity and model thinking state.
 */
class AtmosphericHumEngine {
  private audioCtx: AudioContext | null = null;
  private isRunning = false;
  private isMuted = false;

  private oscFund1: OscillatorNode | null = null;
  private oscFund2: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gainFund: GainNode | null = null;
  private gainHarmonic: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private currentIntensity = 0;
  private isThinking = false;

  constructor() {
    try {
      const savedMute = localStorage.getItem('jarvis_ambient_hum_muted');
      if (savedMute === 'true') {
        this.isMuted = true;
      }
    } catch (_) {}
  }

  public isEnabled(): boolean {
    return this.isRunning && !this.isMuted;
  }

  public isMutedState(): boolean {
    return this.isMuted;
  }

  public getIntensity(): number {
    return this.currentIntensity;
  }

  public isThinkingMode(): boolean {
    return this.isThinking;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('jarvis_ambient_hum_muted', String(this.isMuted));
    } catch (_) {}

    if (this.isMuted) {
      if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.2);
      }
    } else {
      if (!this.isRunning) {
        this.start();
      } else if (this.masterGain && this.audioCtx) {
        this.masterGain.gain.setTargetAtTime(0.05, this.audioCtx.currentTime, 0.3);
      }
    }
    return !this.isMuted;
  }

  public start() {
    if (this.isRunning && this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // 1. Resonant Lowpass Filter for Atmospheric Depth
      this.filter = this.audioCtx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(130, now);
      this.filter.Q.setValueAtTime(2.2, now);

      // 2. Master Gain Node (subtle, low-frequency atmospheric level)
      this.masterGain = this.audioCtx.createGain();
      const initialGain = this.isMuted ? 0 : 0.05;
      this.masterGain.gain.setValueAtTime(0.0001, now);
      this.masterGain.gain.exponentialRampToValueAtTime(Math.max(initialGain, 0.0001), now + 1.5);

      this.filter.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);

      // 3. Fundamental Sub-Bass Oscillators (58Hz + detuned 58.6Hz for organic breathing)
      this.oscFund1 = this.audioCtx.createOscillator();
      this.oscFund1.type = 'sine';
      this.oscFund1.frequency.setValueAtTime(58, now);

      this.oscFund2 = this.audioCtx.createOscillator();
      this.oscFund2.type = 'triangle';
      this.oscFund2.frequency.setValueAtTime(58.6, now);

      this.gainFund = this.audioCtx.createGain();
      this.gainFund.gain.setValueAtTime(0.7, now);

      this.oscFund1.connect(this.gainFund);
      this.oscFund2.connect(this.gainFund);
      this.gainFund.connect(this.filter);

      // 4. Subtle Harmonic Overtone (116Hz Octave, dynamically opens with voice)
      this.oscHarmonic = this.audioCtx.createOscillator();
      this.oscHarmonic.type = 'sine';
      this.oscHarmonic.frequency.setValueAtTime(116, now);

      this.gainHarmonic = this.audioCtx.createGain();
      this.gainHarmonic.gain.setValueAtTime(0.12, now);

      this.oscHarmonic.connect(this.gainHarmonic);
      this.gainHarmonic.connect(this.filter);

      // 5. Subtle Thinking LFO (Generates gentle cognitive phasing when model is thinking)
      this.lfo = this.audioCtx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(0.28, now); // ~3.5s slow phasing cycle

      this.lfoGain = this.audioCtx.createGain();
      this.lfoGain.gain.setValueAtTime(0, now); // 0 when idle

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.oscFund1.frequency);

      // Start all sound generators
      this.oscFund1.start(now);
      this.oscFund2.start(now);
      this.oscHarmonic.start(now);
      this.lfo.start(now);

      this.isRunning = true;
    } catch (err) {
      console.warn('Atmospheric hum start failed:', err);
    }
  }

  public updateVoiceIntensity(intensity: number, thinking = false) {
    if (!this.isRunning || !this.audioCtx || this.isMuted) return;

    // Smooth clamping between 0 and 1
    const clamped = Math.max(0, Math.min(intensity, 1));
    this.currentIntensity = clamped;
    this.isThinking = thinking;

    const now = this.audioCtx.currentTime;

    // 1. Dynamic Lowpass Filter cutoff reacting to voice intensity:
    // Base 125Hz rises up to 340Hz as vocal intensity peaks
    if (this.filter) {
      const targetFreq = 125 + clamped * 215 + (thinking ? 45 : 0);
      this.filter.frequency.setTargetAtTime(targetFreq, now, 0.08);

      const targetQ = 2.0 + clamped * 1.5 + (thinking ? 1.0 : 0);
      this.filter.Q.setTargetAtTime(targetQ, now, 0.08);
    }

    // 2. Harmonic overtone presence responds to voice dynamics
    if (this.gainHarmonic) {
      const targetHarmonic = 0.12 + clamped * 0.35 + (thinking ? 0.08 : 0);
      this.gainHarmonic.gain.setTargetAtTime(targetHarmonic, now, 0.08);
    }

    // 3. Subtle Master Gain swelling with voice
    if (this.masterGain && !this.isMuted) {
      const targetGain = 0.045 + clamped * 0.035 + (thinking ? 0.015 : 0);
      this.masterGain.gain.setTargetAtTime(targetGain, now, 0.1);
    }

    // 4. LFO modulation depth activates when thinking
    if (this.lfoGain) {
      const targetLfoDepth = thinking ? 3.5 : 0.4;
      this.lfoGain.gain.setTargetAtTime(targetLfoDepth, now, 0.2);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.25);
        setTimeout(() => {
          if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close();
            this.audioCtx = null;
          }
        }, 300);
      } catch (_) {
        this.audioCtx = null;
      }
    } else if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (_) {}
      this.audioCtx = null;
    }
  }
}

export const atmosphericHum = new AtmosphericHumEngine();
