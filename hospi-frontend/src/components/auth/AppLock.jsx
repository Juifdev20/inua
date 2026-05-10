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
  const [hasLeftApp, setHasLeftApp] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');

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
      
      // Vérifier si on revient d'une sortie (via localStorage qui persiste sur mobile)
      const lastExitTime = localStorage.getItem('inua_afya_app_exit_time');
      const now = Date.now();
      
      if (lastExitTime) {
        const timeAway = now - parseInt(lastExitTime);
        console.log('🔐 AppLock - Temps écoulé depuis la sortie:', timeAway, 'ms');
        
        // Si plus de 2 secondes sont passées, verrouiller (immédiat sur mobile)
        if (timeAway > 2000) {
          console.log('🔐 AppLock - VERROUILLAGE AU MONTAGE - temps écoulé:', timeAway);
          setIsLocked(true);
        }
        
        // Nettoyer
        localStorage.removeItem('inua_afya_app_exit_time');
      }
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
        // Nettoyer le flag de verrouillage
        localStorage.removeItem('inua_afya_app_exit_time');
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
    console.log('🔐 AppLock - Initialisation des événements mobile');
    
    // Marquer quand on quitte l'app avec timestamp
    const markExit = () => {
      const now = Date.now();
      console.log('🔐 AppLock - Marquage sortie à:', now);
      localStorage.setItem('inua_afya_app_exit_time', now.toString());
    };
    
    const handleBeforeUnload = markExit;
    const handlePageHide = markExit;
    const handleBlur = markExit;
    
    // Détection quand on revient
    const handleVisibilityChange = () => {
      console.log('🔐 AppLock - Visibility change:', document.visibilityState);
      
      if (!isAuthenticated || !isBiometricSupported) return;

      if (document.visibilityState === 'visible') {
        // Vérifier si on doit verrouiller
        const lastExitTime = localStorage.getItem('inua_afya_app_exit_time');
        if (lastExitTime) {
          const timeAway = Date.now() - parseInt(lastExitTime);
          console.log('🔐 AppLock - Retour après:', timeAway, 'ms');
          
          // Si plus de 1 seconde, verrouiller
          if (timeAway > 1000) {
            console.log('🔐 AppLock - VERROUILLAGE ACTIVÉ');
            setIsLocked(true);
          }
          localStorage.removeItem('inua_afya_app_exit_time');
        }
      } else {
        // Sortie de l'app
        markExit();
      }
    };

    // Pour mobile - pageshow avec persisted
    const handlePageShow = (e) => {
      console.log('🔐 AppLock - Page show, persisted:', e.persisted);
      if (!isAuthenticated || !isBiometricSupported) return;
      
      const lastExitTime = localStorage.getItem('inua_afya_app_exit_time');
      if (lastExitTime || e.persisted) {
        const timeAway = Date.now() - parseInt(lastExitTime || '0');
        console.log('🔐 AppLock - PageShow après:', timeAway, 'ms');
        
        if (timeAway > 1000 || e.persisted) {
          console.log('🔐 AppLock - VERROUILLAGE via pageshow');
          setIsLocked(true);
        }
        localStorage.removeItem('inua_afya_app_exit_time');
      }
    };

    const handleResume = () => {
      console.log('🔐 AppLock - Resume event');
      if (!isAuthenticated || !isBiometricSupported) return;
      
      const lastExitTime = localStorage.getItem('inua_afya_app_exit_time');
      if (lastExitTime) {
        console.log('🔐 AppLock - VERROUILLAGE via resume');
        setIsLocked(true);
        localStorage.removeItem('inua_afya_app_exit_time');
      }
    };

    // Pour mobile - détecter quand l'écran se rallume
    const handleWake = () => {
      console.log('🔐 AppLock - Écran rallumé');
      if (!isAuthenticated || !isBiometricSupported) return;
      
      const lastExitTime = localStorage.getItem('inua_afya_app_exit_time');
      if (lastExitTime) {
        setIsLocked(true);
        localStorage.removeItem('inua_afya_app_exit_time');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('pagehide', handlePageHide);
    document.addEventListener('pageshow', handlePageShow);
    document.addEventListener('resume', handleResume);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBlur);
    
    // Pour détecter le réveil de l'écran sur mobile
    if ('wakeLock' in navigator) {
      // API WakeLock disponible
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('resume', handleResume);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isBiometricSupported, isAuthenticated]);

  // Fonction pour activer/désactiver (gardée pour compatibilité)
  const toggleBiometricLock = () => {
    toast.info('Verrouillage automatique actif');
  };

  // Afficher le champ de saisie du PIN
  const showPinEntry = () => {
    setShowPinInput(true);
    setPinError('');
    setPinValue('');
  };

  // Vérifier le PIN saisi
  const verifyPin = () => {
    // Récupérer le PIN stocké ou utiliser un PIN par défaut (à remplacer par vérification backend)
    const storedPin = localStorage.getItem('inua_afya_app_pin') || '0000';
    
    if (pinValue === storedPin) {
      setIsLocked(false);
      setShowPinInput(false);
      setPinValue('');
      setPinError('');
      localStorage.removeItem('inua_afya_app_exit_time');
      toast.success('Déverrouillé avec succès');
    } else {
      setPinError('PIN incorrect');
      toast.error('PIN incorrect', {
        description: 'Veuillez réessayer',
      });
    }
  };

  // Annuler la saisie du PIN
  const cancelPinEntry = () => {
    setShowPinInput(false);
    setPinValue('');
    setPinError('');
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
        {!showPinInput ? (
          <div className="mt-5 flex items-center justify-center gap-3 text-sm">
            <button
              onClick={showPinEntry}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-white/80 hover:text-white transition-all"
            >
              Code PIN
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('inua_afya_app_exit_time');
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-white/80 hover:text-white transition-all"
            >
              Se reconnecter
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p className="text-white/80 text-sm">Entrez votre code PIN :</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinValue}
              onChange={(e) => {
                setPinValue(e.target.value);
                setPinError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
              placeholder="••••"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl tracking-widest placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            {pinError && (
              <p className="text-red-400 text-sm">{pinError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={verifyPin}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium transition-all"
              >
                Valider
              </button>
              <button
                onClick={cancelPinEntry}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

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
