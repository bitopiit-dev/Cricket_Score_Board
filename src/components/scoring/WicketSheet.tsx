import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { allowedDismissals, strikerOnly } from '../../engine/rules';
import type { ExtraType, InningsState, Match, Wicket } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { captainMark, playerName } from '../../utils/matchText';
import { btn, inputClass } from '../common/controls';
import { FieldLabel, OptionGrid } from '../common/OptionGrid';
import { Sheet } from '../common/Sheet';

type Delivery = 'legal' | ExtraType;
const NEEDS_FIELDER: Wicket['kind'][] = ['caught', 'runOut', 'stumped'];

export interface WicketInput {
  runs: number;
  extra: ExtraType | null;
  wicket: Wicket;
}

/** Rendered only while open, so its state resets each time. */
export function WicketSheet({
  match,
  inn,
  onClose,
  onConfirm,
}: {
  match: Match;
  inn: InningsState;
  onClose: () => void;
  onConfirm: (input: WicketInput) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const [delivery, setDelivery] = useState<Delivery>('legal');
  const extra = delivery === 'legal' ? null : delivery;
  const allowed = allowedDismissals(extra, inn.freeHitNext, match.settings.sixOut);
  const [kindChoice, setKind] = useState<Wicket['kind']>(allowed[0]);
  const kind = allowed.includes(kindChoice) ? kindChoice : allowed[0];
  const [outChoice, setOut] = useState<string>(inn.strikerId!);
  const batterId = strikerOnly(kind) ? inn.strikerId! : outChoice;
  const [runs, setRuns] = useState(0);
  const [fielderId, setFielder] = useState('');

  const atCrease = [inn.strikerId, inn.nonStrikerId].filter((x): x is string => x !== null);

  function confirm() {
    onConfirm({
      runs: kind === 'runOut' ? runs : 0,
      extra,
      wicket: {
        kind,
        batterId,
        ...(fielderId && NEEDS_FIELDER.includes(kind) ? { fielderId } : {}),
      },
    });
  }

  return (
    <Sheet
      open
      title={t('scoring.wicket')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={`${btn.secondary} flex-1`} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className={`${btn.danger} flex-1`} onClick={confirm}>
            {t('common.confirm')}
          </button>
        </>
      }
    >
      <FieldLabel>{t('scoring.deliveryType')}</FieldLabel>
      <OptionGrid
        value={delivery}
        onChange={setDelivery}
        cols={3}
        options={(['legal', 'wide', 'noBall', 'bye', 'legBye'] as const).map((d) => ({
          value: d,
          label: d === 'legal' ? t('scoring.legal') : t(`scoring.${d}`),
        }))}
      />

      <FieldLabel>{t('scoring.howOut')}</FieldLabel>
      <OptionGrid
        value={kind}
        onChange={setKind}
        options={allowed.map((k) => ({ value: k, label: t(`dismissal.${k}`) }))}
      />

      {!strikerOnly(kind) && atCrease.length > 1 && (
        <>
          <FieldLabel>{t('scoring.whoOut')}</FieldLabel>
          <OptionGrid
            value={batterId}
            onChange={setOut}
            cols={2}
            options={atCrease.map((id) => ({
              value: id,
              label: `${playerName(match, id)}${id === inn.strikerId ? ' ●' : ''}`,
            }))}
          />
        </>
      )}

      {kind === 'runOut' && (
        <>
          <FieldLabel>{t('scoring.runsCompleted')}</FieldLabel>
          <OptionGrid
            value={runs}
            onChange={setRuns}
            cols={4}
            options={[0, 1, 2, 3].map((r) => ({ value: r, label: f.num(r) }))}
          />
        </>
      )}

      {NEEDS_FIELDER.includes(kind) && (
        <>
          <FieldLabel>
            {t('scoring.fielder')} ({t('common.optional')})
          </FieldLabel>
          <select
            className={inputClass}
            value={fielderId}
            onChange={(e) => setFielder(e.target.value)}
          >
            <option value="">{t('common.none')}</option>
            {match.teams[inn.bowlingTeam].players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name + captainMark(p)}
              </option>
            ))}
          </select>
        </>
      )}
    </Sheet>
  );
}
