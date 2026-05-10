import React, { useState, useRef, useEffect } from 'react';
import { Mail, KeyRound, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { requestOtpCode, verifyOtpCode } from '../../services/otpAuthApi';

/**
 * ★ COMPOSANT DE VÉRIFICATION PAR CODE TEMPORAIRE (OTP / MAGIC CODE)
 * Formulaire moderne avec design Tailwind pour saisir le code à 6 chiffres
 */
const OtpVerification = ({ email, onSuccess, onBack }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Compte à rebours pour le renvoi
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  // Gestion de la saisie dans les champs
  const handleChange = (index, value) => {
    // Accepter uniquement les chiffres
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Prendre uniquement le dernier caractère
    setCode(newCode);

    // Focus automatique sur le champ suivant
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Vérifier si le code est complet
    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  // Gestion des touches spéciales
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Retour au champ précédent si vide
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Coller un code depuis le presse-papiers
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  // Vérifier le code
  const handleVerify = async (fullCode) => {
    if (fullCode.length !== 6) {
      toast.error('Veuillez saisir les 6 chiffres du code');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await verifyOtpCode(email, fullCode);

      if (response.success) {
        toast.success('✅ Connexion réussie !', {
          description: 'Redirection en cours...'
        });
        onSuccess(response.data);
      } else {
        toast.error(response.message || 'Code invalide');
        // Réinitialiser les champs en cas d'erreur
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('❌ [OTP] Erreur:', error);
      toast.error(error.message || 'Code invalide ou expiré');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  // Renvoyer le code
  const handleResend = async () => {
    setIsLoading(true);
    try {
      await requestOtpCode(email);
      toast.success('📧 Nouveau code envoyé !');
      setCountdown(60);
      setCanResend(false);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
          <KeyRound className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Code de vérification
        </h2>
        <p className="text-gray-600 text-sm">
          Saisissez le code à 6 chiffres envoyé à{' '}
          <span className="font-semibold text-emerald-600">{email}</span>
        </p>
      </div>

      {/* Champs de saisie du code */}
      <div className="flex justify-center gap-2 mb-6">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isVerifying}
            className={`
              w-12 h-14 text-center text-2xl font-bold rounded-xl border-2
              transition-all duration-200 focus:outline-none
              ${digit
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
              }
              ${isVerifying ? 'opacity-50 cursor-not-allowed' : 'focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'}
            `}
          />
        ))}
      </div>

      {/* Indicateur de vérification */}
      {isVerifying && (
        <div className="flex items-center justify-center gap-2 text-emerald-600 mb-6">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Vérification en cours...</span>
        </div>
      )}

      {/* Message de renvoi */}
      <div className="text-center mb-6">
        {canResend ? (
          <button
            onClick={handleResend}
            disabled={isLoading}
            className="text-emerald-600 hover:text-emerald-700 font-medium text-sm inline-flex items-center gap-1 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Renvoyer le code
              </>
            )}
          </button>
        ) : (
          <p className="text-gray-500 text-sm">
            Renvoyer le code dans{' '}
            <span className="font-semibold text-emerald-600">{countdown}s</span>
          </p>
        )}
      </div>

      {/* Bouton de retour */}
      <button
        onClick={onBack}
        disabled={isVerifying}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la connexion
      </button>

      {/* Info sécurité */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">
              Connexion sécurisée
            </p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Ce code est valable 10 minutes et ne peut être utilisé qu'une seule fois.
              Ne le partagez avec personne.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
