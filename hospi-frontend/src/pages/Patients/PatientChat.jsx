import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Search, Send, Check, CheckCheck, 
  Volume2, VolumeX, ShieldCheck, MoreVertical, Trash2, Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
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

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
const API_PATIENTS = `${API_URL}/api/v1/patients`;
const IMAGE_BASE_URL = `${API_URL}/uploads/profiles/`;

const PatientChat = () => {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageToDelete, setMessageToDelete] = useState(null);
  const messagesEndRef = useRef(null);
  
  const audioPlayer = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'));

  // Fonction pour scroller en bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Récupérer la liste des médecins
  const fetchMyDoctors = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_PATIENTS}/my-doctors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data || [];
      const formatted = data.map(d => ({
        ...d,
        displayFullName: `Dr. ${d.prenom || d.firstName || ''} ${d.nom || d.lastName || ''}`.trim(),
      }));
      setDoctors(formatted);
      
      if (formatted.length > 0 && !selectedDoctor) {
        setSelectedDoctor(formatted[0]);
      }
    } catch (error) {
      console.error('Erreur fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDoctor]);

  // 2. Récupérer les messages
  const fetchMessages = useCallback(async (doctorId, isPolling = false) => {
    if (!token || !doctorId) return;
    try {
      const response = await axios.get(`${API_PATIENTS}/conversations/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const serverMessages = response.data || [];
      
      setMessages(prevMessages => {
        if (serverMessages.length !== prevMessages.length) {
          if (isPolling && serverMessages.length > prevMessages.length) {
            const lastMsg = serverMessages[serverMessages.length - 1];
            if (lastMsg.sender_type === 'doctor' && !isMuted) {
              audioPlayer.current.play().catch(() => {});
            }
          }
          return serverMessages;
        }
        return prevMessages;
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
    }
  }, [token, isMuted]);

  useEffect(() => {
    fetchMyDoctors();
  }, [fetchMyDoctors]);

  useEffect(() => {
    if (!selectedDoctor) return;
    fetchMessages(selectedDoctor.id);

    const interval = setInterval(() => {
      fetchMessages(selectedDoctor.id, true);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedDoctor?.id, fetchMessages]);

  // Scroll automatique quand les messages changent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    setMessages([]);
    fetchMessages(doc.id);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedDoctor) return;
    
    const text = newMessage;
    setNewMessage('');

    try {
      await axios.post(`${API_PATIENTS}/send`, 
        { doctorId: selectedDoctor.id, contenu: text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages(selectedDoctor.id);
      setTimeout(scrollToBottom, 100); // Forcer le scroll après envoi
    } catch (error) {
      toast.error("Échec de l'envoi");
      setNewMessage(text);
    }
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await axios.delete(`${API_PATIENTS}/messages/${messageToDelete}`, {
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

  const filteredDoctors = doctors.filter(d => 
    d.displayFullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6 font-space-grotesk">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">
            MES <span className="text-emerald-500">PRATICIENS</span>
          </h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest mt-1">
            Messagerie médicale sécurisée
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsMuted(!isMuted)} className="rounded-2xl border-2 h-12 px-6 font-black uppercase text-[10px]">
          {isMuted ? <VolumeX className="mr-2 w-4 h-4 text-rose-500" /> : <Volume2 className="mr-2 w-4 h-4 text-emerald-500" />}
          {isMuted ? 'Silencieux' : 'Sons actifs'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[650px]">
        
        {/* LISTE DOCTEURS */}
        <Card className="lg:col-span-4 flex flex-col overflow-hidden border-2 border-border bg-card rounded-[2.5rem] shadow-sm">
          <CardHeader className="p-6 border-b-2 border-border">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Contacts
            </CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="RECHERCHER..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 bg-muted/50 border-none h-12 rounded-xl font-bold uppercase text-[10px]"
              />
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {loading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
              ) : filteredDoctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDoctor(doc)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                    selectedDoctor?.id === doc.id
                      ? 'bg-emerald-500 text-white shadow-lg scale-[1.02]'
                      : 'hover:bg-muted bg-transparent border border-transparent'
                  }`}
                >
                  <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                    <AvatarImage src={`${IMAGE_BASE_URL}${doc.photo}`} />
                    <AvatarFallback className="font-black bg-emerald-100 text-emerald-600">DR</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-black text-xs uppercase truncate tracking-tight">{doc.displayFullName}</p>
                    <p className="text-[9px] font-bold uppercase opacity-60">{doc.specialite || 'Généraliste'}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* ZONE DE CHAT */}
        <Card className="lg:col-span-8 flex flex-col overflow-hidden border-2 border-border bg-card rounded-[2.5rem] shadow-xl relative">
          {selectedDoctor ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b-2 border-border bg-card/80 backdrop-blur-md flex items-center gap-4 z-10">
                <Avatar className="w-10 h-10 ring-2 ring-emerald-500/20">
                  <AvatarImage src={`${IMAGE_BASE_URL}${selectedDoctor.photo}`} />
                  <AvatarFallback className="bg-emerald-500 text-white font-black">DR</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-black text-xs uppercase tracking-widest">{selectedDoctor.displayFullName}</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[8px] font-black uppercase text-emerald-600">Canal Sécurisé</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-muted/10 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    <AnimatePresence initial={false}>
                      {messages.map((msg, index) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={msg.id || `temp-${index}`}
                          className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="relative group max-w-[75%]">
                            <div className={`p-4 rounded-3xl shadow-sm relative ${
                              msg.sender_type === 'patient'
                                ? 'bg-emerald-500 text-white rounded-tr-none'
                                : 'bg-card border-2 border-border text-foreground rounded-tl-none'
                            }`}>
                              <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">
                                {msg.contenu || msg.content}
                              </p>
                              
                              <div className={`flex items-center gap-2 mt-2 opacity-80 text-[9px] font-black uppercase ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}>
                                <Clock size={10} />
                                {new Date(msg.created_at || msg.createdAt || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                {msg.sender_type === 'patient' && (
                                  <div className="ml-1">
                                    {msg.lu ? <CheckCheck size={14} className="text-sky-300" /> : <Check size={14} />}
                                  </div>
                                )}
                              </div>

                              {msg.sender_type === 'patient' && (
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
                    {/* Ancre pour le scroll */}
                    <div ref={messagesEndRef} className="h-2" />
                  </div>
                </ScrollArea>
              </div>

              <form onSubmit={handleSendMessage} className="p-6 border-t-2 border-border bg-card">
                <div className="flex gap-3">
                  <Input 
                    placeholder="Tapez votre message ici..." 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)}
                    // Suppression de "uppercase" ici pour permettre l'écriture normale
                    className="flex-1 bg-muted/50 border-none h-12 rounded-xl font-bold text-sm focus-visible:ring-emerald-500 shadow-none"
                  />
                  <Button type="submit" disabled={!newMessage.trim()} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 h-12 w-12 p-0 shadow-lg shadow-emerald-500/20">
                    <Send size={18} />
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <MessageSquare className="w-16 h-16 text-emerald-500/10 mb-4 animate-bounce" />
              <h3 className="text-xl font-black uppercase tracking-tighter">Votre Espace de Discussion</h3>
              <p className="text-muted-foreground text-[10px] font-bold uppercase mt-2">Choisissez un médecin pour démarrer la consultation à distance.</p>
            </div>
          )}
        </Card>
      </div>

      {/* DIALOGUE DE CONFIRMATION DE SUPPRESSION */}
      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent className="rounded-[2rem] border-2 border-border font-space-grotesk bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">
              Supprimer votre message ?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-xs uppercase opacity-70">
              Cette action supprimera le message pour vous et votre médecin.
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
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientChat;