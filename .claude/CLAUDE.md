# TableMe — référence technique

> **Ce fichier doit toujours rester à jour.** Après toute modification structurante (nouvelle page, nouveau champ Firestore, nouveau feature flag, changement d'architecture), mettre à jour la section concernée ici-même, dans le même tour que le code. Le but est que les sessions futures n'aient pas à re-explorer le code pour ces faits-là.

## 1. Vue d'ensemble

- Site statique (HTML + JS modules ES, pas de build/bundler), déployé sur **Vercel** depuis GitHub, domaine `tableme.app` (+ domaine Vercel par défaut).
- Backend : **Firebase Firestore** (`js/firebase-config.js`, `js/storage.js`) — toutes les pages lisent/écrivent via l'objet `Storage`, jamais le SDK Firestore directement.
- Pas de build step : on édite les fichiers `.html`/`.js`/`.css` directement, rien à compiler.
- i18n maison (`js/i18n.js`) : fr/en/ro partout, fonction `t(lang, key)` + attributs `data-i18n` + `applyTranslations(lang)` + `buildLangSwitcher(lang, setLang)`.
- Pas d'auth pour couple/invité — accès par lien (`?id=weddingId`, parfois `&guest=guestId` pour rsvp.html). Auth Google (`js/auth-guard.js`) + allow-list email réservée à `admin.html`/`partners-admin.html` (superadmin only). Voir §6 sécurité.
- Workflow de commit : commit + push automatique après chaque changement (sans demander), voir `.claude/settings.local.json`/mémoire `feedback_commit_workflow`. Toujours répondre en français à l'utilisateur sur ce projet.

## 2. Routing (`vercel.json`)

`cleanUrls: true` (pas de `.html` dans les URLs). Rewrites pour les variantes de langue dans le chemin :
```
/fr, /en, /ro          → /index
/guest/fr|en|ro         → /guest
/rsvp/fr|en|ro          → /rsvp
```
Chaque page concernée (`guest.js`, `rsvp.js`, `landing.js`, `floor-plan.js`) parse elle-même la langue depuis `location.pathname` (regex du type `/^\/guest\/(fr|en|ro)\/?$/`), avec priorité : **chemin URL > localStorage/sessionStorage > `wedding.lang` > 'fr'**.

## 3. Pages

| Fichier HTML | Script | Rôle | Audience | Flag requis |
|---|---|---|---|---|
| `index.html` | `landing.js` | Page marketing (carrousel, pricing, contact mailto) | Public | — |
| `admin.html` | `admin.js` | Superadmin : CRUD weddings, feature flags par mariage, logs d'erreur, localisation | Superadmin (Google + allow-list) | — |
| `wedding-admin.html` | `wedding-admin.js` | Dashboard principal du couple : liste d'invités, tuiles vers les autres outils | Couple (lien) | — |
| `floor-plan.html` | `floor-plan.js` | Éditeur de plan de salle (drag tables/chaises/landmarks, zoom/pan) | Couple (lien) | `floorPlan` |
| `theme-settings.html` | `theme-settings.js` | Personnalisation page invité (couleurs/polices/décoration) | Couple (lien) | `themeCustomization` |
| `menu.html` | `menu.js` | Gestion des menus/plats | Couple (lien) | `menuManagement` |
| `todo.html` | `todo.js` | Checklist mariage (catégories par défaut + custom) | Couple (lien) | — (toujours actif) |
| `poster.html` | `poster.js` | Éditeur d'affiche imprimable (QR + texte/images en drag, export PDF) | Couple (lien) | `poster` |
| `invitation.html` | `invitation.js` | Éditeur d'invitation digitale (chrome admin : frame téléphone + toolbox) | Couple (lien) | `digitalInvitation` |
| `invitation-page.html` | `invitation-page.js` | La page d'invitation elle-même (canvas widgets), servie en mode édition (`&edit=1`, dans l'iframe admin) ou en mode public (lien partagé, lecture seule) | Couple (édition) + invités (lecture, lien public) | `digitalInvitation` |
| `guest.html` | `guest.js` | Recherche de table par nom/numéro, vue plan/liste, wayfinding GPS | Invité (lien) | `wayfindingGps`, `menuManagement` (optionnels selon affichage) |
| `rsvp.html` | `rsvp.js` | Confirmation RSVP (pending/confirmed/declined) + choix de menu | Invité (lien avec `&guest=`) | — |
| `partenaires.html` | `partners-page.js` | Vitrine des partenaires/prestataires filtrée par localisation | Invité (lien) | `sponsorPartners` |
| `partners-admin.html` | `partners-admin.js` | CRUD partenaires + stats de clics | Superadmin (Google + allow-list) | — |

