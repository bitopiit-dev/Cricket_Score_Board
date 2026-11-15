import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
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
import { FIXTURE_OVERS, fixturesOn, fixtureById, todayInDhaka } from '../data/fixtures';
import { TOURNAMENT_TEAMS, findTeam, playerDisplayName } from '../data/teams';
import { useTournament } from '../hooks/useTournament';
import { usePrefs } from '../store/prefsStore';
import { fixtureTeams } from '../tournament/standings';
import { fixtureLabel, formatTime, slotLabel, stageLabel } from '../utils/fixtureText';
import { captainMark } from '../utils/matchText';
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

  const lang = usePrefs((s) => s.lang);
  const tour = useTournament();

  // Fixture link: pick a date, then one of that day's matches.
  const [date, setDate] = useState(todayInDhaka);
  /** Fixture id, or null for a match outside the fixture (friendly / practice). */
  const [fixtureId, setFixtureId] = useState<string | null>(null);
  /** Fields filled from the fixture are locked until the scorer chooses to edit. */
  const [manualEdit, setManualEdit] = useState(false);
  const fixture = fixtureById(fixtureId ?? undefined);
  const dayFixtures = fixturesOn(date);
  const sidesOf = (id: string): [string | null, string | null] =>
    tour ? fixtureTeams(fixtureById(id)!, tour.ts) : [null, null];
  const existing = fixture && tour?.ts.outcomes.get(fixture.id);
  const alreadyStarted = existing && existing.status !== 'scheduled' ? existing : undefined;

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

  function pickFixture(id: string | null) {
    setFixtureId(id);
    setManualEdit(false);
    if (id === null) return;
    const [a, b] = sidesOf(id);
    setTeamIds([a ?? '', b ?? '']);
    setTeamNames(['', '']);
    setXi([null, null]);
    // Fixture matches follow the tournament rules (12 overs)
    setRules(allRules(true));
  }
  /** A side is locked when the fixture already names its team. */
  const sideLocked = (i: TeamIndex) => !!fixture && !manualEdit && sidesOf(fixture.id)[i] !== null;

  // Playing XI from the squad: chosen player ids per side (null = default selection).
  const [xi, setXi] = useState<[string[] | null, string[] | null]>([null, null]);
  const squadOf = (i: TeamIndex) => findTeam(teamIds[i])?.players ?? [];
  const xiOf = (i: TeamIndex): string[] =>
    xi[i] ??
    squadOf(i)
      .filter((p) => !p.substitute)
      .slice(0, playersPerSide)
      .map((p) => p.id);
  const xiNeeded = (i: TeamIndex) => Math.min(playersPerSide, squadOf(i).length);
  const toggleXi = (i: TeamIndex, id: string) =>
    setXi((prev) => {
      const cur = prev[i] ?? xiOf(i);
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return i === 0 ? [next, prev[1]] : [prev[0], next];
    });
  const xiReady = ([0, 1] as TeamIndex[]).every(
    (i) => squadOf(i).length === 0 || xiOf(i).length === xiNeeded(i),
  );
  const sameTeam = teamIds[0] !== '' && teamIds[0] === teamIds[1];
  const canStart = !saving && !alreadyStarted && xiReady && !sameTeam;

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
    if (!canStart) return;
    setSaving(true);
    const teams = ([0, 1] as const).map((i): Team => {
      const squad = squadOf(i);
      const players =
        squad.length > 0
          ? // Squad players keep a stable id (team/player) across matches
            squad
              .filter((p) => xiOf(i).includes(p.id))
              .map((p) => ({
                id: `${teamIds[i]}/${p.id}`,
                name: playerDisplayName(p),
                ...(p.shortName ? { shortName: p.shortName } : {}),
                ...(p.captain ? { captain: true } : {}),
                ...(p.viceCaptain ? { viceCaptain: true } : {}),
              }))
          : playerNames[i].slice(0, playersPerSide).map((n, j) => ({
              id: newId(),
              name: n.trim() || t('newMatch.playerDefault', { n: f.num(j + 1) }),
            }));
      return {
        ...(findTeam(teamIds[i]) ? { teamId: teamIds[i] } : {}),
        name: displayName(i),
        players,
      };
    }) as [Team, Team];
    const id = await createMatch({
      ...(fixture ? { fixtureId: fixture.id } : {}),
      teams,
      toss: { winner: tossWinner, decision },
      settings: {
        overs,
        wideRuns,
        noBallRuns,
        freeHit: rules.noFreeHit ? false : freeHit,
        lastManStands,
        maxOversPerBowler: bowlerLimit,
        sixOut: rules.sixOut,
        shortPitch: rules.shortPitch,
        catchNewBatterOnStrike: rules.catchNewBatterOnStrike,
        reviewsPerTeam: rules.reviewsPerTeam ? TOURNAMENT_RULES.reviewsPerTeam : 0,
        superOver: rules.superOver,
      },
    });
    navigate(`/match/${id}`, { replace: true });
  }

  return (
    <div className="min-h-dvh">
      <Header title={t('newMatch.title')} backTo="/home" />
      <form onSubmit={onSubmit} className="mx-auto flex max-w-lg flex-col gap-4 p-4 pb-28">
        <Card className="ring-2 ring-sky-500/30">
          <SectionTitle>{t('newMatch.fixture')}</SectionTitle>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t('newMatch.date')}
              </span>
              <input
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  pickFixture(null);
                }}
              />
            </label>
            {dayFixtures.length === 0 ? (
              <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {t('newMatch.noFixtureOnDate')}
              </p>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t('newMatch.fixtureMatch')}
                </span>
                <select
                  className={inputClass}
                  value={fixtureId ?? ''}
                  onChange={(e) => pickFixture(e.target.value || null)}
                >
                  <option value="">{t('newMatch.outsideFixture')}</option>
                  {dayFixtures.map((fx) => (
                    <option key={fx.id} value={fx.id}>
                      {fixtureLabel(fx, sidesOf(fx.id), lang, t, f)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!fixture && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('newMatch.outsideFixtureHint')}
              </p>
            )}
            {fixture && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-sky-50 p-3 text-sm dark:bg-sky-950/40">
                <dt className="text-slate-500">{t('newMatch.matchNo')}</dt>
                <dd className="font-semibold">{f.num(fixture.no)}</dd>
                <dt className="text-slate-500">{t('newMatch.stage')}</dt>
                <dd className="font-semibold">{stageLabel(fixture.stage, t)}</dd>
                <dt className="text-slate-500">{t('newMatch.startTime')}</dt>
                <dd className="font-semibold">{formatTime(fixture.time, lang, f)}</dd>
                <dt className="text-slate-500">{t('newMatch.venue')}</dt>
                <dd className="font-semibold">{fixture.venue ?? t('newMatch.venueTbd')}</dd>
                <dt className="text-slate-500">{t('newMatch.overs')}</dt>
                <dd className="font-semibold">{f.num(FIXTURE_OVERS)}</dd>
              </dl>
            )}
            {alreadyStarted && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <p className="font-semibold">
                  {alreadyStarted.status === 'completed'
                    ? t('newMatch.fixtureDone')
                    : t('newMatch.fixtureStarted')}
                </p>
                <Link
                  to={`/match/${alreadyStarted.match!.id}`}
                  replace
                  className={`${btn.primary} text-center`}
                >
                  {alreadyStarted.status === 'completed'
                    ? t('newMatch.viewMatch')
                    : t('newMatch.openMatch')}
                </Link>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>{t('newMatch.teams')}</SectionTitle>
            {fixture && (
              <button
                type="button"
                onClick={() => setManualEdit((v) => !v)}
                className="mb-3 rounded-lg px-2 py-1 text-sm font-semibold text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"
              >
                {manualEdit ? `🔒 ${t('newMatch.lockAgain')}` : `✏️ ${t('newMatch.editManually')}`}
              </button>
            )}
          </div>
          <div className="flex flex-col gap-4">
            {([0, 1] as const).map((i) => {
              const picked = findTeam(teamIds[i]);
              const other = teamIds[i === 0 ? 1 : 0];
              const locked = sideLocked(i);
              const pending = fixture && !picked ? (i === 0 ? fixture.teamA : fixture.teamB) : null;
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
                        className={`${inputClass} disabled:opacity-70`}
                        disabled={locked}
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
                  {locked && (
                    <span className="text-xs text-sky-700 dark:text-sky-400">
                      🔒 {t('newMatch.fromFixture')}
                    </span>
                  )}
                  {pending && pending.kind !== 'team' && (
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      {t('newMatch.slotPending', { slot: slotLabel(pending, null, t, f) })}
                    </span>
                  )}
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
              label={t('newMatch.ruleNoFreeHit')}
              checked={rules.noFreeHit}
              onChange={(on) => setRule('noFreeHit', on)}
            />
            <Toggle
              label={t('newMatch.ruleBowlerLimit', {
                n: f.num(TOURNAMENT_RULES.maxOversPerBowler),
              })}
              checked={rules.maxOversPerBowler}
              onChange={(on) => setRule('maxOversPerBowler', on)}
            />
            <Toggle
              label={t('newMatch.ruleCatchStrike')}
              checked={rules.catchNewBatterOnStrike}
              onChange={(on) => setRule('catchNewBatterOnStrike', on)}
            />
            <Toggle
              label={t('newMatch.ruleReview', { n: f.num(TOURNAMENT_RULES.reviewsPerTeam) })}
              checked={rules.reviewsPerTeam}
              onChange={(on) => setRule('reviewsPerTeam', on)}
            />
            <Toggle
              label={t('newMatch.ruleSuperOver')}
              checked={rules.superOver}
              onChange={(on) => setRule('superOver', on)}
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
              {squadOf(ti).length > 0 ? (
                <div className="mt-2">
                  <p
                    className={`mb-2 text-sm font-semibold ${
                      xiOf(ti).length === xiNeeded(ti)
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {t('newMatch.xiCount', {
                      n: f.num(xiOf(ti).length),
                      of: f.num(xiNeeded(ti)),
                    })}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {squadOf(ti).map((p) => {
                      const on = xiOf(ti).includes(p.id);
                      const full = !on && xiOf(ti).length >= xiNeeded(ti);
                      return (
                        <li key={p.id}>
                          <label
                            className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                              full ? 'opacity-40' : 'cursor-pointer'
                            } ${on ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="size-5 accent-emerald-700"
                              checked={on}
                              disabled={full}
                              onChange={() => toggleXi(ti, p.id)}
                            />
                            <span className="flex-1">
                              {playerDisplayName(p)}
                              {p.shortName && ` (${p.shortName})`}
                              {captainMark(p)}
                            </span>
                            {p.substitute && (
                              <span className="text-xs text-slate-500">
                                {t('team.substitutes')}
                              </span>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
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
              )}
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
              <Toggle
                label={t('newMatch.freeHit')}
                checked={rules.noFreeHit ? false : freeHit}
                onChange={setFreeHit}
                disabled={rules.noFreeHit}
                hint={rules.noFreeHit ? ruleHint : undefined}
              />
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
            disabled={!canStart}
            className={`${btn.primary} mx-auto block w-full max-w-lg text-lg`}
          >
            {t('newMatch.startMatch')}
          </button>
        </div>
      </form>
    </div>
  );
}
