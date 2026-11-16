import { describe, expect, it } from 'vitest';
import { noticesFor } from '../notices';

const ids = (page: 'home' | 'live', today: string, installed = false, closed: string[] = []) =>
  noticesFor(page, today, closed, installed).map((n) => n.id);

describe('notices', () => {
  it('the install tip is on Live only (Home has its own install card)', () => {
    expect(ids('live', '2026-11-17')).toContain('install-app-2026-11');
    expect(ids('home', '2026-11-17')).not.toContain('install-app-2026-11');
  });

  it('the install tip is hidden inside the installed app', () => {
    expect(ids('live', '2026-11-17', true)).not.toContain('install-app-2026-11');
  });

  it('the new-schedule notice shows on both pages until 19 November', () => {
    expect(ids('home', '2026-11-19')).toContain('new-fixture-2026-11-17');
    expect(ids('live', '2026-11-19')).toContain('new-fixture-2026-11-17');
    expect(ids('home', '2026-11-20')).not.toContain('new-fixture-2026-11-17');
  });

  it('a closed notice stays closed, and the install tip ends with the final', () => {
    expect(ids('live', '2026-11-17', false, ['install-app-2026-11'])).not.toContain(
      'install-app-2026-11',
    );
    expect(ids('live', '2026-12-20')).toEqual([]);
  });
});
