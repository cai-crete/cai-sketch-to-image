import React, { useState } from 'react';

interface ResultViewerProps {
  original: string;
  generated: string;
  onDownload?: () => void;
  onEdit?: () => void;
}

const ResultViewer: React.FC<ResultViewerProps> = ({ original, generated, onDownload, onEdit }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    // Get container dimensions
    const container = e.currentTarget.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    let clientX;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    // Calculate percentage
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;

    setSliderPosition(percentage);
  };

  const stopDrag = () => setIsDragging(false);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none group">
      <div
        className="relative w-full h-full"
        onMouseMove={handleDrag}
        onTouchMove={handleDrag}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchEnd={stopDrag}
      >
        {/* Background (Generated - After) */}
        <img
          src={generated}
          alt="Generated Blueprint"
          className="absolute inset-0 w-full h-full object-contain bg-[#1A1A1A]"
        />

        {/* Foreground (Original - Before) - Clipped */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden bg-black/80"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={original}
            alt="Original Sketch"
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>

        {/* Handle & Line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white cursor-ew-resize z-20 flex items-center justify-center"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
        >
          <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8L22 12L18 16" />
              <path d="M6 8L2 12L6 16" />
            </svg>
          </div>
        </div>

        {/* Download Button (Top Right Icon) */}
        <button
          onClick={onDownload}
          className="absolute top-6 right-6 z-30 p-2 text-white hover:text-gray-300 transition-colors bg-black/20 rounded-full backdrop-blur-sm"
          title="Download Image"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        {/* Edit Button (Bottom Center) */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30">
          <button
            onClick={onEdit}
            className="px-8 py-3 bg-white text-black font-display text-lg tracking-wider hover:bg-gray-100 transition-colors shadow-lg"
          >
            EDIT
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultViewer;