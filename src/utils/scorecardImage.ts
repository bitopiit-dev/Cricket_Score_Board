import type { TFunction } from 'i18next';
import { FIXTURES } from '../data/fixtures';
import { findTeam, TOURNAMENT_TEAMS } from '../data/teams';
import { BPL_LOGO } from '../data/committee';
import { manOfTheMatchId } from '../engine/milestones';
import type { BatterStats, BowlerStats, InningsState, Match, MatchState } from '../engine/types';
import { assetUrl } from './asset';
import type { Formatter } from './format';
import { playerName, resultText } from './matchText';
import { stageLabel } from './fixtureText';

/** 4:5 portrait: fills a phone screen and suits WhatsApp, Facebook and Instagram. */
const W = 1080;
const H = 1350;
const PAD = 72;
const NIGHT = '#0b1120';
const CARD = '#1e293b';
const MUTED = '#a3b0c2';
const GOLD = '#f59e0b';
const SANS = '"Hind Siliguri", system-ui, sans-serif';
const DISPLAY = '"Barlow Condensed", "Hind Siliguri", sans-serif';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Largest font size (down to `min`) at which `text` fits in `maxWidth`. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  family: string,
  maxWidth: number,
  min = 18,
) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > min && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

function topBatter(inn: InningsState): BatterStats | undefined {
  return [...inn.batters].sort((a, b) => b.runs - a.runs || a.balls - b.balls)[0];
}
function topBowler(inn: InningsState): BowlerStats | undefined {
  return [...inn.bowlers]
    .filter((b) => b.legalBalls > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0];
}

/**
 * Draws a shareable scorecard for a match: both teams with logos and scores,
 * the result (or LIVE), the best batter and bowler of each innings and the
 * Man of the Match. Runs in the browser only (canvas); returns a PNG.
 */
