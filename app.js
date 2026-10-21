// Affiche le contenu de projets.js. Normalement, tu n'as pas besoin de modifier ce fichier.

// ---------- Langue (FR / EN) ----------
// Un texte de projets.js peut être une simple chaîne, ou { "fr": "...", "en": "..." }.

const UI = {
  fr: {
    "nav.sites": "Sites web", "nav.contact": "Contact",
    "hero.kicker": "Minecraft · Sites web", "hero.contact": "Me contacter", "hero.voir": "Voir mes créations",
    "mc.desc": "Modèles 3D et plugins pour serveurs Minecraft.",
    "modeles.titre": "Modèles 3D", "modeles.desc": "Tourne autour des modèles à la souris ou au doigt.",
    "sites.desc": "Sites et projets web que j'ai réalisés.",
    "footer": "Non affilié à Mojang ou Microsoft.",
    "apercu": "Aperçu à venir", "telechargements": "téléchargements",
    "lien.site": "Voir le site", "lien.video": "Vidéo",
    "tous": "Tous les modèles", "tout": "Tout", "autres": "Autres",
    "vide.modeles": "Les premiers modèles arrivent bientôt.",
    "vide.plugins": "Les premiers plugins arrivent bientôt.",
    "vide.sites": "Les premiers sites arrivent bientôt.",
    "bouton": "EN", "bouton.aide": "Switch to English",
    "plus": "Afficher plus", "theme.sombre": "Mode sombre", "theme.clair": "Mode clair",
    "plein": "Plein écran", "fermer": "Fermer", "animations": "Animations", "sans-anim": "Ce modèle n'a pas d'animation.",
  },
  en: {
    "nav.sites": "Websites", "nav.contact": "Contact",
    "hero.kicker": "Minecraft · Websites", "hero.contact": "Contact me", "hero.voir": "See my work",
    "mc.desc": "3D models and plugins for Minecraft servers.",
    "modeles.titre": "3D models", "modeles.desc": "Drag with your mouse or finger to turn the models around.",
    "sites.desc": "Websites and web projects I've built.",
    "footer": "Not affiliated with Mojang or Microsoft.",
    "apercu": "Preview coming soon", "telechargements": "downloads",
    "lien.site": "Visit site", "lien.video": "Video",
    "tous": "All models", "tout": "All", "autres": "Other",
    "vide.modeles": "The first models are coming soon.",
    "vide.plugins": "The first plugins are coming soon.",
    "vide.sites": "The first websites are coming soon.",
    "bouton": "FR", "bouton.aide": "Passer en français",
    "plus": "Show more", "theme.sombre": "Dark mode", "theme.clair": "Light mode",
    "plein": "Full screen", "fermer": "Close", "animations": "Animations", "sans-anim": "This model has no animation.",
  },
};

function langueInitiale() {
  try {
    const l = localStorage.getItem("langue");
    if (l === "fr" || l === "en") return l;
  } catch {}
  return (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
}

let langue = langueInitiale();
const ui = cle => UI[langue][cle] ?? UI.fr[cle] ?? cle;
const tr = v => (v && typeof v === "object") ? (v[langue] || v.fr || v.en || "") : (v || "");

// Nœuds dont le texte dépend de la langue : mis à jour sans reconstruire les cartes (ni recharger les modèles 3D).
const traduits = [];
function txt(node, valeur) {
  traduits.push([node, valeur]);
  node.textContent = typeof valeur === "function" ? valeur() : tr(valeur);
  return node;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) if (child) node.appendChild(child);
  return node;
}

function tags(list) {
  if (!list || !list.length) return null;
  return el("div", { class: "tags" }, list.map(t => el("span", { class: "tag", text: t })));
}

function liens(obj) {
  const noms = { github: "GitHub", modrinth: "Modrinth", spigot: "SpigotMC", hangar: "Hangar", sketchfab: "Sketchfab" };
  const traduisibles = { site: "lien.site", video: "lien.video" };
  const items = Object.entries(obj || {}).filter(([, url]) => url);
  if (!items.length) return null;
  return el("div", { class: "links" }, items.map(([cle, url]) => {
    const a = el("a", { href: url, target: "_blank", rel: "noopener" });
    return traduisibles[cle] ? txt(a, () => ui(traduisibles[cle])) : txt(a, noms[cle] || cle);
  }));
}

