import { uploadMedia } from '../pages/admin/media';
import { supabase, withTimeout } from '../sync/supabase';

/**
 * Photo gallery (patch 4): one `media_items` row per photo, files in the public
 * 'media' bucket under gallery/<season>/. Everyone can view; only the super
 * admin adds, edits or removes photos.
 */
export interface MediaItem {
  id: string;
  season: number;
  fixture_id: string | null;
  path: string;
  thumb_path: string;
  width: number;
  height: number;
  caption: string | null;
  created_at: string;
}

/** The season the app is about; always offered even before it has photos. */
export const CURRENT_SEASON = 2027;

export function photoUrl(path: string): string {
  if (!supabase) return '';
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}

/** Every photo, newest first. Throws when offline. */
export async function listMedia(): Promise<MediaItem[]> {
  if (!supabase) throw new Error('offline');
  const { data, error } = await withTimeout(
    supabase.from('media_items').select('*').order('created_at', { ascending: false }).limit(2000),
    10000,
  );
  if (error) throw new Error(error.message);
  return (data ?? []) as MediaItem[];
}

/** Calls `onChange` when the admin adds, edits or removes a photo. */
export function watchMedia(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel('media-items')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'media_items' }, onChange)
    .subscribe();
  return () => void client.removeChannel(channel);
}

/** Seasons to show as albums, newest first; the current season is always there. */
export function seasonsOf(items: Pick<MediaItem, 'season'>[]): number[] {
  return [...new Set([CURRENT_SEASON, ...items.map((i) => i.season)])].sort((a, b) => b - a);
}

export interface PhotoGroup<T> {
  /** Fixture id, or null for photos that don't belong to a match. */
  fixtureId: string | null;
  items: T[];
}

/**
 * One season's photos grouped by match. Matches are ordered by `order` (the
 * fixture's match number), latest match first; loose photos come last. Inside
 * a group, photos keep the order they were added in.
 */
export function groupByMatch<T extends Pick<MediaItem, 'fixture_id' | 'created_at'>>(
  items: T[],
  order: (fixtureId: string) => number,
): PhotoGroup<T>[] {
  const map = new Map<string | null, T[]>();
  for (const it of [...items].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const key = it.fixture_id ?? null;
    map.set(key, [...(map.get(key) ?? []), it]);
  }
  return [...map.entries()]
    .map(([fixtureId, list]) => ({ fixtureId, items: list }))
    .sort((a, b) => {
      if (a.fixtureId === null) return 1;
      if (b.fixtureId === null) return -1;
      return order(b.fixtureId) - order(a.fixtureId);
    });
}

/* ---------------------------------- admin ---------------------------------- */

/** Fits the photo inside `maxEdge` px (keeping its shape) and saves it as JPEG. */
export async function resizeImage(
  file: Blob,
  maxEdge: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not read the image'))),
      'image/jpeg',
      0.82,
    ),
  );
  return { blob, width, height };
}

/** Super admin: resize, upload the photo and its thumbnail, and add the row. */
export async function addPhoto(
  file: File,
  meta: { season: number; fixtureId: string | null; caption: string | null },
): Promise<void> {
  if (!supabase) throw new Error('Not connected');
  const id = crypto.randomUUID();
  const full = await resizeImage(file, 1600);
  const thumb = await resizeImage(file, 480);
  const path = `gallery/${meta.season}/${id}.jpg`;
  const thumbPath = `gallery/${meta.season}/${id}-t.jpg`;
  await uploadMedia(path, full.blob);
  await uploadMedia(thumbPath, thumb.blob);
  const { error } = await supabase.from('media_items').insert({
    id,
    season: meta.season,
    fixture_id: meta.fixtureId,
    path,
    thumb_path: thumbPath,
    width: full.width,
    height: full.height,
    caption: meta.caption?.trim() || null,
  });
  if (error) {
    await supabase.storage.from('media').remove([path, thumbPath]);
    throw new Error(error.message);
  }
}

/** Super admin: change a photo's caption or match. */
export async function updatePhoto(
  id: string,
  patch: Partial<Pick<MediaItem, 'caption' | 'fixture_id'>>,
): Promise<void> {
  if (!supabase) throw new Error('Not connected');
  const { error } = await supabase.from('media_items').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Super admin: remove the row first (so nobody sees a broken photo), then the files. */
export async function deletePhoto(item: MediaItem): Promise<void> {
  if (!supabase) throw new Error('Not connected');
  const { error } = await supabase.from('media_items').delete().eq('id', item.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from('media').remove([item.path, item.thumb_path]);
}
