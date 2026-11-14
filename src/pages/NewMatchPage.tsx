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
import {
  DEFAULT_PLAYERS_PER_SIDE,
  DEFAULT_SETTINGS,
  TOURNAMENT_RULES,
  defaultMaxOversPerBowler,
  type TournamentRule,
} from '../engine/rules';
import type { Team, TeamIndex } from '../engine/types';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { TOURNAMENT_TEAMS, findTeam } from '../data/teams';
import { createMatch } from '../store/matchStore';
import { useFormat } from '../hooks/useFormat';
import { newId } from '../utils/id';

const MAX_PLAYERS = 20;
const emptyNames = () => Array.from({ length: MAX_PLAYERS }, () => '');
const RULE_KEYS = Object.keys(TOURNAMENT_RULES) as TournamentRule[];
const allRules = (on: boolean) =>
  Object.fromEntries(RULE_KEYS.map((k) => [k, on])) as Record<TournamentRule, boolean>;

export default function NewMatchPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();

  /** Tournament team id per side; '' = other team with a typed name. */
  const [teamIds, setTeamIds] = useState<[string, string]>(['', '']);
  const [teamNames, setTeamNames] = useState<[string, string]>(['', '']);
  const [playerNames, setPlayerNames] = useState<[string[], string[]]>([
    emptyNames(),
    emptyNames(),
  ]);
  const [tossWinner, setTossWinner] = useState<TeamIndex>(0);
  const [decision, setDecision] = useState<'bat' | 'bowl'>('bat');

  // Tournament rules: each one, when on, fixes its setting.
  const [rules, setRules] = useState(allRules(true));
  const setRule = (k: TournamentRule, on: boolean) => setRules((r) => ({ ...r, [k]: on }));
  const allOn = RULE_KEYS.every((k) => rules[k]);

  // Free values, used when the matching rule is off.
  const [oversFree, setOvers] = useState(DEFAULT_SETTINGS.overs);
  const [playersFree, setPlayersPerSide] = useState(DEFAULT_PLAYERS_PER_SIDE);
  const [wideRuns, setWideRuns] = useState(DEFAULT_SETTINGS.wideRuns);
  const [noBallRuns, setNoBallRuns] = useState(DEFAULT_SETTINGS.noBallRuns);
  const [freeHit, setFreeHit] = useState(DEFAULT_SETTINGS.freeHit);
  const [lastManStands, setLastManStands] = useState(DEFAULT_SETTINGS.lastManStands);
  const [limitOn, setLimitOn] = useState(true);
  /** null = follow the default for the chosen overs. */
  const [customLimit, setCustomLimit] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const overs = rules.overs ? TOURNAMENT_RULES.overs : oversFree;
  const playersPerSide = rules.playersPerSide ? TOURNAMENT_RULES.playersPerSide : playersFree;
  const bowlerLimit: number | null = rules.maxOversPerBowler
    ? Math.min(TOURNAMENT_RULES.maxOversPerBowler, overs)
    : limitOn
      ? Math.min(customLimit ?? defaultMaxOversPerBowler(overs), overs)
      : null;
  const ruleHint = t('newMatch.fixedByRule');

  const displayName = (i: TeamIndex) =>
    findTeam(teamIds[i])?.name ??
    (teamNames[i].trim() || t('newMatch.teamDefault', { n: f.num(i + 1) }));

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
      ...(findTeam(teamIds[i]) ? { teamId: teamIds[i] } : {}),
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
        maxOversPerBowler: bowlerLimit,
        sixOut: rules.sixOut,
        shortPitch: rules.shortPitch,
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
          <div className="flex flex-col gap-4">
            {([0, 1] as const).map((i) => {
              const picked = findTeam(teamIds[i]);
              const other = teamIds[i === 0 ? 1 : 0];
              return (
                <div key={i} className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {t('newMatch.teamName', { n: f.num(i + 1) })}
                    </span>
                    <div className="flex items-center gap-2">
                      <TeamAvatar
                        name={displayName(i)}
                        color={picked?.color}
                        logo={picked?.logo}
                        size="sm"
                      />
                      <select
                        className={inputClass}
                        value={teamIds[i]}
                        onChange={(e) =>
                          setTeamIds((p) =>
                            i === 0 ? [e.target.value, p[1]] : [p[0], e.target.value],
                          )
                        }
                      >
                        <option value="">{t('newMatch.otherTeam')}</option>
                        <optgroup label={t('newMatch.pickTeam')}>
                          {TOURNAMENT_TEAMS.map((team) => (
                            <option key={team.id} value={team.id} disabled={team.id === other}>
                              {team.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </label>
                  {!picked && (
                    <input
                      className={inputClass}
                      aria-label={t('newMatch.teamName', { n: f.num(i + 1) })}
                      value={teamNames[i]}
                      maxLength={30}
                      placeholder={t('newMatch.teamDefault', { n: f.num(i + 1) })}
                      onChange={(e) =>
                        setTeamNames((p) =>
                          i === 0 ? [e.target.value, p[1]] : [p[0], e.target.value],
                        )
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="ring-2 ring-emerald-600/30">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>{t('newMatch.tournamentRules')}</SectionTitle>
          </div>
          <Toggle
            label={t('newMatch.applyAll')}
            checked={allOn}
            onChange={(on) => setRules(allRules(on))}
          />
          <div className="mt-1 border-t border-slate-200 pt-1 pl-2 dark:border-slate-800">
            <Toggle
              label={t('newMatch.ruleOvers', { n: f.num(TOURNAMENT_RULES.overs) })}
              checked={rules.overs}
              onChange={(on) => setRule('overs', on)}
            />
            <Toggle
              label={t('newMatch.rulePlayers', {
                n: f.num(TOURNAMENT_RULES.playersPerSide),
                w: f.num(TOURNAMENT_RULES.playersPerSide - 1),
              })}
              checked={rules.playersPerSide}
              onChange={(on) => setRule('playersPerSide', on)}
            />
            <Toggle
              label={t('newMatch.ruleShortPitch')}
              checked={rules.shortPitch}
              onChange={(on) => setRule('shortPitch', on)}
            />
            <Toggle
              label={t('newMatch.ruleSixOut')}
              checked={rules.sixOut}
              onChange={(on) => setRule('sixOut', on)}
            />
            <Toggle
              label={t('newMatch.ruleBowlerLimit', {
                n: f.num(TOURNAMENT_RULES.maxOversPerBowler),
              })}
              checked={rules.maxOversPerBowler}
              onChange={(on) => setRule('maxOversPerBowler', on)}
            />
          </div>
        </Card>

        <Card>
          <Stepper
            label={t('newMatch.overs')}
            value={overs}
            min={1}
            max={50}
            onChange={setOvers}
            locked={rules.overs}
            hint={rules.overs ? ruleHint : undefined}
          />
          <Stepper
            label={t('newMatch.playersPerSide')}
            value={playersPerSide}
            min={2}
            max={MAX_PLAYERS}
            onChange={setPlayersPerSide}
            locked={rules.playersPerSide}
            hint={rules.playersPerSide ? ruleHint : undefined}
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
              {rules.maxOversPerBowler ? (
                <Stepper
                  label={t('newMatch.bowlerLimit')}
                  value={bowlerLimit ?? 0}
                  min={1}
                  max={overs}
                  onChange={setCustomLimit}
                  locked
                  hint={ruleHint}
                />
              ) : (
                <>
                  <Toggle
                    label={`${t('newMatch.bowlerLimit')}${limitOn ? '' : ` — ${t('newMatch.noLimit')}`}`}
                    checked={limitOn}
                    onChange={setLimitOn}
                  />
                  {limitOn && bowlerLimit !== null && (
                    <Stepper
                      label={t('newMatch.bowlerLimit')}
                      value={bowlerLimit}
                      min={1}
                      max={overs}
                      onChange={setCustomLimit}
                    />
                  )}
                </>
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
