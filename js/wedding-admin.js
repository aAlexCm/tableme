import { Storage, generateId } from './storage.js';
import { initErrorLogging } from './error-log.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { createTableModal } from './table-modal.js';
import { createGuestModal } from './guest-modal.js';
import { createContactModal } from './contact-modal.js';
import { applyContactMailto } from './contact-mailto.js';
import { createShareControls } from './share-controls.js';
import { isFeatureEnabled } from './features.js';
import { buildCountryCodeOptionsHtml, combinePhone, DEFAULT_COUNTRY_CODE_BY_LANG } from './phone-codes.js';

const LANG_KEY = 'tableme_wedding_admin_lang';
const DEFAULT_SEATS = 8;

const ICONS = {
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  kebab: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  cutlery: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  contact: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M5 16c0-1.5 1.5-3 4-3s4 1.5 4 3"/><path d="M15 9h4"/><path d="M15 13h4"/></svg>',
};

const RSVP_ICONS = {
  pending: ICONS.clock,
  confirmed: ICONS.check,
  declined: ICONS.cross,
};

function parseBulkGuests(text) {
  const entries = [];
  let skipped = 0;
  text.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [name, table, phone] = trimmed.split(';').map((part) => part.trim());
    if (!name || !table) {
      skipped += 1;
      return;
    }
    entries.push({ name, table, phone: phone || '' });
  });
  return { entries, skipped };
}

