import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Création du contexte
const AppContext = createContext();

// 2. Le Provider (le diffuseur)
export const AppProvider = ({ children }) => {
  // MODIFICATION : On enlève "Hôpital Turquoise" en dur. 
  // On met "" (vide) ou "Mon Hôpital" par défaut.
  const [appName, setAppName] = useState(localStorage.getItem('app_name') || "Hôpital");
  const [appLogo, setAppLogo] = useState(localStorage.getItem('app_logo') || "");

  // Chaque fois que le nom change, on le sauvegarde dans le localStorage
  useEffect(() => {
    if (appName) {
      localStorage.setItem('app_name', appName);
    }
  }, [appName]);

  // Chaque fois que le logo change, on le sauvegarde
  useEffect(() => {
    if (appLogo) {
      localStorage.setItem('app_logo', appLogo);
    }
  }, [appLogo]);

  return (
    <AppContext.Provider value={{ appName, setAppName, appLogo, setAppLogo }}>
      {children}
    </AppContext.Provider>
  );
};

// 3. Hook personnalisé pour utiliser ces données facilement
export const useApp = () => useContext(AppContext);