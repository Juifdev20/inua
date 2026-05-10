// 🏥 Page de connexion - Avec OAuth2 (Google/Facebook) et OTP (Magic Code)
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Lock, LogIn, Loader2, Eye, EyeOff, User, ArrowLeft, Fingerprint,
  ScanFace, Mail, KeyRound, Chrome, Facebook, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import LogoInuaAfya from '../../components/LogoInuaAfya';
import OtpVerification from '../../components/auth/OtpVerification';
import { requestOtpCode, initiateOAuthLogin, checkOAuthCallbackParams } from '../../services/otpAuthApi';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // États du formulaire classique
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // États pour l'OTP
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // États pour WebAuthn (biométrie)
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);

  // Vérifier OAuth2 callback au chargement
  useEffect(() => {
    const oauthParams = checkOAuthCallbackParams();
    if (oauthParams) {
      // Stockage des tokens OAuth2
      localStorage.setItem('token', oauthParams.accessToken);
      localStorage.setItem('refreshToken', oauthParams.refreshToken);
      toast.success('✅ Connexion réussie via ' + (oauthParams.provider === 'google' ? 'Google' : 'Facebook'));
      navigate('/');
    }

    // Vérifier les erreurs OAuth2
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    if (oauthError === 'oauth_failed') {
      toast.error('Échec de la connexion OAuth2');
    }
  }, [navigate]);

  // Vérifier si WebAuthn est supporté
  useEffect(() => {
    const supported = window.PublicKeyCredential !== undefined;
    setIsBiometricSupported(supported);
  }, []);

  // Gestion du formulaire classique
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.username, formData.password, rememberMe);
      if (result.success) {
        toast.success('Connexion réussie !');
        navigate('/');
      } else {
        toast.error(result.message || 'Échec de la connexion');
      }
    } catch (error) {
      toast.error('Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  // ★ GESTION OTP (Magic Code)
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!otpEmail) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }

    setIsSendingOtp(true);
    try {
      await requestOtpCode(otpEmail);
      setShowOtpForm(true);
      toast.success('📧 Code envoyé ! Vérifiez votre email.');
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpSuccess = (authData) => {
    // Stockage des tokens après OTP
    if (authData.accessToken) {
      localStorage.setItem('token', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
    }
    toast.success('✅ Connexion réussie !');
    navigate('/');
  };

  // ★ GESTION OAUTH2
  const handleGoogleLogin = () => {
    initiateOAuthLogin('google');
  };

  const handleFacebookLogin = () => {
    initiateOAuthLogin('facebook');
  };

  // AUTHENTIFICATION BIOMÉTRIQUE
  const handleBiometricAuth = async () => {
    if (!isBiometricSupported) {
      toast.error('Biométrie non supportée sur cet appareil');
      return;
    }
    setIsBiometricLoading(true);
    // Simulation pour l'instant
    setTimeout(() => {
      toast.info('Authentification biométrique en développement');
      setIsBiometricLoading(false);
    }, 1000);
  };

  // ============ RENDER ============

  // Si on affiche le formulaire OTP
  if (showOtpForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl shadow-emerald-500/10 p-8">
            <OtpVerification
              email={otpEmail}
              onSuccess={handleOtpSuccess}
              onBack={() => setShowOtpForm(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex">
      {/* Partie gauche - Illustration (visible sur desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center text-white">
          <LogoInuaAfya className="w-32 h-32 mx-auto mb-8 text-white" />
          <h1 className="text-4xl font-bold mb-4">Inua Afya</h1>
          <p className="text-xl text-emerald-100">Hôpital Moderne</p>
          <p className="mt-4 text-emerald-200">Soins de qualité, technologie d'avant-garde</p>
        </div>
      </div>

      {/* Partie droite - Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header mobile */}
          <div className="lg:hidden text-center mb-8">
            <LogoInuaAfya className="w-20 h-20 mx-auto mb-4 text-emerald-500" />
            <h1 className="text-2xl font-bold text-gray-900">Inua Afya</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Connexion</h2>
            <p className="text-gray-500 text-center mb-8">Accédez à votre espace personnel</p>

            {/* Formulaire classique */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Identifiant"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mot de passe"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-600">Se souvenir de moi</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            {/* Séparateur */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ou continuer avec</span>
              </div>
            </div>

            {/* Boutons OAuth2 */}
            <div className="grid grid-cols-1 gap-3 mb-4">
              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all group"
              >
                <Chrome className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>
              {/* Facebook Login - Temporairement désactivé (configuration en attente)
              <button
                onClick={handleFacebookLogin}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1877F2] rounded-xl hover:bg-[#166fe5] transition-all group"
              >
                <Facebook className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-white">Facebook</span>
              </button>
              */}
            </div>

            {/* Connexion par OTP */}
            <form onSubmit={handleRequestOtp} className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="Email pour code temporaire"
                    className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSendingOtp || !otpEmail}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                >
                  {isSendingOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Code
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Biométrie (si supporté) */}
            {isBiometricSupported && (
              <button
                onClick={handleBiometricAuth}
                disabled={isBiometricLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
              >
                {isBiometricLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    Connexion biométrique
                  </>
                )}
              </button>
            )}

            {/* Lien inscription */}
            <p className="text-center text-gray-600 text-sm">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                S'inscrire
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
