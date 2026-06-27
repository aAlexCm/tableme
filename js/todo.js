import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

const TRASH_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

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

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('todo-content');
  const weddingNameEl = document.getElementById('todo-wedding-name');
  const backLinkEl = document.getElementById('todo-back-link');
  const progressLabelEl = document.getElementById('todo-progress-label');
  const progressFillEl = document.getElementById('todo-progress-fill');
  const addFormEl = document.getElementById('todo-add-form');
  const addInputEl = document.getElementById('todo-add-input');
  const addBtnEl = document.getElementById('todo-add-btn');
  const listEl = document.getElementById('todo-list');
  const emptyStateEl = document.getElementById('todo-empty-state');

  function render() {
    const tasks = wedding.tasks || [];
    const done = tasks.filter((task) => task.done).length;
    const total = tasks.length;

    progressLabelEl.textContent = t(currentLang, 'todoProgressLabel', done, total);
    progressFillEl.style.width = total === 0 ? '0%' : `${Math.round((done / total) * 100)}%`;

    emptyStateEl.hidden = total > 0;
    listEl.innerHTML = tasks.map((task) => `
      <li class="todo-row${task.done ? ' done' : ''}" data-id="${task.id}">
        <button type="button" class="todo-row-check" aria-label="${escapeHtml(t(currentLang, 'todoCheckBtnLabel'))}">${task.done ? CHECK_ICON : ''}</button>
        <span class="todo-row-text">${escapeHtml(task.text)}</span>
        <button type="button" class="icon-btn icon-btn-danger todo-row-delete" aria-label="${escapeHtml(t(currentLang, 'todoDeleteBtnLabel'))}">${TRASH_ICON}</button>
      </li>
    `).join('');
  }

  addFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = addInputEl.value.trim();
    if (!text) return;
    const tasks = [...(wedding.tasks || []), { id: generateId(), text, done: false }];
    wedding.tasks = tasks;
    addInputEl.value = '';
    render();
    await Storage.setTasks(weddingId, tasks);
  });

  listEl.addEventListener('click', async (e) => {
    const row = e.target.closest('.todo-row');
    if (!row) return;
    const taskId = row.dataset.id;

    if (e.target.closest('.todo-row-check')) {
      const tasks = (wedding.tasks || []).map((task) => (task.id === taskId ? { ...task, done: !task.done } : task));
      wedding.tasks = tasks;
      render();
      await Storage.setTasks(weddingId, tasks);
      return;
    }

    if (e.target.closest('.todo-row-delete')) {
      const task = (wedding.tasks || []).find((t) => t.id === taskId);
      if (!task || !confirm(t(currentLang, 'confirmDeleteTask', task.text))) return;
      const tasks = (wedding.tasks || []).filter((t) => t.id !== taskId);
      wedding.tasks = tasks;
      render();
      await Storage.setTasks(weddingId, tasks);
    }
  });

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    addBtnEl.setAttribute('aria-label', t(lang, 'todoAddBtnLabel'));
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

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = 'TableMe · Liste des tâches';
  addBtnEl.setAttribute('aria-label', t(currentLang, 'todoAddBtnLabel'));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  render();
})();
