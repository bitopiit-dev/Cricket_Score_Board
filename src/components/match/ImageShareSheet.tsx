import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../common/Sheet';
import { toast } from '../common/Toast';

export interface ImageJob {
  title: string;
  fileName: string;
  /** Null while the picture is still being drawn. */
  blob: Blob | null;
}

/**
 * Shows a drawn picture with Share and Save buttons. Drawing takes a moment
 * (fonts, photos), and a phone only opens its share sheet straight after a
 * tap, so the share has to come from a fresh tap here, not from the tap that
 * started the drawing.
 */
export function ImageShareSheet({ job, onClose }: { job: ImageJob | null; onClose: () => void }) {
  const { t } = useTranslation();
  const blob = job?.blob ?? null;
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  async function onShare() {
    if (!job?.blob) return;
    const { shareImage } = await import('../../utils/scorecardImage');
    const res = await shareImage(job.blob, job.fileName, job.title);
    if (res === 'downloaded') toast(t('scorecardImage.downloaded'));
    else if (res === 'failed') toast(t('scorecardImage.failed'));
  }

  // On document.body: a blurred or sticky header would otherwise trap the fixed sheet
  return createPortal(
    <Sheet
      open={job !== null}
      title={job?.title ?? ''}
      onClose={onClose}
      footer={
        <>
          <a
            href={url ?? undefined}
            download={job?.fileName}
            aria-disabled={!url}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 font-semibold dark:border-slate-700 ${url ? '' : 'pointer-events-none opacity-50'}`}
          >
            {t('scorecardImage.save')}
          </a>
          <button
            type="button"
            onClick={() => void onShare()}
            disabled={!url}
            className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-bpl-yellow font-semibold text-night-950 disabled:opacity-50"
          >
            {t('common.share')}
          </button>
        </>
      }
    >
      {url ? (
        <img
          src={url}
          alt={job?.title ?? ''}
          className="mx-auto max-h-[55dvh] w-auto rounded-xl object-contain"
        />
      ) : (
        <div
          role="status"
          className="shimmer mx-auto flex aspect-[9/16] max-h-[55dvh] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        >
          {t('scorecardImage.preparing')}
        </div>
      )}
    </Sheet>,
    document.body,
  );
}
