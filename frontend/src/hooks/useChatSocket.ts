import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_WS_URL || 'https://ajentrix.com';
const SOCKET_PATH = '/socket.io/chat';

export interface ChatSocketEvents {
  'connection:established': (data: { userId: number; timestamp: number }) => void;
  'message:new': (message: any) => void;
  'message:updated': (message: any) => void;
  'message:deleted': (data: { message_id: string; conversation_id: string }) => void;
  'message:read': (data: { message_id: string; user_id: number }) => void;
  'typing:status': (data: { conversation_id: string; user_id: number; is_typing: boolean }) => void;
  'reaction:added': (data: { message_id: string; emoji: string; user_id: number }) => void;
  'reaction:removed': (data: { message_id: string; emoji: string; user_id: number }) => void;
  'signal:received': (data: { message: any; signal: any }) => void;
  'user:presence': (data: { user_id: number; status: string; last_seen: string }) => void;
  'notification': (data: { type: string; title: string; message: string; conversation_id?: string; [key: string]: any }) => void;
  'error': (data: { message: string; details?: string }) => void;
}

export function useChatSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('No authentication token found');
      return;
    }

    // Initialize Socket.io client
    // Use polling first, then upgrade to WebSocket (recommended for proxies/Nginx)
    const newSocket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      auth: { token },
      transports: ['polling', 'websocket'], // Try polling first (works), then upgrade to WebSocket
      upgrade: true, // Allow automatic upgrade to WebSocket
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('💬 Chat socket connected, socket ID:', newSocket.id);
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('💬 Chat socket disconnected:', reason);
      setConnected(false);
      // Don't manually reconnect - let Socket.io handle it automatically
    });

    newSocket.on('connect_error', (err) => {
      console.error('💬 Chat socket connection error:', err);
      setError(err.message);
      setConnected(false);
    });

    newSocket.on('connection:established', (data) => {
      console.log('💬 Chat connection established:', data);
      // Ensure connected state is set when we receive confirmation
      setConnected(true);
      setError(null);
    });

    // Handle reconnection attempts
    newSocket.io.on('reconnect_attempt', (attemptNumber) => {
      console.log(`💬 Chat reconnection attempt ${attemptNumber}`);
    });

    newSocket.io.on('reconnect', (attemptNumber) => {
      console.log(`💬 Chat reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setError(null);
    });

    newSocket.io.on('reconnect_failed', () => {
      console.error('💬 Chat reconnection failed');
      setError('Failed to reconnect to chat server');
      setConnected(false);
    });

    newSocket.on('error', (data) => {
      console.error('💬 Chat socket error:', data);
      toast.error(data.message || 'Chat error occurred');
    });

    newSocket.on('notification:new', (data) => {
      console.log('💬 Chat notification received:', data);
      // Show notification toast
      if (data.title && data.message) {
        if (data.type === 'friend_request' || data.type === 'friend_request_accepted') {
          toast.success(`${data.title}: ${data.message}`, {
            duration: 5000,
            icon: '👤'
          });
        } else {
          toast.success(`${data.title}: ${data.message}`, {
            duration: 5000,
            icon: '💬'
          });
        }
      }
    });

    // Legacy notification event (for backward compatibility)
    newSocket.on('notification', (data) => {
      console.log('💬 Chat notification received (legacy):', data);
      if (data.title && data.message) {
        toast.success(`${data.title}: ${data.message}`, {
          duration: 5000,
          icon: '💬'
        });
      }
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  return {
    socket,
    connected,
    error
  };
}

