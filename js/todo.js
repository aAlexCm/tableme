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
      'Faire les démarches administratives (dossier de mariage)',
      'Choisir les témoins',
    ],
    ceremonie: [
      'Choisir le lieu de la cérémonie',
      "Réserver l'officiant (mairie, religieux ou laïque)",
      'Préparer les vœux ou le discours',
      'Choisir les alliances',
      'Organiser la répétition de la cérémonie',
      'Prévoir la décoration de la cérémonie',
      'Choisir les lectures ou textes de la cérémonie',
      'Prévoir les sièges pour les invités',
    ],
    photoVideo: [
      'Réserver un photographe',
      'Réserver un vidéaste',
      'Préparer une liste de photos indispensables',
      'Faire une séance photo de couple (engagement)',
      'Prévoir un photobooth pour les invités',
      'Définir le planning des photos le jour J',
      'Choisir un album photo souvenir',
      'Prévoir un drone pour des prises aériennes (optionnel)',
    ],
    reception: [
      'Réserver le lieu de réception',
      'Choisir le plan de table',
      "Organiser l'animation de la soirée",
      'Réserver un DJ ou un groupe de musique',
      "Prévoir un feu d'artifice ou une animation surprise",
      'Commander la pièce montée ou le gâteau',
      'Prévoir un vestiaire et un parking pour les invités',
      "Organiser l'ordre des discours et du programme",
    ],
    invitations: [
      'Choisir le design des faire-part',
      'Envoyer un save-the-date',
      'Envoyer les faire-part',
      'Créer un site web pour le mariage',
      'Suivre les réponses (RSVP)',
      'Préparer les cartons de placement',
      'Imprimer les menus et plans de table',
      'Envoyer les remerciements après le mariage',
    ],
    musique: [
      "Choisir la musique d'entrée",
      'Préparer la playlist de la soirée',
      "Choisir la chanson de l'ouverture de bal",
      'Réserver un DJ ou un orchestre',
      'Prévoir la sonorisation du lieu',
      'Préparer une liste de musiques à éviter',
      "Prendre des cours de danse pour l'ouverture de bal",
    ],
    tenues: [
      'Choisir la robe de mariée',
      'Choisir le costume du marié',
      'Réserver les essayages',
      'Réserver le coiffeur et le maquilleur',
      'Choisir les chaussures et accessoires',
      "Prévoir une séance d'essai coiffure/maquillage",
      "Choisir les tenues des témoins et demoiselles d'honneur",
      'Prévoir les retouches finales',
    ],
    traiteur: [
      'Choisir le traiteur',
      'Définir le menu',
      'Prévoir les options végétariennes/allergies',
      'Organiser une dégustation',
      "Commander le vin d'honneur",
      'Prévoir le gâteau et les desserts',
      'Confirmer le nombre de couverts définitif',
    ],
    decoration: [
      'Définir le style de décoration',
      'Commander les fleurs',
      'Choisir la décoration de table',
      "Prévoir l'éclairage de la salle",
      'Préparer la signalétique (plan de salle, panneaux)',
      'Choisir le bouquet de la mariée',
      'Prévoir la décoration de la voiture des mariés',
      "Organiser la décoration de l'arche ou du fond de cérémonie",
    ],
    voyage: [
      'Choisir la destination de la lune de miel',
      "Réserver les billets et l'hébergement",
      'Préparer les documents de voyage (passeport, visa)',
      'Faire les valises',
      'Prévoir une assurance voyage',
      'Vérifier les vaccins ou formalités sanitaires',
      'Prévoir de la monnaie locale',
      'Préparer un itinéraire ou des activités sur place',
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
      'Handle the administrative paperwork (marriage license)',
      'Choose your witnesses',
    ],
    ceremonie: [
      'Choose the ceremony venue',
      'Book the officiant (civil, religious, or secular)',
      'Prepare the vows or speech',
      'Choose the wedding rings',
      'Organize the ceremony rehearsal',
      'Plan the ceremony decoration',
      'Choose readings or texts for the ceremony',
      'Arrange seating for guests',
    ],
    photoVideo: [
      'Book a photographer',
      'Book a videographer',
      'Make a list of must-have photos',
      'Do an engagement photo shoot',
      'Plan a photo booth for guests',
      'Plan the wedding-day photo schedule',
      'Choose a photo album or keepsake book',
      'Consider drone footage (optional)',
    ],
    reception: [
      'Book the reception venue',
      'Choose the seating plan',
      'Organize the evening entertainment',
      'Book a DJ or live band',
      'Plan fireworks or a surprise act',
      'Order the wedding cake',
      'Plan a coat check and parking for guests',
      'Plan the order of speeches and program',
    ],
    invitations: [
      'Choose the invitation design',
      'Send save-the-dates',
      'Send the invitations',
      'Create a wedding website',
      'Track RSVPs',
      'Prepare place cards',
      'Print menus and seating charts',
      'Send thank-you cards after the wedding',
    ],
    musique: [
      'Choose the entrance music',
      'Prepare the evening playlist',
      'Choose the first dance song',
      'Book a DJ or band',
      "Plan the venue's sound system",
      'Make a do-not-play list',
      'Take dance lessons for the first dance',
    ],
    tenues: [
      'Choose the wedding dress',
      "Choose the groom's suit",
      'Book fittings',
      'Book a hairdresser and makeup artist',
      'Choose shoes and accessories',
      'Plan a hair/makeup trial',
      "Choose the wedding party's outfits",
      'Schedule final alterations',
    ],
    traiteur: [
      'Choose the caterer',
      'Define the menu',
      'Plan vegetarian options/allergies',
      'Organize a tasting',
      'Order the cocktail hour drinks',
      'Order the cake and desserts',
      'Confirm the final guest count',
    ],
    decoration: [
      'Define the decoration style',
      'Order flowers',
      'Choose the table decoration',
      'Plan the venue lighting',
      'Prepare signage (seating chart, signs)',
      'Choose the bridal bouquet',
      'Plan the getaway car decoration',
      'Plan the arch or ceremony backdrop decor',
    ],
    voyage: [
      'Choose the honeymoon destination',
      'Book tickets and accommodation',
      'Prepare travel documents (passport, visa)',
      'Pack your bags',
      'Get travel insurance',
      'Check vaccination/health requirements',
      'Get some local currency',
      'Plan an itinerary or activities',
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
      'Rezolvați actele administrative (dosarul de căsătorie)',
      'Alegeți nașii/martorii',
    ],
    ceremonie: [
      'Alegeți locul ceremoniei',
      'Rezervați oficiantul (civil, religios sau laic)',
      'Pregătiți jurămintele sau discursul',
      'Alegeți verighetele',
      'Organizați repetiția ceremoniei',
      'Planificați decorul ceremoniei',
      'Alegeți lecturile sau textele pentru ceremonie',
      'Pregătiți locurile pentru invitați',
    ],
    photoVideo: [
      'Rezervați un fotograf',
      'Rezervați un videograf',
      'Faceți o listă cu pozele esențiale',
      'Faceți o ședință foto de logodnă',
      'Planificați o cabină foto pentru invitați',
      'Planificați programul fotografiilor din ziua nunții',
      'Alegeți un album foto de amintire',
      'Luați în calcul filmări cu drona (opțional)',
    ],
    reception: [
      'Rezervați locația recepției',
      'Alegeți planul de mese',
      'Organizați animația serii',
      'Rezervați un DJ sau o trupă',
      'Planificați artificii sau un moment surpriză',
      'Comandați tortul de nuntă',
      'Planificați garderoba și parcarea pentru invitați',
      'Planificați ordinea discursurilor și a programului',
    ],
    invitations: [
      'Alegeți designul invitațiilor',
      'Trimiteți save-the-date',
      'Trimiteți invitațiile',
      'Creați un site pentru nuntă',
      'Urmăriți confirmările (RSVP)',
      'Pregătiți cărțile de masă',
      'Tipăriți meniurile și planul de mese',
      'Trimiteți mulțumiri după nuntă',
    ],
    musique: [
      'Alegeți muzica de intrare',
      'Pregătiți playlist-ul petrecerii',
      'Alegeți melodia pentru primul dans',
      'Rezervați un DJ sau o trupă',
      'Planificați sonorizarea sălii',
      'Pregătiți o listă de melodii de evitat',
      'Faceți lecții de dans pentru primul dans',
    ],
    tenues: [
      'Alegeți rochia de mireasă',
      'Alegeți costumul mirelui',
      'Programați probele',
      'Rezervați coafor și machiaj',
      'Alegeți pantofii și accesoriile',
      'Planificați o probă de coafură/machiaj',
      'Alegeți ținutele nașilor/domnișoarelor de onoare',
      'Programați retușurile finale',
    ],
    traiteur: [
      'Alegeți firma de catering',
      'Definiți meniul',
      'Planificați opțiuni vegetariene/alergii',
      'Organizați o degustare',
      'Comandați băuturile pentru cocktail',
      'Comandați tortul și deserturile',
      'Confirmați numărul final de invitați',
    ],
    decoration: [
      'Definiți stilul decorului',
      'Comandați florile',
      'Alegeți decorul meselor',
      'Planificați iluminatul sălii',
      'Pregătiți elementele de semnalizare (plan de masă, indicatoare)',
      'Alegeți buchetul miresei',
      'Planificați decorul mașinii mirilor',
      'Planificați decorul arcadei sau fundalului ceremoniei',
    ],
    voyage: [
      'Alegeți destinația lunii de miere',
      'Rezervați biletele și cazarea',
      'Pregătiți documentele de călătorie (pașaport, viză)',
      'Faceți bagajele',
      'Faceți o asigurare de călătorie',
      'Verificați vaccinurile/formalitățile sanitare',
      'Procurați valută locală',
      'Planificați un itinerariu sau activități',
    ],
  },
};

