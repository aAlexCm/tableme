import { applyTranslations, buildLangSwitcher, LANGS } from './i18n.js';

const LANG_KEY = 'tableme_landing_lang';

(function () {
  // /fr, /en, /ro in the URL is the source of truth (shareable links land
  // in that exact language). Bare "/" always defaults to English, even if
  // this browser switched language before — sessionStorage only keeps a
  // manual switch alive for the current tab, never as a future default.
  const pathLang = location.pathname.replace(/\/+$/, '').slice(1);
  let currentLang = LANGS.includes(pathLang)
    ? pathLang
    : sessionStorage.getItem(LANG_KEY) || 'en';

  const langMount = document.getElementById('lang-switcher-mount');

  function setLang(lang) {
    currentLang = lang;
    sessionStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    history.replaceState(null, '', '/' + lang);
  }

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);

  const lightbox = document.getElementById('screenshot-lightbox');
  const lightboxImg = document.getElementById('screenshot-lightbox-img');
  const lightboxClose = document.getElementById('screenshot-lightbox-close');

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    document.body.classList.remove('modal-open');
  }

  document.querySelectorAll('.landing-screenshot-btn').forEach((btn) => {
    btn.addEventListener('click', () => openLightbox(btn.dataset.full));
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
})();
