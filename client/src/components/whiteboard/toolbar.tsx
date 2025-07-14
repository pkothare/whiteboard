import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Pen, Eraser, MousePointer, Trash2, Download } from 'lucide-react';

interface ToolbarProps {
  tool: 'pen' | 'eraser' | 'select';
  setTool: (tool: 'pen' | 'eraser' | 'select') => void;
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  onClearCanvas: () => void;
  onSaveCanvas: () => void;
  isConnected: boolean;
}

const colors = [
  '#1E293B', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16', '#6B7280'
];

const brushSizes = [
  { size: 2, label: 'Small', dotSize: 'w-1 h-1' },
  { size: 5, label: 'Medium', dotSize: 'w-2 h-2' },
  { size: 10, label: 'Large', dotSize: 'w-3 h-3' },
];

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  onClearCanvas,
  onSaveCanvas,
  isConnected,
}: ToolbarProps) {
  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      onClearCanvas();
    }
  };

  return (
    <div className="bg-white border-r border-slate-200 shadow-sm w-16 lg:w-64 flex flex-col">
      {/* Drawing Tools */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-700 mb-3 hidden lg:block">Drawing Tools</h3>
        <div className="space-y-2">
          <Button
            variant={tool === 'pen' ? 'default' : 'outline'}
            className="w-full lg:w-auto flex items-center justify-center lg:justify-start space-x-3"
            onClick={() => setTool('pen')}
            disabled={!isConnected}
          >
            <Pen className="w-4 h-4" />
            <span className="hidden lg:block">Pen</span>
          </Button>
          
          <Button
            variant={tool === 'eraser' ? 'default' : 'outline'}
            className="w-full lg:w-auto flex items-center justify-center lg:justify-start space-x-3"
            onClick={() => setTool('eraser')}
            disabled={!isConnected}
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden lg:block">Eraser</span>
          </Button>
          
          <Button
            variant={tool === 'select' ? 'default' : 'outline'}
            className="w-full lg:w-auto flex items-center justify-center lg:justify-start space-x-3"
            onClick={() => setTool('select')}
            disabled={!isConnected}
          >
            <MousePointer className="w-4 h-4" />
            <span className="hidden lg:block">Select</span>
          </Button>
        </div>
      </div>

      {/* Brush Size */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-700 mb-3 hidden lg:block">Brush Size</h3>
        <div className="space-y-2">
          {brushSizes.map((brushSize) => (
            <Button
              key={brushSize.size}
              variant={size === brushSize.size ? 'default' : 'outline'}
              className="w-full flex items-center justify-center lg:justify-start space-x-3"
              onClick={() => setSize(brushSize.size)}
              disabled={!isConnected}
            >
              <div className={`${brushSize.dotSize} bg-current rounded-full`} />
              <span className="hidden lg:block text-sm">{brushSize.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-700 mb-3 hidden lg:block">Colors</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {colors.map((colorOption) => (
            <button
              key={colorOption}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                color === colorOption 
                  ? 'border-primary border-4' 
                  : 'border-slate-300 hover:border-slate-500'
              }`}
              style={{ backgroundColor: colorOption }}
              onClick={() => setColor(colorOption)}
              disabled={!isConnected}
            />
          ))}
        </div>
        
        {/* Custom Color Input */}
        <div className="mt-3 hidden lg:block">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-8 rounded-lg border border-slate-300 cursor-pointer"
            disabled={!isConnected}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 mt-auto">
        <Button
          variant="destructive"
          className="w-full flex items-center justify-center lg:justify-start space-x-3 mb-2"
          onClick={handleClearCanvas}
          disabled={!isConnected}
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden lg:block">Clear Canvas</span>
        </Button>
        
        <Button
          variant="outline"
          className="w-full flex items-center justify-center lg:justify-start space-x-3"
          onClick={onSaveCanvas}
        >
          <Download className="w-4 h-4" />
          <span className="hidden lg:block">Save</span>
        </Button>
      </div>
    </div>
  );
}
