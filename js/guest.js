import { Storage, normalize } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';

const LANG_KEY = 'tableme_lang';

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  const titleEl = document.getElementById('wedding-title');
  const subtitleEl = document.getElementById('wedding-subtitle');
  const noWeddingEl = document.getElementById('no-wedding');
  const weddingPickerEl = document.getElementById('wedding-picker');
  const noWeddingEmptyEl = document.getElementById('no-wedding-empty');
  const searchSectionEl = document.getElementById('search-section');
  const inputEl = document.getElementById('guest-input');
  const resultEl = document.getElementById('result');
  const matchListEl = document.getElementById('match-list');
  const langMount = document.getElementById('lang-switcher-mount');

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let currentWedding = null;

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    if (currentWedding) {
      renderWeddingTitle(currentWedding.name);
      handleSearch(inputEl.value, currentWedding.guests);
    } else {
      titleEl.textContent = t(lang, 'guestHeroTitle');
    }
  }

  async function showWeddingPicker() {
    const weddings = await Storage.getWeddings();
    noWeddingEl.hidden = false;
    searchSectionEl.hidden = true;

    if (weddings.length === 0) {
      noWeddingEmptyEl.hidden = false;
      return;
    }

    weddings.forEach((w) => {
      const li = document.createElement('li');
      li.className = 'wedding-item';
      const a = document.createElement('a');
      a.href = `index.html?id=${encodeURIComponent(w.id)}`;
      a.textContent = w.name;
      li.appendChild(a);
      weddingPickerEl.appendChild(li);
    });
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
    } else {
      titleEl.innerHTML = `<span class="script-word">${escapeHtml(name)}</span>`;
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
    await showWeddingPicker();
    return;
  }

  const wedding = await Storage.getWedding(weddingId);
  if (!wedding) {
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    applyTranslations(currentLang);
    titleEl.textContent = t(currentLang, 'guestHeroTitle');
    await showWeddingPicker();
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
    handleSearch(inputEl.value, wedding.guests);
  });
})();
