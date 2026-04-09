import React, { useState, useEffect } from 'react';
import SplashScreen from './SplashScreen';
import { HeartPulse } from 'lucide-react';

/**
 * AppLauncher - Gère l'affichage du Splash Screen au démarrage de l'application
 * Affiche le logo Inua Afya avec animation de chargement style Facebook
 */
const AppLauncher = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Vérifier si on doit afficher le splash (par exemple, une fois par session)
    const hasSeenSplash = sessionStorage.getItem('inua-afya-splash-shown');
    
    if (hasSeenSplash) {
      // Si déjà vu, passer directement au contenu
      setIsLoading(false);
      setShowContent(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('inua-afya-splash-shown', 'true');
    setIsLoading(false);
    
    // Petit délai pour permettre la transition
    setTimeout(() => {
      setShowContent(true);
    }, 100);
  };

  return (
    <>
      {/* Splash Screen */}
      <div
        className={`transition-opacity duration-500 ${
          isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {isLoading && <SplashScreen onComplete={handleSplashComplete} />}
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-700 ${
          showContent 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}
      >
        {children}
      </div>
    </>
  );
};

/**
 * Icone de l'application pour le manifeste et les raccourcis
 */
export const AppIcon = ({ size = 64, className = '' }) => (
  <div 
    className={`bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center ${className}`}
    style={{ width: size, height: size }}
  >
    <HeartPulse className="text-white" size={size * 0.5} strokeWidth={2.5} />
  </div>
);

/**
 * Favicon et icones pour différentes tailles
 */
export const generateAppIcons = () => {
  const sizes = [16, 32, 64, 128, 192, 512];
  
  return sizes.map(size => ({
    size,
    url: `/icons/icon-${size}x${size}.png`,
    purpose: size >= 192 ? 'any maskable' : 'any'
  }));
};

export default AppLauncher;
