/**
 * ★ PWA Detection Utility
 * Détecte si l'application est en mode PWA et sur quel type d'appareil
 *
 * Distinction importante:
 * - Desktop PWA: Application installée sur un ordinateur (Windows, macOS, Linux)
 * - Mobile PWA: Application installée sur un mobile ou tablette
 */

/**
 * Vérifie si l'app est en mode PWA installée (standalone)
 * @returns {boolean} true si l'app est en mode standalone
 */
export const isStandalonePWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

/**
 * Vérifie si l'appareil est un mobile ou une tablette
 * @returns {boolean} true si l'appareil est mobile/tablette
 */
export const isMobileDevice = () => {
  // Vérifier la taille de l'écran (critère principal)
  const isMobileScreen = window.innerWidth <= 768;

  // Vérifier le user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

  // Vérifier la propriété touch
  const hasTouchScreen = () => {
    return (
      (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
      (typeof navigator !== 'undefined' && navigator.msMaxTouchPoints > 0)
    );
  };

  // Si l'écran est petit ET que c'est un appareil tactile OU UserAgent mobile
  return isMobileScreen || (hasTouchScreen() && isMobileUA);
};

/**
 * Détecte spécifiquement si c'est un Desktop PWA
 * Cette détection est CRITIQUE pour afficher les boutons de navigation UNIQUEMENT sur desktop
 * @returns {boolean} true si c'est une PWA installée sur un ordinateur
 */
export const isDesktopPWA = () => {
  // Doit être en mode standalone
  const isStandalone = isStandalonePWA();

  // Et NOT être sur un mobile/tablette
  const isNotMobile = !isMobileDevice();

  // Vérification supplémentaire: taille d'écran minimale desktop
  const isLargeScreen = window.innerWidth >= 1024;

  // Console log pour debug (à retirer en production si nécessaire)
  // console.log('🔍 PWA Detection:', {
  //   isStandalone,
  //   isNotMobile,
  //   isLargeScreen,
  //   screenWidth: window.innerWidth,
  //   screenHeight: window.innerHeight
  // });

  return isStandalone && isNotMobile && isLargeScreen;
};

/**
 * Détecte si c'est une Mobile PWA (installée sur mobile/tablette)
 * @returns {boolean} true si c'est une PWA installée sur mobile/tablette
 */
export const isMobilePWA = () => {
  return isStandalonePWA() && isMobileDevice();
};

export default {
  isStandalonePWA,
  isMobileDevice,
  isDesktopPWA,
  isMobilePWA
};

