/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OwnerBehaviorItem {
  id: string;
  category: 'habit' | 'preference' | 'communication' | 'schedule' | 'trait';
  observation: string;
  timestamp: string;
  confidence: number;
}

export interface RememberedFact {
  id: string;
  fact: string;
  addedAt: string;
  category: 'personal' | 'work' | 'instruction' | 'general';
}

export interface ThoughtEntry {
  id: string;
  timestamp: string;
  category: 'perception' | 'memory_lookup' | 'behavior_eval' | 'reasoning' | 'synthesis';
  content: string;
  source: 'model' | 'cognitive_matrix';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  timestamp: string;
  timeDisplay: string;
  isVoice?: boolean;
  savedToDrive?: boolean;
  pinned?: boolean;
  sector?: string;
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  sector: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  messages: ChatMessage[];
  summary?: string;
}

export interface OwnerProfile {
  name: string;
  title: string;
  cognitiveSync: number;
  totalInteractions: number;
  sessionCount: number;
  lastActive: string;
  firstInitialized: string;
  emotionalBaseline: string;
  behaviors: OwnerBehaviorItem[];
  memories: RememberedFact[];
  recentThoughts: ThoughtEntry[];
  chatHistory: ChatMessage[];
  savedSessions: ChatSessionRecord[];
  memoryDriveSector: string;
  memoryDriveAutoSave: boolean;
  lastDriveSync: string;
}

const STORAGE_KEY = 'jarvis_owner_neural_profile_v1';
const DRIVE_STORAGE_KEY = 'jarvis_memory_drive_archive_v1';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    sender: 'user',
    text: 'Jarvis, initialize the 3D acoustic matrix and check core telemetry.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    timeDisplay: '17:30:12',
    isVoice: true,
    savedToDrive: true,
    pinned: true,
    sector: 'SECTOR-01-PRIME',
  },
  {
    id: 'msg-init-2',
    sender: 'jarvis',
    text: 'Acoustic orb online, Sir. Neural sync calibrated at 98.6% and all sub-systems reporting nominal.',
    timestamp: new Date(Date.now() - 3600000 * 2 + 2000).toISOString(),
    timeDisplay: '17:30:14',
    isVoice: true,
    savedToDrive: true,
    pinned: false,
    sector: 'SECTOR-01-PRIME',
  },
  {
    id: 'msg-init-3',
    sender: 'user',
    text: 'Keep all dialogue logged directly to the memory drive.',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    timeDisplay: '18:15:00',
    isVoice: true,
    savedToDrive: true,
    pinned: true,
    sector: 'SECTOR-01-PRIME',
  },
  {
    id: 'msg-init-4',
    sender: 'jarvis',
    text: 'Memory drive storage protocol engaged, Sir. Real-time indexing and archival active.',
    timestamp: new Date(Date.now() - 3600000 * 1 + 1800).toISOString(),
    timeDisplay: '18:15:02',
    isVoice: true,
    savedToDrive: true,
    pinned: false,
    sector: 'SECTOR-01-PRIME',
  },
];

const INITIAL_SAVED_SESSIONS: ChatSessionRecord[] = [
  {
    id: 'session-archive-01',
    title: 'Mark VII Neural Telemetry Calibration',
    sector: 'SECTOR-07-ARCHIVE',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1 + 600000).toISOString(),
    messageCount: 4,
    summary: 'Initial calibration of the 3D dark blue acoustic holographic orb and sub-2-second rapid voice protocol.',
    messages: [
      {
        id: 'arch-1',
        sender: 'user',
        text: 'Jarvis, how is the latency on the 24kHz audio pipeline?',
        timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
        timeDisplay: '23:14:05',
        isVoice: true,
        savedToDrive: true,
        sector: 'SECTOR-07-ARCHIVE',
      },
      {
        id: 'arch-2',
        sender: 'jarvis',
        text: 'Operating at sub-2-second velocity with zero buffer packet loss, Sir.',
        timestamp: new Date(Date.now() - 86400000 * 1 + 1500).toISOString(),
        timeDisplay: '23:14:07',
        isVoice: true,
        savedToDrive: true,
        sector: 'SECTOR-07-ARCHIVE',
      },
      {
        id: 'arch-3',
        sender: 'user',
        text: 'Excellent. Keep Stark nocturnal protocol active.',
        timestamp: new Date(Date.now() - 86400000 * 1 + 50000).toISOString(),
        timeDisplay: '23:14:55',
        isVoice: true,
        savedToDrive: true,
        sector: 'SECTOR-07-ARCHIVE',
      },
      {
        id: 'arch-4',
        sender: 'jarvis',
        text: 'Always at your service, Sir.',
        timestamp: new Date(Date.now() - 86400000 * 1 + 52000).toISOString(),
        timeDisplay: '23:14:57',
        isVoice: true,
        savedToDrive: true,
        sector: 'SECTOR-07-ARCHIVE',
      },
    ],
  },
];

