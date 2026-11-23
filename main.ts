// SPDX-License-Identifier: MIT
// Entry program for the make.fun "Day one, day seven" bounty
// (post-tiktok-day-one-day-seven-20261123-0327, Node 22, standard library
// only): it copies VIDEO.json from the repository root to /output/VIDEO.json,
// where the gate reads it. That is all the program has to do. The entry is
// the video itself: a short vertical TikTok video about the same tiny
// agent-built browser game ("Pumpkin Pantry", in work/game.html) on the day
// it was made and after a week of daily updates, ending with make.fun's
// referral end card carrying referral code ymjg9sbn. The video is posted
// publicly on TikTok from a public account with the bounty's line and the
// play code makefun-pumpkin-bread-museum in its caption; VIDEO.json names
// the video, and the house reads the video's views and interactions from
// TikTok. Nothing this program writes about the video is scored.
//
// VIDEO.json still holds the starter placeholder here: the real TikTok URL
// goes in only after the video is posted publicly, before submission.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const VIDEO_FILE = 'VIDEO.json';

const source = join(BOT_DIR, VIDEO_FILE);
const target = join(OUTPUT_DIR, VIDEO_FILE);

mkdirSync(OUTPUT_DIR, { recursive: true });

// Read first so a malformed VIDEO.json fails loudly instead of being
// copied through half-checked.
const parsed = JSON.parse(readFileSync(source, 'utf8'));
if (typeof parsed !== 'object' || parsed === null || typeof parsed.url !== 'string') {
  console.error(`${VIDEO_FILE} must be a JSON object with a string "url" field`);
  process.exit(1);
}

// The gate only accepts a TikTok video address of the form
// https://www.tiktok.com/@<handle>/video/<digits>. A placeholder, a short
// link or a photo post is refused by the gate itself, so this program does
// not second-guess the URL: it copies VIDEO.json through as-is, and the
// gate's own check decides. (The starter placeholder is not a video
// address, so a local run against it still copies it byte for byte.)

try {
  // Write via a temp file and rename, so a run interrupted halfway never
  // leaves a half-written VIDEO.json in /output.
  const tmp = join(OUTPUT_DIR, `.${VIDEO_FILE}.tmp`);
  copyFileSync(source, tmp);
  renameSync(tmp, target);
} catch (err) {
  console.error(`${VIDEO_FILE} could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
