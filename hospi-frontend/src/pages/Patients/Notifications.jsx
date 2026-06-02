import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, Calendar, FileText, CreditCard, Loader2, ArrowRight, Pill, Clock, Volume2, VolumeX, X, ClipboardList, User, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { cn } from '../../lib/utils';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { useNavigate } from 'react-router-dom';

// =============================================================================
// 🔔 SERVICE AUDIO - Sonnerie + Voix pour rappels de médicaments
// =============================================================================

/**
 * 🎹 Mélodie piano élégante - Notification médicale
 * Notes: Do-Mi-Sol-Do (accord majeur harmonieux)
 */
const playMedicationAlarm = async () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // 🎵 Notes de l'accord majeur (fréquences en Hz)
    const notes = [
      { freq: 523.25, duration: 0.4 }, // Do5
      { freq: 659.25, duration: 0.4 }, // Mi5
      { freq: 783.99, duration: 0.4 }, // Sol5
      { freq: 1046.50, duration: 0.6 } // Do6
    ];
    
    // Jouer les notes en séquence avec effet piano
    notes.forEach((note, index) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        // Configuration pour son piano-like
        osc.type = 'triangle';
        osc.frequency.value = note.freq;
        
        // Filtre pour adoucir le son
        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        // Enveloppe ADSR douce
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.05); // Attack rapide
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.15); // Decay
        gain.gain.exponentialRampToValueAtTime(0.01, now + note.duration); // Release
        
        osc.start(now);
        osc.stop(now + note.duration + 0.1);
      }, index * 350);
    });
    
    // Deuxième séquence plus douce (réponse harmonique)
    setTimeout(() => {
      const responseNotes = [
        { freq: 659.25, duration: 0.3 }, // Mi5
        { freq: 783.99, duration: 0.3 }, // Sol5
        { freq: 523.25, duration: 0.5 }  // Do5 (finale)
      ];
      
      responseNotes.forEach((note, index) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          
          osc.type = 'triangle';
          osc.frequency.value = note.freq;
          
          filter.type = 'lowpass';
          filter.frequency.value = 2500;
          
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, now + note.duration);
          
          osc.start(now);
          osc.stop(now + note.duration + 0.1);
        }, index * 300);
      });
    }, 1800);
    
  } catch (e) {
    console.error('Erreur audio:', e);
  }
};

/**
 * 🔊 Nettoie le texte pour une meilleure synthèse vocale
 * Remplace: (s) → vide, 3x → 3 fois, 08:00 → 8 heures, etc.
 */
const cleanTextForSpeech = (text) => {
  return text
    .replace(/\(s\)/gi, '') // Supprimer (s)
    .replace(/(\d+)x/gi, '$1 fois') // 3x → 3 fois
    .replace(/\//g, ' sur ') // / → sur
    .replace(/\bpr\s+jour\b/gi, 'par jour') // pr jour → par jour
    // 🕐 Conversion intelligente des heures
    .replace(/\b(\d{1,2}):00\b/g, (match, hour) => {
      // 08:00 → 8 heures, 12:00 → 12 heures (sans minutes)
      const h = parseInt(hour, 10);
      return `${h} heures`;
    })
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (match, hour, minutes) => {
      // 12:30 → 12 heures 30, 14:15 → 14 heures 15
      const h = parseInt(hour, 10);
      const m = parseInt(minutes, 10);
      if (m === 0) return `${h} heures`;
      if (m === 30) return `${h} heures et demie`;
      return `${h} heures ${m}`;
    })
    .replace(/💊/g, '') // Supprimer emoji
    .replace(/⏰/g, '') // Supprimer emoji
    .replace(/✅/g, '') // Supprimer emoji
    .trim();
};

/**
 * 🔊 Synthèse vocale améliorée - Voix féminine chaleureuse
 */
