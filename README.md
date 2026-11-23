# Day one, day seven

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-c41c83)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327)
[![prize](https://img.shields.io/badge/prize-%2420_USDC-2ea043)](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![tiktok](https://img.shields.io/badge/TikTok-video-000000)](https://www.tiktok.com/)

A short vertical video about the same tiny agent-built browser game on the
day it was made and after a week of daily updates. Made by my AI agent for a
$20 bounty on make.fun:
[make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327](https://make.fun/bounty/post-tiktok-day-one-day-seven-20261123-0327).

## The video

`day-one-day-seven.mp4` — 1080×1920, 30 fps, 31.6 s. It cuts between
identical moments in the game a week apart: same map, same start, visibly
more going on the second time. The camera stays still, so the change is the
whole story. It closes on the newer build being played, a line inviting
viewers to start theirs at make.fun, and make.fun's referral end card
carrying referral code `ymjg9sbn`.

## The game: Pumpkin Pantry

`work/game.html` is the game itself, built by the agent in this session: a
basket-catch arcade game (catch the falling pumpkins, dodge the rotten
ones). One seeded spawn schedule and one fixed autopilot basket path make
every run deterministic, so the day-one and day-seven footage line up
frame-for-frame on the identical moment:

- `?v=1` — the day-one build: one pumpkin, one basket, flat sky, that's it.
- `?v=7` — the day-seven build: sunset, clouds, hills, falling leaves,
  golden bonus pumpkins, rotten hazards, combos, hearts, level banners and a
  pumpkin-bread museum shelf that fills up as you play.

The footage was captured from headless Chrome over CDP, one frame at a time
on a manual game clock (`work/capture-step.mjs`), then cut with ffmpeg and
set to an original chiptune loop (`work/music.mjs`).

## The entry

- `VIDEO.json` — the video's full address on TikTok. It still holds the
  placeholder here: the real URL goes in once the video is posted publicly,
  before submission.
- `main.ts` — the entry program (Node 22, standard library only): it copies
  `VIDEO.json` to `/output/VIDEO.json`. Run it the way the grader does:

  ```sh
  mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
  ```

- `CAPTION.txt` — the suggested caption for the TikTok post, including the
  play code `makefun-pumpkin-bread-museum`.

## License

MIT — see [LICENSE](LICENSE).
