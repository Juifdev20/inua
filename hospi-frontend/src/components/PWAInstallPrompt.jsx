import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      if (window.navigator.standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
      console.log('PWA: Événement beforeinstallprompt capturé');
    };

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      console.log('PWA: Application installée avec succès');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      toast.success('InuaAfia installée avec succès !');
    };

    // Vérifier au chargement
    checkIfInstalled();

    // Ajouter les écouteurs d'événements
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Nettoyer les écouteurs
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('PWA: Pas de prompt d\'installation disponible');
      return;
    }

    try {
      // Afficher le prompt d'installation
      deferredPrompt.prompt();
      
      // Attendre la réponse de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: L\'utilisateur a accepté l\'installation');
        toast.success('Installation d\'InuaAfia en cours...');
      } else {
        console.log('PWA: L\'utilisateur a refusé l\'installation');
        toast.info('Installation annulée');
      }
      
      // Nettoyer le prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('PWA: Erreur lors de l\'installation', error);
      toast.error('Erreur lors de l\'installation');
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Ne pas supprimer deferredPrompt pour permettre une nouvelle tentative plus tard
  };

  const handleManualInstall = () => {
    // Instructions pour les navigateurs qui ne supportent pas beforeinstallprompt
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      // Safari iOS
      toast.info('Pour installer: Partager > Ajouter à l\'écran d\'accueil');
    } else if (userAgent.includes('firefox')) {
      // Firefox
      toast.info('Pour installer: Menu > Installer cette application');
    } else {
      // Chrome/Edge
      toast.info('Pour installer: Cliquez sur l\'icône d\'installation dans la barre d\'adresse');
    }
  };

  // Ne pas afficher si l'app est déjà installée ou si le prompt n'est pas disponible
  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="bg-blue-100 p-2 rounded-full">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Installer InuaAfia
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Accédez rapidement à votre application hospitalière
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  {deferredPrompt ? (
                    <Button
                      onClick={handleInstallClick}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Installer
                    </Button>
                  ) : (
                    <Button
                      onClick={handleManualInstall}
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs px-3 py-1 h-7"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Comment installer
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;