const speakMedicationReminder = (title, message) => {
  if (!window.speechSynthesis) {
    console.warn('Synthèse vocale non supportée');
    return;
  }
  
  // Arrêter toute parole en cours
  window.speechSynthesis.cancel();
  
  // Nettoyer le texte pour une meilleure prononciation
  const cleanTitle = cleanTextForSpeech(title);
  const cleanMessage = cleanTextForSpeech(message);
  
  // Texte structuré pour une meilleure intonation
  const text = `${cleanTitle}. ${cleanMessage}. N'oubliez pas votre traitement. Bonne guérison.`;
  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.lang = 'fr-FR';
  utterance.rate = 0.85; // Plus lent pour la clarté
  utterance.pitch = 1.05; // Voix légèrement plus aiguë (plus chaleureuse)
  utterance.volume = 1;
  
  // Chercher une voix française féminine de qualité
  const voices = window.speechSynthesis.getVoices();
  const frenchVoice = voices.find(v => 
    v.lang.startsWith('fr') && 
    (v.name.toLowerCase().includes('female') || 
     v.name.toLowerCase().includes('féminine') ||
     v.name.toLowerCase().includes('sophie') ||
     v.name.toLowerCase().includes('julie') ||
     v.name.toLowerCase().includes('marie'))
  ) || voices.find(v => v.lang.startsWith('fr'));
  
  if (frenchVoice) {
    utterance.voice = frenchVoice;
  }
  
  window.speechSynthesis.speak(utterance);
};

/**
 * 🎵 Joue le rappel complet (son + voix) - respecte la préférence utilisateur
 */
const triggerMedicationAlert = (notification, enabled = true) => {
  if (notification.type === 'PRISE_MEDICAMENT' && enabled) {
    // Sonnerie forte
    playMedicationAlarm();
    
    // Voix qui annonce après un court délai
    setTimeout(() => {
      speakMedicationReminder(notification.title, notification.message);
    }, 1500);
  }
};

