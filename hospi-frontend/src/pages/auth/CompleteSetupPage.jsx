import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Shield, CheckCircle, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { completeOAuthSetup } from '../../services/otpAuthApi';
import { useAuth } from '../../context/AuthContext';

/**
 * ★ PAGE DE CONFIGURATION FINAL DU COMPTE OAUTH2
 * Page où l'utilisateur redirigé après son Social Login doit définir un mot de passe
 */
const CompleteSetupPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithOAuth2 } = useAuth();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');

  // Récupérer les paramètres de l'URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    const urlEmail = searchParams.get('email');

    if (!urlToken) {
      toast.error('Session invalide ou expirée');
      navigate('/login?error=invalid_session');
      return;
    }

    setToken(urlToken);
    setEmail(urlEmail || '');
  }, [searchParams, navigate]);

  // Calcul de la force du mot de passe
  useEffect(() => {
    const password = formData.password;
    let strength = 0;

    if (password.length >= 6) strength += 20;
    if (password.length >= 10) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;

    setPasswordStrength(strength);
  }, [formData.password]);

  // Gestion des changements de champs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Validation du formulaire
  const validateForm = () => {
    if (!formData.password) {
      toast.error('Veuillez saisir un mot de passe');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return false;
    }

    // Vérifier la complexité
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /[0-9]/.test(formData.password);

    const typeCount = [hasUpperCase, hasLowerCase, hasNumbers].filter(Boolean).length;
    if (typeCount < 2) {
      toast.error('Le mot de passe doit contenir au moins 2 types de caractères (majuscules, minuscules, chiffres)');
      return false;
    }

    return true;
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!token) {
      toast.error('Session invalide');
      return;
    }

    setIsLoading(true);
    try {
      const response = await completeOAuthSetup(
        token,
        formData.password,
        formData.confirmPassword
      );

      if (response.success) {
        toast.success('✅ Compte configuré avec succès !', {
          description: 'Vous êtes maintenant connecté.'
        });

        // Stockage des tokens et mise à jour du contexte auth
        if (response.data) {
          const { accessToken, refreshToken, user } = response.data;
          
          // Utiliser loginWithOAuth2 pour mettre à jour le contexte d'authentification
          loginWithOAuth2({
            accessToken,
            refreshToken,
            provider: searchParams.get('provider') || 'OAuth2',
            navigate
          });
        }
      } else {
        toast.error(response.message || 'Erreur lors de la configuration');
      }
    } catch (error) {
      console.error('❌ [OAuth Setup] Erreur:', error);
      toast.error(error.message || 'Erreur lors de la configuration du compte');
    } finally {
      setIsLoading(false);
    }
  };

  // Couleur de la barre de force
  const getStrengthColor = () => {
    if (passwordStrength <= 20) return 'bg-red-500';
    if (passwordStrength <= 40) return 'bg-orange-500';
    if (passwordStrength <= 60) return 'bg-yellow-500';
    if (passwordStrength <= 80) return 'bg-emerald-400';
    return 'bg-emerald-500';
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 20) return 'Faible';
    if (passwordStrength <= 40) return 'Moyen';
    if (passwordStrength <= 60) return 'Correct';
    if (passwordStrength <= 80) return 'Fort';
    return 'Très fort';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4">
            <LogoInuaAfya size={64} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Finaliser votre inscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Définissez un mot de passe pour sécuriser votre compte
          </p>
        </div>

        {/* Card principale */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Info OAuth2 */}
          <div className="mb-6 p-4 bg-blue-50/80 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Authentification réussie !
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Connecté via{' '}
                  <span className="font-semibold">
                    {searchParams.get('provider') === 'google' ? 'Google' : 'Facebook'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Champ mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Votre mot de passe"
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Barre de force */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Force</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength <= 40 ? 'text-red-500' :
                      passwordStrength <= 60 ? 'text-yellow-500' :
                      'text-emerald-500'
                    }`}>
                      {getStrengthLabel()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Champ confirmation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirmez votre mot de passe"
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Exigences mot de passe */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
              <ul className="space-y-1.5">
                {[
                  { label: '6 caractères minimum', check: formData.password.length >= 6 },
                  { label: 'Une majuscule', check: /[A-Z]/.test(formData.password) },
                  { label: 'Un chiffre', check: /[0-9]/.test(formData.password) },
                  { label: 'Mots de passe identiques', check: formData.password && formData.password === formData.confirmPassword },
                ].map((req, index) => (
                  <li
                    key={index}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      req.check ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      req.check ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      {req.check ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      )}
                    </div>
                    {req.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finalisation...
                </>
              ) : (
                <>
                  Finaliser mon compte
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Warning */}
          <div className="mt-5 p-3 bg-yellow-50/80 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800/50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Ce lien est valable 15 minutes. Passé ce délai, reconnectez-vous via {searchParams.get('provider') === 'google' ? 'Google' : 'Facebook'}.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          © 2026 Inua Afya. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default CompleteSetupPage;
