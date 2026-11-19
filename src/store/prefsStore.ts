import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Lang = 'bn' | 'en';
export type Theme = 'system' | 'light' | 'dark';

/** Match alerts this phone asked for (see src/push/client.ts); null when off. */
export interface PushPrefs {
  /** Tournament team ids; empty means every team. */
  teams: string[];
  /** 'key': start, wickets, fifties, innings break and result. 'result': the result only. */
  level: 'key' | 'result';
}

interface PrefsState {
  lang: Lang;
  /** Show numbers in Bengali digits when the language is Bengali. */
  bengaliDigits: boolean;
  theme: Theme;
  /** The viewer's own team, shown first on Home; null for none. */
  favoriteTeam: string | null;
  push: PushPrefs | null;
  setLang: (lang: Lang) => void;
  setBengaliDigits: (on: boolean) => void;
  setTheme: (theme: Theme) => void;
  setFavoriteTeam: (id: string | null) => void;
  setPush: (push: PushPrefs | null) => void;
}

/** localStorage that never throws (private mode, blocked storage). */
const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
}));

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      lang: 'bn',
      bengaliDigits: true,
      theme: 'system',
      favoriteTeam: null,
      push: null,
      setLang: (lang) => set({ lang }),
      setBengaliDigits: (bengaliDigits) => set({ bengaliDigits }),
      setTheme: (theme) => set({ theme }),
      setFavoriteTeam: (favoriteTeam) => set({ favoriteTeam }),
      setPush: (push) => set({ push }),
    }),
    { name: 'csb-prefs', storage: safeStorage },
  ),
);
