// SPDX-License-Identifier: MIT
// Generate a gentle 32-second chiptune loop as a 16-bit stereo WAV:
// soft pad chords (C - Am - F - G) with pentatonic plucks on top.
// Usage: node music.mjs <out.wav> <seconds>
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const seconds = Number(process.argv[3] || 32);
const SR = 44100;
const N = Math.floor(SR * seconds);
const data = new Float32Array(N * 2);

// note frequencies
const F = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
};
// one bar = 2s (120 bpm, 4 beats); chords cycle C, Am, F, G
const chords = [
  [F.C3, F.E3, F.G3, F.C4],
  [F.A3, F.C4, F.E4, F.A4],
  [F.F3, F.A3, F.C4, F.F4],
  [F.G3, F.B3, F.D4, F.G4],
];
// pluck melody (pentatonic), one note per beat, deterministic pattern
const melody = [
  F.E5, F.G5, F.A5, F.G5, F.E5, F.D5, F.E5, 0,
  F.C5, F.E5, F.G5, F.E5, F.D5, F.C5, F.D5, 0,
  F.F5 || F.A5, F.G5, F.A5, F.G5, F.E5, F.D5, F.C5, 0,
  F.G5, F.E5, F.D5, F.E5, F.G5, F.A5, F.G5, 0,
];
const BEAT = 0.5; // seconds per beat

function addPluck(t0, freq, amp, dur) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len && start + i < N; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 6); // quick decay, like a pluck
    const s = amp * env * (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2 * t));
    data[(start + i) * 2] += s;
    data[(start + i) * 2 + 1] += s;
  }
}
function addPad(t0, freqs, amp, dur) {
  const start = Math.floor(t0 * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len && start + i < N; i++) {
    const t = i / SR;
    const attack = Math.min(1, t / 0.4);
    const release = Math.min(1, (dur - t) / 0.5);
    const env = amp * attack * release;
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2 * t);
    s /= freqs.length;
    // gentle stereo spread
    data[(start + i) * 2] += s * env * 0.9;
    data[(start + i) * 2 + 1] += s * env * 1.0;
  }
}

// build the loop: 16 bars of 2s = 32s
for (let bar = 0; bar < 16; bar++) {
  const t0 = bar * 2;
  addPad(t0, chords[bar % 4], 0.10, 2.0);
  for (let beat = 0; beat < 4; beat++) {
    const note = melody[(bar * 4 + beat) % melody.length];
    if (note) addPluck(t0 + beat * BEAT, note, 0.16, 0.9);
  }
}
// master fade out over the last 2s, fade in over the first 0.3s
for (let i = 0; i < N; i++) {
  const t = i / SR;
  let g = 1;
  if (t < 0.3) g = t / 0.3;
  if (t > seconds - 2) g = Math.max(0, (seconds - t) / 2);
  data[i * 2] *= g * 0.8;
  data[i * 2 + 1] *= g * 0.8;
}

// write 16-bit PCM WAV
const bytes = Buffer.alloc(44 + N * 4);
bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + N * 4, 4); bytes.write('WAVE', 8);
bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(2, 22); bytes.writeUInt32LE(SR, 24); bytes.writeUInt32LE(SR * 4, 28);
bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34);
bytes.write('data', 36); bytes.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N * 2; i++) {
  const v = Math.max(-1, Math.min(1, data[i]));
  bytes.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}
writeFileSync(out, bytes);
console.log(`wrote ${out} (${seconds}s)`);
