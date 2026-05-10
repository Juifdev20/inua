import { useState, useEffect } from 'react';
import { websocketService } from '@/services/websocketService';

export const useWebSocket = () => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const handleMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    websocketService.connect(handleMessage);
    setIsConnected(websocketService.isConnected());

    const checkConnection = setInterval(() => {
      setIsConnected(websocketService.isConnected());
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      websocketService.disconnect();
    };
  }, []);

  const sendMessage = (destination, body) => {
    websocketService.sendMessage(destination, body);
  };

  return {
    messages,
    isConnected,
    sendMessage
  };
};
