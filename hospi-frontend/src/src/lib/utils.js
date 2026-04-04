import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine des classes Tailwind avec gestion des conflits.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formate un nombre en devise (FCFA / XAF) pour l'affichage.
 * @param {number} amount - Le montant à formater.
 * @returns {string} Le montant formaté.
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Formate une date de manière lisible.
 * @param {Date|string} date - La date à formater.
 * @returns {string} La date formatée.
 */
export function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}