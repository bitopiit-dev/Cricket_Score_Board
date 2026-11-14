import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import bn from './bn.json';
import en from './en.json';
import { usePrefs } from '../store/prefsStore';

const initial = usePrefs.getState().lang;

void i18n.use(initReactI18next).init({
  resources: { bn: { translation: bn }, en: { translation: en } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
});

document.documentElement.lang = initial;

usePrefs.subscribe((s, prev) => {
  if (s.lang !== prev.lang) {
    void i18n.changeLanguage(s.lang);
    document.documentElement.lang = s.lang;
  }
});

export default i18n;
