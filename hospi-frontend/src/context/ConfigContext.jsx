import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/environment.js';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    appName: 'INUA AFIA',
    appDescription: 'Système de Gestion Hospitalier',
    logoUrl: null
  });

    const API_BASE_URL = BACKEND_URL;

  const refreshConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      // 1. On ne fait rien s'il n'y a pas de token
      if (!token) return;

      // 2. ✅ PROTECTION : On vérifie le rôle avant de lancer l'appel
      // Si l'utilisateur n'est pas ADMIN, on ne tente même pas l'appel à /api/admin/settings
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role !== 'ROLE_ADMIN' && user.role !== 'ADMIN') {
          // console.log("Config: Accès admin non autorisé pour ce rôle, utilisation des valeurs par défaut.");
          return; 
        }
      }

      const response = await axios.get(`${API_BASE_URL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        const timestamp = new Date().getTime();
        const updatedConfig = {
          ...response.data,
          logoUrl: response.data.logoUrl 
            ? `${API_BASE_URL}${response.data.logoUrl}?t=${timestamp}` 
            : null
        };
        
        setConfig(updatedConfig);
        if (updatedConfig.appName) document.title = updatedConfig.appName;
      }
    } catch (error) {
      // 3. ✅ GESTION SILENCIEUSE
      if (error.response?.status !== 403) {
        console.warn("Config: Erreur lors de la récupération des paramètres.");
      }
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, refreshConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error("useConfig doit être utilisé au sein de ConfigProvider");
  return context;
};