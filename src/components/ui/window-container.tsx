
import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, X, Move, Minus } from 'lucide-react';

export type WindowMode = 'embedded' | 'floating' | 'fullscreen';

interface WindowContainerProps {
  title: string;
  mode: WindowMode;
  onModeChange: (mode: WindowMode) => void;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function WindowContainer({
  title,
  mode,
  onModeChange,
  onClose,
  children,
  className = ''
}: WindowContainerProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPosition({
          x: dragRef.current.startLeft + dx,
          y: dragRef.current.startTop + dy
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === 'floating') {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: position.x,
        startTop: position.y
      };
    }
  };

  const getContainerStyle = () => {
    switch (mode) {
      case 'fullscreen':
        return 'fixed inset-0 z-50 w-screen h-screen bg-background';
      case 'floating':
        return `fixed z-50 w-[800px] h-[600px] shadow-2xl border rounded-lg bg-background resize overflow-auto`;
      case 'embedded':
        return 'w-full h-[500px] border rounded-lg bg-background mb-4';
      default:
        return '';
    }
  };

  const getPositionStyle = () => {
    if (mode === 'floating') {
      return { top: position.y, left: position.x };
    }
    return {};
  };

  return (
    <div 
      className={`${getContainerStyle()} ${className} flex flex-col`}
      style={getPositionStyle()}
    >
      {/* Header */}
      <div 
        className={`flex items-center justify-between px-4 py-2 border-b bg-muted/50 select-none ${mode === 'floating' ? 'cursor-move' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="font-medium text-sm flex items-center gap-2">
          {title}
        </div>
        <div className="flex items-center gap-2">
          {mode !== 'embedded' && (
            <button 
                onClick={() => onModeChange('embedded')}
                className="p-1 hover:bg-muted rounded"
                title="Embed"
            >
                <Minimize2 size={14} />
            </button>
          )}
          {mode !== 'fullscreen' && (
             <button 
                onClick={() => onModeChange('fullscreen')}
                className="p-1 hover:bg-muted rounded"
                title="Fullscreen"
            >
                <Maximize2 size={14} />
            </button>
          )}
          {mode !== 'floating' && (
             <button 
                onClick={() => onModeChange('floating')}
                className="p-1 hover:bg-muted rounded"
                title="Float"
            >
                <Move size={14} />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1 hover:bg-red-100 hover:text-red-600 rounded"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {children}
      </div>
    </div>
  );
}
