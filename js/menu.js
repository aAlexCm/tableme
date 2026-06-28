import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { isFeatureEnabled } from './features.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

const TRASH_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let wedding = null;
  let editingMenuId = null;
  let editingDishId = null;

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('menu-content');
  const weddingNameEl = document.getElementById('menu-wedding-name');
  const backLinkEl = document.getElementById('menu-back-link');
  const statsEl = document.getElementById('menu-stats');
  const addFormEl = document.getElementById('menu-add-form');
  const addInputEl = document.getElementById('menu-add-input');
  const addBtnEl = document.getElementById('menu-add-btn');
  const listEl = document.getElementById('menu-card-list');
  const emptyStateEl = document.getElementById('menu-empty-state');

  const confirmModalEl = document.getElementById('menu-confirm-modal');
  const confirmModalCloseEl = document.getElementById('menu-confirm-modal-close');
  const confirmModalMessageEl = document.getElementById('menu-confirm-modal-message');
  const confirmModalCancelEl = document.getElementById('menu-confirm-modal-cancel');
  const confirmModalConfirmEl = document.getElementById('menu-confirm-modal-confirm');

  // Self-contained per-call Promise: adds its own listeners and tears them
  // down on resolve, so concurrent/repeated calls never leak handlers onto
  // the same shared modal markup.
  function showConfirmModal(message) {
    return new Promise((resolve) => {
      confirmModalMessageEl.textContent = message;
      confirmModalEl.hidden = false;

      function settle(result) {
        confirmModalEl.hidden = true;
        confirmModalCloseEl.removeEventListener('click', onCancel);
        confirmModalCancelEl.removeEventListener('click', onCancel);
        confirmModalConfirmEl.removeEventListener('click', onConfirm);
        confirmModalEl.removeEventListener('click', onOverlayClick);
        document.removeEventListener('keydown', onKeydown);
        resolve(result);
      }
      function onCancel() { settle(false); }
      function onConfirm() { settle(true); }
      function onOverlayClick(e) { if (e.target === confirmModalEl) settle(false); }
      function onKeydown(e) { if (e.key === 'Escape') settle(false); }

      confirmModalCloseEl.addEventListener('click', onCancel);
      confirmModalCancelEl.addEventListener('click', onCancel);
      confirmModalConfirmEl.addEventListener('click', onConfirm);
      confirmModalEl.addEventListener('click', onOverlayClick);
      document.addEventListener('keydown', onKeydown);
    });
  }

  function renderDishRow(dish) {
    if (dish.id === editingDishId) {
      return `
        <li class="menu-dish-row editing" data-dish-id="${dish.id}">
          <input type="text" class="menu-dish-edit-input" aria-label="${escapeHtml(t(currentLang, 'menuEditDishAriaLabel'))}" value="${escapeHtml(dish.name)}" />
          <button type="button" class="icon-btn icon-btn-danger menu-dish-delete" aria-label="${escapeHtml(t(currentLang, 'menuDeleteDishBtnLabel'))}">${TRASH_ICON}</button>
        </li>
      `;
    }
    return `
      <li class="menu-dish-row" data-dish-id="${dish.id}">
        <span class="menu-dish-text" data-action="edit">${escapeHtml(dish.name)}</span>
        <button type="button" class="icon-btn icon-btn-danger menu-dish-delete" aria-label="${escapeHtml(t(currentLang, 'menuDeleteDishBtnLabel'))}">${TRASH_ICON}</button>
      </li>
    `;
  }

  function renderMenuCard(menu) {
    const titleHtml = menu.id === editingMenuId
      ? `<input type="text" class="menu-card-title-input" aria-label="${escapeHtml(t(currentLang, 'menuEditTitleAriaLabel'))}" value="${escapeHtml(menu.title)}" />`
      : `<span class="menu-card-title" data-action="edit">${escapeHtml(menu.title)}</span>`;

    const dishes = menu.dishes || [];
    const dishesHtml = dishes.length === 0
      ? `<p class="menu-dish-empty">${escapeHtml(t(currentLang, 'menuDishEmptyState'))}</p>`
      : `<ul class="menu-dish-list">${dishes.map((dish) => renderDishRow(dish)).join('')}</ul>`;

    return `
      <li class="menu-card" data-menu-id="${menu.id}">
        <div class="menu-card-header">
          ${titleHtml}
          <button type="button" class="icon-btn icon-btn-danger menu-card-delete" aria-label="${escapeHtml(t(currentLang, 'menuDeleteMenuBtnLabel'))}">${TRASH_ICON}</button>
        </div>
        ${dishesHtml}
        <form class="menu-dish-add-form" data-menu-id="${menu.id}">
          <button type="submit" class="menu-add-icon" aria-label="${escapeHtml(t(currentLang, 'menuDishAddBtnLabel'))}">${PLUS_ICON}</button>
          <input type="text" class="menu-dish-add-input" placeholder="${escapeHtml(t(currentLang, 'menuDishAddPlaceholder'))}" />
        </form>
      </li>
    `;
  }

  function renderStats() {
    const menus = wedding.menus || [];
    if (menus.length === 0) {
      statsEl.hidden = true;
      return;
    }
    const guests = (wedding.guests || []).filter((g) => !g.empty);
    const cards = [{ label: t(currentLang, 'menuStatsTotalGuests'), value: guests.length, warn: false }];
    menus.forEach((menu) => {
      cards.push({ label: menu.title, value: guests.filter((g) => g.menuId === menu.id).length, warn: false });
    });
    const unassigned = guests.filter((g) => !g.menuId || !menus.some((m) => m.id === g.menuId)).length;
    cards.push({ label: t(currentLang, 'menuStatsUnassigned'), value: unassigned, warn: unassigned > 0 });

    statsEl.hidden = false;
    statsEl.innerHTML = cards.map((c) => `
      <div class="menu-stat-card${c.warn ? ' menu-stat-card-warn' : ''}">
        <p class="menu-stat-card-label">${escapeHtml(c.label)}</p>
        <p class="menu-stat-card-value">${c.value}</p>
      </div>
    `).join('');
  }

  function render() {
    const menus = wedding.menus || [];
    renderStats();
    emptyStateEl.hidden = menus.length > 0;
    listEl.innerHTML = menus.map((menu) => renderMenuCard(menu)).join('');
  }

  async function persistMenus(menus) {
    wedding.menus = menus;
    render();
    await Storage.setMenus(weddingId, menus);
  }

  addFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = addInputEl.value.trim();
    if (!title) return;
    addInputEl.value = '';
    const menus = [...(wedding.menus || []), { id: generateId(), title, dishes: [] }];
    await persistMenus(menus);
  });

  listEl.addEventListener('submit', async (e) => {
    const form = e.target.closest('.menu-dish-add-form');
    if (!form) return;
    e.preventDefault();
    const input = form.querySelector('.menu-dish-add-input');
    const name = input.value.trim();
    if (!name) return;
    const menuId = form.dataset.menuId;
    const menus = (wedding.menus || []).map((menu) => (
      menu.id === menuId
        ? { ...menu, dishes: [...(menu.dishes || []), { id: generateId(), name }] }
        : menu
    ));
    await persistMenus(menus);
  });

  listEl.addEventListener('click', async (e) => {
    const card = e.target.closest('.menu-card');
    if (!card) return;
    const menuId = card.dataset.menuId;
    const menu = (wedding.menus || []).find((m) => m.id === menuId);
    if (!menu) return;

    if (e.target.closest('.menu-card-delete')) {
      if (!(await showConfirmModal(t(currentLang, 'confirmDeleteMenu', menu.title)))) return;
      const menus = (wedding.menus || []).filter((m) => m.id !== menuId);
      await persistMenus(menus);
      return;
    }

    if (e.target.closest('.menu-card-title[data-action="edit"]')) {
      editingMenuId = menuId;
      render();
      const input = listEl.querySelector(`.menu-card[data-menu-id="${menuId}"] .menu-card-title-input`);
      if (input) {
        input.focus();
        input.select();
      }
      return;
    }

    const dishRow = e.target.closest('.menu-dish-row');
    if (!dishRow) return;
    const dishId = dishRow.dataset.dishId;

    if (e.target.closest('.menu-dish-delete')) {
      const menus = (wedding.menus || []).map((m) => (
        m.id === menuId ? { ...m, dishes: (m.dishes || []).filter((d) => d.id !== dishId) } : m
      ));
      await persistMenus(menus);
      return;
    }

    if (e.target.closest('.menu-dish-text[data-action="edit"]')) {
      editingDishId = dishId;
      render();
      const input = listEl.querySelector(`.menu-dish-row[data-dish-id="${dishId}"] .menu-dish-edit-input`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  });

  async function commitMenuTitleEdit(menuId, inputEl) {
    editingMenuId = null;
    const newTitle = inputEl.value.trim();
    if (!newTitle) {
      render();
      return;
    }
    const menus = (wedding.menus || []).map((m) => (m.id === menuId ? { ...m, title: newTitle } : m));
    await persistMenus(menus);
  }

  async function commitDishEdit(menuId, dishId, inputEl) {
    editingDishId = null;
    const newName = inputEl.value.trim();
    if (!newName) {
      render();
      return;
    }
    const menus = (wedding.menus || []).map((m) => (
      m.id === menuId
        ? { ...m, dishes: (m.dishes || []).map((d) => (d.id === dishId ? { ...d, name: newName } : d)) }
        : m
    ));
    await persistMenus(menus);
  }

  listEl.addEventListener('focusout', async (e) => {
    const titleInput = e.target.closest('.menu-card-title-input');
    if (titleInput) {
      const card = titleInput.closest('.menu-card');
      if (card.contains(e.relatedTarget)) return;
      await commitMenuTitleEdit(card.dataset.menuId, titleInput);
      return;
    }
    const dishInput = e.target.closest('.menu-dish-edit-input');
    if (dishInput) {
      const row = dishInput.closest('.menu-dish-row');
      const card = dishInput.closest('.menu-card');
      if (row.contains(e.relatedTarget)) return;
      await commitDishEdit(card.dataset.menuId, row.dataset.dishId, dishInput);
    }
  });

  listEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target.classList.contains('menu-card-title-input') || e.target.classList.contains('menu-dish-edit-input'))) {
      e.target.blur();
    }
  });

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    addBtnEl.setAttribute('aria-label', t(lang, 'menuAddBtnLabel'));
    render();
  }

  if (!weddingId) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  wedding = await Storage.getWedding(weddingId);
  if (!wedding) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  if (!isFeatureEnabled(wedding, 'menuManagement')) {
    window.location.replace(`wedding-admin.html?id=${weddingId}`);
    return;
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = 'TableMe · Gestion des menus';
  addBtnEl.setAttribute('aria-label', t(currentLang, 'menuAddBtnLabel'));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  render();
})();
