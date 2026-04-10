import React, { useState, useEffect } from 'react';
import { RotateCcw, Minus, Square, X, Home, RefreshCw } from 'lucide-react';

/**
 * Barre de contrôle de fenêtre - Style PWA Desktop
 * 
 * Affiche les boutons de contrôle uniquement sur desktop en mode PWA
 * Caché automatiquement sur mobile/tablette et en mode navigateur
 */
const WindowControls = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détecter si l'app est en mode standalone (PWA installée)
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
      setIsStandalone(standalone);
    };

    // Détecter si c'est un desktop (écran large)
    const checkDesktop = () => {
      const isLargeScreen = window.innerWidth >= 1024; // lg breakpoint
      setIsDesktop(isLargeScreen);
    };

    checkStandalone();
    checkDesktop();

    // Écouter les changements de taille
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleMinimize = () => {
    if (window.outerWidth > 800) {
      window.resizeTo(800, 600);
    }
  };

  const handleMaximize = () => {
    if (window.outerWidth < screen.availWidth) {
      window.moveTo(0, 0);
      window.resizeTo(screen.availWidth, screen.availHeight);
    }
  };

  const handleClose = () => {
    window.close();
  };

  // Ne pas afficher si pas en mode standalone ou pas sur desktop
  if (!isStandalone || !isDesktop) {
    return null;
  }

  return (
    <>
      {/* Espace réservé pour pousser le contenu vers le bas */}
      <div className="h-9" />
      
      {/* Barre de titre fixe */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 h-9 flex items-center justify-between px-2 select-none">
        {/* Section gauche - Logo et titre */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <span className="text-slate-300 text-xs font-medium truncate">
            Inua Afya - Système de Gestion Hospitalier
          </span>
        </div>

        {/* Section centre - Boutons de navigation */}
        <div className="flex items-center gap-1 px-4">
          <button
            onClick={handleGoHome}
            className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            title="Accueil"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            title="Actualiser (F5)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.history.back()}
            className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            title="Retour"
          >
            <RotateCcw className="w-3.5 h-3.5 -rotate-90" />
          </button>
        </div>

        {/* Section droite - Boutons de fenêtre Windows */}
        <div className="flex items-center">
          <button
            onClick={handleMinimize}
            className="p-2 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            title="Réduire"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="p-2 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            title="Agrandir"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-red-500/90 text-slate-400 hover:text-white transition-colors"
            title="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default WindowControls;
