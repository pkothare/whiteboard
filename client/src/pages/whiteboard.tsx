import React, { useState, useCallback, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/useAuth';
import Canvas from '@/components/whiteboard/canvas';
import Toolbar from '@/components/whiteboard/toolbar';
import MobileToolbar from '@/components/whiteboard/mobile-toolbar';
import UserMenu from '@/components/auth/user-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Wifi, WifiOff, ChevronRight, Copy, Check, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WSMessage, type CursorData } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface User {
  userId: string;
  name: string;
  color: string;
  isActive: boolean;
}

export default function Whiteboard() {
  const { user, isLoading } = useAuth();
  const { sessionId } = useParams<{ sessionId?: string }>();
  
  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    window.location.href = '/api/login';
    return null;
  }
  const { toast } = useToast();
  const [tool, setTool] = useState<'pen' | 'eraser' | 'select'>('pen');
  const [color, setColor] = useState('#3B82F6');
  const [size, setSize] = useState(5);
  const [users, setUsers] = useState<User[]>([]);
  const [userCursors, setUserCursors] = useState<CursorData[]>([]);
  const [currentUser, setCurrentUser] = useState<{ userId: string; name: string; color: string } | null>(null);
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messageHandlersRef = useRef<((message: WSMessage) => void)[]>([]);

  // Fetch session info if sessionId is provided
  const { data: session } = useQuery({
    queryKey: ['/api/sessions', sessionId],
    enabled: !!sessionId,
  });

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
        
      case 'session_joined':
        // Handle successful session join with session-specific data
        console.log('Successfully joined session:', message.data?.sessionId);
        // The existing strokes are handled by the canvas component
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
    onConnect: () => {
      handleConnect();
      // Send user info and session join when connected
      if (user) {
        setTimeout(() => {
          const userName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.email?.split('@')[0] || 'Anonymous User';
          
          console.log('Sending user info:', userName);
          try {
            // First send user info
            sendMessage({
              type: 'user_info',
              data: { userName },
              timestamp: Date.now(),
            });
            
            // Then join session if we have a sessionId
            if (sessionId) {
              console.log('Joining session:', sessionId);
              sendMessage({
                type: 'join_session',
                data: { sessionId },
                timestamp: Date.now(),
              });
            }
          } catch (error) {
            console.error('Error sending initial messages:', error);
          }
        }, 100);
      }
    },
    onDisconnect: handleDisconnect,
    onError: handleError,
  });

  const handleClearCanvas = useCallback(() => {
    try {
      sendMessage({
        type: 'clear_canvas',
        data: {},
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error sending clear canvas message:', error);
    }
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

  const copySessionLink = async () => {
    if (!sessionId) return;
    
    const sessionUrl = `${window.location.origin}/whiteboard/${sessionId}`;
    await navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    
    toast({
      title: "Link Copied!",
      description: "Session link copied to clipboard.",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleShareCard = () => {
    setShowShareCard(!showShareCard);
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
            
            {/* User Count and Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="text-sm text-slate-600">{users.length} users online</span>
              </div>
              
              {/* Share Button */}
              {sessionId && (
                <Button
                  onClick={toggleShareCard}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </Button>
              )}
              
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
          {/* Share Card */}
          {showShareCard && sessionId && (
            <div className="absolute top-4 right-4 z-30">
              <Card className="w-80 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Share Session
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowShareCard(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session && (
                    <p className="text-sm text-gray-600 mb-3">
                      {session.name}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={copySessionLink}
                      variant="outline"
                      className="flex-1"
                    >
                      {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Share this link to invite others to collaborate on this whiteboard.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Floating Toggle Button */}
          {isToolbarCollapsed && (
            <div className="absolute top-4 left-4 z-20">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsToolbarCollapsed(false)}
                className="shadow-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="w-full h-full canvas-container">
            <Canvas
              tool={tool}
              color={color}
              size={size}
              onSendMessage={sendMessage}
              onMessage={registerMessageHandler}
              isConnected={isConnected}
              userId={currentUser?.userId}
              userCursors={userCursors}
              onViewportChange={(viewport) => setCanvasZoom(viewport.zoom)}
            />
            
            {/* Zoom indicator - bottom right */}
            <div className="absolute bottom-4 right-4 z-10 bg-black/10 backdrop-blur-sm rounded-lg px-3 py-1 text-sm text-gray-700">
              <span className="font-medium">Zoom: {Math.round(canvasZoom * 100)}%</span>
              <div className="text-xs text-gray-500 mt-1">
                Scroll to zoom • Middle drag to pan
              </div>
            </div>
          </div>
        </div>


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