// Textures Blockbench : on garde les pixels nets au lieu de les flouter.
function pixelsNets(viewer) {
  viewer.addEventListener("load", async () => {
    for (const mat of viewer.model?.materials || []) {
      try {
        // model-viewer charge certains matériaux à la demande
        if (!mat.isLoaded) await mat.ensureLoaded();
        const tex = mat.pbrMetallicRoughness.baseColorTexture?.texture;
        if (tex?.sampler) {
          tex.sampler.setMagFilter(9728); // NEAREST
          tex.sampler.setMinFilter(9728);
        }
      } catch {
        // matériau sans texture : rien à faire
      }
    }
  });
}

// Hitbox ModelEngine : les .glb exportés de Blockbench gardent le cube « hitbox » (invisible dans Blockbench, mais affiché
// par model-viewer). On masque au chargement tout objet nommé « hitbox » : plus besoin de la retirer du fichier.
function masquerHitbox(viewer) {
  viewer.addEventListener("load", () => {
    const sym = Object.getOwnPropertySymbols(viewer).find(s => s.description === "scene");
    const scene = sym && viewer[sym];
    if (!scene?.traverse) return;
    let trouve = false;
    scene.traverse(o => {
      if (/^hitbox/i.test(o.name || "")) { o.visible = false; trouve = true; }
    });
    if (trouve) scene.queueRender?.();
  });
}

// ---------- Plein écran : un modèle en grand, avec le choix de l'animation ----------

const pleinEcran = document.getElementById("plein-ecran");
let modeleOuvert = null;

function ouvrirPleinEcran(m) {
  modeleOuvert = m;
  const zone = document.getElementById("pe-3d");
  zone.innerHTML = "";
  const mv = el("model-viewer", {
    src: m.fichier, alt: tr(m.titre),
    "camera-controls": "", "interaction-prompt": "none",
    "camera-orbit": "180deg 75deg auto",
    "shadow-intensity": "0.6",
    ...(m.animation ? { autoplay: "", "animation-name": m.animation } : {}),
  });
  pixelsNets(mv);
  masquerHitbox(mv);
  mv.addEventListener("load", () => rendreAnimations(mv));
  zone.append(mv);
  rendreAnimations(null);
  majPleinEcran();
  pleinEcran.showModal();
}

function rendreAnimations(mv) {
  const zone = document.getElementById("pe-animations");
  zone.innerHTML = "";
  if (!mv) return;   // en attendant le chargement du modèle
  const noms = mv.availableAnimations || [];
  if (!noms.length) {
    zone.append(txt(el("p", { class: "pe-vide" }), () => ui("sans-anim")));
    return;
  }
  const actuelle = mv.animationName || (mv.autoplay ? noms[0] : "");
  for (const nom of noms) {
    const b = el("button", { type: "button", class: "chip" + (nom === actuelle ? " active" : ""), text: nom });
    b.addEventListener("click", () => {
      mv.animationName = nom;
      mv.currentTime = 0;
      mv.play();
      for (const x of zone.children) x.classList.toggle("active", x === b);
    });
    zone.append(b);
  }
}

function majPleinEcran() {
  const m = modeleOuvert;
  document.getElementById("pe-fermer").setAttribute("aria-label", ui("fermer"));
  document.getElementById("pe-fermer").title = ui("fermer");
  document.getElementById("pe-titre-anim").textContent = ui("animations");
  if (!m) return;
  document.getElementById("pe-titre").textContent = tr(m.titre);
  document.getElementById("pe-desc").textContent = tr(m.description);
  const extra = document.getElementById("pe-extra");
  extra.innerHTML = "";
  for (const n of [tags(m.tags), liens(m.liens)]) if (n) extra.append(n);
}

pleinEcran.addEventListener("close", () => {
  // décharge le modèle : rien ne tourne en arrière-plan
  document.getElementById("pe-3d").innerHTML = "";
  modeleOuvert = null;
});
document.getElementById("pe-fermer").addEventListener("click", () => pleinEcran.close());

function carteModele(m) {
  let apercu;
  if (m.fichier) {
    apercu = el("model-viewer", {
      class: "viewer", src: m.fichier, alt: tr(m.titre),
      "camera-controls": "", "auto-rotate": "", "interaction-prompt": "none",
      // Les modèles Blockbench regardent vers -Z : on place la caméra en face d'eux.
      "camera-orbit": "180deg 75deg auto",
      "shadow-intensity": "0.6", loading: "lazy",
      ...(m.animation ? { autoplay: "", "animation-name": m.animation } : {}),
    });
    pixelsNets(apercu);
    masquerHitbox(apercu);
    const bouton = el("button", { type: "button", class: "btn-plein" }, [el("span", { "aria-hidden": "true", text: "⛶" })]);
    bouton.dataset.libelle = "plein";
    bouton.setAttribute("aria-label", ui("plein"));
    bouton.title = ui("plein");
    bouton.addEventListener("click", e => { e.stopPropagation(); ouvrirPleinEcran(m); });
    apercu.append(bouton);
  } else if (m.image) {
    apercu = el("div", { class: "viewer" }, [el("img", { src: m.image, alt: tr(m.titre), loading: "lazy" })]);
  } else {
    apercu = txt(el("div", { class: "viewer viewer-empty" }), () => ui("apercu"));
  }
  return el("article", { class: "card" }, [
    apercu,
    el("div", { class: "card-body" }, [
      txt(el("h3"), m.titre),
      txt(el("p"), m.description),
      tags(m.tags),
      m.infos ? txt(el("div", { class: "meta" }), m.infos) : null,
      liens(m.liens),
    ]),
  ]);
}