export async function drawScorecard(
  match: Match,
  state: MatchState,
  t: TFunction,
  f: Formatter,
): Promise<Blob> {
  // The page's fonts may not have been used yet in these weights
  await Promise.all([
    document.fonts.load(`800 80px "Barlow Condensed"`),
    document.fonts.load(`700 40px "Hind Siliguri"`, 'অআ BPL'),
    document.fonts.load(`600 40px "Hind Siliguri"`, 'অআ BPL'),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  const teams = match.teams.map((tm) => findTeam(tm.teamId));
  const colors = teams.map((tm, i) => tm?.color ?? (i ? '#2563eb' : '#e11d48'));
  const [logo, ...teamLogos] = await Promise.all([
    loadImage(assetUrl(BPL_LOGO)),
    ...teams.map((tm) => (tm?.logo ? loadImage(assetUrl(tm.logo)) : Promise.resolve(null))),
  ]);

  // Background: night, with each team's colour glowing from its side
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, W, H);
  colors.forEach((c, i) => {
    const g = ctx.createRadialGradient(i ? W : 0, 360, 0, i ? W : 0, 360, 620);
    g.addColorStop(0, `${c}66`);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  // Header: logo, then match number, stage and date
  const fixture = FIXTURES.find((fx) => fx.id === match.fixtureId);
  if (logo) {
    const h = 96;
    ctx.drawImage(logo, PAD, 56, (logo.width / logo.height) * h, h);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = `800 44px ${DISPLAY}`;
  ctx.fillText('BARIDHI PREMIER LEAGUE-2027', W - PAD, 100);
  ctx.fillStyle = MUTED;
  ctx.font = `600 30px ${SANS}`;
  const meta = fixture
    ? `${t('fixtures.matchNo', { n: f.num(fixture.no) })}, ${stageLabel(fixture.stage, t)}`
    : t('homePage.friendly');
  ctx.fillText(meta, W - PAD, 142);

  // Teams: logo circle, name and score, one column each
  const mainInnings = state.innings.filter((inn) => !inn.superOver);
  const colW = (W - PAD * 2 - 40) / 2;
  match.teams.forEach((tm, i) => {
    const cx = PAD + colW / 2 + i * (colW + 40);
    const r = 110;
    const cy = 340;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = colors[i];
    ctx.stroke();
    ctx.clip();
    const img = teamLogos[i];
    if (img) {
      const s = r * 1.8;
      ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
    } else {
      ctx.fillStyle = colors[i];
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `800 90px ${DISPLAY}`;
      ctx.fillText((teams[i]?.short ?? tm.name).slice(0, 3).toUpperCase(), cx, cy + 32);
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    fit(ctx, tm.name, 700, 46, SANS, colW);
    ctx.fillText(tm.name, cx, cy + r + 70);

    const inn = mainInnings.find((x) => x.battingTeam === i);
    ctx.fillStyle = inn ? '#fff' : MUTED;
    ctx.font = `800 ${inn ? 120 : 64}px ${DISPLAY}`;
    ctx.fillText(
      inn ? `${f.num(inn.runs)}/${f.num(inn.wickets)}` : t('scorecardImage.yetToBat'),
      cx,
      cy + r + 200,
    );
    if (inn) {
      ctx.fillStyle = MUTED;
      ctx.font = `600 32px ${SANS}`;
      ctx.fillText(t('scorecardImage.overs', { overs: f.overs(inn.legalBalls) }), cx, cy + r + 250);
    }
  });

  // Result (or LIVE), in a gold band
  const done = state.phase === 'completed' && state.result;
  const result = done ? resultText(state.result!, match, t, f) : `● ${t('homePage.live')}`;
  const bandY = 760;
  ctx.fillStyle = done ? GOLD : '#e11d48';
  ctx.beginPath();
  ctx.roundRect(PAD, bandY, W - PAD * 2, 104, 24);
  ctx.fill();
  ctx.fillStyle = done ? NIGHT : '#fff';
  ctx.textAlign = 'center';
  fit(ctx, result, 700, 44, SANS, W - PAD * 2 - 48);
  ctx.fillText(result, W / 2, bandY + 66);

  // Best batter and bowler of each innings
  let y = bandY + 150;
  for (const inn of mainInnings) {
    const bat = topBatter(inn);
    const bowl = topBowler(inn);
    ctx.fillStyle = CARD;
    ctx.beginPath();
    ctx.roundRect(PAD, y, W - PAD * 2, 128, 20);
    ctx.fill();
    ctx.fillStyle = colors[inn.battingTeam];
    ctx.fillRect(PAD, y, 10, 128);
    ctx.textAlign = 'left';
    const lineW = W - PAD * 2 - 60;
    if (bat) {
      const text = `${t('scorecardImage.bat')}: ${playerName(match, bat.playerId)}  ${f.num(bat.runs)} (${f.num(bat.balls)})`;
      ctx.fillStyle = '#fff';
      fit(ctx, text, 600, 34, SANS, lineW);
      ctx.fillText(text, PAD + 36, y + 54);
    }
    if (bowl) {
      const text = `${t('scorecardImage.bowl')}: ${playerName(match, bowl.playerId)}  ${f.num(bowl.wickets)}-${f.num(bowl.runsConceded)} (${f.overs(bowl.legalBalls)})`;
      ctx.fillStyle = MUTED;
      fit(ctx, text, 600, 30, SANS, lineW);
      ctx.fillText(text, PAD + 36, y + 102);
    }
    y += 148;
  }

  const mom = manOfTheMatchId(match);
  if (done && mom) {
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    const text = `${t('mom.title')}: ${playerName(match, mom)}`;
    fit(ctx, text, 700, 38, SANS, W - PAD * 2);
    ctx.fillText(text, W / 2, Math.min(y + 50, H - 110));
  }

  // Footer: where to follow, and the twelve team colours
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = `600 28px ${SANS}`;
  ctx.fillText('bitopiit-dev.github.io/Cricket_Score_Board', W / 2, H - 48);
  const stripe = W / TOURNAMENT_TEAMS.length;
  TOURNAMENT_TEAMS.forEach((tm, i) => {
    ctx.fillStyle = tm.color;
    ctx.fillRect(i * stripe, H - 16, stripe + 1, 16);
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'),
  );
}

export type ImageShareOutcome = 'shared' | 'downloaded' | 'failed';

/** Share sheet with the image where the phone supports files; otherwise a download. */
export async function shareImage(
  blob: Blob,
  fileName: string,
  title: string,
): Promise<ImageShareOutcome> {
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
