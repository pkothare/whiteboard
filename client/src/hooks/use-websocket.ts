import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, type StrokeData, type CursorData } from '@shared/schema';

interface UseWebSocketProps {
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      isConnectingRef.current = true;
      setConnectionStatus('connecting');
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        isConnectingRef.current = false;
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        onConnect?.();
      };

      wsRef.current.onclose = (event) => {
        isConnectingRef.current = false;
        setIsConnected(false);
        setConnectionStatus('disconnected');
        onDisconnect?.();
        
        // Only reconnect on unexpected closures and within attempt limit
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, Math.min(2000 * Math.pow(2, reconnectAttempts.current), 10000));
        }
      };

      wsRef.current.onerror = (error) => {
        isConnectingRef.current = false;
        setConnectionStatus('error');
        onError?.(error);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [onMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset connection state
    isConnectingRef.current = false;
    reconnectAttempts.current = 0;
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnecting');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    connect,
    disconnect,
  };
}
