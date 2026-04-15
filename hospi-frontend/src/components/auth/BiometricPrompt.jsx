/**
 * 🔐 BiometricPrompt - Composant d'authentification biométrique
 * 
 * Pour Web: Utilise l'API WebAuthn (Touch ID, Face ID, Windows Hello)
 * Pour Mobile (React Native): Utiliser expo-local-authentication
 * 
 * Ce composant affiche une popup élégante demandant à l'utilisateur
 * de s'authentifier pour accéder à InuaAfya.
 * 
 * @author InuaAfya Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Fingerprint, ScanFace, Shield, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BiometricPrompt = ({ 
  isOpen, 
  onSuccess, 
  onCancel, 
  userName = '',
  mode = 'auto' // 'auto' | 'fingerprint' | 'face' | 'pin'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState('fingerprint');
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);

  // Détection du type de biométrie disponible
  useEffect(() => {
    if (isOpen) {
      detectBiometricType();
    }
  }, [isOpen]);

  const detectBiometricType = async () => {
    // Détection basée sur l'appareil
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      setBiometricType('face'); // Face ID sur iOS
    } else if (userAgent.includes('android')) {
      // Android peut avoir fingerprint ou face
      setBiometricType('fingerprint');
    } else {
      setBiometricType('fingerprint'); // Défaut
    }
  };

  /**
   * 🔐 Authentification biométrique via WebAuthn API
   */
  const handleBiometricAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Vérifier la support WebAuthn
      if (!window.PublicKeyCredential) {
        throw new Error('Votre appareil ne supporte pas l\'authentification biométrique');
      }

      // Simuler l'appel à l'API biométrique (WebAuthn)
      // En production, utilisez une véritable implémentation WebAuthn
      await simulateBiometricAuth();
      
      toast.success('Authentification réussie', {
        description: 'Bienvenue sur InuaAfya',
        duration: 2000,
      });
      
      onSuccess();
    } catch (err) {
      console.error('Erreur biométrique:', err);
      setAttempts(prev => prev + 1);
      setError(err.message || 'Échec de l\'authentification biométrique');
      
      if (attempts >= 2) {
        toast.error('Trop de tentatives échouées', {
          description: 'Veuillez vous connecter avec votre mot de passe',
        });
        onCancel();
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🧪 Simulation pour démo (à remplacer par vraie API WebAuthn)
   */
  const simulateBiometricAuth = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 90% de réussite pour la démo
        if (Math.random() > 0.1) {
          resolve(true);
        } else {
          reject(new Error('Empreinte non reconnue. Veuillez réessayer.'));
        }
      }, 1500);
    });
  };

  /**
   * 📱 Navigation vers connexion manuelle
   */
  const handleManualLogin = () => {
    onCancel();
  };

  if (!isOpen) return null;

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'face':
        return <ScanFace className="w-16 h-16 text-blue-500" />;
      case 'fingerprint':
      default:
        return <Fingerprint className="w-16 h-16 text-green-500" />;
    }
  };

  const getBiometricTitle = () => {
    switch (biometricType) {
      case 'face':
        return 'Face ID';
      case 'fingerprint':
        return 'Empreinte Digitale';
      default:
        return 'Biométrie';
    }
  };

  const getBiometricText = () => {
    switch (biometricType) {
      case 'face':
        return 'Utilisez Face ID pour accéder rapidement et en toute sécurité à votre compte InuaAfya.';
      case 'fingerprint':
        return 'Utilisez votre empreinte digitale pour accéder rapidement et en toute sécurité à votre compte InuaAfya.';
      default:
        return 'Authentifiez-vous pour accéder à InuaAfya.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header avec gradient */}
        <div className="relative h-32 bg-gradient-to-br from-blue-500 via-blue-600 to-green-500 flex items-center justify-center">
          <button 
            onClick={handleManualLogin}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
              {getBiometricIcon()}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Vérifiez votre identité
          </h2>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            {getBiometricText()}
          </p>

          {userName && (
            <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{userName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Compte InuaAfya</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {error}
              </p>
              {attempts > 0 && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  Tentative {attempts}/3
                </p>
              )}
            </div>
          )}

          {/* Bouton principal biométrie */}
          <button
            onClick={handleBiometricAuth}
            disabled={isLoading}
            className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Vérification...</span>
              </>
            ) : (
              <>
                {getBiometricType === 'face' ? <ScanFace className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
                <span>Utiliser {getBiometricTitle()}</span>
              </>
            )}
          </button>

          {/* Option connexion manuelle */}
          <button
            onClick={handleManualLogin}
            disabled={isLoading}
            className="mt-4 w-full py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Utiliser le mot de passe
          </button>

          {/* Sécurité info */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Shield className="w-4 h-4" />
            <span>Authentification sécurisée par InuaAfya</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiometricPrompt;
