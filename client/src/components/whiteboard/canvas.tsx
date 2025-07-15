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
  onViewportChange?: (viewport: ViewportTransform) => void;
}

interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
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
  onViewportChange,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<ViewportTransform>({ x: 0, y: 0, zoom: 1 });
  const viewportRef = useRef<ViewportTransform>({ x: 0, y: 0, zoom: 1 });

  // Update viewport reference whenever viewport state changes
  useEffect(() => {
    viewportRef.current = viewport;
    onViewportChange?.(viewport);
  }, [viewport, onViewportChange]);

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
      
      // Set the actual canvas size in memory (scaled for high DPI)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Set the display size (CSS pixels)
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Scale the drawing context to match device pixel ratio
      ctx.scale(dpr, dpr);
      
      setCanvasSize({ width: rect.width, height: rect.height });
      
      // Set default styles
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      
      // Redraw with new size
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Store all strokes for infinite canvas
  const strokesRef = useRef<any[]>([]);
  const currentStrokeRef = useRef<any[]>([]);

  // Apply viewport transformation to context
  const applyViewportTransform = useCallback((ctx: CanvasRenderingContext2D) => {
    const { x, y, zoom } = viewportRef.current;
    ctx.setTransform(zoom, 0, 0, zoom, x * zoom, y * zoom);
  }, []);

  // Clear and redraw entire canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transform
    applyViewportTransform(ctx);

    // Redraw all strokes
    strokesRef.current.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [applyViewportTransform]);

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

  // Remote stroke handling
  const remoteStrokeRef = useRef<any[]>([]);

  const startRemoteStroke = (strokeData: StrokeData) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Start new remote stroke
    remoteStrokeRef.current = [{
      x: strokeData.x,
      y: strokeData.y,
      tool: strokeData.tool,
      color: strokeData.color,
      size: strokeData.size,
    }];

    applyViewportTransform(ctx);
    ctx.globalCompositeOperation = strokeData.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = strokeData.color;
    ctx.lineWidth = strokeData.size;
    ctx.beginPath();
    ctx.moveTo(strokeData.x, strokeData.y);
  };

  const continueRemoteStroke = (strokeData: StrokeData) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Add to remote stroke
    remoteStrokeRef.current.push({
      x: strokeData.x,
      y: strokeData.y,
      tool: strokeData.tool,
      color: strokeData.color,
      size: strokeData.size,
    });

    applyViewportTransform(ctx);
    ctx.lineTo(strokeData.x, strokeData.y);
    ctx.stroke();
  };

  const endRemoteStroke = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Save completed remote stroke
    if (remoteStrokeRef.current.length > 0) {
      const firstPoint = remoteStrokeRef.current[0];
      strokesRef.current.push({
        points: [...remoteStrokeRef.current],
        tool: firstPoint.tool,
        color: firstPoint.color,
        size: firstPoint.size,
      });
      remoteStrokeRef.current = [];
    }

    ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !canvas) return;

    // Clear stored strokes
    strokesRef.current = [];
    currentStrokeRef.current = [];
    remoteStrokeRef.current = [];

    // Clear the entire canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset any drawing state
    ctx.beginPath();
  };

  const loadStrokes = (strokes: any[]) => {
    // This would replay all strokes to rebuild the canvas
    // For now, we'll just clear and let users draw fresh
    clearCanvas();
  };

  // Get coordinates from event (screen coordinates)
  const getScreenCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    return { x, y };
  };

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const { x, y, zoom } = viewportRef.current;
    return {
      x: (screenX / zoom) - x,
      y: (screenY / zoom) - y,
    };
  }, []);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const { x, y, zoom } = viewportRef.current;
    return {
      x: (worldX + x) * zoom,
      y: (worldY + y) * zoom,
    };
  }, []);

  // Mouse/Touch event handlers
  const handleStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isConnected) return;

    event.preventDefault();
    const screenCoords = getScreenCoordinates(event);
    const button = 'button' in event ? event.button : 0;

    // Handle middle mouse button for panning
    if (button === 1) {
      isPanningRef.current = true;
      lastPanPointRef.current = screenCoords;
      return;
    }

    // Handle drawing
    if (tool === 'select' || button !== 0) return;

    const worldCoords = screenToWorld(screenCoords.x, screenCoords.y);
    
    isDrawingRef.current = true;
    lastPointRef.current = worldCoords;

    // Start new stroke
    currentStrokeRef.current = [{
      x: worldCoords.x,
      y: worldCoords.y,
      tool,
      color,
      size,
    }];

    const ctx = ctxRef.current;
    if (!ctx) return;

    applyViewportTransform(ctx);
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(worldCoords.x, worldCoords.y);

    const strokeData: StrokeData = {
      x: worldCoords.x,
      y: worldCoords.y,
      tool,
      color,
      size,
    };

    onSendMessage({
      type: 'stroke_start',
      data: strokeData,
      timestamp: Date.now(),
    });
  }, [isConnected, tool, color, size, onSendMessage, screenToWorld, applyViewportTransform]);

  const handleMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!isConnected) return;

    event.preventDefault();
    const screenCoords = getScreenCoordinates(event);
    const worldCoords = screenToWorld(screenCoords.x, screenCoords.y);

    // Handle panning
    if (isPanningRef.current && lastPanPointRef.current) {
      const deltaX = screenCoords.x - lastPanPointRef.current.x;
      const deltaY = screenCoords.y - lastPanPointRef.current.y;
      
      setViewport(prev => ({
        ...prev,
        x: prev.x + deltaX / prev.zoom,
        y: prev.y + deltaY / prev.zoom,
      }));
      
      lastPanPointRef.current = screenCoords;
      redrawCanvas();
      return;
    }

    // Send cursor position in world coordinates
    onSendMessage({
      type: 'cursor_move',
      data: {
        x: worldCoords.x,
        y: worldCoords.y
      },
      timestamp: Date.now(),
    });

    if (!isDrawingRef.current || tool === 'select') return;

    const ctx = ctxRef.current;
    if (!ctx) return;

    // Add point to current stroke
    currentStrokeRef.current.push({
      x: worldCoords.x,
      y: worldCoords.y,
      tool,
      color,
      size,
    });

    applyViewportTransform(ctx);
    ctx.lineTo(worldCoords.x, worldCoords.y);
    ctx.stroke();

    lastPointRef.current = worldCoords;

    const strokeData: StrokeData = {
      x: worldCoords.x,
      y: worldCoords.y,
      tool,
      color,
      size,
    };

    onSendMessage({
      type: 'stroke_move',
      data: strokeData,
      timestamp: Date.now(),
    });
  }, [isConnected, tool, color, size, onSendMessage, screenToWorld, applyViewportTransform, redrawCanvas]);

  const handleEnd = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      lastPanPointRef.current = null;
      return;
    }

    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    lastPointRef.current = null;

    // Save completed stroke
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push({
        points: [...currentStrokeRef.current],
        tool,
        color,
        size,
      });
      currentStrokeRef.current = [];
    }

    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.closePath();

    onSendMessage({
      type: 'stroke_end',
      data: {},
      timestamp: Date.now(),
    });
  }, [onSendMessage, tool, color, size]);

  // Handle wheel zoom
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    
    const screenCoords = getScreenCoordinates(event);
    const worldCoords = screenToWorld(screenCoords.x, screenCoords.y);
    
    // Zoom factor
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor));
    
    // Calculate new viewport position to zoom towards mouse
    const newX = worldCoords.x - (screenCoords.x / newZoom);
    const newY = worldCoords.y - (screenCoords.y / newZoom);
    
    setViewport({
      x: newX,
      y: newY,
      zoom: newZoom,
    });
    
    // Redraw with new zoom
    setTimeout(() => redrawCanvas(), 0);
  }, [viewport, screenToWorld, redrawCanvas]);

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
    <div className="absolute inset-0 bg-white overflow-hidden">
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
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
      />
      
      {/* User Cursors */}
      {userCursors.map((cursor) => {
        // Convert world coordinates to screen coordinates for cursor display
        const screenPos = worldToScreen(cursor.x, cursor.y);
        return (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none z-10"
            style={{
              left: `${screenPos.x}px`,
              top: `${screenPos.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: cursor.color }}
            />
            <div 
              className="absolute top-4 left-2 px-2 py-1 text-xs text-white rounded shadow-md whitespace-nowrap"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
