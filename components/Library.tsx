import React, { useState } from 'react';
import { HistoryItem } from '../types';
import { X, Trash2, Maximize2 } from 'lucide-react';

interface LibraryProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const Library: React.FC<LibraryProps> = ({ items, onSelect, onDelete, onClose }) => {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

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

                  {/* Expanded View Overlay */}
                  {expandedItemId === item.id && (
                    <div
                      className="absolute inset-0 bg-white/95 dark:bg-black/95 z-10 p-4 flex flex-col overflow-y-auto custom-scrollbar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end mb-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedItemId(null);
                          }}
                          className="hover:opacity-60 transition-opacity"
                        >
                          <X size={20} strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="space-y-4 font-mono text-xs text-black dark:text-white cursor-text select-text" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <p className="font-bold mb-1">▪ CODE</p>
                          <p className="opacity-80 break-words">{item.prompt || "-"}</p>
                        </div>
                        <div>
                          <p className="font-bold mb-1">▪ Metacognitive Analysis</p>
                          <p className="opacity-80 break-words font-sans text-sm">
                            {item.analysisReport?.metacognitive.diagnosis || `[${item.mode}] / [STYLE ${item.styleMode}]`}
                          </p>
                          <p className="opacity-60 break-words mt-1 font-sans text-xs">
                            {item.analysisReport?.metacognitive.reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Area */}
                <div className="p-3 flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </p>
                    <p className="font-sans text-xs font-medium truncate mt-1">
                      {item.analysisReport?.metacognitive.diagnosis || item.prompt || "Untitled"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedItemId(expandedItemId === item.id ? null : item.id);
                      }}
                      className="text-gray-400 hover:text-black dark:hover:text-white transition-colors text-xs font-mono"
                    >
                      더보기
                    </button>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;