import React, { createContext, useContext, useState, useEffect } from 'react';

// Admin Context for global admin state management
const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  // Admin user info - Initialisation avec localStorage ou Mock
  const [adminUser, setAdminUser] = useState(() => {
    const savedUser = localStorage.getItem('adminUser');
    return savedUser ? JSON.parse(savedUser) : {
      id: '1',
      nom: 'Admin',
      prenom: 'Système',
      firstName: 'Système', // Ajout pour compatibilité API Java
      lastName: 'Admin',    // Ajout pour compatibilité API Java
      email: 'admin@inuaafia.com',
      role: 'ADMIN',
      avatar: null,
      telephone: '+243 900 000 000',
      phoneNumber: '+243 900 000 000', // Ajout pour compatibilité API Java
      dateCreation: '2024-01-01'
    };
  });

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Mobile sidebar open state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState('light');

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed !== null) {
      setSidebarCollapsed(JSON.parse(savedCollapsed));
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  // Save preferences to localStorage
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // ✅ MISE À JOUR DU PROFIL (CORRIGÉE)
  const updateAdminProfile = (updates) => {
    setAdminUser(prev => {
      // On fusionne l'ancien état avec les nouvelles données
      const newUser = { 
        ...prev, 
        ...updates,
        // On s'assure que si l'API renvoie firstName/lastName, 
        // les champs locaux prenom/nom sont aussi mis à jour
        prenom: updates.firstName || updates.prenom || prev.prenom,
        nom: updates.lastName || updates.nom || prev.nom,
        telephone: updates.phoneNumber || updates.telephone || prev.telephone
      };
      
      // Sauvegarde immédiate dans le localStorage pour persistance
      localStorage.setItem('adminUser', JSON.stringify(newUser));
      return newUser;
    });
  };

  const value = {
    adminUser,
    updateAdminProfile,
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    toggleMobileSidebar,
    theme,
    toggleTheme
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};