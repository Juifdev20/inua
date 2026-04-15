// 🏥 Page de connexion - Version Cinématique Sans Scroll
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, LogIn, Loader2, Eye, EyeOff, User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import LogoInuaAfya from '../../components/LogoInuaAfya';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // ✅ Fonction utilitaire de redirection par rôle
  const getRedirectPathByRole = (role) => {
    const userRole = String(role || '').toUpperCase().replace('ROLE_', '').trim();

    const redirectMap = {
      ADMIN: '/admin/dashboard',
      RECEPTION: '/reception/dashboard',
      DOCTOR: '/doctor/dashboard',
      DOCTEUR: '/doctor/dashboard',
      FINANCE: '/finance/dashboard',
      CAISSIER: '/finance/dashboard',
      LABORATOIRE: '/laboratory/dashboard', // ✅ IMPORTANT
      LABO: '/laboratory/dashboard',        // ✅ sécurité
      PHARMACY: '/pharmacy/dashboard',      // ✅ IMPORTANT
      PHARMACIE: '/pharmacy/dashboard'      // ✅ sécurité
    };

    return redirectMap[userRole] || '/patient/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        username: formData.username,
        password: formData.password
      };

      // 🔐 Appel au contexte Auth avec option "Se souvenir de moi"
      const result = await login(payload, rememberMe);

      // Log de diagnostic pour vérifier la structure reçue
      console.log("DEBUG - Login Result:", result);

      if (result && result.success) {
        // Le contexte renvoie l'objet user nettoyé dans result.data
        const userData = result.data;

        if (!userData || !userData.role) {
          throw new Error("Structure de réponse invalide : rôle manquant.");
        }

        // 💾 La sauvegarde est gérée par AuthService dans AuthContext

        // 🔔 Notification de succès
        toast.success("Connexion réussie", {
          description: `Ravi de vous revoir, ${userData.firstName || userData.username} !`,
          duration: 3000,
        });

        // ✅ Normalisation du rôle pour debug
        const userRole = String(userData.role).toUpperCase().replace("ROLE_", "").trim();
        console.log("DEBUG - Rôle normalisé pour redirection:", userRole);

        // ✅ Redirection correcte (inclut LABORATOIRE)
        const redirectPath = getRedirectPathByRole(userRole);
        console.log("DEBUG - Chemin de redirection calculé:", redirectPath);
        navigate(redirectPath, { replace: true });

      } else {
        // ❌ GESTION DES ERREURS
        const errorMessage = result?.error || "";

        if (errorMessage.toLowerCase().includes("disabled") || errorMessage.toLowerCase().includes("désactivé")) {
          toast.error("Accès Refusé", {
            description: "Votre compte est inactif. Veuillez contacter l'administration.",
            duration: 6000,
          });
        } else {
          toast.error("Échec de connexion", {
            description: "Identifiants incorrects. Veuillez réessayer.",
          });
        }
      }

    } catch (error) {
      console.error("LOGIN ERROR ❌", error);
      toast.error("Erreur système", {
        description: "Un problème est survenu lors de la connexion au serveur.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start pt-8 sm:pt-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
      {/* 🔙 Back to Landing */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </Link>

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
            INUA AFIA
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Votre santé, notre priorité</p>
        </div>

        {/* Card de connexion */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-5 border border-white/50 dark:border-gray-700/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Input Identifiant */}
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 text-sm"
                placeholder="Nom d'utilisateur ou Email"
              />
            </div>

            {/* Input Password */}
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 text-sm"
                placeholder="Mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Forgot password link */}
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Option "Se souvenir de moi" */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Se souvenir de moi
              </span>
            </label>

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              <span>{loading ? "Connexion..." : "Se connecter"}</span>
            </button>
          </form>

          {/* Footer */}
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              S'inscrire
            </Link>
          </p>
        </div>
        
        {/* Security badge */}
        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          Connexion sécurisée • Chiffrement AES-256
        </p>
      </div>
    </div>
  );
};

export default LoginPage;