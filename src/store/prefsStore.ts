import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Lang = 'bn' | 'en';
export type Theme = 'system' | 'light' | 'dark';

interface PrefsState {
  lang: Lang;
  /** Show numbers in Bengali digits when the language is Bengali. */
  bengaliDigits: boolean;
  theme: Theme;
  setLang: (lang: Lang) => void;
  setBengaliDigits: (on: boolean) => void;
  setTheme: (theme: Theme) => void;
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
      setLang: (lang) => set({ lang }),
      setBengaliDigits: (bengaliDigits) => set({ bengaliDigits }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'csb-prefs', storage: safeStorage },
  ),
);
