import type { TFunction } from 'i18next';
import { FIXTURES } from '../data/fixtures';
import { findTeam, initials, TOURNAMENT_TEAMS } from '../data/teams';
import { BPL_LOGO } from '../data/committee';
import type { Match, MatchState } from '../engine/types';
import { assetUrl } from './asset';
import type { Formatter } from './format';
import { resultText } from './matchText';
import { stageLabel } from './fixtureText';
import { leadsWithBowling, type PlayerMoment } from './playerMoments';
import { fit, loadImage } from './scorecardImage';

/** 9:16 story: WhatsApp status, Facebook and Instagram stories fill the screen with it. */
const W = 1080;
const H = 1920;
const PAD = 72;
const NIGHT = '#0b1120';
const MUTED = '#a3b0c2';
const GOLD = '#f59e0b';
const SANS = '"Hind Siliguri", system-ui, sans-serif';
const DISPLAY = '"Barlow Condensed", "Hind Siliguri", sans-serif';

/** The squad photo behind a match player id ("<teamId>/<playerId>"), if there is one. */
function photoOf(match: Match, m: PlayerMoment): string | undefined {
  const team = findTeam(match.teams[m.team].teamId);
  const pid = m.playerId.split('/')[1];
  return team?.players.find((p) => p.id === pid)?.photo;
}

/** Mixes a hex colour toward black (amount 0..1). */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - amount)));
  return `rgb(${c.join(',')})`;
}

/**
 * Draws a story card for one player's moment (Man of the Match, fifty,
 * hundred or wicket haul): team-colour slab, photo, the big figure, the
 * match it came in. Browser only (canvas); returns a PNG.
 */
