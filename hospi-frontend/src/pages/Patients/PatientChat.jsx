import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_PATIENTS = `${BACKEND_URL}/api/v1/patients`;
const IMAGE_BASE_URL = `${BACKEND_URL}/uploads/profiles/`;

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
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
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
      const response = await api.get(`/api/v1/patients/my-doctors`);
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
    setShowChatOnMobile(true);
  };

  const handleBackToList = () => {
    setShowChatOnMobile(false);
    setSelectedDoctor(null);
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
    <div className="h-screen flex flex-col bg-gray-50 font-sans">
      {/* HEADER - WhatsApp style */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Messages</h1>
          <p className="text-sm text-gray-500">Communication avec vos médecins</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="rounded-full">
            {isMuted ? <VolumeX className="w-5 h-5 text-gray-600" /> : <Volume2 className="w-5 h-5 text-emerald-600" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LISTE DOCTEURS - WhatsApp style sidebar */}
        <div className={`${showChatOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-96 bg-white border-r border-gray-200 flex flex-col`}>
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher un médecin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-100 border-none h-10 rounded-lg text-sm"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="divide-y divide-gray-100">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="p-3 flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : filteredDoctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDoctor(doc)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                    selectedDoctor?.id === doc.id ? 'bg-emerald-50' : ''
                  }`}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={`${IMAGE_BASE_URL}${doc.photo}`} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold">DR</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{doc.displayFullName}</p>
                    <p className="text-xs text-gray-500">{doc.specialite || 'Généraliste'}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* ZONE DE CHAT - WhatsApp style */}
        <div className={`${!showChatOnMobile ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-gray-50`}>
          {selectedDoctor ? (
            <>
              {/* Chat header */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleBackToList} 
                    className="md:hidden rounded-full h-9 w-9 mr-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </Button>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`${IMAGE_BASE_URL}${selectedDoctor.photo}`} />
                    <AvatarFallback className="bg-emerald-500 text-white font-semibold">DR</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">{selectedDoctor.displayFullName}</h3>
                    <p className="text-xs text-emerald-600">Canal sécurisé</p>
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id || `temp-${index}`}
                        className={`flex ${msg.sender_type === 'patient' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="relative group max-w-[70%]">
                          <div className={`px-4 py-2 rounded-lg shadow-sm ${
                            msg.sender_type === 'patient'
                              ? 'bg-emerald-500 text-white rounded-br-none'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                          }`}>
                            <p className="text-sm leading-relaxed">
                              {msg.contenu || msg.content}
                            </p>
                            
                            <div className={`flex items-center gap-1 mt-1 text-[10px] ${msg.sender_type === 'patient' ? 'justify-end text-white/80' : 'justify-start text-gray-500'}`}>
                              <Clock size={10} />
                              {new Date(msg.created_at || msg.createdAt || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {msg.sender_type === 'patient' && (
                                <div className="ml-1">
                                  {msg.lu ? <CheckCheck size={14} className="text-sky-300" /> : <Check size={14} />}
                                </div>
                              )}
                            </div>

                            {msg.sender_type === 'patient' && (
                              <div className="absolute top-1 -left-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-gray-200">
                                      <MoreVertical size={12} />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      onClick={() => setMessageToDelete(msg.id)}
                                      className="text-red-600 text-xs cursor-pointer"
                                    >
                                      <Trash2 size={12} className="mr-2" /> Supprimer
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
              </div>

              {/* Message input - WhatsApp style */}
              <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Écrivez un message..." 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="bg-gray-100 border-none rounded-full h-10 px-4 text-sm focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim()} 
                    className="rounded-full bg-emerald-500 hover:bg-emerald-600 h-10 w-10 p-0 flex items-center justify-center"
                  >
                    <Send size={18} className="text-white" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
              <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700">Sélectionnez une conversation</h3>
              <p className="text-sm text-gray-500 mt-2">Choisissez un médecin pour commencer la discussion</p>
            </div>
          )}
        </div>
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