// ⛔ Écran de blocage affiché aux utilisateurs cliniques quand l'abonnement de leur
// hôpital est expiré. Déclenché par l'événement 'subscription-expired' émis par
// l'intercepteur axios (réponse 403 { subscriptionExpired: true }).
// L'admin et les patients ne reçoivent jamais ce 403 → ne voient jamais cet écran.
import React, { useState, useEffect } from 'react';
import { AlertOctagon, LogOut, LifeBuoy } from 'lucide-react';

export default function SubscriptionExpiredOverlay() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handler = (e) => {
      setMessage(e?.detail?.message || "Votre abonnement est épuisé.");
      setVisible(true);
    };
    window.addEventListener('subscription-expired', handler);
    return () => window.removeEventListener('subscription-expired', handler);
  }, []);

  if (!visible) return null;

  const logout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) { /* no-op */ }
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
        <div className="inline-flex p-4 rounded-full bg-rose-100 dark:bg-rose-900/40 mb-5">
          <AlertOctagon className="w-12 h-12 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Abonnement épuisé</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-2">{message}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Veuillez contacter le service <strong>Inua Afya</strong> ou l'<strong>administrateur de votre établissement</strong>
          {' '}pour renouveler l'abonnement et rétablir l'accès aux modules.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="mailto:support@inuaafya.com"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            <LifeBuoy className="w-4 h-4" /> Contacter le support
          </a>
          <button onClick={logout}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
