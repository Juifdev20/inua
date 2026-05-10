// 🔒 Page réinitialisation mot de passe - Version Professionnelle

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import LogoInuaAfya from '../../components/LogoInuaAfya';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Vérifier si le token est présent
  useEffect(() => {
    if (!token) {
      setTokenError(true);
      toast.error("Lien invalide", {
        description: "Le lien de réinitialisation est manquant, expiré ou déjà utilisé",
      });
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.error("Erreur", { description: "Token manquant" });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Erreur", { description: "Les mots de passe ne correspondent pas" });
      return;
    }

    if (password.length < 6) {
      toast.error("Erreur", { description: "Le mot de passe doit contenir au moins 6 caractères" });
      return;
    }

    setLoading(true);

    try {
      // Appel API pour réinitialiser le mot de passe
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        toast.success("Succès", {
          description: "Votre mot de passe a été réinitialisé avec succès",
        });
        // Redirection après 3 secondes
        setTimeout(() => navigate('/login'), 3000);
      } else {
        const errorMsg = data.message || "Une erreur est survenue";
        if (errorMsg.toLowerCase().includes('expiré') || errorMsg.toLowerCase().includes('invalide')) {
          setTokenError(true);
        }
        toast.error("Erreur", { description: errorMsg });
      }
    } catch (error) {
      toast.error("Erreur", {
        description: "Impossible de contacter le serveur",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 overflow-hidden">
      {/* 🔙 Back to Login - Force full page reload to bypass AuthWrapper redirect */}
      <a 
        href="/login" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        onClick={(e) => {
          e.preventDefault();
          // ★ Force navigation to /login with state to prevent auto-redirect
          window.location.href = '/login?force=true';
        }}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </a>

      <div className="w-full max-w-sm">
        {/* Logo & Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl animate-pulse" />
              <LogoInuaAfya size={56} className="relative drop-shadow-lg" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent tracking-tight">
            INUA AFYA
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Votre santé, notre priorité</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-5 border border-white/50 dark:border-gray-700/50">
          {!success ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                Nouveau mot de passe
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-4">
                Créez un nouveau mot de passe sécurisé pour votre compte
              </p>

              {/* ★ Message d'erreur token invalide/expiré */}
              {tokenError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                  <p className="text-red-600 dark:text-red-400 text-sm text-center">
                    <span className="text-lg">⚠️</span> <strong>Lien invalide ou expiré</strong><br />
                    Ce lien de réinitialisation est manquant, expiré (10 min) ou déjà utilisé.
                  </p>
                  <Link 
                    to="/forgot-password" 
                    className="block text-center mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Demander un nouveau lien →
                  </Link>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Password */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 text-sm"
                    placeholder="Nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 text-sm"
                    placeholder="Confirmer le mot de passe"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !token || tokenError}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  <span>{loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center mb-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                  <CheckCircle className="w-14 h-14 text-green-500 relative" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Mot de passe réinitialisé !
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Votre mot de passe a été changé avec succès. Vous allez être redirigé vers la page de connexion.
              </p>
            </div>
          )}

          {/* Back to login link - with force parameter to bypass auto-redirect */}
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <a 
              href="/login?force=true"
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Retour à la connexion
            </a>
          </p>
        </div>
        
        {/* Security note */}
        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          Connexion sécurisée • SSL 256-bit
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
