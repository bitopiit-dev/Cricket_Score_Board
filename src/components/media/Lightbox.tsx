import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../common/icons';
import { toast } from '../common/Toast';
import { useFormat } from '../../hooks/useFormat';
import { photoUrl, type MediaItem } from '../../media/gallery';
import { shareText } from '../../utils/share';

/**
 * One photo filling the screen. Arrows, swipes and the keyboard move between
 * the photos of the album; Escape or ✕ closes it.
 */
export function Lightbox({
  items,
  index,
  label,
  onIndex,
  onClose,
}: {
  items: MediaItem[];
  index: number;
  /** The album's match, shown under the caption. */
  label: (item: MediaItem) => string | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const closeRef = useRef<HTMLButtonElement>(null);
  const startX = useRef<number | null>(null);
  const item = items[index];
  const go = (d: number) => onIndex((index + d + items.length) % items.length);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      back?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      else if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onClose, onIndex]);

  // The next photo is fetched ahead, so swiping feels instant
  useEffect(() => {
    const next = items[(index + 1) % items.length];
    if (next) new Image().src = photoUrl(next.path);
  }, [index, items]);

  if (!item) return null;
  const match = label(item);

  async function share() {
    const res = await shareText(
      'BPL-2027',
      item.caption || match || 'BPL-2027',
      photoUrl(item.path),
    );
    if (res === 'copied') toast(t('shareApp.copied'));
    else if (res === 'failed') toast(t('share.failed'));
  }

  const round =
    'flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-bpl-yellow';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.caption || match || t('more.media')}
      className="fixed inset-0 z-50 flex flex-col bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-white"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-sm text-white/80" aria-live="polite">
          {items.length > 1 &&
            t('gallery.position', { i: f.num(index + 1), n: f.num(items.length) })}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void share()}
            className={round}
            aria-label={t('gallery.share')}
          >
            <Icon name="share" className="size-5" />
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${round} text-2xl`}
            aria-label={t('gallery.close')}
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center select-none"
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 50 && items.length > 1) go(dx < 0 ? 1 : -1);
        }}
      >
        <img
          key={item.id}
          src={photoUrl(item.path)}
          alt={item.caption ?? ''}
          width={item.width}
          height={item.height}
          draggable={false}
          className="max-h-full max-w-full object-contain"
        />
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t('gallery.prev')}
              className={`${round} absolute top-1/2 left-2 -translate-y-1/2 text-3xl`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t('gallery.next')}
              className={`${round} absolute top-1/2 right-2 -translate-y-1/2 text-3xl`}
            >
              ›
            </button>
          </>
        )}
      </div>

      {(item.caption || match) && (
        <div className="px-4 py-3">
          {item.caption && <p className="font-semibold">{item.caption}</p>}
          {match && <p className="text-sm text-white/70">{match}</p>}
        </div>
      )}
    </div>
  );
}
