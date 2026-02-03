import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pen, Eraser, Trash2, Undo, ImageIcon, Camera, X } from 'lucide-react';

interface CanvasBoardProps {
  onImageChange: (hasImage: boolean) => void;
}

export interface CanvasRef {
  exportImage: () => string | null;
  clear: () => void;
}

const COLORS = ['#FFD700', '#000000', '#FF0000', '#0000FF', '#008000', '#FFFFFF'];
const ERASER_SIZES = [10, 20, 30, 50, 70, 100];

const CanvasBoard = forwardRef<CanvasRef, CanvasBoardProps>(({ onImageChange }, ref) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null); // Layer 0: Background (Image/White)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null); // Layer 1: Strokes
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | null>(null);
  const [activeColor, setActiveColor] = useState('#000000');
  const [eraserSize, setEraserSize] = useState(30);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [showCursor, setShowCursor] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Viewport transformation state (for Zoom/Pan)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);

  // Touch/Pinch helper refs
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number, y: number } | null>(null);

  // Helper: Paint the background layer
  const paintBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    if (backgroundImage) {
      drawImageProp(ctx, backgroundImage, 0, 0, bgCanvas.width, bgCanvas.height);
    }
  }, [backgroundImage]);

  // Helper: Handle Resizing (Layout)
  const handleResize = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const container = containerRef.current;

    if (!bgCanvas || !drawCanvas || !container) return;

    const { clientWidth, clientHeight } = container;
    if (clientWidth === 0 || clientHeight === 0) return;

    // Only update and clear if dimensions actually changed
    if (bgCanvas.width !== clientWidth || bgCanvas.height !== clientHeight) {
      // Save current drawing
      const drawCtx = drawCanvas.getContext('2d');
      let savedData: ImageData | null = null;
      if (drawCtx && drawCanvas.width > 0 && drawCanvas.height > 0) {
        savedData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
      }

      bgCanvas.width = clientWidth;
      bgCanvas.height = clientHeight;
      drawCanvas.width = clientWidth;
      drawCanvas.height = clientHeight;

      const newDrawCtx = drawCanvas.getContext('2d');
      if (newDrawCtx) {
        newDrawCtx.lineCap = 'round';
        newDrawCtx.lineJoin = 'round';
        if (savedData) {
          newDrawCtx.putImageData(savedData, 0, 0);
        }
      }

      // Re-paint background after resize
      paintBackground();
    }
  }, [paintBackground]);

  // Effect: Initialization & Resize Listener (Optimized with rAF)
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = requestAnimationFrame(() => {
        handleResize();
      });
    };

    handleResize(); // Initial call
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [handleResize]);

  // Effect: Re-paint background when image changes
  useEffect(() => {
    paintBackground();
    // When a new image loads, reset view to fit? The user didn't explicitly ask for auto-reset, 
    // but typically a new image implies a fresh start. We'll leave transform as is or reset if needed.
    // For now, keeping current transform to allow swapping images without losing view position if desired,
    // or uncomment next line to auto-reset view on new image:
    // setTransform({ x: 0, y: 0, scale: 1 });
  }, [backgroundImage]);

  // Effect: Wheel Zoom (PC)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent page scroll

      const zoomIntensity = 0.1;
      const delta = -Math.sign(e.deltaY);
      const scaleFactor = 1 + (delta * zoomIntensity);

      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale * scaleFactor, 1.0), 5); // 1.0x to 5x (Min 100%)
        // Auto-center if scale is effectively 1.0
        if (newScale <= 1.001) {
          return { x: 0, y: 0, scale: 1 };
        }
        return { ...prev, scale: newScale };
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Handle Paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                setBackgroundImage(img);
                onImageChange(true);
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useImperativeHandle(ref, () => ({
    exportImage: () => {
      const bgCanvas = bgCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;
      if (!bgCanvas || !drawCanvas) return null;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = bgCanvas.width;
      tempCanvas.height = bgCanvas.height;
      const ctx = tempCanvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(bgCanvas, 0, 0);
        ctx.drawImage(drawCanvas, 0, 0);
        return tempCanvas.toDataURL('image/png');
      }
      return null;
    },
    clear: handleFullClear
  }));

  const saveState = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      setHistory(prev => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }
  };

  const handleUndo = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && history.length > 0) {
      const newHistory = [...history];
      const previousState = newHistory.pop();
      setHistory(newHistory);
      if (previousState) {
        ctx.putImageData(previousState, 0, 0);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
          onImageChange(true);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // --------------------------------------------------------------------------------
  // Unified Interaction Logic (PC & Touch)
  // --------------------------------------------------------------------------------

  // Correct coordinate calculation accounting for simple transform and pinch-zoom
  // This logic must reverse the Translate -> Scale transformation of the container
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (window.TouchEvent && e instanceof TouchEvent) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else if ('touches' in e) {
      const te = e as unknown as React.TouchEvent;
      if (te.touches.length > 0) {
        clientX = te.touches[0].clientX;
        clientY = te.touches[0].clientY;
      } else {
        clientX = te.changedTouches[0].clientX;
        clientY = te.changedTouches[0].clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Since the canvas itself is transformed, getBoundingClientRect returns the SCALED rect.
    // However, the internal canvas coordinate system (width/height) is unscaled (1:1 with original).
    // So we need to map the client click relative to the scaled rect back to the unscaled canvas size.

    // Formula: (ClickPos - RectLeft) * (InternalSize / RenderedSize)
    // RenderedSize is rect.width
    // InternalSize is canvas.width

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      offsetX: (clientX! - rect.left) * scaleX,
      offsetY: (clientY! - rect.top) * scaleY
    };
  };

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    const touchCount = isTouch ? (e as unknown as React.TouchEvent).touches.length : 1;

    // Pan Condition:
    // 1. Middle Mouse Button (button === 1)
    // 2. Two Fingers (Touch)
    if ((!isTouch && (e as React.MouseEvent).button === 1) || touchCount === 2) {
      setIsPanning(true);
      return; // Do not start drawing
    }

    // Draw Condition:
    // 1. Left Mouse Button (button === 0)
    // 2. One Finger (Touch)
    if ((!isTouch && (e as React.MouseEvent).button === 0) || touchCount === 1) {
      if (!isPanning) {
        startDrawing(e);
      }
    }
  };

  const moveInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    const touchCount = isTouch ? (e as unknown as React.TouchEvent).touches.length : 1;

    // Pinch/Pan (Touch - 2 Fingers)
    if (touchCount === 2) {
      handlePinchPan(e as unknown as React.TouchEvent);
      return;
    }

    // Mouse Pan (Middle Click Drag)
    if (isPanning && !isTouch) {
      const me = e as React.MouseEvent;
      setTransform(prev => ({ ...prev, x: prev.x + me.movementX, y: prev.y + me.movementY }));
      return;
    }

    // Draw (1 Finger / Left Click)
    if (!isPanning && isDrawing) {
      draw(e);
    }
    // Just move cursor if not drawing but tool selected (for eraser preview)
    else if (!isPanning && !isDrawing) {
      // Optional: Update cursor position for hover effect if needed, usually handled by draw with isDrawing check
      // But for eraser, we need to update pos even if not clicking
      const canvas = drawCanvasRef.current;
      if (canvas && tool === 'eraser') {
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        setCursorPos({ x: offsetX, y: offsetY });
        setShowCursor(true);
      }
    }
  };

  const endInteraction = () => {
    setIsPanning(false);
    setIsDrawing(false);
    lastTouchDistRef.current = null;
    lastTouchCenterRef.current = null;
    stopDrawing();
  };

  const handlePinchPan = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;

    const t1 = e.touches[0];
    const t2 = e.touches[1];

    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const cx = (t1.clientX + t2.clientX) / 2;
    const cy = (t1.clientY + t2.clientY) / 2;

    if (lastTouchDistRef.current === null || lastTouchCenterRef.current === null) {
      lastTouchDistRef.current = dist;
      lastTouchCenterRef.current = { x: cx, y: cy };
      return;
    }

    const deltaScale = dist / lastTouchDistRef.current;

    // Pan calculation based on center movement
    const deltaX = cx - lastTouchCenterRef.current.x;
    const deltaY = cy - lastTouchCenterRef.current.y;

    setTransform(prev => {
      const newScale = Math.min(Math.max(prev.scale * deltaScale, 1.0), 5);
      // Auto-center if scale is effectively 1.0
      if (newScale <= 1.001) {
        return { x: 0, y: 0, scale: 1 };
      }
      return {
        x: prev.x + deltaX,
        y: prev.y + deltaY,
        scale: newScale
      };
    });

    lastTouchDistRef.current = dist;
    lastTouchCenterRef.current = { x: cx, y: cy };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!tool) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    saveState();
    setIsDrawing(true);

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 2;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (tool === 'eraser' && canvas) {
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      setCursorPos({ x: offsetX, y: offsetY });
      setShowCursor(true);
    } else {
      setShowCursor(false);
    }

    if (!isDrawing || !tool) return;
    const canvasEl = drawCanvasRef.current;
    const ctx = canvasEl?.getContext('2d');
    if (!canvasEl || !ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvasEl);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
          onImageChange(true);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  function handleFullClear() {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;

    if (bgCanvas && drawCanvas) {
      const bgCtx = bgCanvas.getContext('2d');
      const drawCtx = drawCanvas.getContext('2d');

      if (bgCtx && drawCtx) {
        bgCtx.fillStyle = '#FFFFFF';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      }
    }
    setBackgroundImage(null);
    onImageChange(false);
    setHistory([]);
    setTransform({ x: 0, y: 0, scale: 1 }); // Reset zoom on clear
  }

  const handleSketchClear = () => {
    const drawCanvas = drawCanvasRef.current;
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      }
    }
    setHistory([]);
  };

  function drawImageProp(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, offsetX = 0.5, offsetY = 0.5) {
    if (arguments.length === 2) {
      x = y = 0;
      w = ctx.canvas.width;
      h = ctx.canvas.height;
    }
    offsetX = typeof offsetX === "number" ? offsetX : 0.5;
    offsetY = typeof offsetY === "number" ? offsetY : 0.5;

    if (offsetX < 0) offsetX = 0;
    if (offsetY < 0) offsetY = 0;
    if (offsetX > 1) offsetX = 1;
    if (offsetY > 1) offsetY = 1;

    var iw = img.width, ih = img.height, r = Math.min(w / iw, h / ih), nw = iw * r, nh = ih * r;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, iw, ih, x + (w - nw) * offsetX, y + (h - nh) * offsetY, nw, nh);
  }

  const penCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'%3E%3C/path%3E%3C/svg%3E") 0 24, auto`;

  return (
    <div className="relative w-full h-full flex flex-col bg-white overflow-hidden select-none touch-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Restored Toolbar: Gap-0 (Merged) & Thin borders */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-0 p-0 shadow-none">

        {/* Pen Tool */}
        <div className="relative group bg-white border border-black shadow-sm">
          <button
            onClick={() => setTool(tool === 'pen' ? null : 'pen')}
            className={`p-2 transition-colors w-full flex items-center justify-center ${tool === 'pen' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}
            title="Pen"
          >
            <Pen size={16} />
          </button>

          {tool === 'pen' && (
            <div className="absolute left-full top-0 ml-2 border border-black bg-white flex flex-row h-full items-center px-2 py-1 gap-2 w-max shadow-sm z-40">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={(e) => { e.stopPropagation(); setActiveColor(color); }}
                  className={`w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition-transform ${activeColor === color ? 'ring-2 ring-black ring-offset-1' : ''}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>

        {/* Eraser Tool (-mt-px for single border) */}
        <div className="relative group bg-white border border-black shadow-sm -mt-px">
          <button
            onClick={() => setTool(tool === 'eraser' ? null : 'eraser')}
            className={`p-2 transition-colors w-full flex items-center justify-center ${tool === 'eraser' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}
            title="Eraser"
          >
            <Eraser size={16} />
          </button>

          {tool === 'eraser' && (
            <div className="absolute left-full top-0 ml-2 border border-black bg-white flex flex-row h-full items-center px-2 py-1 gap-2 w-max shadow-sm z-40">
              {ERASER_SIZES.map(size => (
                <button
                  key={size}
                  onClick={(e) => { e.stopPropagation(); setEraserSize(size); }}
                  className={`rounded-full border border-black hover:bg-gray-200 transition-colors flex items-center justify-center ${eraserSize === size ? 'bg-black' : 'bg-transparent'}`}
                  style={{ width: Math.min(24, size / 2 + 4), height: Math.min(24, size / 2 + 4) }}
                >
                  <div
                    className={`rounded-full ${eraserSize === size ? 'bg-white' : 'bg-black'}`}
                    style={{ width: size / 4, height: size / 4 }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo */}
        <div className="bg-white border border-black shadow-sm -mt-px">
          <button
            onClick={handleUndo}
            className="p-2 hover:bg-gray-100 text-black transition-colors flex items-center justify-center w-full"
            title="Undo"
          >
            <Undo size={16} />
          </button>
        </div>

        {/* Clear */}
        <div className="bg-white border border-black shadow-sm -mt-px">
          <button
            onClick={handleSketchClear}
            className="p-2 hover:bg-red-50 text-red-600 transition-colors flex items-center justify-center w-full"
            title="Clear Canvas"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Upload Buttons */}
      {/* Upload Buttons or X (Full Clear) */}
      {
        !backgroundImage ? (
          <div className="absolute top-4 right-4 z-30 flex gap-0 border border-black bg-white shadow-none">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 text-black flex items-center gap-2 px-3 font-display text-base tracking-wide"
            >
              <ImageIcon size={16} />
              <span>UPLOAD</span>
            </button>
            <div className="w-px bg-black h-full"></div>
            <label className="lg:hidden p-2 hover:bg-gray-100 text-black flex items-center gap-2 px-3 font-display text-base tracking-wide cursor-pointer">
              <Camera size={16} />
              <span>CAMERA</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            </label>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>
        ) : (
          <button
            onClick={handleFullClear}
            className="absolute top-4 right-4 z-30 hover:opacity-60 transition-opacity"
          >
            <X size={24} strokeWidth={1.5} />
          </button>
        )
      }

      {/* Canvas Area with Layers (User Verified Structure + Unified Interaction Events) */}
      <div
        ref={containerRef}
        className="flex-1 bg-white relative touch-none overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}

        // Unified Events: We attach to container to catch all interactions
        onMouseDown={startInteraction}
        onMouseMove={moveInteraction}
        onMouseUp={endInteraction}
        onMouseLeave={endInteraction}
        onTouchStart={startInteraction}
        onTouchMove={moveInteraction}
        onTouchEnd={endInteraction}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-black/2 border-4 border-dashed border-gray-100/50 z-50 pointer-events-none flex items-center justify-center"></div>
        )}

        {/* Transform Wrapper for Zoom/Pan */}
        <div
          className="absolute origin-top-left will-change-transform shadow-none"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            // We set width/height to match the canvas size exactly
            width: bgCanvasRef.current?.width || '100%',
            height: bgCanvasRef.current?.height || '100%'
          }}
        >
          {/* Custom Eraser Cursor (Inside transform so it scales/moves with canvas? No, usually cursor floats. 
              But here user snippet had it absolutely positioned relative to container.
              If we want cursor to track zoomed canvas, it's easier to verify cursor pos visually.
              Usually cursors are UI overlays. Let's keep it separate or ensure calc handles it.
              USER SNIPPET set absolute pos. With zoom, we need to be careful.
              Let's put the cursor *outside* the transform wrapper if we want it 1:1 with pointer,
              OR inside if we want it to 'stick' to the canvas surface.
              Standard apps: Cursor follows mouse.
              Let's place cursor separate from transform to follow mouse pointer directly.
          */}

          {/* Layer 0: Background */}
          <canvas
            ref={bgCanvasRef}
            className="absolute inset-0 pointer-events-none z-0"
          />

          {/* Layer 1: Drawing */}
          <canvas
            ref={drawCanvasRef}
            className="absolute inset-0 block w-full h-full z-10"
            style={{
              cursor: tool === 'pen' ? penCursor : (tool === 'eraser' ? 'none' : 'auto')
              // Note: Events are handled by parent container now for Pan logic, 
              // but we kept canvas 'block' to ensure it takes space.
              // pointer-events must be allowed.
            }}
          />
        </div>

        {/* Custom Eraser Cursor - Positioned visually */}
        {
          tool === 'eraser' && showCursor && (
            <div
              className="pointer-events-none absolute border border-gray-500 rounded-full z-50 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                // Cursor needs to follow the MOUSE (Client), not the canvas coordinate directly if we want it under the finger
                // But the 'cursorPos' state comes from 'getCoordinates' which is now transformed.
                // WE NEED 'screen' coordinates for the cursor overlay if it's outside the transform div.
                // Let's rely on standard logic: getCoordinates returns Canvas Logic Coords.
                // If we display this Div OUTSIDE the transform, we need Client Coords.
                // I will adjust draw() to set use client offset for cursor display if possible, or inverse transform.

                // SIMPLIFICATION: Put cursor INSIDE transform wrapper? Then it scales. 
                // Eraser size usually implies 'canvas pixels'. If I zoom in, 10px eraser should erase 10px of canvas (so it looks bigger on screen).
                // So YES, cursor should be inside transform wrapper or scaled match.
                // Let's try putting it effectively "on top" visually using transformed coords.

                left: cursorPos.x * transform.scale + transform.x,
                top: cursorPos.y * transform.scale + transform.y,
                width: eraserSize * transform.scale,
                height: eraserSize * transform.scale,

                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderColor: 'black'
              }}
            />
          )
        }

      </div >
    </div >
  );
});

export default CanvasBoard;