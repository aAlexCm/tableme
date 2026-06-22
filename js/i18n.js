export const LANGS = ['fr', 'en', 'ro'];

export const LANG_LABELS = {
  fr: 'Français',
  en: 'English',
  ro: 'Română',
};

const dict = {
  fr: {
    guestHeroTitle: 'Trouver ma table',
    guestSubtitle: 'Tapez votre nom pour découvrir votre table',
    searchPlaceholder: 'Votre nom et prénom...',
    tableLabel: 'Table',
    noMatch: "Aucun invité trouvé avec ce nom. Vérifiez l'orthographe.",
    tablePreviewTitle: 'Invités à votre table',
    youTag: 'vous',
    tablePreviewViewTable: 'Vue table',
    tablePreviewViewList: 'Vue liste',
    invalidLinkTitle: 'Lien invalide',
    invalidLinkDesc: "Ce lien n'est pas valide. Merci d'utiliser le lien fourni par les mariés.",
    weddingNotFoundTitle: 'Mariage introuvable',
    weddingNotFoundDesc: "Ce lien n'est pas valide ou ce mariage a été supprimé.",

    adminEyebrow: 'Administration',
    adminTitle: 'Gérer les mariages',
    adminSubtitle: 'Créez un mariage, ajoutez vos invités et leur numéro de table',
    adminNavLabel: 'Administration',
    adminNavGuestLink: 'Voir la page invité →',
    newWeddingTitle: 'Nouveau mariage',
    weddingNameLabel: 'Nom du mariage',
    weddingDateLabel: 'Date',
    weddingNamePlaceholder: 'ex: Léa & Tom',
    weddingLangLabel: 'Langue par défaut',
    createBtn: 'Créer',
    weddingsTitle: 'Mariages',
    weddingsEmpty: 'Aucun mariage créé pour le moment.',
    manageBtn: 'Gérer',
    deleteBtn: 'Supprimer',
    copyAdminLinkBtn: 'Copier lien admin',
    copyGuestLinkBtn: 'Copier le lien invité',
    addGuestTitle: 'Ajouter un invité',
    guestNameLabel: 'Nom et prénom',
    guestTableLabel: 'Table',
    guestNamePlaceholder: "Nom et prénom de l'invité",
    guestTablePlaceholder: 'N° de table',
    addBtn: 'Ajouter',
    addModeSingle: 'Un par un',
    addModeBulk: 'Plusieurs',
    addModeFile: 'Fichier',
    bulkAddHint: 'Un invité par ligne, au format : Nom et prénom, numéro de table',
    bulkAddPlaceholder: 'Jean Dupont, 1\nClaire Martin, 2',
    bulkAddBtn: 'Ajouter la liste',
    bulkAddSuccess: (count) => `${count} invité(s) ajouté(s).`,
    bulkAddSkipped: (count) => ` ${count} ligne(s) ignorée(s) (format invalide).`,
    bulkAddEmpty: 'Saisissez au moins un invité.',
    fileAddHint: 'Téléchargez le modèle, remplissez-le, puis importez-le ci-dessous (CSV ou Excel).',
    downloadTemplateBtn: 'Télécharger le modèle',
    fileDropzoneText: 'Glissez-déposez un fichier ici, ou cliquez pour le sélectionner',
    fileImportError: "Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un CSV ou Excel.",
    qrCodeBtn: 'Voir le QR code',
    qrModalTitle: 'QR Code de la page invité',
    qrDownloadBtn: 'Télécharger',
    qrShareBtn: 'Partager',
    guestsEmpty: 'Aucun invité ajouté pour le moment.',
    guestsTitlePrefix: 'Invités — ',
    dateUnset: 'Date non définie',
    guestCountSuffix: 'invité(s)',
    confirmDeleteWedding: (name) => `Supprimer le mariage "${name}" et tous ses invités ?`,
    floorPlanNavLabel: 'Plan de salle',
    viewTabList: 'Liste des invités',
    floorPlanTitle: 'Plan de salle',
    addTableBtn: '+ Ajouter une table',
    floorPlanHint: 'Glissez les tables pour composer votre salle. Faites glisser un espace vide pour vous déplacer, et utilisez le zoom pour voir plus de tables.',
    fullscreenBtn: 'Plein écran',
    unassignedGuestsTitle: 'Invités non assignés',
    unassignedEmpty: 'Tous les invités sont placés.',
    assignToTablePlaceholder: 'Choisir une table…',
    tableNameLabel: 'Nom de la table',
    tableShapeLabel: 'Forme',
    tableShapeRound: 'Ronde',
    tableShapeRectangle: 'Rectangulaire',
    tableSeatsLabel: 'Places',
    tableGuestsTitle: 'Invités à cette table',
    tableGuestsEmpty: 'Aucun invité à cette table.',
    assignBtn: 'Assigner',
    addExistingGuestLabel: 'Ajouter un invité existant',
    chooseGuestPlaceholder: 'Choisir un invité…',
    addNewGuestLabel: 'Ou ajouter un nouvel invité',
    deleteTableBtn: 'Supprimer la table',
    editTableBtn: 'Modifier la table',
    unassignedOption: '— Non assigné —',
    confirmDeleteTable: (count) =>
      count > 0
        ? `Supprimer cette table ? ${count} invité(s) deviendront non assignés.`
        : 'Supprimer cette table ?',
    tableLabelDuplicateError: 'Une table porte déjà ce nom.',
    tableLabelEmptyError: 'Le nom de la table ne peut pas être vide.',
  },
  en: {
    guestHeroTitle: 'Find my table',
    guestSubtitle: 'Type your name to find your table',
    searchPlaceholder: 'Your first and last name...',
    tableLabel: 'Table',
    noMatch: 'No guest found with this name. Check the spelling.',
    tablePreviewTitle: 'Guests at your table',
    youTag: 'you',
    tablePreviewViewTable: 'Table view',
    tablePreviewViewList: 'List view',
    invalidLinkTitle: 'Invalid link',
    invalidLinkDesc: 'This link is not valid. Please use the link provided by the couple.',
    weddingNotFoundTitle: 'Wedding not found',
    weddingNotFoundDesc: 'This link is invalid or this wedding has been deleted.',

    adminEyebrow: 'Administration',
    adminTitle: 'Manage weddings',
    adminSubtitle: 'Create a wedding, add your guests and their table number',
    adminNavLabel: 'Administration',
    adminNavGuestLink: 'View guest page →',
    newWeddingTitle: 'New wedding',
    weddingNameLabel: 'Wedding name',
    weddingDateLabel: 'Date',
    weddingNamePlaceholder: 'e.g. Léa & Tom',
    weddingLangLabel: 'Default language',
    createBtn: 'Create',
    weddingsTitle: 'Weddings',
    weddingsEmpty: 'No wedding created yet.',
    manageBtn: 'Manage',
    deleteBtn: 'Delete',
    copyAdminLinkBtn: 'Copy admin link',
    copyGuestLinkBtn: 'Copy guest link',
    addGuestTitle: 'Add a guest',
    guestNameLabel: 'First and last name',
    guestTableLabel: 'Table',
    guestNamePlaceholder: "Guest's first and last name",
    guestTablePlaceholder: 'Table number',
    addBtn: 'Add',
    addModeSingle: 'One by one',
    addModeBulk: 'Multiple',
    addModeFile: 'File',
    bulkAddHint: 'One guest per line, formatted as: First and last name, table number',
    bulkAddPlaceholder: 'John Smith, 1\nJane Doe, 2',
    bulkAddBtn: 'Add the list',
    bulkAddSuccess: (count) => `${count} guest(s) added.`,
    bulkAddSkipped: (count) => ` ${count} line(s) skipped (invalid format).`,
    bulkAddEmpty: 'Enter at least one guest.',
    fileAddHint: 'Download the template, fill it in, then import it below (CSV or Excel).',
    downloadTemplateBtn: 'Download template',
    fileDropzoneText: 'Drag and drop a file here, or click to select one',
    fileImportError: 'Could not read this file. Please check it is a valid CSV or Excel file.',
    qrCodeBtn: 'View QR code',
    qrModalTitle: 'Guest page QR code',
    qrDownloadBtn: 'Download',
    qrShareBtn: 'Share',
    guestsEmpty: 'No guest added yet.',
    guestsTitlePrefix: 'Guests — ',
    dateUnset: 'Date not set',
    guestCountSuffix: 'guest(s)',
    confirmDeleteWedding: (name) => `Delete the wedding "${name}" and all its guests?`,
    floorPlanNavLabel: 'Floor plan',
    viewTabList: 'Guest list',
    floorPlanTitle: 'Floor plan',
    addTableBtn: '+ Add a table',
    floorPlanHint: 'Drag the tables to lay out your venue. Drag an empty area to move around, and use the zoom to see more tables.',
    fullscreenBtn: 'Full screen',
    unassignedGuestsTitle: 'Unassigned guests',
    unassignedEmpty: 'All guests are seated.',
    assignToTablePlaceholder: 'Choose a table…',
    tableNameLabel: 'Table name',
    tableShapeLabel: 'Shape',
    tableShapeRound: 'Round',
    tableShapeRectangle: 'Rectangular',
    tableSeatsLabel: 'Seats',
    tableGuestsTitle: 'Guests at this table',
    tableGuestsEmpty: 'No guest at this table.',
    assignBtn: 'Assign',
    addExistingGuestLabel: 'Add an existing guest',
    chooseGuestPlaceholder: 'Choose a guest…',
    addNewGuestLabel: 'Or add a new guest',
    deleteTableBtn: 'Delete table',
    editTableBtn: 'Edit table',
    unassignedOption: '— Unassigned —',
    confirmDeleteTable: (count) =>
      count > 0 ? `Delete this table? ${count} guest(s) will become unassigned.` : 'Delete this table?',
    tableLabelDuplicateError: 'A table already has this name.',
    tableLabelEmptyError: 'The table name cannot be empty.',
  },
  ro: {
    guestHeroTitle: 'Găsește-ți masa',
    guestSubtitle: 'Scrie-ți numele<br />pentru a-ți găsi masa',
    searchPlaceholder: 'Numele și prenumele tău...',
    tableLabel: 'Masa',
    noMatch: 'Niciun invitat găsit cu acest nume. Verifică ortografia.',
    tablePreviewTitle: 'Invitați la masa ta',
    youTag: 'tu',
    tablePreviewViewTable: 'Vedere masă',
    tablePreviewViewList: 'Vedere listă',
    invalidLinkTitle: 'Link invalid',
    invalidLinkDesc: 'Acest link nu este valid. Folosește linkul primit de la miri.',
    weddingNotFoundTitle: 'Nuntă negăsită',
    weddingNotFoundDesc: 'Acest link este invalid sau nunta a fost ștearsă.',

    adminEyebrow: 'Administrare',
    adminTitle: 'Administrează nunțile',
    adminSubtitle: 'Creează o nuntă, adaugă invitații și numărul mesei lor',
    adminNavLabel: 'Administrare',
    adminNavGuestLink: 'Vezi pagina invitatului →',
    newWeddingTitle: 'Nuntă nouă',
    weddingNameLabel: 'Numele nunții',
    weddingDateLabel: 'Data',
    weddingNamePlaceholder: 'ex: Léa & Tom',
    weddingLangLabel: 'Limba implicită',
    createBtn: 'Creează',
    weddingsTitle: 'Nunți',
    weddingsEmpty: 'Niciо nuntă creată momentan.',
    manageBtn: 'Administrează',
    deleteBtn: 'Șterge',
    copyAdminLinkBtn: 'Copiază linkul admin',
    copyGuestLinkBtn: 'Copiază linkul invitatului',
    addGuestTitle: 'Adaugă un invitat',
    guestNameLabel: 'Nume și prenume',
    guestTableLabel: 'Masa',
    guestNamePlaceholder: 'Numele și prenumele invitatului',
    guestTablePlaceholder: 'Numărul mesei',
    addBtn: 'Adaugă',
    addModeSingle: 'Unul câte unul',
    addModeBulk: 'Mai mulți',
    addModeFile: 'Fișier',
    bulkAddHint: 'Un invitat pe linie, în formatul: Nume și prenume, numărul mesei',
    bulkAddPlaceholder: 'Ion Popescu, 1\nMaria Ionescu, 2',
    bulkAddBtn: 'Adaugă lista',
    bulkAddSuccess: (count) => `${count} invitat(i) adăugat(i).`,
    bulkAddSkipped: (count) => ` ${count} linie/linii ignorată(e) (format invalid).`,
    bulkAddEmpty: 'Introduceți cel puțin un invitat.',
    fileAddHint: 'Descarcă modelul, completează-l, apoi importă-l mai jos (CSV sau Excel).',
    downloadTemplateBtn: 'Descarcă modelul',
    fileDropzoneText: 'Trage și plasează un fișier aici, sau apasă pentru a-l selecta',
    fileImportError: 'Acest fișier nu a putut fi citit. Verifică că este un fișier CSV sau Excel valid.',
    qrCodeBtn: 'Vezi codul QR',
    qrModalTitle: 'Codul QR al paginii invitatului',
    qrDownloadBtn: 'Descarcă',
    qrShareBtn: 'Distribuie',
    guestsEmpty: 'Niciun invitat adăugat momentan.',
    guestsTitlePrefix: 'Invitați — ',
    dateUnset: 'Dată nesetată',
    guestCountSuffix: 'invitat(i)',
    confirmDeleteWedding: (name) => `Ștergi nunta "${name}" și toți invitații ei?`,
    floorPlanNavLabel: 'Plan de sală',
    viewTabList: 'Lista invitaților',
    floorPlanTitle: 'Plan de sală',
    addTableBtn: '+ Adaugă o masă',
    floorPlanHint: 'Trage mesele pentru a aranja sala. Trage o zonă liberă pentru a te deplasa și folosește zoom-ul pentru a vedea mai multe mese.',
    fullscreenBtn: 'Ecran complet',
    unassignedGuestsTitle: 'Invitați neasignați',
    unassignedEmpty: 'Toți invitații sunt plasați.',
    assignToTablePlaceholder: 'Alege o masă…',
    tableNameLabel: 'Numele mesei',
    tableShapeLabel: 'Formă',
    tableShapeRound: 'Rotundă',
    tableShapeRectangle: 'Rectangulară',
    tableSeatsLabel: 'Locuri',
    tableGuestsTitle: 'Invitații acestei mese',
    tableGuestsEmpty: 'Niciun invitat la această masă.',
    assignBtn: 'Asignează',
    addExistingGuestLabel: 'Adaugă un invitat existent',
    chooseGuestPlaceholder: 'Alege un invitat…',
    addNewGuestLabel: 'Sau adaugă un invitat nou',
    deleteTableBtn: 'Șterge masa',
    editTableBtn: 'Editează masa',
    unassignedOption: '— Neasignat —',
    confirmDeleteTable: (count) =>
      count > 0 ? `Ștergi această masă? ${count} invitat(i) vor deveni neasignați.` : 'Ștergi această masă?',
    tableLabelDuplicateError: 'Există deja o masă cu acest nume.',
    tableLabelEmptyError: 'Numele mesei nu poate fi gol.',
  },
};