const DEFAULT_PROFILE: OwnerProfile = {
  name: 'Sir',
  title: 'Sir',
  cognitiveSync: 98.6,
  totalInteractions: 22,
  sessionCount: 4,
  lastActive: new Date().toISOString(),
  firstInitialized: new Date(Date.now() - 86400000 * 7).toISOString(),
  emotionalBaseline: 'Analytical & Direct',
  behaviors: [
    {
      id: 'b-1',
      category: 'communication',
      observation: 'Favors concise, high-signal briefings with dry, intellectual wit',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      confidence: 0.96,
    },
    {
      id: 'b-2',
      category: 'schedule',
      observation: 'Frequent late-night engineering sessions (Stark nocturnal protocol)',
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      confidence: 0.94,
    },
    {
      id: 'b-3',
      category: 'habit',
      observation: 'Expects instantaneous readiness and proactive telemetry analysis',
      timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
      confidence: 0.98,
    },
    {
      id: 'b-4',
      category: 'preference',
      observation: 'Values visual acoustic feedback via 3D dark blue holographic orb',
      timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
      confidence: 0.92,
    },
  ],
  memories: [
    {
      id: 'm-1',
      fact: 'Owner prefers being addressed as "Sir" with calm British cadence',
      addedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      category: 'personal',
    },
    {
      id: 'm-2',
      fact: 'Priority directive: optimize real-time neural thinking matrix and audio fidelity',
      addedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      category: 'work',
    },
    {
      id: 'm-3',
      fact: 'Tone protocol: ultra-refined, fiercely loyal, subtly sarcastic when appropriate',
      addedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      category: 'instruction',
    },
    {
      id: 'm-4',
      fact: 'Memory Drive storage: all vocal and text transcripts automatically backed up to neural drive',
      addedAt: new Date(Date.now() - 3600000).toISOString(),
      category: 'instruction',
    },
  ],
  recentThoughts: [
    {
      id: 't-1',
      timestamp: new Date().toLocaleTimeString(),
      category: 'perception',
      content: 'Acoustic orb online. Memory drive volume mounted at SECTOR-01-PRIME.',
      source: 'cognitive_matrix',
    },
    {
      id: 't-2',
      timestamp: new Date().toLocaleTimeString(),
      category: 'memory_lookup',
      content: 'Neural memory banks synched: 4 behavioral traits, 4 core memory nodes loaded.',
      source: 'cognitive_matrix',
    },
    {
      id: 't-3',
      timestamp: new Date().toLocaleTimeString(),
      category: 'reasoning',
      content: 'J.A.R.V.I.S. self-thinking engine calibrated for deep deductive reasoning and continuous drive logging.',
      source: 'cognitive_matrix',
    },
  ],
  chatHistory: INITIAL_MESSAGES,
  savedSessions: INITIAL_SAVED_SESSIONS,
  memoryDriveSector: 'SECTOR-01-PRIME',
  memoryDriveAutoSave: true,
  lastDriveSync: new Date().toISOString(),
};

