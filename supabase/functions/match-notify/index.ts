/**
 * Edge Function 'match-notify': called by the database (patch 4, pg_net) after
 * every saved change to a tournament match. It works out what happened with
 * the app's own scoring engine (../_shared/moments.js, built from
 * src/push/moments.ts) and sends a push alert to every phone that follows one
 * of the two teams.
 *
 * Secrets (supabase secrets set ...): NOTIFY_SECRET, VAPID_PUBLIC_KEY,
 * VAPID_PRIVATE_KEY, VAPID_SUBJECT. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * are provided by Supabase. Deploy with --no-verify-jwt: the database calls it
 * with the shared NOTIFY_SECRET, not a user's sign-in.
 */
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { momentsBetween, momentsToSend, teamIdsOf } from '../_shared/moments.js';

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing secret ${k}`);
  return v;
};

const SECRET = env('NOTIFY_SECRET');
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});
webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));

interface Row {
  id: string;
  deleted: boolean;
  data: { teams: { teamId?: string }[] } & Record<string, unknown>;
}

interface Sub {
  endpoint: string;
  p256dh: string;
  auth: string;
  lang: 'bn' | 'en';
}

/** Constant-time compare, so the secret can't be guessed one letter at a time. */
function sameSecret(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!sameSecret(req.headers.get('x-notify-secret'), SECRET))
    return json({ error: 'secret' }, 401);

  const { record, old_record } = (await req.json()) as { record?: Row; old_record?: Row | null };
  if (!record || record.deleted) return json({ sent: 0 });
  const next = record.data;
  const prev = old_record && !old_record.deleted ? old_record.data : null;

  const moments = momentsToSend(momentsBetween(prev, next), Date.now());
  const teamIds: string[] = teamIdsOf(next);
  let sent = 0;

  for (const m of moments) {
    // Claim the alert first: if another call already sent it, skip
    const claim = await db.from('push_log').insert({ match_id: record.id, key: m.key });
    if (claim.error) {
      if (claim.error.code === '23505') continue;
      throw new Error(claim.error.message);
    }

    let q = db
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth,lang')
      .or(`teams.eq.{},teams.ov.{${teamIds.join(',')}}`);
    if (m.level === 'key') q = q.eq('level', 'key');
    const { data: subs, error } = await q;
    if (error) throw new Error(error.message);

    const gone: string[] = [];
    const list = (subs ?? []) as Sub[];
    // A few at a time, so one slow push service doesn't hold up the rest
    for (let i = 0; i < list.length; i += 50) {
      await Promise.all(
        list.slice(i, i + 50).map(async (s) => {
          const t = m.text[s.lang] ?? m.text.bn;
          const payload = JSON.stringify({
            title: t.title,
            body: t.body,
            url: `#/match/${record.id}`,
            tag: `match-${record.id}`,
          });
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
              { TTL: m.kind === 'result' ? 6 * 3600 : 15 * 60, urgency: 'high' },
            );
            sent++;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            // The phone uninstalled the app or turned alerts off
            if (code === 404 || code === 410) gone.push(s.endpoint);
            else console.warn('push failed', code, (e as Error).message);
          }
        }),
      );
    }
    if (gone.length) await db.from('push_subscriptions').delete().in('endpoint', gone);
  }

  return json({ moments: moments.map((m) => m.key), sent });
});
