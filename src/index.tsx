/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality, Session} from "./genaiProxy";
import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData, resampleTo16k} from './utils';
import { ownerMemory } from './ownerMemory';
import type { OwnerProfile } from './ownerMemory';
import './visual';
import './visual-3d';
import './waveform';
import { musicEngine } from './musicEngine';
import { atmosphericHum } from './ambientHum';
import { getWeatherTheme } from './weatherColors';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';
  @state() isThinking = false;
  @state() isAudioActive = false;
  @state() showThinkingPanel = false;
  @state() showMemoryModal = false;
  @state() showMemoryDriveModal = false;
  @state() activeModalTab: 'behaviors' | 'memories' | 'drive' | 'telemetry' = 'drive';
  @state() activeDriveTab: 'chat' | 'archives' | 'storage' = 'chat';

  @state() profile: OwnerProfile = ownerMemory.getProfile();
  @state() newMemoryText = '';
  @state() newBehaviorText = '';
  @state() newTitleText = '';
  @state() newSectorText = '';
  @state() newArchiveTitle = '';
  @state() driveSearchQuery = '';
  @state() quickChatText = '';
  @state() isSendingText = false;
  @state() driveToastMessage = '';
  @state() batteryLevel: number | null = null;
  @state() isBatteryCharging = false;
  @state() weatherData: {
    condition: string;
    icon: string;
    temp: number;
    humidity?: number;
    wind?: number;
    city?: string;
  } | null = null;
  @state() weatherLoading = false;
  @state() geoPermissionStatus: 'idle' | 'prompt' | 'granted' | 'denied' = 'idle';
  @state() isHumActive = !atmosphericHum.isMutedState();
  private driveToastTimeout?: any;

  private client!: GoogleGenAI;
  private session!: Session;
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream | null = null;
  private sourceNode: AudioNode | null = null;
  private scriptProcessorNode: ScriptProcessorNode | null = null;
  private muteGainNode: GainNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private unsubscribeMemory?: () => void;

  // Speech transcript accumulation buffers to prevent fragmented messages
  private pendingUserSpeech = '';
  private pendingModelSpeech = '';
  private userCommitTimer: any = null;
  private modelCommitTimer: any = null;

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      position: relative;
      background-color: #020617;
      overflow: hidden;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #93c5fd;
    }

    /* Top HUD Navigation Bar */
    .header-bar {
      position: absolute;
      top: 1.25rem;
      left: 1.5rem;
      right: 1.5rem;
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: space-between;
      pointer-events: none;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      pointer-events: auto;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 1.1rem;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 9999px;
      backdrop-filter: blur(14px);
      box-shadow: 0 4px 24px rgba(2, 6, 23, 0.7), 0 0 15px rgba(37, 99, 235, 0.25);
    }

    .arc-reactor-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 12px #38bdf8, 0 0 20px #0284c7;
      position: relative;
    }

    .arc-reactor-dot::after {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 1px solid rgba(56, 189, 248, 0.6);
      animation: arc-pulse 2s infinite ease-out;
    }

    .arc-reactor-dot.active {
      background: #60a5fa;
      box-shadow: 0 0 16px #60a5fa, 0 0 25px #3b82f6;
    }

    @keyframes arc-pulse {
      0% { transform: scale(0.9); opacity: 0.9; }
      100% { transform: scale(1.8); opacity: 0; }
    }

    .brand-title {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      background: linear-gradient(135deg, #ffffff 0%, #93c5fd 60%, #38bdf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-subtitle {
      font-size: 0.72rem;
      color: #60a5fa;
      letter-spacing: 0.05em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      align-items: center;
    }

    .battery-pill {
      font-size: 0.68rem;
      color: #34d399;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(52, 211, 153, 0.35);
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
      margin-left: 0.4rem;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .weather-overlay-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.8rem;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 9999px;
      backdrop-filter: blur(14px);
      box-shadow: 0 4px 18px rgba(2, 6, 23, 0.6), 0 0 14px rgba(14, 165, 233, 0.22);
      color: #e0f2fe;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      pointer-events: auto;
      transition: all 0.2s ease;
      white-space: nowrap;
      user-select: none;
    }

    .weather-overlay-badge:hover {
      background: rgba(14, 116, 144, 0.35);
      border-color: #38bdf8;
      box-shadow: 0 0 18px rgba(56, 189, 248, 0.45);
      transform: translateY(-1px);
    }

    .weather-overlay-badge.loading {
      animation: weather-pulse 1.4s infinite ease-in-out;
      border-color: rgba(96, 165, 250, 0.6);
    }

    @keyframes weather-pulse {
      0%, 100% { opacity: 0.75; transform: scale(0.98); }
      50% { opacity: 1; transform: scale(1.02); }
    }

    .weather-overlay-icon {
      font-size: 1rem;
      line-height: 1;
      filter: drop-shadow(0 0 5px rgba(56, 189, 248, 0.5));
    }

    .weather-overlay-temp {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #38bdf8;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .weather-overlay-cond {
      color: #93c5fd;
      font-size: 0.72rem;
      font-weight: 500;
    }

    .weather-overlay-city {
      color: #64748b;
      font-size: 0.7rem;
      font-weight: 400;
    }

    .weather-pill {
      font-size: 0.68rem;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.35);
      padding: 0.05rem 0.45rem;
      border-radius: 999px;
      margin-left: 0.4rem;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .weather-pill.sync-btn {
      cursor: pointer;
      color: #93c5fd;
      border-color: rgba(96, 165, 250, 0.35);
      background: rgba(30, 58, 138, 0.3);
      font-family: inherit;
    }

    .weather-pill.sync-btn:hover {
      color: #ffffff;
      border-color: #38bdf8;
      background: rgba(14, 165, 233, 0.35);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
    }

    .hud-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      pointer-events: auto;
    }

    .hud-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.9rem;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 9999px;
      color: #93c5fd;
      font-size: 0.78rem;
      font-weight: 500;
      letter-spacing: 0.04em;
      cursor: pointer;
      backdrop-filter: blur(14px);
      transition: all 0.2s ease;
      box-shadow: 0 4px 18px rgba(2, 6, 23, 0.6);
    }

    .hud-btn:hover {
      background: rgba(30, 58, 138, 0.6);
      border-color: rgba(96, 165, 250, 0.6);
      color: #ffffff;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
      transform: translateY(-1px);
    }

    .hud-btn.active {
      background: rgba(30, 58, 138, 0.9);
      border-color: #38bdf8;
      color: #ffffff;
      box-shadow: 0 0 25px rgba(56, 189, 248, 0.5);
    }

    .hud-btn.drive-btn {
      border-color: rgba(56, 189, 248, 0.5);
      background: rgba(12, 30, 65, 0.88);
    }

    .hud-btn.drive-btn:hover {
      background: rgba(14, 116, 144, 0.45);
      border-color: #38bdf8;
    }

    .hud-btn.hum-btn {
      border-color: rgba(99, 102, 241, 0.4);
      background: rgba(15, 23, 42, 0.85);
    }

    .hud-btn.hum-btn.active {
      border-color: rgba(129, 140, 248, 0.8);
      background: rgba(49, 46, 129, 0.65);
      color: #e0e7ff;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.45);
    }

    .counter-pill {
      background: rgba(37, 99, 235, 0.4);
      border: 1px solid rgba(96, 165, 250, 0.5);
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 700;
      color: #e0f2fe;
    }

    .counter-pill.drive {
      background: rgba(14, 165, 233, 0.35);
      border-color: rgba(56, 189, 248, 0.6);
      color: #38bdf8;
    }

    .counter-pill.active-pill {
      background: rgba(99, 102, 241, 0.45);
      border-color: rgba(165, 180, 252, 0.7);
      color: #e0e7ff;
    }

    /* Drive Notification Toast */
    .drive-toast {
      position: absolute;
      top: 5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 45;
      background: rgba(10, 25, 55, 0.92);
      border: 1px solid rgba(56, 189, 248, 0.5);
      border-radius: 9999px;
      padding: 0.45rem 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #38bdf8;
      backdrop-filter: blur(16px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.3);
      animation: toast-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }

    @keyframes toast-in {
      from { transform: translate(-50%, -15px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }

    .toast-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
      animation: pulse 1s infinite alternate;
    }

    /* Main Orb Container & Audio-Reactive CSS Animation */
    .main-orb-container {
      position: absolute;
      inset: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 0;
      transition: filter 0.3s ease-out, transform 0.3s ease-out;
    }

    /* Ambient base aura for the orb container */
    .main-orb-container::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0.92);
      background: var(--orb-idle-radial-bg, radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(37, 99, 235, 0.12) 42%, rgba(2, 6, 23, 0) 72%));
      filter: blur(45px);
      pointer-events: none;
      animation: orb-container-idle 3.5s infinite ease-in-out;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Outer pulsating energy ring in response to audio activity */
    .main-orb-container::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 440px;
      height: 440px;
      border-radius: 50%;
      border: 1.5px solid transparent;
      transform: translate(-50%, -50%) scale(0.85);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease, border-color 0.4s ease, box-shadow 0.4s ease;
    }

    /* Live Audio API Active Response Pulsing & Glowing Animation */
    .main-orb-container.active-audio::before {
      background: var(--orb-radial-bg, radial-gradient(circle, rgba(56, 189, 248, 0.6) 0%, rgba(14, 165, 233, 0.42) 35%, rgba(37, 99, 235, 0.22) 58%, rgba(2, 6, 23, 0) 75%));
      animation: orb-container-audio-pulse 1.15s infinite ease-in-out;
    }

    .main-orb-container.active-audio::after {
      border-color: var(--orb-ring-border, rgba(56, 189, 248, 0.65));
      box-shadow: 0 0 35px var(--orb-glow-shadow, rgba(56, 189, 248, 0.55)), inset 0 0 30px var(--orb-glow-shadow, rgba(56, 189, 248, 0.35));
      animation: orb-container-ring-pulse 1.15s infinite ease-in-out;
      opacity: 1;
    }

    .main-orb-container.active-audio gdm-live-audio-visuals {
      animation: orb-audio-glow-surge 1.15s infinite ease-in-out;
    }

    /* Thinking State Pulsing Animation */
    .main-orb-container.thinking::before {
      background: radial-gradient(circle, rgba(168, 85, 247, 0.48) 0%, rgba(99, 102, 241, 0.32) 36%, rgba(56, 189, 248, 0.16) 58%, rgba(2, 6, 23, 0) 75%);
      filter: blur(40px);
      animation: orb-container-thinking-pulse 1.6s infinite ease-in-out;
    }

    @keyframes orb-container-idle {
      0%, 100% {
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 0.65;
        filter: blur(42px);
      }
      50% {
        transform: translate(-50%, -50%) scale(1.06);
        opacity: 0.9;
        filter: blur(50px);
      }
    }

    @keyframes orb-container-audio-pulse {
      0% {
        transform: translate(-50%, -50%) scale(0.96);
        opacity: 0.82;
        filter: blur(30px) drop-shadow(0 0 25px rgba(56, 189, 248, 0.7));
      }
      50% {
        transform: translate(-50%, -50%) scale(1.38);
        opacity: 1;
        filter: blur(48px) drop-shadow(0 0 80px rgba(56, 189, 248, 1)) drop-shadow(0 0 120px rgba(14, 165, 233, 0.7));
      }
      100% {
        transform: translate(-50%, -50%) scale(0.96);
        opacity: 0.82;
        filter: blur(30px) drop-shadow(0 0 25px rgba(56, 189, 248, 0.7));
      }
    }

    @keyframes orb-container-ring-pulse {
      0% {
        transform: translate(-50%, -50%) scale(0.85);
        opacity: 0.9;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.28);
        opacity: 0.4;
      }
      100% {
        transform: translate(-50%, -50%) scale(0.85);
        opacity: 0.9;
      }
    }

    @keyframes orb-container-thinking-pulse {
      0%, 100% {
        transform: translate(-50%, -50%) scale(0.94);
        opacity: 0.75;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.24);
        opacity: 1;
        filter: blur(48px) drop-shadow(0 0 55px rgba(168, 85, 247, 0.9));
      }
    }

    @keyframes orb-audio-glow-surge {
      0%, 100% {
        filter: drop-shadow(0 0 18px rgba(56, 189, 248, 0.4));
        transform: scale(1);
      }
      50% {
        filter: drop-shadow(0 0 55px rgba(56, 189, 248, 0.95)) drop-shadow(0 0 90px rgba(14, 165, 233, 0.65));
        transform: scale(1.045);
      }
    }

    /* Bottom Status & Controls */
    #status {
      position: absolute;
      bottom: 4vh;
      left: 0;
      right: 0;
      z-index: 25;
      text-align: center;
      font-size: 0.84rem;
      letter-spacing: 0.04em;
      color: #93c5fd;
      text-shadow: 0 0 14px rgba(59, 130, 246, 0.6);
      pointer-events: none;
      padding: 0 1rem;
    }

    .controls {
      z-index: 25;
      position: absolute;
      bottom: 9vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: row;
      gap: 18px;
    }

    .action-btn {
      outline: none;
      border: 1px solid rgba(59, 130, 246, 0.35);
      color: #93c5fd;
      border-radius: 9999px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(14px);
      box-shadow: 0 8px 32px rgba(2, 6, 23, 0.8), 0 0 20px rgba(37, 99, 235, 0.25);
      width: 64px;
      height: 64px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .action-btn:hover {
      background: rgba(30, 58, 138, 0.65);
      border-color: rgba(96, 165, 250, 0.65);
      box-shadow: 0 8px 32px rgba(2, 6, 23, 0.9), 0 0 30px rgba(59, 130, 246, 0.5);
      transform: translateY(-2px) scale(1.04);
    }

    .action-btn:active {
      transform: translateY(1px) scale(0.96);
    }

    button#startButton {
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.92), rgba(15, 23, 42, 0.96));
      border-color: rgba(96, 165, 250, 0.55);
      box-shadow: 0 8px 32px rgba(2, 6, 23, 0.8), 0 0 25px rgba(59, 130, 246, 0.4);
    }

    button#startButton:hover {
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(29, 78, 216, 0.9));
      border-color: #93c5fd;
      box-shadow: 0 10px 36px rgba(2, 6, 23, 0.9), 0 0 35px rgba(59, 130, 246, 0.65);
    }

    button#stopButton {
      background: linear-gradient(135deg, rgba(23, 37, 84, 0.92), rgba(15, 23, 42, 0.96));
      border-color: rgba(147, 197, 253, 0.5);
      box-shadow: 0 8px 32px rgba(2, 6, 23, 0.8), 0 0 25px rgba(96, 165, 250, 0.35);
    }

    button#stopButton:hover {
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.95), rgba(15, 23, 42, 0.95));
      border-color: #60a5fa;
    }

    button[disabled] {
      display: none;
    }

    /* Self-Thinking Matrix Drawer */
    .thinking-drawer {
      position: absolute;
      top: 5rem;
      right: 1.5rem;
      width: 420px;
      max-width: calc(100vw - 3rem);
      max-height: calc(100vh - 12rem);
      background: rgba(8, 18, 38, 0.92);
      border: 1px solid rgba(59, 130, 246, 0.4);
      border-radius: 16px;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(37, 99, 235, 0.25);
      z-index: 40;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slide-in {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .drawer-header {
      padding: 0.9rem 1.1rem;
      border-bottom: 1px solid rgba(59, 130, 246, 0.25);
      background: rgba(15, 23, 42, 0.7);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .drawer-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .drawer-title {
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #e0f2fe;
    }

    .pulse-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 10px #38bdf8;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    .close-icon-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .close-icon-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }

    .drawer-actions {
      padding: 0.6rem 1.1rem;
      background: rgba(10, 25, 55, 0.5);
      border-bottom: 1px solid rgba(59, 130, 246, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .secondary-btn {
      background: rgba(30, 58, 138, 0.4);
      border: 1px solid rgba(96, 165, 250, 0.35);
      color: #93c5fd;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
    }

    .secondary-btn:hover {
      background: rgba(37, 99, 235, 0.6);
      color: #ffffff;
      border-color: #60a5fa;
    }

    .thought-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-height: 420px;
    }

    .thought-card {
      padding: 0.65rem 0.8rem;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-left: 3px solid #38bdf8;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      transition: background 0.15s;
    }

    .thought-card:hover {
      background: rgba(15, 23, 42, 0.9);
      border-color: rgba(96, 165, 250, 0.4);
    }

    .thought-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.68rem;
    }

    .tag-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 1px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .tag-perception { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
    .tag-memory_lookup { background: rgba(147, 51, 234, 0.25); color: #c084fc; }
    .tag-behavior_eval { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .tag-reasoning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .tag-synthesis { background: rgba(59, 130, 246, 0.25); color: #60a5fa; }

    .thought-time {
      color: #64748b;
      font-size: 0.65rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .thought-content {
      font-size: 0.78rem;
      line-height: 1.35;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      word-break: break-word;
    }

    /* Modal Backdrop & Common Window Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.78);
      backdrop-filter: blur(12px);
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fade-in 0.2s ease-out;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .memory-modal {
      width: 760px;
      max-width: 100%;
      height: 85vh;
      max-height: 820px;
      background: rgba(10, 22, 48, 0.95);
      border: 1px solid rgba(59, 130, 246, 0.45);
      border-radius: 20px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(37, 99, 235, 0.35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(59, 130, 246, 0.25);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.85);
    }

    .modal-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .modal-title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .modal-subtitle {
      font-size: 0.74rem;
      color: #60a5fa;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .tab-bar {
      display: flex;
      border-bottom: 1px solid rgba(59, 130, 246, 0.2);
      background: rgba(15, 23, 42, 0.6);
      padding: 0 1.5rem;
      gap: 0.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #94a3b8;
      padding: 0.75rem 0.9rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: #e2e8f0;
    }

    .tab-btn.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
      text-shadow: 0 0 8px rgba(56, 189, 248, 0.5);
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.2rem;
    }

    .form-row {
      display: flex;
      gap: 0.6rem;
    }

    .hud-input {
      flex: 1;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 8px;
      padding: 0.6rem 0.9rem;
      color: #f1f5f9;
      font-size: 0.82rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .hud-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }

    .hud-input::placeholder {
      color: #64748b;
    }

    .submit-btn {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border: 1px solid #60a5fa;
      color: #ffffff;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .submit-btn:hover {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.5);
    }

    .submit-btn.cyan {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      border-color: #38bdf8;
    }

    .submit-btn.cyan:hover {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.5);
    }

    /* Memory Drive Elements */
    .drive-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: rgba(15, 23, 42, 0.6);
      padding: 0.75rem 0.9rem;
      border-radius: 12px;
      border: 1px solid rgba(59, 130, 246, 0.25);
    }

    .drive-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #38bdf8;
    }

    .drive-sub-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .icon-action-btn {
      background: rgba(30, 58, 138, 0.35);
      border: 1px solid rgba(96, 165, 250, 0.3);
      color: #93c5fd;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      font-size: 0.72rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.2s;
    }

    .icon-action-btn:hover {
      background: rgba(37, 99, 235, 0.6);
      color: #ffffff;
      border-color: #60a5fa;
    }

    .icon-action-btn.danger {
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }

    .icon-action-btn.danger:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #ffffff;
    }

    /* Chat Messages Stream in Memory Drive */
    .chat-stream-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-right: 0.25rem;
      min-height: 250px;
    }

    .chat-bubble-card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 12px;
      padding: 0.8rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      position: relative;
      transition: all 0.2s;
    }

    .chat-bubble-card.user {
      border-left: 3px solid #3b82f6;
      background: rgba(15, 28, 56, 0.8);
    }

    .chat-bubble-card.jarvis {
      border-left: 3px solid #38bdf8;
      background: rgba(8, 25, 45, 0.8);
    }

    .chat-bubble-card.pinned {
      border-color: rgba(245, 158, 11, 0.5);
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.15);
    }

    .chat-bubble-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.72rem;
    }

    .chat-speaker-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .speaker-pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 1px 7px;
      border-radius: 4px;
      font-size: 0.68rem;
    }

    .speaker-pill.user {
      background: rgba(59, 130, 246, 0.25);
      color: #93c5fd;
      border: 1px solid rgba(96, 165, 250, 0.35);
    }

    .speaker-pill.jarvis {
      background: rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }

    .msg-meta-info {
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.68rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .msg-actions {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      opacity: 0.75;
      transition: opacity 0.2s;
    }

    .chat-bubble-card:hover .msg-actions {
      opacity: 1;
    }

    .msg-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 3px 5px;
      border-radius: 4px;
      font-size: 0.7rem;
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      transition: all 0.15s;
    }

    .msg-btn:hover {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
    }

    .msg-btn.danger:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
    }

    .chat-text {
      font-size: 0.86rem;
      line-height: 1.45;
      color: #f1f5f9;
      word-break: break-word;
    }

    .quick-chat-footer {
      border-top: 1px solid rgba(59, 130, 246, 0.25);
      padding-top: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    /* Archive Sessions List */
    .session-archive-card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      transition: all 0.2s;
    }

    .session-archive-card:hover {
      background: rgba(20, 35, 70, 0.75);
      border-color: rgba(56, 189, 248, 0.4);
    }

    .archive-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .archive-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #f8fafc;
    }

    .archive-meta {
      font-size: 0.7rem;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .archive-preview {
      background: rgba(8, 15, 30, 0.6);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-size: 0.78rem;
      color: #94a3b8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      line-height: 1.4;
      max-height: 80px;
      overflow-y: auto;
    }

    .archive-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    /* Items grid for Behaviors & Memories */
    .items-grid {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .item-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(59, 130, 246, 0.22);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      transition: all 0.2s;
    }

    .item-card:hover {
      background: rgba(30, 58, 138, 0.3);
      border-color: rgba(96, 165, 250, 0.4);
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .item-text {
      font-size: 0.82rem;
      color: #f1f5f9;
      line-height: 1.4;
    }

    .item-sub {
      font-size: 0.7rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .delete-btn {
      background: transparent;
      border: none;
      color: #ef4444;
      opacity: 0.6;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .delete-btn:hover {
      opacity: 1;
      background: rgba(239, 68, 68, 0.15);
    }

    /* Telemetry grid */
    .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.9rem;
    }

    .telemetry-tile {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 12px;
      padding: 0.9rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .tile-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .tile-value {
      font-size: 1.15rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Mobile & Tablet Responsiveness Protocols */
    @media (max-width: 768px) {
      .header-bar {
        top: 0.75rem;
        left: 0.75rem;
        right: 0.75rem;
        flex-direction: row;
        align-items: center;
      }

      .brand-badge {
        padding: 0.35rem 0.75rem;
        gap: 0.4rem;
      }

      .brand-title {
        font-size: 0.8rem;
        letter-spacing: 0.08em;
      }

      .meta-subtitle {
        font-size: 0.65rem;
      }

      .hud-actions {
        gap: 0.4rem;
      }

      .hud-btn {
        padding: 0.38rem 0.65rem;
        font-size: 0.72rem;
      }

      .controls {
        bottom: 7vh;
        gap: 14px;
      }

      .action-btn {
        width: 56px;
        height: 56px;
      }

      #status {
        bottom: 2.5vh;
        font-size: 0.76rem;
      }

      .thinking-drawer {
        top: 4.2rem;
        right: 0.5rem;
        left: 0.5rem;
        width: auto;
        max-width: none;
        max-height: 55vh;
      }

      .memory-modal {
        width: 100vw;
        height: 94vh;
        max-height: none;
        border-radius: 14px;
      }

      .modal-header {
        padding: 0.9rem 1rem;
      }

      .modal-body {
        padding: 0.9rem 1rem;
      }

      .telemetry-grid {
        grid-template-columns: 1fr;
        gap: 0.6rem;
      }

      .drive-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }

      .drive-sub-actions {
        justify-content: flex-start;
        flex-wrap: wrap;
      }
    }

    @media (max-width: 480px) {
      .header-bar {
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .brand-badge {
        padding: 0.3rem 0.6rem;
      }

      .brand-title {
        font-size: 0.75rem;
      }

      .meta-subtitle {
        display: none;
      }

      .hud-btn span:not(.counter-pill) {
        font-size: 0.7rem;
      }

      .drive-toast {
        top: 4rem;
        width: 90vw;
        font-size: 0.7rem;
        padding: 0.35rem 0.8rem;
      }

      .action-btn {
        width: 52px;
        height: 52px;
      }
    }
  `;

  constructor() {
    super();
    this.initClient();
  }

  connectedCallback() {
    super.connectedCallback();
    this.initBattery();
    this.initGeolocationAndWeather();
    this.unsubscribeMemory = ownerMemory.subscribe(() => {
      this.profile = { ...ownerMemory.getProfile() };
      this.requestUpdate();
    });

    const unlockHum = () => {
      atmosphericHum.start();
      window.removeEventListener('click', unlockHum);
      window.removeEventListener('touchstart', unlockHum);
      window.removeEventListener('keydown', unlockHum);
    };
    window.addEventListener('click', unlockHum, { once: true });
    window.addEventListener('touchstart', unlockHum, { once: true });
    window.addEventListener('keydown', unlockHum, { once: true });
  }

  private initBattery() {
    if ('navigator' in window && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const update = () => {
          this.batteryLevel = Math.round(battery.level * 100);
          this.isBatteryCharging = battery.charging;
        };
        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
      }).catch(() => {});
    }
  }

  private async initGeolocationAndWeather() {
    if (!('geolocation' in navigator)) {
      this.geoPermissionStatus = 'denied';
      return;
    }

    if ('permissions' in navigator && (navigator.permissions as any).query) {
      try {
        const status = await (navigator.permissions as any).query({ name: 'geolocation' });
        this.geoPermissionStatus = status.state;
        status.onchange = () => {
          this.geoPermissionStatus = status.state;
          if (status.state === 'granted') {
            this.fetchCoordinatesAndWeather();
          }
        };
        if (status.state === 'granted') {
          this.fetchCoordinatesAndWeather();
          return;
        }
      } catch (_) {}
    }

    // Attempt initial permission request
    this.fetchCoordinatesAndWeather();
  }

  private async fetchWeatherForCoords(lat: number, lon: number, fallbackCity = '') {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`
      );
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();
      const current = data.current;
      const code = current?.weather_code ?? 0;
      const { condition, icon } = this.mapWeatherCode(code);
      const temp = Math.round(current?.temperature_2m ?? 20);
      const humidity = current?.relative_humidity_2m;
      const wind = current?.wind_speed_10m;

      let city = fallbackCity;
      if (!city) {
        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            city = geoData.locality || geoData.city || geoData.principalSubdivision || '';
          }
        } catch (_) {}
      }

      this.weatherData = {
        condition,
        icon,
        temp,
        humidity,
        wind,
        city,
      };

      const envStr = `${icon} ${temp}°C, ${condition}${city ? ` in ${city}` : ''} (Humidity: ${humidity}%, Wind: ${wind} km/h)`;
      ownerMemory.setEnvironmentalContext(envStr);
      ownerMemory.addThought({
        id: 't-env-' + Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        category: 'perception',
        content: `[ATMOSPHERIC TELEMETRY] Environmental context updated: ${envStr}.`,
        source: 'cognitive_matrix',
      });
      this.triggerDriveToast(`Weather updated: ${icon} ${temp}°C ${condition}${city ? ` (${city})` : ''}`);
    } catch (err) {
      console.warn('Weather fetch error', err);
    } finally {
      this.weatherLoading = false;
      this.requestUpdate();
    }
  }

  private async fallbackIpWeather() {
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          await this.fetchWeatherForCoords(ipData.latitude, ipData.longitude, ipData.city || ipData.region);
          return;
        }
      }
    } catch (_) {}

    try {
      const bdcRes = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en');
      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        if (bdcData.latitude && bdcData.longitude) {
          await this.fetchWeatherForCoords(bdcData.latitude, bdcData.longitude, bdcData.locality || bdcData.city);
          return;
        }
      }
    } catch (_) {}

    await this.fetchWeatherForCoords(40.7128, -74.0060, 'Local Sector');
  }

  private fetchCoordinatesAndWeather() {
    this.weatherLoading = true;
    this.requestUpdate();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          this.geoPermissionStatus = 'granted';
          await this.fetchWeatherForCoords(pos.coords.latitude, pos.coords.longitude);
        },
        async (err) => {
          console.warn('Geolocation permission error, falling back to IP geo:', err);
          this.geoPermissionStatus = 'denied';
          await this.fallbackIpWeather();
        },
        { timeout: 8000, enableHighAccuracy: false }
      );
    } else {
      this.fallbackIpWeather();
    }
  }

  private mapWeatherCode(code: number): { condition: string; icon: string } {
    if (code === 0) return { condition: 'Clear Sky', icon: '☀️' };
    if (code === 1) return { condition: 'Mainly Clear', icon: '🌤️' };
    if (code === 2) return { condition: 'Partly Cloudy', icon: '⛅' };
    if (code === 3) return { condition: 'Overcast', icon: '☁️' };
    if (code === 45 || code === 48) return { condition: 'Foggy', icon: '🌫️' };
    if (code >= 51 && code <= 57) return { condition: 'Drizzle', icon: '🌧️' };
    if (code >= 61 && code <= 67) return { condition: 'Rain', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { condition: 'Snow', icon: '❄️' };
    if (code >= 80 && code <= 82) return { condition: 'Showers', icon: '🌦️' };
    if (code >= 85 && code <= 86) return { condition: 'Snow Showers', icon: '🌨️' };
    if (code >= 95) return { condition: 'Thunderstorm', icon: '⛈️' };
    return { condition: 'Fair', icon: '🌤️' };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribeMemory) {
      this.unsubscribeMemory();
    }
  }

  private triggerDriveToast(msg: string) {
    this.driveToastMessage = msg;
    clearTimeout(this.driveToastTimeout);
    this.driveToastTimeout = setTimeout(() => {
      this.driveToastMessage = '';
    }, 2800);
  }

  private checkMusicCommand(text: string) {
    const lower = text.toLowerCase();
    if (
      lower.includes('play music') ||
      lower.includes('play song') ||
      lower.includes('play beats') ||
      lower.includes('play ambient') ||
      lower.includes('play jazz') ||
      lower.includes('play rock') ||
      lower.includes('play chill') ||
      lower.includes('play stark')
    ) {
      if (lower.includes('jazz')) musicEngine.playMusic('jazz');
      else if (lower.includes('rock') || lower.includes('beats')) musicEngine.playMusic('rock');
      else if (lower.includes('chill') || lower.includes('relax')) musicEngine.playMusic('chill');
      else musicEngine.playMusic('ambient');
      this.triggerDriveToast('Music playback executed via voice command');
    } else if (
      lower.includes('stop music') ||
      lower.includes('stop playing') ||
      lower.includes('stop song')
    ) {
      musicEngine.stopMusic();
      this.triggerDriveToast('Music playback terminated');
    } else if (
      lower.includes('weather') ||
      lower.includes('forecast') ||
      lower.includes('climate') ||
      lower.includes('temperature outside')
    ) {
      this.fetchCoordinatesAndWeather();
    } else if (
      lower.includes('mute hum') ||
      lower.includes('stop hum') ||
      lower.includes('turn off hum') ||
      lower.includes('silence hum') ||
      lower.includes('drone off')
    ) {
      if (this.isHumActive) {
        this.handleToggleHum();
      }
    } else if (
      lower.includes('turn on hum') ||
      lower.includes('start hum') ||
      lower.includes('play hum') ||
      lower.includes('drone on') ||
      lower.includes('unmute hum') ||
      lower.includes('enable hum')
    ) {
      if (!this.isHumActive) {
        this.handleToggleHum();
      }
    }
  }

  private handleToggleHum() {
    const active = atmosphericHum.toggleMute();
    this.isHumActive = active;
    this.triggerDriveToast(`Atmospheric Sub-Bass Hum: ${active ? 'ACTIVE (58Hz Resonance)' : 'MUTED'}`);
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private async initClient() {
    this.initAudio();

    this.client = new GoogleGenAI({
      apiKey: "server-side",
    });

    this.outputNode.connect(this.outputAudioContext.destination);

    this.initSession();
  }

  private async initSession() {
    const model = 'gemini-3.8-live';

    try {
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus(`J.A.R.V.I.S. (Gemini 3) Online. Memory Drive mounted at ${this.profile.memoryDriveSector}.`);
            ownerMemory.recordSessionStart();
          },
          onmessage: async (rawMsg: any) => {
            const message = rawMsg instanceof LiveServerMessage ? rawMsg : LiveServerMessage.fromRaw(rawMsg);
            // Check for model internal self-thinking
            if (message.thought) {
              this.isThinking = true;
              atmosphericHum.updateVoiceIntensity(0, true);
              ownerMemory.addThought({
                id: 't-' + Math.random().toString(36).slice(2, 7),
                timestamp: new Date().toLocaleTimeString(),
                category: 'reasoning',
                content: message.thought,
                source: 'model',
              });
            }

            // User speech transcription handling: buffer and save to Memory Drive
            if (message.inputTranscript) {
              this.pendingUserSpeech = message.inputTranscript;
              this.checkMusicCommand(message.inputTranscript);
              ownerMemory.recordInteraction(message.inputTranscript);
              ownerMemory.triggerCognitiveCycle('analyzing', message.inputTranscript);

              // Auto-commit debounce to Memory Drive
              clearTimeout(this.userCommitTimer);
              this.userCommitTimer = setTimeout(() => {
                if (this.pendingUserSpeech.trim()) {
                  ownerMemory.recordChatMessage('user', this.pendingUserSpeech.trim(), { isVoice: true });
                  this.triggerDriveToast(`Saved voice input to ${this.profile.memoryDriveSector}`);
                  this.pendingUserSpeech = '';
                }
              }, 1200);
            }

            // Model speech output transcription handling
            if (message.outputTranscript) {
              // Flush pending user speech immediately when model starts speaking
              if (this.pendingUserSpeech.trim()) {
                clearTimeout(this.userCommitTimer);
                ownerMemory.recordChatMessage('user', this.pendingUserSpeech.trim(), { isVoice: true });
                this.pendingUserSpeech = '';
              }

              this.pendingModelSpeech += (this.pendingModelSpeech ? ' ' : '') + message.outputTranscript.trim();
              ownerMemory.recordInteraction(undefined, message.outputTranscript);

              clearTimeout(this.modelCommitTimer);
              this.modelCommitTimer = setTimeout(() => {
                if (this.pendingModelSpeech.trim()) {
                  ownerMemory.recordChatMessage('jarvis', this.pendingModelSpeech.trim(), { isVoice: true });
                  this.triggerDriveToast(`Saved vocal response to Memory Drive`);
                  this.pendingModelSpeech = '';
                }
              }, 1500);
            }

            // Process all model parts to ensure zero dropped audio chunks
            const parts = message.serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                this.isThinking = false;
                atmosphericHum.updateVoiceIntensity(0, false);
                ownerMemory.triggerCognitiveCycle('synthesizing', message.outputTranscript);

                // Synchronous decoding eliminates microtask race conditions
                const audioBuffer = decodeAudioData(
                  decode(part.inlineData.data),
                  this.outputAudioContext,
                  24000,
                  1,
                );

                // Precise gapless scheduling: start smoothly without artificial truncation
                const now = this.outputAudioContext.currentTime;
                if (this.nextStartTime < now) {
                  this.nextStartTime = now + 0.03;
                }

                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputNode);
                source.addEventListener('ended', () => {
                  this.sources.delete(source);
                  if (this.sources.size === 0) {
                    this.isAudioActive = false;
                  }
                });

                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
                this.isAudioActive = true;
              }
            }

            // Turn complete or interrupted
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                try { source.stop(); } catch (_) {}
              }
              this.sources.clear();
              this.isAudioActive = false;
              this.nextStartTime = this.outputAudioContext.currentTime;
            }

            if ((rawMsg?.serverContent?.turnComplete || message.serverContent?.turnComplete) && this.pendingModelSpeech.trim()) {
              clearTimeout(this.modelCommitTimer);
              ownerMemory.recordChatMessage('jarvis', this.pendingModelSpeech.trim(), { isVoice: true });
              this.triggerDriveToast(`Turn archived to ${this.profile.memoryDriveSector}`);
              this.pendingModelSpeech = '';
            }
          },
          onerror: (e: any) => {
            this.updateError(e?.message || String(e));
          },
          onclose: (_e: CloseEvent) => {
            this.updateStatus('J.A.R.V.I.S. Standby');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Fenrir'}},
          },
          systemInstruction: ownerMemory.getSystemInstruction(),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });
    } catch (e: any) {
      console.error(e);
      this.updateError(e?.message || 'Failed to initialize session');
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
  }

  private updateError(msg: string) {
    this.error = msg;
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.inputAudioContext.resume();
    this.outputAudioContext.resume();
    this.nextStartTime = this.outputAudioContext.currentTime;
    this.updateStatus(`J.A.R.V.I.S. listening to ${this.profile.title}...`);

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 1024;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.muteGainNode = this.inputAudioContext.createGain();
      this.muteGainNode.gain.value = 0;

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const rawPcm = inputBuffer.getChannelData(0);

        const pcm16k = resampleTo16k(rawPcm, this.inputAudioContext.sampleRate);

        let energy = 0;
        for (let i = 0; i < pcm16k.length; i++) {
          energy += pcm16k[i] * pcm16k[i];
        }
        const rms = Math.sqrt(energy / pcm16k.length);
        atmosphericHum.updateVoiceIntensity(Math.min(rms * 4.5, 1.0), this.isThinking);

        if (this.sources.size > 0) {
          if (rms < 0.035) {
            return;
          }
        }

        this.session?.sendRealtimeInput({audio: createBlob(pcm16k)});
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.muteGainNode);
      this.muteGainNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
      this.isThinking = true;
      atmosphericHum.start();
      atmosphericHum.updateVoiceIntensity(0, true);
      ownerMemory.triggerCognitiveCycle('listening');
      this.updateStatus(`Listening to ${this.profile.title}... Logging to Memory Drive`);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      this.updateStatus(`Microphone Error: ${err.message}`);
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Processing neural intake...');
    this.isRecording = false;
    atmosphericHum.updateVoiceIntensity(0, this.isThinking);

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      try { this.scriptProcessorNode.disconnect(); } catch (_) {}
      try { this.sourceNode.disconnect(); } catch (_) {}
    }

    if (this.muteGainNode) {
      try { this.muteGainNode.disconnect(); } catch (_) {}
      this.muteGainNode = null;
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Flush any pending user voice transcript
    if (this.pendingUserSpeech.trim()) {
      clearTimeout(this.userCommitTimer);
      ownerMemory.recordChatMessage('user', this.pendingUserSpeech.trim(), { isVoice: true });
      this.triggerDriveToast(`Saved voice input to ${this.profile.memoryDriveSector}`);
      this.pendingUserSpeech = '';
    }

    this.updateStatus(`Ready for ${this.profile.title}. Click mic or type in Memory Drive to converse.`);
  }

  private reset() {
    this.session?.close();
    this.initSession();
    this.updateStatus('J.A.R.V.I.S. Core Synchronized.');
  }

  private triggerManualReasoning() {
    ownerMemory.triggerCognitiveCycle('analyzing', 'Manual diagnostic requested');
  }

  private handleAddMemory(e: Event) {
    e.preventDefault();
    if (!this.newMemoryText.trim()) return;
    ownerMemory.addMemory(this.newMemoryText.trim(), 'personal');
    this.newMemoryText = '';
    this.triggerDriveToast('Memory node committed to long-term storage');
    this.requestUpdate();
  }

  private handleAddBehavior(e: Event) {
    e.preventDefault();
    if (!this.newBehaviorText.trim()) return;
    ownerMemory.addBehavior(this.newBehaviorText.trim(), 'preference');
    this.newBehaviorText = '';
    this.triggerDriveToast('Behavioral trait indexed');
    this.requestUpdate();
  }

  private handleSaveSalutation(e: Event) {
    e.preventDefault();
    if (!this.newTitleText.trim()) return;
    ownerMemory.updateOwnerTitle(this.newTitleText.trim());
    this.newTitleText = '';
    this.reset();
  }

  private handleSetSector(e: Event) {
    e.preventDefault();
    if (!this.newSectorText.trim()) return;
    ownerMemory.setDriveSector(this.newSectorText.trim());
    this.triggerDriveToast(`Mounted memory sector: ${this.newSectorText.toUpperCase()}`);
    this.newSectorText = '';
  }

  private async handleSendQuickChat(e?: Event) {
    if (e) e.preventDefault();
    const query = this.quickChatText.trim();
    if (!query || this.isSendingText) return;

    this.quickChatText = '';
    this.isSendingText = true;

    this.checkMusicCommand(query);

    // Immediately record to Memory Drive
    ownerMemory.recordChatMessage('user', query, { isVoice: false });
    this.triggerDriveToast(`Saved to ${this.profile.memoryDriveSector}`);
    this.updateStatus(`J.A.R.V.I.S. formulating response for ${this.profile.title}...`);

    try {
      if (this.session && (this.session as any).sendClientContent) {
        (this.session as any).sendClientContent({
          turns: [{ role: 'user', parts: [{ text: query }] }],
          turnComplete: true,
        });
      } else {
        const resp = await this.client.models.generateContent({
          model: 'gemini-3.8-live',
          contents: query,
          config: {
            systemInstruction: ownerMemory.getSystemInstruction(),
          },
        });
        const reply = resp.text || "Directive received and executed, Sir.";
        ownerMemory.recordChatMessage('jarvis', reply, { isVoice: false });
        this.triggerDriveToast(`Response archived to Memory Drive`);
      }
    } catch (err: any) {
      console.warn('Text chat fallback:', err);
      ownerMemory.recordChatMessage(
        'jarvis',
        `Sensory channel synched with ${this.profile.memoryDriveSector}, ${this.profile.title}. Operational parameters are steady.`,
        { isVoice: false }
      );
    } finally {
      this.isSendingText = false;
      this.updateStatus(`Ready for ${this.profile.title}.`);
      this.requestUpdate();
    }
  }

  private handleArchiveSession(e?: Event) {
    if (e) e.preventDefault();
    const title = this.newArchiveTitle.trim();
    const session = ownerMemory.saveCurrentSessionToDrive(title || undefined);
    this.newArchiveTitle = '';
    this.triggerDriveToast(`Archived volume: ${session.title}`);
  }

  private handleExportJson() {
    const jsonStr = ownerMemory.exportDriveAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JARVIS_Memory_Drive_${this.profile.memoryDriveSector}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.triggerDriveToast('Memory Drive JSON exported');
  }

  private handleExportText() {
    const textStr = ownerMemory.exportDriveAsText();
    const blob = new Blob([textStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JARVIS_Chat_History_Transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.triggerDriveToast('Stark Transcript exported');
  }

  private handleRestoreSession(id: string) {
    ownerMemory.restoreSavedSession(id);
    this.triggerDriveToast('Restored historical volume to active HUD');
    this.activeDriveTab = 'chat';
  }

  private handleDeleteSession(id: string) {
    ownerMemory.deleteSavedSession(id);
    this.triggerDriveToast('Archived volume removed');
  }

  private handleDeleteMessage(id: string) {
    ownerMemory.deleteChatMessage(id);
    this.triggerDriveToast('Message erased from active sector');
  }

  private handleTogglePin(id: string) {
    ownerMemory.togglePinMessage(id);
  }

  private handleCommitFact(id: string) {
    ownerMemory.addFactFromChat(id);
    this.triggerDriveToast('Extracted to core memory bank!');
  }

  private handleClearHistory() {
    if (confirm('Archive and reset the active chat log? Drive volumes will be preserved.')) {
      ownerMemory.clearChatHistory(true);
      this.triggerDriveToast('Active buffer purged & auto-archived');
    }
  }

  private handleToggleAutoSave() {
    const enabled = ownerMemory.toggleAutoSave();
    this.triggerDriveToast(`Drive continuous logging: ${enabled ? 'ENABLED' : 'PAUSED'}`);
  }

  private getOrbWeatherStyle(): string {
    const theme = getWeatherTheme(this.weatherData?.condition);
    return `--orb-idle-radial-bg: ${theme.radialGradient}; --orb-radial-bg: ${theme.radialGradient}; --orb-ring-border: ${theme.ringColor}; --orb-glow-shadow: ${theme.glowColor};`;
  }

  render() {
    const filteredHistory = this.driveSearchQuery.trim()
      ? this.profile.chatHistory.filter((m) =>
          m.text.toLowerCase().includes(this.driveSearchQuery.toLowerCase())
        )
      : this.profile.chatHistory;

    return html`
      <div>
        <!-- Top HUD Navigation -->
        <div class="header-bar">
          <div class="brand-section">
            <div class="brand-badge">
              <span class="arc-reactor-dot ${this.isRecording ? 'active' : ''}"></span>
              <span class="brand-title">J.A.R.V.I.S.</span>
            </div>

            <!-- Top-Left Geolocation Weather Overlay Widget -->
            <button
              class="weather-overlay-badge ${this.weatherLoading ? 'loading' : ''}"
              @click=${() => this.fetchCoordinatesAndWeather()}
              title="${this.weatherData
                ? `Local Weather: ${this.weatherData.condition}, ${this.weatherData.temp}°C, Humidity: ${this.weatherData.humidity || 'N/A'}%${this.weatherData.city ? ` in ${this.weatherData.city}` : ''} • Click to refresh`
                : 'Click to sync local weather'}">
              <span class="weather-overlay-icon">${this.weatherData ? this.weatherData.icon : (this.weatherLoading ? '🛰️' : '🌤️')}</span>
              <span class="weather-overlay-temp">${this.weatherData ? `${this.weatherData.temp}°C` : (this.weatherLoading ? 'Syncing...' : 'Sync Weather')}</span>
              ${this.weatherData?.condition ? html`<span class="weather-overlay-cond">${this.weatherData.condition}</span>` : ''}
              ${this.weatherData?.city ? html`<span class="weather-overlay-city">• ${this.weatherData.city}</span>` : ''}
            </button>

            <div class="brand-meta">
              <span class="meta-subtitle">
                <span>${this.isRecording ? 'STATUS: VOCAL STREAM ACTIVE' : (this.status || 'STATUS: ONLINE')}</span>
                ${this.batteryLevel !== null ? html`<span class="battery-pill">⚡ ${this.batteryLevel}%${this.isBatteryCharging ? ' 🔌' : ''}</span>` : ''}
              </span>
            </div>
          </div>

          <div class="hud-actions">
            <!-- Dedicated Memory Drive HUD Button -->
            <button
              class="hud-btn drive-btn ${this.showMemoryDriveModal ? 'active' : ''}"
              @click=${() => {
                this.showMemoryDriveModal = !this.showMemoryDriveModal;
                if (this.showMemoryDriveModal) this.showMemoryModal = false;
              }}
              title="Open Stark Neural Memory Drive">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
              <span>Memory Drive</span>
              <span class="counter-pill drive">${this.profile.chatHistory.length}</span>
            </button>

            <!-- Self-Thinking Button -->
            <button
              class="hud-btn ${this.showThinkingPanel ? 'active' : ''}"
              @click=${() => (this.showThinkingPanel = !this.showThinkingPanel)}
              title="Toggle Self-Thinking Matrix">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a6 6 0 0 0-6 6c0 2.22 1.21 4.16 3 5.2V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3.8c1.79-1.04 3-2.98 3-5.2a6 6 0 0 0-6-6z"/>
                <path d="M9 21h6"/>
              </svg>
              <span>Self-Thinking</span>
              <span class="counter-pill">${this.profile.recentThoughts.length}</span>
            </button>

            <!-- Owner Profile Button -->
            <button
              class="hud-btn ${this.showMemoryModal ? 'active' : ''}"
              @click=${() => {
                this.showMemoryModal = !this.showMemoryModal;
                if (this.showMemoryModal) this.showMemoryDriveModal = false;
              }}
              title="Open Owner Behavioral Memory Profile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Owner Memory</span>
              <span class="counter-pill">${this.profile.behaviors.length}</span>
            </button>

            <!-- Atmospheric Hum Loop Button -->
            <button
              class="hud-btn hum-btn ${this.isHumActive ? 'active' : ''}"
              @click=${() => this.handleToggleHum()}
              title="Toggle Atmospheric Sub-Bass Hum (58Hz Deep Resonance Loop)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                ${this.isHumActive
                  ? html`<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`
                  : html`<line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`}
              </svg>
              <span>${this.isHumActive ? 'Hum' : 'Hum Muted'}</span>
              <span class="counter-pill ${this.isHumActive ? 'active-pill' : ''}">58Hz</span>
            </button>
          </div>
        </div>

        <!-- Floating Drive Toast Notification -->
        ${this.driveToastMessage
          ? html`
              <div class="drive-toast">
                <span class="toast-dot"></span>
                <span>[MEMORY DRIVE] ${this.driveToastMessage}</span>
              </div>
            `
          : ''}

        <!-- Self-Thinking Matrix Floating Drawer -->
        ${this.showThinkingPanel
          ? html`
              <div class="thinking-drawer">
                <div class="drawer-header">
                  <div class="drawer-title-group">
                    <span class="pulse-indicator"></span>
                    <span class="drawer-title">J.A.R.V.I.S. Cognitive Matrix</span>
                  </div>
                  <button
                    class="close-icon-btn"
                    @click=${() => (this.showThinkingPanel = false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div class="drawer-actions">
                  <span style="font-size: 0.72rem; color: #64748b; font-family: monospace;">
                    NEURAL THOUGHT LOG (${this.profile.recentThoughts.length})
                  </span>
                  <button
                    class="secondary-btn"
                    @click=${this.triggerManualReasoning}
                    title="Simulate active deduction cycle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    <span>Run Deduction</span>
                  </button>
                </div>

                <div class="thought-list">
                  ${this.profile.recentThoughts.map(
                    (t) => html`
                      <div class="thought-card">
                        <div class="thought-meta">
                          <span class="tag-badge tag-${t.category}">
                            ${t.category.replace('_', ' ')}
                          </span>
                          <span class="thought-time">${t.timestamp}</span>
                        </div>
                        <div class="thought-content">${t.content}</div>
                      </div>
                    `
                  )}
                </div>
              </div>
            `
          : ''}

        <!-- Dedicated Memory Drive Modal Window -->
        ${this.showMemoryDriveModal
          ? html`
              <div class="modal-overlay" @click=${(e: Event) => {
                if (e.target === e.currentTarget) this.showMemoryDriveModal = false;
              }}>
                <div class="memory-modal">
                  <div class="modal-header">
                    <div class="modal-title-wrap">
                      <div class="modal-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
                          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                          <line x1="6" y1="6" x2="6.01" y2="6"></line>
                          <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <span>Stark Neural Memory Drive</span>
                      </div>
                      <span class="modal-subtitle">
                        SECTOR: ${this.profile.memoryDriveSector} • TOTAL NODES: ${this.profile.chatHistory.length} • AUTO-SAVE: ${this.profile.memoryDriveAutoSave ? 'ENABLED (PERSISTENT)' : 'MANUAL'}
                      </span>
                    </div>
                    <button
                      class="close-icon-btn"
                      @click=${() => (this.showMemoryDriveModal = false)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>

                  <!-- Tab Navigation for Memory Drive -->
                  <div class="tab-bar">
                    <button
                      class="tab-btn ${this.activeDriveTab === 'chat' ? 'active' : ''}"
                      @click=${() => (this.activeDriveTab = 'chat')}>
                      Active Chat History (${this.profile.chatHistory.length})
                    </button>
                    <button
                      class="tab-btn ${this.activeDriveTab === 'archives' ? 'active' : ''}"
                      @click=${() => (this.activeDriveTab = 'archives')}>
                      Drive Archives & Volumes (${this.profile.savedSessions.length})
                    </button>
                    <button
                      class="tab-btn ${this.activeDriveTab === 'storage' ? 'active' : ''}"
                      @click=${() => (this.activeDriveTab = 'storage')}>
                      Drive Diagnostics & Sectors
                    </button>
                  </div>

                  <div class="modal-body">
                    <!-- Tab 1: Active Chat History -->
                    ${this.activeDriveTab === 'chat'
                      ? html`
                          <div class="drive-toolbar">
                            <div class="drive-status-badge">
                              <span class="pulse-indicator"></span>
                              <span>SECTOR: <strong>${this.profile.memoryDriveSector}</strong></span>
                              <span>•</span>
                              <span>AUTO-SAVE: <strong>${this.profile.memoryDriveAutoSave ? 'ON' : 'OFF'}</strong></span>
                            </div>

                            <div class="drive-sub-actions">
                              <button
                                class="icon-action-btn"
                                @click=${() => this.handleArchiveSession()}
                                title="Commit and archive active conversation to permanent volume">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                  <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                <span>Save Session</span>
                              </button>

                              <button
                                class="icon-action-btn"
                                @click=${this.handleExportText}
                                title="Export chat history as formatted transcript text file">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                <span>Export TXT</span>
                              </button>

                              <button
                                class="icon-action-btn"
                                @click=${this.handleExportJson}
                                title="Export complete memory drive JSON backup">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="16 16 12 12 8 16"></polyline>
                                  <line x1="12" y1="12" x2="12" y2="21"></line>
                                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                                </svg>
                                <span>JSON</span>
                              </button>

                              <button
                                class="icon-action-btn danger"
                                @click=${this.handleClearHistory}
                                title="Archive and clear active buffer">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                <span>Clear</span>
                              </button>
                            </div>
                          </div>

                          <!-- Search Filter Input -->
                          <div class="form-row">
                            <input
                              class="hud-input"
                              type="text"
                              placeholder="Search transcripts in memory drive..."
                              .value=${this.driveSearchQuery}
                              @input=${(e: any) => (this.driveSearchQuery = e.target.value)} />
                            ${this.driveSearchQuery
                              ? html`
                                  <button
                                    class="secondary-btn"
                                    @click=${() => (this.driveSearchQuery = '')}>
                                    Clear Filter
                                  </button>
                                `
                              : ''}
                          </div>

                          <!-- Dialogue Stream -->
                          <div class="chat-stream-container">
                            ${filteredHistory.length === 0
                              ? html`
                                  <div style="text-align: center; padding: 2rem; color: #64748b; font-size: 0.82rem;">
                                    No dialogue nodes matched in active memory drive sector. Speak into the orb or enter a directive below.
                                  </div>
                                `
                              : filteredHistory.map(
                                  (m) => html`
                                    <div class="chat-bubble-card ${m.sender} ${m.pinned ? 'pinned' : ''}">
                                      <div class="chat-bubble-header">
                                        <div class="chat-speaker-wrap">
                                          <span class="speaker-pill ${m.sender}">
                                            ${m.sender === 'user' ? `OWNER: ${this.profile.title.toUpperCase()}` : 'J.A.R.V.I.S.'}
                                          </span>
                                          <span class="msg-meta-info">
                                            <span>${m.timeDisplay}</span>
                                            <span>•</span>
                                            <span>${m.isVoice ? '🎙️ VOICE' : '⌨️ TEXT'}</span>
                                            <span>•</span>
                                            <span>${m.sector || this.profile.memoryDriveSector}</span>
                                            ${m.savedToDrive
                                              ? html`<span style="color: #38bdf8;">• 💾 SAVED</span>`
                                              : ''}
                                          </span>
                                        </div>

                                        <div class="msg-actions">
                                          <button
                                            class="msg-btn"
                                            title="Commit dialogue into long-term remembered facts"
                                            @click=${() => this.handleCommitFact(m.id)}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                              <circle cx="12" cy="12" r="10"></circle>
                                              <line x1="12" y1="8" x2="12" y2="12"></line>
                                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            <span>+ Fact</span>
                                          </button>

                                          <button
                                            class="msg-btn ${m.pinned ? 'text-amber-400' : ''}"
                                            title="Pin message"
                                            @click=${() => this.handleTogglePin(m.id)}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                              <line x1="12" y1="17" x2="12" y2="22"></line>
                                              <path d="M5 17h14v-2l-2-2V7a5 5 0 0 0-10 0v6l-2 2v2z"></path>
                                            </svg>
                                          </button>

                                          <button
                                            class="msg-btn danger"
                                            title="Delete message"
                                            @click=${() => this.handleDeleteMessage(m.id)}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                              <line x1="18" y1="6" x2="6" y2="18"></line>
                                              <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                          </button>
                                        </div>
                                      </div>

                                      <div class="chat-text">${m.text}</div>
                                    </div>
                                  `
                                )}
                          </div>

                          <!-- Quick Chat Prompt Input Bar -->
                          <div class="quick-chat-footer">
                            <form class="form-row" @submit=${this.handleSendQuickChat}>
                              <input
                                class="hud-input"
                                type="text"
                                placeholder="Type directive to J.A.R.V.I.S. (auto-saved to memory drive)..."
                                .value=${this.quickChatText}
                                ?disabled=${this.isSendingText}
                                @input=${(e: any) => (this.quickChatText = e.target.value)} />
                              <button
                                type="submit"
                                class="submit-btn cyan"
                                ?disabled=${this.isSendingText || !this.quickChatText.trim()}>
                                ${this.isSendingText ? 'Processing...' : 'Send Directive'}
                              </button>
                            </form>
                          </div>
                        `
                      : ''}

                    <!-- Tab 2: Drive Archives & Volumes -->
                    ${this.activeDriveTab === 'archives'
                      ? html`
                          <div>
                            <form class="form-row" @submit=${this.handleArchiveSession}>
                              <input
                                class="hud-input"
                                type="text"
                                placeholder="Archive active chat history with title (e.g., Mark VII Flight Diagnostics)..."
                                .value=${this.newArchiveTitle}
                                @input=${(e: any) => (this.newArchiveTitle = e.target.value)} />
                              <button type="submit" class="submit-btn cyan">+ Archive Current Chat</button>
                            </form>
                          </div>

                          <div class="items-grid">
                            ${this.profile.savedSessions.length === 0
                              ? html`
                                  <div style="text-align: center; padding: 2rem; color: #64748b; font-size: 0.82rem;">
                                    No archived volumes yet. Click "+ Archive Current Chat" above to create permanent drive volumes.
                                  </div>
                                `
                              : this.profile.savedSessions.map(
                                  (s) => html`
                                    <div class="session-archive-card">
                                      <div class="archive-header">
                                        <span class="archive-title">${s.title}</span>
                                        <span class="archive-meta">
                                          <span class="tag-badge tag-perception">${s.sector}</span>
                                          <span>•</span>
                                          <span>${s.messageCount} EXCHANGES</span>
                                          <span>•</span>
                                          <span>${new Date(s.createdAt).toLocaleDateString()}</span>
                                        </span>
                                      </div>

                                      <div class="archive-preview">
                                        ${s.messages.slice(0, 2).map(
                                          (msg) => html`
                                            <div>
                                              <strong style="color: #60a5fa;">${msg.sender === 'user' ? this.profile.title : 'J.A.R.V.I.S.'}:</strong>
                                              ${msg.text}
                                            </div>
                                          `
                                        )}
                                        ${s.messages.length > 2
                                          ? html`<div style="color: #475569; font-style: italic;">+ ${s.messages.length - 2} more exchanges...</div>`
                                          : ''}
                                      </div>

                                      <div class="archive-actions">
                                        <button
                                          class="secondary-btn"
                                          @click=${() => this.handleRestoreSession(s.id)}
                                          title="Load into active HUD chat stream">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="1 4 1 10 7 10"></polyline>
                                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                          </svg>
                                          <span>Mount to Active</span>
                                        </button>

                                        <button
                                          class="delete-btn"
                                          @click=${() => this.handleDeleteSession(s.id)}
                                          title="Delete volume">
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  `
                                )}
                          </div>
                        `
                      : ''}

                    <!-- Tab 3: Storage Diagnostics & Sector Config -->
                    ${this.activeDriveTab === 'storage'
                      ? html`
                          <div>
                            <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 0.4rem;">
                              Switch or create memory drive sector (partition):
                            </span>
                            <form class="form-row" @submit=${this.handleSetSector}>
                              <input
                                class="hud-input"
                                type="text"
                                placeholder="E.g., SECTOR-01-PRIME, SECTOR-08-FLIGHT, STARK-LAB..."
                                .value=${this.newSectorText}
                                @input=${(e: any) => (this.newSectorText = e.target.value)} />
                              <button type="submit" class="submit-btn cyan">Mount Sector</button>
                            </form>
                          </div>

                          <div class="telemetry-grid">
                            <div class="telemetry-tile">
                              <span class="tile-label">Current Active Sector</span>
                              <span class="tile-value">${this.profile.memoryDriveSector}</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Drive Status</span>
                              <span class="tile-value" style="color: #34d399;">ONLINE (NVMe Neural Core)</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Continuous Auto-Save</span>
                              <span class="tile-value" style="font-size: 0.95rem;">
                                ${this.profile.memoryDriveAutoSave ? 'ENABLED (PERSISTENT)' : 'MANUAL'}
                              </span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Active Transcripts</span>
                              <span class="tile-value">${this.profile.chatHistory.length}</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Archived Volumes</span>
                              <span class="tile-value">${this.profile.savedSessions.length}</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Last Drive Sync</span>
                              <span class="tile-value" style="font-size: 0.82rem;">
                                ${new Date(this.profile.lastDriveSync).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>

                          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem;">
                            <button class="submit-btn" @click=${this.handleToggleAutoSave}>
                              ${this.profile.memoryDriveAutoSave ? 'Pause Auto-Save' : 'Enable Auto-Save'}
                            </button>
                            <button class="submit-btn cyan" @click=${this.handleExportJson}>
                              Download Full JSON Drive
                            </button>
                            <button class="submit-btn cyan" @click=${this.handleExportText}>
                              Download Full Text Logs
                            </button>
                            <button class="icon-action-btn danger" style="padding: 0.6rem 1rem;" @click=${this.handleClearHistory}>
                              Purge Active Buffer
                            </button>
                          </div>
                        `
                      : ''}
                  </div>
                </div>
              </div>
            `
          : ''}

        <!-- Owner Behavioral Memory Modal -->
        ${this.showMemoryModal
          ? html`
              <div class="modal-overlay" @click=${(e: Event) => {
                if (e.target === e.currentTarget) this.showMemoryModal = false;
              }}>
                <div class="memory-modal">
                  <div class="modal-header">
                    <div class="modal-title-wrap">
                      <span class="modal-title">Owner Behavioral Profile</span>
                      <span class="modal-subtitle">
                        Stark Protocol // Salutation: "${this.profile.title}" • Cognitive Sync: ${this.profile.cognitiveSync}% • Sector: ${this.profile.memoryDriveSector}
                      </span>
                    </div>
                    <button
                      class="close-icon-btn"
                      @click=${() => (this.showMemoryModal = false)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>

                  <!-- Tab Navigation -->
                  <div class="tab-bar">
                    <button
                      class="tab-btn ${this.activeModalTab === 'drive' ? 'active' : ''}"
                      @click=${() => (this.activeModalTab = 'drive')}>
                      Memory Drive (${this.profile.chatHistory.length})
                    </button>
                    <button
                      class="tab-btn ${this.activeModalTab === 'behaviors' ? 'active' : ''}"
                      @click=${() => (this.activeModalTab = 'behaviors')}>
                      Observed Behaviors (${this.profile.behaviors.length})
                    </button>
                    <button
                      class="tab-btn ${this.activeModalTab === 'memories' ? 'active' : ''}"
                      @click=${() => (this.activeModalTab = 'memories')}>
                      Remembered Facts (${this.profile.memories.length})
                    </button>
                    <button
                      class="tab-btn ${this.activeModalTab === 'telemetry' ? 'active' : ''}"
                      @click=${() => (this.activeModalTab = 'telemetry')}>
                      Salutation & Telemetry
                    </button>
                  </div>

                  <!-- Tab Contents -->
                  <div class="modal-body">
                    ${this.activeModalTab === 'drive'
                      ? html`
                          <div class="drive-toolbar">
                            <span class="drive-status-badge">
                              <span class="pulse-indicator"></span>
                              <span>SECTOR: <strong>${this.profile.memoryDriveSector}</strong></span>
                              <span>•</span>
                              <span>AUTO-SAVE: <strong>${this.profile.memoryDriveAutoSave ? 'ACTIVE' : 'MANUAL'}</strong></span>
                            </span>
                            <div class="drive-sub-actions">
                              <button class="icon-action-btn" @click=${() => this.handleArchiveSession()}>
                                Save Session
                              </button>
                              <button class="icon-action-btn" @click=${this.handleExportText}>
                                Export TXT
                              </button>
                              <button class="icon-action-btn" @click=${this.handleExportJson}>
                                JSON
                              </button>
                            </div>
                          </div>

                          <div class="chat-stream-container" style="max-height: 380px;">
                            ${this.profile.chatHistory.map(
                              (m) => html`
                                <div class="chat-bubble-card ${m.sender}">
                                  <div class="chat-bubble-header">
                                    <span class="speaker-pill ${m.sender}">
                                      ${m.sender === 'user' ? `OWNER: ${this.profile.title}` : 'J.A.R.V.I.S.'}
                                    </span>
                                    <span class="msg-meta-info">
                                      <span>${m.timeDisplay}</span>
                                      <span>•</span>
                                      <span>${m.isVoice ? 'VOICE' : 'TEXT'}</span>
                                    </span>
                                  </div>
                                  <div class="chat-text">${m.text}</div>
                                </div>
                              `
                            )}
                          </div>

                          <form class="form-row" @submit=${this.handleSendQuickChat}>
                            <input
                              class="hud-input"
                              type="text"
                              placeholder="Type directive to J.A.R.V.I.S. (auto-saved to memory drive)..."
                              .value=${this.quickChatText}
                              @input=${(e: any) => (this.quickChatText = e.target.value)} />
                            <button type="submit" class="submit-btn cyan">Send</button>
                          </form>
                        `
                      : ''}

                    ${this.activeModalTab === 'behaviors'
                      ? html`
                          <div>
                            <form class="form-row" @submit=${this.handleAddBehavior}>
                              <input
                                class="hud-input"
                                type="text"
                                placeholder="Add observed behavior trait (e.g., Prefers direct technical updates)..."
                                .value=${this.newBehaviorText}
                                @input=${(e: any) => (this.newBehaviorText = e.target.value)} />
                              <button type="submit" class="submit-btn">+ Add Trait</button>
                            </form>
                          </div>

                          <div class="items-grid">
                            ${this.profile.behaviors.map(
                              (b) => html`
                                <div class="item-card">
                                  <div class="item-info">
                                    <span class="item-text">${b.observation}</span>
                                    <span class="item-sub">
                                      <span>CATEGORY: ${b.category.toUpperCase()}</span>
                                      <span>•</span>
                                      <span>CONFIDENCE: ${Math.round(b.confidence * 100)}%</span>
                                    </span>
                                  </div>
                                  <button
                                    class="delete-btn"
                                    title="Forget behavior"
                                    @click=${() => ownerMemory.removeBehavior(b.id)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              `
                            )}
                          </div>
                        `
                      : ''}

                    ${this.activeModalTab === 'memories'
                      ? html`
                          <div>
                            <form class="form-row" @submit=${this.handleAddMemory}>
                              <input
                                class="hud-input"
                                type="text"
                                placeholder="Tell J.A.R.V.I.S. to remember something (e.g., Working on Mark VII armor)..."
                                .value=${this.newMemoryText}
                                @input=${(e: any) => (this.newMemoryText = e.target.value)} />
                              <button type="submit" class="submit-btn">+ Remember Fact</button>
                            </form>
                          </div>

                          <div class="items-grid">
                            ${this.profile.memories.map(
                              (m) => html`
                                <div class="item-card">
                                  <div class="item-info">
                                    <span class="item-text">${m.fact}</span>
                                    <span class="item-sub">
                                      <span>CATEGORY: ${m.category.toUpperCase()}</span>
                                      <span>•</span>
                                      <span>LOGGED: ${new Date(m.addedAt).toLocaleDateString()}</span>
                                    </span>
                                  </div>
                                  <button
                                    class="delete-btn"
                                    title="Erase memory node"
                                    @click=${() => ownerMemory.removeMemory(m.id)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                              `
                            )}
                          </div>
                        `
                      : ''}

                    ${this.activeModalTab === 'telemetry'
                      ? html`
                          <div>
                            <span style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 0.4rem;">
                              Change how J.A.R.V.I.S. addresses you:
                            </span>
                            <form class="form-row" @submit=${this.handleSaveSalutation}>
                              <input
                                class="hud-input"
                                type="text"
                                placeholder="E.g., Sir, Boss, Tony..."
                                .value=${this.newTitleText}
                                @input=${(e: any) => (this.newTitleText = e.target.value)} />
                              <button type="submit" class="submit-btn">Update Salutation</button>
                            </form>
                          </div>

                          <div class="telemetry-grid">
                            <div class="telemetry-tile">
                              <span class="tile-label">Current Salutation</span>
                              <span class="tile-value">${this.profile.title}</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Memory Sector</span>
                              <span class="tile-value">${this.profile.memoryDriveSector}</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Cognitive Sync Rate</span>
                              <span class="tile-value">${this.profile.cognitiveSync}%</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Saved Chat Transcripts</span>
                              <span class="tile-value">${this.profile.chatHistory.length}</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Total Interactions</span>
                              <span class="tile-value">${this.profile.totalInteractions}</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Session Count</span>
                              <span class="tile-value">${this.profile.sessionCount}</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">AI Engine Version</span>
                              <span class="tile-value" style="font-size: 0.85rem; color: #38bdf8;">Gemini 3 Live (gemini-3.8-live)</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Response Velocity</span>
                              <span class="tile-value" style="font-size: 0.95rem; color: #34d399;">~1-2s (Rapid Protocol)</span>
                            </div>
                            <div class="telemetry-tile">
                              <span class="tile-label">Atmospheric Telemetry (Weather)</span>
                              <span class="tile-value" style="font-size: 0.92rem; color: #38bdf8;">
                                ${this.weatherData
                                  ? `${this.weatherData.icon} ${this.weatherData.temp}°C • ${this.weatherData.condition}`
                                  : (this.weatherLoading ? '🛰️ Syncing...' : 'Standby (Sync Climate)')}
                              </span>
                            </div>
                          </div>
                        `
                      : ''}
                  </div>
                </div>
              </div>
            `
          : ''}

        <!-- Bottom Controls -->
        <div class="controls">
          <button
            id="resetButton"
            class="action-btn"
            title="Reset Session"
            aria-label="Reset Session"
            @click=${this.reset}
            ?disabled=${this.isRecording}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="28px"
              viewBox="0 -960 960 960"
              width="28px"
              fill="#93c5fd">
              <path
                d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>

          <button
            id="startButton"
            class="action-btn"
            title="Commence voice link with J.A.R.V.I.S."
            aria-label="Commence voice link"
            @click=${this.startRecording}
            ?disabled=${this.isRecording}>
            <svg
              viewBox="0 0 24 24"
              width="30px"
              height="30px"
              fill="#38bdf8"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>

          <button
            id="stopButton"
            class="action-btn"
            title="End voice transmission (saves to Memory Drive)"
            aria-label="End voice transmission"
            @click=${this.stopRecording}
            ?disabled=${!this.isRecording}>
            <svg
              viewBox="0 0 24 24"
              width="26px"
              height="26px"
              fill="#60a5fa"
              xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="5" width="14" height="14" rx="3" />
            </svg>
          </button>
        </div>

        <div id="status">${this.error || this.status}</div>

        <!-- Main Orb Container with Audio-Reactive CSS Animation & Weather-Themed Glow -->
        <div
          class="main-orb-container ${this.isRecording || this.isAudioActive || this.sources.size > 0 ? 'active-audio' : ''} ${this.isThinking ? 'thinking' : ''}"
          style="${this.getOrbWeatherStyle()}">
          <gdm-live-audio-visuals
            .inputNode=${this.inputNode}
            .outputNode=${this.outputNode}
            .isRecording=${this.isRecording}
            .isThinking=${this.isThinking}
            .weatherCondition=${this.weatherData?.condition || ''}></gdm-live-audio-visuals>
        </div>

        <!-- Canvas-based Waveform & Audio Frequency Visualizer -->
        <gdm-waveform-visualizer
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}
          .isRecording=${this.isRecording}
          .isThinking=${this.isThinking}></gdm-waveform-visualizer>
      </div>
    `;
  }
}
