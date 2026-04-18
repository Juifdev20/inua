/**
 * Utilitaires de formatage pour l'application
 */

/**
 * Formate un montant en devise
 */
export const formatCurrency = (amount, currency = 'CDF') => {
  if (amount === null || amount === undefined) return '-';
  
  const formatted = new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return formatted;
};

/**
 * Formate une date
 */
export const formatDate = (date) => {
  if (!date) return '-';
  
  const d = new Date(date);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

/**
 * Formate une date et heure
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  
  const d = new Date(date);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

/**
 * Formate un nombre
 */
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '-';
  
  return new Intl.NumberFormat('fr-CD', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Formate un pourcentage
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-';
  
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formate le temps écoulé
 */
export const formatTimeAgo = (date) => {
  if (!date) return 'Récemment';
  
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return "À l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
};

export default {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatTimeAgo,
};