**Gating à deux niveaux** : certaines pages sont entièrement masquées si le flag est désactivé (menu, poster, invitation, partenaires → redirection vers wedding-admin avec message "introuvable"). D'autres ne masquent qu'une **tuile** dans wedding-admin.html/floor-plan.html, grisée avec un badge "Contactez-nous" (`.admin-tool-tile.is-disabled` + badge `data-i18n` caché/affiché en JS) plutôt que complètement invisible — c'est le pattern utilisé pour `poster` et `digitalInvitation`.

## 4. Modèle de données Firestore

### `weddings/{weddingId}` — un document par mariage, tout en champs (PAS de sous-collections)

| Champ | Type | Géré par |
|---|---|---|
| `name`, `date`, `lang` | string | `addWedding`, `updateWeddingDate`, `updateWeddingLang` |
| `location` | `{country, region, city}` | `setLocation` |
| `guests` | array de `{id, name, table, phone?, menuId?, rsvp?, empty?}` | `addGuest`, `addGuests`, `deleteGuest`, `mutateGuests`, `mutateGuestsAndTables` |
| `tables` | array de `{id, label, shape: 'round'\|'rectangle', x, y (%), seats?, rotated?}` | `mutateTables`, `mutateGuestsAndTables` |
| `landmarks` | array de `{id, type, x, y (%)}` | `mutateLandmarks` |
| `tasks` | array de `{id, text, category, done, isDefault?, templateIndex?}` | `mutateTasks`, `seedTasks` |
| `tasksSeeded` | bool | `seedTasks` (seed unique des tâches par défaut) |
| `customCategories` | array de `{id, label}` | `mutateCustomCategories` |
| `menus` | array de `{id, title, dishes: [{id, name}]}` | `mutateMenus` |
| `theme` | `{preset, colors{...11 clés}, fonts{title, body}, decoration{element, positions[], customImage}}` | `setTheme` |
| `features` | `{[flagKey]: bool}` | `setFeatures` |
| `poster` | objet libre (éléments du canevas A4) | `setPoster` |
| `invitation` | `{widgets: [...]}` | `setInvitation` |

**Concurrence** : toutes les fonctions `mutate*(weddingId, mutateFn)` utilisent `runTransaction()` côté Firestore — `mutateFn(currentArray)` peut être ré-exécutée si une autre écriture arrive entre-temps, évitant les pertes de données en cas d'édition simultanée (deux onglets/appareils). C'est le pattern à suivre pour **toute nouvelle écriture de liste** — ne jamais faire un simple `getWedding` → modifier en local → `updateDoc` sans transaction. Voir aussi le pattern "optimistic update" : on applique le changement localement et on re-render *avant* d'attendre l'écriture Firestore, pour cacher la latence réseau (établi après les bugs de RSVP perdues, cf. §7).

### Autres collections

- `partners/{partnerId}` — un document par prestataire (catégorie, contacts, localisation, photos). Lecture publique, écriture superadmin only.
- `partnerClicks/{clickId}` — analytics best-effort (vue/photo/contact), écriture publique anonyme, lecture superadmin only.
- `appLogs/{logId}` — logs d'erreur applicative, écriture publique (toute page peut signaler une erreur via `initErrorLogging`/`logAppError`), lecture/suppression superadmin only.