function cartePlugin(p) {
  return el("article", { class: "card" }, [
    el("div", { class: "card-body" }, [
      el("div", { class: "plugin-top" }, [
        txt(el("h3"), p.nom),
        p.version ? el("span", { class: "plugin-version", text: p.version }) : null,
      ]),
      txt(el("p"), p.description),
      tags(p.tags),
      p.telechargements ? txt(el("div", { class: "meta" }), () => p.telechargements + " " + ui("telechargements")) : null,
      liens(p.liens),
    ]),
  ]);
}

function carteSite(s) {
  const apercu = s.image
    ? el("div", { class: "viewer" }, [el("img", { class: "capture", src: s.image, alt: tr(s.titre), loading: "lazy" })])
    : txt(el("div", { class: "viewer viewer-empty" }), () => ui("apercu"));
  return el("article", { class: "card" }, [
    apercu,
    el("div", { class: "card-body" }, [
      txt(el("h3"), s.titre),
      txt(el("p"), s.description),
      tags(s.tags),
      liens(s.liens),
    ]),
  ]);
}

function contact(c) {
  const items = [];
  if (c.discord) items.push(el("div", { class: "contact-item" }, [el("span", { text: "Discord" }), el("span", { text: c.discord })]));
  for (const [nom, url] of Object.entries(c.liens || {})) {
    if (!url) continue;
    items.push(el("a", { class: "contact-item", href: url, target: "_blank", rel: "noopener" }, [
      el("span", { text: nom }), el("span", { text: url.replace(/^https?:\/\/(www\.)?/, "") }),
    ]));
  }
  return items;
}

function remplir(id, items, carte, vide) {
  const zone = document.getElementById(id);
  if (items.length) zone.append(...items.map(carte));
  else zone.append(txt(el("p", { class: "empty" }), () => ui(vide)));
}

// ---------- Catégories des modèles (arbre éditable dans l'admin) ----------
// DATA.categories = [{ id, nom, enfants: [...] }] (nom : texte ou { fr, en }) ; chaque modèle a un champ "categorie" : l'id d'un nœud, ou une liste
// d'ids quand le modèle est rangé dans plusieurs catégories à la fois.

function catsDe(m) {
  return Array.isArray(m.categorie) ? m.categorie : (m.categorie ? [m.categorie] : []);
}

function noeuds(arbre, parents = []) {
  // liste à plat : { cat, chemin: [ids depuis la racine] }
  return (arbre || []).flatMap(c => [{ cat: c, chemin: [...parents, c.id] }, ...noeuds(c.enfants, [...parents, c.id])]);
}

const AUTRES = "__autres";
let selection = [];   // ids du chemin choisi (vide = tout)
const PAR_PAGE = 12;
let affiches = PAR_PAGE;  // nombre de modèles montrés ; « Afficher plus » en ajoute

function modelesDe(id) {
  const tous = DATA.modeles || [];
  if (!id) return tous;
  const liste = noeuds(DATA.categories);
  if (id === AUTRES) return tous.filter(m => !catsDe(m).some(c => liste.some(n => n.cat.id === c)));
  const ids = new Set(liste.filter(n => n.chemin.includes(id)).map(n => n.cat.id));
  return tous.filter(m => catsDe(m).some(c => ids.has(c)));
}

function puce(texte, nb, actif, onclick) {
  const b = el("button", { class: "chip" + (actif ? " active" : ""), type: "button" }, [
    el("span", { text: texte }), el("span", { class: "chip-nb", text: String(nb) }),
  ]);
  b.addEventListener("click", onclick);
  return b;
}

// Une carte par modèle, créée une seule fois : filtrer ou changer de langue ne recharge pas les modèles 3D.
const cartes = new Map();
function carteDe(m) {
  if (!cartes.has(m)) cartes.set(m, carteModele(m));
  return cartes.get(m);
}

