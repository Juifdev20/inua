import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider } from '../../context/AdminContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DesktopHeader from '../DesktopHeader';
import { useAdmin } from '../../context/AdminContext';

const AdminLayoutContent = () => {
  const { sidebarCollapsed, mobileSidebarOpen } = useAdmin();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => {}} 
        />
      )}
      
      {/* Main content area */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 pt-10 lg:pt-0`}>
        {/* Desktop Window Controls Overlay Header */}
        <DesktopHeader />
        
        {/* Topbar */}
        <Topbar />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-surface scrollbar-thin">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const AdminLayout = () => {
  return (
    <AdminProvider>
      <AdminLayoutContent />
    </AdminProvider>
  );
};

export default AdminLayout;
