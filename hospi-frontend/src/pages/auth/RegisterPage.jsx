// 🏥 Page d'inscription - Version Cinématique Sans Scroll
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, Mail, Lock, User, Phone, UserPlus, Loader2, ArrowLeft, Sparkles, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import LogoInuaAfya from '../../components/LogoInuaAfya';
import { BACKEND_URL } from '../../config/environment';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '', firstName: '', lastName: '', email: '',
    phone: '', password: '', confirmPassword: '', role: 'PATIENT',
  });
  
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false); // Pour l'écran de transition

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/public/hospitals`)
      .then(r => r.json())
      .then(d => { if (d?.data) setHospitals(d.data); })
      .catch(() => {});
  }, []);

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
      colors: ['#2563eb', '#22c55e', '#ffffff'] // Couleurs Inua Afya (Bleu, Vert, Blanc)
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
        role: 'PATIENT',
        hospitalId: formData.hospitalId ? Number(formData.hospitalId) : null
      };

      const result = await register(payload);
      
      if (result.success) {
        // 🎉 1. Succès ! On lance les confettis
        fireConfetti();
        
        toast.success("Compte créé avec succès !", {
          description: "Bienvenue dans la famille Inua Afya.",
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
      const msg = error.response?.data?.message || error.response?.data?.error || error.message || "Serveur injoignable.";
      toast.error("Erreur système", { description: msg });
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
        {/* Logo & Header - Compact */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center mb-3">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl animate-pulse" />
              <LogoInuaAfya size={56} className="relative drop-shadow-lg" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent tracking-tight">
            INUA AFYA
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

            {/* Hopital */}
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                name="hospitalId"
                value={formData.hospitalId}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-white appearance-none"
              >
                <option value="">Choisir un hopital</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>{h.nom}</option>
                ))}
              </select>
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

            {/* Divider - Ou inscrivez-vous avec */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                  Ou inscrivez-vous avec
                </span>
              </div>
            </div>

            {/* OAuth2 Register Buttons - En bas du formulaire */}
            <div className="flex justify-center">
              <a
                href={`${BACKEND_URL}/oauth2/authorization/google`}
                className="w-full max-w-xs flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 font-medium text-sm"
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
            </div>
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