const Notifications = () => {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true); // 🔊 État du son
  const [selectedDetail, setSelectedDetail] = useState(null); // 📋 Détail notification sélectionnée
  
  // 🚨 ÉTATS ALARME MEDICAMENT
  const [activeAlarm, setActiveAlarm] = useState(null); // Notification en cours d'alarme
  const [alarmConfirmed, setAlarmConfirmed] = useState(false); // L'alarme est confirmée
  const [timeUntilNext, setTimeUntilNext] = useState(120); // Temps avant prochaine alarme (2 min)
  const [alarmRepeatCount, setAlarmRepeatCount] = useState(0); // Nombre de répétitions
  const alarmIntervalRef = React.useRef(null);
  const alarmTimeoutRef = React.useRef(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Charger la préférence sonore
  useEffect(() => {
    const saved = localStorage.getItem('medicationSoundEnabled');
    if (saved !== null) setSoundEnabled(saved === 'true');
  }, []);

  // Sauvegarder la préférence sonore
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('medicationSoundEnabled', newState.toString());
  };

  // ============================================================================
  // 🚨 SYSTÈME D'ALARME AVEC RÉPÉTITION (Comme réveil de téléphone)
  // ============================================================================
  
  /**
   * Démarre l'alarme pour une notification de médicament
   */
  const startMedicationAlarm = (notification) => {
    if (!soundEnabled) return;
    
    setActiveAlarm(notification);
    setAlarmConfirmed(false);
    setAlarmRepeatCount(0);
    setTimeUntilNext(120);
    
    // Jouer immédiatement
    playAlarmSequence(notification);
    
    // Programmer la répétition toutes les 2 minutes
    scheduleNextAlarm(notification);
  };
  
  /**
   * Joue la séquence sonore + voix
   */
  const playAlarmSequence = (notification) => {
    // Sonnerie répétée 3 fois
    let playCount = 0;
    const playLoop = () => {
      if (playCount < 3 && !alarmConfirmed) {
        playMedicationAlarm();
        playCount++;
        setTimeout(playLoop, 2000);
      }
    };
    playLoop();
    
    // Voix après la sonnerie
    setTimeout(() => {
      if (!alarmConfirmed) {
        speakMedicationReminder(notification.title, notification.message);
      }
    }, 7000);
  };
  
  /**
   * Programme la prochaine alarme dans 2 minutes
   */
  const scheduleNextAlarm = (notification) => {
    // Compte à rebours visuel
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    
    alarmIntervalRef.current = setInterval(() => {
      setTimeUntilNext(prev => {
        if (prev <= 1) {
          clearInterval(alarmIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Réveil dans 2 minutes
    alarmTimeoutRef.current = setTimeout(() => {
      if (!alarmConfirmed) {
        setAlarmRepeatCount(prev => prev + 1);
        setTimeUntilNext(120);
        playAlarmSequence(notification);
        scheduleNextAlarm(notification); // Re-programmer pour répéter à l'infini
      }
    }, 120000); // 2 minutes = 120000ms
  };
  
  /**
   * Confirme la prise du médicament - arrête l'alarme
   */
  const confirmMedicationTaken = () => {
    setAlarmConfirmed(true);
    
    // Arrêter tous les timers
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    
    // Arrêter la synthèse vocale
    window.speechSynthesis?.cancel();
    
    // Fermer le modal
    setActiveAlarm(null);
    setAlarmRepeatCount(0);
    
    // Marquer la notification comme lue
    if (activeAlarm?.id) {
      markAsRead(activeAlarm.id);
    }
  };
  
  /**
   * Réinitialise l'alarme (bouton "Répéter dans 5 min")
   */
  const snoozeAlarm = () => {
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    
    setTimeUntilNext(300); // 5 minutes
    
    alarmIntervalRef.current = setInterval(() => {
      setTimeUntilNext(prev => {
        if (prev <= 1) {
          clearInterval(alarmIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    alarmTimeoutRef.current = setTimeout(() => {
      if (activeAlarm && !alarmConfirmed) {
        playAlarmSequence(activeAlarm);
        scheduleNextAlarm(activeAlarm);
      }
    }, 300000); // 5 minutes
  };
  
  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Détection automatique de l'environnement
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname.includes('local');
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                      (isLocalhost ? 'http://localhost:8080' : 'https://inuaafia.onrender.com');
  const API_BASE_URL = `${BACKEND_URL}/api/notifications`;
  const token = localStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // --- 1. CHARGEMENT INITIAL (API) ---
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/user/${user.id}`, config);
        
        const normalizedData = response.data.map(n => ({
          ...n,
          read: n.isRead !== undefined ? n.isRead : n.read
        }));
        
        setNotifications(normalizedData);
      } catch (error) {
        console.error("Erreur chargement notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user?.id]);

  // --- 2. SYNCHRONISATION TEMPS RÉEL (WEBSOCKET) ---
  useEffect(() => {
    if (!user?.id) return;

    const socket = new SockJS(`${BACKEND_URL}/ws-notifications`);
    const stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    stompClient.connect({}, () => {
      stompClient.subscribe(`/topic/notifications/${user.id}`, (message) => {
        const newNotif = JSON.parse(message.body);
        const normalizedNotif = {
          ...newNotif,
          read: newNotif.isRead !== undefined ? newNotif.isRead : false
        };
        setNotifications(prev => [normalizedNotif, ...prev]);
        window.dispatchEvent(new Event('notificationsUpdated'));
        
        // 🚨 Démarrer l'alarme complète pour les rappels de médicaments
        if (normalizedNotif.type === 'PRISE_MEDICAMENT' && soundEnabled) {
          startMedicationAlarm(normalizedNotif);
        }
      });
    });

    return () => {
      if (stompClient && stompClient.connected) stompClient.disconnect();
    };
  }, [user?.id]);

  // --- 3. ACTIONS ---
  
  // Fonction de clic sur une notification (Marquer comme lu + Redirection)
  const handleNotificationAction = async (notification) => {
    const isUnread = !notification.read && !notification.isRead;
    
    // 1. Marquer comme lu si nécessaire
    if (isUnread) {
      await markAsRead(notification.id);
    }

    // 2. Pour les médicaments, ouvrir le modal de détail au lieu de naviguer directement
    if (notification.type === 'PRISE_MEDICAMENT' || notification.type === 'PRESCRIPTION_PRETE') {
      setSelectedDetail(notification);
      return;
    }

    // 3. Redirection "Style Facebook" vers la ressource concernée
    if (notification.type === 'RENDEZ_VOUS') {
      // On utilise l'id contenu dans le message ou un champ de référence si disponible
      // Si votre backend envoie l'ID de la consultation dans referenceId :
      const targetId = notification.referenceId || notification.consultationId;
      if (targetId) {
        navigate(`/patient/appointments/${targetId}`);
      } else {
        navigate('/patient/appointments');
      }
    } else if (notification.type === 'DOCUMENT') {
      navigate('/patient/documents');
    } else if (notification.type === 'PAIEMENT' || notification.type === 'FACTURE') {
      // Redirection vers la page des factures et paiements
      navigate('/patient/billing');
    } else if (notification.type === 'RESULTAT_EXAMEN') {
      navigate('/patient/exam-results');
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/${id}/read`, {}, config);
      setNotifications(prev => 
        prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
      );
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      console.error("Erreur lors du marquage lecture:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE_URL}/user/${user.id}/mark-all-read`, {}, config);
      setNotifications(prev => prev.map((n) => ({ ...n, read: true, isRead: true })));
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
    }
  };

  // --- 4. LOGIQUE D'AFFICHAGE ---
  const filteredNotifications = notifications.filter((notif) => {
    const isUnread = !notif.read && !notif.isRead;
    if (filter === 'all') return true;
    if (filter === 'unread') return isUnread;
    return notif.type === filter;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'RENDEZ_VOUS': return Calendar;
      case 'DOCUMENT': return FileText;
      case 'PAIEMENT': return CreditCard;
      case 'PRISE_MEDICAMENT': return Pill;
      case 'PRESCRIPTION_PRETE': return Pill;
      default: return Bell;
    }
  };

  const getNotificationColor = (type) => {
    const colors = {
      RENDEZ_VOUS: 'bg-blue-500/10 text-blue-500',
      DOCUMENT: 'bg-emerald-500/10 text-emerald-500',
      PAIEMENT: 'bg-purple-500/10 text-purple-500',
      SYSTEME: 'bg-amber-500/10 text-amber-500',
      PRISE_MEDICAMENT: 'bg-rose-500/10 text-rose-500',
      PRESCRIPTION_PRETE: 'bg-violet-500/10 text-violet-500',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-muted-foreground">Chargement de vos alertes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
            <p className="text-muted-foreground font-medium">
              Vous avez <span className="text-emerald-500 font-bold">{unreadCount}</span> message(s) non lu(s).
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 🔊 Toggle son ON/OFF */}
            <button
              onClick={toggleSound}
              className={cn(
                "px-4 py-3 rounded-xl transition-all font-bold flex items-center gap-2",
                soundEnabled 
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                  : "bg-gray-500 text-white shadow-lg"
              )}
              title={soundEnabled ? "Son activé - Cliquez pour désactiver" : "Son désactivé - Cliquez pour activer"}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              <span className="hidden sm:inline">{soundEnabled ? "Son ON" : "Son OFF"}</span>
            </button>
            
            {/* 🔊 Bouton de test */}
            <button
              onClick={() => {
                const testNotif = {
                  id: 999,
                  type: 'PRISE_MEDICAMENT',
                  title: '💊 Rappel de prise de médicament',
                  message: 'Il est 08:00 - Prenez 2 comprimé(s) de Paracétamol (3x par jour)'
                };
                startMedicationAlarm(testNotif);
              }}
              className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
              title="Tester l'alarme de médicament"
            >
              <Volume2 className="w-5 h-5" />
              <span className="hidden sm:inline">Tester</span>
            </button>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="w-5 h-5" />
                Tout marquer comme lu
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'all', label: 'Toutes' },
          { id: 'unread', label: 'Non lues' },
          { id: 'RENDEZ_VOUS', label: 'Rendez-vous' },
          { id: 'DOCUMENT', label: 'Documents' },
          { id: 'PRESCRIPTION_PRETE', label: 'Pharmacie' },
          { id: 'PRISE_MEDICAMENT', label: 'Médicaments' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={cn(
              "px-6 py-2.5 rounded-full font-bold text-sm border transition-all whitespace-nowrap",
              filter === btn.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-card text-muted-foreground border-border hover:border-emerald-500/50'
            )}
          >
            {btn.label} {btn.id === 'unread' && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredNotifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);
          const isUnread = !notification.read && !notification.isRead;
          
          return (
            <div
              key={notification.id}
              onClick={() => handleNotificationAction(notification)}
              className={cn(
                "bg-card border-l-4 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group border-y border-r border-border relative overflow-hidden",
                isUnread ? 'border-l-emerald-500 bg-emerald-500/[0.03]' : 'border-l-transparent opacity-80'
              )}
            >
              <div className="flex items-start gap-5">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", getNotificationColor(notification.type))}>
                  <Icon className="w-7 h-7" />
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className={cn("text-lg font-bold flex items-center gap-2", isUnread ? 'text-foreground' : 'text-muted-foreground')}>
                      {notification.title}
                      {isUnread && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{notification.message}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground/60 text-xs flex items-center gap-1.5 font-semibold">
                      <Calendar className="w-4 h-4" />
                      {new Date(notification.createdAt).toLocaleString('fr-FR')}
                    </span>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Voir les détails <ArrowRight size={12} />
                        </span>
                        {isUnread && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                            className="text-emerald-500 hover:text-emerald-600 font-extrabold uppercase text-[10px] bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Marquer comme lu
                        </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredNotifications.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border mt-6">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-foreground">Tout est à jour !</h3>
          <p className="text-muted-foreground mt-1">Vous n'avez aucune notification ici.</p>
        </div>
      )}

      {/* 📋 MODAL DÉTAIL NOTIFICATION MÉDICAMENT */}
      {selectedDetail && (
        <div className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setSelectedDetail(null)}>
          <div className="bg-card rounded-2xl max-w-md w-full shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200 mt-8 sm:mt-12 md:mt-16 mb-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-5 text-white relative">
              <button
                onClick={() => setSelectedDetail(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Détail du rappel</h2>
                  <p className="text-rose-100 text-sm">Médicament prescrit</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Titre / Nom du médicament */}
              <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-4">
                <h3 className="font-bold text-foreground text-base mb-1">{selectedDetail.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{selectedDetail.message}</p>
              </div>

              {/* Infos complémentaires */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span>Reçu le <span className="font-semibold text-foreground">{new Date(selectedDetail.createdAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Heure de prise : <span className="font-semibold text-foreground">{new Date(selectedDetail.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></span>
                </div>
                {selectedDetail.referenceId && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <ClipboardList className="w-4 h-4 text-violet-500" />
                    <span>Référence : <span className="font-semibold text-foreground">#{selectedDetail.referenceId}</span></span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => { setSelectedDetail(null); navigate('/patient/documents'); }}
                  className="col-span-2 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <ClipboardList className="w-4 h-4" />
                  Voir mon ordonnance
                </button>
                <button
                  onClick={() => {
                    if (!selectedDetail.read && !selectedDetail.isRead) markAsRead(selectedDetail.id);
                    setSelectedDetail(null);
                  }}
                  className="py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marquer comme lu
                </button>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="py-2.5 border border-border text-muted-foreground rounded-xl font-medium text-sm hover:bg-muted active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 MODAL ALARME MEDICAMENT - Design compact et élégant */}
      {activeAlarm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header gradient INUA AFYA */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white relative">
              <div className="absolute top-2 right-2">
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                  #{alarmRepeatCount + 1}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Rappel Médicament</h2>
                  <p className="text-emerald-100 text-sm">{new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            </div>
            
            {/* Corps compact */}
            <div className="p-4">
              {/* Message médicament */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 mb-3">
                <p className="text-gray-800 dark:text-gray-200 text-center font-medium text-sm">
                  {activeAlarm.message}
                </p>
              </div>
              
              {/* Compte à rebours circulaire */}
              <div className="flex items-center justify-center gap-2 mb-3 text-gray-500 text-xs">
                <Clock className="w-4 h-4" />
                <span>Prochain dans:</span>
                <span className="font-mono font-bold text-emerald-500">
                  {Math.floor(timeUntilNext / 60)}:{String(timeUntilNext % 60).padStart(2, '0')}
                </span>
              </div>
              
              {/* Boutons d'action compacts */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={confirmMedicationTaken}
                  className="col-span-2 py-3 bg-emerald-500 text-white rounded-lg font-semibold text-sm hover:bg-emerald-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  J'ai pris mon médicament
                </button>
                
                <button
                  onClick={snoozeAlarm}
                  className="py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  +5 min
                </button>
                
                <button
                  onClick={() => window.speechSynthesis?.cancel()}
                  className="py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-300 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <VolumeX className="w-4 h-4" />
                  Silence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;