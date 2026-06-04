import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Wrench } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../config/environment.js';
import { clearAuthData } from '../services/AuthService.js';

/**
 * 🛠️ MaintenanceModal — Modal bloquant affiché au centre de l'écran
 * quand le backend signale un mode maintenance actif.
 * Exclut les SUPERADMIN (ils doivent pouvoir accéder au dashboard Système).
 * Redirige vers /login au clic sur OK.
 */
const MaintenanceModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState('');

  // 🔍 Détecte si l'utilisateur connecté est SUPERADMIN
  const isSuperAdmin = () => {
    try {
      const userStr = localStorage.getItem('inua_user');
      if (!userStr) return false;
      const user = JSON.parse(userStr);
      const role = String(user?.role || '').toUpperCase().replace('ROLE_', '').trim();
      return role === 'SUPERADMIN';
    } catch {
      return false;
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/public/system-status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const json = await response.json();
        const data = json?.data || json;
        setMaintenance(!!data?.maintenance);
        setMessage(data?.message || 'Le système est en mode maintenance.');
      }
    } catch (err) {
      // Silencieux — pas de modal si le backend est injoignable
    }
  };

  // 🚨 Détection INSTANTANÉE via interceptor axios global
  // Quand n'importe quelle API retourne 503 + maintenance:true, le modal s'affiche immédiatement
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 503 && error.response?.data?.maintenance) {
          window.dispatchEvent(new CustomEvent('maintenance:detected'));
        }
        if (error.response?.status === 403 && error.response?.data?.deviceBlocked) {
          window.dispatchEvent(new CustomEvent('maintenance:detected'));
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Écoute l'évent personnalisé (pour synchroniser entre composants aussi)
  useEffect(() => {
    const onDetected = () => {
      setMaintenance(true);
    };
    window.addEventListener('maintenance:detected', onDetected);
    return () => window.removeEventListener('maintenance:detected', onDetected);
  }, []);

  // 🔄 Polling de secours toutes les 10 secondes (au cas où l'user ne fait aucune requête API)
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // toutes les 10s
    return () => clearInterval(interval);
  }, []);

  const handleOk = () => {
    clearAuthData();        // Déconnecte proprement
    navigate('/login');     // Redirige vers login
  };

  // ❌ Pas de modal pour les SUPERADMIN (ils gèrent la maintenance)
  // Vérifie le rôle OU le pathname pour être sûr
  const isOnSuperAdminPage = location.pathname.startsWith('/superadmin');
  if (isSuperAdmin() || isOnSuperAdminPage) return null;

  // ❌ Pas de modal si maintenance est inactive
  if (!maintenance) return null;

  // ❌ Pas de modal sur la page login (sinon il bloque la page de connexion)
  if (location.pathname === '/login') return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm sm:max-w-md w-full mx-auto p-4 sm:p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3 sm:mb-4">
          <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Nous revenons très vite !</h2>
        </div>

        <p className="text-muted-foreground mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
          {message}
        </p>

        <div className="p-2 sm:p-3 bg-muted rounded-lg mb-4 sm:mb-6 text-xs sm:text-sm text-muted-foreground">
          L'équipe Inua Afya vous remercie pour votre patience et votre compréhension.
        </div>

        <button
          onClick={handleOk}
          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
        >
          OK — Compris
        </button>
      </div>
    </div>
  );
};

export default MaintenanceModal;
