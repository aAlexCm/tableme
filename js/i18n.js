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
    copyBtn: 'Copier',
    copiedBtn: 'Copié !',
    copyAdminLinkBtn: 'Copier lien admin',
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
    copyBtn: 'Copy',
    copiedBtn: 'Copied!',
    copyAdminLinkBtn: 'Copy admin link',
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
    guestSubtitle: 'Scrie-ți numele<br />pentru a-ți găsi masa',
    searchPlaceholder: 'Numele și prenumele tău...',
    tableLabel: 'Masa',
    noMatch: 'Niciun invitat găsit cu acest nume. Verifică ortografia.',
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
    copyBtn: 'Copiază',
    copiedBtn: 'Copiat!',
    copyAdminLinkBtn: 'Copiază linkul admin',
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
