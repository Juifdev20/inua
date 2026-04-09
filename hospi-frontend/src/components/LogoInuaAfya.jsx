import React from 'react';

/**
 * Composant Logo Inua Afya
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
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${baseClasses} ${className}`}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      
      <rect width="512" height="512" rx="112" ry="112" fill="url(#logoGradient)" />
      
      <g transform="translate(256, 256)">
        <path
          d="M0,60 C-60,20 -100,-20 -100,-60 C-100,-100 -60,-130 0,-100 C60,-130 100,-100 100,-60 C100,-20 60,20 0,60Z"
          fill="white"
          transform="translate(0, -20) scale(1.8)"
        />
        <path
          d="M-70,-20 L-50,-20 L-40,-50 L-20,20 L0,-30 L20,20 L40,-50 L50,-20 L70,-20"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          transform="translate(0, 10) scale(1.3)"
        />
      </g>
    </svg>
  );
};

export const LogoInuaAfyaAnimated = ({ size = 64, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-pulse ${className}`}
    >
      <defs>
        <linearGradient id="logoGradientAnim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      
      <rect width="512" height="512" rx="112" ry="112" fill="url(#logoGradientAnim)" />
      
      <g transform="translate(256, 256)">
        <path
          d="M0,60 C-60,20 -100,-20 -100,-60 C-100,-100 -60,-130 0,-100 C60,-130 100,-100 100,-60 C100,-20 60,20 0,60Z"
          fill="white"
          transform="translate(0, -20) scale(1.8)"
        />
        <path
          d="M-70,-20 L-50,-20 L-40,-50 L-20,20 L0,-30 L20,20 L40,-50 L50,-20 L70,-20"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          transform="translate(0, 10) scale(1.3)"
        />
      </g>
    </svg>
  );
};

export default LogoInuaAfya;
