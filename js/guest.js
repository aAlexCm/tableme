import { Storage, normalize } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';

const LANG_KEY = 'tableme_lang';

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  const titleEl = document.getElementById('wedding-title');
  const subtitleEl = document.getElementById('wedding-subtitle');
  const noWeddingEl = document.getElementById('no-wedding');
  const searchSectionEl = document.getElementById('search-section');
  const inputEl = document.getElementById('guest-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const resultEl = document.getElementById('result');
  const matchListEl = document.getElementById('match-list');
  const langMount = document.getElementById('lang-switcher-mount');

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let currentWedding = null;

  applyTranslations(currentLang);

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    if (currentWedding) {
      renderWeddingTitle(currentWedding.name);
      handleSearch(inputEl.value, currentWedding.guests);
    } else {
      titleEl.textContent = t(lang, 'guestHeroTitle');
      document.title = `TableMe · ${t(lang, 'guestHeroTitle')}`;
    }
  }

  function showInvalidLink() {
    noWeddingEl.hidden = false;
    searchSectionEl.hidden = true;
  }

  function clearResult() {
    resultEl.hidden = true;
    resultEl.innerHTML = '';
    matchListEl.innerHTML = '';
  }

  function showSingleGuest(guest) {
    clearResult();
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="table-number">
        <span class="guest-name">${escapeHtml(guest.name)}</span>
        <span class="table-sep"></span>
        <span class="table-tag">
          <span class="table-label">${escapeHtml(t(currentLang, 'tableLabel'))}</span>
          <span class="table-value">${escapeHtml(guest.table)}</span>
        </span>
      </div>
    `;
  }

  function showMatchList(guests) {
    clearResult();
    guests.forEach((g) => {
      const li = document.createElement('li');
      li.className = 'guest-match';
      li.innerHTML = `<span>${escapeHtml(g.name)}</span><span class="match-table">${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(g.table)}</span>`;
      li.addEventListener('click', () => showSingleGuest(g));
      matchListEl.appendChild(li);
    });
  }

  function showNoMatch() {
    clearResult();
    resultEl.hidden = false;
    resultEl.innerHTML = `<p class="error-msg">${escapeHtml(t(currentLang, 'noMatch'))}</p>`;
  }

  function renderWeddingTitle(name) {
    const parts = name.split(/\s+(?:&|et)\s+/i);
    if (parts.length === 2) {
      titleEl.innerHTML = `<span class="script-word">${escapeHtml(parts[0])}</span><span class="title-heart">&#9825;</span><span class="script-word">${escapeHtml(parts[1])}</span>`;
      document.title = `${parts[0]} ♥ ${parts[1]} · TableMe`;
    } else {
      titleEl.innerHTML = `<span class="script-word">${escapeHtml(name)}</span>`;
      document.title = `${name} · TableMe`;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function handleSearch(query, guests) {
    const q = normalize(query);
    if (!q) {
      clearResult();
      return;
    }
    const queryWords = q.split(/\s+/).filter(Boolean);
    const matches = guests.filter((g) => {
      const normalizedName = normalize(g.name);
      return queryWords.every((word) => normalizedName.includes(word));
    });
    if (matches.length === 0) {
      showNoMatch();
    } else if (matches.length === 1) {
      showSingleGuest(matches[0]);
    } else {
      showMatchList(matches);
    }
  }

  if (!weddingId) {
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    applyTranslations(currentLang);
    titleEl.textContent = t(currentLang, 'guestHeroTitle');
    document.title = `TableMe · ${t(currentLang, 'guestHeroTitle')}`;
    showInvalidLink();
    return;
  }

  const wedding = await Storage.getWedding(weddingId);
  if (!wedding) {
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    applyTranslations(currentLang);
    titleEl.textContent = t(currentLang, 'guestHeroTitle');
    document.title = `TableMe · ${t(currentLang, 'guestHeroTitle')}`;
    showInvalidLink();
    return;
  }

  currentWedding = wedding;
  if (!localStorage.getItem(LANG_KEY)) {
    currentLang = wedding.lang || 'fr';
  }
  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);

  renderWeddingTitle(wedding.name);
  searchSectionEl.hidden = false;

  inputEl.addEventListener('input', () => {
    clearBtn.hidden = inputEl.value.length === 0;
    handleSearch(inputEl.value, wedding.guests);
  });

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    clearBtn.hidden = true;
    clearResult();
    inputEl.focus();
  });
})();
