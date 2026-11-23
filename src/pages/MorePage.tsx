import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/common/icons';
import { Sheet } from '../components/common/Sheet';
import {
  AwardsArt,
  CommitteeArt,
  MediaArt,
  RulesArt,
  ShareArt,
  StatsArt,
} from '../components/more/MoreArt';
import { toast } from '../components/common/Toast';
import { btn } from '../components/common/controls';
import { PageTitle } from '../components/layout/AppShell';
import { BPL_LOGO, COMMITTEE_MEMBERS } from '../data/committee';
import { FIXTURES } from '../data/fixtures';
import { RULE_SECTIONS } from '../data/rules';
import { TOURNAMENT_TEAMS } from '../data/teams';
import { useFormat } from '../hooks/useFormat';
import { listMedia, photoUrl } from '../media/gallery';
import { pushSupport } from '../push/client';
import { usePrefs, type Theme } from '../store/prefsStore';
import { assetUrl } from '../utils/asset';
import { FIXTURE_PDF_NAME, fixturePdfUrl } from '../utils/fixturePdf';
import { shareText } from '../utils/share';

/** Each card's colours: --a deep, --b bright (see .more-card in index.css). */
const CARD_COLORS = {
  share: ['#6d28d9', '#a855f7'],
  stats: ['#1d4ed8', '#3b82f6'],
  rules: ['#b45309', '#f59e0b'],
  committee: ['#0f766e', '#14b8a6'],
  awards: ['#92400e', '#eab308'],
  media: ['#a21caf', '#e879f9'],
} as const;

/** "More" tab: cards for the smaller sections, the tournament at a glance and shortcuts. */
export default function MorePage() {
  const { t } = useTranslation();
  const f = useFormat();
  const [qrOpen, setQrOpen] = useState(false);
  const photos = useLatestPhotos(3);
  const members = COMMITTEE_MEMBERS.filter((m) => m.name);
  const faces = members.flatMap((m) => (m.photo ? [m.photo] : [])).slice(0, 4);
  const extra = members.length - faces.length;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-3xl lg:max-w-5xl">
      <div>
        <PageTitle>{t('tabs.more')}</PageTitle>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('more.subtitle')}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:items-start">
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard
            onClick={() => setQrOpen(true)}
            icon="share"
            colors={CARD_COLORS.share}
            title={t('shareApp.title')}
            hint={t('shareApp.hint')}
            art={<ShareArt qr={QR} />}
          />
          <FeatureCard
            to="/stats"
            icon="stats"
            colors={CARD_COLORS.stats}
            title={t('more.stats')}
            hint={t('more.statsHint')}
            art={<StatsArt />}
          />
          <FeatureCard
            to="/rules"
            icon="rules"
            colors={CARD_COLORS.rules}
            title={t('more.rules')}
            hint={t('more.rulesHint')}
            art={<RulesArt />}
          />
          <FeatureCard
            to="/committee"
            icon="committee"
            colors={CARD_COLORS.committee}
            title={t('more.committee')}
            hint={t('more.committeeHint')}
            art={<CommitteeArt photos={faces} more={extra > 0 ? `+${f.num(extra)}` : null} />}
          />
          <FeatureCard
            to="/awards"
            icon="awards"
            colors={CARD_COLORS.awards}
            title={t('more.awards')}
            hint={t('more.awardsHint')}
            art={<AwardsArt />}
          />
          <FeatureCard
            to="/media"
            icon="image"
            colors={CARD_COLORS.media}
            title={t('more.media')}
            hint={t('more.mediaHint')}
            art={<MediaArt photo={photos?.[0]} logo={BPL_LOGO} />}
          />
          <ThemeCard />
        </div>
        <aside className="grid gap-4 md:grid-cols-2 lg:flex lg:flex-col">
          <Glance members={members.length} />
          <Shortcuts onShowQr={() => setQrOpen(true)} />
          {photos && photos.length > 0 && (
            <Box
              title={t('more.latestPhotos')}
              icon="image"
              iconClass="text-fuchsia-600 dark:text-fuchsia-400"
              action={
                <Link
                  to="/media"
                  className="ml-auto inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300"
                >
                  {t('more.viewAll')}
                  <Icon name="arrowRight" className="size-4" />
                </Link>
              }
            >
              <Link
                to="/media"
                aria-label={t('more.latestPhotos')}
                className="grid grid-cols-3 gap-2"
              >
                {photos.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded-lg bg-slate-200 object-cover dark:bg-slate-800"
                  />
                ))}
              </Link>
            </Box>
          )}
        </aside>
      </div>
      {/* For scorers and the organisers; viewers don't need it up front */}
      <Link
        to="/admin"
        className="mx-auto mt-2 flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Icon name="lock" className="size-4" />
        {t('more.adminLink')}
      </Link>
      <ShareSheet open={qrOpen} onClose={() => setQrOpen(false)} />
    </main>
  );
}

