import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

const TRASH_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const CATEGORIES = [
  { id: 'organisation', key: 'todoCatOrganisation' },
  { id: 'ceremonie', key: 'todoCatCeremonie' },
  { id: 'photoVideo', key: 'todoCatPhotoVideo' },
  { id: 'reception', key: 'todoCatReception' },
  { id: 'invitations', key: 'todoCatInvitations' },
  { id: 'musique', key: 'todoCatMusique' },
  { id: 'tenues', key: 'todoCatTenues' },
  { id: 'traiteur', key: 'todoCatTraiteur' },
  { id: 'decoration', key: 'todoCatDecoration' },
  { id: 'voyage', key: 'todoCatVoyage' },
];

// Default checklist seeded once for weddings that have never had a `tasks`
// field — plain text per language since tasks are saved as free-form data
// (like guest names), not re-translated live like the rest of the UI.
const DEFAULT_TASKS = {
  fr: {
    organisation: [
      'Fixer la date du mariage',
      'Définir le budget global',
      'Choisir le thème et la palette de couleurs',
      'Établir la liste des invités',
      'Créer un rétroplanning des préparatifs',
      'Trouver un wedding planner (si besoin)',
    ],
    ceremonie: [
      'Choisir le lieu de la cérémonie',
      "Réserver l'officiant (mairie, religieux ou laïque)",
      'Préparer les vœux ou le discours',
      'Choisir les alliances',
      'Organiser la répétition de la cérémonie',
      'Prévoir la décoration de la cérémonie',
    ],
    photoVideo: [
      'Réserver un photographe',
      'Réserver un vidéaste',
      'Préparer une liste de photos indispensables',
      'Faire une séance photo de couple avant le mariage',
      'Prévoir un photobooth pour les invités',
    ],
    reception: [
      'Réserver le lieu de réception',
      'Choisir le plan de table',
      "Organiser l'animation de la soirée",
      'Réserver un DJ ou un groupe de musique',
      "Prévoir un feu d'artifice ou une animation surprise",
      'Commander la pièce montée ou le gâteau',
    ],
    invitations: [
      'Choisir le design des faire-part',
      'Envoyer les faire-part',
      'Créer un site web ou une page pour le mariage',
      'Suivre les réponses (RSVP)',
      'Envoyer les remerciements après le mariage',
    ],
    musique: [
      "Choisir la musique d'entrée",
      'Préparer la playlist de la soirée',
      "Choisir la chanson de l'ouverture de bal",
      'Réserver un DJ ou un orchestre',
      'Prévoir la sonorisation du lieu',
    ],
    tenues: [
      'Choisir la robe de mariée',
      'Choisir le costume du marié',
      'Réserver les essayages',
      'Réserver le coiffeur et le maquilleur',
      'Choisir les chaussures et accessoires',
      "Prévoir une séance d'essai coiffure/maquillage",
    ],
    traiteur: [
      'Choisir le traiteur',
      'Définir le menu',
      'Prévoir les options végétariennes/allergies',
      'Organiser une dégustation',
      "Commander le vin d'honneur",
    ],
    decoration: [
      'Définir le style de décoration',
      'Commander les fleurs et la décoration florale',
      'Choisir la décoration de table',
      "Prévoir l'éclairage de la salle",
      'Préparer les éléments de signalétique (plan de salle, panneaux)',
    ],
    voyage: [
      'Choisir la destination de la lune de miel',
      "Réserver les billets et l'hébergement",
      'Préparer les documents de voyage (passeport, visa)',
      'Faire les valises',
      'Prévoir une assurance voyage',
    ],
  },
  en: {
    organisation: [
      'Set the wedding date',
      'Define the overall budget',
      'Choose the theme and color palette',
      'Draft the guest list',
      'Create a planning timeline',
      'Find a wedding planner (if needed)',
    ],
    ceremonie: [
      'Choose the ceremony venue',
      'Book the officiant (civil, religious, or secular)',
      'Prepare the vows or speech',
      'Choose the wedding rings',
      'Organize the ceremony rehearsal',
      'Plan the ceremony decoration',
    ],
    photoVideo: [
      'Book a photographer',
      'Book a videographer',
      'Make a list of must-have photos',
      'Do an engagement photo shoot',
      'Plan a photo booth for guests',
    ],
    reception: [
      'Book the reception venue',
      'Choose the seating plan',
      'Organize the evening entertainment',
      'Book a DJ or live band',
      'Plan fireworks or a surprise act',
      'Order the wedding cake',
    ],
    invitations: [
      'Choose the invitation design',
      'Send the invitations',
      'Create a wedding website or page',
      'Track RSVPs',
      'Send thank-you cards after the wedding',
    ],
    musique: [
      'Choose the entrance music',
      'Prepare the evening playlist',
      'Choose the first dance song',
      'Book a DJ or band',
      "Plan the venue's sound system",
    ],
    tenues: [
      'Choose the wedding dress',
      "Choose the groom's suit",
      'Book fittings',
      'Book a hairdresser and makeup artist',
      'Choose shoes and accessories',
      'Plan a hair/makeup trial',
    ],
    traiteur: [
      'Choose the caterer',
      'Define the menu',
      'Plan vegetarian options/allergies',
      'Organize a tasting',
      'Order the cocktail hour drinks',
    ],
    decoration: [
      'Define the decoration style',
      'Order flowers and floral decor',
      'Choose the table decoration',
      'Plan the venue lighting',
      'Prepare signage (seating chart, signs)',
    ],
    voyage: [
      'Choose the honeymoon destination',
      'Book tickets and accommodation',
      'Prepare travel documents (passport, visa)',
      'Pack your bags',
      'Get travel insurance',
    ],
  },
  ro: {
    organisation: [
      'Stabiliți data nunții',
      'Definiți bugetul total',
      'Alegeți tema și paleta de culori',
      'Întocmiți lista invitaților',
      'Creați un calendar de pregătiri',
      'Găsiți un wedding planner (dacă este necesar)',
    ],
    ceremonie: [
      'Alegeți locul ceremoniei',
      'Rezervați oficiantul (civil, religios sau laic)',
      'Pregătiți jurămintele sau discursul',
      'Alegeți verighetele',
      'Organizați repetiția ceremoniei',
      'Planificați decorul ceremoniei',
    ],
    photoVideo: [
      'Rezervați un fotograf',
      'Rezervați un videograf',
      'Faceți o listă cu pozele esențiale',
      'Faceți o ședință foto de logodnă',
      'Planificați o cabină foto pentru invitați',
    ],
    reception: [
      'Rezervați locația recepției',
      'Alegeți planul de mese',
      'Organizați animația serii',
      'Rezervați un DJ sau o trupă',
      'Planificați artificii sau un moment surpriză',
      'Comandați tortul de nuntă',
    ],
    invitations: [
      'Alegeți designul invitațiilor',
      'Trimiteți invitațiile',
      'Creați un site sau o pagină pentru nuntă',
      'Urmăriți confirmările (RSVP)',
      'Trimiteți mulțumiri după nuntă',
    ],
    musique: [
      'Alegeți muzica de intrare',
      'Pregătiți playlist-ul petrecerii',
      'Alegeți melodia pentru primul dans',
      'Rezervați un DJ sau o trupă',
      'Planificați sonorizarea sălii',
    ],
    tenues: [
      'Alegeți rochia de mireasă',
      'Alegeți costumul mirelui',
      'Programați probele',
      'Rezervați coafor și machiaj',
      'Alegeți pantofii și accesoriile',
      'Planificați o probă de coafură/machiaj',
    ],
    traiteur: [
      'Alegeți firma de catering',
      'Definiți meniul',
      'Planificați opțiuni vegetariene/alergii',
      'Organizați o degustare',
      'Comandați băuturile pentru cocktail',
    ],
    decoration: [
      'Definiți stilul decorului',
      'Comandați florile și decorul floral',
      'Alegeți decorul meselor',
      'Planificați iluminatul sălii',
      'Pregătiți elementele de semnalizare (plan de masă, indicatoare)',
    ],
    voyage: [
      'Alegeți destinația lunii de miere',
      'Rezervați biletele și cazarea',
      'Pregătiți documentele de călătorie (pașaport, viză)',
      'Faceți bagajele',
      'Faceți o asigurare de călătorie',
    ],
  },
};

