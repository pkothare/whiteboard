import React, { useRef, useEffect, useCallback, useState } from 'react';
import { WSMessage, type StrokeData, type CursorData } from '@shared/schema';

interface CanvasProps {
  tool: 'pen' | 'eraser' | 'select';
  color: string;
  size: number;
  onSendMessage: (message: WSMessage) => void;
  onMessage: (message: WSMessage) => void;
  isConnected: boolean;
  userId?: string;
  userCursors: CursorData[];
}

export default function Canvas({
  tool,
  color,
  size,
  onSendMessage,
  onMessage,
  isConnected,
  userId,
  userCursors,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      
      setCanvasSize({ width: rect.width, height: rect.height });
      
      // Set default styles
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    const handleMessage = (message: WSMessage) => {
      if (!ctxRef.current) return;

      switch (message.type) {
        case 'stroke_start':
          if (message.data && message.userId !== userId) {
            startRemoteStroke(message.data);
          }
          break;
        case 'stroke_move':
          if (message.data && message.userId !== userId) {
            continueRemoteStroke(message.data);
          }
          break;
        case 'stroke_end':
          if (message.userId !== userId) {
            endRemoteStroke();
          }
          break;
        case 'clear_canvas':
          clearCanvas();
          break;
        case 'init':
          // Load existing strokes
          if (message.data?.strokes) {
            loadStrokes(message.data.strokes);
          }
          break;
      }
    };

    onMessage(handleMessage);
  }, [onMessage, userId]);

  // Drawing functions
  const startRemoteStroke = (strokeData: StrokeData) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.globalCompositeOperation = strokeData.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = strokeData.color;
    ctx.lineWidth = strokeData.size;
    ctx.beginPath();
    ctx.moveTo(strokeData.x, strokeData.y);
  };

  const continueRemoteStroke = (strokeData: StrokeData) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.lineTo(strokeData.x, strokeData.y);
    ctx.stroke();
  };

  const endRemoteStroke = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.closePath();
  };

  const clearCanvas = () => {
    const ctx = ctxRef.current;
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const loadStrokes = (strokes: any[]) => {
    // This would replay all strokes to rebuild the canvas
    // For now, we'll just clear and let users draw fresh
    clearCanvas();
  };

  // Get coordinates from event
  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Mouse/Touch event handlers
  const handleStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isConnected || tool === 'select') return;

    event.preventDefault();
    const coords = getCoordinates(event);
    
    isDrawingRef.current = true;
    lastPointRef.current = coords;

    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    const strokeData: StrokeData = {
      x: coords.x,
      y: coords.y,
      tool,
      color,
      size,
    };

    onSendMessage({
      type: 'stroke_start',
      data: strokeData,
      timestamp: Date.now(),
    });
  }, [isConnected, tool, color, size, onSendMessage]);

  const handleMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isConnected) return;

    event.preventDefault();
    const coords = getCoordinates(event);

    // Send cursor position
    onSendMessage({
      type: 'cursor_move',
      data: coords,
      timestamp: Date.now(),
    });

    if (!isDrawingRef.current || tool === 'select') return;

    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    const strokeData: StrokeData = {
      x: coords.x,
      y: coords.y,
      tool,
      color,
      size,
    };

    onSendMessage({
      type: 'stroke_move',
      data: strokeData,
      timestamp: Date.now(),
    });

    lastPointRef.current = coords;
  }, [isConnected, tool, color, size, onSendMessage]);

  const handleEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isConnected || !isDrawingRef.current) return;

    event.preventDefault();
    isDrawingRef.current = false;

    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.closePath();

    onSendMessage({
      type: 'stroke_end',
      data: null,
      timestamp: Date.now(),
    });

    lastPointRef.current = null;
  }, [isConnected, onSendMessage]);

  // Get cursor style based on tool
  const getCursorStyle = () => {
    switch (tool) {
      case 'pen':
        return 'cursor-crosshair';
      case 'eraser':
        return 'cursor-crosshair';
      case 'select':
        return 'cursor-default';
      default:
        return 'cursor-crosshair';
    }
  };

  return (
    <div className="absolute inset-0 bg-white">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${getCursorStyle()}`}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{ touchAction: 'none' }}
      />
      
      {/* User Cursors */}
      {userCursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-10"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: cursor.color }}
            />
            <div 
              className="text-white px-2 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
