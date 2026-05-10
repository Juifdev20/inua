import { defaultHospitalConfig } from '../services/hospitalConfigService';

/**
 * Utilitaire pour formater les montants avec la devise configurée
 */

// Récupère la config depuis localStorage ou utilise les valeurs par défaut
const getConfig = () => {
  const stored = localStorage.getItem('inua_afya_hospital_config');
  if (stored) {
    try {
      return { ...defaultHospitalConfig, ...JSON.parse(stored) };
    } catch (e) {
      return defaultHospitalConfig;
    }
  }
  return defaultHospitalConfig;
};

/**
 * Formate un montant avec la devise configurée
 * @param {number} amount - Le montant à formater
 * @param {boolean} withSymbol - Si true, utilise le symbole ($, €, etc.), sinon le code (USD, EUR, etc.)
 * @returns {string} Le montant formaté
 */
export const formatCurrency = (amount, withSymbol = true) => {
  const config = getConfig();
  const currencyCode = config.currencyCode || 'USD';
  const currencySymbol = config.currencySymbol || '$';
  
  const formattedAmount = (amount || 0).toFixed(2);
  
  if (withSymbol) {
    return `${currencySymbol}${formattedAmount}`;
  }
  return `${formattedAmount} ${currencyCode}`;
};

/**
 * Formate un montant avec la devise pour les PDFs (jsPDF compatible)
 * @param {number} amount - Le montant à formater
 * @returns {string} Le montant formaté
 */
export const formatCurrencyPDF = (amount) => {
  const config = getConfig();
  const currencySymbol = config.currencySymbol || '$';
  return `${currencySymbol}${(amount || 0).toFixed(2)}`;
};

/**
 * Récupère le symbole de la devise
 * @returns {string} Le symbole de la devise
 */
export const getCurrencySymbol = () => {
  const config = getConfig();
  return config.currencySymbol || '$';
};

/**
 * Récupère le code de la devise
 * @returns {string} Le code de la devise
 */
export const getCurrencyCode = () => {
  const config = getConfig();
  return config.currencyCode || 'USD';
};

/**
 * Formate un montant pour affichage dans l'UI (avec espaces et symbole)
 * @param {number} amount - Le montant à formater
 * @returns {string} Le montant formaté
 */
export const formatMoney = (amount) => {
  const config = getConfig();
  const currencySymbol = config.currencySymbol || '$';
  const value = (amount || 0).toFixed(2);
  return `${currencySymbol}${value}`;
};

export default {
  formatCurrency,
  formatCurrencyPDF,
  formatMoney,
  getCurrencySymbol,
  getCurrencyCode
};
