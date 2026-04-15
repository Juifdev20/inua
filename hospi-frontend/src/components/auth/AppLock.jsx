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
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());

  // Vérifier le support biométrique au chargement
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Vérifier si WebAuthn est supporté
        const supported = window.PublicKeyCredential !== undefined;
        setIsBiometricSupported(supported);
        
        // Vérifier si l'utilisateur a activé la biométrie dans ses préférences
        const biometricEnabled = localStorage.getItem('inua_afya_biometric_lock') === 'true';
        setIsBiometricEnabled(biometricEnabled);
        
        console.log('🔐 AppLock - Biométrie supportée:', supported);
        console.log('🔐 AppLock - Biométrie activée:', biometricEnabled);
      } catch (error) {
        console.error('Erreur vérification biométrie:', error);
      }
    };
    
    checkSupport();
  }, []);

  // Fonction d'authentification biométrique
  const authenticateBiometric = useCallback(async () => {
    if (!isBiometricSupported || !isBiometricEnabled) {
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
  }, [isBiometricSupported, isBiometricEnabled]);

  // Détecter quand l'app revient au premier plan
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeAway = Date.now() - lastActiveTime;
        const LOCK_DELAY = 30000; // 30 secondes avant verrouillage

        // Vérifier si assez de temps s'est écoulé pour verrouiller
        if (timeAway > LOCK_DELAY && isBiometricEnabled) {
          console.log('🔐 App verrouillée - temps écoulé:', timeAway);
          setIsLocked(true);
        } else {
          setLastActiveTime(Date.now());
        }
      } else {
        // App en arrière-plan → sauvegarder l'heure
        setLastActiveTime(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Détecter le réveil de l'écran (mobile)
    const handleWake = () => {
      const timeAway = Date.now() - lastActiveTime;
      if (timeAway > 30000 && isBiometricEnabled) {
        setIsLocked(true);
      }
    };
    
    window.addEventListener('focus', handleWake);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWake);
    };
  }, [lastActiveTime, isBiometricEnabled]);

  // Activer/désactiver le verrouillage biométrique
  const toggleBiometricLock = async () => {
    if (!isBiometricSupported) {
      toast.error('Biométrie non supportée', {
        description: 'Votre appareil ne supporte pas cette fonctionnalité',
      });
      return;
    }

    const newState = !isBiometricEnabled;
    
    if (newState) {
      // Tester la biométrie avant d'activer
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const options = {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [],
          userVerification: 'required',
          timeout: 60000,
        };

        await navigator.credentials.get({ publicKey: options });
        
        // Succès → activer
        localStorage.setItem('inua_afya_biometric_lock', 'true');
        setIsBiometricEnabled(true);
        toast.success('Verrouillage biométrique activé', {
          description: 'Votre app sera protégée par Face ID/Fingerprint',
        });
      } catch (error) {
        toast.error('Configuration échouée', {
          description: 'Impossible de configurer la biométrie',
        });
      }
    } else {
      // Désactiver
      localStorage.setItem('inua_afya_biometric_lock', 'false');
      setIsBiometricEnabled(false);
      toast.success('Verrouillage biométrique désactivé');
    }
  };

  // Déverrouiller avec mot de passe (fallback)
  const unlockWithPassword = () => {
    // Pour l'instant, accès direct (à améliorer avec vrai mot de passe)
    setIsLocked(false);
    setLastActiveTime(Date.now());
  };

  // Si pas verrouillé et biométrie désactivée, ne rien afficher
  if (!isLocked && !isBiometricEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleBiometricLock}
          className="p-3 rounded-full shadow-lg transition-all bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-600 dark:text-gray-300"
          title="Activer le verrouillage biométrique"
        >
          <Lock className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Si pas verrouillé mais biométrie activée → juste le bouton de désactivation
  if (!isLocked && isBiometricEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleBiometricLock}
          className="p-3 rounded-full shadow-lg transition-all bg-emerald-500 hover:bg-emerald-600 text-white"
          title="Désactiver le verrouillage"
        >
          <Fingerprint className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Écran de verrouillage
  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-center px-6">
        {/* Logo animé */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-2xl animate-pulse" />
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
            <LogoInuaAfya size={80} className="mx-auto" />
          </div>
        </div>

        {/* Titre */}
        <h2 className="text-2xl font-bold text-white mb-2">
          Inua Afya
        </h2>
        <p className="text-blue-200 mb-8">
          Application verrouillée
        </p>

        {/* Bouton biométrique */}
        <button
          onClick={authenticateBiometric}
          disabled={isChecking}
          className="w-full max-w-xs mx-auto py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-3 group"
        >
          {isChecking ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <div className="relative">
                <Fingerprint className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-white/30 rounded-full blur animate-pulse" />
              </div>
              <span>Déverrouiller</span>
              <ScanFace className="w-5 h-5 opacity-80" />
            </>
          )}
        </button>

        {/* Options alternatives */}
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            onClick={unlockWithPassword}
            className="text-blue-300 hover:text-white transition-colors"
          >
            Utiliser le mot de passe
          </button>
          <span className="text-gray-500">|</span>
          <button
            onClick={() => window.location.reload()}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Reconnecter
          </button>
        </div>

        {/* Info support biométrie */}
        {!isBiometricSupported && (
          <p className="mt-4 text-xs text-orange-400">
            Votre appareil ne supporte pas la biométrie
          </p>
        )}
      </div>
    </div>
  );
};

export default AppLock;
