import { useEffect, useState } from 'react';

const TOAST_EVENT = 'bpl:toast';

/** Shows a short message at the bottom of the screen, from anywhere in the app. */
export function toast(text: string) {
  window.dispatchEvent(new CustomEvent<string>(TOAST_EVENT, { detail: text }));
}

/** Renders the latest toast for a few seconds. Mounted once, in the app shell. */
export function ToastHost() {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (e: Event) => {
      setMsg({ text: (e as CustomEvent<string>).detail, key: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener(TOAST_EVENT, show);
    return () => {
      window.removeEventListener(TOAST_EVENT, show);
      clearTimeout(timer);
    };
  }, []);
  if (!msg) return null;
  return (
    <div
      key={msg.key}
      role="status"
      className="toast-in fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] mx-auto w-fit max-w-[92%] rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-night-950 shadow-lg md:bottom-8"
    >
      {msg.text}
    </div>
  );
}
