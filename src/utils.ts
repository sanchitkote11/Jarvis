export function decode(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function createBlob(pcm: Float32Array): { data: string; mimeType: string } {
  const buffer = new ArrayBuffer(pcm.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return {
    data: btoa(String.fromCharCode(...new Uint8Array(buffer))),
    mimeType: "audio/pcm;rate=16000",
  };
}

export function decodeAudioData(data: Uint8Array, context: AudioContext, sampleRate: number, channels: number): AudioBuffer {
  const pcm16 = new Int16Array(data.buffer);
  const buffer = context.createBuffer(channels, pcm16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < pcm16.length; i++) {
    channelData[i] = pcm16[i] / 32768;
  }
  return buffer;
}

export function resampleTo16k(pcm: Float32Array, originalSampleRate: number): Float32Array {
  if (originalSampleRate === 16000) return pcm;
  const ratio = originalSampleRate / 16000;
  const newLength = Math.round(pcm.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = pcm[Math.round(i * ratio)];
  }
  return result;
}