export function t(lang, key, ...args) {
  const entry = (dict[lang] && dict[lang][key]) ?? dict.fr[key];
  return typeof entry === 'function' ? entry(...args) : entry;
}

export function applyTranslations(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.innerHTML = t(lang, el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(lang, el.dataset.i18nPlaceholder);
  });
}

export function buildLangSwitcher(currentLang, onChange) {
  let selected = currentLang;

  const wrapper = document.createElement('div');
  wrapper.className = 'lang-switcher';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'lang-switcher-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', 'Langue / Language / Limbă');
  trigger.innerHTML = `<span class="lang-switcher-current">${LANG_LABELS[selected]}</span><span class="lang-switcher-chevron">&#9662;</span>`;

  const menu = document.createElement('ul');
  menu.className = 'lang-switcher-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;

  function handleOutsideClick(e) {
    if (!wrapper.contains(e.target)) closeMenu();
  }

  function openMenu() {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', handleOutsideClick);
  }

  function closeMenu() {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', handleOutsideClick);
  }

  function renderOptions() {
    menu.innerHTML = '';
    LANGS.forEach((code) => {
      const li = document.createElement('li');
      li.className = 'lang-switcher-option';
      li.setAttribute('role', 'option');
      li.dataset.lang = code;
      if (code === selected) li.setAttribute('aria-selected', 'true');
      li.innerHTML = `<span class="check">${code === selected ? '&#10003;' : ''}</span><span>${LANG_LABELS[code]}</span>`;
      li.addEventListener('click', () => {
        if (code !== selected) {
          selected = code;
          trigger.querySelector('.lang-switcher-current').textContent = LANG_LABELS[code];
          renderOptions();
          onChange(code);
        }
        closeMenu();
      });
      menu.appendChild(li);
    });
  }

  trigger.addEventListener('click', () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  renderOptions();
  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);
  return wrapper;
}
