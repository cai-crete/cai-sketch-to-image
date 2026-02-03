import React, { useState } from 'react';

interface ResultViewerProps {
  original: string;
  generated: string;
}

const ResultViewer: React.FC<ResultViewerProps> = ({ original, generated }) => {
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

        {/* Labels - Fade Logic, Updated Font & Size (90%), Align with Context (top-6) */}
        {/* Left Label: Visible when slider is greater than 15% (showing sketch) */}
        <div 
          className={`absolute top-6 left-6 text-white font-display text-lg tracking-widest z-10 pointer-events-none transition-opacity duration-300 drop-shadow-md ${sliderPosition < 15 ? 'opacity-0' : 'opacity-100'}`}
        >
          SKETCH
        </div>
        
        {/* Right Label: Visible when slider is less than 85% (showing realization) */}
        <div 
          className={`absolute top-6 right-6 text-white font-display text-lg tracking-widest z-10 pointer-events-none transition-opacity duration-300 drop-shadow-md ${sliderPosition > 85 ? 'opacity-0' : 'opacity-100'}`}
        >
          REALIZATION
        </div>
      </div>
    </div>
  );
};

export default ResultViewer;