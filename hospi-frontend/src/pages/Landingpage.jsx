// 🏥 Page d'accueil (Landing page)

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  FileText,
  Shield,
  Clock,
  CheckCircle,
  Moon,
  Sun
} from 'lucide-react';
import LogoInuaAfya from '../components/LogoInuaAfya';

// 👉 Image de background
import heroBg from '../images/medical-bg.jpg';

const LandingPage = () => {
  /* ================= DARK MODE STATE ================= */
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const features = [
    {
      icon: Users,
      title: 'Gestion des Patients',
      description: 'Gestion complète des dossiers patients avec historique médical'
    },
    {
      icon: Calendar,
      title: 'Rendez-vous',
      description: 'Planification intelligente des consultations et rendez-vous'
    },
    {
      icon: FileText,
      title: 'Documents Médicaux',
      description: 'Ordonnances, factures et résultats laboratoire centralisés'
    },
    {
      icon: Shield,
      title: 'Sécurisé',
      description: 'Gestion des accès par rôles et données encryptées'
    },
    {
      icon: Clock,
      title: 'Pointage RH',
      description: 'Système de pointage QR Code pour le personnel'
    },
    {
      icon: CheckCircle,
      title: 'Gestion Financière',
      description: 'Facturation et suivi des paiements en temps réel'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">

      {/* ================= NAVIGATION ================= */}
<nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 fixed w-full z-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">

      {/* Logo + Titre */}
      <div className="flex items-center space-x-2 min-w-0">

        {/* Logo Inua Afya */}
        <LogoInuaAfya 
          size={40} 
          className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10" 
        />

        {/* Titre */}
        <span className="
          font-bold
          text-lg sm:text-2xl
          text-blue-700 dark:text-green-400
          leading-none
          whitespace-nowrap
        ">
          INUA AFIA
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4">

        {/* Toggle Dark Mode */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="
            p-2 rounded-lg
            bg-gray-100 dark:bg-gray-800
            text-gray-800 dark:text-gray-200
            hover:scale-110 transition
          "
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Connexion (TOUJOURS VISIBLE) */}
        <Link
          to="/login"
          className="
            text-sm sm:text-base
            text-gray-800 dark:text-gray-200
            hover:text-blue-700 dark:hover:text-green-400
            font-medium transition
            whitespace-nowrap
          "
        >
          Connexion
        </Link>

        {/* Inscription */}
        <Link
          to="/register"
          className="
            px-3 sm:px-6 py-2
            bg-blue-600 text-white
            rounded-lg font-semibold
            hover:bg-blue-700 transition shadow-md
            text-sm sm:text-base
            whitespace-nowrap
          "
        >
          S'inscrire
        </Link>
      </div>

    </div>
  </div>
</nav>


      {/* ================= HERO ================= */}
      <section
        className="pt-32 pb-32 px-4 relative"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70"></div>

        <div className="relative max-w-7xl mx-auto text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            SYSTEME DE GESTION
            <br />
            <span className="text-green-400">
              HOSPITALIER MODERNE
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-3xl mx-auto ">
            Solution complète pour la gestion hospitalière :
            patients, consultations, personnel, finances
            et documents médicaux centralisés.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl font-semibold text-lg hover:scale-105 transition shadow-xl"
            >
              Commencer gratuitement
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg hover:bg-gray-100 transition shadow-xl"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Fonctionnalités Principales
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Tout ce dont vous avez besoin pour gérer votre hôpital efficacement
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-green-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Prêt à moderniser votre hôpital ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Sécurité • Performance • Simplicité
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-blue-700 rounded-xl font-semibold text-lg hover:scale-105 transition shadow-lg"
          >
            Commencer maintenant
          </Link>
        </div>
      </section>

      {/* ===== Séparateur de la  derniere page de notre footer===== */}
<div className="h-px w-full bg-gray-200 dark:bg-gray-700"></div>

      {/* ================= FOOTER ================= */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-gray-600 dark:text-gray-400">
          <p>© 2025 Inua Afia team Student from UCBC DRC</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
