// Hold-to-talk capture: 16 kHz mono signed 16-bit PCM (Transcribe streaming does not accept webm/opus from MediaRecorder).
export const MAX_RECORD_MS = 8000;

export interface Recording {
  stop: () => Promise<Int16Array>;
  cancel: () => void;
}

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = i * ratio;
    const i0 = Math.floor(a);
    const i1 = Math.min(i0 + 1, input.length - 1);
    out[i] = input[i0] + (input[i1] - input[i0]) * (a - i0);
  }
  return out;
}

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  let ctx: AudioContext;
  try {
    ctx = new AC({ sampleRate: 16000 });
  } catch {
    ctx = new AC();
  }
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(proc);
  proc.connect(ctx.destination);
  const close = () => {
    proc.disconnect();
    src.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
  return {
    cancel: close,
    stop: async () => {
      const rate = ctx.sampleRate;
      close();
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const all = new Float32Array(total);
      let o = 0;
      for (const c of chunks) {
        all.set(c, o);
        o += c.length;
      }
      const f = downsample(all, rate, 16000);
      const pcm = new Int16Array(Math.min(f.length, 16000 * 8));
      for (let i = 0; i < pcm.length; i++) pcm[i] = Math.max(-1, Math.min(1, f[i])) * 0x7fff;
      return pcm;
    },
  };
}

export function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
