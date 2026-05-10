import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, ShieldCheck, KeyRound, Timer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { requestOtpCode, verifyOtpCode } from '../../services/otpAuthApi';
import { useAuth } from '../../context/AuthContext';

/**
 * ★ PAGE DE CONNEXION PAR OTP (Passwordless)
 * Flux: Email → Vérification existence → Envoi code → Saisie code → Connexion
 */
const OtpLoginPage = () => {
  const navigate = useNavigate();
  const { loginWithOAuth2 } = useAuth();
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const inputRefs = useRef([]);

  // Compte à rebours pour le code OTP
  useEffect(() => {
    if (step === 'otp' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  // Formatage du temps
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Étape 1: Envoyer l'OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Email invalide', { description: 'Veuillez entrer une adresse email valide.' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await requestOtpCode(email);
      
      if (response.success) {
        toast.success('Code envoyé !', {
          description: 'Vérifiez votre boîte email. Le code expire dans 5 minutes.',
        });
        setStep('otp');
        setTimeLeft(300);
        setCanResend(false);
        setAccountNotFound(false);
        // Focus sur le premier input OTP
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        // Gestion des erreurs spécifiques
        if (response.message?.includes('non trouvé') ||
            response.message?.includes('not found') ||
            response.message?.includes('Aucun compte') ||
            response.message?.includes('existe pas')) {
          setAccountNotFound(true);
          toast.error('Compte inexistant', {
            description: 'Aucun compte n\'est associé à cet email.',
          });
        } else {
          toast.error('Erreur', { description: response.message || 'Impossible d\'envoyer le code.' });
        }
      }
    } catch (error) {
      console.error('[OTP] Erreur envoi:', error);
      const errorMessage = error?.message || error?.error || 'Erreur lors de l\'envoi du code';

      // Vérifier si c'est un compte inexistant
      if (errorMessage?.includes('non trouvé') ||
          errorMessage?.includes('not found') ||
          errorMessage?.includes('Aucun compte') ||
          errorMessage?.includes('existe pas') ||
          errorMessage?.includes('associé')) {
        setAccountNotFound(true);
        toast.error('Compte inexistant', {
          description: 'Aucun compte n\'est associé à cet email. Veuillez créer un compte.',
        });
      } else {
        toast.error('Erreur', { description: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Étape 2: Vérifier l'OTP (appelé par le bouton ou auto-submit)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otpCode.join('');
    if (code.length !== 6) {
      toast.error('Code incomplet', { description: 'Veuillez entrer les 6 chiffres du code.' });
      return;
    }
    await verifyOtpAndLogin(code);
  };

  // Gestion des inputs OTP
  const handleOtpChange = (index, value) => {
    // Accepter uniquement les chiffres
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1); // Un seul caractère
    setOtpCode(newOtp);

    // Auto-focus sur le champ suivant
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit quand les 6 chiffres sont remplis
    const updatedCode = newOtp.join('');
    if (updatedCode.length === 6 && !isLoading && timeLeft > 0) {
      // Petit délai pour laisser l'UI se mettre à jour
      setTimeout(() => {
        verifyOtpAndLogin(updatedCode);
      }, 150);
    }
  };

  // Vérification OTP (extrait pour réutilisation)
  const verifyOtpAndLogin = async (code) => {
    if (!code || code.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await verifyOtpCode(email, code);

      if (response.success && response.data) {
        toast.success('Connexion réussie !', {
          description: 'Vous êtes maintenant connecté.',
        });

        // Connexion via AuthContext (même flux que OAuth2)
        loginWithOAuth2({
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          provider: 'Email',
          navigate,
        });
      } else {
        // Gestion des erreurs spécifiques
        if (response.message?.includes('expiré') || response.message?.includes('expired')) {
          toast.error('Code expiré', {
            description: 'Le code a expiré. Veuillez demander un nouveau code.',
          });
          setCanResend(true);
        } else if (response.message?.includes('utilisé') || response.message?.includes('used')) {
          toast.error('Code déjà utilisé', {
            description: 'Ce code a déjà été utilisé. Veuillez demander un nouveau code.',
          });
        } else if (response.message?.includes('invalide') || response.message?.includes('invalid')) {
          toast.error('Code incorrect', { description: 'Le code saisi est incorrect. Veuillez réessayer.' });
        } else {
          toast.error('Erreur', { description: response.message || 'Vérification impossible.' });
        }

        // Reset des champs OTP
        setOtpCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('[OTP] Erreur vérification:', error);
      toast.error('Erreur système', { description: 'Veuillez réessayer plus tard.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Backspace pour revenir au champ précédent
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Flèche gauche
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Flèche droite
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Coller un code complet
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otpCode];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtpCode(newOtp);
    // Focus sur le dernier champ rempli ou le suivant
    const lastFilledIndex = Math.min(pasted.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();

    // Auto-submit si le code collé fait 6 chiffres
    if (pasted.length === 6 && !isLoading && timeLeft > 0) {
      setTimeout(() => {
        verifyOtpAndLogin(pasted);
      }, 150);
    }
  };

  // Renvoyer le code
  const handleResend = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      const response = await requestOtpCode(email);
      if (response.success) {
        toast.success('Nouveau code envoyé !');
        setTimeLeft(300);
        setCanResend(false);
        setOtpCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast.error('Erreur lors du renvoi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 shadow-lg mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Connexion sécurisée
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {step === 'email' 
              ? 'Entrez votre email pour recevoir un code' 
              : 'Saisissez le code reçu par email'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {step === 'email' ? (
            /* ÉTAPE 1: SAISIE EMAIL */
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Un code à 6 chiffres sera envoyé à cette adresse.
                </p>

                {/* Message compte inexistant */}
                {accountNotFound && (
                  <div className="mt-3 p-3 bg-red-50/80 dark:bg-red-900/30 rounded-lg border border-red-100 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400 text-center">
                      <strong>Aucun compte trouvé</strong><br />
                      Cet email n'est pas associé à un compte.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="mt-2 w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Créer un compte
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !email.includes('@')}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Recevoir le code
                    <KeyRound className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="p-3 bg-blue-50/80 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
                  <strong>Système OTP sécurisé</strong><br />
                  Code à usage unique • Valable 5 minutes • Email vérifié
                </p>
              </div>
            </form>
          ) : (
            /* ÉTAPE 2: SAISIE OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* Timer */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <Timer className={`w-5 h-5 ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
                <span className={`text-sm font-medium ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                  {timeLeft > 0 ? `Expire dans ${formatTime(timeLeft)}` : 'Code expiré'}
                </span>
              </div>

              {/* Inputs OTP */}
              <div className="flex justify-center gap-2">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isLoading || timeLeft === 0}
                    className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Code envoyé à <strong className="text-gray-700 dark:text-gray-300">{email}</strong>
              </p>

              <button
                type="submit"
                disabled={isLoading || otpCode.join('').length !== 6 || timeLeft === 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ShieldCheck className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend || isLoading}
                  className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${!canResend && timeLeft > 0 ? 'animate-spin' : ''}`} />
                  {canResend ? 'Renvoyer le code' : `Renvoyer dans ${formatTime(timeLeft)}`}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtpCode(['', '', '', '', '', '']);
                    setTimeLeft(300);
                  }}
                  disabled={isLoading}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                >
                  Utiliser un autre email
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Lien retour */}
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion classique
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          © 2026 Inua Afya. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default OtpLoginPage;
