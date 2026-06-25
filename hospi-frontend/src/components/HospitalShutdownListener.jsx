import React, { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { getBaseUrl } from '../utils/websocket';
import { useAuth } from '../context/AuthContext';
import ShutdownAlertBanner from './ShutdownAlertBanner';

const HospitalShutdownListener = () => {
  const { user } = useAuth();
  const [shutdownWarning, setShutdownWarning] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const API_BASE_URL = getBaseUrl();

  useEffect(() => {
    console.log('🏥 HospitalShutdownListener - Initialisation');
    console.log('🏥 User:', user);
    console.log('🏥 Hospital ID:', user?.hospitalId);
    console.log('🏥 Role:', user?.role);
    
    if (!user || !user.hospitalId) {
      console.log('🏥 Pas de user ou hospitalId, composant désactivé');
      return;
    }

    const clinicalRoles = [
      'DOCTOR', 'DOCTEUR', 'ROLE_DOCTOR', 'ROLE_DOCTEUR',
      'LABO', 'LABORATOIRE', 'ROLE_LABO', 'ROLE_LABORATOIRE',
      'PHARMACY', 'PHARMACIE', 'ROLE_PHARMACY', 'ROLE_PHARMACIE',
      'PHARMACIST', 'ROLE_PHARMACIST',
      'RECEPTION', 'ROLE_RECEPTION',
      'FINANCE', 'ROLE_FINANCE',
      'CAISSIER', 'ROLE_CAISSIER'
    ];
    
    // Ne s'applique qu'aux utilisateurs cliniques
    if (!clinicalRoles.includes(user.role)) {
      console.log('🏥 Rôle non clinique, composant désactivé. Rôle:', user.role);
      return;
    }

    console.log('🏥 Utilisateur clinique détecté, connexion WebSocket...');

    let subscription = null;
    let client = null;

    try {
      const wsUrl = `${API_BASE_URL}/ws-hospital`;
      const socket = new SockJS(wsUrl, null, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling']
      });
      
      client = Stomp.over(socket);
      client.debug = null;

      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      client.connect(headers, () => {
        console.log('🏥 HospitalShutdownListener - WebSocket connecté');
        console.log('🏥 Abonnement au topic:', `/topic/hospital/${user.hospitalId}/shutdown-warning`);

        // S'abonner au topic de shutdown warning pour cet hôpital
        subscription = client.subscribe(`/topic/hospital/${user.hospitalId}/shutdown-warning`, (message) => {
          console.log('🏥 Message WebSocket reçu:', message.body);
          if (message.body) {
            try {
              const data = JSON.parse(message.body);
              console.log('⚠️ Shutdown warning reçu:', data);
              
              setShutdownWarning(data);
              setTimeRemaining(data.shutdownInMinutes * 60); // 5 minutes en secondes
              
              // Démarrer le compte à rebours
              startShutdownTimer(data.shutdownInMinutes * 60);
            } catch (error) {
              console.error('Erreur parsing shutdown warning:', error);
            }
          }
        });

        setStompClient(client);
      }, (error) => {
        console.error('🏥 HospitalShutdownListener - Erreur WebSocket:', error);
      });

      return () => {
        if (subscription) subscription.unsubscribe();
        if (client && client.connected) {
          try {
            client.disconnect();
          } catch (error) {
            console.error('Erreur déconnexion:', error);
          }
        }
      };
    } catch (error) {
      console.error('Erreur initialisation WebSocket:', error);
    }
  }, [user]);

  const startShutdownTimer = (seconds) => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleShutdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  };

  const handleShutdown = () => {
    console.log('🚫 Déconnexion forcée - Hôpital désactivé');
    
    // Effacer le token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Rediriger vers login
    window.location.href = '/login?error=hospital_disabled';
  };

  const handleDismiss = () => {
    setShutdownWarning(null);
    // Ne pas mettre timeRemaining à null pour laisser le compte à rebours continuer
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!shutdownWarning || timeRemaining === null) return null;

  return (
    <ShutdownAlertBanner
      message={shutdownWarning.message}
      timeRemaining={formatTime(timeRemaining)}
      onDismiss={handleDismiss}
    />
  );
};

export default HospitalShutdownListener;
