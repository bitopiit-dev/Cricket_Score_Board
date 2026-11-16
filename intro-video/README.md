# BPL-2027 intro video

45-second broadcast intro, 1920×1080 at 60 fps, with a synthesised soundtrack.
Everything is drawn in Python (Pillow + NumPy) and encoded with ffmpeg; no paid
services, no downloaded footage or music.

| Time | Scene |
|---|---|
| 0–8 s | Floodlights strike one by one; THE WAIT IS OVER → 12 TEAMS. ONE GLORY. |
| 8–16 s | Ball streaks into digital stumps; the BPL-2027 logo bursts out with a gold rim and sheen; BARIDHI PREMIER LEAGUE 2027 · BITOPI GROUP |
| 16–28 s | THE CONTENDERS: all 12 team badges (no groups shown); Road to Glory: Group Stage → Super Six → Semi-Finals → Grand Final, 19 December 2026 |
| 28–38 s | Live HUD montage: lofted six, yorker, trophy in confetti; PASSION • TEAMWORK • CHAMPIONSHIP SPIRIT |
| 38–45 s | Logo, FOLLOW EVERY BALL LIVE, the app's address; fade out |

Facts on screen (teams, groups, format, final date) come from `src/data/`.
The scoreboard counters in the montage are decorative, not tournament stats.

## Render

Needs Python 3 with `numpy`, `pillow`, `scipy`, plus `ffmpeg`, and `npm install`
already run in the project (the titles use the app's own Barlow Condensed font
from `node_modules/@fontsource`).

```bash
cd intro-video
python3 audio.py                  # -> audio.wav
python3 render.py                 # -> bpl-2027-intro.mp4 (a few minutes)
python3 render.py --stills 3,9.8  # PNG stills at those seconds, for checking
```

A lighter copy for the web (720p, 30 fps):

```bash
ffmpeg -i bpl-2027-intro.mp4 -vf scale=1280:-2 -r 30 -c:v libx264 -crf 26 \
  -preset slow -c:a aac -b:a 128k -movflags +faststart bpl-2027-intro-720p.mp4
```

The rendered `.mp4`, `audio.wav` and `stills/` are not committed; render them
again from the scripts.

## Thumbnail and background music

`bpl-2027-thumbnail.jpg` (the committee's banner, fitted to 16:9) is embedded in
the MP4 as its cover. The delivered video also has a background track mixed
under the last 11 seconds (from 34.13 s, the original sound at half level).
That track is copyrighted, so it is not in the repository; to mix it again:

```bash
ffmpeg -i audio.wav -i music.mp3 -filter_complex "[0:a]loudnorm=I=-16:TP=-1.5,aresample=48000,volume='if(lt(t,33.6),1,if(lt(t,34.1),1-0.5*(t-33.6)/0.5,0.5))':eval=frame[s];[1:a]aresample=48000,afade=t=in:d=0.3,adelay=34130|34130[m];[s][m]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5,atrim=0:45" mixed.wav
```
