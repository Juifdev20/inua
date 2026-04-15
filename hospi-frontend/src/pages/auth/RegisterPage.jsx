// 🏥 Page d'inscription - Version Cinématique Sans Scroll
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, Mail, Lock, User, Phone, UserPlus, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import LogoInuaAfya from '../../components/LogoInuaAfya';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '', firstName: '', lastName: '', email: '',
    phone: '', password: '', confirmPassword: '', role: 'PATIENT',
  });
  
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); // Pour l'écran de transition

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // 🔥 Fonction pour l'effet Confetti Pro
  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563eb', '#22c55e', '#ffffff'] // Couleurs Inua Afia (Bleu, Vert, Blanc)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Vérification requise", { description: "Les mots de passe ne correspondent pas." });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        username: formData.username || formData.email,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phone,
        role: 'PATIENT'
      };

      const result = await register(payload);
      
      if (result.success) {
        // 🎉 1. Succès ! On lance les confettis
        fireConfetti();
        
        toast.success("Compte créé avec succès !", {
          description: "Bienvenue dans la famille Inua Afia.",
        });

        // ⏳ 2. On affiche l'écran de transition "Espace Santé"
        setIsRedirecting(true);

        // 3. Auto-connexion
        const loginResult = await login({
          username: payload.username,
          password: payload.password
        });

        // Petite pause pour laisser l'utilisateur savourer le moment (1.5s)
        setTimeout(() => {
          if (loginResult.success) {
            navigate('/patient/dashboard');
          } else {
            navigate('/login');
          }
        }, 1500);

      } else {
        toast.error("Oups !", { description: result.error });
        setLoading(false);
      }
    } catch (error) {
      toast.error("Erreur système", { description: "Serveur injoignable." });
      setLoading(false);
    }
  };

  // 🏥 Écran de transition
  if (isRedirecting) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 text-center p-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
          <LogoInuaAfya size={80} className="relative animate-bounce" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Initialisation de votre espace santé...</h2>
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Préparation de vos dossiers médicaux sécurisés</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 overflow-hidden">
      {/* 🔙 Back to Landing */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </Link>

      <div className="w-full max-w-sm">
        {/* Logo & Header - Compact */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl animate-pulse" />
              <LogoInuaAfya size={56} className="relative drop-shadow-lg" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent tracking-tight">
            INUA AFIA
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Créez votre compte patient</p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-5 border border-white/50 dark:border-gray-700/50">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Nom complet */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  name="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  required 
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                  placeholder="Prénom" 
                />
              </div>
              <input 
                type="text" 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleChange} 
                required 
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                placeholder="Nom" 
              />
            </div>

            {/* Username */}
            <input 
              type="text" 
              name="username" 
              value={formData.username} 
              onChange={handleChange}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
              placeholder="Nom d'utilisateur"
            />
            
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                placeholder="Email" 
              />
            </div>

            {/* Téléphone */}
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                required 
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                placeholder="Téléphone" 
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                  placeholder="Mot de passe" 
                />
              </div>
              <input 
                type="password" 
                name="confirmPassword" 
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required 
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white placeholder:text-gray-400" 
                placeholder="Confirmer" 
              />
            </div>

            {/* Submit */}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              <span>{loading ? "Création..." : "Créer mon compte"}</span>
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Déjà inscrit ?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
        
        {/* Footer note */}
        <p className="mt-3 text-center text-xs text-gray-400 dark:text-gray-500">
          En vous inscrivant, vous acceptez nos conditions d'utilisation
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;