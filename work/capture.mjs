// SPDX-License-Identifier: MIT
// Capture gameplay frames from headless Chrome over CDP, one scene per call.
// Usage: node capture.mjs <chrome-bin> <out-dir> <url> <prefix> <warmup-ms> <dur-ms> <fps>
// Frames land as <prefix>_NNNN.jpg (1080x1920). Chrome stays up across scenes
// only if the caller keeps the process alive; this script runs one scene.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [chromeBin, outDir, url, prefix, warmupMs, durMs, fps] =
  process.argv.slice(2);
const warmup = Number(warmupMs), dur = Number(durMs), rate = Number(fps);
mkdirSync(outDir, { recursive: true });

const PORT = 9333;
const chrome = spawn(chromeBin, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  '--window-size=1080,1920', '--force-device-scale-factor=1',
  '--user-data-dir=/tmp/chrome-pumpkin-profile',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForChrome() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch { /* still starting */ }
    await sleep(500);
  }
  throw new Error('chrome did not come up on the debug port');
}

let id = 0;
const waiting = new Map();
let socket = null;

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    waiting.set(mid, { resolve, reject });
    socket.send(JSON.stringify({ id: mid, method, params }));
  });
}

try {
  await waitForChrome();
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target found');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
  socket.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) {
      const { resolve } = waiting.get(m.id);
      waiting.delete(m.id);
      resolve(m.result);
    }
  };
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', {
    width: 1080, height: 1920, deviceScaleFactor: 1, mobile: true,
  });
  await call('Page.navigate', { url });
  // wait until the game signals its first frame
  for (let i = 0; i < 40; i++) {
    const r = await call('Runtime.evaluate', { expression: 'window.__ready === true', returnByValue: true });
    if (r && r.result && r.result.value) break;
    await sleep(250);
  }
  await sleep(warmup);
  const step = 1000 / rate;
  const total = Math.round((dur / 1000) * rate);
  for (let i = 0; i < total; i++) {
    const started = Date.now();
    const shot = await call('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    writeFileSync(join(outDir, `${prefix}_${String(i).padStart(4, '0')}.jpg`),
      Buffer.from(shot.data, 'base64'));
    const spent = Date.now() - started;
    if (spent < step) await sleep(step - spent);
  }
  console.log(`captured ${prefix}: ${total} frames`);
} finally {
  if (socket) socket.close();
  chrome.kill('SIGKILL');
}