/** A big coloured card: icon, title, hint, an arrow, and a picture in the corner. */
function FeatureCard({
  to,
  onClick,
  icon,
  colors: [a, b],
  title,
  hint,
  art,
}: {
  to?: string;
  onClick?: () => void;
  icon: IconName;
  colors: readonly [string, string];
  title: string;
  hint: string;
  art: ReactNode;
}) {
  const cls =
    'more-card relative flex min-h-28 flex-col overflow-hidden rounded-2xl p-4 text-left active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--b) sm:min-h-48';
  const style = { '--a': a, '--b': b } as CSSProperties;
  const body = (
    <>
      {/* Phones: icon beside the title to keep the cards short */}
      <span className="relative z-10 flex items-center gap-3 sm:block">
        <span className="more-icon grid size-11 shrink-0 place-items-center rounded-xl text-white">
          <Icon name={icon} />
        </span>
        <span className="max-w-[58%] font-display text-2xl leading-none font-bold tracking-wide text-slate-900 sm:mt-3 sm:block dark:text-white">
          {title}
        </span>
      </span>
      <span className="relative z-10 mt-1.5 max-w-[55%] text-sm leading-snug text-slate-700 dark:text-slate-200">
        {hint}
      </span>
      <span
        aria-hidden
        className="relative z-10 mt-auto hidden h-6 w-10 place-items-center rounded-full border border-slate-900/10 bg-white/70 text-slate-700 dark:border-white/20 dark:bg-white/15 dark:text-white sm:grid"
      >
        <Icon name="arrowRight" className="size-4" />
      </span>
      {art}
    </>
  );
  return to ? (
    <Link to={to} className={cls} style={style}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {body}
    </button>
  );
}

/** The three looks, in the order they are offered. 'system' (never chosen) shows as dark. */
const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'dark', label: 'more.themeDark', icon: '🌙' },
  { id: 'light', label: 'more.themeLight', icon: '☀️' },
  { id: 'neon', label: 'more.themeNeon', icon: '✨' },
];

/**
 * Theme: dark, sunlight (the light theme, for bright sun) or neon (dark with a
 * stadium-broadcast look), across the full width of the cards.
 */
function ThemeCard() {
  const { t } = useTranslation();
  const theme = usePrefs((s) => (s.theme === 'system' ? 'dark' : s.theme));
  const setTheme = usePrefs((s) => s.setTheme);
  return (
    <fieldset className="more-sun relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden rounded-2xl border border-slate-200 p-4 shadow-sm sm:col-span-2 dark:border-slate-800">
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400"
      >
        <Icon name="sun" />
      </span>
      <span className="relative z-10 min-w-0 flex-1">
        <legend className="float-left block font-display text-xl font-bold tracking-wide">
          {t('more.theme')}
        </legend>
        <span className="clear-left block text-sm text-slate-700 dark:text-slate-300">
          {t('more.themeHint')}
        </span>
      </span>
      <span className="relative z-10 grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto dark:bg-night-950/80">
        {THEMES.map((th) => (
          <label key={th.id} className="cursor-pointer">
            <input
              type="radio"
              name="theme"
              value={th.id}
              checked={theme === th.id}
              onChange={() => setTheme(th.id)}
              className="peer sr-only"
            />
            <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap text-slate-700 peer-checked:bg-bpl-yellow peer-checked:text-night-950 peer-focus-visible:ring-2 peer-focus-visible:ring-bpl-yellow/60 dark:text-slate-200">
              <span aria-hidden>{th.icon}</span>
              {t(th.label)}
            </span>
          </label>
        ))}
      </span>
    </fieldset>
  );
}

function Box({
  title,
  icon,
  iconClass,
  action,
  children,
}: {
  title: string;
  icon: IconName;
  iconClass: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold tracking-wide">
        <Icon name={icon} className={`size-5 ${iconClass}`} />
        {title}
        {action}
      </h2>
      {children}
    </section>
  );
}

const GLANCE_TILE = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  violet:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
  amber:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  teal: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300',
} as const;

