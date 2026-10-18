// Affiche le contenu de projets.js. Normalement, tu n'as pas besoin de modifier ce fichier.

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
  const noms = { site: "Voir le site", github: "GitHub", modrinth: "Modrinth", spigot: "SpigotMC", hangar: "Hangar", sketchfab: "Sketchfab", video: "Vidéo" };
  const items = Object.entries(obj || {}).filter(([, url]) => url);
  if (!items.length) return null;
  return el("div", { class: "links" }, items.map(([cle, url]) =>
    el("a", { href: url, target: "_blank", rel: "noopener", text: noms[cle] || cle })));
}

// Textures Blockbench : on garde les pixels nets au lieu de les flouter.
function pixelsNets(viewer) {
  viewer.addEventListener("load", () => {
    for (const mat of viewer.model?.materials || []) {
      const tex = mat.pbrMetallicRoughness.baseColorTexture?.texture;
      if (tex?.sampler) {
        tex.sampler.setMagFilter(9728); // NEAREST
        tex.sampler.setMinFilter(9728);
      }
    }
  });
}

function carteModele(m) {
  let apercu;
  if (m.fichier) {
    apercu = el("model-viewer", {
      class: "viewer", src: m.fichier, alt: m.titre,
      "camera-controls": "", "auto-rotate": "", "interaction-prompt": "none",
      "shadow-intensity": "0.6", loading: "lazy",
      ...(m.animation ? { autoplay: "", "animation-name": m.animation } : {}),
    });
    pixelsNets(apercu);
  } else if (m.image) {
    apercu = el("div", { class: "viewer" }, [el("img", { src: m.image, alt: m.titre, loading: "lazy" })]);
  } else {
    apercu = el("div", { class: "viewer viewer-empty", text: "Aperçu à venir" });
  }
  return el("article", { class: "card" }, [
    apercu,
    el("div", { class: "card-body" }, [
      el("h3", { text: m.titre }),
      el("p", { text: m.description }),
      tags(m.tags),
      m.infos ? el("div", { class: "meta", text: m.infos }) : null,
      liens(m.liens),
    ]),
  ]);
}

function cartePlugin(p) {
  return el("article", { class: "card" }, [
    el("div", { class: "card-body" }, [
      el("div", { class: "plugin-top" }, [
        el("h3", { text: p.nom }),
        p.version ? el("span", { class: "plugin-version", text: p.version }) : null,
      ]),
      el("p", { text: p.description }),
      tags(p.tags),
      p.telechargements ? el("div", { class: "meta", text: p.telechargements + " téléchargements" }) : null,
      liens(p.liens),
    ]),
  ]);
}

function carteSite(s) {
  const apercu = s.image
    ? el("div", { class: "viewer" }, [el("img", { class: "capture", src: s.image, alt: s.titre, loading: "lazy" })])
    : el("div", { class: "viewer viewer-empty", text: "Aperçu à venir" });
  return el("article", { class: "card" }, [
    apercu,
    el("div", { class: "card-body" }, [
      el("h3", { text: s.titre }),
      el("p", { text: s.description }),
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
  else zone.append(el("p", { class: "empty", text: vide }));
}

// ---------- Catégories des modèles (arbre éditable dans l'admin) ----------
// DATA.categories = [{ id, nom, enfants: [...] }] ; chaque modèle a un champ "categorie" : l'id d'un nœud, ou une liste
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
      rangee.append(puce(p ? "Tout" : "Tous les modèles", modelesDe(parent).length, !choisi, () => {
        selection = selection.slice(0, p); rendreModeles();
      }));
      for (const c of visibles) {
        rangee.append(puce(c.nom, modelesDe(c.id).length, choisi === c.id, () => {
          selection = [...selection.slice(0, p), c.id]; rendreModeles();
        }));
      }
      if (!p && modelesDe(AUTRES).length) {
        rangee.append(puce("Autres", modelesDe(AUTRES).length, choisi === AUTRES, () => { selection = [AUTRES]; rendreModeles(); }));
      }
      filtres.append(rangee);
      const c = niveau.find(x => x.id === choisi);
      if (!c) break;
      niveau = c.enfants; profondeur++;
    }
  }
  const items = modelesDe(selection[selection.length - 1]);
  if (items.length) zone.append(...items.map(carteModele));
  else zone.append(el("p", { class: "empty", text: "Les premiers modèles arrivent bientôt." }));
}

const profil = DATA.profil || {};
document.getElementById("intro").textContent = profil.intro || "";
document.getElementById("contact-texte").textContent = profil.contact || "";
rendreModeles();
remplir("liste-plugins", DATA.plugins || [], cartePlugin, "Les premiers plugins arrivent bientôt.");
remplir("liste-sites", DATA.sites || [], carteSite, "Les premiers sites arrivent bientôt.");
document.getElementById("liste-contact").append(...contact(profil));
document.getElementById("annee").textContent = new Date().getFullYear();
