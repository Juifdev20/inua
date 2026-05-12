import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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
      console.log('PWA: Événement beforeinstallprompt capturé');
    };

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      console.log('PWA: Application installée avec succès');
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('InuaAfya installée avec succès !');
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
        toast.success('Installation d\'InuaAfya en cours...');
      } else {
        console.log('PWA: L\'utilisateur a refusé l\'installation');
        toast.info('Installation annulée');
      }
      
      // Nettoyer le prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('PWA: Erreur lors de l\'installation', error);
      toast.error('Erreur lors de l\'installation');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
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

  // Ne pas afficher si l'app est déjà installée (APK) ou si l'utilisateur a fermé la bannière
  if (isInstalled || dismissed) {
    return null;
  }

  // Afficher toujours sur version web
  return (
    <div className="fixed top-16 right-4 z-50 max-w-xs">
      <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-lg rounded-lg">
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <div className="bg-emerald-100 p-1.5 rounded-full flex-shrink-0">
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-xs truncate">
                  Installer InuaAfya
                </h3>
                <p className="text-[10px] text-gray-600">
                  Installation gratuite
                </p>
              </div>
            </div>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            {deferredPrompt ? (
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-1 h-6 flex-1"
              >
                <Download className="w-3 h-3 mr-1" />
                Installer
              </Button>
            ) : (
              <Button
                onClick={handleManualInstall}
                size="sm"
                variant="outline"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-[10px] px-2 py-1 h-6 flex-1"
              >
                <Download className="w-3 h-3 mr-1" />
                Comment installer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAInstallPrompt;
