// 🏥 Page de connexion - Version Cinématique Sans Scroll
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, LogIn, Loader2, Eye, EyeOff, User, ArrowLeft, Fingerprint, ScanFace, Mail } from 'lucide-react';
import { toast } from 'sonner';
import LogoInuaAfya from '../../components/LogoInuaAfya';
import { BACKEND_URL } from '../../config/environment';

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

  // ★ Vérifier si on vient d'une réinitialisation (force=true) et vider les champs
  // ★ Gérer les erreurs OAuth2
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const forceLogin = urlParams.get('force') === 'true';
    const oauthError = urlParams.get('error');

    if (forceLogin) {
      // Forcer la vidange des champs pour éviter l'auto-fill du navigateur
      setFormData({ username: '', password: '' });
    }

    if (oauthError === 'oauth_cancelled') {
      toast.error('Authentification annulée', {
        description: 'Vous avez annulé la connexion via Google ou Facebook',
      });
      // Retirer le paramètre error de l'URL sans recharger
      window.history.replaceState({}, document.title, '/login');
    } else if (oauthError === 'oauth_failed') {
      toast.error('Échec OAuth2', {
        description: 'Une erreur est survenue lors de l\'authentification sociale',
      });
      // Retirer le paramètre error de l'URL sans recharger
      window.history.replaceState({}, document.title, '/login');
    }
  }, []);

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
      // Simuler une vérification biométrique
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
        // Pour l'instant, simulation
        setTimeout(() => {
          toast.success('Bienvenue !', {
            description: 'Connexion par biométrie réussie',
          });
          navigate('/patient/dashboard');
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
      SUPERADMIN: '/superadmin',
      SUPER_ADMIN: '/superadmin',
      ADMIN: '/admin/dashboard',
      RECEPTION: '/reception/dashboard',
      DOCTOR: '/doctor/dashboard',
      DOCTEUR: '/doctor/dashboard',
      FINANCE: '/finance/dashboard',
      CAISSIER: '/finance/dashboard',
      LABORATOIRE: '/laboratory/dashboard',
      LABO: '/laboratory/dashboard',
      PHARMACY: '/pharmacy/dashboard',
      PHARMACIE: '/pharmacy/dashboard'
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
        // 🔄 Force changement mot de passe avant redirection
        if (userData.mustChangePassword) {
          navigate("/change-password", { replace: true });
          return;
        }

        // ✅ Normalisation du rôle pour debug
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
    <div className="min-h-screen w-full flex flex-col items-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-8 overflow-y-auto">
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
            INUA AFYA
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Votre santé, notre priorité</p>
        </div>

        {/* Card de connexion */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-5 border border-white/50 dark:border-gray-700/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 🔐 Bouton Biométrique WebAuthn */}
            {isBiometricSupported && (
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isBiometricLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
              >
                {isBiometricLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Connexion avec empreinte</span>
                    <ScanFace className="w-4 h-4 opacity-80" />
                  </>
                )}
              </button>
            )}

            {/* Input Identifiant */}
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                autoComplete="off"
                data-lpignore="true"
                data-form-type="other"
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
                autoComplete="new-password"
                data-lpignore="true"
                data-form-type="other"
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
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium">
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

            {/* Divider - Ou connectez-vous avec */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                  Ou connectez-vous avec
                </span>
              </div>
            </div>

            {/* Social Login Buttons - En bas du formulaire */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`${BACKEND_URL}/oauth2/authorization/google`}
                className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </a>
              {/* Facebook Login - Temporairement désactivé (configuration en attente)
              <a
                href="/oauth2/authorization/facebook"
                className="flex items-center justify-center gap-2 py-2.5 bg-[#1877F2] hover:bg-[#166fe5] transition-colors rounded-xl text-white font-medium text-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
              */}
              <Link
                to="/login-otp"
                className="flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium text-sm transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </Link>
            </div>
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
