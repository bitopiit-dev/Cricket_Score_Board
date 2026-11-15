import { supabase } from '../../sync/supabase';

/**
 * Square crop from the centre (a little above it for portraits, to keep the
 * face) and resize, in the browser, so uploads stay small (about 30–80 KB).
 */
export async function squareImage(file: File, size = 400, type = 'image/jpeg'): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - s) / 2;
  const sy = bmp.height > bmp.width ? (bmp.height - s) * 0.18 : (bmp.height - s) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
  }
  ctx.drawImage(bmp, sx, sy, s, s, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not read the image'))),
      type,
      0.85,
    ),
  );
}

/** Uploads to the public 'media' bucket and returns the file's web address. */
export async function uploadMedia(path: string, blob: Blob): Promise<string> {
  if (!supabase) throw new Error('Not connected');
  const { error } = await supabase.storage
    .from('media')
    .upload(path, blob, { upsert: true, contentType: blob.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}