/** The tournament in four numbers, each a link to its page. */
function Glance({ members }: { members: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const rules = RULE_SECTIONS.reduce((n, s) => n + s.rules.length, 0);
  const tiles: [string, IconName, number, string, keyof typeof GLANCE_TILE][] = [
    ['/fixtures', 'calendar', FIXTURES.length, t('more.glanceMatches'), 'blue'],
    ['/teams', 'teams', TOURNAMENT_TEAMS.length, t('more.glanceTeams'), 'violet'],
    ['/rules', 'rules', rules, t('more.glanceRules'), 'amber'],
    ['/committee', 'committee', members, t('more.glanceCommittee'), 'teal'],
  ];
  return (
    <Box title={t('more.glance')} icon="stats" iconClass="text-emerald-600 dark:text-emerald-400">
      <ul className="grid grid-cols-2 gap-2">
        {tiles.map(([to, icon, n, label, tone]) => (
          <li key={to}>
            <Link
              to={to}
              className={`flex h-full items-center gap-2.5 rounded-xl border p-2.5 active:opacity-80 ${GLANCE_TILE[tone]}`}
            >
              <Icon name={icon} className="size-6 shrink-0" />
              <span className="min-w-0">
                <span className="block font-display text-3xl leading-none font-extrabold text-slate-900 dark:text-white">
                  {f.num(n)}
                </span>
                <span className="block text-xs leading-tight text-slate-700 dark:text-slate-300">
                  {label}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Box>
  );
}

/** Things people come to this tab to do quickly. */
function Shortcuts({ onShowQr }: { onShowQr: () => void }) {
  const { t } = useTranslation();
  const row =
    'flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold active:bg-slate-100 dark:border-slate-700 dark:bg-night-950 dark:active:bg-slate-800';
  const inner = (icon: IconName, label: string) => (
    <>
      <Icon name={icon} className="size-5 shrink-0 text-slate-600 dark:text-slate-300" />
      <span className="flex-1">{label}</span>
      <Icon name="arrowRight" className="size-4 shrink-0 text-slate-500 dark:text-slate-400" />
    </>
  );
  return (
    <Box title={t('more.quick')} icon="arrowRight" iconClass="text-amber-600 dark:text-amber-400">
      <ul className="flex flex-col gap-2">
        <li>
          <button type="button" onClick={onShowQr} className={row}>
            {inner('qr', t('more.showQr'))}
          </button>
        </li>
        <li>
          <a href={fixturePdfUrl} download={FIXTURE_PDF_NAME} className={row}>
            {inner('download', t('more.fixturePdf'))}
          </a>
        </li>
        <li>
          <a href={assetUrl(POSTER)} download className={row}>
            {inner('download', t('more.qrPoster'))}
          </a>
        </li>
        {pushSupport() !== 'off' && (
          <li>
            <Link to="/alerts" className={row}>
              {inner('bell', t('more.alerts'))}
            </Link>
          </li>
        )}
      </ul>
    </Box>
  );
}

/** Thumbnails of the newest gallery photos; null while loading or when the gallery can't be reached. */
function useLatestPhotos(n: number): string[] | null {
  const [urls, setUrls] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    listMedia()
      .then((list) => alive && setUrls(list.slice(0, n).map((m) => photoUrl(m.thumb_path))))
      .catch(() => alive && setUrls(null));
    return () => {
      alive = false;
    };
  }, [n]);
  return urls;
}

/** The QR code points at the live site; regenerate it if the address changes. */
const QR = 'images/bpl-2027-qr.png';
const POSTER = 'downloads/bpl-2027-qr-poster.jpg';

/**
 * "Share the app": a QR code a friend can scan straight off this screen,
 * the phone's share sheet for the link, and the printable QR poster.
 */
function ShareSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  async function onShareLink() {
    const url = window.location.href.split('#')[0];
    const res = await shareText(t('shareApp.title'), t('shareApp.message'), url);
    if (res === 'copied') toast(t('shareApp.copied'));
    else if (res === 'failed') toast(t('share.failed'));
  }

  return (
    <Sheet
      open={open}
      title={t('shareApp.title')}
      onClose={onClose}
      footer={
        <>
          <a href={assetUrl(POSTER)} download className={`${btn.secondary} flex-1 text-center`}>
            {t('shareApp.poster')}
          </a>
          <button type="button" onClick={onShareLink} className={`${btn.primary} flex-1`}>
            {t('shareApp.shareLink')}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 pb-1 text-center">
        <p className="text-slate-600 dark:text-slate-300">{t('shareApp.scan')}</p>
        <img
          src={assetUrl(QR)}
          alt={t('shareApp.qrAlt')}
          width={900}
          height={900}
          className="aspect-square w-full max-w-72 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 dark:ring-0"
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('shareApp.install')}</p>
      </div>
    </Sheet>
  );
}
