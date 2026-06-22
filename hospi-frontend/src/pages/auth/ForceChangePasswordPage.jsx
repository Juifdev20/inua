import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import LogoInuaAfya from '../../components/LogoInuaAfya';
import axios from 'axios';
import { BACKEND_URL } from '../../config/environment';

const ForceChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, token, logout, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/auth/change-password`, {
        currentPassword,
        newPassword,
        confirmPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Mot de passe mis a jour avec succes');
      updateUser({ mustChangePassword: false });

      // Redirect based on role
      const role = (user?.role || 'PATIENT').toUpperCase().replace('ROLE_', '');
      const pathMap = {
        ADMIN: '/admin/dashboard',
        DOCTOR: '/doctor/dashboard',
        DOCTEUR: '/doctor/dashboard',
        RECEPTION: '/reception/dashboard',
        RECEPTIONIST: '/reception/dashboard',
        LABORATOIRE: '/labo/dashboard',
        LABO: '/labo/dashboard',
        PHARMACY: '/pharmacy/dashboard',
        PHARMACIE: '/pharmacy/dashboard',
        FINANCE: '/finance/dashboard',
        SUPERADMIN: '/superadmin',
        PATIENT: '/patient/dashboard'
      };
      navigate(pathMap[role] || '/patient/dashboard', { replace: true });
    } catch (err) {
      toast.error('Erreur', { description: err?.response?.data?.message || 'Erreur serveur' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <LogoInuaAfya size={64} className="mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Changement de mot de passe obligatoire</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Vous utilisez un mot de passe temporaire. Veuillez en definir un nouveau pour continuer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50 dark:border-gray-700/50 space-y-4">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Mot de passe actuel (temporaire)"
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showCurrent ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Nouveau mot de passe"
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showNew ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirmer le nouveau mot de passe"
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <ArrowRight className="w-4 h-4" />
            {loading ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForceChangePasswordPage;
