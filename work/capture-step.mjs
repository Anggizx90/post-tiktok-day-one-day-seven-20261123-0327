// SPDX-License-Identifier: MIT
// Frame-stepped capture: drive the game's manual clock one frame at a time
// so every screenshot is exactly 1/fps of game time apart, whatever the
// wall-clock cost of a screenshot. Produces smooth 30 fps footage.
// Usage: node capture-step.mjs <chrome-bin> <out-dir> <url> <prefix> <seconds> <fps>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [chromeBin, outDir, url, prefix, seconds, fps] = process.argv.slice(2);
const total = Math.round(Number(seconds) * Number(fps));
const rate = Number(fps);
mkdirSync(outDir, { recursive: true });

const PORT = 9334;
const chrome = spawn(chromeBin, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  '--window-size=1080,1920', '--force-device-scale-factor=1',
  '--user-data-dir=/tmp/chrome-pumpkin-step',
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
  for (let i = 0; i < 40; i++) {
    const r = await call('Runtime.evaluate', { expression: 'window.__ready === true', returnByValue: true });
    if (r && r.result && r.result.value) break;
    await sleep(250);
  }
  for (let i = 0; i < total; i++) {
    await call('Runtime.evaluate', { expression: `window.__setTime(${i / rate})` });
    await sleep(50); // let one rAF paint the new game time
    const shot = await call('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
    writeFileSync(join(outDir, `${prefix}_${String(i).padStart(4, '0')}.jpg`),
      Buffer.from(shot.data, 'base64'));
    if (i % 60 === 0) console.log(`${prefix}: ${i}/${total}`);
  }
  console.log(`captured ${prefix}: ${total} frames`);
} finally {
  if (socket) socket.close();
  chrome.kill('SIGKILL');
}