### Fonctions exportées par `js/storage.js`

Weddings : `getWeddings`, `getWedding(id)`, `subscribeToWedding(id, onUpdate, onError)`, `addWedding`, `deleteWedding`, `updateWeddingLang`, `updateWeddingDate`, `setLocation`, `setTheme`, `setFeatures`, `setPoster`, `setInvitation`.
Listes (toutes transactionnelles) : `mutateGuests`, `mutateTables`, `mutateGuestsAndTables`, `mutateLandmarks`, `mutateTasks`, `mutateCustomCategories`, `mutateMenus`, `seedTasks`.
Invités (raccourcis non-transactionnels au-dessus de `mutateGuests`) : `addGuest`, `addGuests`, `deleteGuest`.
Partenaires : `getPartners`, `addPartner`, `updatePartner`, `deletePartner`, `logPartnerEvent`, `getPartnerClicks`.
Logs : `logAppError`, `getAppLogs`, `clearAppLogs`.
Utilitaires : `generateId()`, `normalize(str)` (minuscule + suppression accents, pour la recherche).

## 5. Feature flags (`js/features.js`)

Registre `FEATURE_FLAGS` (tableau d'objets `{key, labelKey, default, icon}`) — ajouter une entrée ici suffit, la modale de `admin.js` la détecte automatiquement, pas besoin d'y toucher.

| Clé | Défaut | Contrôle |
|---|---|---|
| `bulkImport` | `true` | import en masse d'invités (wedding-admin) |
| `floorPlan` | `true` | page floor-plan.html |
| `themeCustomization` | `true` | page theme-settings.html |
| `qrShare` | `true` | bouton QR code |
| `wayfindingGps` | `true` | flèche GPS sur guest.html |
| `sponsorPartners` | `true` | page partenaires (couple + invité) |
| `poster` | `true` | page poster.html (tuile grisée si off) |
| `menuManagement` | `true` | page menu.html + option menu sur guest/rsvp |
| `digitalInvitation` | `false` | pages invitation.html/invitation-page.html (tuile grisée si off — encore en construction, off par défaut volontairement) |

`isFeatureEnabled(wedding, key)` : si le flag n'existe pas dans `wedding.features`, retombe sur le `default` du registre (pas sur `true` en dur) ; sinon coercion booléenne de la valeur stockée.

## 6. Modules par domaine

### Couple / admin
- **wedding-admin.js** (dashboard principal) — liste d'invités (ajout simple/bulk/CSV via XLSX), drag-and-drop de sièges, recherche avec normalisation des accents, pastilles RSVP, compte à rebours, sync temps réel via `subscribeToWedding`. Tuiles vers les autres outils, gating par flag.
- **floor-plan.js** — plan de salle : tables rondes/rectangulaires, chaises calculées (pas draggables individuellement), landmarks (9 types, `js/landmarks.js`), zoom 0.5–1.5x, pinch-to-zoom, plein écran, liste des invités non assignés. Géométrie des chaises dans `js/table-shape.js` (`buildChairs`, `getTableReach`, `DEFAULT_SEATS = 8`).
- **table-modal.js** / **guest-modal.js** — modales réutilisables (édition table / édition invité), utilisées par wedding-admin et floor-plan.
- **theme-settings.js** — presets couleur (4) + custom, polices titre/corps (3+3), décoration (8 presets + fireworks + image perso), positions multiples.
- **todo.js** — checklist avec 10 catégories par défaut traduites (FR/EN/RO via `templateIndex`, pas de texte figé — se retraduit si on change de langue), catégories custom, 3 filtres cumulables.
- **menu.js** — menus + plats, stats de répartition des invités.
- **poster.js** — éditeur d'affiche A4 (texte, QR stylé, images, fonds), export PDF (`html2canvas` + `jsPDF`). **Le bouton "Imprimer" a été retiré** (2026-06-28) : `window.print()` s'est avéré durablement non fiable sur Safari mobile réel ; seul le téléchargement PDF est proposé.
- **invitation.js / invitation-page.js** — éditeur "à la Wix" : `invitation.html` affiche un frame de téléphone (iframe) pointant vers `invitation-page.html`. Widgets texte déplaçables/éditables en place (pas de poignée de rotation, juste largeur + taille de police). Le **même** `invitation-page.html` sert pour l'édition (`?edit=1`, chrome interactif visible seulement dans l'iframe admin) et pour le lien public partagé (sans `edit=1` → contenu statique, non éditable — sécurité volontaire pour qu'un invité ne puisse pas modifier l'invitation du couple). **Panneau "Paramètres du texte"** (2026-06-30) : vit dans `invitation.html` (parent), pas dans l'iframe — pas la place pour un vrai panneau latéral dans un mockup de 320px. `invitation-page.js` n'a plus aucune UI de toolbar locale ; à la sélection/désélection d'un widget il appelle `window.parent.onInvitationWidgetSelected(widget, rect)` / `onInvitationWidgetDeselected()` (même origine, pas de postMessage — `rect` est le `getBoundingClientRect()` du widget dans le viewport de l'iframe), et expose `window.updateSelectedWidgetProps(props)` / `deleteSelectedWidget()` / `deselectInvitationWidget()` que le panneau du parent pilote directement. Champs widget : `bold`, `italic`, `underline`, `align`, `fontSize`, `fontFamily` (5 polices), `color`. Le panneau est `position: fixed` (popover positionné en JS juste à côté du texte sélectionné via `iframe.getBoundingClientRect() + rect`, clampé au viewport) — PAS un sibling flex de `.invitation-canvas-area`, sinon son apparition décale le frame du téléphone. Sous 760px il devient une feuille du bas (`!important` sur `top`/`left` pour écraser le style inline laissé par le JS de positionnement desktop). Le frame de téléphone (`.invitation-phone-frame` dans css/style.css) est l'image réelle `images/phone-frame.png` (1146×2443, statusbar/encoche/home-indicator déjà dans le PNG) posée en `background`, avec aspect-ratio CSS conservé ; l'`<iframe>` est un enfant positionné en absolu, inséré à `top:5.5%; left:3%; width:96.5%; height:91.7%` pour rester dans la zone d'écran sans recouvrir la statusbar/home-indicator. **Piège #1** : `top`+`bottom`+`height:auto` ne stretch pas un élément remplacé (`<iframe>`/`<img>`) de façon fiable — utiliser `width`/`height` explicites, pas `bottom`. **Piège #2** : la forme visible du téléphone dans ce PNG n'est PAS centrée dans son canvas (plus de marge d'ombre à gauche qu'à droite) — des insets symétriques (ex. `left:3.5%; width:93%`) laissent un vide visible à droite/en bas. Les valeurs ci-dessus viennent d'une mesure pixel par pixel du PNG (seuil alpha>100 pour ignorer le flou de l'ombre), pas d'une estimation visuelle — si le PNG change, remesurer plutôt que deviner.
- **admin.js** (superadmin) — CRUD weddings, modale feature flags, modale localisation (cascade pays→région→ville via `geo.js`), modale date, visualisation/effacement des logs d'erreur (`appLogs`).
- **share-controls.js** — composant réutilisable QR code + copie de lien + partage natif, utilisé par wedding-admin et floor-plan.

