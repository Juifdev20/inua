import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

/**
 * ★ COMPOSANT DE CHANGEMENT DE MOT DE PASSE OBLIGATOIRE
 * Bloque l'accès au dashboard jusqu'à ce que l'utilisateur change son mot de passe
 */
const ForcePasswordChange = ({ onPasswordChanged }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { api } = useAuth();

  const validate = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'Le mot de passe est requis';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Minimum 6 caractères requis';
    } else if (formData.newPassword === 'Inua@2026') {
      newErrors.newPassword = 'Vous devez choisir un mot de passe différent du mot de passe par défaut';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer le mot de passe';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    // Validation de complexité
    const hasUpperCase = /[A-Z]/.test(formData.newPassword);
    const hasLowerCase = /[a-z]/.test(formData.newPassword);
    const hasNumber = /\d/.test(formData.newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword);

    if (formData.newPassword && (hasUpperCase + hasLowerCase + hasNumber + hasSpecial) < 2) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 2 types : majuscules, minuscules, chiffres, caractères spéciaux';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await api.post('/password/force-change', {
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });

      if (response.data?.success) {
        toast.success('Mot de passe changé avec succès !');
        onPasswordChanged?.();
      } else {
        toast.error(response.data?.message || 'Erreur lors du changement');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Erreur serveur';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const { newPassword } = formData;
    if (!newPassword) return { score: 0, label: '' };

    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) score++;

    const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-400', 'bg-emerald-600'];

    return { score, label: labels[score - 1] || '', color: colors[score - 1] || 'bg-gray-200' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-amber-500 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Sécurité requise</h1>
                <p className="text-amber-100 text-sm">Changement de mot de passe obligatoire</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Info message */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Pour votre sécurité, vous devez changer le mot de passe temporaire qui vous a été attribué avant de pouvoir accéder au système.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all focus:outline-none ${
                      errors.newPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/20'
                        : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                    }`}
                    placeholder="Minimum 6 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.newPassword}
                  </p>
                )}

                {/* Password strength */}
                {formData.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: `${(strength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {strength.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Le mot de passe doit contenir : 6+ caractères, majuscules, minuscules, chiffres, caractères spéciaux
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full pl-10 pr-12 py-3 rounded-xl border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all focus:outline-none ${
                      errors.confirmPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/20'
                        : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                        ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                        : 'border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                    }`}
                    placeholder="Répétez le mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.confirmPassword}
                  </p>
                )}
                {formData.confirmPassword && formData.newPassword === formData.confirmPassword && !errors.confirmPassword && (
                  <p className="mt-1.5 text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Les mots de passe correspondent
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Changer le mot de passe
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Une fois le mot de passe changé, vous serez redirigé vers votre tableau de bord.
            </p>
          </div>
        </div>

        {/* Logo */}
        <div className="mt-8 text-center">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Inua Afya</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Système Hospitalier Moderne</p>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
