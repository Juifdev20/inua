import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../../context/AdminContext';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminHeader from './SuperAdminHeader';
import { cn } from '../../lib/utils';

const SuperAdminLayoutContent = () => {
  const { mobileSidebarOpen, toggleMobileSidebar } = useAdmin();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar Super Admin */}
      <SuperAdminSidebar />

      {/* Overlay Mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Zone de contenu principale */}
      <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
        {/* Header Super Admin */}
        <SuperAdminHeader />

        {/* Contenu de la page */}
        <main className="flex-1 overflow-y-auto bg-surface scrollbar-thin">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const SuperAdminLayout = () => {
  return (
    <AdminProvider>
      <SuperAdminLayoutContent />
    </AdminProvider>
  );
};

export default SuperAdminLayout;
