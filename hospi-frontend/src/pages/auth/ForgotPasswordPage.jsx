// 🏥 Page mot de passe oublié - Version Professionnelle

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, ArrowLeft, Loader2, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import LogoInuaAfya from '../../components/LogoInuaAfya';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // ✅ Validation email côté client
  const isValidEmail = (email) => {
    const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Validation : email requis
    if (!email.trim()) {
      setError("L'adresse email est requise");
      toast.error("Champ requis", { description: "Veuillez entrer votre adresse email" });
      return;
    }

    // 2. Validation : format email valide
    if (!isValidEmail(email)) {
      setError("Format d'email invalide. Exemple: utilisateur@domaine.com");
      toast.error("Email invalide", { description: "Veuillez entrer une adresse email valide" });
      return;
    }

    setLoading(true);

    try {
      const result = await forgotPassword(email);
      
      if (result.success) {
        setSuccess(true);
        setError('');
        toast.success("Email envoyé", {
          description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe",
        });
      } else {
        // Afficher l'erreur spécifique du backend
        const errorMsg = result.error || "Une erreur est survenue";
        setError(errorMsg);
        toast.error("Erreur", { description: errorMsg });
      }
    } catch (error) {
      const errorMsg = "Impossible de contacter le serveur. Vérifiez votre connexion.";
      setError(errorMsg);
      toast.error("Erreur", { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 overflow-hidden">
      {/* 🔙 Back to Login - Force show login even if authenticated */}
      <a 
        href="/login?force=true"
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </a>

      <div className="w-full max-w-sm">
        {/* Logo & Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl animate-pulse" />
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
                Mot de passe oublié ?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center text-sm mb-4">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Email */}
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(''); // Clear error on change
                    }}
                    className={`w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 text-sm ${
                      error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-600'
                    }`}
                    placeholder="votre.email@exemple.com"
                  />
                </div>

                {/* Message d'erreur */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                    <p className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span>{loading ? "Envoi..." : "Envoyer le lien"}</span>
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
                Email envoyé !
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>
              </p>
            </div>
          )}

          {/* Back to login link - with force parameter */}
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
          Lien sécurisé • Valide 10 minutes
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
