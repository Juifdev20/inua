import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { PharmacyProvider, usePharmacy } from '../../context/PharmacyContext';
import PharmacySidebar from './PharmacySidebar';
import PharmacyHeader from './PharmacyHeader';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { getExpiryAlerts } from '../../services/pharmacyApi/pharmacyApi.js';

const PharmacyLayoutContent = () => {
  const { sidebarCollapsed, mobileSidebarOpen, toggleMobileSidebar } = usePharmacy();

  useEffect(() => {
    const checkExpiry = async () => {
      try {
        const res = await getExpiryAlerts();
        const alerts = res.data || [];
        if (alerts.length === 0) return;
        const expired = alerts.filter(a => a.expired);
        const soon = alerts.filter(a => !a.expired);
        if (expired.length > 0) {
          toast.error(
            `${expired.length} médicament(s) périmé(s) !`,
            {
              description: expired.slice(0, 3).map(a => a.name).join(', '),
              duration: 10000,
              action: { label: 'Voir alertes', onClick: () => window.location.href = '/pharmacy/alerts' },
            }
          );
        }
        if (soon.length > 0) {
          toast.warning(
            `${soon.length} médicament(s) approchent de l'expiration`,
            {
              description: `Le plus proche : ${soon[0].name} — ${soon[0].joursRestants}j restant(s)`,
              duration: 8000,
              action: { label: 'Voir alertes', onClick: () => window.location.href = '/pharmacy/alerts' },
            }
          );
        }
      } catch (_) {
      }
    };
    checkExpiry();
  }, []);

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