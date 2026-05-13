import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { appTitleConfig } from '../config/appTitleConfig';
import './AppTitle.css';

/**
 * AppTitle Component
 * Barre de titre avec boutons retour et actualiser
 * Inspirée du design YouTube PWA
 */
const AppTitle = ({
  showControls = appTitleConfig.showControls,
  onBack = null,
  onRefresh = null,
  config = appTitleConfig
}) => {
  const navigate = useNavigate();

  // Ne pas afficher si désactivé
  if (!config.enabled) {
    return null;
  }

  const handleBack = () => {
    // Callback avant
    if (config.callbacks?.beforeBack) {
      config.callbacks.beforeBack();
    }

    if (onBack) {
      onBack();
    } else if (config.back.enabled) {
      // Essayer d'aller en arrière dans l'historique
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // Fallback vers le chemin configuré
        navigate(config.back.fallbackPath);
      }
    }

    // Callback après
    if (config.callbacks?.afterBack) {
      config.callbacks.afterBack();
    }

    // Debug
    if (config.debug) {
      console.log('[AppTitle] Back clicked');
    }
  };

  const handleRefresh = () => {
    // Callback avant
    if (config.callbacks?.beforeRefresh) {
      config.callbacks.beforeRefresh();
    }

    if (onRefresh) {
      onRefresh();
    } else if (config.refresh.enabled) {
      // Rafraîchir la page
      window.location.reload();
    }

    // Callback après
    if (config.callbacks?.afterRefresh) {
      config.callbacks.afterRefresh();
    }

    // Debug
    if (config.debug) {
      console.log('[AppTitle] Refresh clicked');
    }
  };

  return (
    <div className="app-title-bar">
      {showControls && (
        <div className="title-controls">
          {config.back.enabled && (
            <button
              className="title-btn back-btn"
              onClick={handleBack}
              title={config.accessibility.backButtonLabel}
              aria-label={config.accessibility.backButtonLabel}
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {config.refresh.enabled && (
            <button
              className="title-btn refresh-btn"
              onClick={handleRefresh}
              title={config.accessibility.refreshButtonLabel}
              aria-label={config.accessibility.refreshButtonLabel}
            >
              <RotateCcw size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AppTitle;


