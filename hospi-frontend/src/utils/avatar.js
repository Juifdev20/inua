// Avatar local (initiales sur fond coloré) — remplace ui-avatars.com.
// Génère un data-URI SVG : aucune requête externe → fonctionne hors-ligne,
// en PWA et derrière un proxy d'entreprise (évite les erreurs 407).
export const initialsAvatar = (first = '', last = '', bg = '10b981', color = 'fff') => {
  const a = (first || '').trim().charAt(0);
  const b = (last || '').trim().charAt(0);
  const initials = (a + b).toUpperCase() || 'U';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" rx="64" fill="#${bg}"/>` +
    `<text x="64" y="64" dy="0.35em" text-anchor="middle" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="600" fill="#${color}">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export default initialsAvatar;
