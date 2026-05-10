import React from 'react';

/**
 * ★ NOUVEAU Logo Inua Afya - Version Vert Dégradé
 * 
 * Utilisation:
 * <LogoInuaAfya size={64} className="mon-style" />
 * 
 * Props:
 * - size: Taille en pixels (défaut: 64)
 * - className: Classes CSS additionnelles
 * - animate: Boolean pour activer l'animation de pulsation (défaut: false)
 */
const LogoInuaAfya = ({ size = 64, className = '', animate = false }) => {
  const baseClasses = animate ? 'animate-pulse' : '';
  
  return (
    <img 
      src="/inuaafya-logo-dark.svg"
      alt="Inua Afya"
      width={size}
      height={size}
      className={`${baseClasses} ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
};

export const LogoInuaAfyaAnimated = ({ size = 64, className = '' }) => {
  return (
    <img 
      src="/inuaafya-logo-dark.svg"
      alt="Inua Afya"
      width={size}
      height={size}
      className={`animate-pulse ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default LogoInuaAfya;