// Default tasks are stored as a (category, templateIndex) reference rather
// than literal text, so switching language re-resolves them live against
// DEFAULT_TASKS instead of being frozen in whichever language they were
// seeded in. Custom tasks the couple types themselves have no templateIndex
// and just keep their literal `text` forever, like a guest's name would.
function buildDefaultTasks(lang) {
  const templates = DEFAULT_TASKS.fr;
  const tasks = [];
  CATEGORIES.forEach((cat) => {
    (templates[cat.id] || []).forEach((_, index) => {
      tasks.push({
        id: generateId(),
        category: cat.id,
        templateIndex: index,
        isDefault: true,
        text: resolveDefaultText(cat.id, index, lang),
        done: false,
      });
    });
  });
  return tasks;
}

function resolveDefaultText(category, templateIndex, lang) {
  const templates = (DEFAULT_TASKS[lang] || DEFAULT_TASKS.fr)[category] || [];
  return templates[templateIndex];
}

function taskText(task, lang) {
  if (task.isDefault && task.templateIndex !== undefined) {
    const resolved = resolveDefaultText(task.category, task.templateIndex, lang);
    if (resolved !== undefined) return resolved;
  }
  return task.text || '';
}

// One-time upgrade for tasks seeded before this (category, templateIndex)
// reference existed — matches the stored literal text against any of the
// three template lists for its category and, if found, promotes it to a
// live-translating default task. Custom tasks (no match) are untouched.
function migrateLegacyDefaultTask(task) {
  if (task.isDefault || !task.category) return task;
  for (const lang of Object.keys(DEFAULT_TASKS)) {
    const index = (DEFAULT_TASKS[lang][task.category] || []).indexOf(task.text);
    if (index !== -1) {
      return { ...task, isDefault: true, templateIndex: index };
    }
  }
  return task;
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
  const statusFilterSelectEl = document.getElementById('todo-status-filter-select');
  const categoryFilterSelectEl = document.getElementById('todo-category-filter-select');

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

  // Same two filters as the sidebar, as native <select> dropdowns instead —
  // shown only on mobile (CSS-gated) so the filter list doesn't eat up the
  // screen the way a tall button list or a full sidebar would.
  function renderMobileFilterSelects(tasks) {
    const doneCount = tasks.filter((task) => task.done).length;
    const statusOptions = [
      { id: 'all', label: t(currentLang, 'todoFilterAll'), count: tasks.length },
      { id: 'todo', label: t(currentLang, 'todoFilterTodo'), count: tasks.length - doneCount },
      { id: 'done', label: t(currentLang, 'todoFilterDone'), count: doneCount },
    ];
    statusFilterSelectEl.innerHTML = statusOptions.map((g) => `<option value="${g.id}">${escapeHtml(g.label)} (${g.count})</option>`).join('');
    statusFilterSelectEl.value = statusFilter;

    const categoryOptions = [
      { id: 'all', label: t(currentLang, 'todoFilterAll'), count: tasks.length },
      ...CATEGORIES.map((cat) => ({
        id: cat.id,
        label: t(currentLang, cat.key),
        count: tasks.filter((task) => task.category === cat.id).length,
      })),
    ];
    categoryFilterSelectEl.innerHTML = categoryOptions.map((g) => `<option value="${g.id}">${escapeHtml(g.label)} (${g.count})</option>`).join('');
    categoryFilterSelectEl.value = categoryFilter;
  }

  function render() {
    const tasks = wedding.tasks || [];
    const done = tasks.filter((task) => task.done).length;
    const total = tasks.length;

    progressLabelEl.textContent = t(currentLang, 'todoProgressLabel', done, total);
    progressFillEl.style.width = total === 0 ? '0%' : `${Math.round((done / total) * 100)}%`;

    renderStatusFilters(tasks);
    renderCategoryFilters(tasks);
    renderMobileFilterSelects(tasks);
    renderAddCategoryOptions();

    const filtered = tasks.filter(matchesFilters);
    emptyStateEl.hidden = filtered.length > 0;
    listEl.innerHTML = filtered.map((task) => `
      <li class="todo-row${task.done ? ' done' : ''}" data-id="${task.id}">
        <button type="button" class="todo-row-check" aria-label="${escapeHtml(t(currentLang, 'todoCheckBtnLabel'))}">${task.done ? CHECK_ICON : ''}</button>
        <span class="todo-row-main">
          <span class="todo-row-text">${escapeHtml(taskText(task, currentLang))}</span>
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

  statusFilterSelectEl.addEventListener('change', () => {
    statusFilter = statusFilterSelectEl.value;
    render();
  });

  categoryFilterSelectEl.addEventListener('change', () => {
    categoryFilter = categoryFilterSelectEl.value;
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
      if (!task || !confirm(t(currentLang, 'confirmDeleteTask', taskText(task, currentLang)))) return;
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
    statusFilterSelectEl.setAttribute('aria-label', t(lang, 'todoFilterByStatus'));
    categoryFilterSelectEl.setAttribute('aria-label', t(lang, 'todoFilterByCategory'));
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

  if (!wedding.tasksSeeded) {
    wedding.tasks = buildDefaultTasks(wedding.lang || 'fr');
    wedding.tasksSeeded = true;
    await Storage.seedTasks(weddingId, wedding.tasks);
  } else {
    const migrated = (wedding.tasks || []).map(migrateLegacyDefaultTask);
    if (migrated.some((task, i) => task !== wedding.tasks[i])) {
      wedding.tasks = migrated;
      await Storage.setTasks(weddingId, migrated);
    }
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = 'TableMe · Liste des tâches';
  addBtnEl.setAttribute('aria-label', t(currentLang, 'todoAddBtnLabel'));
  addCategoryEl.setAttribute('aria-label', t(currentLang, 'todoAddCategoryAriaLabel'));
  statusFilterSelectEl.setAttribute('aria-label', t(currentLang, 'todoFilterByStatus'));
  categoryFilterSelectEl.setAttribute('aria-label', t(currentLang, 'todoFilterByCategory'));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  render();
})();