function rendreModeles() {
  const zone = document.getElementById("liste-modeles");
  const filtres = document.getElementById("filtres-modeles");
  zone.innerHTML = "";
  filtres.innerHTML = "";
  const arbre = DATA.categories || [];
  if (arbre.length) {
    // une rangée de puces par niveau : racine, puis les enfants de chaque catégorie choisie
    let niveau = arbre, profondeur = 0;
    while (niveau && niveau.length) {
      const visibles = niveau.filter(c => modelesDe(c.id).length);
      if (!visibles.length) break;
      const p = profondeur;               // copie : les clics doivent garder le niveau de leur rangée
      const parent = selection[p - 1];
      const rangee = el("div", { class: "chips" + (p ? " chips-sub" : "") });
      const choisi = selection[p];
      rangee.append(puce(ui(p ? "tout" : "tous"), modelesDe(parent).length, !choisi, () => {
        selection = selection.slice(0, p); affiches = PAR_PAGE; rendreModeles();
      }));
      for (const c of visibles) {
        rangee.append(puce(tr(c.nom), modelesDe(c.id).length, choisi === c.id, () => {
          selection = [...selection.slice(0, p), c.id]; affiches = PAR_PAGE; rendreModeles();
        }));
      }
      if (!p && modelesDe(AUTRES).length) {
        rangee.append(puce(ui("autres"), modelesDe(AUTRES).length, choisi === AUTRES, () => { selection = [AUTRES]; affiches = PAR_PAGE; rendreModeles(); }));
      }
      filtres.append(rangee);
      const c = niveau.find(x => x.id === choisi);
      if (!c) break;
      niveau = c.enfants; profondeur++;
    }
  }
  const items = modelesDe(selection[selection.length - 1]);
  if (items.length) zone.append(...items.slice(0, affiches).map(carteDe));
  else zone.append(el("p", { class: "empty", text: ui("vide.modeles") }));
  const plus = document.getElementById("plus-modeles");
  plus.innerHTML = "";
  if (items.length > affiches) {
    const b = el("button", { class: "btn", type: "button", text: `${ui("plus")} (${items.length - affiches})` });
    b.addEventListener("click", () => { affiches += PAR_PAGE; rendreModeles(); });
    plus.append(b);
  }
}

function appliquerLangue() {
  document.documentElement.lang = langue;
  for (const n of document.querySelectorAll("[data-i18n]")) n.textContent = ui(n.dataset.i18n);
  for (const [node, valeur] of traduits) node.textContent = typeof valeur === "function" ? valeur() : tr(valeur);
  const bouton = document.getElementById("langue");
  bouton.textContent = ui("bouton");
  bouton.setAttribute("aria-label", ui("bouton.aide"));
  bouton.title = ui("bouton.aide");
  for (const b of document.querySelectorAll("[data-libelle]")) {
    b.setAttribute("aria-label", ui(b.dataset.libelle));
    b.title = ui(b.dataset.libelle);
  }
  rendreModeles();
  majPleinEcran();
  majBoutonTheme();
}

// ---------- Mode clair / sombre ----------
// Sans choix du visiteur, le site suit le réglage du système (voir style.css).

const systemeSombre = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
const themeActuel = () => document.documentElement.dataset.theme || (systemeSombre?.matches ? "dark" : "light");

function majBoutonTheme() {
  const sombre = themeActuel() === "dark";
  const b = document.getElementById("theme");
  b.textContent = sombre ? "☀" : "☾";
  const aide = ui(sombre ? "theme.clair" : "theme.sombre");
  b.setAttribute("aria-label", aide);
  b.title = aide;
}

document.getElementById("theme").addEventListener("click", () => {
  const nouveau = themeActuel() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nouveau;
  try { localStorage.setItem("theme", nouveau); } catch {}
  majBoutonTheme();
});
systemeSombre?.addEventListener?.("change", majBoutonTheme);

document.getElementById("langue").addEventListener("click", () => {
  langue = langue === "fr" ? "en" : "fr";
  try { localStorage.setItem("langue", langue); } catch {}
  appliquerLangue();
});

const profil = DATA.profil || {};
txt(document.getElementById("intro"), profil.intro);
txt(document.getElementById("contact-texte"), profil.contact);
remplir("liste-plugins", DATA.plugins || [], cartePlugin, "vide.plugins");
remplir("liste-sites", DATA.sites || [], carteSite, "vide.sites");
document.getElementById("liste-contact").append(...contact(profil));
document.getElementById("annee").textContent = new Date().getFullYear();
appliquerLangue();
