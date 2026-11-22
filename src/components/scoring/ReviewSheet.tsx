import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { InningsState, Match, TeamIndex } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { btn } from '../common/controls';
import { FieldLabel, OptionGrid } from '../common/OptionGrid';
import { Sheet } from '../common/Sheet';

/** Record a review: which team asked, and whether it succeeded (rule 27). */
export function ReviewSheet({
  match,
  inn,
  reviewsLeft,
  onClose,
  onConfirm,
}: {
  match: Match;
  inn: InningsState;
  reviewsLeft: [number, number];
  onClose: () => void;
  onConfirm: (team: TeamIndex, successful: boolean) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  // Usually the fielding side reviews an "not out", the batting side an "out".
  const firstWithReview = ([inn.bowlingTeam, inn.battingTeam] as TeamIndex[]).find(
    (team) => reviewsLeft[team] > 0,
  );
  const [team, setTeam] = useState<TeamIndex | null>(firstWithReview ?? null);
  const [successful, setSuccessful] = useState<boolean | null>(null);

  return (
    <Sheet
      open
      title={t('scoring.review')}
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={team === null || successful === null}
          className={`${btn.primary} flex-1`}
          onClick={() => team !== null && successful !== null && onConfirm(team, successful)}
        >
          {t('common.confirm')}
        </button>
      }
    >
      <FieldLabel>{t('scoring.reviewBy')}</FieldLabel>
      <OptionGrid
        cols={2}
        value={team}
        onChange={setTeam}
        options={([0, 1] as TeamIndex[]).map((i) => ({
          value: i,
          disabled: reviewsLeft[i] <= 0,
          label: (
            <span className="flex flex-col">
              <span className="truncate">{match.teams[i].name}</span>
              <span className="text-xs font-normal opacity-80">
                {reviewsLeft[i] > 0
                  ? `${t('scoring.reviewsLeft')}: ${f.num(reviewsLeft[i])}`
                  : t('scoring.reviewNoneLeft')}
              </span>
            </span>
          ),
        }))}
      />
      <FieldLabel>{t('scoring.reviewResult')}</FieldLabel>
      <OptionGrid
        cols={2}
        value={successful === null ? null : successful ? 'yes' : 'no'}
        onChange={(v) => setSuccessful(v === 'yes')}
        options={[
          { value: 'yes', label: t('scoring.reviewSuccessful') },
          { value: 'no', label: t('scoring.reviewFailed') },
        ]}
      />
    </Sheet>
  );
}
