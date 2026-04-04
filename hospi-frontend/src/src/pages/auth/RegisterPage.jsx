import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// ✅ Correction de l'import (HeartPulse sans espace)
import { Activity, Mail, Lock, User, Phone, UserPlus, Loader2, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti'; // 🎉 L'effet magique

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

  // 🏥 Écran de transition "Pro"
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center p-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-200 rounded-full blur-2xl animate-pulse"></div>
          <Activity className="w-20 h-20 text-blue-600 relative animate-bounce" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Initialisation de votre espace santé...</h2>
        <p className="text-gray-500 animate-pulse">Préparation de vos dossiers médicaux sécurisés</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 mb-4 shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
            INUA AFIA
          </h1>
          <p className="text-gray-500 font-medium">Votre santé, notre priorité</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Inscription Patient</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Prénom" />
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nom" />
            </div>

            <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nom d'utilisateur" />
            
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email" />
            </div>

            <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Téléphone" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mot de passe" />
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Confirmer" />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              <span>{loading ? "Création..." : "S'inscrire"}</span>
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà inscrit ? <Link to="/login" className="text-blue-600 font-bold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;