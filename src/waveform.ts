import {LitElement, html, css} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import {Analyser} from './analyser';

@customElement('gdm-waveform-visualizer')
export class GdmWaveformVisualizer extends LitElement {
  @property({type: Boolean}) isRecording = false;
  @property({type: Boolean}) isThinking = false;
  @property({attribute: false}) inputNode: AudioNode | null = null;
  @property({attribute: false}) outputNode: AudioNode | null = null;

  @query('canvas') canvas!: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D | null = null;
  private inputAnalyser?: Analyser;
  private outputAnalyser?: Analyser;
  private animFrameId?: number;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      bottom: 16vh;
      left: 50%;
      transform: translateX(-50%);
      width: 580px;
      max-width: 90vw;
      height: 90px;
      z-index: 20;
      pointer-events: none;
    }

    .waveform-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: rgba(8, 18, 38, 0.65);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 14px;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(2, 6, 23, 0.7), 0 0 20px rgba(37, 99, 235, 0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .hud-header {
      padding: 4px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(56, 189, 248, 0.2);
      background: rgba(15, 23, 42, 0.6);
      font-size: 0.68rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #38bdf8;
      letter-spacing: 0.05em;
    }

    .hud-tag {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .hud-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
    }

    .hud-dot.active {
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
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
    this.ctx = this.canvas.getContext('2d');
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
  }

  private tick = () => {
    this.animFrameId = requestAnimationFrame(this.tick);
    this.draw();
  };

  private draw() {
    if (!this.ctx || !this.canvas) return;

    const width = (this.canvas.width = this.canvas.clientWidth);
    const height = (this.canvas.height = this.canvas.clientHeight);
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    const activeAnalyser =
      (this.isRecording ? this.inputAnalyser : this.outputAnalyser) ||
      this.inputAnalyser ||
      this.outputAnalyser;

    let freqData: Uint8Array = new Uint8Array(64);
    let timeData: Uint8Array = new Uint8Array(64);

    if (activeAnalyser) {
      activeAnalyser.update();
      freqData = activeAnalyser.data;
      timeData = activeAnalyser.timeDomainData;
    }

    // 1. Draw Frequency Spectrum Bar Chart
    const barCount = Math.min(freqData.length, 48);
    const barWidth = (width / barCount) * 0.65;
    const gap = (width / barCount) * 0.35;

    for (let i = 0; i < barCount; i++) {
      const value =
        freqData[i] ||
        (this.isRecording
          ? Math.random() * 18
          : this.isThinking
          ? Math.sin(Date.now() * 0.005 + i * 0.2) * 20 + 25
          : 4);
      const percent = Math.min(value / 255, 1);
      const barHeight = Math.max(percent * (height - 18), 3);

      const x = i * (barWidth + gap) + gap / 2;
      const y = height - barHeight - 2;

      const grad = ctx.createLinearGradient(0, height, 0, 0);
      if (this.isRecording) {
        grad.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.85)');
        grad.addColorStop(1, '#e0f2fe');
      } else if (this.isThinking) {
        grad.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
        grad.addColorStop(0.7, 'rgba(129, 140, 248, 0.85)');
        grad.addColorStop(1, '#ffffff');
      } else {
        grad.addColorStop(0, 'rgba(30, 58, 138, 0.15)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.45)');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth, barHeight);

      if (percent > 0.35) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.fillRect(x, y - 2, barWidth, 2);
        ctx.shadowBlur = 0;
      }
    }

    // 2. Draw Smooth Oscilloscope Waveform Trace
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.isRecording
      ? '#38bdf8'
      : this.isThinking
      ? '#a5b4fc'
      : 'rgba(56, 189, 248, 0.5)';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;

    const sliceWidth = width / (timeData.length || 1);
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] || 128) / 128.0;
      const y = (v * (height - 20)) / 2 + 10;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  render() {
    return html`
      <div class="waveform-container">
        <div class="hud-header">
          <div class="hud-tag">
            <span class="hud-dot ${this.isRecording ? 'active' : ''}"></span>
            <span>STARK FREQUENCY SPECTRUM (AUDIO IN/OUT)</span>
          </div>
          <div>
            <span>${this.isRecording ? '🎙️ VOICE INTAKE HIGH-RES' : this.isThinking ? '🧠 SYNTHESIZING' : 'IDLE 16kHz'}</span>
          </div>
        </div>
        <canvas></canvas>
      </div>
    `;
  }
}
