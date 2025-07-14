import React, { useState, useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/useAuth';
import Canvas from '@/components/whiteboard/canvas';
import Toolbar from '@/components/whiteboard/toolbar';
import UserPanel from '@/components/whiteboard/user-panel';
import MobileToolbar from '@/components/whiteboard/mobile-toolbar';
import UserMenu from '@/components/auth/user-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { WSMessage, type CursorData } from '@shared/schema';

interface User {
  userId: string;
  name: string;
  color: string;
  isActive: boolean;
}

export default function Whiteboard() {
  const { user } = useAuth();
  const [tool, setTool] = useState<'pen' | 'eraser' | 'select'>('pen');
  const [color, setColor] = useState('#3B82F6');
  const [size, setSize] = useState(5);
  const [users, setUsers] = useState<User[]>([]);
  const [userCursors, setUserCursors] = useState<CursorData[]>([]);
  const [currentUser, setCurrentUser] = useState<{ userId: string; name: string; color: string } | null>(null);
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messageHandlersRef = useRef<((message: WSMessage) => void)[]>([]);

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'init':
        if (message.data) {
          setCurrentUser({
            userId: message.data.userId,
            name: message.data.userName,
            color: message.data.color,
          });
        }
        break;
        
      case 'user_joined':
        if (message.data) {
          setUsers(prev => [...prev.filter(u => u.userId !== message.data.userId), {
            userId: message.data.userId,
            name: message.data.name,
            color: message.data.color,
            isActive: true,
          }]);
        }
        break;
        
      case 'user_left':
        if (message.data) {
          setUsers(prev => prev.filter(u => u.userId !== message.data.userId));
          setUserCursors(prev => prev.filter(c => c.userId !== message.data.userId));
        }
        break;
        
      case 'user_list':
        if (message.data) {
          setUsers(message.data);
        }
        break;
        
      case 'cursor_move':
        if (message.data) {
          setUserCursors(prev => {
            const filtered = prev.filter(c => c.userId !== message.data.userId);
            return [...filtered, {
              userId: message.data.userId,
              userName: message.data.userName,
              color: message.data.color,
              x: message.data.x,
              y: message.data.y,
            }];
          });
        }
        break;
    }
    
    // Forward to canvas and other handlers
    messageHandlersRef.current.forEach(handler => handler(message));
  }, []);

  const handleConnect = useCallback(() => {
    setShowConnectionAlert(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    setShowConnectionAlert(true);
  }, []);

  const handleError = useCallback(() => {
    setShowConnectionAlert(true);
  }, []);

  const { isConnected, connectionStatus, sendMessage } = useWebSocket({
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
  });

  const handleClearCanvas = useCallback(() => {
    sendMessage({
      type: 'clear_canvas',
      data: {},
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  const handleSaveCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  const handleShowColorPicker = useCallback(() => {
    // For mobile, we could show a modal color picker
    // For now, just cycle through common colors
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#1E293B'];
    const currentIndex = colors.indexOf(color);
    const nextIndex = (currentIndex + 1) % colors.length;
    setColor(colors[nextIndex]);
  }, [color]);

  const registerMessageHandler = useCallback((handler: (message: WSMessage) => void) => {
    messageHandlersRef.current.push(handler);
    return handler;
  }, []);

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="h-screen bg-white font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm relative z-20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-800">Collaborative Whiteboard</h1>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()} ${isConnected ? 'animate-pulse' : ''}`} />
              <span className="text-sm text-slate-600">{getConnectionStatusText()}</span>
            </div>
            
            {/* User Count */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="text-sm text-slate-600">{users.length} users online</span>
              </div>
              
              {/* User Menu */}
              {user && <UserMenu user={user} />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Toolbar */}
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          size={size}
          setSize={setSize}
          onClearCanvas={handleClearCanvas}
          onSaveCanvas={handleSaveCanvas}
          isConnected={isConnected}
          isCollapsed={isToolbarCollapsed}
          onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
        />

        {/* Canvas Container */}
        <div className="flex-1 relative">
          <Canvas
            tool={tool}
            color={color}
            size={size}
            onSendMessage={sendMessage}
            onMessage={registerMessageHandler}
            isConnected={isConnected}
            userId={currentUser?.userId}
            userCursors={userCursors}
          />
        </div>

        {/* User Panel */}
        <UserPanel users={users} currentUserId={currentUser?.userId} />
      </div>

      {/* Mobile Toolbar */}
      <MobileToolbar
        tool={tool}
        setTool={setTool}
        onClearCanvas={handleClearCanvas}
        onShowColorPicker={handleShowColorPicker}
        isConnected={isConnected}
      />

      {/* Connection Alert */}
      {showConnectionAlert && (
        <div className="fixed top-20 right-4 z-30">
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Connection lost. Reconnecting...
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
