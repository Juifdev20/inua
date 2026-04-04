// src/context/LaboratoryContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const LaboratoryContext = createContext(null);

export const LaboratoryProvider = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('labSidebarCollapsed') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('labSidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };

  // Fermer le sidebar mobile au resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <LaboratoryContext.Provider value={{
      sidebarCollapsed,
      toggleSidebar,
      mobileSidebarOpen,
      toggleMobileSidebar,
    }}>
      {children}
    </LaboratoryContext.Provider>
  );
};

export const useLaboratory = () => {
  const ctx = useContext(LaboratoryContext);
  if (!ctx) throw new Error('useLaboratory must be used within LaboratoryProvider');
  return ctx;
};