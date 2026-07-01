import { Storage, generateId } from './storage.js';
import { initErrorLogging } from './error-log.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { isFeatureEnabled } from './features.js';

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

// One-time repair for default tasks whose category was reassigned back when
// the UI briefly allowed editing a default task's category (now disallowed —
// default tasks are delete-only). That left `category` pointing at a
// category whose template list has nothing to do with `templateIndex`,
// producing a mismatched/nonsense task title. The frozen literal `text`
// fallback still holds the original wording, so it's used to find the
// category the templateIndex actually belongs to and restore it.
function repairDefaultTaskCategory(task) {
  if (!task.isDefault || task.templateIndex === undefined || !task.text) return task;
  if (resolveDefaultText(task.category, task.templateIndex, 'fr') === task.text
    || resolveDefaultText(task.category, task.templateIndex, 'en') === task.text
    || resolveDefaultText(task.category, task.templateIndex, 'ro') === task.text) {
    return task;
  }
  for (const lang of Object.keys(DEFAULT_TASKS)) {
    for (const catId of Object.keys(DEFAULT_TASKS[lang])) {
      if (DEFAULT_TASKS[lang][catId][task.templateIndex] === task.text) {
        return { ...task, category: catId };
      }
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
  initErrorLogging({ page: 'todo', weddingId });

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let wedding = null;
  let statusFilter = 'all';
  let categoryFilter = 'all';
  let typeFilter = 'all';
  let customCategories = [];
  let editingTaskId = null;

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
  const typeFiltersEl = document.getElementById('todo-type-filters');
  const statusFilterSelectEl = document.getElementById('todo-status-filter-select');
  const categoryFilterSelectEl = document.getElementById('todo-category-filter-select');
  const typeFilterSelectEl = document.getElementById('todo-type-filter-select');

  const categoriesModalEl = document.getElementById('todo-categories-modal');
  const categoriesModalCloseEl = document.getElementById('todo-categories-modal-close');
  const categoriesModalListEl = document.getElementById('todo-category-modal-list');
  const categoriesModalFormEl = document.getElementById('todo-category-modal-form');
  const categoriesModalInputEl = document.getElementById('todo-category-modal-input');

  const confirmModalEl = document.getElementById('todo-confirm-modal');
  const confirmModalCloseEl = document.getElementById('todo-confirm-modal-close');
  const confirmModalMessageEl = document.getElementById('todo-confirm-modal-message');
  const confirmModalCancelEl = document.getElementById('todo-confirm-modal-cancel');
  const confirmModalConfirmEl = document.getElementById('todo-confirm-modal-confirm');

  function categoryLabel(catId) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (cat) return t(currentLang, cat.key);
    const custom = customCategories.find((c) => c.id === catId);
    return custom ? custom.label : '';
  }

  function allCategoryOptions() {
    return [
      ...CATEGORIES.map((cat) => ({ id: cat.id, label: t(currentLang, cat.key), custom: false })),
      ...customCategories.map((cat) => ({ id: cat.id, label: cat.label, custom: true })),
    ];
  }

  function categoryOptionsHtml(selectedId) {
    return allCategoryOptions().map((cat) => `<option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>${escapeHtml(cat.label)}</option>`).join('');
  }

  function matchesFilters(task) {
    if (statusFilter === 'done' && !task.done) return false;
    if (statusFilter === 'todo' && task.done) return false;
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    if (typeFilter === 'default' && !task.isDefault) return false;
    if (typeFilter === 'custom' && task.isDefault) return false;
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
    const allOption = { id: 'all', label: t(currentLang, 'todoFilterAll'), count: tasks.length, custom: false };
    const groups = [allOption, ...allCategoryOptions().map((cat) => ({
      ...cat,
      count: tasks.filter((task) => task.category === cat.id).length,
    }))];
    const rowsHtml = groups.map((g) => `
      <button type="button" class="todo-filter-link${categoryFilter === g.id ? ' active' : ''}" data-category="${g.id}">
        <span>${escapeHtml(g.label)}${g.custom ? `<span class="todo-category-custom-tag">${escapeHtml(t(currentLang, 'todoCustomCategoryTag'))}</span>` : ''}</span>
        <span class="todo-filter-count">${g.count}</span>
      </button>
    `).join('');
    categoryFiltersEl.innerHTML = `${rowsHtml}<button type="button" class="todo-category-add-btn" id="todo-manage-categories-btn">${escapeHtml(t(currentLang, 'todoAddCategoryBtn'))}</button>`;
  }

  function renderTypeFilters(tasks) {
    const defaultCount = tasks.filter((task) => task.isDefault).length;
    const groups = [
      { id: 'all', label: t(currentLang, 'todoFilterAll'), count: tasks.length },
      { id: 'default', label: t(currentLang, 'todoFilterTypeDefault'), count: defaultCount },
      { id: 'custom', label: t(currentLang, 'todoFilterTypeCustom'), count: tasks.length - defaultCount },
    ];
    typeFiltersEl.innerHTML = groups.map((g) => `
      <button type="button" class="todo-filter-link${typeFilter === g.id ? ' active' : ''}" data-type="${g.id}">
        <span>${escapeHtml(g.label)}</span>
        <span class="todo-filter-count">${g.count}</span>
      </button>
    `).join('');
  }

  function renderAddCategoryOptions() {
    const defaultCat = categoryFilter !== 'all' ? categoryFilter : CATEGORIES[0].id;
    addCategoryEl.innerHTML = categoryOptionsHtml(defaultCat);
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
      ...allCategoryOptions().map((cat) => ({
        id: cat.id,
        label: cat.custom ? `${cat.label} (${t(currentLang, 'todoCustomCategoryTag')})` : cat.label,
        count: tasks.filter((task) => task.category === cat.id).length,
      })),
    ];
    categoryFilterSelectEl.innerHTML = categoryOptions.map((g) => `<option value="${g.id}">${escapeHtml(g.label)} (${g.count})</option>`).join('')
      + `<option value="__add__">${escapeHtml(t(currentLang, 'todoAddCategorySelectOption'))}</option>`;
    categoryFilterSelectEl.value = categoryFilter;

    const defaultCount = tasks.filter((task) => task.isDefault).length;
    const typeOptions = [
      { id: 'all', label: t(currentLang, 'todoFilterAll'), count: tasks.length },
      { id: 'default', label: t(currentLang, 'todoFilterTypeDefault'), count: defaultCount },
      { id: 'custom', label: t(currentLang, 'todoFilterTypeCustom'), count: tasks.length - defaultCount },
    ];
    typeFilterSelectEl.innerHTML = typeOptions.map((g) => `<option value="${g.id}">${escapeHtml(g.label)} (${g.count})</option>`).join('');
    typeFilterSelectEl.value = typeFilter;
  }

  function render() {
    const tasks = wedding.tasks || [];
    const done = tasks.filter((task) => task.done).length;
    const total = tasks.length;

    progressLabelEl.textContent = t(currentLang, 'todoProgressLabel', done, total);
    progressFillEl.style.width = total === 0 ? '0%' : `${Math.round((done / total) * 100)}%`;

    renderStatusFilters(tasks);
    renderTypeFilters(tasks);
    renderCategoryFilters(tasks);
    renderMobileFilterSelects(tasks);
    renderAddCategoryOptions();

    const filtered = tasks.filter(matchesFilters);
    emptyStateEl.hidden = filtered.length > 0;
    listEl.innerHTML = filtered.map((task) => renderTaskRow(task)).join('');
  }

  function renderTaskRow(task) {
    const checkBtn = `<button type="button" class="todo-row-check" aria-label="${escapeHtml(t(currentLang, 'todoCheckBtnLabel'))}">${task.done ? CHECK_ICON : ''}</button>`;
    const deleteBtn = `<button type="button" class="icon-btn icon-btn-danger todo-row-delete" aria-label="${escapeHtml(t(currentLang, 'todoDeleteBtnLabel'))}">${TRASH_ICON}</button>`;

    if (task.id === editingTaskId) {
      return `
        <li class="todo-row editing" data-id="${task.id}">
          ${checkBtn}
          <span class="todo-row-main todo-row-edit-main">
            <input type="text" class="todo-row-edit-input" aria-label="${escapeHtml(t(currentLang, 'todoEditInputAriaLabel'))}" value="${escapeHtml(taskText(task, currentLang))}" />
            <select class="todo-row-edit-category" aria-label="${escapeHtml(t(currentLang, 'todoAddCategoryAriaLabel'))}">${categoryOptionsHtml(task.category)}</select>
          </span>
          ${deleteBtn}
        </li>
      `;
    }

    const editAction = task.isDefault ? '' : ' data-action="edit"';
    const defaultTag = task.isDefault ? `<span class="todo-row-default-tag">${escapeHtml(t(currentLang, 'todoDefaultTaskTag'))}</span>` : '';

    return `
      <li class="todo-row${task.done ? ' done' : ''}" data-id="${task.id}">
        ${checkBtn}
        <span class="todo-row-main">
          <span class="todo-row-text"${editAction}>${escapeHtml(taskText(task, currentLang))}${defaultTag}</span>
          <span class="todo-row-category"${editAction}>${escapeHtml(categoryLabel(task.category))}</span>
        </span>
        ${deleteBtn}
      </li>
    `;
  }

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

  // Only custom categories are listed here — the defaults are already
  // visible in the sidebar/dropdown and can't be deleted anyway, so
  // repeating all 10 of them in the modal was pure clutter.
  function renderCategoriesModalList() {
    if (customCategories.length === 0) {
      categoriesModalListEl.innerHTML = `<p class="muted todo-category-modal-empty">${escapeHtml(t(currentLang, 'todoNoCustomCategories'))}</p>`;
      return;
    }
    categoriesModalListEl.innerHTML = customCategories.map((cat) => `
      <li class="todo-category-modal-row">
        <span>${escapeHtml(cat.label)}<span class="todo-category-custom-tag">${escapeHtml(t(currentLang, 'todoCustomCategoryTag'))}</span></span>
        <button type="button" class="icon-btn icon-btn-danger todo-category-modal-delete" data-category="${cat.id}" aria-label="${escapeHtml(t(currentLang, 'todoDeleteCategoryBtnLabel'))}">${TRASH_ICON}</button>
      </li>
    `).join('');
  }

  function openCategoriesModal() {
    renderCategoriesModalList();
    categoriesModalInputEl.value = '';
    categoriesModalEl.hidden = false;
  }

  function closeCategoriesModal() {
    categoriesModalEl.hidden = true;
  }

  categoriesModalCloseEl.addEventListener('click', closeCategoriesModal);
  categoriesModalEl.addEventListener('click', (e) => {
    if (e.target === categoriesModalEl) closeCategoriesModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !categoriesModalEl.hidden) closeCategoriesModal();
  });

  categoriesModalListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.todo-category-modal-delete');
    if (!btn) return;
    await deleteCategory(btn.dataset.category);
  });

  categoriesModalFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = categoriesModalInputEl.value.trim();
    if (!name) return;
    categoriesModalInputEl.value = '';
    await addCategory(name);
  });

  async function addCategory(name) {
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const newCategoryId = generateId();
    const mutate = (categories) => [...(categories || []), { id: newCategoryId, label: trimmed }];
    customCategories = mutate(customCategories);
    wedding.customCategories = customCategories;
    render();
    renderCategoriesModalList();
    try {
      await Storage.mutateCustomCategories(weddingId, mutate);
    } catch (err) {
      console.error('mutateCustomCategories failed', err);
      alert(t(currentLang, 'saveErrorRetry'));
    }
  }

  async function deleteCategory(catId) {
    const cat = customCategories.find((c) => c.id === catId);
    if (!cat) return;
    const count = (wedding.tasks || []).filter((task) => task.category === catId).length;
    const message = count > 0
      ? t(currentLang, 'confirmDeleteCategoryWithTasks', cat.label, count)
      : t(currentLang, 'confirmDeleteCategory', cat.label);
    if (!(await showConfirmModal(message))) return;
    const mutateCats = (categories) => (categories || []).filter((c) => c.id !== catId);
    const mutateTasksFn = (tasks) => (tasks || []).filter((task) => task.category !== catId);
    customCategories = mutateCats(customCategories);
    wedding.customCategories = customCategories;
    wedding.tasks = mutateTasksFn(wedding.tasks);
    if (categoryFilter === catId) categoryFilter = 'all';
    render();
    renderCategoriesModalList();
    try {
      await Promise.all([
        Storage.mutateCustomCategories(weddingId, mutateCats),
        Storage.mutateTasks(weddingId, mutateTasksFn),
      ]);
    } catch (err) {
      console.error('deleteCategory save failed', err);
      alert(t(currentLang, 'saveErrorRetry'));
    }
  }

  async function commitTaskEdit(taskId, rowEl) {
    const input = rowEl.querySelector('.todo-row-edit-input');
    const select = rowEl.querySelector('.todo-row-edit-category');
    editingTaskId = null;
    if (!input) {
      render();
      return;
    }
    const newText = input.value.trim();
    const newCategory = select ? select.value : null;
    if (!newText) {
      render();
      return;
    }
    const mutate = (tasks) => (tasks || []).map((task) => {
      if (task.id !== taskId) return task;
      const updated = { ...task, category: newCategory || task.category };
      if (newText !== taskText(task, currentLang)) {
        updated.text = newText;
        updated.isDefault = false;
        delete updated.templateIndex;
      }
      return updated;
    });
    wedding.tasks = mutate(wedding.tasks);
    render();
    try {
      await Storage.mutateTasks(weddingId, mutate);
    } catch (err) {
      console.error('mutateTasks failed', err);
      alert(t(currentLang, 'saveErrorRetry'));
    }
  }

  addFormEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = addInputEl.value.trim();
    if (!text) return;
    const category = addCategoryEl.value || CATEGORIES[0].id;
    const newTask = { id: generateId(), text, category, done: false };
    const mutate = (tasks) => [...(tasks || []), newTask];
    wedding.tasks = mutate(wedding.tasks);
    addInputEl.value = '';
    render();
    try {
      await Storage.mutateTasks(weddingId, mutate);
    } catch (err) {
      console.error('mutateTasks failed', err);
      alert(t(currentLang, 'saveErrorRetry'));
    }
  });

  statusFiltersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.todo-filter-link');
    if (!btn) return;
    statusFilter = btn.dataset.status;
    render();
  });

  categoryFiltersEl.addEventListener('click', (e) => {
    if (e.target.closest('#todo-manage-categories-btn')) {
      openCategoriesModal();
      return;
    }
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
    if (categoryFilterSelectEl.value === '__add__') {
      categoryFilterSelectEl.value = categoryFilter;
      openCategoriesModal();
      return;
    }
    categoryFilter = categoryFilterSelectEl.value;
    render();
  });

  typeFiltersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.todo-filter-link');
    if (!btn) return;
    typeFilter = btn.dataset.type;
    render();
  });

  typeFilterSelectEl.addEventListener('change', () => {
    typeFilter = typeFilterSelectEl.value;
    render();
  });

  listEl.addEventListener('click', async (e) => {
    const row = e.target.closest('.todo-row');
    if (!row) return;
    const taskId = row.dataset.id;

    if (e.target.closest('.todo-row-check')) {
      const mutate = (tasks) => (tasks || []).map((task) => (task.id === taskId ? { ...task, done: !task.done } : task));
      wedding.tasks = mutate(wedding.tasks);
      render();
      try {
        await Storage.mutateTasks(weddingId, mutate);
      } catch (err) {
        console.error('mutateTasks failed', err);
        alert(t(currentLang, 'saveErrorRetry'));
      }
      return;
    }

    if (e.target.closest('.todo-row-delete')) {
      const task = (wedding.tasks || []).find((task) => task.id === taskId);
      if (!task || !(await showConfirmModal(t(currentLang, 'confirmDeleteTask', taskText(task, currentLang))))) return;
      const mutate = (tasks) => (tasks || []).filter((task) => task.id !== taskId);
      wedding.tasks = mutate(wedding.tasks);
      render();
      try {
        await Storage.mutateTasks(weddingId, mutate);
      } catch (err) {
        console.error('mutateTasks failed', err);
        alert(t(currentLang, 'saveErrorRetry'));
      }
      return;
    }

    if (e.target.closest('[data-action="edit"]')) {
      editingTaskId = taskId;
      render();
      const input = listEl.querySelector(`.todo-row[data-id="${taskId}"] .todo-row-edit-input`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  });

  listEl.addEventListener('focusout', async (e) => {
    const row = e.target.closest('.todo-row.editing');
    if (!row) return;
    if (row.contains(e.relatedTarget)) return;
    await commitTaskEdit(row.dataset.id, row);
  });

  listEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('todo-row-edit-input')) {
      e.target.blur();
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
    typeFilterSelectEl.setAttribute('aria-label', t(lang, 'todoFilterByType'));
    render();
    if (!categoriesModalEl.hidden) renderCategoriesModalList();
  }

  if (!weddingId) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

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

  if (!isFeatureEnabled(wedding, 'todoList')) {
    window.location.replace(`wedding-admin.html?id=${weddingId}`);
    return;
  }

  customCategories = wedding.customCategories || [];

  if (!wedding.tasksSeeded) {
    wedding.tasks = buildDefaultTasks(wedding.lang || 'fr');
    wedding.tasksSeeded = true;
    await Storage.seedTasks(weddingId, wedding.tasks);
  } else {
    const migrateFn = (tasks) => (tasks || []).map((task) => repairDefaultTaskCategory(migrateLegacyDefaultTask(task)));
    const migrated = migrateFn(wedding.tasks);
    if (migrated.some((task, i) => task !== wedding.tasks[i])) {
      wedding.tasks = migrated;
      try {
        await Storage.mutateTasks(weddingId, migrateFn);
      } catch (err) {
        console.error('mutateTasks failed', err);
      }
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
  typeFilterSelectEl.setAttribute('aria-label', t(currentLang, 'todoFilterByType'));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  render();
})();
