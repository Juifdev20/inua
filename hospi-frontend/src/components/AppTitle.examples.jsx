/**
 * Exemples d'utilisation avancée du composant AppTitle
 * Cas d'usage courants avec solutions prêtes à l'emploi
 */

import AppTitle from './AppTitle';
import { appTitleConfig, mergeConfig } from '../config/appTitleConfig';
import toast from 'react-hot-toast'; // ou votre système de notification

// ============================================
// EXEMPLE 1: Désactiver sur certaines pages
// ============================================
export const ExampleDisableOnPages = () => {
  const shouldShow = !['/login', '/register', '/'].includes(window.location.pathname);

  return (
    <AppTitle
      config={{ ...appTitleConfig, enabled: shouldShow }}
    />
  );
};

// ============================================
// EXEMPLE 2: Afficher notification lors actualisation
// ============================================
export const ExampleWithNotification = () => {
  const handleRefresh = () => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          window.location.reload();
          resolve();
        }, 500);
      }),
      {
        loading: '⏳ Actualisation en cours...',
        success: '✅ Page actualisée!',
        error: '❌ Erreur lors de l\'actualisation'
      }
    );
  };

  return (
    <AppTitle
      onRefresh={handleRefresh}
    />
  );
};

// ============================================
// EXEMPLE 3: Confirmer avant retour
// ============================================
export const ExampleConfirmBeforeBack = () => {
  const handleBack = () => {
    if (window.confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr?')) {
      window.history.back();
    }
  };

  return (
    <AppTitle
      onBack={handleBack}
    />
  );
};

// ============================================
// EXEMPLE 4: Sauvegarder avant retour
// ============================================
export const ExampleSaveBeforeBack = async () => {
  const handleBack = async () => {
    try {
      // Votre logique de sauvegarde
      await saveFormData();
      toast.success('✅ Données sauvegardées');
      window.history.back();
    } catch (error) {
      toast.error('❌ Erreur lors de la sauvegarde');
    }
  };

  return (
    <AppTitle
      onBack={handleBack}
    />
  );
};

// ============================================
// EXEMPLE 5: Configuration personnalisée globale
// ============================================
export const ExampleCustomConfig = () => {
  const customConfig = mergeConfig({
    animations: {
      transitionDuration: '300ms',
      rotateRefreshOnHover: true,
      rotationDegree: 360, // Rotation complète
    },
    styling: {
      buttonColor: '#007AFF', // Bleu Apple
      buttonHoverBg: '#E8E8FF',
    },
    accessibility: {
      backButtonLabel: 'Page précédente',
      refreshButtonLabel: 'Recharger',
    },
  });

  return (
    <AppTitle
      config={customConfig}
    />
  );
};

// ============================================
// EXEMPLE 6: Intégration avec Redux/Context
// ============================================
export const ExampleWithContext = () => {
  // Supposons que vous avez un Context pour les données
  // const { hasUnsavedChanges, saveData } = useDataContext();

  const handleBack = async () => {
    // if (hasUnsavedChanges) {
    //   await saveData();
    // }
    window.history.back();
  };

  return (
    <AppTitle
      onBack={handleBack}
    />
  );
};

// ============================================
// EXEMPLE 7: Logger les actions (Analytics)
// ============================================
export const ExampleWithAnalytics = () => {
  const config = mergeConfig({
    callbacks: {
      beforeBack: () => {
        // Envoyer event analytics
        console.log('Event: User clicked back button');
        // analytics.track('button_back_clicked');
      },
      beforeRefresh: () => {
        // Envoyer event analytics
        console.log('Event: User clicked refresh button');
        // analytics.track('button_refresh_clicked');
      },
    },
    debug: true,
  });

  return (
    <AppTitle
      config={config}
    />
  );
};

// ============================================
// EXEMPLE 8: Mode développement (debug)
// ============================================
export const ExampleDebugMode = () => {
  const config = mergeConfig({
    debug: true,
    callbacks: {
      beforeBack: () => console.log('[DEBUG] Before back'),
      afterBack: () => console.log('[DEBUG] After back'),
      beforeRefresh: () => console.log('[DEBUG] Before refresh'),
      afterRefresh: () => console.log('[DEBUG] After refresh'),
    },
  });

  return (
    <AppTitle
      config={config}
    />
  );
};

// ============================================
// EXEMPLE 9: Boutons désactivés conditionnellement
// ============================================
export const ExampleConditionalDisable = ({ canGoBack = true, canRefresh = true }) => {
  const config = mergeConfig({
    back: {
      enabled: canGoBack,
    },
    refresh: {
      enabled: canRefresh,
    },
  });

  return (
    <AppTitle
      config={config}
    />
  );
};

// ============================================
// EXEMPLE 10: Intégration complète (Production)
// ============================================
export const ExampleProduction = () => {
  const config = mergeConfig({
    enabled: true,
    showControls: true,

    back: {
      enabled: true,
      type: 'history',
      fallbackPath: '/dashboard',
    },

    refresh: {
      enabled: true,
      type: 'reload',
    },

    behavior: {
      sticky: true,
      zIndex: 100,
      shadow: true,
      position: 'top',
    },

    animations: {
      transitionDuration: '200ms',
      rotateRefreshOnHover: true,
      rotationDegree: 180,
    },

    responsive: {
      mobileBreakpoint: 768,
      showOnMobile: true,
      showOnTablet: true,
      showOnDesktop: true,
    },

    accessibility: {
      backButtonLabel: 'Retour',
      refreshButtonLabel: 'Actualiser',
      focusVisible: true,
    },

    callbacks: {
      beforeBack: () => {
        // Analytics
        // gtag('event', 'back_button_click');
      },
      beforeRefresh: () => {
        // Afficher loader
        // setLoading(true);
      },
      afterRefresh: () => {
        // Masquer loader
        // setLoading(false);
      },
    },

    debug: process.env.NODE_ENV === 'development',
  });

  return (
    <AppTitle
      config={config}
    />
  );
};

// ============================================
// EXPORTATIONS
// ============================================
export const examples = {
  'Désactiver sur pages': ExampleDisableOnPages,
  'Avec notification': ExampleWithNotification,
  'Confirmer avant retour': ExampleConfirmBeforeBack,
  'Sauvegarder avant retour': ExampleSaveBeforeBack,
  'Configuration personnalisée': ExampleCustomConfig,
  'Avec Context': ExampleWithContext,
  'Avec Analytics': ExampleWithAnalytics,
  'Mode Debug': ExampleDebugMode,
  'Désactivation conditionnelle': ExampleConditionalDisable,
  'Production': ExampleProduction,
};

export default examples;