function buildDefaultTasks(lang) {
  const templates = DEFAULT_TASKS[lang] || DEFAULT_TASKS.fr;
  const tasks = [];
  CATEGORIES.forEach((cat) => {
    (templates[cat.id] || []).forEach((text) => {
      tasks.push({ id: generateId(), text, category: cat.id, done: false });
    });
  });
  return tasks;
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

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let wedding = null;
  let statusFilter = 'all';
  let categoryFilter = 'all';

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
  const addCategoryEl = document.getElementById('todo-add-category');
  const listEl = document.getElementById('todo-list');
  const emptyStateEl = document.getElementById('todo-empty-state');
  const statusFiltersEl = document.getElementById('todo-status-filters');
  const categoryFiltersEl = document.getElementById('todo-category-filters');

  function categoryLabel(catId) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    return cat ? t(currentLang, cat.key) : '';
  }

  function matchesFilters(task) {
    if (statusFilter === 'done' && !task.done) return false;
    if (statusFilter === 'todo' && task.done) return false;
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    return true;
  }

  function renderStatusFilters(tasks) {
    const doneCount = tasks.filter((task) => task.done).length;
    const groups = [
      { id: 'all', label: t(currentLang, 'todoFilterAll'), count: tasks.length },
      { id: 'todo', label: t(currentLang, 'todoFilterTodo'), count: tasks.length - doneCount },
      { id: 'done', label: t(currentLang, 'todoFilterDone'), count: doneCount },
    ];
    statusFiltersEl.innerHTML = groups.map((g) => `
      <button type="button" class="todo-filter-link${statusFilter === g.id ? ' active' : ''}" data-status="${g.id}">
        <span>${escapeHtml(g.label)}</span>
        <span class="todo-filter-count">${g.count}</span>
      </button>
    `).join('');
  }

  function renderCategoryFilters(tasks) {
    const allOption = { id: 'all', label: t(currentLang, 'todoFilterAll'), count: tasks.length };
    const catOptions = CATEGORIES.map((cat) => ({
      id: cat.id,
      label: t(currentLang, cat.key),
      count: tasks.filter((task) => task.category === cat.id).length,
    }));
    categoryFiltersEl.innerHTML = [allOption, ...catOptions].map((g) => `
      <button type="button" class="todo-filter-link${categoryFilter === g.id ? ' active' : ''}" data-category="${g.id}">
        <span>${escapeHtml(g.label)}</span>
        <span class="todo-filter-count">${g.count}</span>
      </button>
    `).join('');
  }

  function renderAddCategoryOptions() {
    addCategoryEl.innerHTML = CATEGORIES.map((cat) => `<option value="${cat.id}">${escapeHtml(t(currentLang, cat.key))}</option>`).join('');
    addCategoryEl.value = categoryFilter !== 'all' ? categoryFilter : CATEGORIES[0].id;
  }

  function render() {
    const tasks = wedding.tasks || [];
    const done = tasks.filter((task) => task.done).length;
    const total = tasks.length;

    progressLabelEl.textContent = t(currentLang, 'todoProgressLabel', done, total);
    progressFillEl.style.width = total === 0 ? '0%' : `${Math.round((done / total) * 100)}%`;

    renderStatusFilters(tasks);
    renderCategoryFilters(tasks);
    renderAddCategoryOptions();

    const filtered = tasks.filter(matchesFilters);
    emptyStateEl.hidden = filtered.length > 0;
    listEl.innerHTML = filtered.map((task) => `
      <li class="todo-row${task.done ? ' done' : ''}" data-id="${task.id}">
        <button type="button" class="todo-row-check" aria-label="${escapeHtml(t(currentLang, 'todoCheckBtnLabel'))}">${task.done ? CHECK_ICON : ''}</button>
        <span class="todo-row-main">
          <span class="todo-row-text">${escapeHtml(task.text)}</span>
          <span class="todo-row-category">${escapeHtml(categoryLabel(task.category))}</span>
        </span>
        <button type="button" class="icon-btn icon-btn-danger todo-row-delete" aria-label="${escapeHtml(t(currentLang, 'todoDeleteBtnLabel'))}">${TRASH_ICON}</button>
      </li>
    `).join('');
  }

  addFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = addInputEl.value.trim();
    if (!text) return;
    const category = addCategoryEl.value || CATEGORIES[0].id;
    const tasks = [...(wedding.tasks || []), { id: generateId(), text, category, done: false }];
    wedding.tasks = tasks;
    addInputEl.value = '';
    render();
    await Storage.setTasks(weddingId, tasks);
  });

  statusFiltersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.todo-filter-link');
    if (!btn) return;
    statusFilter = btn.dataset.status;
    render();
  });

  categoryFiltersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.todo-filter-link');
    if (!btn) return;
    categoryFilter = btn.dataset.category;
    render();
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
      const task = (wedding.tasks || []).find((task) => task.id === taskId);
      if (!task || !confirm(t(currentLang, 'confirmDeleteTask', task.text))) return;
      const tasks = (wedding.tasks || []).filter((task) => task.id !== taskId);
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
    addCategoryEl.setAttribute('aria-label', t(lang, 'todoAddCategoryAriaLabel'));
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

  if (wedding.tasks === undefined) {
    wedding.tasks = buildDefaultTasks(wedding.lang || 'fr');
    await Storage.setTasks(weddingId, wedding.tasks);
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = 'TableMe · Liste des tâches';
  addBtnEl.setAttribute('aria-label', t(currentLang, 'todoAddBtnLabel'));
  addCategoryEl.setAttribute('aria-label', t(currentLang, 'todoAddCategoryAriaLabel'));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  render();
})();
