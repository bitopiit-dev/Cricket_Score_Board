import { usePrefs, type PushPrefs } from '../store/prefsStore';
import { supabase, withTimeout } from '../sync/supabase';

/**
 * Match alerts on this phone: ask permission, subscribe with the browser's
 * push service, and tell the server (push_subscribe in patch 4) which teams
 * to send. The server never learns anything else about the phone.
 *
 * The public VAPID key comes from the build (VITE_VAPID_PUBLIC_KEY); without
 * it, or without Supabase, alerts are simply not offered.
 */
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushSupport =
  /** Ready to switch on (or already on). */
  | 'ok'
  /** Alerts aren't set up for this build. */
  | 'off'
  /** iPhone / iPad: works only from the Home Screen app. */
  | 'iosInstall'
  /** This browser has no web push. */
  | 'unsupported'
  /** The person blocked notifications for this site. */
  | 'denied';

export function pushSupport(): PushSupport {
  if (!VAPID || !supabase || typeof window === 'undefined') return 'off';
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return 'iosInstall';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

export class PushError extends Error {
  constructor(public readonly code: 'denied' | 'noWorker' | 'offline' | 'failed') {
    super(code);
  }
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new PushError('noWorker');
  return reg;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function save(sub: PushSubscription, prefs: PushPrefs): Promise<void> {
  const j = sub.toJSON();
  try {
    const { error } = await withTimeout(
      supabase!.rpc('push_subscribe', {
        endpoint: j.endpoint,
        p256dh: j.keys?.p256dh,
        auth: j.keys?.auth,
        teams: prefs.teams,
        level: prefs.level,
        lang: usePrefs.getState().lang,
      }),
      10000,
    );
    if (error) throw new PushError('failed');
  } catch (e) {
    throw e instanceof PushError ? e : new PushError('offline');
  }
}

/** Switch alerts on, or save new choices. Throws PushError. */
export async function enablePush(prefs: PushPrefs): Promise<void> {
  if (pushSupport() !== 'ok') throw new PushError('failed');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new PushError('denied');
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID!),
    }));
  const firstTime = !usePrefs.getState().push;
  await save(sub, prefs);
  usePrefs.getState().setPush(prefs);
  if (firstTime) {
    const en = usePrefs.getState().lang === 'en';
    void reg.showNotification('BPL-2027', {
      body: en ? 'Match alerts are on.' : 'ম্যাচ অ্যালার্ট চালু হয়েছে।',
      tag: 'push-on',
      icon: `${import.meta.env.BASE_URL}icons/icon-192-v2.png`,
    });
  }
}

/** Switch alerts off on this phone and on the server. */
export async function disablePush(): Promise<void> {
  usePrefs.getState().setPush(null);
  if (!supabase || !('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => undefined);
  await withTimeout(supabase.rpc('push_unsubscribe', { endpoint }), 10000).catch(() => undefined);
}

/**
 * At start-up: browsers sometimes replace a subscription, and the app's
 * language may have changed, so send the current one again. Quietly does
 * nothing when alerts are off or anything is missing.
 */
export async function refreshPush(): Promise<void> {
  const prefs = usePrefs.getState().push;
  if (!prefs || pushSupport() !== 'ok' || Notification.permission !== 'granted') return;
  try {
    const reg = await registration();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(VAPID!),
      }));
    await save(sub, prefs);
  } catch {
    /* next start-up tries again */
  }
}
