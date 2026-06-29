# Pièges connus

## html/body background vs décorations invité (z-index négatif)

`html` porte le fond (background + dégradé radial) pour toutes les pages ; `body` et `body.guest-theme` ne déclarent volontairement **aucun** fond.

**Pourquoi :** si `html` a son propre fond explicite, le fond de `body` n'est plus propagé au "canvas" racine (règle CSS sur la propagation du fond html/body) — il devient une boîte opaque normale qui se peint *devant* tout élément en `z-index` négatif situé plus loin dans le document. C'est exactement ce qui s'est passé le 2026-06-29 : l'ajout d'un fond sur `html` (pour combler le trou de la barre d'adresse mobile Chrome) a fait disparaître les décorations de coin (`.guest-decoration-layer`, `z-index: -1`) sur guest.html, car elles se sont retrouvées masquées par le fond de `body`.

**Protection en place :** `header.hero` a `isolation: isolate;` — cela donne à `.guest-decoration-layer` son propre contexte d'empilement, isolé des ancêtres (`body`, `html`). Vérifié : même en réintroduisant délibérément un fond opaque sur `body.guest-theme`, les décorations restent visibles.

**Règle à suivre :** ne jamais réintroduire un `background` sur `body` ou `body.guest-theme` dans css/style.css — tout fond de page doit rester sur `html` uniquement. Si une modification touche les règles globales (`html`, `body`, `:root`, `.page`), vérifier visuellement guest.html après coup (les décorations de coin sont le canari de ce piège). Plus généralement, tout élément contenant un enfant décoratif en `z-index` négatif devrait avoir son propre contexte d'empilement (`isolation: isolate` ou `z-index` explicite) plutôt que de dépendre du comportement de propagation du fond au niveau racine.
