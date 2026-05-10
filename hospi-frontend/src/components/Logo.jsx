import React from 'react';

/**
 * Composant Logo Inua Afya
 * 
 * @param {string} variant - 'ocean' | 'royal' | 'dark' | 'navy' | 'default'
 * @param {number} size - Taille en pixels (défaut: 64)
 * @param {string} className - Classes CSS additionnelles
 * @param {boolean} animate - Animation pulse
 */
const Logo = ({ 
  variant = 'default', 
  size = 64, 
  className = '', 
  animate = false 
}) => {
  const logoMap = {
    'ocean': '/inuaafya-logo-ocean.svg',
    'royal': '/inuaafya-logo-royal.svg',
    'dark': '/inuaafya-logo-dark.svg',
    'dark-bordered': '/inuaafya-logo-dark-bordered.svg',
    'dark-ring': '/inuaafya-logo-dark-ring.svg',
    'dark-elegant': '/inuaafya-logo-dark-elegant.svg',
    'navy': '/inuaafya-logo-navy.svg',
    'default': '/inuaafya-logo.svg'
  };

  const baseClasses = animate ? 'animate-pulse' : '';
  
  return (
    <img 
      src={logoMap[variant] || logoMap.default}
      alt="Inua Afya"
      width={size}
      height={size}
      className={`${baseClasses} ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default Logo;
