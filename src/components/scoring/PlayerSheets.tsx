import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { availableBatters, battingTeamFor, bowlerEligibility } from '../../engine/rules';
import type { InningsState, Match, RetireKind } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { playerName } from '../../utils/matchText';
import { btn, inputClass } from '../common/controls';
import { FieldLabel, OptionGrid } from '../common/OptionGrid';
import { Sheet } from '../common/Sheet';

interface PickOption {
  id: string;
  name: string;
  note?: string;
  disabled?: boolean;
}

function PlayerList({ options, onPick }: { options: PickOption[]; onPick: (id: string) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {options.map((o) => (
        <li key={o.id}>
          <button
            type="button"
            disabled={o.disabled}
            onClick={() => onPick(o.id)}
            className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-3 text-left font-semibold active:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:active:bg-slate-700"
          >
            <span className="truncate">{o.name}</span>
            {o.note && (
              <span className="shrink-0 text-xs font-normal text-slate-500">{o.note}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function UndoFooter({ onUndo }: { onUndo: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" className={`${btn.secondary} flex-1`} onClick={onUndo}>
      ↶ {t('common.undoLast')}
    </button>
  );
}

/** Required after a wicket / retirement. */
export function NewBatterSheet({
  match,
  inn,
  onPick,
  onUndo,
}: {
  match: Match;
  inn: InningsState;
  onPick: (id: string) => void;
  onUndo: () => void;
}) {
  const { t } = useTranslation();
  const options = availableBatters(inn, match.teams[inn.battingTeam]).map((id) => ({
    id,
    name: playerName(match, id),
    note: inn.batters.some((b) => b.playerId === id && b.retiredHurt)
      ? t('scoring.returning')
      : undefined,
  }));
  return (
    <Sheet open title={t('scoring.selectBatter')} footer={<UndoFooter onUndo={onUndo} />}>
      <PlayerList options={options} onPick={onPick} />
    </Sheet>
  );
}

/** Start of an over (required) or a mid-over change (dismissable). */
export function BowlerSheet({
  match,
  inn,
  onPick,
  onUndo,
  onClose,
}: {
  match: Match;
  inn: InningsState;
  onPick: (id: string) => void;
  onUndo?: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const options = bowlerEligibility(inn, match.teams[inn.bowlingTeam], match.settings)
    .filter((e) => e.playerId !== inn.bowlerId)
    .map((e) => {
      const stats = inn.bowlers.find((b) => b.playerId === e.playerId);
      const figures = stats
        ? `${f.overs(stats.legalBalls)}-${f.num(stats.maidens)}-${f.num(stats.runsConceded)}-${f.num(stats.wickets)}`
        : undefined;
      return {
        id: e.playerId,
        name: playerName(match, e.playerId),
        disabled: e.blocked !== null,
        note: e.blocked ? t(`scoring.${e.blocked}`) : figures,
      };
    });
  return (
    <Sheet
      open
      title={onClose ? t('scoring.changeBowler') : t('scoring.selectBowler')}
      onClose={onClose}
      footer={onUndo && <UndoFooter onUndo={onUndo} />}
    >
      <PlayerList options={options} onPick={onPick} />
    </Sheet>
  );
}

/** Openers and opening bowler for an innings. */
export function OpenersSheet({
  match,
  innings,
  onStart,
  onUndo,
  onClose,
}: {
  match: Match;
  /** Innings played so far; the sheet opens the next one. */
  innings: InningsState[];
  onStart: (strikerId: string, nonStrikerId: string, bowlerId: string) => void;
  onUndo?: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const inningsIndex = innings.length;
  const batTeam = battingTeamFor(inningsIndex, match.toss, innings);
  const batters = match.teams[batTeam].players;
  const bowlers = match.teams[1 - batTeam].players;
  const [striker, setStriker] = useState(batters[0].id);
  const [nonStriker, setNonStriker] = useState(batters[1].id);
  const [bowler, setBowler] = useState('');

  const valid = striker && nonStriker && bowler && striker !== nonStriker;

  const select = (
    value: string,
    onChange: (v: string) => void,
    list: typeof batters,
    placeholder?: boolean,
  ) => (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">— {t('scoring.selectPlayer')} —</option>}
      {list.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  return (
    <Sheet
      open
      title={`${
        inningsIndex >= 2
          ? t('scoring.superOver')
          : t('scoring.inningsN', { n: f.num(inningsIndex + 1) })
      } · ${t('scoring.selectOpeners')}`}
      onClose={onClose}
      footer={
        <>
          {onUndo && <UndoFooter onUndo={onUndo} />}
          <button
            type="button"
            disabled={!valid}
            className={`${btn.primary} flex-1`}
            onClick={() => onStart(striker, nonStriker, bowler)}
          >
            {t('common.start')}
          </button>
        </>
      }
    >
      <p className="mb-2 font-semibold">{match.teams[batTeam].name}</p>
      <FieldLabel>{t('scoring.striker')}</FieldLabel>
      {select(striker, setStriker, batters)}
      <FieldLabel>{t('scoring.nonStriker')}</FieldLabel>
      {select(nonStriker, setNonStriker, batters)}
      {striker === nonStriker && (
        <p className="mt-1 text-sm text-red-600">{t('errors.samePlayer')}</p>
      )}
      <p className="mt-5 mb-2 font-semibold">{match.teams[1 - batTeam].name}</p>
      <FieldLabel>{t('scoring.openingBowler')}</FieldLabel>
      {select(bowler, setBowler, bowlers, true)}
    </Sheet>
  );
}

export function RetireSheet({
  match,
  inn,
  onClose,
  onConfirm,
}: {
  match: Match;
  inn: InningsState;
  onClose: () => void;
  onConfirm: (batterId: string, kind: RetireKind) => void;
}) {
  const { t } = useTranslation();
  const atCrease = [inn.strikerId, inn.nonStrikerId].filter((x): x is string => x !== null);
  const [batterId, setBatterId] = useState(atCrease[0]);
  const [kind, setKind] = useState<RetireKind>('retiredHurt');
  return (
    <Sheet
      open
      title={t('scoring.retire')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={`${btn.secondary} flex-1`} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={`${btn.primary} flex-1`}
            onClick={() => onConfirm(batterId, kind)}
          >
            {t('common.confirm')}
          </button>
        </>
      }
    >
      <FieldLabel>{t('scoring.batter')}</FieldLabel>
      <OptionGrid
        value={batterId}
        onChange={setBatterId}
        cols={2}
        options={atCrease.map((id) => ({ value: id, label: playerName(match, id) }))}
      />
      <FieldLabel>{t('scoring.howOut')}</FieldLabel>
      <OptionGrid
        value={kind}
        onChange={setKind}
        cols={2}
        options={[
          { value: 'retiredHurt', label: t('scoring.retiredHurt') },
          { value: 'retiredOut', label: t('scoring.retiredOut') },
        ]}
      />
    </Sheet>
  );
}
