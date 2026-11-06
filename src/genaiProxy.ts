/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const Type = {
  TYPE_UNSPECIFIED: "TYPE_UNSPECIFIED",
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
  NULL: "NULL",
} as const;
export type Type = (typeof Type)[keyof typeof Type];

export const Modality = {
  MODALITY_UNSPECIFIED: "MODALITY_UNSPECIFIED",
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  AUDIO: "AUDIO",
  DOCUMENT: "DOCUMENT",
} as const;
export type Modality = (typeof Modality)[keyof typeof Modality];

export class LiveServerMessage {
  setupComplete?: any;
  serverContent?: any;
  toolCall?: any;
  toolCallCancellation?: any;
  usageMetadata?: any;
  goAway?: any;
  sessionResumptionUpdate?: any;

  get text(): string | undefined {
    const parts = this.serverContent?.modelTurn?.parts;
    if (!parts?.length) return undefined;
    const textParts = parts
      .map((p: any) => (typeof p?.text === "string" && !p?.thought ? p.text : ""))
      .filter(Boolean);
    return textParts.length > 0 ? textParts.join("") : undefined;
  }

  get data(): string | undefined {
    const parts = this.serverContent?.modelTurn?.parts;
    if (!parts?.length) return undefined;
    const inlineParts = parts
      .map((p: any) => p?.inlineData?.data || "")
      .filter(Boolean);
    return inlineParts.length > 0 ? inlineParts.join("") : undefined;
  }

  get thought(): string | undefined {
    const parts = this.serverContent?.modelTurn?.parts;
    if (!parts?.length) return undefined;
    const thoughtParts = parts
      .map((p: any) => (typeof p?.text === "string" && p?.thought ? p.text : ""))
      .filter(Boolean);
    return thoughtParts.length > 0 ? thoughtParts.join("") : undefined;
  }

  get inputTranscript(): string | undefined {
    return (
      this.serverContent?.inputTranscription?.text ||
      this.serverContent?.interimInputTranscription?.text
    );
  }

  get outputTranscript(): string | undefined {
    return this.serverContent?.outputTranscription?.text;
  }

  static fromRaw(raw: any): LiveServerMessage {
    if (raw instanceof LiveServerMessage) return raw;
    return Object.assign(new LiveServerMessage(), raw);
  }
}

export interface Session {
  setupComplete?: any;
  sendRealtimeInput(data: any): void;
  sendClientContent?(content: any): void;
  sendToolResponse?(tool: any): void;
  close(): void;
}

function getLiveWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/live-ws`;
}

async function postJson(url: string, body: any) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export class GoogleGenAI {
  private apiVersion?: string;

  constructor(options?: any) {
    this.apiVersion = options?.apiVersion || options?.httpOptions?.apiVersion;
  }

  models = {
    generateContent: async (params: any): Promise<any> => {
      return await postJson("/api/generate-content", params);
    },
  };

  live = {
    connect: (params: any): Promise<Session> => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(getLiveWsUrl());
        let resolved = false;
        let readyForMessages = false;
        const queuedMessages: any[] = [];

        const sendCmd = (payload: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
          }
        };

        const session: Session = {
          setupComplete: {},
          sendRealtimeInput: (inputParams: any) => {
            sendCmd({ type: "sendRealtimeInput", params: inputParams });
          },
          sendClientContent: (contentParams: any) => {
            sendCmd({ type: "sendClientContent", params: contentParams });
          },
          sendToolResponse: (toolParams: any) => {
            sendCmd({ type: "sendToolResponse", params: toolParams });
          },
          close: () => {
            sendCmd({ type: "close" });
            ws.close();
          },
        };

        ws.onopen = () => {
          sendCmd({
            type: "connect_live",
            model: params?.model,
            config: params?.config,
            apiVersion: this.apiVersion,
          });
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(String(event.data));
            if (msg.type === "connected") {
              session.setupComplete = msg.setupComplete || {};
              resolved = true;
              resolve(session);
              queueMicrotask(() => {
                params?.callbacks?.onopen?.();
                readyForMessages = true;
                while (queuedMessages.length > 0) {
                  const m = queuedMessages.shift();
                  params?.callbacks?.onmessage?.(LiveServerMessage.fromRaw(m));
                }
              });
            } else if (msg.type === "message") {
              if (!readyForMessages) {
                queuedMessages.push(msg.data);
              } else {
                params?.callbacks?.onmessage?.(LiveServerMessage.fromRaw(msg.data));
              }
            } else if (msg.type === "error") {
              const err = new Error(msg.message || "Live WebSocket error");
              if (!resolved) {
                resolved = true;
                reject(err);
              }
              params?.callbacks?.onerror?.(err as any);
            } else if (msg.type === "close") {
              params?.callbacks?.onclose?.({
                code: msg.code || 1000,
                reason: msg.reason || "",
              } as any);
            }
          } catch (e) {
            console.error("[genaiProxy] Failed to parse WS message:", e);
          }
        };

        ws.onerror = (err) => {
          if (!resolved) {
            resolved = true;
            reject(err);
          }
          params?.callbacks?.onerror?.(err as any);
        };

        ws.onclose = (ev) => {
          if (!resolved) {
            resolved = true;
            reject(new Error(`WebSocket closed before connect (${ev.code})`));
          }
          params?.callbacks?.onclose?.(ev);
        };
      });
    },
  };
}
