import React from 'react';
import { HistoryItem } from '../types';
import { X, ArrowRight, Download, Trash2 } from 'lucide-react';

interface LibraryProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const Library: React.FC<LibraryProps> = ({ items, onSelect, onDelete, onClose }) => {
  return (
    <div className="absolute inset-0 z-[60] bg-bw-white dark:bg-bw-black flex flex-col">
      {/* Library Header - Removed border-b */}
      {/* Library Header - Streamlined */}
      <div className="flex items-center justify-between px-6 pt-6 shrink-0">
        <h2 className="font-display text-xl tracking-wide">LIBRARY</h2>
        <button
          onClick={onClose}
          className="hover:opacity-60 transition-opacity"
        >
          <X size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <span className="font-display text-4xl">EMPTY</span>
            <p className="font-mono mt-2 text-xs">NO ARCHIVED PROJECTS</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative border-x border-b border-black/10 dark:border-white/10 transition-all duration-300 flex flex-col"
              >
                {/* Image Area */}
                <div
                  className="aspect-square w-full relative overflow-hidden bg-gray-100 dark:bg-gray-900 cursor-pointer"
                  onClick={() => onSelect(item)}
                >
                  <img
                    src={item.generatedImage}
                    alt="Generated"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Hover Overlay - Dim only, no text */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
                </div>

                {/* Info Area */}
                <div className="p-3 flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </p>
                    <p className="font-sans text-xs font-medium truncate mt-1">
                      {item.prompt || "Untitled"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;