function parseSheetRows(rows) {
  const entries = [];
  let skipped = 0;
  rows.slice(1).forEach((row) => {
    const name = (row[0] ?? '').toString().trim();
    const table = (row[1] ?? '').toString().trim();
    const phone = (row[2] ?? '').toString().trim();
    if (!name && !table) return;
    if (!name || !table) {
      skipped += 1;
      return;
    }
    entries.push({ name, table, phone });
  });
  return { entries, skipped };
}

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');
  initErrorLogging({ page: 'wedding-admin', weddingId });

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let draggedRow = null;
  let lastDragTarget = null;
  let cachedWedding = null;

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('wedding-admin-content');
  const weddingNameEl = document.getElementById('wedding-admin-name');
  const floorPlanTabLink = document.getElementById('view-tab-floorplan');
  const countdownEl = document.getElementById('wedding-countdown');
  const countdownCaptionEl = document.getElementById('wedding-countdown-caption');
  const countdownDaysEl = document.getElementById('countdown-days');
  const countdownHoursEl = document.getElementById('countdown-hours');
  const countdownMinutesEl = document.getElementById('countdown-minutes');
  const countdownSecondsEl = document.getElementById('countdown-seconds');

  // Counts down to the wedding date, then keeps running past it counting up
  // elapsed time instead of stopping — the caption underneath flips from
  // "until the big day" to "of happy marriage" once it crosses zero.
  function initCountdown(dateStr) {
    if (!countdownEl || !dateStr) return;
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    if (Number.isNaN(target)) return;

    function tick() {
      const diff = target - Date.now();
      const totalSeconds = Math.floor(Math.abs(diff) / 1000);
      countdownDaysEl.textContent = Math.floor(totalSeconds / 86400);
      countdownHoursEl.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
      countdownMinutesEl.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      countdownSecondsEl.textContent = String(totalSeconds % 60).padStart(2, '0');
      countdownCaptionEl.textContent = t(currentLang, diff <= 0 ? 'countdownMarriedCaption' : 'countdownUntilCaption');
    }

    countdownEl.hidden = false;
    tick();
    setInterval(tick, 1000);
  }

  const guestsTitle = document.getElementById('guests-title');
  const guestRsvpSummaryEl = document.getElementById('guest-rsvp-summary');
  const guestSearchEl = document.getElementById('guest-search');
  const guestSearchToggle = document.getElementById('guest-search-toggle');
  const guestSearchInput = document.getElementById('guest-search-input');
  const guestSearchClear = document.getElementById('guest-search-clear');
  let guestSearchQuery = '';
  const guestForm = document.getElementById('guest-form');
  const guestNameInput = document.getElementById('guest-name');
  const guestTableInput = document.getElementById('guest-table');
  const guestPhoneCodeSelect = document.getElementById('guest-phone-code');
  const guestPhoneInput = document.getElementById('guest-phone');
  guestPhoneCodeSelect.innerHTML = buildCountryCodeOptionsHtml(DEFAULT_COUNTRY_CODE_BY_LANG[currentLang] || '33');
  const guestListEl = document.getElementById('guest-list');
  const guestEmptyEl = document.getElementById('guest-empty');

  const modeSwitchEl = document.getElementById('add-mode-switch');
  const bulkAddPanel = document.getElementById('bulk-add-panel');
  const bulkAddTextarea = document.getElementById('bulk-add-textarea');
  const bulkAddSubmitBtn = document.getElementById('bulk-add-submit');
  const bulkAddFeedbackEl = document.getElementById('bulk-add-feedback');

  const fileAddPanel = document.getElementById('file-add-panel');
  const downloadTemplateBtn = document.getElementById('download-template-btn');
  const fileDropzone = document.getElementById('file-dropzone');
  const fileImportInput = document.getElementById('file-import-input');
  const fileAddFeedbackEl = document.getElementById('file-add-feedback');

  const tableModalApi = createTableModal({
    weddingId,
    getLang: () => currentLang,
    onChange: renderGuests,
  });

  const guestModalApi = createGuestModal({
    weddingId,
    getLang: () => currentLang,
    onChange: renderGuests,
  });

  const contactModalApi = createContactModal({
    weddingId,
    getLang: () => currentLang,
  });

  const shareControls = createShareControls({
    getLang: () => currentLang,
    weddingNameEl,
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function buildGuestMenuOptionsHtml(menus, currentMenuId) {
    const unassignedOpt = `<option value="" ${currentMenuId ? '' : 'selected'}>${escapeHtml(t(currentLang, 'unassignedOption'))}</option>`;
    const options = menus
      .map((menu) => `<option value="${escapeHtml(menu.id)}" ${menu.id === currentMenuId ? 'selected' : ''}>${escapeHtml(menu.title)}</option>`)
      .join('');
    return unassignedOpt + options;
  }

  function buildGuestRsvpOptionsHtml(currentStatus) {
    const status = currentStatus || 'pending';
    return ['pending', 'confirmed', 'declined']
      .map((value) => `<option value="${value}" ${value === status ? 'selected' : ''}>${escapeHtml(t(currentLang, `guestRsvp${value[0].toUpperCase()}${value.slice(1)}`))}</option>`)
      .join('');
  }

  function updatePageTitle() {
    document.title = 'TableMe · Guests';
  }

  function applyFeatureGating(wedding) {
    const bulkImportEnabled = isFeatureEnabled(wedding, 'bulkImport');
    document.querySelectorAll('#add-mode-switch .mode-btn[data-mode="bulk"], #add-mode-switch .mode-btn[data-mode="file"]')
      .forEach((btn) => { btn.hidden = !bulkImportEnabled; });

    const themeTile = document.getElementById('theme-settings-tile');
    const themeTileBadge = document.getElementById('theme-settings-tile-badge');
    if (themeTile) {
      const themeEnabled = isFeatureEnabled(wedding, 'themeCustomization');
      themeTile.classList.toggle('is-disabled', !themeEnabled);
      themeTile.setAttribute('aria-disabled', String(!themeEnabled));
      if (themeTileBadge) themeTileBadge.hidden = themeEnabled;
      if (themeEnabled) themeTile.href = `theme-settings.html?id=${weddingId}`;
      else themeTile.removeAttribute('href');
    }

    const qrBtn = document.getElementById('qr-code-btn');
    if (qrBtn) qrBtn.hidden = !isFeatureEnabled(wedding, 'qrShare');

    const partnersTile = document.getElementById('partners-tile');
    if (partnersTile) partnersTile.hidden = !isFeatureEnabled(wedding, 'sponsorPartners');

    floorPlanTabLink.hidden = !isFeatureEnabled(wedding, 'floorPlan');

    const menuTile = document.getElementById('menu-tile');
    if (menuTile) menuTile.hidden = !isFeatureEnabled(wedding, 'menuManagement');

    // Unlike the other gated tiles (which vanish when off), the poster tile
    // stays visible but grayed-out with a contact-us badge — it's a feature
    // the couple can be upsold on, not one that should look like it doesn't exist.
    const posterTile = document.getElementById('poster-tile');
    const posterTileBadge = document.getElementById('poster-tile-badge');
    if (posterTile) {
      const posterEnabled = isFeatureEnabled(wedding, 'poster');
      posterTile.classList.toggle('is-disabled', !posterEnabled);
      posterTile.setAttribute('aria-disabled', String(!posterEnabled));
      if (posterTileBadge) posterTileBadge.hidden = posterEnabled;
      if (posterEnabled) posterTile.href = `poster.html?id=${weddingId}`;
      else posterTile.removeAttribute('href');
    }

    // Same grayed-out + contact-us pattern as the poster tile above — still
    // under construction, so it stays off by default until enabled per couple.
    const invitationTile = document.getElementById('invitation-tile');
    const invitationTileBadge = document.getElementById('invitation-tile-badge');
    if (invitationTile) {
      const invitationEnabled = isFeatureEnabled(wedding, 'digitalInvitation');
      invitationTile.classList.toggle('is-disabled', !invitationEnabled);
      invitationTile.setAttribute('aria-disabled', String(!invitationEnabled));
      if (invitationTileBadge) invitationTileBadge.hidden = invitationEnabled;
      if (invitationEnabled) invitationTile.href = `invitation.html?id=${weddingId}`;
      else invitationTile.removeAttribute('href');
    }
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    shareControls.updateLabels();
    tableModalApi.updateLabels();
    applyContactMailto(document.getElementById('contact-link'), lang);
    updatePageTitle();
    renderGuests();
  }

  function groupGuestsByTable(guests, tableLabels) {
    const groups = new Map();
    guests.forEach((g) => {
      const key = g.table || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(g);
    });
    (tableLabels || []).forEach((label) => {
      const key = label || '';
      if (!groups.has(key)) groups.set(key, []);
    });
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
    return sortedKeys.map((key) => ({ key, guests: groups.get(key) }));
  }

  function buildTableBuckets(guests) {
    const buckets = new Map();
    guests.forEach((g) => {
      const key = g.table || '';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(g);
    });
    return buckets;
  }

  function trimTrailingEmpties(bucket) {
    let end = bucket.length;
    while (end > 0 && bucket[end - 1].empty) end -= 1;
    return bucket.slice(0, end);
  }

  function clearDropHighlight() {
    document.querySelectorAll('.guest-row-drop-target').forEach((el) => el.classList.remove('guest-row-drop-target'));
  }

  function highlightDropTarget(target) {
    if (target === lastDragTarget) return;
    clearDropHighlight();
    if (target) target.classList.add('guest-row-drop-target');
    lastDragTarget = target;
  }

  function getRowUnderPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest('.guest-row, .guest-row-empty');
  }

  // Every row — occupied or empty — is a seat "container". Dropping a guest
  // onto another container swaps the two: a real guest swaps tables/positions
  // with whoever was there, an empty container just receives them and their
  // old seat becomes the new gap (or just shrinks away if it was trailing
  // capacity with no one seated after it).
  async function moveGuestToContainer(sourceRow, targetRow) {
    if (!sourceRow || !targetRow || sourceRow === targetRow) return;
    const wedding = cachedWedding || (await Storage.getWedding(weddingId));
    if (!wedding) return;

    const sourceTableKey = sourceRow.closest('.table-guest-list').dataset.table;
    const targetTableKey = targetRow.closest('.table-guest-list').dataset.table;
    const sourceId = sourceRow.dataset.id;
    const targetId = targetRow.dataset.id;
    const targetIsEmpty = targetRow.classList.contains('guest-row-empty');
    // A synthetic trailing placeholder (beyond the persisted bucket) has no id
    // to look up — the row's actual position in its list is the target slot.
    const targetSlot = [...targetRow.parentElement.children].indexOf(targetRow);

    // Captures only DOM-derived ids/positions above, so this is safe to run
    // more than once against whatever the latest server guests array turns
    // out to be — mutateGuests below re-runs it if another write raced in.
    function mutate(guests) {
      const buckets = buildTableBuckets(guests);
      const sourceBucket = buckets.get(sourceTableKey) || [];
      const sourceIdx = sourceBucket.findIndex((g) => g.id === sourceId);
      if (sourceIdx === -1) return guests;
      const sourceGuest = sourceBucket[sourceIdx];
      const targetBucket = buckets.get(targetTableKey) || [];
      buckets.set(sourceTableKey, sourceBucket);
      buckets.set(targetTableKey, targetBucket);

      if (!targetIsEmpty) {
        const targetIdx = targetBucket.findIndex((g) => g.id === targetId);
        if (targetIdx === -1) return guests;
        const targetGuest = targetBucket[targetIdx];
        sourceBucket[sourceIdx] = { ...targetGuest, table: sourceTableKey };
        targetBucket[targetIdx] = { ...sourceGuest, table: targetTableKey };
      } else {
        while (targetBucket.length <= targetSlot) {
          targetBucket.push({ id: generateId(), table: targetTableKey, empty: true });
        }
        targetBucket[targetSlot] = { ...sourceGuest, table: targetTableKey };
        // Read everything needed from sourceBucket before mutating it — when
        // source and target are the same table this is the same array.
        sourceBucket[sourceIdx] = { id: generateId(), table: sourceTableKey, empty: true };
      }

      const newGuests = [];
      buckets.forEach((bucket) => newGuests.push(...trimTrailingEmpties(bucket)));
      return newGuests;
    }

    // Render immediately from the locally-computed result instead of waiting
    // on a write + a re-fetch round trip — that double network hop is what
    // made the drop feel like it landed a full second late.
    await renderGuests({ ...wedding, guests: mutate(wedding.guests) });
    await saveGuestsWithRetry(mutate);
  }

  // Same fix as moveGuestToContainer above: build off cachedWedding and render
  // immediately, then write in the background, instead of fetch + write + fetch.
  // The write itself goes through Storage.mutateGuests, a Firestore transaction
  // that re-applies `mutate` to whatever's actually on the server — so even two
  // edits landing at nearly the same time (same tab, another tab, another
  // device) both survive instead of the second one silently overwriting the
  // first.
  async function updateGuestTable(guestId, newTable) {
    const table = newTable.trim();
    if (!table) {
      await renderGuests();
      return;
    }
    const wedding = cachedWedding || (await Storage.getWedding(weddingId));
    if (!wedding) return;
    const mutate = (guests) => guests.map((g) => (g.id === guestId ? { ...g, table } : g));
    await renderGuests({ ...wedding, guests: mutate(wedding.guests) });
    await saveGuestsWithRetry(mutate);
  }

  async function updateGuestMenu(guestId, menuId) {
    const wedding = cachedWedding || (await Storage.getWedding(weddingId));
    if (!wedding) return;
    const mutate = (guests) => guests.map((g) => (g.id === guestId ? { ...g, menuId } : g));
    await renderGuests({ ...wedding, guests: mutate(wedding.guests) });
    await saveGuestsWithRetry(mutate);
  }

  async function updateGuestRsvp(guestId, rsvp) {
    const wedding = cachedWedding || (await Storage.getWedding(weddingId));
    if (!wedding) return;
    const mutate = (guests) => guests.map((g) => (g.id === guestId ? { ...g, rsvp } : g));
    await renderGuests({ ...wedding, guests: mutate(wedding.guests) });
    await saveGuestsWithRetry(mutate);
  }

  async function saveGuestsWithRetry(mutate) {
    try {
      await Storage.mutateGuests(weddingId, mutate);
    } catch (err) {
      console.error('mutateGuests failed', err);
      alert(t(currentLang, 'saveErrorRetry'));
      await renderGuests();
    }
  }

  function attachRowDragEvents(row) {
    let ghostEl = null;

    function startDrag() {
      draggedRow = row;
      lastDragTarget = null;
      row.classList.add('dragging');
      document.body.classList.add('dragging-guest-row');
    }

    async function endDrag() {
      row.classList.remove('dragging');
      document.body.classList.remove('dragging-guest-row');
      const target = lastDragTarget;
      clearDropHighlight();
      const source = draggedRow;
      draggedRow = null;
      if (ghostEl) {
        ghostEl.remove();
        ghostEl = null;
      }
      await moveGuestToContainer(source, target);
    }

    row.addEventListener('dragstart', startDrag);
    // 'dragend' always fires once a drag operation ends, unlike 'drop' which
    // some embedded/webview browsers fail to dispatch reliably — committing
    // here guarantees the move is actually persisted.
    row.addEventListener('dragend', endDrag);

    const handle = row.querySelector('.drag-handle');

    handle.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        startDrag();
        ghostEl = document.createElement('div');
        ghostEl.className = 'guest-row-drag-ghost';
        ghostEl.textContent = row.querySelector('.guest-row-name')?.textContent || '';
        document.body.appendChild(ghostEl);
      },
      { passive: false }
    );

    handle.addEventListener(
      'touchmove',
      (e) => {
        if (!draggedRow) return;
        e.preventDefault();
        const touch = e.touches[0];
        if (ghostEl) {
          ghostEl.style.left = `${touch.clientX}px`;
          ghostEl.style.top = `${touch.clientY}px`;
        }
        const hovered = getRowUnderPoint(touch.clientX, touch.clientY);
        highlightDropTarget(hovered && hovered !== draggedRow ? hovered : null);
      },
      { passive: false }
    );

    handle.addEventListener('touchend', async () => {
      if (!draggedRow) return;
      await endDrag();
    });
  }

  function attachListDropEvents(list) {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedRow) return;
      const hovered = getRowUnderPoint(e.clientX, e.clientY);
      highlightDropTarget(hovered && hovered !== draggedRow ? hovered : null);
    });

    list.addEventListener('drop', (e) => {
      // Actual persistence happens in the row's 'dragend' handler, which is
      // guaranteed to fire; this just stops the browser's default drop
      // behavior (e.g. navigating to dropped text/links).
      e.preventDefault();
    });
  }

  function renderGuestRsvpSummary(guests) {
    const realGuests = guests.filter((g) => !g.empty);
    if (realGuests.length === 0) {
      guestRsvpSummaryEl.innerHTML = '';
      return;
    }
    const counts = { pending: 0, confirmed: 0, declined: 0 };
    realGuests.forEach((g) => {
      const rsvp = g.rsvp || 'pending';
      counts[rsvp] = (counts[rsvp] || 0) + 1;
    });
    guestRsvpSummaryEl.innerHTML = ['confirmed', 'pending', 'declined'].map((rsvp) => `
      <span class="guest-rsvp-summary-pill" data-rsvp="${rsvp}" aria-label="${escapeHtml(t(currentLang, `guestRsvp${rsvp[0].toUpperCase()}${rsvp.slice(1)}`))}">
        ${RSVP_ICONS[rsvp]}
        <span>${counts[rsvp]}</span>
      </span>
    `).join('');
  }

  async function renderGuests(weddingOverride) {
    const wedding = weddingOverride || (await Storage.getWedding(weddingId));
    if (!wedding) return;
    cachedWedding = wedding;

    guestsTitle.textContent = `${t(currentLang, 'guestsTitlePrefix')}${wedding.name}`;
    guestSearchToggle.setAttribute('aria-label', t(currentLang, 'guestSearchToggleLabel'));
    guestSearchClear.setAttribute('aria-label', t(currentLang, 'guestSearchClearLabel'));
    renderGuestRsvpSummary(wedding.guests);
    guestListEl.innerHTML = '';
    guestEmptyEl.hidden = wedding.guests.some((g) => !g.empty);

    const tableLabels = (wedding.tables || []).map((tb) => tb.label).filter(Boolean);
    const tableByLabel = new Map((wedding.tables || []).map((tb) => [tb.label, tb]));

    groupGuestsByTable(wedding.guests, tableLabels).forEach(({ key, guests }) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'table-group';
      groupEl.dataset.tableSearch = `${t(currentLang, 'tableLabel')} ${key || ''}`;

      const table = tableByLabel.get(key);
      const editLabel = escapeHtml(t(currentLang, 'editTableBtn'));
      const deleteTableLabel = escapeHtml(t(currentLang, 'deleteTableBtn'));

      const titleRow = document.createElement('div');
      titleRow.className = 'table-group-title-row';

      const title = document.createElement('h3');
      title.className = 'table-group-title';
      const realGuestCount = guests.filter((g) => !g.empty).length;
      title.innerHTML = `${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(key || '—')}`
        + (table ? ` <span class="table-group-count">(${realGuestCount}/${table.seats != null ? table.seats : DEFAULT_SEATS})</span>` : '');
      titleRow.appendChild(title);

      if (table) {
        const actions = document.createElement('span');
        actions.className = 'table-group-actions';
        actions.innerHTML = `
          <button type="button" class="icon-btn" data-action="edit-table" data-table-id="${table.id}" title="${editLabel}" aria-label="${editLabel}">${ICONS.pencil}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete-table" data-table-id="${table.id}" title="${deleteTableLabel}" aria-label="${deleteTableLabel}">${ICONS.trash}</button>
        `;
        titleRow.appendChild(actions);
      }

      groupEl.appendChild(titleRow);

      const list = document.createElement('ul');
      list.className = 'table-guest-list';
      list.dataset.table = key;

      function renderGuestRow(g) {
        const deleteLabel = escapeHtml(t(currentLang, 'deleteBtn'));
        const rsvp = g.rsvp || 'pending';
        const li = document.createElement('li');
        li.className = 'guest-row';
        li.draggable = true;
        li.dataset.id = g.id;
        li.innerHTML = `
          <span class="drag-handle">&#10303;</span>
          <span class="guest-row-name">${escapeHtml(g.name)}</span>
          <span class="guest-row-contact">
            ${g.phone ? `<button type="button" class="guest-row-contact-icon" data-action="open-contact" data-id="${g.id}" title="${escapeHtml(t(currentLang, 'contactBtnLabel'))}" aria-label="${escapeHtml(t(currentLang, 'contactBtnLabel'))}">${ICONS.contact}</button>` : ''}
          </span>
          <span class="guest-menu-edit-wrap" data-has-menu="${g.menuId ? '1' : '0'}">
            <span class="guest-row-mobile-icon" aria-hidden="true">${ICONS.cutlery}</span>
            <select class="guest-menu-edit" data-id="${g.id}" aria-label="${escapeHtml(t(currentLang, 'guestMenuLabel'))}">${buildGuestMenuOptionsHtml(wedding.menus || [], g.menuId || '')}</select>
          </span>
          <span class="guest-rsvp-edit-wrap" data-rsvp="${rsvp}">
            <span class="guest-row-mobile-icon" aria-hidden="true">${RSVP_ICONS[rsvp]}</span>
            <select class="guest-rsvp-edit" data-id="${g.id}" aria-label="${escapeHtml(t(currentLang, 'guestRsvpLabel'))}">${buildGuestRsvpOptionsHtml(rsvp)}</select>
          </span>
          <span class="guest-row-more">
            <button type="button" class="icon-btn guest-row-more-btn" data-action="toggle-more" aria-haspopup="true" aria-expanded="false" aria-label="${escapeHtml(t(currentLang, 'moreActionsLabel'))}">${ICONS.kebab}</button>
            <div class="guest-row-more-menu" hidden>
              <label class="guest-row-more-field">
                <span>${escapeHtml(t(currentLang, 'tableLabel'))}</span>
                <input type="text" class="guest-table-edit" data-id="${g.id}" value="${escapeHtml(g.table)}" aria-label="${escapeHtml(t(currentLang, 'tableLabel'))}" />
              </label>
              <button type="button" class="guest-row-more-delete" data-action="delete-guest" data-id="${g.id}">${ICONS.trash} ${deleteLabel}</button>
            </div>
          </span>
        `;
        attachRowDragEvents(li);
        return li;
      }

      function renderEmptySeatRow(id) {
        const li = document.createElement('li');
        li.className = 'guest-row-empty';
        li.dataset.id = id || generateId();
        const label = document.createElement('span');
        label.className = 'guest-row-empty-label';
        label.textContent = t(currentLang, 'emptySeatPlaceholder');
        li.appendChild(label);
        if (table) {
          const actions = document.createElement('span');
          actions.className = 'guest-row-empty-actions';

          const fillLabel = escapeHtml(t(currentLang, 'fillSeatBtn'));
          const fillBtn = document.createElement('button');
          fillBtn.type = 'button';
          fillBtn.className = 'icon-btn guest-row-empty-fill';
          fillBtn.dataset.action = 'fill-empty-seat';
          fillBtn.dataset.table = key;
          fillBtn.title = fillLabel;
          fillBtn.setAttribute('aria-label', fillLabel);
          fillBtn.innerHTML = ICONS.plus;
          actions.appendChild(fillBtn);

          const deleteLabel = escapeHtml(t(currentLang, 'deleteSeatBtn'));
          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'icon-btn icon-btn-danger guest-row-empty-delete';
          deleteBtn.dataset.action = 'delete-seat';
          deleteBtn.dataset.id = li.dataset.id;
          deleteBtn.dataset.tableId = table.id;
          deleteBtn.title = deleteLabel;
          deleteBtn.setAttribute('aria-label', deleteLabel);
          deleteBtn.innerHTML = ICONS.trash;
          actions.appendChild(deleteBtn);

          li.appendChild(actions);
        }
        return li;
      }

      if (table) {
        const seatCount = table.seats != null ? table.seats : DEFAULT_SEATS;
        // Render the persisted order as-is (real guests plus any intentional
        // gaps the couple dragged in) then top up with extra placeholder rows
        // to fill the table up to its seat count. Never hide guests beyond
        // the seat count (e.g. a table with more guests than seats) — only
        // expand to show extra rows, never drop anyone.
        guests.forEach((g) => {
          list.appendChild(g.empty ? renderEmptySeatRow(g.id) : renderGuestRow(g));
        });
        for (let i = guests.length; i < seatCount; i += 1) {
          list.appendChild(renderEmptySeatRow());
        }
        const addSeatLabel = escapeHtml(t(currentLang, 'addSeatBtn'));
        const addSeatLi = document.createElement('li');
        addSeatLi.className = 'guest-row-add-seat';
        addSeatLi.innerHTML = `
          <button type="button" class="icon-btn" data-action="add-seat" data-table-id="${table.id}" title="${addSeatLabel}" aria-label="${addSeatLabel}">${ICONS.plus}</button>
        `;
        list.appendChild(addSeatLi);
      } else if (guests.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'table-guest-list-empty';
        emptyLi.textContent = t(currentLang, 'tableGuestsEmpty');
        list.appendChild(emptyLi);
      } else {
        guests.forEach((g) => list.appendChild(renderGuestRow(g)));
      }

      attachListDropEvents(list);
      groupEl.appendChild(list);
      guestListEl.appendChild(groupEl);
    });

    applyGuestSearchFilter();
  }

  function normalizeSearchText(value) {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function applyGuestSearchFilter() {
    const q = normalizeSearchText(guestSearchQuery);
    guestListEl.querySelectorAll('.table-group').forEach((groupEl) => {
      if (!q) {
        groupEl.hidden = false;
        groupEl.querySelectorAll('.guest-row, .guest-row-empty, .guest-row-add-seat, .table-guest-list-empty')
          .forEach((row) => { row.hidden = false; });
        return;
      }
      const tableMatches = normalizeSearchText(groupEl.dataset.tableSearch).includes(q);
      let anyGuestVisible = false;
      groupEl.querySelectorAll('.guest-row').forEach((row) => {
        const name = row.querySelector('.guest-row-name')?.textContent || '';
        const matches = tableMatches || normalizeSearchText(name).includes(q);
        row.hidden = !matches;
        if (matches) anyGuestVisible = true;
      });
      groupEl.querySelectorAll('.guest-row-empty, .guest-row-add-seat, .table-guest-list-empty')
        .forEach((row) => { row.hidden = !tableMatches; });
      groupEl.hidden = !tableMatches && !anyGuestVisible;
    });
  }

  function fillEmptySeatForm(tableLabel) {
    addGuestCard.classList.add('is-open');
    addGuestToggle.setAttribute('aria-expanded', 'true');
    const singleModeBtn = modeSwitchEl.querySelector('.mode-btn[data-mode="single"]');
    if (singleModeBtn && !singleModeBtn.classList.contains('active')) singleModeBtn.click();
    guestTableInput.value = tableLabel || '';
    guestForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    guestNameInput.focus();
  }

  guestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = guestNameInput.value.trim();
    const table = guestTableInput.value.trim();
    const phone = combinePhone(guestPhoneCodeSelect.value, guestPhoneInput.value);
    if (!name || !table) return;
    try {
      await Storage.addGuest(weddingId, name, table, phone);
    } catch (err) {
      console.error('addGuest failed', err);
      alert(t(currentLang, 'saveErrorRetry'));
      return;
    }
    guestForm.reset();
    await renderGuests();
  });

  const addGuestCard = document.getElementById('add-guest-card');
  const addGuestToggle = document.getElementById('add-guest-toggle');
  addGuestToggle.addEventListener('click', () => {
    const open = addGuestCard.classList.toggle('is-open');
    addGuestToggle.setAttribute('aria-expanded', String(open));
  });

  modeSwitchEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    const mode = btn.dataset.mode;
    modeSwitchEl.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
    guestForm.hidden = mode !== 'single';
    bulkAddPanel.hidden = mode !== 'bulk';
    fileAddPanel.hidden = mode !== 'file';
    bulkAddFeedbackEl.hidden = true;
    fileAddFeedbackEl.hidden = true;
  });

  bulkAddSubmitBtn.addEventListener('click', async () => {
    const { entries, skipped } = parseBulkGuests(bulkAddTextarea.value);
    bulkAddFeedbackEl.hidden = false;
    if (entries.length === 0) {
      bulkAddFeedbackEl.textContent = t(currentLang, 'bulkAddEmpty');
      return;
    }
    try {
      await Storage.addGuests(weddingId, entries);
    } catch (err) {
      console.error('addGuests failed', err);
      bulkAddFeedbackEl.textContent = t(currentLang, 'saveErrorRetry');
      return;
    }
    bulkAddTextarea.value = '';
    bulkAddFeedbackEl.textContent =
      t(currentLang, 'bulkAddSuccess', entries.length) + (skipped > 0 ? t(currentLang, 'bulkAddSkipped', skipped) : '');
    await renderGuests();
  });

  downloadTemplateBtn.addEventListener('click', () => {
    const header = [
      t(currentLang, 'guestNameLabel'),
      t(currentLang, 'guestTableLabel'),
      t(currentLang, 'guestPhoneLabel'),
    ].join(',');
    const examples = t(currentLang, 'fileTemplateExample');
    const csv = `${header}\n${examples}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modele-invites-tableme.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  async function processImportedFile(file) {
    fileAddFeedbackEl.hidden = false;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const { entries, skipped } = parseSheetRows(rows);
      if (entries.length === 0) {
        fileAddFeedbackEl.textContent = t(currentLang, 'bulkAddEmpty');
        return;
      }
      await Storage.addGuests(weddingId, entries);
      fileAddFeedbackEl.textContent =
        t(currentLang, 'bulkAddSuccess', entries.length) + (skipped > 0 ? t(currentLang, 'bulkAddSkipped', skipped) : '');
      await renderGuests();
    } catch {
      fileAddFeedbackEl.textContent = t(currentLang, 'fileImportError');
    } finally {
      fileImportInput.value = '';
    }
  }

  fileDropzone.addEventListener('click', () => fileImportInput.click());
  fileDropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileImportInput.click();
    }
  });

  fileImportInput.addEventListener('change', () => {
    const file = fileImportInput.files[0];
    if (file) processImportedFile(file);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    fileDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      fileDropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'dragend', 'drop'].forEach((evt) => {
    fileDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      fileDropzone.classList.remove('dragover');
    });
  });

  fileDropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) processImportedFile(file);
  });

  guestListEl.addEventListener('click', async (e) => {
    const titleRow = e.target.closest('.table-group-title-row');
    if (titleRow) {
      const tableBtn = e.target.closest('button');
      if (!tableBtn) {
        document.querySelectorAll('.revealed').forEach((el) => {
          if (el !== titleRow) el.classList.remove('revealed');
        });
        titleRow.classList.toggle('revealed');
        return;
      }
      const { action, tableId } = tableBtn.dataset;
      if (action === 'edit-table') {
        await tableModalApi.open(tableId);
      } else if (action === 'delete-table') {
        const wedding = cachedWedding || (await Storage.getWedding(weddingId));
        if (!wedding) return;
        const table = (wedding.tables || []).find((tb) => tb.id === tableId);
        if (!table) return;
        const affected = wedding.guests.filter((g) => g.table === table.label && !g.empty).length;
        if (!confirm(t(currentLang, 'confirmDeleteTable', affected))) return;
        function mutate(guests, tables) {
          const tb = tables.find((t) => t.id === tableId);
          if (!tb) return { guests, tables };
          return {
            tables: tables.filter((t) => t.id !== tableId),
            guests: guests
              .filter((g) => !(g.empty && g.table === tb.label))
              .map((g) => (g.table === tb.label ? { ...g, table: '' } : g)),
          };
        }
        const optimistic = mutate(wedding.guests, wedding.tables);
        await renderGuests({ ...wedding, ...optimistic });
        try {
          await Storage.mutateGuestsAndTables(weddingId, mutate);
        } catch (err) {
          console.error('mutateGuestsAndTables failed', err);
          alert(t(currentLang, 'saveErrorRetry'));
          await renderGuests();
        }
      }
      return;
    }

    const addSeatBtn = e.target.closest('button[data-action="add-seat"]');
    if (addSeatBtn) {
      const { tableId } = addSeatBtn.dataset;
      const wedding = cachedWedding || (await Storage.getWedding(weddingId));
      if (!wedding) return;
      const table = (wedding.tables || []).find((tb) => tb.id === tableId);
      if (!table) return;
      const mutateTables = (tables) => tables.map((tb) => (
        tb.id === tableId ? { ...tb, seats: (tb.seats != null ? tb.seats : DEFAULT_SEATS) + 1 } : tb
      ));
      await renderGuests({ ...wedding, tables: mutateTables(wedding.tables) });
      try {
        await Storage.mutateTables(weddingId, mutateTables);
      } catch (err) {
        console.error('mutateTables failed', err);
        alert(t(currentLang, 'saveErrorRetry'));
        await renderGuests();
      }
      return;
    }

    const emptyRow = e.target.closest('.guest-row-empty');
    if (emptyRow) {
      const fillBtn = e.target.closest('button[data-action="fill-empty-seat"]');
      if (fillBtn) {
        fillEmptySeatForm(fillBtn.dataset.table);
        return;
      }
      const deleteBtn = e.target.closest('button[data-action="delete-seat"]');
      if (!deleteBtn) {
        document.querySelectorAll('.revealed').forEach((el) => {
          if (el !== emptyRow) el.classList.remove('revealed');
        });
        emptyRow.classList.toggle('revealed');
        return;
      }
      const { id: seatId, tableId } = deleteBtn.dataset;
      const wedding = cachedWedding || (await Storage.getWedding(weddingId));
      if (!wedding) return;
      const table = (wedding.tables || []).find((tb) => tb.id === tableId);
      if (!table) return;
      // A synthetic trailing placeholder has no matching entry in
      // wedding.guests — filtering it out is then simply a no-op, which is
      // exactly right since there's nothing real to remove.
      function mutate(guests, tables) {
        const tb = tables.find((t) => t.id === tableId);
        if (!tb) return { guests, tables };
        const currentSeats = tb.seats != null ? tb.seats : DEFAULT_SEATS;
        return {
          tables: tables.map((t) => (t.id === tableId ? { ...t, seats: Math.max(0, currentSeats - 1) } : t)),
          guests: guests.filter((g) => g.id !== seatId),
        };
      }
      const optimistic = mutate(wedding.guests, wedding.tables);
      await renderGuests({ ...wedding, ...optimistic });
      try {
        await Storage.mutateGuestsAndTables(weddingId, mutate);
      } catch (err) {
        console.error('mutateGuestsAndTables failed', err);
        alert(t(currentLang, 'saveErrorRetry'));
        await renderGuests();
      }
      return;
    }

    const row = e.target.closest('.guest-row');
    if (!row) return;

    if (e.target.closest('.guest-row-name')) {
      await guestModalApi.open(row.dataset.id);
      return;
    }

    const btn = e.target.closest('button');
    if (!btn) {
      // Selects (menu/rsvp) aren't buttons but should open normally, never
      // get treated as a reveal tap — only an empty patch of the row toggles
      // the hidden menu/more controls into view.
      if (e.target.closest('select') || e.target.closest('.guest-rsvp-edit-wrap') || e.target.closest('.guest-menu-edit-wrap')) return;
      document.querySelectorAll('.revealed').forEach((el) => {
        if (el !== row) el.classList.remove('revealed');
      });
      row.classList.toggle('revealed');
      return;
    }
    const { action, id } = btn.dataset;
    if (action === 'delete-guest') {
      try {
        await Storage.deleteGuest(weddingId, id);
      } catch (err) {
        console.error('deleteGuest failed', err);
        alert(t(currentLang, 'saveErrorRetry'));
      }
      await renderGuests();
    } else if (action === 'toggle-more') {
      const menu = btn.nextElementSibling;
      const willOpen = menu.hidden;
      document.querySelectorAll('.guest-row-more-menu').forEach((el) => {
        el.hidden = true;
        el.previousElementSibling.setAttribute('aria-expanded', 'false');
      });
      menu.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
    } else if (action === 'open-contact') {
      const wedding = cachedWedding || (await Storage.getWedding(weddingId));
      const guest = wedding && wedding.guests.find((g) => g.id === id);
      if (guest) contactModalApi.open(guest);
    }
  });

  guestListEl.addEventListener('change', async (e) => {
    const tableInput = e.target.closest('.guest-table-edit');
    if (tableInput) {
      await updateGuestTable(tableInput.dataset.id, tableInput.value);
      return;
    }
    const menuSelect = e.target.closest('.guest-menu-edit');
    if (menuSelect) {
      await updateGuestMenu(menuSelect.dataset.id, menuSelect.value);
      return;
    }
    const rsvpSelect = e.target.closest('.guest-rsvp-edit');
    if (rsvpSelect) {
      await updateGuestRsvp(rsvpSelect.dataset.id, rsvpSelect.value);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.guest-row-more')) {
      document.querySelectorAll('.guest-row-more-menu:not([hidden])').forEach((el) => {
        el.hidden = true;
        el.previousElementSibling.setAttribute('aria-expanded', 'false');
      });
    }
    if (!e.target.closest('.table-group-title-row')) {
      document.querySelectorAll('.table-group-title-row.revealed').forEach((el) => el.classList.remove('revealed'));
    }
    if (!e.target.closest('.guest-row')) {
      document.querySelectorAll('.guest-row.revealed').forEach((el) => el.classList.remove('revealed'));
    }
    if (!e.target.closest('.guest-row-empty')) {
      document.querySelectorAll('.guest-row-empty.revealed').forEach((el) => el.classList.remove('revealed'));
    }
    if (!e.target.closest('#guest-search') && !guestSearchQuery) {
      guestSearchEl.classList.remove('is-open');
      guestSearchToggle.setAttribute('aria-expanded', 'false');
    }
  });

  function openGuestSearch() {
    guestSearchEl.classList.add('is-open');
    guestSearchToggle.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => guestSearchInput.focus());
  }

  function closeGuestSearch() {
    guestSearchEl.classList.remove('is-open');
    guestSearchToggle.setAttribute('aria-expanded', 'false');
    guestSearchInput.value = '';
    guestSearchQuery = '';
    guestSearchClear.hidden = true;
    applyGuestSearchFilter();
  }

  guestSearchToggle.addEventListener('click', () => {
    if (guestSearchEl.classList.contains('is-open')) closeGuestSearch();
    else openGuestSearch();
  });

  guestSearchInput.addEventListener('input', () => {
    guestSearchQuery = guestSearchInput.value;
    guestSearchClear.hidden = !guestSearchQuery;
    applyGuestSearchFilter();
  });

  guestSearchClear.addEventListener('click', () => {
    guestSearchInput.value = '';
    guestSearchQuery = '';
    guestSearchClear.hidden = true;
    guestSearchInput.focus();
    applyGuestSearchFilter();
  });

  if (!weddingId) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  let wedding;
  try {
    wedding = await Storage.getWedding(weddingId);
  } catch (err) {
    console.error('getWedding failed', err);
    document.getElementById('connection-error').hidden = false;
    document.getElementById('connection-error-retry').addEventListener('click', () => location.reload());
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }
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
  try {
    initCountdown(wedding.date);
  } catch (err) {
    console.warn('countdown init failed', err);
  }
  floorPlanTabLink.href = `floor-plan.html?id=${weddingId}`;
  const partnersTile = document.getElementById('partners-tile');
  if (partnersTile) partnersTile.href = `partenaires.html?id=${weddingId}`;
  const todoTile = document.getElementById('todo-tile');
  const todoTileBadge = document.getElementById('todo-tile-badge');
  if (todoTile) {
    const todoEnabled = isFeatureEnabled(wedding, 'todoList');
    todoTile.classList.toggle('is-disabled', !todoEnabled);
    todoTile.setAttribute('aria-disabled', String(!todoEnabled));
    if (todoTileBadge) todoTileBadge.hidden = todoEnabled;
    if (todoEnabled) todoTile.href = `todo.html?id=${weddingId}`;
    else todoTile.removeAttribute('href');
  }
  const menuTile = document.getElementById('menu-tile');
  if (menuTile) menuTile.href = `menu.html?id=${weddingId}`;
  const themeTile = document.getElementById('theme-settings-tile');
  if (themeTile) themeTile.href = `theme-settings.html?id=${weddingId}`;
  shareControls.init(weddingId);
  updatePageTitle();
  applyFeatureGating(wedding);
  applyContactMailto(document.getElementById('contact-link'), currentLang);

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  await renderGuests();

  // Keeps the guest list in sync with changes made elsewhere — most
  // importantly a guest confirming/declining via their own RSVP link, which
  // should show up here live instead of needing a manual reload. The first
  // snapshot fires immediately with what we just rendered above, so it's
  // skipped to avoid a redundant render.
  let isFirstSnapshot = true;
  Storage.subscribeToWedding(weddingId, (liveWedding) => {
    if (isFirstSnapshot) {
      isFirstSnapshot = false;
      return;
    }
    if (!liveWedding) return;
    renderGuests(liveWedding);
  });
})();
