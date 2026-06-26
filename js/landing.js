import { applyTranslations, buildLangSwitcher } from './i18n.js';

const LANG_KEY = 'tableme_landing_lang';

(function () {
  // Defaults to English for this page specifically — the rest of the app
  // still defaults to French, this is just for the public marketing site.
  let currentLang = localStorage.getItem(LANG_KEY) || 'en';

  const langMount = document.getElementById('lang-switcher-mount');

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
  }

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
})();