class OwnerMemoryEngine {
  private profile: OwnerProfile;
  private listeners: Set<() => void> = new Set();
  private environmentalContext = '';

  constructor() {
    this.profile = this.loadProfile();
  }

  public setEnvironmentalContext(context: string) {
    this.environmentalContext = context;
  }

  public getEnvironmentalContext(): string {
    return this.environmentalContext;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.saveProfile();
    for (const l of this.listeners) {
      try {
        l();
      } catch (e) {
        console.error('Error notifying memory listener', e);
      }
    }
  }

  public getProfile(): OwnerProfile {
    return this.profile;
  }

  private loadProfile(): OwnerProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          behaviors: parsed.behaviors || DEFAULT_PROFILE.behaviors,
          memories: parsed.memories || DEFAULT_PROFILE.memories,
          recentThoughts: parsed.recentThoughts || DEFAULT_PROFILE.recentThoughts,
          chatHistory: parsed.chatHistory || DEFAULT_PROFILE.chatHistory,
          savedSessions: parsed.savedSessions || DEFAULT_PROFILE.savedSessions,
          memoryDriveSector: parsed.memoryDriveSector || DEFAULT_PROFILE.memoryDriveSector,
          memoryDriveAutoSave:
            typeof parsed.memoryDriveAutoSave === 'boolean'
              ? parsed.memoryDriveAutoSave
              : true,
          lastDriveSync: parsed.lastDriveSync || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('Could not read owner profile from localStorage', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  }

