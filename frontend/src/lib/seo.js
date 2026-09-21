// Met à jour le titre de l'onglet et la balise meta description pour la page
// actuelle. Utile pour le référencement : chaque page (accueil, catégories,
// fiche produit) doit avoir un titre/description propres, pas toujours le même.
export function setPageMeta(title, description) {
  if (title) {
    document.title = title;
  }
  if (description) {
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', description);
  }
}