### Invité
- **guest.js** — recherche par nom/numéro de table, vue plan (chaises) ou liste, wayfinding GPS (pathfinding avec évitement d'obstacles, flèche vers la table), URL multilingue.
- **guest-decorations.js** — décorations de coin : presets `branch`, `hearts`, `rings`, `blossom`, `laurel`, `confetti`, `artdeco`, `fireworks` (animation canvas spéciale via `js/fireworks.js`) + image perso. Voir le piège stacking-context au §7.
- **guest-themes.js** — 4 presets de couleurs + 3 polices titre + 3 polices corps, appliqués via variables CSS `--guest-*` sur `:root`.
- **rsvp.js** — confirmation pending/confirmed/declined + choix de menu si `menuManagement` actif. Nécessite `?id=` **et** `&guest=`.

### Partenaires (vertical séparée)
- **partners.js** — taxonomies partagées : `PARTNER_CATEGORIES`, `PARTNER_ICONS`, `CONTACT_CHANNELS`, `matchesLocation(partner, location)` (cascade pays/région/ville).
- **partners-page.js** + `partenaires.html` — page publique filtrée par localisation du mariage, lightbox photo, log d'événements (`logPartnerEvent`).
- **partners-admin.js** + `partners-admin.html` — CRUD superadmin, upload/redimension d'image, réordonnancement, dashboard de stats de clics.

### Utilitaires transverses
- **i18n.js** — `t(lang, key)`, `applyTranslations`, `buildLangSwitcher`, dictionnaires fr/en/ro.
- **error-log.js** — `initErrorLogging({page, weddingId})`, capture les erreurs non gérées et les envoie best-effort vers `appLogs` (visible dans admin.html).
- **auth-guard.js** — `signInWithGoogle`, `signOutUser`, `waitForAuthUser` (Google sign-in, pas email/mot de passe) ; utilisé uniquement par admin.html/partners-admin.html.
- **geo.js** — pays/régions/villes : France via geo.api.gouv.fr, reste du monde via countriesnow.space, avec cache.
- **phone-codes.js** — indicatifs téléphoniques (ISO 3166-1), `combinePhone`/`splitPhone`.
- **color-hex.js** — normalisation/validation hex, sync `<input type="color">` ↔ champ texte.
- **fireworks.js** — animation canvas (fusées + particules), utilisée par guest-decorations.
- **contact-modal.js** vs **contact-mailto.js** — **les deux sont utilisés, aucun n'est mort** : `contact-modal.js` = modale d'actions (appel/SMS/WhatsApp/copie) pour que le couple contacte *un invité précis* depuis wedding-admin ; `contact-mailto.js` = simple lien `mailto:` pré-rempli pour le bouton "Contactez-nous" public (landing.js, floor-plan.js). Le formulaire Google a été remplacé par ce mailto en 2026-06-29.
- **landing.js** — page marketing (carrousel, pricing, lightbox).

## 7. Pièges connus

### html/body background vs décorations invité (z-index négatif)

`html` porte le fond (background + dégradé radial) pour toutes les pages ; `body` et `body.guest-theme` ne déclarent volontairement **aucun** fond.

**Pourquoi :** si `html` a son propre fond explicite, le fond de `body` n'est plus propagé au "canvas" racine (règle CSS de propagation html/body) — il devient une boîte opaque normale qui se peint *devant* tout élément en `z-index` négatif situé plus loin dans le document. C'est exactement ce qui s'est passé le 2026-06-29 : l'ajout d'un fond sur `html` (pour combler le trou de la barre d'adresse mobile Chrome) a fait disparaître les décorations de coin (`.guest-decoration-layer`, `z-index: -1`) sur guest.html.

