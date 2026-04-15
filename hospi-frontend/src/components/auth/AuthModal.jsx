/**
 * 🎭 AuthModal - Expérience de connexion cinématique
 * 
 * Modal élégant s'ouvrant depuis la landing page avec:
 * - Effet de flou glassmorphism sur l'arrière-plan
 * - Animation fluide d'entrée/sortie
 * - Switch Login/Register sans rechargement
 * - Design sans scroll (tout visible)
 * 
 * @author InuaAfya Team
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Mail, Lock, User, Phone, UserPlus, LogIn, Loader2, CheckCircle2, ArrowRight, Fingerprint, ScanFace } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoInuaAfya from '../LogoInuaAfya';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Form states
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Login form
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  
  // Register form
  const [registerData, setRegisterData] = useState({
    username: '', firstName: '', lastName: '', email: '',
    phone: '', password: '', confirmPassword: '',
  });
  
  const { login, register } = useAuth();

  // Reset forms when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLoginData({ username: '', password: '' });
      setRegisterData({
        username: '', firstName: '', lastName: '', email: '',
        phone: '', password: '', confirmPassword: '',
      });
    }
  }, [isOpen, initialMode]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const switchMode = (newMode) => {
    setIsAnimating(true);
    setTimeout(() => {
      setMode(newMode);
      setIsAnimating(false);
    }, 150);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await login(loginData, rememberMe);
      
      if (result.success) {
        toast.success('Connexion réussie', {
          description: `Bienvenue, ${result.data.firstName || result.data.username} !`,
        });
        onClose();
        // Redirection automatique via AuthWrapper
      } else {
        toast.error('Échec de connexion', {
          description: result.error || 'Identifiants incorrects',
        });
      }
    } catch (error) {
      toast.error('Erreur système', {
        description: 'Un problème est survenu lors de la connexion',
      });
    } finally {
      setLoading(false);
    }
  };

  /* ================= AUTHENTIFICATION BIOMÉTRIQUE WebAuthn ================= */
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  
  // Vérifier si WebAuthn est supporté
  useEffect(() => {
    const checkBiometricSupport = () => {
      const supported = window.PublicKeyCredential !== undefined;
      setIsBiometricSupported(supported);
      console.log('🔐 WebAuthn supporté:', supported);
    };
    checkBiometricSupport();
  }, []);
  
  // Fonction pour l'authentification biométrique
  const handleBiometricAuth = async () => {
    if (!isBiometricSupported) {
      toast.error('Biométrie non supportée', {
        description: 'Votre appareil ne supporte pas l\'authentification biométrique',
      });
      return;
    }
    
    setIsBiometricLoading(true);
    
    try {
      // Simuler une vérification biométrique (à remplacer par vraie implémentation backend)
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
        toast.success('Authentification biométrique réussie !', {
          description: 'Vérification de vos identifiants...',
        });
        
        // TODO: Envoyer l'assertion au backend pour vérification
        // Pour l'instant, on simule une connexion réussie
        setTimeout(() => {
          handleBiometricSuccess();
        }, 1000);
      }
    } catch (error) {
      console.error('Erreur biométrique:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Authentification annulée', {
          description: 'Vous avez annulé la vérification biométrique',
        });
      } else if (error.name === 'NotSupportedError') {
        toast.error('Biométrie non disponible', {
          description: 'Aucune méthode biométrique configurée sur cet appareil',
        });
      } else {
        toast.error('Erreur biométrique', {
          description: 'Impossible de vérifier votre identité',
        });
      }
    } finally {
      setIsBiometricLoading(false);
    }
  };
  
  // Callback après succès biométrique
  const handleBiometricSuccess = () => {
    // Redirection ou fermeture du modal
    toast.success('Bienvenue !', {
      description: 'Connexion par biométrie réussie',
    });
    onClose();
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Vérification requise', {
        description: 'Les mots de passe ne correspondent pas',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const payload = {
        username: registerData.username || registerData.email,
        email: registerData.email,
        password: registerData.password,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        phoneNumber: registerData.phone,
        role: 'PATIENT'
      };
      
      const result = await register(payload);
      
      if (result.success) {
        // 🎉 Confettis
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3B82F6', '#10B981', '#ffffff']
        });
        
        toast.success('Compte créé avec succès !', {
          description: 'Bienvenue dans la famille Inua Afya',
        });
        
        // Auto-login
        const loginResult = await login({
          username: payload.username,
          password: payload.password
        }, true);
        
        if (loginResult.success) {
          setTimeout(() => onClose(), 1000);
        } else {
          switchMode('login');
        }
      } else {
        toast.error('Erreur', { description: result.error });
      }
    } catch (error) {
      toast.error('Erreur système', { description: 'Serveur injoignable' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  /* ================= COMPOSANT BOUTON BIOMÉTRIQUE ================= */
  const BiometricLoginButton = () => {
    if (!isBiometricSupported) return null;
    
    return (
      <button
        type="button"
        onClick={handleBiometricAuth}
        disabled={isBiometricLoading}
        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
      >
        {isBiometricLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>
            <div className="relative">
              <Fingerprint className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-white/30 rounded-full blur animate-pulse" />
            </div>
            <span className="text-base">Connexion biométrique</span>
            <ScanFace className="w-5 h-5 opacity-80" />
          </>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 sm:pt-8 pb-4 overflow-y-auto">
      {/* 🌫️ Backdrop avec flou glassmorphism - clic désactivé */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xl transition-all duration-500"
      />
      
      {/* ✨ Modal Container - positionné en haut */}
      <div 
        className="relative w-full max-w-xl mx-4 sm:mx-6 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* 🎨 Header avec gradient - Compact */}
        <div className="relative h-24 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 flex flex-col items-center justify-center">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all hover:rotate-90 duration-300"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Logo avec animation */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/30 rounded-xl blur-lg animate-pulse" />
            <LogoInuaAfya size={44} className="relative drop-shadow-lg" />
          </div>
          
          {/* Titre */}
          <h2 className="mt-1 text-lg font-bold text-white tracking-wide">
            INUA AFIA
          </h2>
        </div>

        {/* 🔄 Tabs Login/Register - Compact */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-3 text-sm font-semibold transition-all duration-300 relative ${
              mode === 'login' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" />
              Connexion
            </span>
            {mode === 'login' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-green-500" />
            )}
          </button>
          
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-3 text-sm font-semibold transition-all duration-300 relative ${
              mode === 'register' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" />
              Inscription
            </span>
            {mode === 'register' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-green-500" />
            )}
          </button>
        </div>

        {/* 📋 Content - Sans scroll interne */}
        <div className="p-5">
          <div className={`transition-all duration-200 ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
            
            {mode === 'login' ? (
              /* 🔐 FORMULAIRE LOGIN */
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                {/* 🔘 Bouton Biométrique WebAuthn */}
                <BiometricLoginButton />
                
                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                      Ou continuez avec
                    </span>
                  </div>
                </div>
                
                {/* Username */}
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 text-base"
                    placeholder="Nom d'utilisateur ou Email"
                  />
                </div>

                {/* Password */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 text-base"
                    placeholder="Mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Options */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-600 dark:text-gray-300">Se souvenir de moi</span>
                  </label>
                  <button type="button" className="text-blue-600 hover:underline">
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Se connecter
                    </>
                  )}
                </button>
              </form>
              
            ) : (
              /* 📝 FORMULAIRE REGISTER */
              <form onSubmit={handleRegisterSubmit} className="space-y-2 sm:space-y-3">
                {/* Nom complet */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm sm:text-base"
                    placeholder="Prénom"
                  />
                  <input
                    type="text"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm sm:text-base"
                    placeholder="Nom"
                  />
                </div>

                {/* Username */}
                <input
                  type="text"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="w-full px-3 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm sm:text-base"
                  placeholder="Nom d'utilisateur (optionnel)"
                />

                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    required
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm sm:text-base"
                    placeholder="Email"
                  />
                </div>

                {/* Téléphone */}
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    required
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm sm:text-base"
                    placeholder="Téléphone"
                  />
                </div>

                {/* Password */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm sm:text-base"
                      placeholder="Mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm sm:text-base"
                      placeholder="Confirmer"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-green-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Créer mon compte
                    </>
                  )}
                </button>
                
                <p className="text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 pt-1 sm:pt-2 leading-tight">
                  En vous inscrivant, vous acceptez nos conditions
                </p>
              </form>
            )}
          </div>
        </div>

        {/* 🔒 Security footer - Compact */}
        <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Sécurisé
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1">
              <Fingerprint className="w-3.5 h-3.5 text-emerald-500" />
              WebAuthn
            </span>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-500" />
              256-bit
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
