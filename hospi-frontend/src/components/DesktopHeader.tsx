import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const DesktopHeader = () => {
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const checkHistory = () => {
      setCanGoBack(window.history.length > 1);
    };

    checkHistory();
    window.addEventListener('popstate', checkHistory);
    return () => window.removeEventListener('popstate', checkHistory);
  }, []);

  const handleBack = () => {
    if (canGoBack) {
      window.history.back();
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-10 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4"
      style={{
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Section Navigation (Gauche) */}
      <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          className="p-2 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Retour"
        >
          <ArrowLeft className="w-4 h-4 text-gray-400 hover:text-emerald-500 transition-colors" />
        </button>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-full hover:bg-slate-700 transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4 text-gray-400 hover:text-emerald-500 transition-colors" />
        </button>
      </div>

      {/* Section Identité (Centre) */}
      <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">IA</span>
        </div>
        <span className="font-bold text-gray-200 text-sm">Inua Afya</span>
      </div>

      {/* Section État (Droite) - Espace vide pour boutons système */}
      <div className="w-[150px]"></div>
    </header>
  );
};

export default DesktopHeader;
