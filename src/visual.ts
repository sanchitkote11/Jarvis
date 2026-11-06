import {LitElement, html, css} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import {Visual3D} from './visual-3d';
import {Analyser} from './analyser';

@customElement('gdm-live-audio-visuals')
export class GdmLiveAudioVisuals extends LitElement {
  @property({type: Boolean}) isThinking = false;
  @property({type: Boolean}) isRecording = false;
  @property({attribute: false}) inputNode: AudioNode | null = null;
  @property({attribute: false}) outputNode: AudioNode | null = null;

  @state() audioVolume = 0;

  @query('canvas') canvas!: HTMLCanvasElement;

  private engine!: Visual3D;
  private inputAnalyser?: Analyser;
  private outputAnalyser?: Analyser;
  private animFrameId?: number;

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 0;
      pointer-events: none;
      --audio-volume: 0;
      --glow-scale: 1;
      --glow-color: rgba(56, 189, 248, 0.4);
      --core-color: rgba(14, 165, 233, 0.6);
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
      position: absolute;
      inset: 0;
      z-index: 2;
    }

    /* Ambient Pulsating Glow Center Wrapper */
    .glow-viewport-center {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 480px;
      height: 480px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1;
    }

    /* 1. Primary Pulsating Radial Aura */
    .orb-ambient-glow-core {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 380px;
      height: 380px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--glow-color) 0%, rgba(37, 99, 235, 0.25) 45%, rgba(2, 6, 23, 0) 75%);
      filter: blur(28px);
      transform: translate(-50%, -50%) scale(calc(var(--glow-scale) * 1.05));
      animation: orb-pulse-breathe 2.4s infinite ease-in-out;
      transition: transform 0.08s ease-out, background 0.2s ease;
      opacity: calc(0.45 + var(--audio-volume) * 0.55);
    }

    /* 2. Concentric Pulsating Energy Waves */
    .orb-pulse-ring-1 {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      border: 1.5px solid rgba(56, 189, 248, 0.6);
      box-shadow: 0 0 25px rgba(56, 189, 248, 0.5), inset 0 0 25px rgba(56, 189, 248, 0.3);
      transform: translate(-50%, -50%);
      animation: orb-ring-expand 3s infinite linear;
      opacity: calc(0.3 + var(--audio-volume) * 0.7);
    }

    .orb-pulse-ring-2 {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 320px;
      height: 320px;
      border-radius: 50%;
      border: 1px dashed rgba(96, 165, 250, 0.7);
      transform: translate(-50%, -50%);
      animation: orb-ring-expand 3s infinite linear 1.5s;
      opacity: calc(0.25 + var(--audio-volume) * 0.75);
    }

    /* 3. Dynamic Rotating Arc Halo */
    .orb-halo-rotate {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 420px;
      height: 420px;
      border-radius: 50%;
      border: 1px solid transparent;
      border-top-color: rgba(56, 189, 248, 0.75);
      border-bottom-color: rgba(99, 102, 241, 0.75);
      filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.6));
      transform: translate(-50%, -50%) scale(var(--glow-scale));
      animation: orb-halo-rotate 8s infinite linear;
      transition: transform 0.1s ease-out;
    }

    /* CSS Keyframe Animations */
    @keyframes orb-pulse-breathe {
      0% {
        transform: translate(-50%, -50%) scale(calc(var(--glow-scale) * 0.94));
        filter: blur(24px);
      }
      50% {
        transform: translate(-50%, -50%) scale(calc(var(--glow-scale) * 1.12));
        filter: blur(34px);
      }
      100% {
        transform: translate(-50%, -50%) scale(calc(var(--glow-scale) * 0.94));
        filter: blur(24px);
      }
    }

    @keyframes orb-ring-expand {
      0% {
        transform: translate(-50%, -50%) scale(0.75);
        opacity: 0.85;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.65);
        opacity: 0;
      }
    }

    @keyframes orb-halo-rotate {
      0% {
        transform: translate(-50%, -50%) rotate(0deg) scale(var(--glow-scale));
      }
      100% {
        transform: translate(-50%, -50%) rotate(360deg) scale(var(--glow-scale));
      }
    }
  `;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('inputNode') && this.inputNode) {
      this.inputAnalyser = new Analyser(this.inputNode, 128);
    }
    if (changedProperties.has('outputNode') && this.outputNode) {
      this.outputAnalyser = new Analyser(this.outputNode, 128);
    }
  }

  firstUpdated() {
    this.engine = new Visual3D(this.canvas);
    if (this.inputNode) {
      this.inputAnalyser = new Analyser(this.inputNode, 128);
    }
    if (this.outputNode) {
      this.outputAnalyser = new Analyser(this.outputNode, 128);
    }
    this.tick();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.engine) {
      this.engine.dispose();
    }
  }

  private tick = () => {
    this.animFrameId = requestAnimationFrame(this.tick);

    const activeAnalyser = (this.isRecording ? this.inputAnalyser : this.outputAnalyser) || this.inputAnalyser || this.outputAnalyser;

    let volume = 0;
    if (activeAnalyser) {
      activeAnalyser.update();
      const data = activeAnalyser.data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      volume = sum / (data.length * 255);
    }

    this.audioVolume = volume;

    // Reactively update CSS custom properties based on real-time audio volume
    const glowScale = 1 + (this.isRecording ? volume * 0.7 : (this.isThinking ? 0.15 : volume * 0.3));
    this.style.setProperty('--audio-volume', volume.toFixed(3));
    this.style.setProperty('--glow-scale', glowScale.toFixed(3));

    if (this.isRecording) {
      this.style.setProperty('--glow-color', 'rgba(56, 189, 248, 0.65)');
    } else if (this.isThinking) {
      this.style.setProperty('--glow-color', 'rgba(129, 140, 248, 0.65)');
    } else {
      this.style.setProperty('--glow-color', 'rgba(14, 165, 233, 0.35)');
    }

    if (this.engine) {
      if (activeAnalyser) {
        this.engine.setAnalyser(activeAnalyser);
      }
      this.engine.render(this.isRecording, this.isThinking);
    }
  };

  render() {
    return html`
      <!-- Dynamic Ambient Glow Rings reacting to audio volume -->
      <div class="glow-viewport-center">
        <div class="orb-ambient-glow-core"></div>
        <div class="orb-pulse-ring-1"></div>
        <div class="orb-pulse-ring-2"></div>
        <div class="orb-halo-rotate"></div>
      </div>

      <!-- 3D Canvas -->
      <canvas></canvas>
    `;
  }
}
