import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../../context/AdminContext'; 
import Sidebar from './Sidebar'; // Votre Sidebar Réception corrigée
import ReceptionHeader from './ReceptionHeader'; // Votre Header Réception corrigé
import { cn } from '../../lib/utils';

const ReceptionLayoutContent = () => {
  // On récupère les états du menu mobile pour gérer l'overlay
  const { mobileSidebarOpen, toggleMobileSidebar, sidebarCollapsed } = useAdmin();

  return (
    /* Le conteneur principal utilise 'bg-surface' ou 'bg-background' 
       pour assurer la cohérence visuelle avec le thème. 
    */
    <div className="flex h-screen bg-background overflow-hidden">
      
      {/* Sidebar Réception : 
          Elle est fixée à gauche. Le reste du contenu doit s'adapter 
          à sa largeur (72 ou 20 selon l'état collapsed). 
      */}
      <Sidebar />
      
      {/* Overlay Mobile : Indispensable pour la cohérence avec le Docteur */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleMobileSidebar} 
        />
      )}
      
      {/* Zone de contenu principale : 
          On ajoute une marge à gauche (ml) sur desktop pour ne pas que 
          le contenu passe SOUS la sidebar qui est en 'fixed'.
      */}
      <div className={cn(
        "flex flex-col flex-1 min-h-screen transition-all duration-300",
        sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
      )}>
        
        {/* Header Réception : 
            Contient la barre de recherche et les actions. 
            Il doit rester en haut.
        */}
        <ReceptionHeader />
        
        {/* Main Content : 
            L'overflow-y-auto permet de scroller uniquement cette zone.
            Le padding (py-6) et les marges (px) sont identiques au docteur.
        */}
        <main className="flex-1 overflow-y-auto bg-muted/10 scrollbar-thin">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

/**
 * Le ReceptionLayout enveloppé dans AdminProvider.
 * Cela permet à Sidebar et ReceptionHeader de partager l'état 'sidebarCollapsed'.
 */
const ReceptionLayout = () => {
  return (
    <AdminProvider>
      <ReceptionLayoutContent />
    </AdminProvider>
  );
};

export default ReceptionLayout;