**Protection en place :** `header.hero` a `isolation: isolate;` — `.guest-decoration-layer` a ainsi son propre contexte d'empilement, isolé de `body`/`html`. Vérifié : même en réintroduisant délibérément un fond opaque sur `body.guest-theme`, les décorations restent visibles.

**Règle à suivre :** ne jamais réintroduire un `background` sur `body` ou `body.guest-theme` — tout fond de page doit rester sur `html` uniquement. Si une modif touche les règles globales (`html`, `body`, `:root`, `.page`), vérifier visuellement guest.html après coup. Plus généralement, tout conteneur d'un enfant décoratif en `z-index` négatif devrait avoir son propre contexte d'empilement (`isolation: isolate` ou `z-index` explicite).

### Fiabilité Firestore (2026-06-29)

Deux bugs de prod corrigés, pattern à respecter pour tout nouveau code touchant Storage :
1. **Édits perdus / lents** : ne pas refaire un `getWedding` juste avant une écriture si un objet wedding déjà en cache local est disponible — construire le nouveau tableau à partir du cache, re-render immédiatement (optimistic UI), *puis* attendre l'écriture Firestore en arrière-plan.
2. **Pages blanches sur certains téléphones** : tout `Storage.getWedding`/`getWeddings` initial doit être dans un try/catch, avec une carte `#connection-error` dédiée (bouton retry → `location.reload()`), distincte de l'état "mariage introuvable".

