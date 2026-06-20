import { Storage } from './storage.js';
import { LANGS, LANG_LABELS, applyTranslations, buildLangSwitcher, t } from './i18n.js';

const ADMIN_LANG_KEY = 'tableme_admin_lang';

(function () {
  let selectedWeddingId = null;
  let currentLang = localStorage.getItem(ADMIN_LANG_KEY) || 'fr';
  let draggedRow = null;

  const langMount = document.getElementById('lang-switcher-mount');

  const weddingForm = document.getElementById('wedding-form');
  const weddingNameInput = document.getElementById('wedding-name');
  const weddingDateInput = document.getElementById('wedding-date');
  const weddingLangSelect = document.getElementById('wedding-lang');
  const weddingListEl = document.getElementById('wedding-list');
  const weddingEmptyEl = document.getElementById('wedding-empty');

  const guestsCard = document.getElementById('guests-card');
  const guestsTitle = document.getElementById('guests-title');
  const guestLinkInput = document.getElementById('guest-link');
  const copyLinkBtn = document.getElementById('copy-link');
  const guestForm = document.getElementById('guest-form');
  const guestNameInput = document.getElementById('guest-name');
  const guestTableInput = document.getElementById('guest-table');
  const guestListEl = document.getElementById('guest-list');
  const guestEmptyEl = document.getElementById('guest-empty');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function populateWeddingLangSelect() {
    weddingLangSelect.innerHTML = '';
    LANGS.forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = LANG_LABELS[code];
      if (code === 'fr') option.selected = true;
      weddingLangSelect.appendChild(option);
    });
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(ADMIN_LANG_KEY, lang);
    applyTranslations(lang);
    renderWeddings();
    if (selectedWeddingId) renderGuests();
  }

  async function renderWeddings() {
    const weddings = await Storage.getWeddings();
    weddingListEl.innerHTML = '';
    weddingEmptyEl.hidden = weddings.length > 0;

    weddings.forEach((w) => {
      const li = document.createElement('li');
      li.className = 'wedding-item';
      const dateLabel = w.date ? new Date(w.date).toLocaleDateString('fr-FR') : t(currentLang, 'dateUnset');
      const langOptions = LANGS.map(
        (code) => `<option value="${code}" ${(w.lang || 'fr') === code ? 'selected' : ''}>${LANG_LABELS[code]}</option>`
      ).join('');
      li.innerHTML = `
        <div class="info">
          <strong>${escapeHtml(w.name)}</strong>
          <span class="muted">${escapeHtml(dateLabel)} &middot; ${w.guests.length} ${escapeHtml(t(currentLang, 'guestCountSuffix'))}</span>
        </div>
        <div class="actions">
          <select class="mini-lang-select" data-id="${w.id}">${langOptions}</select>
          <button type="button" class="secondary" data-action="manage" data-id="${w.id}">${escapeHtml(t(currentLang, 'manageBtn'))}</button>
          <button type="button" class="danger" data-action="delete" data-id="${w.id}">${escapeHtml(t(currentLang, 'deleteBtn'))}</button>
        </div>
      `;
      weddingListEl.appendChild(li);
    });

    if (selectedWeddingId && !weddings.some((w) => w.id === selectedWeddingId)) {
      selectedWeddingId = null;
      guestsCard.hidden = true;
    }
  }

  function groupGuestsByTable(guests) {
    const groups = new Map();
    guests.forEach((g) => {
      const key = g.table || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(g);
    });
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
    return sortedKeys.map((key) => ({ key, guests: groups.get(key) }));
  }

  function getDragAfterElement(container, y) {
    const rows = [...container.querySelectorAll('.guest-row:not(.dragging)')];
    return rows.reduce(
      (closest, row) => {
        const box = row.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: row };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  async function commitGuestOrder() {
    const wedding = await Storage.getWedding(selectedWeddingId);
    if (!wedding) return;
    const guestMap = new Map(wedding.guests.map((g) => [g.id, g]));
    const newGuests = [];
    guestListEl.querySelectorAll('.guest-row').forEach((row) => {
      const guest = guestMap.get(row.dataset.id);
      if (!guest) return;
      const table = row.closest('.table-guest-list').dataset.table;
      newGuests.push({ ...guest, table });
    });
    await Storage.setGuests(selectedWeddingId, newGuests);
    await renderGuests();
    await renderWeddings();
  }

  async function moveGuest(guestId, direction) {
    const wedding = await Storage.getWedding(selectedWeddingId);
    if (!wedding) return;
    const groups = groupGuestsByTable(wedding.guests);
    let moved = false;
    for (const group of groups) {
      const idx = group.guests.findIndex((g) => g.id === guestId);
      if (idx === -1) continue;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx >= 0 && swapIdx < group.guests.length) {
        [group.guests[idx], group.guests[swapIdx]] = [group.guests[swapIdx], group.guests[idx]];
        moved = true;
      }
      break;
    }
    if (!moved) return;
    const newGuests = groups.flatMap((g) => g.guests);
    await Storage.setGuests(selectedWeddingId, newGuests);
    await renderGuests();
  }

  async function updateGuestTable(guestId, newTable) {
    const table = newTable.trim();
    if (!table) {
      await renderGuests();
      return;
    }
    const wedding = await Storage.getWedding(selectedWeddingId);
    if (!wedding) return;
    const guests = wedding.guests.map((g) => (g.id === guestId ? { ...g, table } : g));
    await Storage.setGuests(selectedWeddingId, guests);
    await renderGuests();
    await renderWeddings();
  }

  function attachRowDragEvents(row) {
    row.addEventListener('dragstart', () => {
      draggedRow = row;
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      draggedRow = null;
    });

    const handle = row.querySelector('.drag-handle');

    handle.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        draggedRow = row;
        row.classList.add('dragging');
      },
      { passive: false }
    );

    handle.addEventListener(
      'touchmove',
      (e) => {
        if (!draggedRow) return;
        e.preventDefault();
        const touch = e.touches[0];
        const elAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
        const list = elAtPoint && elAtPoint.closest('.table-guest-list');
        if (!list) return;
        const afterEl = getDragAfterElement(list, touch.clientY);
        if (afterEl == null) {
          list.appendChild(draggedRow);
        } else {
          list.insertBefore(draggedRow, afterEl);
        }
      },
      { passive: false }
    );

    handle.addEventListener('touchend', async () => {
      if (!draggedRow) return;
      row.classList.remove('dragging');
      draggedRow = null;
      await commitGuestOrder();
    });
  }

  function attachListDropEvents(list) {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedRow) return;
      const afterEl = getDragAfterElement(list, e.clientY);
      if (afterEl == null) {
        list.appendChild(draggedRow);
      } else {
        list.insertBefore(draggedRow, afterEl);
      }
    });

    list.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!draggedRow) return;
      await commitGuestOrder();
    });
  }

  async function renderGuests() {
    const wedding = await Storage.getWedding(selectedWeddingId);
    if (!wedding) {
      guestsCard.hidden = true;
      return;
    }

    guestsCard.hidden = false;
    guestsTitle.textContent = `${t(currentLang, 'guestsTitlePrefix')}${wedding.name}`;
    guestLinkInput.value = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}index.html?id=${wedding.id}`;

    guestListEl.innerHTML = '';
    guestEmptyEl.hidden = wedding.guests.length > 0;

    groupGuestsByTable(wedding.guests).forEach(({ key, guests }) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'table-group';

      const title = document.createElement('h3');
      title.className = 'table-group-title';
      title.textContent = `${t(currentLang, 'tableLabel')} ${key || '—'}`;
      groupEl.appendChild(title);

      const list = document.createElement('ul');
      list.className = 'table-guest-list';
      list.dataset.table = key;

      guests.forEach((g) => {
        const li = document.createElement('li');
        li.className = 'guest-row';
        li.draggable = true;
        li.dataset.id = g.id;
        li.innerHTML = `
          <span class="drag-handle">&#10303;</span>
          <span class="guest-row-name">${escapeHtml(g.name)}</span>
          <input type="text" class="guest-table-edit" data-id="${g.id}" value="${escapeHtml(g.table)}" aria-label="${escapeHtml(t(currentLang, 'tableLabel'))}" />
          <span class="row-arrows">
            <button type="button" class="arrow-btn" data-action="move-up" data-id="${g.id}" aria-label="up">&#9650;</button>
            <button type="button" class="arrow-btn" data-action="move-down" data-id="${g.id}" aria-label="down">&#9660;</button>
          </span>
          <button type="button" class="danger" data-action="delete-guest" data-id="${g.id}">${escapeHtml(t(currentLang, 'deleteBtn'))}</button>
        `;
        attachRowDragEvents(li);
        list.appendChild(li);
      });

      attachListDropEvents(list);
      groupEl.appendChild(list);
      guestListEl.appendChild(groupEl);
    });
  }

  weddingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = weddingNameInput.value.trim();
    if (!name) return;
    await Storage.addWedding(name, weddingDateInput.value, weddingLangSelect.value);
    weddingForm.reset();
    populateWeddingLangSelect();
    await renderWeddings();
  });

  weddingListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'manage') {
      selectedWeddingId = id;
      await renderGuests();
    } else if (action === 'delete') {
      const wedding = await Storage.getWedding(id);
      if (wedding && confirm(t(currentLang, 'confirmDeleteWedding', wedding.name))) {
        await Storage.deleteWedding(id);
        await renderWeddings();
      }
    }
  });

  weddingListEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.mini-lang-select');
    if (!select) return;
    await Storage.updateWeddingLang(select.dataset.id, select.value);
  });

  guestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedWeddingId) return;
    const name = guestNameInput.value.trim();
    const table = guestTableInput.value.trim();
    if (!name || !table) return;
    await Storage.addGuest(selectedWeddingId, name, table);
    guestForm.reset();
    await renderGuests();
    await renderWeddings();
  });

  guestListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn || !selectedWeddingId) return;
    const { action, id } = btn.dataset;
    if (action === 'delete-guest') {
      await Storage.deleteGuest(selectedWeddingId, id);
      await renderGuests();
      await renderWeddings();
    } else if (action === 'move-up' || action === 'move-down') {
      await moveGuest(id, action === 'move-up' ? 'up' : 'down');
    }
  });

  guestListEl.addEventListener('change', async (e) => {
    const input = e.target.closest('.guest-table-edit');
    if (!input || !selectedWeddingId) return;
    await updateGuestTable(input.dataset.id, input.value);
  });

  copyLinkBtn.addEventListener('click', () => {
    guestLinkInput.select();
    navigator.clipboard?.writeText(guestLinkInput.value).catch(() => {});
    copyLinkBtn.textContent = t(currentLang, 'copiedBtn');
    setTimeout(() => (copyLinkBtn.textContent = t(currentLang, 'copyBtn')), 1500);
  });

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  populateWeddingLangSelect();
  renderWeddings();
})();
