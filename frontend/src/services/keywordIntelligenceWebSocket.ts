import { io, Socket } from 'socket.io-client';

export interface MonitorUpdate {
  monitorId: string;
  type: 'snapshot' | 'status-change' | 'alert';
  snapshot?: any;
  isActive?: boolean;
  alert?: any;
  timestamp: string;
}

export interface AlertUpdate {
  id: string;
  monitor_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: any;
  previous_value?: number;
  current_value?: number;
  change_percent?: number;
  timestamp: string;
}

class KeywordIntelligenceWebSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnected = false;

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('[Keyword Intelligence WS] No auth token, cannot connect');
      return;
    }

    // Determine WebSocket URL
    let wsUrl = process.env.REACT_APP_WS_URL;
    if (!wsUrl && process.env.REACT_APP_API_URL) {
      const apiUrl = process.env.REACT_APP_API_URL;
      wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    }
    if (!wsUrl) {
      // Default to same origin
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}`;
    }

    this.socket = io(wsUrl, {
      path: '/socket.io/keyword-intelligence',
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Keyword Intelligence WS] Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Keyword Intelligence WS] Disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Keyword Intelligence WS] Connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Keyword Intelligence WS] Max reconnection attempts reached');
        this.emit('connection-failed');
      }
    });

    this.socket.on('monitor-update', (data: MonitorUpdate) => {
      console.log('[Keyword Intelligence WS] Monitor update:', data);
      this.emit('monitor-update', data);
    });

    this.socket.on('alert', (data: AlertUpdate) => {
      console.log('[Keyword Intelligence WS] Alert:', data);
      this.emit('alert', data);
    });
  }

  subscribeToMonitor(monitorId: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe-monitor', monitorId);
      console.log(`[Keyword Intelligence WS] Subscribed to monitor ${monitorId}`);
    }
  }

  unsubscribeFromMonitor(monitorId: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe-monitor', monitorId);
      console.log(`[Keyword Intelligence WS] Unsubscribed from monitor ${monitorId}`);
    }
  }

  // Alias for consistency
  unsubscribe(monitorId: string) {
    this.unsubscribeFromMonitor(monitorId);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Keyword Intelligence WS] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

// Export singleton instance
export const keywordIntelligenceWebSocket = new KeywordIntelligenceWebSocket();

