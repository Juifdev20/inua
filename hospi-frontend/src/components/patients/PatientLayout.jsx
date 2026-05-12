import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../../context/AdminContext'; // On réutilise le contexte Admin
import PatientSidebar from './PatientSidebar';
import PatientHeader from './PatientHeader';
import { cn } from '../../lib/utils';

const PatientLayoutContent = () => {
  // On récupère mobileSidebarOpen pour gérer l'overlay comme dans l'admin
  const { mobileSidebarOpen, toggleMobileSidebar } = useAdmin();

  return (
    /* On remplace bg-slate-50 par bg-surface. 
       C'est cette classe qui permet au fond de changer de couleur partout.
    */
    <div className="flex h-screen bg-surface overflow-hidden">
      
      {/* Sidebar Patient */}
      <PatientSidebar />
      
      {/* Overlay Mobile (Apparaît quand on ouvre le menu sur téléphone) */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleMobileSidebar} 
        />
      )}
      
      {/* Zone de contenu principale */}
      <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
        
        {/* Header Patient */}
        <PatientHeader />
        
        {/* Contenu de la page */}
        <main className="flex-1 overflow-y-auto bg-surface scrollbar-thin">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
            {/* L'Outlet rendra tes pages (Appointments, Profile, etc.) */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// On enveloppe tout dans le Provider pour que les enfants (Header/Sidebar) 
// puissent utiliser le thème
const PatientLayout = () => {
  return (
    <AdminProvider>
      <PatientLayoutContent />
    </AdminProvider>
  );
};

export default PatientLayout;