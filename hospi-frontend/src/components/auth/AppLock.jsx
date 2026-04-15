/**
 * 🔐 AppLock - Verrouillage biométrique de l'application
 * 
 * Ce composant gère le verrouillage automatique de l'app quand :
 * - L'utilisateur quitte l'app et revient
 * - L'écran s'éteint et se rallume
 * - L'app est mise en arrière-plan
 * 
 * Si biométrie configurée → demande Face ID/Fingerprint/Windows Hello
 * Si pas de biométrie → accès direct
 * 
 * @author InuaAfya Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, ScanFace, Lock, Unlock, X } from 'lucide-react';
import { toast } from 'sonner';
import LogoInuaAfya from '../LogoInuaAfya';

const AppLock = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Vérifier si l'utilisateur est connecté et initialiser
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const user = localStorage.getItem('user') || sessionStorage.getItem('user');
      const isAuthed = !!(token && user);
      setIsAuthenticated(isAuthed);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Activer automatiquement la biométrie au premier montage si supportée
  useEffect(() => {
    if (isAuthenticated && !hasInitialized && isBiometricSupported) {
      setHasInitialized(true);
      console.log('🔐 AppLock - Activation automatique de la biométrie');
    }
  }, [isAuthenticated, isBiometricSupported, hasInitialized]);

  // Vérifier le support biométrique au chargement
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Vérifier si WebAuthn est supporté
        const supported = window.PublicKeyCredential !== undefined;
        setIsBiometricSupported(supported);
        
        console.log('🔐 AppLock - Biométrie supportée:', supported);
      } catch (error) {
        console.error('Erreur vérification biométrie:', error);
      }
    };
    
    checkSupport();
  }, []);

  // Fonction d'authentification biométrique
  const authenticateBiometric = useCallback(async () => {
    if (!isBiometricSupported) {
      // Pas de biométrie → accès direct
      setIsLocked(false);
      return true;
    }

    setIsChecking(true);

    try {
      // Générer un challenge aléatoire
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [],
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (assertion) {
        setIsLocked(false);
        setLastActiveTime(Date.now());
        toast.success('Déverrouillage réussi', {
          description: 'Bienvenue !',
          duration: 2000,
        });
        return true;
      }
    } catch (error) {
      console.error('Erreur authentification biométrique:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Authentification annulée', {
          description: 'Veuillez réessayer',
        });
      } else if (error.name === 'NotSupportedError') {
        // Aucune méthode biométrique configurée → accès direct
        setIsLocked(false);
        return true;
      } else {
        toast.error('Erreur de déverrouillage', {
          description: 'Impossible de vérifier votre identité',
        });
      }
    } finally {
      setIsChecking(false);
    }

    return false;
  }, [isBiometricSupported]);

  // Détecter quand l'app revient au premier plan - verrouillage automatique
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isAuthenticated || !isBiometricSupported) return;

      if (document.visibilityState === 'visible') {
        // Verrouillage IMMÉDIAT dès qu'on revient dans l'app
        console.log('🔐 App verrouillée - retour immédiat');
        setIsLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleFocus = () => {
      if (!isAuthenticated || !isBiometricSupported) return;
      setIsLocked(true);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isBiometricSupported, isAuthenticated]);

  // Fonction pour activer/désactiver (gardée pour compatibilité)
  const toggleBiometricLock = () => {
    toast.info('Verrouillage automatique actif');
  };

  // Si pas connecté ou pas de support biométrique, pas de verrouillage
  if (!isAuthenticated || !isBiometricSupported) {
    return null;
  }

  // Si pas verrouillé, ne rien afficher (transparent pour l'utilisateur)
  if (!isLocked) {
    return null;
  }

  // Écran de verrouillage - Overlay sur l'application
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop blur - l'application est visible en arrière-plan */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

      {/* Contenu du verrouillage */}
      <div className="relative text-center px-6 max-w-sm">
        {/* Logo animé */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
            <LogoInuaAfya size={64} className="mx-auto" />
          </div>
        </div>

        {/* Titre */}
        <h2 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
          Application verrouillée
        </h2>
        <p className="text-blue-200 text-sm mb-6 drop-shadow">
          Utilisez votre empreinte pour déverrouiller
        </p>

        {/* Bouton biométrique principal */}
        <button
          onClick={authenticateBiometric}
          disabled={isChecking}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-semibold shadow-2xl hover:shadow-emerald-500/25 transition-all disabled:opacity-70 flex items-center justify-center gap-3 group"
        >
          {isChecking ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <div className="relative">
                <Fingerprint className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-white/30 rounded-full blur animate-pulse" />
              </div>
              <span>Déverrouiller avec empreinte</span>
              <ScanFace className="w-5 h-5 opacity-80" />
            </>
          )}
        </button>

        {/* Options alternatives */}
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={unlockWithPassword}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-white/80 hover:text-white transition-all"
          >
            Code PIN
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('inua_afya_biometric_lock');
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-white/80 hover:text-white transition-all"
          >
            Se reconnecter
          </button>
        </div>

        {/* Info support biométrie */}
        {!isBiometricSupported && (
          <p className="mt-4 text-xs text-orange-300 bg-orange-500/20 px-3 py-2 rounded-lg">
            ⚠️ Votre appareil ne supporte pas la biométrie
          </p>
        )}
      </div>
    </div>
  );
};

export default AppLock;
