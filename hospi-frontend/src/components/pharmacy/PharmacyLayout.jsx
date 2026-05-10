import React from 'react';
import { Outlet } from 'react-router-dom';
import { PharmacyProvider, usePharmacy } from '../../context/PharmacyContext';
import PharmacySidebar from './PharmacySidebar';
import PharmacyHeader from './PharmacyHeader';
import { cn } from '../../lib/utils';

const PharmacyLayoutContent = () => {
  const { sidebarCollapsed, mobileSidebarOpen, toggleMobileSidebar } = usePharmacy();

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Sidebar Pharmacie — UNE SEULE FOIS */}
      <PharmacySidebar />

      {/* Overlay Mobile 
          Même style que Finance : bg-black/50 + backdrop-blur.
      */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Zone de contenu principale */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen transition-all duration-300">

        {/* Header Pharmacie — même UI que FinanceHeader */}
        <PharmacyHeader />

        {/* Main Content — même fond et padding que Finance */}
        <main className="flex-1 overflow-y-auto bg-muted/10 scrollbar-thin">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const PharmacyLayout = () => (
  <PharmacyProvider>
    <PharmacyLayoutContent />
  </PharmacyProvider>
);

export default PharmacyLayout;