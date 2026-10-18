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

const profil = DATA.profil || {};
document.getElementById("intro").textContent = profil.intro || "";
document.getElementById("contact-texte").textContent = profil.contact || "";
remplir("liste-modeles", DATA.modeles || [], carteModele, "Les premiers modèles arrivent bientôt.");
remplir("liste-plugins", DATA.plugins || [], cartePlugin, "Les premiers plugins arrivent bientôt.");
remplir("liste-sites", DATA.sites || [], carteSite, "Les premiers sites arrivent bientôt.");
document.getElementById("liste-contact").append(...contact(profil));
document.getElementById("annee").textContent = new Date().getFullYear();