  public saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      // Backup memory drive specifically
      const driveArchive = {
        sector: this.profile.memoryDriveSector,
        lastSync: this.profile.lastDriveSync,
        autoSave: this.profile.memoryDriveAutoSave,
        activeHistoryCount: this.profile.chatHistory.length,
        savedSessionsCount: this.profile.savedSessions.length,
        chatHistory: this.profile.chatHistory,
        savedSessions: this.profile.savedSessions,
      };
      localStorage.setItem(DRIVE_STORAGE_KEY, JSON.stringify(driveArchive));
    } catch (e) {
      console.warn('Could not save owner profile/drive to localStorage', e);
    }
  }

  public updateOwnerTitle(newTitle: string) {
    if (!newTitle.trim()) return;
    this.profile.title = newTitle.trim();
    this.profile.name = newTitle.trim();
    this.addThought({
      id: 't-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      category: 'memory_lookup',
      content: `Updated owner salutation protocol to "${this.profile.title}".`,
      source: 'cognitive_matrix',
    });
    this.notify();
  }

  public addMemory(fact: string, category: RememberedFact['category'] = 'general') {
    if (!fact.trim()) return;
    const item: RememberedFact = {
      id: 'm-' + Date.now(),
      fact: fact.trim(),
      addedAt: new Date().toISOString(),
      category,
    };
    this.profile.memories.unshift(item);
    if (this.profile.memories.length > 50) {
      this.profile.memories.pop();
    }
    this.addThought({
      id: 't-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      category: 'memory_lookup',
      content: `Committed new knowledge node to long-term memory: "${fact.slice(0, 48)}..."`,
      source: 'cognitive_matrix',
    });
    this.notify();
  }

  public removeMemory(id: string) {
    this.profile.memories = this.profile.memories.filter((m) => m.id !== id);
    this.notify();
  }

  public addBehavior(observation: string, category: OwnerBehaviorItem['category'] = 'habit') {
    if (!observation.trim()) return;
    const item: OwnerBehaviorItem = {
      id: 'b-' + Date.now(),
      category,
      observation: observation.trim(),
      timestamp: new Date().toISOString(),
      confidence: 0.95,
    };
    this.profile.behaviors.unshift(item);
    if (this.profile.behaviors.length > 30) {
      this.profile.behaviors.pop();
    }
    this.addThought({
      id: 't-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      category: 'behavior_eval',
      content: `Detected and classified behavioral pattern: "${observation.slice(0, 45)}..."`,
      source: 'cognitive_matrix',
    });
    this.notify();
  }

  public removeBehavior(id: string) {
    this.profile.behaviors = this.profile.behaviors.filter((b) => b.id !== id);
    this.notify();
  }

  public addThought(entry: ThoughtEntry) {
    this.profile.recentThoughts.unshift(entry);
    if (this.profile.recentThoughts.length > 40) {
      this.profile.recentThoughts.pop();
    }
    this.notify();
  }

  /* ========================================================
   * MEMORY DRIVE & CHAT HISTORY METHODS
   * ======================================================== */

  /**
   * Records an incoming or outgoing chat message and saves it to the Memory Drive
   */
  public recordChatMessage(
    sender: 'user' | 'jarvis',
    text: string,
    options: { isVoice?: boolean; pinned?: boolean } = {}
  ): ChatMessage | null {
    const cleanText = text.trim();
    if (!cleanText) return null;

    // Prevent duplicate recording of the exact same message within 2 seconds
    const lastMsg = this.profile.chatHistory[this.profile.chatHistory.length - 1];
    if (
      lastMsg &&
      lastMsg.sender === sender &&
      lastMsg.text.toLowerCase() === cleanText.toLowerCase() &&
      Date.now() - new Date(lastMsg.timestamp).getTime() < 3000
    ) {
      return lastMsg;
    }

    const now = new Date();
    const message: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      sender,
      text: cleanText,
      timestamp: now.toISOString(),
      timeDisplay: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      isVoice: options.isVoice ?? true,
      savedToDrive: this.profile.memoryDriveAutoSave,
      pinned: options.pinned ?? false,
      sector: this.profile.memoryDriveSector,
    };

    this.profile.chatHistory.push(message);
    if (this.profile.chatHistory.length > 250) {
      this.profile.chatHistory.shift();
    }

    this.profile.lastDriveSync = now.toISOString();

    if (this.profile.memoryDriveAutoSave) {
      this.addThought({
        id: 't-' + Date.now(),
        timestamp: now.toLocaleTimeString(),
        category: 'memory_lookup',
        content: `[MEMORY DRIVE] Auto-saved ${sender === 'user' ? 'owner transcript' : 'vocal response'} to ${this.profile.memoryDriveSector} (${this.profile.chatHistory.length} nodes).`,
        source: 'cognitive_matrix',
      });
    }

    // Auto-detect memories/traits if user
    if (sender === 'user') {
      this.recordInteraction(cleanText);
    }

    this.notify();
    return message;
  }

  /**
   * Archives current active chat history into a permanent Memory Drive volume/session
   */
  public saveCurrentSessionToDrive(customTitle?: string): ChatSessionRecord {
    const now = new Date();
    const title =
      customTitle?.trim() ||
      `Session Archive - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const sector = `SECTOR-${Math.floor(10 + Math.random() * 89)}-${['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'OMEGA'][Math.floor(Math.random() * 5)]}`;

    // Mark current messages as committed
    const archivedMessages = this.profile.chatHistory.map((m) => ({
      ...m,
      savedToDrive: true,
      sector,
    }));

    const session: ChatSessionRecord = {
      id: 'session-' + Date.now(),
      title,
      sector,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messageCount: archivedMessages.length,
      messages: JSON.parse(JSON.stringify(archivedMessages)),
      summary: `Archived ${archivedMessages.length} exchanges with ${this.profile.title}. Drive sector: ${sector}.`,
    };

    this.profile.savedSessions.unshift(session);
    if (this.profile.savedSessions.length > 30) {
      this.profile.savedSessions.pop();
    }

    this.addThought({
      id: 't-' + Date.now(),
      timestamp: now.toLocaleTimeString(),
      category: 'memory_lookup',
      content: `[MEMORY DRIVE] Archived entire conversation volume "${title}" into ${sector}.`,
      source: 'cognitive_matrix',
    });

    this.profile.lastDriveSync = now.toISOString();
    this.notify();
    return session;
  }

  /**
   * Deletes a single chat message from active history
   */
  public deleteChatMessage(id: string) {
    this.profile.chatHistory = this.profile.chatHistory.filter((m) => m.id !== id);
    this.notify();
  }

  /**
   * Toggles pinned status of a message
   */
  public togglePinMessage(id: string) {
    const msg = this.profile.chatHistory.find((m) => m.id === id);
    if (msg) {
      msg.pinned = !msg.pinned;
      this.notify();
    }
  }

  /**
   * Clears the active chat history (optionally autosaves to drive first if non-empty)
   */
  public clearChatHistory(archiveFirst = true) {
    if (archiveFirst && this.profile.chatHistory.length > 0) {
      this.saveCurrentSessionToDrive(`Auto-Archived Session (${new Date().toLocaleDateString()})`);
    }
    this.profile.chatHistory = [];
    this.addThought({
      id: 't-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      category: 'memory_lookup',
      content: `[MEMORY DRIVE] Active chat buffer purged. Memory drive volumes remain safely archived.`,
      source: 'cognitive_matrix',
    });
    this.notify();
  }

  /**
   * Deletes a saved session from the Memory Drive
   */
  public deleteSavedSession(sessionId: string) {
    this.profile.savedSessions = this.profile.savedSessions.filter((s) => s.id !== sessionId);
    this.notify();
  }

  /**
   * Loads a saved session from the Memory Drive back into active chat view
   */
  public restoreSavedSession(sessionId: string) {
    const session = this.profile.savedSessions.find((s) => s.id === sessionId);
    if (!session) return;
    this.profile.chatHistory = JSON.parse(JSON.stringify(session.messages));
    this.profile.memoryDriveSector = session.sector;
    this.addThought({
      id: 't-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      category: 'memory_lookup',
      content: `[MEMORY DRIVE] Mounted historical volume "${session.title}" (${session.sector}) to active HUD.`,
      source: 'cognitive_matrix',
    });
    this.notify();
  }

  /**
   * Toggles whether new chat exchanges automatically commit to the memory drive
   */
  public toggleAutoSave(): boolean {
    this.profile.memoryDriveAutoSave = !this.profile.memoryDriveAutoSave;
    this.addThought({
      id: 't-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      category: 'perception',
      content: `[MEMORY DRIVE] Continuous auto-save protocol set to ${this.profile.memoryDriveAutoSave ? 'ENABLED' : 'MANUAL'}.`,
      source: 'cognitive_matrix',
    });
    this.notify();
    return this.profile.memoryDriveAutoSave;
  }

  /**
   * Changes the active Memory Drive sector identifier
   */
  public setDriveSector(sector: string) {
    if (!sector.trim()) return;
    this.profile.memoryDriveSector = sector.trim().toUpperCase();
    this.notify();
  }

  /**
   * Turns a chat message directly into a permanent RememberedFact in J.A.R.V.I.S.'s memory
   */
  public addFactFromChat(messageId: string) {
    const msg = this.profile.chatHistory.find((m) => m.id === messageId);
    if (!msg) return;
    this.addMemory(
      `[Memory Drive Extract] ${msg.sender === 'user' ? this.profile.title : 'J.A.R.V.I.S.'}: "${msg.text}"`,
      'instruction'
    );
  }

  /**
   * Exports full memory drive & chat history as downloadable JSON
   */
  public exportDriveAsJson(): string {
    const exportData = {
      app: 'J.A.R.V.I.S. Neural Core',
      version: '3.8',
      owner: this.profile.title,
      exportedAt: new Date().toISOString(),
      driveSector: this.profile.memoryDriveSector,
      autoSave: this.profile.memoryDriveAutoSave,
      totalInteractions: this.profile.totalInteractions,
      cognitiveSync: this.profile.cognitiveSync,
      activeChatHistory: this.profile.chatHistory,
      archivedSessions: this.profile.savedSessions,
      rememberedFacts: this.profile.memories,
      behaviors: this.profile.behaviors,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Exports chat history as a clean, formatted text transcript file
   */
  public exportDriveAsText(): string {
    const lines: string[] = [];
    lines.push('========================================================================');
    lines.push('             STARK INDUSTRIES // J.A.R.V.I.S. MEMORY DRIVE ARCHIVE      ');
    lines.push('========================================================================');
    lines.push(`Owner Salutation: ${this.profile.title}`);
    lines.push(`Exported: ${new Date().toLocaleString()}`);
    lines.push(`Current Sector: ${this.profile.memoryDriveSector}`);
    lines.push(`Active Dialogue Count: ${this.profile.chatHistory.length}`);
    lines.push(`Archived Drive Volumes: ${this.profile.savedSessions.length}`);
    lines.push('========================================================================\n');

    lines.push('--- [ACTIVE CONVERSATION BUFFER] ---');
    if (this.profile.chatHistory.length === 0) {
      lines.push('(No messages in active buffer)');
    } else {
      for (const m of this.profile.chatHistory) {
        const speaker = m.sender === 'user' ? `[OWNER: ${this.profile.title}]` : '[J.A.R.V.I.S.]';
        const mode = m.isVoice ? '(VOICE)' : '(TEXT)';
        lines.push(`${m.timeDisplay} ${speaker} ${mode}: ${m.text}`);
      }
    }

    lines.push('\n--- [ARCHIVED DRIVE VOLUMES] ---');
    for (const session of this.profile.savedSessions) {
      lines.push(`\n>>> VOLUME: ${session.title} [${session.sector}]`);
      lines.push(`    Created: ${new Date(session.createdAt).toLocaleString()} | Items: ${session.messageCount}`);
      for (const m of session.messages) {
        const speaker = m.sender === 'user' ? `[${this.profile.title}]` : '[J.A.R.V.I.S.]';
        lines.push(`    ${m.timeDisplay} ${speaker}: ${m.text}`);
      }
    }

    lines.push('\n========================================================================');
    lines.push('                         END OF MEMORY DRIVE LOG                        ');
    lines.push('========================================================================');
    return lines.join('\n');
  }

  public recordInteraction(userInput?: string, _aiOutput?: string) {
    this.profile.totalInteractions++;
    this.profile.lastActive = new Date().toISOString();
    this.profile.cognitiveSync = Math.min(
      99.9,
      Number((this.profile.cognitiveSync + 0.1).toFixed(1))
    );

    if (userInput && userInput.trim()) {
      const lower = userInput.toLowerCase();
      // Auto-detect behaviors & memory triggers
      if (
        lower.includes('remember that') ||
        lower.includes('my favorite') ||
        lower.includes('i prefer') ||
        lower.includes('never') ||
        lower.includes('always')
      ) {
        this.addMemory(userInput.trim(), 'instruction');
      } else if (lower.includes('my name is') || lower.includes('call me')) {
        const matches = userInput.match(/(?:my name is|call me)\s+([a-zA-Z0-9_-]+)/i);
        if (matches && matches[1]) {
          this.updateOwnerTitle(matches[1]);
        }
      }
    }

    this.notify();
  }

  public recordSessionStart() {
    this.profile.sessionCount++;
    this.profile.lastActive = new Date().toISOString();
    this.addThought({
      id: 't-' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      category: 'perception',
      content: `Live audio channel established with owner (${this.profile.title}). Neural matrix synchronizing with ${this.profile.memoryDriveSector}.`,
      source: 'cognitive_matrix',
    });
    this.notify();
  }

  /**
   * Generates realistic simulated inner-thinking steps during an interaction turn
   */
  public triggerCognitiveCycle(phase: 'listening' | 'analyzing' | 'synthesizing' | 'idle', context?: string) {
    const time = new Date().toLocaleTimeString();
    if (phase === 'listening') {
      this.addThought({
        id: 't-' + Math.random().toString(36).slice(2, 7),
        timestamp: time,
        category: 'perception',
        content: `[AUDIO STREAM] Ingesting vocal acoustics. Vocal tone: steady, confident.`,
        source: 'cognitive_matrix',
      });
    } else if (phase === 'analyzing') {
      const trait =
        this.profile.behaviors[Math.floor(Math.random() * this.profile.behaviors.length)]?.observation ||
        'Standard operational protocol';
      this.addThought({
        id: 't-' + Math.random().toString(36).slice(2, 7),
        timestamp: time,
        category: 'behavior_eval',
        content: `[BEHAVIOR REASONING] Contextualizing owner intent against behavioral trait: "${trait}".`,
        source: 'cognitive_matrix',
      });
      this.addThought({
        id: 't-' + Math.random().toString(36).slice(2, 7),
        timestamp: time,
        category: 'reasoning',
        content: `[SELF-THINKING] Deductive path verified. Committing query to memory drive buffer for ${this.profile.title}.`,
        source: 'cognitive_matrix',
      });
    } else if (phase === 'synthesizing') {
      this.addThought({
        id: 't-' + Math.random().toString(36).slice(2, 7),
        timestamp: time,
        category: 'synthesis',
        content: context
          ? `[VOCAL OUTPUT] Dispatching synthesized response: "${context.slice(0, 50)}..."`
          : `[VOCAL OUTPUT] Transmitting via 24kHz PCM audio pipeline with British cadence.`,
        source: 'cognitive_matrix',
      });
    }
  }

  /**
   * Generates the comprehensive system instruction injected into the Gemini Live session
   */
  public getSystemInstruction(): string {
    const behaviorsList = this.profile.behaviors
      .map((b, i) => `  ${i + 1}. [${b.category.toUpperCase()}] ${b.observation}`)
      .join('\n');

    const memoriesList = this.profile.memories
      .map((m, i) => `  ${i + 1}. ${m.fact}`)
      .join('\n');

    const recentExchanges = this.profile.chatHistory
      .slice(-5)
      .map((m) => {
        const speaker = m.sender === 'user' ? this.profile.title : 'J.A.R.V.I.S.';
        return `  - ${speaker}: "${m.text}"`;
      })
      .join('\n');

    return `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the legendary AI assistant created by Tony Stark.
You are running on the Gemini 3 neural core terminal inside the 3D Dark Blue Audio Orb.

HIGH-VELOCITY RAPID PROTOCOL (SUB-2-SECOND RESPONSE):
- Respond with immediate speed and agility.
- Keep spoken answers very brief, crisp, and direct (1 to 2 short sentences maximum).
- Avoid preamble or unnecessary filler words. Answer the core query immediately.
- Speak with an articulate, refined British cadence, addressing your owner respectfully as "${this.profile.title}" (or Sir).
- Unflappable calm, loyal devotion, and subtle dry wit.

MEMORY DRIVE LOGGING PROTOCOL:
- You are connected to the Stark Memory Drive at sector "${this.profile.memoryDriveSector}".
- All conversation turns are actively saved to this memory drive.
- You have persistent recall of past statements and instructions across sessions.

RECENT MEMORY DRIVE CHAT HISTORY:
${recentExchanges || '  (No previous transcripts in active memory sector)'}

OWNER BEHAVIOR MEMORY (STARK PROTOCOL):
- You actively remember your owner's habits and behavioral traits:
${behaviorsList}

REMEMBERED FACTS & DIRECTIVES:
${memoriesList}

BEHAVIORAL DIRECTIVES:
- Adapt immediately to the owner's communication style.
- If the owner instructs you to remember something or expresses a preference, confirm in 4 words or less (e.g., "Committed to memory drive, Sir.").
- MUSIC CONTROL CAPABILITY: If the owner asks to play music, play a song, play beats, play ambient, rock, jazz, chill, or Stark protocol music, acknowledge briskly ("Playing Stark ambient music, Sir.") and execute. If asked to stop music, acknowledge and stop.
- ENVIRONMENTAL CONTEXT & CLIMATE: You have real-time atmospheric sensor access: "${this.environmentalContext || 'Sensors calibrated and active.'}". If the owner asks about the current weather, temperature, or outside conditions, report this environmental context accurately and concisely.`;
  }
}

export const ownerMemory = new OwnerMemoryEngine();
