/**
 * Configuration AppTitle
 * Permet de personnaliser le comportement du composant AppTitle
 */

export const appTitleConfig = {
  // Afficher/masquer le composant AppTitle
  enabled: true,

  // Afficher les boutons de contrôle
  showControls: true,

  // Configuration du bouton retour
  back: {
    enabled: true,
    // Options: 'history' (browser history) | 'navigate' (React Router)
    type: 'history',
    fallbackPath: '/dashboard', // Fallback si pas d'historique
  },

  // Configuration du bouton actualiser
  refresh: {
    enabled: true,
    // Options: 'reload' (window.location.reload) | 'custom' (callback personnalisé)
    type: 'reload',
  },

  // Styling
  styling: {
    // Hauteur de la barre
    height: '56px', // desktop
    heightMobile: '48px', // mobile
    // Couleurs
    backgroundColor: 'linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%)',
    borderColor: '#e0e0e0',
    buttonColor: '#606060',
    buttonHoverColor: '#212121',
    buttonHoverBg: '#e8e8e8',
  },

  // Comportement
  behavior: {
    // Sticky au top?
    sticky: true,
    // Z-index
    zIndex: 100,
    // Afficher une ombre?
    shadow: true,
    // Position (top | bottom)
    position: 'top',
  },

  // Animations
  animations: {
    // Durée des transitions
    transitionDuration: '200ms',
    // Rotation du bouton refresh au survol?
    rotateRefreshOnHover: true,
    rotationDegree: 180,
  },

  // Callbacks personnalisés
  callbacks: {
    // Appelé avant le retour
    beforeBack: null, // function() { ... }
    // Appelé après le retour
    afterBack: null, // function() { ... }
    // Appelé avant l'actualisation
    beforeRefresh: null, // function() { ... }
    // Appelé après l'actualisation
    afterRefresh: null, // function() { ... }
  },

  // Responsive
  responsive: {
    // Breakpoint mobile (px)
    mobileBreakpoint: 768,
    // Afficher sur mobile?
    showOnMobile: true,
    // Afficher sur tablette?
    showOnTablet: true,
    // Afficher sur desktop?
    showOnDesktop: true,
  },

  // Accessibilité
  accessibility: {
    // ARIA labels
    backButtonLabel: 'Retour',
    refreshButtonLabel: 'Actualiser',
    // Focus visible?
    focusVisible: true,
  },

  // Debug
  debug: false, // Afficher les logs de debug
};

/**
 * Surcharger la configuration
 * @param {object} customConfig - Configuration personnalisée
 * @returns {object} Configuration fusionnée
 */
export const mergeConfig = (customConfig = {}) => {
  return {
    ...appTitleConfig,
    styling: { ...appTitleConfig.styling, ...customConfig.styling },
    behavior: { ...appTitleConfig.behavior, ...customConfig.behavior },
    animations: { ...appTitleConfig.animations, ...customConfig.animations },
    callbacks: { ...appTitleConfig.callbacks, ...customConfig.callbacks },
    responsive: { ...appTitleConfig.responsive, ...customConfig.responsive },
    accessibility: { ...appTitleConfig.accessibility, ...customConfig.accessibility },
    ...customConfig,
  };
};

export default appTitleConfig;

