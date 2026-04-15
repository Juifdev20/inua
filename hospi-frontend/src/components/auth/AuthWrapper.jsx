/**
 * 🛡️ AuthWrapper - Composant wrapper pour l'authentification automatique
 * 
 * Ce composant gère:
 * 1. L'écran de démarrage (Splash Screen)
 * 2. La vérification du token au démarrage
 * 3. La redirection automatique si l'utilisateur est déjà connecté
 * 4. La demande d'authentification biométrique (si activée)
 * 
 * @author InuaAfya Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Heart, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthService from '../../services/AuthService';
import BiometricPrompt from './BiometricPrompt';
import { toast } from 'sonner';

/**
 * 🎨 Splash Screen Component
 */
const SplashScreen = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
    <div className="relative">
      {/* Logo animé */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-2xl animate-pulse">
        <Activity className="w-12 h-12 text-white" />
      </div>
      
      {/* Cercles animés */}
      <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/30 animate-ping" />
      <div className="absolute -inset-4 rounded-3xl border border-green-400/20 animate-pulse" />
    </div>
    
    <h1 className="mt-8 text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
      INUA AFYA
    </h1>
    
    <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium italic flex items-center gap-2">
      <Heart className="w-4 h-4 text-red-500 animate-pulse" />
      "Votre santé, notre priorité"
    </p>
    
    <div className="mt-8 flex items-center gap-2 text-sm text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Chargement...</span>
    </div>
  </div>
);

/**
 * 🛡️ AuthWrapper - HOC pour la gestion de l'authentification
 */
const AuthWrapper = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricUser, setBiometricUser] = useState(null);

  // 🔥 Logique de démarrage et auto-redirect
  useEffect(() => {
    const initializeAuth = async () => {
      // Attendre que AuthContext finisse son init
      if (authLoading) return;

      const currentPath = location.pathname;
      
      // Ne pas rediriger si on est déjà sur une page d'auth
      const isAuthPage = ['/login', '/register', '/forgot-password'].includes(currentPath);
      const isPublicPage = currentPath === '/';

      // Récupérer les données de session
      const authData = AuthService.getAuthData();

      if (authData && authData.user) {
        // ✅ Token présent - Vérifier si on doit afficher la biométrie
        const biometricEnabled = AuthService.isBiometricEnabled();
        
        if (biometricEnabled && !isAuthPage && !isPublicPage) {
          // Afficher le prompt biométrique avant d'accéder à l'app
          setBiometricUser(authData.user.username);
          setShowBiometric(true);
        }

        // Redirection automatique depuis les pages publiques/auth
        if (isAuthPage || isPublicPage) {
          const redirectPath = AuthService.getRedirectPathByRole(authData.user.role);
          console.log('[AuthWrapper] 🚀 Auto-redirect vers:', redirectPath);
          
          toast.success('Connexion automatique', {
            description: `Bienvenue, ${authData.user.firstName || authData.user.username} !`,
            duration: 3000,
          });
          
          navigate(redirectPath, { replace: true });
        }
      }

      // Masquer le splash screen après initialisation
      setTimeout(() => {
        setIsInitializing(false);
      }, 1500);
    };

    initializeAuth();
  }, [authLoading, isAuthenticated, user, navigate, location.pathname]);

  /**
   * ✅ Succès de l'authentification biométrique
   */
  const handleBiometricSuccess = () => {
    setShowBiometric(false);
    toast.success('Authentification biométrique réussie', {
      description: 'Bienvenue sur InuaAfya',
    });
  };

  /**
   * ❌ Annulation de la biométrie - Redirection vers login
   */
  const handleBiometricCancel = () => {
    setShowBiometric(false);
    // Déconnexion et redirection vers login
    AuthService.clearAuthData();
    window.location.href = '/login';
  };

  // 🎨 Afficher le splash screen pendant l'initialisation
  if (isInitializing || authLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      {children}
      
      {/* Prompt biométrique */}
      <BiometricPrompt
        isOpen={showBiometric}
        onSuccess={handleBiometricSuccess}
        onCancel={handleBiometricCancel}
        userName={biometricUser}
      />
    </>
  );
};

export default AuthWrapper;
