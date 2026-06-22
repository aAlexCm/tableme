import { Storage, normalize } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { DEFAULT_SEATS, getRectShapeSize, buildChairs } from './table-shape.js';

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
  let outsideClickHandler = null;

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
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler);
      outsideClickHandler = null;
    }
  }

  function buildTablePreview(guest, tableGuests) {
    const table = (currentWedding.tables || []).find((tb) => tb.label === guest.table);
    const shape = table?.shape === 'rectangle' ? 'rectangle' : 'round';
    const seatCount = table?.seats != null ? table.seats : Math.max(DEFAULT_SEATS, tableGuests.length);

    const wrap = document.createElement('div');
    wrap.className = 'table-preview';

    const heading = document.createElement('p');
    heading.className = 'table-preview-title';
    heading.textContent = t(currentLang, 'tablePreviewTitle');
    wrap.appendChild(heading);

    const switchEl = document.createElement('div');
    switchEl.className = 'mode-switch table-preview-switch';
    switchEl.innerHTML = `
      <button type="button" class="mode-btn active" data-view="table">${escapeHtml(t(currentLang, 'tablePreviewViewTable'))}</button>
      <button type="button" class="mode-btn" data-view="list">${escapeHtml(t(currentLang, 'tablePreviewViewList'))}</button>
    `;
    wrap.appendChild(switchEl);

    const canvas = document.createElement('div');
    canvas.className = 'table-preview-canvas';

    const unitEl = document.createElement('div');
    unitEl.className = 'table-unit';
    unitEl.style.left = '50%';
    unitEl.style.top = '50%';

    const shapeEl = document.createElement('div');
    shapeEl.className = `table-shape ${shape}`;
    if (shape === 'rectangle') {
      const { width, height } = getRectShapeSize(seatCount, table?.rotated);
      shapeEl.style.width = `${width}px`;
      shapeEl.style.height = `${height}px`;
    }
    shapeEl.innerHTML = `<span class="table-shape-label">${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(guest.table)}</span>`;
    unitEl.appendChild(shapeEl);

    buildChairs(unitEl, shape, seatCount, tableGuests, guest.id, table?.rotated);
    canvas.appendChild(unitEl);
    wrap.appendChild(canvas);

    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'chair-tooltip';
    tooltipEl.hidden = true;
    canvas.appendChild(tooltipEl);

    function showChairTooltip(chairEl) {
      const name = chairEl.dataset.name;
      if (!name) return;
      const canvasRect = canvas.getBoundingClientRect();
      const chairRect = chairEl.getBoundingClientRect();
      tooltipEl.textContent = name;
      tooltipEl.style.left = `${chairRect.left + chairRect.width / 2 - canvasRect.left}px`;
      tooltipEl.style.top = `${chairRect.top - canvasRect.top}px`;
      tooltipEl.hidden = false;
    }

    function hideChairTooltip() {
      tooltipEl.hidden = true;
    }

    unitEl.querySelectorAll('.chair.occupied').forEach((chairEl) => {
      chairEl.addEventListener('mouseenter', () => showChairTooltip(chairEl));
      chairEl.addEventListener('mouseleave', hideChairTooltip);
      chairEl.addEventListener('click', (e) => {
        e.stopPropagation();
        showChairTooltip(chairEl);
      });
    });

    outsideClickHandler = (e) => {
      if (!canvas.contains(e.target)) hideChairTooltip();
    };
    document.addEventListener('click', outsideClickHandler);

    const namesWrap = document.createElement('div');
    namesWrap.className = 'table-preview-names';
    namesWrap.hidden = true;
    tableGuests.forEach((g) => {
      const isYou = g.id === guest.id;
      const chip = document.createElement('span');
      chip.className = `table-preview-name${isYou ? ' you' : ''}`;
      chip.textContent = isYou ? `${g.name} (${t(currentLang, 'youTag')})` : g.name;
      namesWrap.appendChild(chip);
    });
    wrap.appendChild(namesWrap);

    switchEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      switchEl.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
      const showTable = btn.dataset.view === 'table';
      canvas.hidden = !showTable;
      namesWrap.hidden = showTable;
      if (!showTable) hideChairTooltip();
    });

    return wrap;
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
    inputEl.blur();

    if (guest.table) {
      const tableGuests = currentWedding.guests.filter((g) => g.table === guest.table);
      if (tableGuests.length > 0) {
        resultEl.appendChild(buildTablePreview(guest, tableGuests));
      }
    }
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
