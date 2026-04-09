import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Search, Send, Phone, Video, 
  MoreVertical, Check, CheckCheck, Volume2, VolumeX, 
  Calendar, Clock, User, Activity, TrendingUp, BarChart3,
  UserCheck, Loader2, Paperclip, FileText, Download, Eye, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { ScrollArea } from '../../components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_CHAT = `${API_URL}/api/v1/doctors/chat`;
const IMAGE_BASE_URL = `${API_URL}/uploads/profiles/`;

const getPhotoUrl = (patient) => {
  if (!patient) return null;
  const photo = patient.photo || 
                patient.photoUrl || 
                (patient.utilisateur && patient.utilisateur.photo);
  
  if (!photo) return null;
  if (photo.startsWith('http') || photo.startsWith('data:')) return photo;
  return `${IMAGE_BASE_URL}${photo}`;
};

const Chat = () => {
  const { token } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [messageToDelete, setMessageToDelete] = useState(null); // État pour l'alerte
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);
  
  const audioPlayer = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  const fetchPatientsList = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/api/v1/doctors/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data || [];
      if (Array.isArray(data)) {
        const formatted = data.map(p => ({
          ...p,
          displayFullName: `${p.prenom || p.firstName || ''} ${p.nom || p.lastName || ''}`.trim() || `Patient #${p.id}`,
          en_ligne: p.en_ligne || p.is_online || false 
        }));
        setPatients(formatted);

        if (selectedPatient) {
          const updatedSelected = formatted.find(p => p.id === selectedPatient.id);
          if (updatedSelected) setSelectedPatient(updatedSelected);
        }
      }
    } catch (error) {
      console.error('Erreur fetching patients:', error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedPatient?.id]);

  const fetchMessages = useCallback(async (patientUserId, isPolling = false) => {
    if (!token || !patientUserId) return;
    try {
      const response = await axios.get(`${API_CHAT}/conversations/${patientUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newMsgs = response.data || [];
      
      setMessages(prevMessages => {
        if (newMsgs.length !== prevMessages.length) {
          if (isPolling && newMsgs.length > prevMessages.length) {
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg.sender_type !== 'doctor') {
              if (selectedPatient?.id !== patientUserId) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [patientUserId]: (prev[patientUserId] || 0) + 1
                }));
              }
              if (!isMuted) audioPlayer.current.play().catch(() => {});
            }
          }
          return newMsgs;
        }
        return prevMessages;
      });
    } catch (error) {
      console.error('Erreur messages:', error);
    }
  }, [token, isMuted, selectedPatient?.id]);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    fetchPatientsList();
  }, [fetchPatientsList]);

  useEffect(() => {
    if (!selectedPatient) return;
    const interval = setInterval(() => {
        fetchMessages(selectedPatient.id, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedPatient?.id, fetchMessages]);

  useEffect(() => {
    const statusInterval = setInterval(() => {
      fetchPatientsList();
    }, 15000);
    return () => clearInterval(statusInterval);
  }, [fetchPatientsList]);

  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
  }, [messages.length, selectedPatient?.id]);

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setMessages([]);
    setUnreadCounts(prev => ({ ...prev, [p.id]: 0 }));
    fetchMessages(p.id);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedPatient) return;
    
    const text = newMessage;
    setNewMessage('');

    try {
      const response = await axios.post(`${API_CHAT}/send`, 
        { patientUserId: selectedPatient.id, contenu: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        setMessages(prev => [...prev, {
          ...response.data,
          contenu: text,
          sender_type: 'doctor',
          created_at: new Date().toISOString()
        }]);
      }
    } catch (error) {
      toast.error("Erreur d'envoi");
      setNewMessage(text);
    }
  };

  // ✅ Fonction de suppression avec l'ID stocké
  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await axios.delete(`${API_CHAT}/messages/${messageToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.filter(m => m.id !== messageToDelete));
      toast.success("Message supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setMessageToDelete(null);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPatient) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', selectedPatient.id);
    formData.append('typeDocument', 'partage_chat');
    formData.append('titre', file.name);

    setIsUploading(true);
    try {
      const response = await axios.post(`${API_URL}/api/v1/doctors/documents/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success("Document envoyé");
      if (response.data) {
        fetchMessages(selectedPatient.id);
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const isImage = (url) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  };

  const stats = useMemo(() => ({
    total: patients.length,
    active: patients.filter(p => p.en_ligne).length || 0,
    unread: Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  }), [patients, unreadCounts]);

  const sortedPatients = useMemo(() => {
    return [...patients]
      .filter(p => p.displayFullName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (unreadCounts[a.id] && !unreadCounts[b.id]) return -1;
        if (!unreadCounts[a.id] && unreadCounts[b.id]) return 1;
        if (a.en_ligne && !b.en_ligne) return -1;
        if (!a.en_ligne && b.en_ligne) return 1;
        return a.displayFullName.localeCompare(b.displayFullName);
      });
  }, [patients, searchTerm, unreadCounts]);

  const renderMessageStatus = (msg) => {
    if (msg.sender_type !== 'doctor') return null;
    if (msg.is_read || msg.isRead || msg.lu) {
      return <CheckCheck size={14} className="text-sky-400 animate-in zoom-in duration-300" />;
    }
    return <Check size={14} className="text-white/60" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 font-space-grotesk">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">
            CENTRE DE <span className="text-emerald-500">MESSAGERIE</span>
          </h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest mt-1">
            Communication directe avec vos patients
          </p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => setIsMuted(!isMuted)} className="rounded-2xl border-2 h-12 px-6 font-black uppercase text-[10px]">
              {isMuted ? <VolumeX className="mr-2 w-4 h-4 text-rose-500" /> : <Volume2 className="mr-2 w-4 h-4 text-emerald-500" />}
              {isMuted ? 'Silencieux' : 'Sons actifs'}
            </Button>
            <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-4 rounded-2xl border-2 border-border">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-tight">Aujourd'hui</span>
            </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-black text-white rounded-[2rem] border-none overflow-hidden group">
              <CardContent className="p-8">
                  <p className="text-[10px] font-black tracking-widest opacity-50 uppercase">Patients Connectés</p>
                  <div className="flex justify-between items-end mt-2">
                    <h2 className="text-5xl font-black tracking-tighter">{stats.total}</h2>
                    <UserCheck className="text-emerald-500 mb-1" size={30} />
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-emerald-500 text-white rounded-[2rem] border-none overflow-hidden group">
              <CardContent className="p-8">
                  <p className="text-[10px] font-black tracking-widest opacity-80 uppercase">Messages Non Lus</p>
                  <div className="flex justify-between items-end mt-2">
                    <h2 className="text-5xl font-black tracking-tighter">{stats.unread}</h2>
                    <Activity className="text-white mb-1 animate-pulse" size={30} />
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-muted/50 border-2 border-border rounded-[2rem] overflow-hidden">
              <CardContent className="p-8">
                  <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Statut Système</p>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="font-black text-xl uppercase tracking-tighter text-foreground">Live Sync Active</span>
                  </div>
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[650px]">
        
        {/* LISTE PATIENTS */}
        <Card className="lg:col-span-4 flex flex-col overflow-hidden border-2 border-border bg-card rounded-[2.5rem] shadow-sm">
          <CardHeader className="p-6 border-b-2 border-border">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" /> Patientèle
            </CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="RECHERCHER UN NOM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 bg-muted/50 border-none h-12 rounded-xl font-bold uppercase text-[10px]"
              />
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {loading ? (
                [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
              ) : sortedPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative group ${
                    selectedPatient?.id === p.id
                      ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]'
                      : 'hover:bg-muted bg-transparent border border-transparent hover:border-border'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                        <AvatarImage src={getPhotoUrl(p)} />
                        <AvatarFallback className="font-black bg-emerald-100 text-emerald-600">
                        {p.prenom?.[0]}{p.nom?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    {unreadCounts[p.id] > 0 && (
                        <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in">
                            {unreadCounts[p.id]}
                        </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-black text-xs uppercase truncate tracking-tight">
                      {p.displayFullName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${p.en_ligne ? 'bg-white animate-pulse' : 'bg-muted-foreground/30'}`} />
                      <p className={`text-[9px] font-bold uppercase opacity-60`}>
                        {p.en_ligne ? 'En ligne' : 'Hors ligne'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* ZONE DE CHAT */}
        <Card className="lg:col-span-8 flex flex-col overflow-hidden border-2 border-border bg-card rounded-[2.5rem] shadow-xl relative">
          {selectedPatient ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b-2 border-border bg-card/80 backdrop-blur-md flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-10 h-10 ring-2 ring-emerald-500/20">
                      <AvatarImage src={getPhotoUrl(selectedPatient)} />
                      <AvatarFallback className="bg-emerald-500 text-white font-black">
                        {selectedPatient.prenom?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white rounded-full ${selectedPatient.en_ligne ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-widest">{selectedPatient.displayFullName}</h3>
                    <p className="text-[8px] font-black uppercase text-muted-foreground opacity-70">
                        {selectedPatient.en_ligne ? 'Disponible' : 'Dernière connexion récente'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="rounded-xl bg-muted/50 h-10 w-10"><Phone size={18} /></Button>
                  <Button variant="ghost" size="icon" className="rounded-xl bg-muted/50 h-10 w-10"><Video size={18} /></Button>
                </div>
              </div>

              <div className="flex-1 bg-muted/10 relative overflow-hidden">
                <ScrollArea ref={scrollAreaRef} className="h-full p-6">
                  <div className="space-y-6">
                    <AnimatePresence initial={false}>
                      {messages.map((msg, index) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={msg.id || `temp-${index}`} 
                          className={`flex ${msg.sender_type === 'doctor' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="relative group max-w-[75%]">
                            <div className={`p-4 rounded-3xl shadow-sm relative ${
                              msg.sender_type === 'doctor'
                                ? 'bg-emerald-500 text-white rounded-tr-none'
                                : 'bg-card border-2 border-border text-foreground rounded-tl-none'
                            }`}>
                              {msg.fileUrl ? (
                                <div className="space-y-2">
                                  {isImage(msg.fileUrl) ? (
                                    <div className="relative group overflow-hidden rounded-xl border border-white/20">
                                      <img src={`${API_URL}${msg.fileUrl}`} alt="Examen" className="max-h-60 w-full object-cover cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(`${API_URL}${msg.fileUrl}`, '_blank')} />
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 p-2 bg-black/10 rounded-xl">
                                      <FileText size={20} />
                                      <p className="text-[10px] font-black uppercase truncate">{msg.titre || "Fichier"}</p>
                                    </div>
                                  )}
                                  <button onClick={() => window.open(`${API_URL}${msg.fileUrl}`, '_blank')} className={`text-[9px] underline font-black uppercase flex items-center gap-1 ${msg.sender_type === 'doctor' ? 'text-white' : 'text-emerald-600'}`}>
                                    <Download size={10} /> Ouvrir
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{msg.contenu || msg.content}</p>
                              )}
                              
                              <div className={`flex items-center gap-2 mt-2 opacity-80 text-[9px] font-black uppercase ${msg.sender_type === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                                <Clock size={10} />
                                {new Date(msg.created_at || msg.createdAt || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                <div className="ml-1">{renderMessageStatus(msg)}</div>
                              </div>

                              {/* MENU SUPPRESSION STYLE WHATSAPP */}
                              {msg.sender_type === 'doctor' && (
                                <div className="absolute top-1 -left-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white">
                                        <MoreVertical size={14} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl border-2">
                                      <DropdownMenuItem 
                                        onClick={() => setMessageToDelete(msg.id)}
                                        className="text-rose-500 font-bold uppercase text-[10px] cursor-pointer"
                                      >
                                        <Trash2 size={14} className="mr-2" /> Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* ZONE DE SAISIE */}
              <form onSubmit={handleSendMessage} className="p-6 border-t-2 border-border bg-card">
                <div className="flex gap-3 items-center">
                  <input type="file" id="chat-file-upload" className="hidden" onChange={handleFileUpload} />
                  <Button type="button" variant="ghost" size="icon" className="rounded-xl bg-muted/50 h-12 w-12 hover:text-emerald-500" onClick={() => document.getElementById('chat-file-upload').click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="animate-spin" /> : <Paperclip size={20} />}
                  </Button>

                  <div className="flex-1 flex gap-3 bg-muted/50 p-2 rounded-2xl ring-2 ring-transparent focus-within:ring-emerald-500/20 transition-all items-center">
                    <Input 
                      placeholder="Répondre au patient..." 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                      className="border-none bg-transparent focus-visible:ring-0 shadow-none font-bold text-sm" 
                    />
                    <Button type="submit" disabled={!newMessage.trim()} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-6 shadow-lg shadow-emerald-500/20">
                      <Send size={18} />
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <MessageSquare className="w-12 h-12 text-emerald-500/40 animate-bounce" />
              <h3 className="text-2xl font-black uppercase tracking-tighter mt-4">Messagerie Médicale</h3>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto">Veuillez sélectionner un patient pour charger la conversation.</p>
            </div>
          )}
        </Card>
      </div>

      {/* DIALOGUE DE CONFIRMATION DE SUPPRESSION */}
      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-2 border-border font-space-grotesk bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">
              Supprimer le message ?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-xs uppercase opacity-70">
              Cette action est irréversible. Le message disparaîtra pour vous et pour votre patient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-3">
            <AlertDialogCancel className="rounded-xl border-2 font-black uppercase text-[10px] h-11">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMessage}
              className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] h-11 px-6"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;