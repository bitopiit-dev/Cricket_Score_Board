import { describe, expect, it } from 'vitest';
import { assetUrl } from '../asset';

describe('assetUrl', () => {
  it('puts the base path in front of files from public/', () => {
    const base = import.meta.env.BASE_URL;
    expect(assetUrl('players/ddc/a.jpg')).toBe(`${base}players/ddc/a.jpg`);
    expect(assetUrl('/images/logo.png')).toBe(`${base}images/logo.png`);
  });

  it('leaves full URLs, data URLs and missing paths alone', () => {
    expect(assetUrl('https://x.supabase.co/a.webp')).toBe('https://x.supabase.co/a.webp');
    expect(assetUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(assetUrl(undefined)).toBeUndefined();
  });
});
