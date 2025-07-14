import React from 'react';
import { Button } from '@/components/ui/button';
import { Pen, Eraser, Palette, Trash2 } from 'lucide-react';

interface MobileToolbarProps {
  tool: 'pen' | 'eraser' | 'select';
  setTool: (tool: 'pen' | 'eraser' | 'select') => void;
  onClearCanvas: () => void;
  onShowColorPicker: () => void;
  isConnected: boolean;
}

export default function MobileToolbar({
  tool,
  setTool,
  onClearCanvas,
  onShowColorPicker,
  isConnected,
}: MobileToolbarProps) {
  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      onClearCanvas();
    }
  };

  return (
    <div className="lg:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg border border-slate-200 px-4 py-2 z-20">
      <div className="flex items-center space-x-4">
        <Button
          size="sm"
          variant={tool === 'pen' ? 'default' : 'ghost'}
          className="p-2 rounded-full"
          onClick={() => setTool('pen')}
          disabled={!isConnected}
        >
          <Pen className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant={tool === 'eraser' ? 'default' : 'ghost'}
          className="p-2 rounded-full"
          onClick={() => setTool('eraser')}
          disabled={!isConnected}
        >
          <Eraser className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="p-2 rounded-full"
          onClick={onShowColorPicker}
          disabled={!isConnected}
        >
          <Palette className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="p-2 rounded-full text-red-600 hover:bg-red-50"
          onClick={handleClearCanvas}
          disabled={!isConnected}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
