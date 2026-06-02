import { defaultHospitalConfig } from '../services/hospitalConfigService';

/**
 * Résout une URL de logo : si relative (/uploads/...), préfixe avec apiBaseUrl.
 */
export function resolveLogoUrl(logoUrl, apiBaseUrl) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('data:') || logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl;
  }
  return `${apiBaseUrl}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
}

/**
 * Génère le HTML de l'en-tête hospitalier pour les fenêtres d'impression.
 * @param {object} config  - Config issue de useHospitalConfig ou hospitalConfigService.getConfig()
 * @param {string} apiBaseUrl - ex: 'http://localhost:8080'
 * @param {string} documentTitle - Titre du document (ex: 'ORDONNANCE MÉDICALE')
 * @returns {string} HTML string
 */
export function buildHospitalPrintHeader(config, apiBaseUrl, documentTitle = '') {
  const cfg = config || defaultHospitalConfig;

  const primaryColor = cfg.primaryColor || '#059669';
  const hospitalName = cfg.hospitalName || 'HÔPITAL';
  const subtitle = cfg.headerSubtitle || '';
  const code = cfg.hospitalCode || '';

  const ministryLine = [cfg.ministryName, cfg.departmentName, cfg.zoneName, cfg.region]
    .filter(Boolean).join(' | ');

  const addressLine = [cfg.address, cfg.city, cfg.country]
    .filter(Boolean).join(', ');

  const contactLine = [
    cfg.phoneNumber ? `Tél: ${cfg.phoneNumber}` : null,
    cfg.email ? `Email: ${cfg.email}` : null,
    cfg.website ? `Web: ${cfg.website}` : null,
  ].filter(Boolean).join(' | ');

  const logoUrl = cfg.enableLogoOnDocuments !== false && cfg.hospitalLogoUrl
    ? resolveLogoUrl(cfg.hospitalLogoUrl, apiBaseUrl)
    : null;

  return `
    ${ministryLine ? `
    <div style="text-align:center;font-size:9px;color:#666;margin-bottom:6px;text-transform:uppercase;">
      ${ministryLine}
    </div>` : ''}

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
      <!-- Gauche : Logo + Nom -->
      <div style="flex:1;">
        ${logoUrl ? `
        <img src="${logoUrl}" alt="Logo"
          style="max-width:110px;max-height:90px;object-fit:contain;display:block;margin-bottom:6px;"
          onerror="this.style.display='none'" />` : ''}
        <div style="font-size:20px;font-weight:bold;color:${primaryColor};margin:0;">
          ${hospitalName}
        </div>
        ${subtitle ? `<div style="font-style:italic;color:#666;font-size:11px;margin:2px 0;">${subtitle}</div>` : ''}
        ${code ? `<div style="font-size:10px;color:#666;margin:1px 0;">Code: ${code}</div>` : ''}
        ${addressLine ? `<div style="font-size:10px;color:#555;margin:1px 0;">${addressLine}</div>` : ''}
        ${contactLine ? `<div style="font-size:10px;color:#555;margin:1px 0;">${contactLine}</div>` : ''}
      </div>
      <!-- Droite : Titre du document -->
      ${documentTitle ? `
      <div style="text-align:right;padding-left:20px;">
        <div style="font-size:28px;font-weight:bold;color:${primaryColor};line-height:1;">
          ${documentTitle}
        </div>
        <div style="font-size:11px;color:#666;margin-top:4px;">
          ${new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>` : ''}
    </div>

    <div style="height:3px;background:${primaryColor};margin:10px 0 16px 0;"></div>
  `;
}

/**
 * Ouvre une fenêtre d'impression avec en-tête hospitalier + contenu.
 * @param {object} options
 * @param {string}  options.title         - Titre de la fenêtre (onglet)
 * @param {string}  options.documentTitle - Titre affiché dans l'en-tête (ex: 'STOCK')
 * @param {string}  options.bodyContent   - HTML du corps du document
 * @param {string}  options.extraStyles   - CSS supplémentaire
 * @param {object}  options.config        - Config hospitalière
 * @param {string}  options.apiBaseUrl    - URL de base de l'API
 * @param {boolean} options.autoClose     - Fermer la fenêtre après impression (défaut: true)
 */
export async function openPrintWindow({ title, documentTitle, bodyContent, extraStyles = '', config, apiBaseUrl, autoClose = true }) {
  const header = buildHospitalPrintHeader(config, apiBaseUrl, documentTitle);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title || documentTitle || 'Impression'}</title>
  <style>
    @page { margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 0; padding: 0; }
    @media print { .no-print { display: none !important; } }
    ${extraStyles}
  </style>
</head>
<body>
  ${header}
  ${bodyContent}
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  await new Promise(resolve => setTimeout(resolve, 400));
  printWindow.print();
  if (autoClose) {
    printWindow.close();
  }
}

/**
 * Charge un logo via son URL absolue et retourne un data-URL base64 (pour jsPDF).
 * Résout d'abord les chemins relatifs en URL absolues.
 */
export async function loadLogoAsDataUrl(logoUrl, apiBaseUrl) {
  const absoluteUrl = resolveLogoUrl(logoUrl, apiBaseUrl);
  if (!absoluteUrl) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = absoluteUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Charge la config depuis le service (avec fallback sur les valeurs par défaut).
 */
export async function loadHospitalConfig() {
  try {
    const { default: hospitalConfigService } = await import('../services/hospitalConfigService');
    const config = await hospitalConfigService.getConfig();
    return config || defaultHospitalConfig;
  } catch {
    return defaultHospitalConfig;
  }
}
