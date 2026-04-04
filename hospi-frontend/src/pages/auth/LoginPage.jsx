// 🏥 Page de connexion - Version Professionnelle Optimisée
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, Lock, LogIn, Loader2 } from 'lucide-react';
// 🔥 Utilisation de Sonner pour des alertes style Facebook/Meta
import { toast } from 'sonner';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);

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

      // 🔐 Appel au contexte Auth
      const result = await login(payload);

      // Log de diagnostic pour vérifier la structure reçue
      console.log("DEBUG - Login Result:", result);

      if (result && result.success) {
        // Le contexte renvoie l'objet user nettoyé dans result.data
        const userData = result.data;

        if (!userData || !userData.role) {
          throw new Error("Structure de réponse invalide : rôle manquant.");
        }

        // 💾 Sauvegarder l'utilisateur complet pour la session (déjà fait dans AuthContext, mais on garde)
        localStorage.setItem('user', JSON.stringify(userData));

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full">

        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 mb-4 shadow-lg animate-in fade-in zoom-in duration-700">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2 tracking-tight">
            INUA AFIA
          </h1>
          <p className="text-gray-500 font-medium italic">"Votre santé, notre priorité"</p>
        </div>

        {/* Card de connexion */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Identifiant */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom d'utilisateur ou Email</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="votre_nom ou email"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Mot de passe</label>
                <Link to="/forgot-password" size="sm" className="text-xs text-blue-600 hover:underline font-medium">
                  Mot de passe Oublié ?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              <span>{loading ? "Vérification..." : "Se connecter"}</span>
            </button>
          </form>

          {/* Footer Card */}
          <div className="mt-8 pt-6 border-t border-gray-50 text-center">
            <p className="text-sm text-gray-600">
              Nouveau sur Inua Afia ?{' '}
              <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Créer un compte patient
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper interne pour l'icône utilisateur
const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default LoginPage;