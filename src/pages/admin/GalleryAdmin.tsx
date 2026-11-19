import { useEffect, useState } from 'react';
import { btn, Card, inputClass } from '../../components/common/controls';
import { FIXTURES } from '../../data/fixtures';
import { findTeam } from '../../data/teams';
import {
  addPhoto,
  CURRENT_SEASON,
  deletePhoto,
  listMedia,
  photoUrl,
  updatePhoto,
  watchMedia,
  type MediaItem,
} from '../../media/gallery';
import { small, StatusLine, useStatus } from './shared';

const fixtureText = (id: string | null) => {
  const fx = FIXTURES.find((f) => f.id === id);
  if (!fx) return 'কোনো ম্যাচ নয়';
  const side = (s: (typeof fx)['teamA']) =>
    s.kind === 'team' ? (findTeam(s.teamId)?.name ?? s.teamId) : '?';
  return `ম্যাচ ${fx.no}: ${side(fx.teamA)} বনাম ${side(fx.teamB)} (${fx.date})`;
};

/** Super admin: add photos (resized on this phone), fix captions, remove photos. */
export function GalleryAdmin() {
  const status = useStatus();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const [fixtureId, setFixtureId] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    const load = () =>
      void listMedia()
        .then(setItems)
        .catch(() => undefined);
    load();
    return watchMedia(load);
  }, []);

  const upload = (files: FileList | null) => {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    void status.run(async () => {
      let done = 0;
      const failed: string[] = [];
      for (const file of list) {
        setProgress(`${done}/${list.length} আপলোড হয়েছে…`);
        try {
          await addPhoto(file, { season, fixtureId: fixtureId || null, caption: caption || null });
        } catch (e) {
          failed.push(`${file.name} (${(e as Error).message})`);
        }
        done++;
      }
      setProgress(null);
      setItems(await listMedia());
      if (failed.length) throw new Error(`${failed.length}টি ছবি যায়নি: ${failed.join(', ')}`);
      return `${list.length}টি ছবি যোগ হয়েছে। সবার ফোনে এখন দেখাবে।`;
    });
  };

  const shown = items.filter((i) => i.season === season);

  return (
    <>
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          ছবি এই ফোনেই ছোট করে (১৬০০ পিক্সেল) আপলোড হয়, তাই মোবাইল ডেটা কম লাগে। একসাথে অনেকগুলো বাছাই
          করা যায়।
        </p>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          সিজন
          <input
            type="number"
            inputMode="numeric"
            min={2020}
            max={2100}
            value={season}
            onChange={(e) => setSeason(Number(e.target.value) || CURRENT_SEASON)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          ম্যাচ (ঐচ্ছিক)
          <select
            value={fixtureId}
            onChange={(e) => setFixtureId(e.target.value)}
            className={inputClass}
          >
            <option value="">কোনো ম্যাচ নয় (অন্যান্য ছবি)</option>
            {season === CURRENT_SEASON &&
              FIXTURES.map((fx) => (
                <option key={fx.id} value={fx.id}>
                  {fixtureText(fx.id)}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          ক্যাপশন (ঐচ্ছিক, সবগুলো ছবিতে বসবে)
          <input
            maxLength={200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className={inputClass}
          />
        </label>
        <label
          className={`${btn.primary} cursor-pointer text-center ${status.busy ? 'pointer-events-none opacity-40' : ''}`}
        >
          {progress ?? 'ছবি বাছাই করে আপলোড'}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={status.busy}
            className="sr-only"
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        <StatusLine msg={status.msg} />
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="font-semibold">
          BPL-{season}: {shown.length}টি ছবি
        </p>
        <ul className="flex flex-col gap-3">
          {shown.map((it) => (
            <PhotoRow key={it.id} item={it} />
          ))}
        </ul>
      </Card>
    </>
  );
}

function PhotoRow({ item }: { item: MediaItem }) {
  const status = useStatus();
  const [caption, setCaption] = useState(item.caption ?? '');
  return (
    <li className="flex gap-3">
      <img
        src={photoUrl(item.thumb_path)}
        alt=""
        loading="lazy"
        className="size-20 shrink-0 rounded-lg bg-slate-200 object-cover dark:bg-slate-800"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {fixtureText(item.fixture_id)}
        </p>
        <input
          aria-label="ক্যাপশন"
          maxLength={200}
          value={caption}
          placeholder="ক্যাপশন"
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() =>
            caption !== (item.caption ?? '') &&
            void status.run(async () => {
              await updatePhoto(item.id, { caption: caption.trim() || null });
              return 'ক্যাপশন সেভ হয়েছে।';
            })
          }
          className={small}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={status.busy}
            className="text-sm font-semibold text-red-600 disabled:opacity-40"
            onClick={() =>
              confirm('ছবিটি সবার ফোন থেকে মুছে যাবে। মুছবেন?') &&
              void status.run(async () => {
                await deletePhoto(item);
                return 'মুছে ফেলা হয়েছে।';
              })
            }
          >
            মুছুন
          </button>
          <StatusLine msg={status.msg} />
        </div>
      </div>
    </li>
  );
}
