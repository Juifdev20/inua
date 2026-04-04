import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../../context/AdminContext'; 
import DoctorSidebar from './DoctorSidebar';
import DoctorHeader from './DoctorHeader';
import { cn } from '../../lib/utils';

const DoctorLayoutContent = () => {
  // On récupère les états du menu mobile pour gérer l'overlay
  const { mobileSidebarOpen, toggleMobileSidebar } = useAdmin();

  return (
    /* bg-surface permet au fond de s'adapter automatiquement au thème (clair/sombre) */
    <div className="flex h-screen bg-surface overflow-hidden">
      
      {/* Sidebar Spécifique Docteur */}
      <DoctorSidebar />
      
      {/* Overlay Mobile : Apparaît uniquement sur mobile quand la sidebar est ouverte */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={toggleMobileSidebar} 
        />
      )}
      
      {/* Zone de contenu principale */}
      <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
        
        {/* Header Spécifique Docteur (avec recherche et notifications) */}
        <DoctorHeader />
        
        {/* Contenu dynamique des pages (Dashboard, Agenda, etc.) */}
        <main className="flex-1 overflow-y-auto bg-surface scrollbar-thin">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

/**
 * Le DoctorLayout est enveloppé dans l'AdminProvider pour partager 
 * les états de la sidebar (collapsed/mobile) avec les composants enfants.
 */
const DoctorLayout = () => {
  return (
    <AdminProvider>
      <DoctorLayoutContent />
    </AdminProvider>
  );
};

export default DoctorLayout;