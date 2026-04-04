import React, { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import { Bell, CheckCircle, Calendar, FileText, Info } from 'lucide-react';
import axios from 'axios';

const NotificationBell = ({ userId }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // 1. Charger l'historique et le compteur au démarrage
        fetchNotifications();
        fetchUnreadCount();

        // 2. Connexion WebSocket pour le temps réel
        const socket = new SockJS('http://localhost:8080/ws-notifications');
        const stompClient = Stomp.over(socket);
        
        // Désactiver les logs console de Stomp pour plus de propreté
        stompClient.debug = null;

        stompClient.connect({}, () => {
            stompClient.subscribe(`/topic/notifications/${userId}`, (message) => {
                const newNotif = JSON.parse(message.body);
                
                // Ajouter la nouvelle notification en haut de la liste
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);
                
                // Optionnel : Jouer un petit son ou montrer un Toast/Browser notification
                if (Notification.permission === "granted") {
                    new Notification(newNotif.title, { body: newNotif.message });
                }
            });
        });

        return () => stompClient.disconnect();
    }, [userId]);

    const fetchNotifications = async () => {
        const res = await axios.get(`http://localhost:8080/api/notifications/user/${userId}`);
        setNotifications(res.data);
    };

    const fetchUnreadCount = async () => {
        const res = await axios.get(`http://localhost:8080/api/notifications/user/${userId}/unread-count`);
        setUnreadCount(res.data);
    };

    const handleMarkAsRead = async (id) => {
        await axios.patch(`http://localhost:8080/api/notifications/${id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    // Icone selon le type de notification
    const getIcon = (type) => {
        switch (type) {
            case 'RENDEZ_VOUS': return <Calendar className="text-blue-500" size={18} />;
            case 'DOCUMENT': return <FileText className="text-green-500" size={18} />;
            default: return <Info className="text-gray-500" size={18} />;
        }
    };

    return (
        <div className="relative">
            {/* Bouton Cloche */}
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Menu Déroulant */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b font-bold flex justify-between items-center bg-gray-50">
                        <span>Notifications</span>
                        <span className="text-xs text-blue-600 cursor-pointer hover:underline">Tout marquer comme lu</span>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">Aucune notification</div>
                        ) : (
                            notifications.map(notif => (
                                <div 
                                    key={notif.id} 
                                    className={`p-3 border-b hover:bg-gray-50 flex items-start gap-3 transition ${!notif.read ? 'bg-blue-50' : ''}`}
                                    onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                                >
                                    <div className="mt-1">{getIcon(notif.type)}</div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${!notif.read ? 'font-bold' : 'text-gray-700'}`}>{notif.title}</p>
                                        <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {new Date(notif.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;