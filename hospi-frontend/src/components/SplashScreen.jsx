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
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50 overflow-hidden">
      {/* Content - Centered with padding */}
      <div className="flex flex-col items-center justify-center w-full max-w-md px-6 py-10">
        {/* Top Text - INUA AFYA */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-[0.15em] sm:tracking-[0.2em] text-white text-center">
            <span className="text-emerald-400">INUA</span>{' '}
            <span className="text-white">AFYA</span>
          </h1>
        </motion.div>

        {/* Logo - Smaller and centered */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
        >
          <LogoInuaAfyaAnimated size="100%" />
        </motion.div>

        {/* Bottom Text - Votre santé, notre priorité */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-6 sm:mt-8"
        >
          <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm tracking-widest uppercase text-center">
            Votre santé, notre priorité
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default SplashScreen;
