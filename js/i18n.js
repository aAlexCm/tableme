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
    noWeddingTitle: 'Choisissez un mariage',
    noWeddingDesc: "Aucun mariage n'est précisé dans le lien. Sélectionnez-en un ci-dessous.",
    noWeddingEmpty: "Aucun mariage n'a encore été créé.",

    adminEyebrow: 'Administration',
    adminTitle: 'Gérer les mariages',
    adminSubtitle: 'Créez un mariage, ajoutez vos invités et leur numéro de table',
    adminNavLabel: 'Administration',
    adminNavGuestLink: 'Voir la page invité →',
    authTitle: 'Accès administration',
    authPlaceholder: 'Mot de passe',
    authSubmit: 'Entrer',
    authError: 'Mot de passe incorrect.',
    newWeddingTitle: 'Nouveau mariage',
    weddingNamePlaceholder: 'Nom du mariage (ex: Mariage de Léa & Tom)',
    weddingLangLabel: 'Langue par défaut',
    createBtn: 'Créer',
    weddingsTitle: 'Mariages',
    weddingsEmpty: 'Aucun mariage créé pour le moment.',
    manageBtn: 'Gérer',
    deleteBtn: 'Supprimer',
    copyBtn: 'Copier',
    copiedBtn: 'Copié !',
    guestNamePlaceholder: "Nom et prénom de l'invité",
    guestTablePlaceholder: 'N° de table',
    addBtn: 'Ajouter',
    guestsEmpty: 'Aucun invité ajouté pour le moment.',
    guestsTitlePrefix: 'Invités — ',
    dateUnset: 'Date non définie',
    guestCountSuffix: 'invité(s)',
    confirmDeleteWedding: (name) => `Supprimer le mariage "${name}" et tous ses invités ?`,
  },
  en: {
    guestHeroTitle: 'Find my table',
    guestSubtitle: 'Type your name to find your table',
    searchPlaceholder: 'Your first and last name...',
    tableLabel: 'Table',
    noMatch: 'No guest found with this name. Check the spelling.',
    noWeddingTitle: 'Choose a wedding',
    noWeddingDesc: 'No wedding was specified in the link. Pick one below.',
    noWeddingEmpty: 'No wedding has been created yet.',

    adminEyebrow: 'Administration',
    adminTitle: 'Manage weddings',
    adminSubtitle: 'Create a wedding, add your guests and their table number',
    adminNavLabel: 'Administration',
    adminNavGuestLink: 'View guest page →',
    authTitle: 'Admin access',
    authPlaceholder: 'Password',
    authSubmit: 'Enter',
    authError: 'Incorrect password.',
    newWeddingTitle: 'New wedding',
    weddingNamePlaceholder: 'Wedding name (e.g. Lea & Tom\'s wedding)',
    weddingLangLabel: 'Default language',
    createBtn: 'Create',
    weddingsTitle: 'Weddings',
    weddingsEmpty: 'No wedding created yet.',
    manageBtn: 'Manage',
    deleteBtn: 'Delete',
    copyBtn: 'Copy',
    copiedBtn: 'Copied!',
    guestNamePlaceholder: "Guest's first and last name",
    guestTablePlaceholder: 'Table number',
    addBtn: 'Add',
    guestsEmpty: 'No guest added yet.',
    guestsTitlePrefix: 'Guests — ',
    dateUnset: 'Date not set',
    guestCountSuffix: 'guest(s)',
    confirmDeleteWedding: (name) => `Delete the wedding "${name}" and all its guests?`,
  },
  ro: {
    guestHeroTitle: 'Găsește-ți masa',
    guestSubtitle: 'Scrie-ți numele pentru a-ți găsi masa',
    searchPlaceholder: 'Numele și prenumele tău...',
    tableLabel: 'Masa',
    noMatch: 'Niciun invitat găsit cu acest nume. Verifică ortografia.',
    noWeddingTitle: 'Alege o nuntă',
    noWeddingDesc: 'Nicio nuntă nu este specificată în link. Alege una mai jos.',
    noWeddingEmpty: 'Nicio nuntă nu a fost creată încă.',

    adminEyebrow: 'Administrare',
    adminTitle: 'Administrează nunțile',
    adminSubtitle: 'Creează o nuntă, adaugă invitații și numărul mesei lor',
    adminNavLabel: 'Administrare',
    adminNavGuestLink: 'Vezi pagina invitatului →',
    authTitle: 'Acces administrare',
    authPlaceholder: 'Parolă',
    authSubmit: 'Intră',
    authError: 'Parolă incorectă.',
    newWeddingTitle: 'Nuntă nouă',
    weddingNamePlaceholder: 'Numele nunții (ex: Nunta lui Léa & Tom)',
    weddingLangLabel: 'Limba implicită',
    createBtn: 'Creează',
    weddingsTitle: 'Nunți',
    weddingsEmpty: 'Niciо nuntă creată momentan.',
    manageBtn: 'Administrează',
    deleteBtn: 'Șterge',
    copyBtn: 'Copiază',
    copiedBtn: 'Copiat!',
    guestNamePlaceholder: 'Numele și prenumele invitatului',
    guestTablePlaceholder: 'Numărul mesei',
    addBtn: 'Adaugă',
    guestsEmpty: 'Niciun invitat adăugat momentan.',
    guestsTitlePrefix: 'Invitați — ',
    dateUnset: 'Dată nesetată',
    guestCountSuffix: 'invitat(i)',
    confirmDeleteWedding: (name) => `Ștergi nunta "${name}" și toți invitații ei?`,
  },
};

export function t(lang, key, ...args) {
  const entry = (dict[lang] && dict[lang][key]) ?? dict.fr[key];
  return typeof entry === 'function' ? entry(...args) : entry;
}

export function applyTranslations(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(lang, el.dataset.i18nPlaceholder);
  });
}

export function buildLangSwitcher(currentLang, onChange) {
  const select = document.createElement('select');
  select.className = 'lang-switcher';
  select.setAttribute('aria-label', 'Langue / Language / Limbă');
  LANGS.forEach((code) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = LANG_LABELS[code];
    if (code === currentLang) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener('change', () => onChange(select.value));
  return select;
}
