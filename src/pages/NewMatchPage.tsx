import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/common/Header';
import {
  Card,
  SectionTitle,
  Segmented,
  Stepper,
  Toggle,
  btn,
  inputClass,
} from '../components/common/controls';
import { DEFAULT_SETTINGS, defaultMaxOversPerBowler } from '../engine/rules';
import type { Team, TeamIndex } from '../engine/types';
import { createMatch } from '../store/matchStore';
import { useFormat } from '../hooks/useFormat';
import { newId } from '../utils/id';

const MAX_PLAYERS = 20;
const emptyNames = () => Array.from({ length: MAX_PLAYERS }, () => '');

export default function NewMatchPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();

  const [teamNames, setTeamNames] = useState<[string, string]>(['', '']);
  const [playersPerSide, setPlayersPerSide] = useState(11);
  const [playerNames, setPlayerNames] = useState<[string[], string[]]>([
    emptyNames(),
    emptyNames(),
  ]);
  const [overs, setOvers] = useState(DEFAULT_SETTINGS.overs);
  const [tossWinner, setTossWinner] = useState<TeamIndex>(0);
  const [decision, setDecision] = useState<'bat' | 'bowl'>('bat');
  const [wideRuns, setWideRuns] = useState(DEFAULT_SETTINGS.wideRuns);
  const [noBallRuns, setNoBallRuns] = useState(DEFAULT_SETTINGS.noBallRuns);
  const [freeHit, setFreeHit] = useState(DEFAULT_SETTINGS.freeHit);
  const [lastManStands, setLastManStands] = useState(DEFAULT_SETTINGS.lastManStands);
  const [limitOn, setLimitOn] = useState(true);
  /** null = follow the default for the chosen overs. */
  const [customLimit, setCustomLimit] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const bowlerLimit = customLimit ?? defaultMaxOversPerBowler(overs);
  const displayName = (i: TeamIndex) =>
    teamNames[i].trim() || t('newMatch.teamDefault', { n: f.num(i + 1) });

  const setPlayerName = (team: TeamIndex, idx: number, name: string) =>
    setPlayerNames((prev) => {
      const next: [string[], string[]] = [[...prev[0]], [...prev[1]]];
      next[team][idx] = name;
      return next;
    });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const teams = ([0, 1] as const).map((i): Team => ({
      name: displayName(i),
      players: playerNames[i].slice(0, playersPerSide).map((n, j) => ({
        id: newId(),
        name: n.trim() || t('newMatch.playerDefault', { n: f.num(j + 1) }),
      })),
    })) as [Team, Team];
    const id = await createMatch({
      teams,
      toss: { winner: tossWinner, decision },
      settings: {
        overs,
        wideRuns,
        noBallRuns,
        freeHit,
        lastManStands,
        maxOversPerBowler: limitOn ? Math.min(bowlerLimit, overs) : null,
      },
    });
    navigate(`/match/${id}`, { replace: true });
  }

  return (
    <div className="min-h-dvh">
      <Header title={t('newMatch.title')} backTo="/" />
      <form onSubmit={onSubmit} className="mx-auto flex max-w-lg flex-col gap-4 p-4 pb-28">
        <Card>
          <SectionTitle>{t('newMatch.teams')}</SectionTitle>
          <div className="flex flex-col gap-3">
            {([0, 1] as const).map((i) => (
              <label key={i} className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t('newMatch.teamName', { n: f.num(i + 1) })}
                </span>
                <input
                  className={inputClass}
                  value={teamNames[i]}
                  maxLength={30}
                  placeholder={t('newMatch.teamDefault', { n: f.num(i + 1) })}
                  onChange={(e) =>
                    setTeamNames((p) => (i === 0 ? [e.target.value, p[1]] : [p[0], e.target.value]))
                  }
                />
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <Stepper label={t('newMatch.overs')} value={overs} min={1} max={50} onChange={setOvers} />
          <Stepper
            label={t('newMatch.playersPerSide')}
            value={playersPerSide}
            min={2}
            max={MAX_PLAYERS}
            onChange={setPlayersPerSide}
          />
        </Card>

        <Card>
          <SectionTitle>{t('newMatch.players')}</SectionTitle>
          {([0, 1] as const).map((ti) => (
            <details
              key={ti}
              className="group border-b border-slate-200 py-2 last:border-0 dark:border-slate-800"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-1 font-semibold">
                {t('newMatch.playersOf', { team: displayName(ti) })}
                <span className="text-slate-400 transition group-open:rotate-90">›</span>
              </summary>
              <ol className="mt-2 flex flex-col gap-2">
                {Array.from({ length: playersPerSide }, (_, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <span className="tabular w-6 text-right text-sm text-slate-400">
                      {f.num(j + 1)}
                    </span>
                    <input
                      className={inputClass}
                      value={playerNames[ti][j]}
                      maxLength={30}
                      placeholder={t('newMatch.playerDefault', { n: f.num(j + 1) })}
                      onChange={(e) => setPlayerName(ti, j, e.target.value)}
                    />
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </Card>

        <Card>
          <SectionTitle>{t('newMatch.toss')}</SectionTitle>
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1 text-sm text-slate-600 dark:text-slate-400">
                {t('newMatch.tossWinner')}
              </div>
              <Segmented
                value={tossWinner}
                onChange={setTossWinner}
                options={[
                  { value: 0, label: displayName(0) },
                  { value: 1, label: displayName(1) },
                ]}
              />
            </div>
            <div>
              <div className="mb-1 text-sm text-slate-600 dark:text-slate-400">
                {t('newMatch.decision')}
              </div>
              <Segmented
                value={decision}
                onChange={setDecision}
                options={[
                  { value: 'bat', label: t('newMatch.bat') },
                  { value: 'bowl', label: t('newMatch.bowl') },
                ]}
              />
            </div>
          </div>
        </Card>

        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t('newMatch.rules')}
              <span className="transition group-open:rotate-90">›</span>
            </summary>
            <div className="mt-3 flex flex-col">
              <Stepper
                label={t('newMatch.wideRuns')}
                value={wideRuns}
                min={0}
                max={5}
                onChange={setWideRuns}
              />
              <Stepper
                label={t('newMatch.noBallRuns')}
                value={noBallRuns}
                min={0}
                max={5}
                onChange={setNoBallRuns}
              />
              <Toggle label={t('newMatch.freeHit')} checked={freeHit} onChange={setFreeHit} />
              <Toggle
                label={t('newMatch.lastManStands')}
                checked={lastManStands}
                onChange={setLastManStands}
              />
              <Toggle
                label={`${t('newMatch.bowlerLimit')}${limitOn ? '' : ` — ${t('newMatch.noLimit')}`}`}
                checked={limitOn}
                onChange={setLimitOn}
              />
              {limitOn && (
                <Stepper
                  label={t('newMatch.bowlerLimit')}
                  value={Math.min(bowlerLimit, overs)}
                  min={1}
                  max={overs}
                  onChange={setCustomLimit}
                />
              )}
            </div>
          </details>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <button
            type="submit"
            disabled={saving}
            className={`${btn.primary} mx-auto block w-full max-w-lg text-lg`}
          >
            {t('newMatch.startMatch')}
          </button>
        </div>
      </form>
    </div>
  );
}