### `window.print()` peu fiable sur mobile

Le bouton "Imprimer" de poster.html a été retiré (2026-06-28) après plusieurs tentatives infructueuses sur Safari iOS réel (délai de ~2min puis blocage). Le téléchargement PDF (html2canvas + jsPDF) est l'unique export et fonctionne de manière fiable. Si quelqu'un redemande un bouton "imprimer" ailleurs dans l'app, privilégier d'emblée une approche PDF plutôt que `window.print()`.

### Spécificité CSS dans `body.admin-theme`

`body.admin-theme .card { padding: 36px; }` (non médiaquerée) a une spécificité (0,2,1) plus élevée qu'un override à une seule classe + `:not()` comme `.add-guest-card:not(.is-open) { padding: ... }` (0,2,0). Un override mobile-only sur `.card` perdra silencieusement face à cette règle sauf à augmenter sa spécificité (ex. préfixer par un `#id`). Toujours vérifier le `padding`/style calculé via `getComputedStyle`, pas seulement une capture d'écran.

### `[hidden]` perd contre un `display` non conditionnel de la même classe

Un élément cible par `el.hidden = true/false` ne se cache que si AUCUNE règle d'auteur ne fixe `display` sans condition sur ce même élément — `[hidden] { display:none }` est une règle du user-agent stylesheet, toujours perdante face à une règle d'auteur de spécificité égale ou supérieure (ex. `.ma-classe { display: flex; }`). Repéré le 2026-06-30 sur `.invitation-text-settings` (le panneau "Paramètres du texte" restait visible en permanence, même sans widget sélectionné). **Pattern à appliquer pour tout élément togglé via l'attribut `hidden`** : mettre `display: none` dans la règle de base, puis `.ma-classe:not([hidden]) { display: flex; }` pour l'état visible — jamais `display: flex` directement dans la règle de base.

## 8. Sécurité / accès

- `js/auth-guard.js` (Google sign-in popup) + `firestore.rules` (`isSuperAdmin()` = email dans une allow-list, actuellement `boagiualexandru@gmail.com` uniquement) protègent `admin.html`/`partners-admin.html` et les opérations `list`/`create`/`delete` sur `weddings`, toutes les écritures sur `partners`, et la lecture de `partnerClicks`/`appLogs`.
- `weddings/{id}` reste `get`/`update: if true` (sans auth) — c'est volontaire : couples et invités y accèdent uniquement via le lien (`?id=...`), pas de système de login pour eux.
- Pour ajouter un deuxième superadmin : ajouter son email dans le tableau de `firestore.rules`, puis publier manuellement via la console Firebase (pas de CLI/`firebase.json` dans ce repo).
- Tout nouveau domaine de déploiement doit être ajouté dans Firebase Authentication → Settings → Authorized domains, sinon le Google sign-in échoue avec `auth/unauthorized-domain`.

## 9. Style visuel admin

Thème `body.admin-theme` : teal plat + blanc, **sans dégradés**, sans orange/pêche. Les accents pastel sont réservés aux petits badges d'icônes illustratifs (tuiles d'outils, tags de catégorie partenaire) en hex codés en dur — jamais sur le chrome structurel (nav/cartes/boutons/modales), qui reste blanc/gris/teal. Headings en `'Playfair Display', serif !important` sur fond Inter sans-serif. Voir mémoire `feedback_admin_visual_style` pour l'historique complet si besoin d'archéologie.
