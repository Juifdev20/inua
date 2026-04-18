import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ✅ CORRECTION DES CHEMINS : 
// Puisque fr.json est dans le même dossier que config.js, on utilise ./fr.json
import fr from './fr.json';
import en from './en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en }
    },
    lng: localStorage.getItem('preferredLanguage') || (navigator.language?.startsWith('en') ? 'en' : 'fr'),
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;