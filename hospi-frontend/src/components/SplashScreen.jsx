import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse } from 'lucide-react';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentDot, setCurrentDot] = useState(0);

  useEffect(() => {
    // Animation des points
    const dotInterval = setInterval(() => {
      setCurrentDot((prev) => (prev + 1) % 5);
    }, 400);

    // Progression du chargement
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(dotInterval);
          setTimeout(() => {
            onComplete?.();
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 60);

    return () => {
      clearInterval(dotInterval);
      clearInterval(progressInterval);
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
          
          {/* Logo Circle - Responsive sizing */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <HeartPulse className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 text-white" strokeWidth={2} />
            </motion.div>
            
            {/* Pulse Ring Animation */}
            <motion.div
              className="absolute inset-0 rounded-3xl border-2 border-emerald-300/50"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Loading Dots - Responsive spacing */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-8 sm:mt-10 md:mt-12">
          {[0, 1, 2, 3, 4].map((index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-300 ${
                index === currentDot 
                  ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                  : 'bg-slate-600'
              }`}
              animate={index === currentDot ? {
                scale: [1, 1.3, 1],
              } : {}}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Progress Bar - Responsive width */}
        <div className="w-36 sm:w-40 md:w-44 lg:w-48 h-1 bg-slate-700 rounded-full mt-6 sm:mt-7 md:mt-8 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>

        {/* Progress Percentage */}
        <motion.p 
          className="text-slate-400 text-xs mt-2 sm:mt-3 font-medium"
          key={progress}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
        >
          {progress}%
        </motion.p>

        {/* Bottom Text - Responsive positioning */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="absolute bottom-8 sm:bottom-10 md:bottom-12 flex flex-col items-center px-4"
        >
          <p className="text-slate-500 text-xs sm:text-sm tracking-widest uppercase font-medium text-center">
            By Inua Afia Team
          </p>
          <p className="text-slate-600 text-xs mt-1 text-center">
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
