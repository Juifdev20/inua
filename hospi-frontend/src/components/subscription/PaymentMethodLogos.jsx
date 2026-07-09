// Logos de moyens de paiement — SVG inline (aucune requête externe, compatible CSP/PWA).
import React from 'react';

export const VisaLogo = ({ className = 'h-6' }) => (
  <svg className={className} viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
    <text x="0" y="13" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700" fontStyle="italic" fill="#1A1F71">VISA</text>
  </svg>
);

export const MastercardLogo = ({ className = 'h-6' }) => (
  <svg className={className} viewBox="0 0 40 24" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
    <circle cx="15" cy="12" r="9" fill="#EB001B" />
    <circle cx="25" cy="12" r="9" fill="#F79E1B" />
    <path d="M20 5a9 9 0 0 1 0 14 9 9 0 0 1 0-14z" fill="#FF5F00" />
  </svg>
);

export const MpesaLogo = ({ className = 'h-6' }) => (
  <svg className={className} viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg" aria-label="M-Pesa">
    <rect width="60" height="20" rx="3" fill="#0A9E3E" />
    <text x="30" y="14" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" fill="#fff">M-PESA</text>
  </svg>
);

export const AirtelLogo = ({ className = 'h-6' }) => (
  <svg className={className} viewBox="0 0 66 20" xmlns="http://www.w3.org/2000/svg" aria-label="Airtel Money">
    <circle cx="10" cy="10" r="9" fill="#E40000" />
    <path d="M10 5.5c2.5 0 4.5 2 4.5 4.5S12.5 14.5 10 14.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <text x="22" y="14" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" fill="#E40000">airtel</text>
  </svg>
);

export const BankLogo = ({ className = 'h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Virement bancaire">
    <path d="M3 9.5 12 4l9 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10v7M9 10v7M15 10v7M19 10v7M3 20h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// Table des moyens : id backend, libellé, logo, type de champ
export const PAYMENT_METHODS = [
  { id: 'VISA',       label: 'Visa',          Logo: VisaLogo,       field: 'card'  },
  { id: 'MASTERCARD', label: 'Mastercard',    Logo: MastercardLogo, field: 'card'  },
  { id: 'MPESA',      label: 'M-Pesa',        Logo: MpesaLogo,      field: 'phone' },
  { id: 'AIRTEL',     label: 'Airtel Money',  Logo: AirtelLogo,     field: 'phone' },
  { id: 'BANK',       label: 'Virement',      Logo: BankLogo,       field: 'bank'  },
];
