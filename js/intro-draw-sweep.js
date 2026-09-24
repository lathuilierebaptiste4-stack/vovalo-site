/*
 * VOVALO — animation d'entrée de l'accueil, variante « tracé + remplissage progressif »
 * (inspirée de l'exemple Capella).
 *
 * ACTIVE uniquement si <html data-intro="draw-sweep"> (voir accueil.html). Pour
 * revenir à la version précédente, voir la note en tête d'accueil.html :
 *  - data-intro="draw"  → tracé + remplissage en fondu instantané (js/intro-draw.js)
 *
 * Joue à chaque chargement direct (URL tapée, favori, lien externe, rechargement),
 * sans sessionStorage ni localStorage. Ne joue PAS quand on arrive depuis une autre
 * page du site (document.referrer interne : equipe, contact, mentions-legales,
 * confidentialite, cgv) : le header final s'affiche directement.
 *
 * Ne fait rien (page visible immédiatement, sans overlay) si :
 *  - l'utilisateur a demandé prefers-reduced-motion ;
 *  - JavaScript est désactivé (l'overlay reste display:none par défaut en CSS).
 *
 * Séquence :
 *  1. Le signe V/éclat se dessine en contour (stroke-dasharray/dashoffset).
 *  2. Une fois le contour dessiné, il se remplit PROGRESSIVEMENT (balayage du
 *     bas vers le haut via clip-path animé), pas en fondu d'opacité.
 *  3. « VOVALO » et le sous-titre apparaissent en fondu sous le signe, une fois
 *     le remplissage terminé.
 *  3bis. Pause nette d'environ 0,3 s, logo complet immobile, avant l'étape suivante.
 *  4. L'ensemble signe+mot se déplace/réduit/fond vers la position réelle du
 *     logo dans le header (mesurée en direct) ; le sous-titre disparaît en
 *     fondu dès le début de cette étape.
 *  5. Le reste de la page apparaît en fondu pendant ce déplacement.
 * Durée totale visée : 2,5 à 3 secondes. Un garde-fou force la fin si quelque
 * chose se passe mal, pour ne jamais bloquer l'affichage au-delà de 3 secondes.
 */
(function () {
  if (document.documentElement.getAttribute("data-intro") !== "draw-sweep") return;

  var DRAW_MS = 900;    // 0,8 à 1 s : tracé du contour (§1)
  var FILL_MS = 700;    // 0,6 à 0,8 s : remplissage progressif, bas → haut (§2)
  var TEXT_MS = 350;    // 0,3 à 0,4 s : apparition du mot + sous-titre (§3)
  var HOLD_MS = 300;    // pause nette, logo complet immobile (§3bis)
  var LEAVE_MS = 600;   // 0,5 à 0,6 s : déplacement + réduction + fondu (§4)
  var REVEAL_MS = 900;  // apparition du reste de la page, pendant le déplacement (§5)
  var SAFETY_MS = 3000; // jamais plus de 3 s (règle impérative)

  var html = document.documentElement;
  var overlay = document.getElementById("intro-overlay-sweep");
  var page = document.getElementById("page");
  var mark = document.getElementById("intro-mark-sweep");
  var outlinePath = document.getElementById("intro-sweep-outline");
  if (!overlay || !page || !mark || !outlinePath) return;

  var reduced = false;
  try {
    reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  if (reduced) {
    // Overlay déjà masqué par défaut (display:none) : rien à faire, la page est visible.
    return;
  }

  // Arrivée depuis une autre page du site (lien interne) : pas d'animation.
  // Un rechargement (F5) rejoue l'animation même si le referrer est interne.
  var internalNav = false;
  try {
    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var isReload = nav && nav.type === "reload";
    if (!isReload && document.referrer) {
      var ref = new URL(document.referrer);
      internalNav = ref.origin === location.origin &&
        /^\/(equipe|contact|mentions-legales|confidentialite|cgv)(\.html)?\/?$/i.test(ref.pathname);
    }
  } catch (e) {}
  if (internalNav) return;

  html.classList.add("intro-pending");
  page.classList.add("intro-hide");
  page.style.setProperty("--reveal-duration", REVEAL_MS + "ms");

  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    html.classList.remove("intro-pending");
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
  var safety = setTimeout(finish, SAFETY_MS);

  function realLogoRect() {
    var full = document.querySelector(".logo-header-img--full");
    var m = document.querySelector(".logo-header-img--mark");
    var el = full && full.offsetWidth > 0 ? full : m;
    return el ? el.getBoundingClientRect() : null;
  }

  // Longueur réelle du tracé SVG, pour un stroke-dasharray/dashoffset exact.
  var pathLength = 900;
  try {
    var l = outlinePath.getTotalLength();
    if (l > 0) pathLength = l;
  } catch (e) {}
  outlinePath.style.setProperty("--path-length", pathLength.toFixed(1));

  overlay.style.setProperty("--draw-duration", DRAW_MS + "ms");
  overlay.style.setProperty("--fill-duration", FILL_MS + "ms");
  overlay.style.setProperty("--text-duration", TEXT_MS + "ms");
  overlay.style.setProperty("--leave-duration", LEAVE_MS + "ms");

  requestAnimationFrame(function () {
    overlay.classList.add("intro-draw-run"); // §1 : tracé du contour
  });

  setTimeout(function () {
    overlay.classList.add("intro-fill-run"); // §2 : remplissage progressif (balayage)
  }, DRAW_MS);

  setTimeout(function () {
    overlay.classList.add("intro-text-run"); // §3 : mot + sous-titre
  }, DRAW_MS + FILL_MS);

  setTimeout(function () {
    // Position/échelle exactes vers le logo réel du header, mesurées en direct.
    var target = realLogoRect();
    var fr = mark.getBoundingClientRect();
    if (target && fr.width && target.width) {
      var fcx = fr.left + fr.width / 2;
      var fcy = fr.top + fr.height / 2;
      var tcx = target.left + target.width / 2;
      var tcy = target.top + target.height / 2;
      var scale = Math.max(0.08, target.height / fr.height);
      mark.style.setProperty("--ix", (tcx - fcx).toFixed(1) + "px");
      mark.style.setProperty("--iy", (tcy - fcy).toFixed(1) + "px");
      mark.style.setProperty("--is", scale.toFixed(3));
    }
    overlay.classList.add("intro-leave"); // §4 : déplacement + réduction + fondu
    page.classList.add("reveal");          // §5 : apparition du reste de la page
  }, DRAW_MS + FILL_MS + TEXT_MS + HOLD_MS);

  overlay.addEventListener("animationend", function (e) {
    if (e.target === overlay) {
      clearTimeout(safety);
      finish();
    }
  });

  // Sécurité supplémentaire : si l'onglet est masqué pendant l'animation
  // (changement d'onglet), on termine proprement dès le retour plutôt que
  // de laisser une animation à moitié jouée.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      clearTimeout(safety);
      finish();
    }
  });
})();
