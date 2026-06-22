import { Storage } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

const ICONS = {
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  chevronUp: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07l1.39-1.39"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
};

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let draggedRow = null;

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('wedding-admin-content');
  const weddingNameEl = document.getElementById('wedding-admin-name');
  const guestPageLink = document.getElementById('guest-page-link');

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

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    updateCopyLinkLabel();
    renderGuests();
  }

  function updateCopyLinkLabel() {
    const label = t(currentLang, 'copyGuestLinkBtn');
    copyLinkBtn.title = label;
    copyLinkBtn.setAttribute('aria-label', label);
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
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const guestMap = new Map(wedding.guests.map((g) => [g.id, g]));
    const newGuests = [];
    guestListEl.querySelectorAll('.guest-row').forEach((row) => {
      const guest = guestMap.get(row.dataset.id);
      if (!guest) return;
      const table = row.closest('.table-guest-list').dataset.table;
      newGuests.push({ ...guest, table });
    });
    await Storage.setGuests(weddingId, newGuests);
    await renderGuests();
  }

  async function moveGuest(guestId, direction) {
    const wedding = await Storage.getWedding(weddingId);
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
    await Storage.setGuests(weddingId, newGuests);
    await renderGuests();
  }

  async function updateGuestTable(guestId, newTable) {
    const table = newTable.trim();
    if (!table) {
      await renderGuests();
      return;
    }
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const guests = wedding.guests.map((g) => (g.id === guestId ? { ...g, table } : g));
    await Storage.setGuests(weddingId, guests);
    await renderGuests();
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
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;

    guestsTitle.textContent = `${t(currentLang, 'guestsTitlePrefix')}${wedding.name}`;
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
        const deleteLabel = escapeHtml(t(currentLang, 'deleteBtn'));
        const li = document.createElement('li');
        li.className = 'guest-row';
        li.draggable = true;
        li.dataset.id = g.id;
        li.innerHTML = `
          <span class="drag-handle">&#10303;</span>
          <span class="guest-row-name">${escapeHtml(g.name)}</span>
          <span class="guest-row-actions">
            <input type="text" class="guest-table-edit" data-id="${g.id}" value="${escapeHtml(g.table)}" aria-label="${escapeHtml(t(currentLang, 'tableLabel'))}" />
            <span class="row-arrows">
              <button type="button" class="icon-btn" data-action="move-up" data-id="${g.id}" aria-label="up">${ICONS.chevronUp}</button>
              <button type="button" class="icon-btn" data-action="move-down" data-id="${g.id}" aria-label="down">${ICONS.chevronDown}</button>
            </span>
            <button type="button" class="icon-btn icon-btn-danger" data-action="delete-guest" data-id="${g.id}" title="${deleteLabel}" aria-label="${deleteLabel}">${ICONS.trash}</button>
          </span>
        `;
        attachRowDragEvents(li);
        list.appendChild(li);
      });

      attachListDropEvents(list);
      groupEl.appendChild(list);
      guestListEl.appendChild(groupEl);
    });
  }

  guestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = guestNameInput.value.trim();
    const table = guestTableInput.value.trim();
    if (!name || !table) return;
    await Storage.addGuest(weddingId, name, table);
    guestForm.reset();
    await renderGuests();
  });

  guestListEl.addEventListener('click', async (e) => {
    const row = e.target.closest('.guest-row');
    if (!row) return;

    const interactive = e.target.closest('button, a, input, select');
    if (!interactive) {
      document.querySelectorAll('.guest-row.revealed').forEach((el) => {
        if (el !== row) el.classList.remove('revealed');
      });
      row.classList.toggle('revealed');
      return;
    }

    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'delete-guest') {
      await Storage.deleteGuest(weddingId, id);
      await renderGuests();
    } else if (action === 'move-up' || action === 'move-down') {
      await moveGuest(id, action === 'move-up' ? 'up' : 'down');
    }
  });

  guestListEl.addEventListener('change', async (e) => {
    const input = e.target.closest('.guest-table-edit');
    if (!input) return;
    await updateGuestTable(input.dataset.id, input.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.guest-row')) {
      document.querySelectorAll('.guest-row.revealed').forEach((el) => el.classList.remove('revealed'));
    }
  });

  copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(guestLinkInput.value).catch(() => {});
    copyLinkBtn.innerHTML = ICONS.check;
    setTimeout(() => (copyLinkBtn.innerHTML = ICONS.link), 1200);
  });

  if (!weddingId) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  const wedding = await Storage.getWedding(weddingId);
  if (!wedding) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  if (!localStorage.getItem(LANG_KEY)) {
    currentLang = wedding.lang || 'fr';
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  guestPageLink.href = `index.html?id=${weddingId}`;
  guestLinkInput.value = `${window.location.origin}${window.location.pathname.replace('wedding-admin.html', '')}index.html?id=${weddingId}`;
  copyLinkBtn.innerHTML = ICONS.link;
  updateCopyLinkLabel();

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  await renderGuests();
})();
