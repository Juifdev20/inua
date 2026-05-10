import React from 'react';
import { Outlet } from 'react-router-dom';
import { LaboratoryProvider, useLaboratory } from '../../context/LaboratoryContext';
import LabSidebar from '../../components/labo/LabSidebar';
import LabHeader from '../../components/labo/LabHeader';
import { cn } from '../../lib/utils';

const LabLayoutContent = () => {
  const { sidebarCollapsed, mobileSidebarOpen, toggleMobileSidebar } = useLaboratory();

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* Sidebar Labo — flex-based, UNE SEULE FOIS */}
      <LabSidebar />

      {/* Overlay Mobile 
          Même style que Finance : bg-black/50 + backdrop-blur.
          Sécurité supplémentaire si le sidebar interne n'a pas le sien.
      */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Zone de contenu principale */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen transition-all duration-300">

        {/* Header Labo — même UI que FinanceHeader */}
        <LabHeader />

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

const LabLayout = () => (
  <LaboratoryProvider>
    <LabLayoutContent />
  </LaboratoryProvider>
);

export default LabLayout;