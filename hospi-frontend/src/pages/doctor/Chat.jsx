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
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
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
    setShowChatOnMobile(true);
  };

  const handleBackToList = () => {
    setShowChatOnMobile(false);
    setSelectedPatient(null);
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
    <div className="h-screen flex flex-col bg-background text-foreground font-sans">
      {/* HEADER - WhatsApp style */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground">Communication avec vos patients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="rounded-full">
            {isMuted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-emerald-600" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LISTE PATIENTS - WhatsApp style sidebar */}
        <div className={`${showChatOnMobile ? 'hidden md:flex' : 'flex'} w-full md:w-96 bg-card border-r border-border flex flex-col`}>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted border-none h-10 rounded-lg text-sm"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="p-3 flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : sortedPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-muted/60 transition-colors ${
                    selectedPatient?.id === p.id ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                        <AvatarImage src={getPhotoUrl(p)} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 font-semibold">
                        {p.prenom?.[0]}{p.nom?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    {unreadCounts[p.id] > 0 && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
                            {unreadCounts[p.id]}
                        </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {p.displayFullName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${p.en_ligne ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                      <p className="text-xs text-muted-foreground">
                        {p.en_ligne ? 'En ligne' : 'Hors ligne'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* ZONE DE CHAT - WhatsApp style */}
        <div className={`${!showChatOnMobile ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-background`}>
          {selectedPatient ? (
            <>
              {/* Chat header */}
              <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleBackToList} 
                    className="rounded-full h-9 w-9 mr-1 text-muted-foreground hover:bg-muted"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </Button>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={getPhotoUrl(selectedPatient)} />
                    <AvatarFallback className="bg-emerald-500 text-white font-semibold">
                      {selectedPatient.prenom?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm">{selectedPatient.displayFullName}</h3>
                    <p className="text-xs text-emerald-600">
                      {selectedPatient.en_ligne ? 'En ligne' : 'Hors ligne'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                    <Phone size={18} className="text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                    <Video size={18} className="text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 bg-background">
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id || `temp-${index}`} 
                        className={`flex ${msg.sender_type === 'doctor' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="relative group max-w-[70%]">
                          <div className={`px-4 py-2 rounded-lg shadow-sm ${
                            msg.sender_type === 'doctor'
                              ? 'bg-emerald-500 text-white rounded-br-none'
                              : 'bg-card text-foreground border border-border rounded-bl-none'
                          }`}>
                            {msg.fileUrl ? (
                              <div className="space-y-2">
                                {isImage(msg.fileUrl) ? (
                                  <img 
                                    src={`${API_URL}${msg.fileUrl}`} 
                                    alt="Examen" 
                                    className="max-h-60 w-full object-cover rounded cursor-pointer" 
                                    onClick={() => window.open(`${API_URL}${msg.fileUrl}`, '_blank')} 
                                  />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <FileText size={16} />
                                    <span className="text-xs font-medium">{msg.titre || "Fichier"}</span>
                                  </div>
                                )}
                                <button 
                                  onClick={() => window.open(`${API_URL}${msg.fileUrl}`, '_blank')} 
                                  className={`text-xs underline font-medium flex items-center gap-1 ${msg.sender_type === 'doctor' ? 'text-white' : 'text-emerald-600'}`}
                                >
                                  <Download size={12} /> Ouvrir
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed">{msg.contenu || msg.content}</p>
                            )}
                            
                            <div className={`flex items-center gap-1 mt-1 text-[10px] ${msg.sender_type === 'doctor' ? 'justify-end text-white/80' : 'justify-start text-muted-foreground'}`}>
                              <Clock size={10} />
                              {new Date(msg.created_at || msg.createdAt || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {msg.sender_type === 'doctor' && (
                                <div className="ml-1">{renderMessageStatus(msg)}</div>
                              )}
                            </div>

                            {msg.sender_type === 'doctor' && (
                              <div className="absolute top-1 -left-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted">
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
              <form onSubmit={handleSendMessage} className="bg-card border-t border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <input type="file" id="chat-file-upload" className="hidden" onChange={handleFileUpload} />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-10 w-10 text-muted-foreground hover:bg-muted" 
                    onClick={() => document.getElementById('chat-file-upload').click()} 
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="animate-spin" /> : <Paperclip size={20} />}
                  </Button>

                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Écrivez un message..." 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                      className="bg-muted border-none rounded-full h-10 px-4 text-sm focus-visible:ring-2 focus-visible:ring-emerald-500" 
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
            <div className="flex-1 flex flex-col items-center justify-center bg-background">
              <MessageSquare className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold">Sélectionnez une conversation</h3>
              <p className="text-sm text-muted-foreground mt-2">Choisissez un patient pour commencer la discussion</p>
            </div>
          )}
        </div>
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