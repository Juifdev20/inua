import React from 'react';
import { ArrowLeft, RotateCw } from 'lucide-react';

const DesktopHeader = () => {
  const handleBack = () => {
    window.history.back();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header 
      className="hidden lg:flex items-center h-10 bg-card border-b border-border fixed top-0 left-0 w-full z-[100]"
      style={{ 
        paddingLeft: 'env(titlebar-area-x, 10px)',
        WebkitAppRegion: 'drag',
        cursor: 'default'
      }}
    >
      <div className="flex items-center gap-2">
        {/* Bouton Retour */}
        <button
          onClick={handleBack}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-muted-foreground transition-colors"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Bouton Refresh */}
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-muted-foreground transition-colors"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="Actualiser"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default DesktopHeader;
