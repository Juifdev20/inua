import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoInuaAfyaAnimated } from './LogoInuaAfya';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initialisation...');

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();
    const MIN_DISPLAY_TIME = 2500; // 2.5 secondes minimum

    // Track real resource loading progress
    const updateProgress = () => {
      if (!mounted) return;

      // Use Performance API to track resource loading
      if (performance && performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource');
        const totalResources = resources.length || 1;
        const loadedResources = resources.filter(r => r.responseEnd > 0).length;
        
        // Calculate progress based on loaded resources
        let realProgress = Math.min((loadedResources / totalResources) * 100, 95);
        
        // Add buffer for React initialization
        const finalProgress = Math.min(realProgress + 5, 100);
        setProgress(Math.round(finalProgress));

        // Update loading text based on progress
        if (finalProgress < 30) setLoadingText('Chargement des ressources...');
        else if (finalProgress < 60) setLoadingText('Configuration de l\'application...');
        else if (finalProgress < 90) setLoadingText('Préparation de l\'interface...');
        else setLoadingText('Finalisation...');

        // If complete, check minimum display time before triggering onComplete
        if (finalProgress >= 100) {
          setLoadingText('Prêt !');
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);
          
          setTimeout(() => {
            if (mounted) onComplete?.();
          }, remainingTime + 500);
        }
      } else {
        // Fallback: simulate if Performance API not available
        setProgress(prev => {
          if (prev >= 100) {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);
            setTimeout(() => onComplete?.(), remainingTime);
            return 100;
          }
          return Math.min(prev + 5, 100);
        });
      }
    };

    // Initial update
    updateProgress();

    // Update progress every 100ms
    const interval = setInterval(updateProgress, 100);

    // Listen for load event
    const handleLoad = () => {
      if (mounted) {
        setProgress(100);
        setLoadingText('Prêt !');
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsedTime);
        setTimeout(() => onComplete?.(), remainingTime + 300);
      }
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('load', handleLoad);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center z-50">
      {/* Background Pattern - Responsive sizing */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Top Text - INUA AFYA - Responsive */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 sm:mb-10 md:mb-12 px-4"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] text-white text-center">
            <span className="text-emerald-400">INUA</span>{' '}
            <span className="text-white">AFYA</span>
          </h1>
          <p className="text-center text-emerald-200/60 text-xs sm:text-sm mt-2 sm:mt-3 tracking-widest uppercase">
            Système de Gestion Hospitalier
          </p>
        </motion.div>

        {/* Main Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150 animate-pulse" />
          
          {/* Logo - Responsive sizing */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <LogoInuaAfyaAnimated size={128} className="sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48" />
          </motion.div>
        </motion.div>

        {/* Progress Bar - Responsive width */}
        <div className="w-36 sm:w-40 md:w-44 lg:w-48 h-1 bg-slate-700 rounded-full mt-10 sm:mt-12 md:mt-14 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>

        {/* Progress Percentage */}
        <motion.p 
          className="text-slate-400 text-xs mt-3 sm:mt-4 font-medium"
          key={progress}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
        >
          {progress}%
        </motion.p>

        {/* Bottom Text - Espace augmenté entre logo et texte */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16 sm:mt-20 md:mt-24 flex flex-col items-center px-4"
        >
          <p className="text-slate-500 text-xs sm:text-sm tracking-widest uppercase font-medium text-center">
            By Inua Afya Team
          </p>
          <p className="text-slate-600 text-xs mt-2 text-center">
            Votre santé, notre priorité
          </p>
        </motion.div>
      </div>

      {/* Corner Decorations - Responsive sizing */}
      <div className="absolute top-4 sm:top-6 md:top-8 left-4 sm:left-6 md:left-8 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-l-2 border-t-2 border-emerald-500/20 rounded-tl-2xl sm:rounded-tl-3xl" />
      <div className="absolute top-4 sm:top-6 md:top-8 right-4 sm:right-6 md:right-8 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-r-2 border-t-2 border-emerald-500/20 rounded-tr-2xl sm:rounded-tr-3xl" />
      <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-4 sm:left-6 md:left-8 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-l-2 border-b-2 border-emerald-500/20 rounded-bl-2xl sm:rounded-bl-3xl" />
      <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 right-4 sm:right-6 md:right-8 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 border-r-2 border-b-2 border-emerald-500/20 rounded-br-2xl sm:rounded-br-3xl" />
    </div>
  );
};

export default SplashScreen;