export async function drawPlayerCard(
  match: Match,
  state: MatchState,
  m: PlayerMoment,
  t: TFunction,
  f: Formatter,
): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`800 300px "Barlow Condensed"`, '0123456789/*'),
    document.fonts.load(`700 90px "Hind Siliguri"`, 'অআ০১২৩৪৫৬৭৮৯'),
    document.fonts.load(`600 40px "Hind Siliguri"`, 'অআ'),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  const team = findTeam(match.teams[m.team].teamId);
  const color = team?.color ?? (m.team ? '#2563eb' : '#e11d48');
  const photoPath = photoOf(match, m);
  const [logo, photo, teamLogo] = await Promise.all([
    loadImage(assetUrl(BPL_LOGO)),
    photoPath ? loadImage(assetUrl(photoPath)) : Promise.resolve(null),
    team?.logo ? loadImage(assetUrl(team.logo)) : Promise.resolve(null),
  ]);
  const player = match.teams[m.team].players.find((p) => p.id === m.playerId);
  const name = player?.name ?? '?';

  // Night page; the team's colour as a slab that ends on a slant, like a pitch-side board
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, W, H);
  const slabBottomL = 1150;
  const slabBottomR = 990;
  const g = ctx.createLinearGradient(0, 0, W, slabBottomL);
  g.addColorStop(0, color);
  g.addColorStop(1, shade(color, 0.55));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, slabBottomR);
  ctx.lineTo(0, slabBottomL);
  ctx.closePath();
  ctx.fill();
  // Mown-grass bands across the slab
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgb(255 255 255 / 0.05)';
  for (let x = -H; x < W; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 80, 0);
    ctx.lineTo(x + 80 + slabBottomL, slabBottomL);
    ctx.lineTo(x + slabBottomL, slabBottomL);
    ctx.fill();
  }
  ctx.restore();
  // Gold edge along the slant
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, slabBottomL);
  ctx.lineTo(W, slabBottomR);
  ctx.stroke();

  // Header: tournament logo; match number and stage on the right
  if (logo) {
    const h = 110;
    ctx.drawImage(logo, PAD, 64, (logo.width / logo.height) * h, h);
  }
  const fixture = FIXTURES.find((fx) => fx.id === match.fixtureId);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(
    fixture ? t('fixtures.matchNo', { n: f.num(fixture.no) }) : t('homePage.friendly'),
    W - PAD,
    112,
  );
  if (fixture) {
    ctx.fillStyle = 'rgb(255 255 255 / 0.75)';
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText(stageLabel(fixture.stage, t), W - PAD, 156);
  }

  // Photo in a white ring; initials on a dark disc when there is no photo
  const cx = W / 2;
  const cy = 600;
  const r = 330;
  ctx.save();
  ctx.shadowColor = 'rgb(0 0 0 / 0.45)';
  ctx.shadowBlur = 60;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (photo) {
    // Cover-fit the photo into the circle
    const s = Math.max((r * 2) / photo.width, (r * 2) / photo.height);
    const w = photo.width * s;
    const h = photo.height * s;
    ctx.drawImage(photo, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = shade(color, 0.7);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `800 260px ${DISPLAY}`;
    ctx.fillText(initials(name), cx, cy + 92);
  }
  ctx.restore();
  // Team logo as a badge on the ring
  if (teamLogo) {
    const br = 78;
    const bx = cx + r * 0.72;
    const by = cy + r * 0.72;
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(teamLogo, bx - br * 0.85, by - br * 0.85, br * 1.7, br * 1.7);
    ctx.restore();
  }

  // What the moment is, on a gold tag
  const tag =
    m.kind === 'mom'
      ? t('mom.title')
      : m.kind === 'hundred'
        ? t('playerCard.hundred')
        : m.kind === 'fifty'
          ? t('playerCard.fifty')
          : t('playerCard.haul', { n: f.num(m.bowling?.wickets ?? 0) });
  ctx.font = `700 44px ${SANS}`;
  const tagW = ctx.measureText(tag).width + 72;
  const tagY = 1040;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.roundRect(cx - tagW / 2, tagY, tagW, 84, 42);
  ctx.fill();
  ctx.fillStyle = NIGHT;
  ctx.textAlign = 'center';
  ctx.fillText(tag, cx, tagY + 58);

  // Name and team
  ctx.fillStyle = '#fff';
  fit(ctx, name, 700, 92, SANS, W - PAD * 2, 48);
  ctx.fillText(name, cx, 1250);
  ctx.fillStyle = MUTED;
  fit(ctx, match.teams[m.team].name, 600, 40, SANS, W - PAD * 2);
  ctx.fillText(match.teams[m.team].name, cx, 1318);

  // The big figure, with its detail underneath
  const bowlFirst = leadsWithBowling(m);
  const bat = m.batting;
  const bowl = m.bowling;
  const batBig = bat ? `${f.num(bat.runs)}${bat.out ? '' : '*'}` : '';
  const batSub = bat
    ? t('playerCard.batDetail', {
        balls: f.num(bat.balls),
        fours: f.num(bat.fours),
        sixes: f.num(bat.sixes),
      })
    : '';
  const bowlBig = bowl ? `${f.num(bowl.wickets)}/${f.num(bowl.runs)}` : '';
  const bowlSub = bowl ? t('playerCard.bowlDetail', { overs: f.overs(bowl.legalBalls) }) : '';
  const [big, sub] = bowlFirst ? [bowlBig, bowlSub] : [batBig, batSub];
  const other = bowlFirst
    ? bat && bat.balls > 0
      ? `${t('playerCard.batting')}: ${batBig} (${f.num(bat.balls)})`
      : ''
    : bowl
      ? `${t('playerCard.bowling')}: ${bowlBig} (${f.overs(bowl.legalBalls)})`
      : '';

  ctx.fillStyle = '#fff';
  fit(ctx, big, 800, 300, DISPLAY, W - PAD * 2, 160);
  ctx.fillText(big, cx, 1600);
  ctx.fillStyle = GOLD;
  fit(ctx, sub, 600, 42, SANS, W - PAD * 2);
  ctx.fillText(sub, cx, 1690);
  if (other) {
    ctx.fillStyle = MUTED;
    fit(ctx, other, 600, 34, SANS, W - PAD * 2);
    ctx.fillText(other, cx, 1744);
  }

  // The match it came in
  const [a, b] = match.teams;
  const vs = `${a.name} ${t('common.vs')} ${b.name}`;
  const done = state.phase === 'completed' && state.result;
  const ctxLine = done ? `${vs}: ${resultText(state.result!, match, t, f)}` : vs;
  ctx.fillStyle = 'rgb(255 255 255 / 0.85)';
  fit(ctx, ctxLine, 600, 32, SANS, W - PAD * 2);
  ctx.fillText(ctxLine, cx, 1806);

  // Footer: link, and the twelve team colours
  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText('bitopiit-dev.github.io/Cricket_Score_Board', cx, H - 56);
  const stripe = W / TOURNAMENT_TEAMS.length;
  TOURNAMENT_TEAMS.forEach((tm, i) => {
    ctx.fillStyle = tm.color;
    ctx.fillRect(i * stripe, H - 18, stripe + 1, 18);
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob((bl) => (bl ? resolve(bl) : reject(new Error('toBlob'))), 'image/png'),
  );
}
