import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Pen, Eraser, Trash2, Undo, Upload, Camera, X, Type, ArrowRight, MousePointer2, Move, Settings } from 'lucide-react';

interface CanvasBoardProps {
  onImageChange: (hasImage: boolean) => void;
  isLoggedIn?: boolean;
}

export interface CanvasRef {
  exportImage: () => string | null;
  clear: () => void;
  loadImage: (src: string) => void;
}

export type Point = { x: number, y: number };
export type Stroke = {
  id: string;
  tool: 'pen' | 'eraser' | 'text' | 'arrow';
  eraserMode?: 'pixel' | 'stroke';
  points: Point[];
  color: string;
  width: number;
  text?: string;
  fontSize?: number;
  arrowStyle?: 'solid' | 'dotted';
};

const COLORS = ['#FFD700', '#000000', '#FF0000', '#0000FF', '#008000', '#FFFFFF'];
const ERASER_SIZES = [10, 20, 30, 50, 80];
const PEN_SIZES = [0.5, 1, 2, 4, 6];
const TEXT_SIZES = [20, 32, 48, 64, 80];

const CanvasBoard = forwardRef<CanvasRef, CanvasBoardProps>(({ onImageChange, isLoggedIn }, ref) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null); // Layer 0: Background (Image/White)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null); // Layer 1: Strokes
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
  const [isPenMenuOpen, setIsPenMenuOpen] = useState(false);
  const [isEraserMenuOpen, setIsEraserMenuOpen] = useState(false);
  const [isTextMenuOpen, setIsTextMenuOpen] = useState(false);
  const [isArrowMenuOpen, setIsArrowMenuOpen] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'text' | 'arrow' | 'move' | null>(null);
  const [eraserMode, setEraserMode] = useState<'pixel' | 'stroke'>('pixel');
  const [arrowStyle, setArrowStyle] = useState<'solid' | 'dotted'>('solid');
  const [activeColor, setActiveColor] = useState('#000000');
  const [eraserLevel, setEraserLevel] = useState(3);
  const [penLevel, setPenLevel] = useState(3);
  const [arrowLevel, setArrowLevel] = useState(3);
  const [textLevel, setTextLevel] = useState(2);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const [textInput, setTextInput] = useState<{ visible: boolean; x: number; y: number; text: string }>({
    visible: false, x: 0, y: 0, text: ''
  });
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null);
  const moveStartPosRef = useRef<{ x: number, y: number } | null>(null);

  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [showCursor, setShowCursor] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Viewport transformation state (for Zoom/Pan)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [fitTransform, setFitTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 });
  const baseSizeRef = useRef({ w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Touch/Pinch helper refs
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number, y: number } | null>(null);

  // Fix: Prevent default touch actions (zoom, scroll) on canvas for tablet support
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e: TouchEvent) => {
      // Allow multi-touch gestures if handled elsewhere, but generally blocking default is safest for pure drawing/pan-zoom app
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    // Attach non-passive listeners to allow e.preventDefault()
    // This is critical for preventing double-tap zoom on iOS/Android
    container.addEventListener('touchstart', preventDefault, { passive: false });
    container.addEventListener('touchmove', preventDefault, { passive: false });
    container.addEventListener('touchend', preventDefault, { passive: false });

    return () => {
      container.removeEventListener('touchstart', preventDefault);
      container.removeEventListener('touchmove', preventDefault);
      container.removeEventListener('touchend', preventDefault);
    };
  }, []);

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

  // Helper: Redraw all strokes
  const redrawAllStrokes = useCallback((strokeList: Stroke[]) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokeList.forEach(stroke => {
      if (stroke.points.length === 0) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      if (stroke.tool === 'eraser') {
        if (stroke.eraserMode === 'pixel') {
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = stroke.width;
          ctx.stroke();
        }
      }
      if (stroke.id === selectedMoveId) {
        ctx.globalAlpha = 0.8;
      } else {
        ctx.globalAlpha = 1.0;
      }

      if (stroke.tool === 'text' && stroke.text) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = stroke.color;
        const fontSize = stroke.fontSize || TEXT_SIZES[textLevel - 1]; // Fallback to current level if no fontSize recorded
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const lines = stroke.text.split('\n');
        lines.forEach((line, index) => {
          ctx.fillText(line, stroke.points[0].x, stroke.points[0].y + (index * (fontSize * 1.2)));
        });
      } else if (stroke.tool === 'arrow' && stroke.points.length >= 2) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        if (stroke.arrowStyle === 'dotted') {
          ctx.setLineDash([10, 10]);
        } else {
          ctx.setLineDash([]);
        }

        const pt1 = stroke.points[0];
        const pt2 = stroke.points[stroke.points.length - 1];

        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();

        ctx.setLineDash([]);
        const angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
        const headlen = 15;
        ctx.beginPath();
        ctx.moveTo(pt2.x, pt2.y);
        ctx.lineTo(pt2.x - headlen * Math.cos(angle - Math.PI / 6), pt2.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pt2.x, pt2.y);
        ctx.lineTo(pt2.x - headlen * Math.cos(angle + Math.PI / 6), pt2.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (stroke.tool !== 'eraser') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    });
  }, []);

  // Effect: Redraw when strokes array changes
  useEffect(() => {
    redrawAllStrokes(strokes);
  }, [strokes, redrawAllStrokes]);

  // Helper: Handle Resizing (Layout)
  const handleResize = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const container = containerRef.current;

    if (!bgCanvas || !drawCanvas || !container) return;

    const { clientWidth, clientHeight } = container;
    if (clientWidth === 0 || clientHeight === 0) return;

    let baseW = baseSizeRef.current.w;
    let baseH = baseSizeRef.current.h;

    // 1. Image Mode: Fixed aspect ratio with letterboxing
    if (backgroundImage) {
      if (baseW === 0 || baseH === 0) return;
      const fit = Math.min(clientWidth / baseW, clientHeight / baseH);
      const offsetX = (clientWidth - baseW * fit) / 2;
      const offsetY = (clientHeight - baseH * fit) / 2;
      setFitTransform({ scale: fit, offsetX, offsetY });
      return;
    }

    // 2. Fluid Mode (Default): Canvas size exactly matches container size
    if (baseW === 0 || baseH === 0) {
      // Initial Setup
      baseW = clientWidth;
      baseH = clientHeight;
      bgCanvas.width = baseW;
      bgCanvas.height = baseH;
      drawCanvas.width = baseW;
      drawCanvas.height = baseH;
      baseSizeRef.current = { w: baseW, h: baseH };
      setBaseSize({ w: baseW, h: baseH });

      paintBackground();
      redrawAllStrokes(strokesRef.current);
    } else if (baseW !== clientWidth || baseH !== clientHeight) {
      // Window resized / Panel toggled: dynamically resize and shift strokes
      const dx = (clientWidth - baseW) / 2;
      const dy = (clientHeight - baseH) / 2;

      baseW = clientWidth;
      baseH = clientHeight;
      bgCanvas.width = baseW;
      bgCanvas.height = baseH;
      drawCanvas.width = baseW;
      drawCanvas.height = baseH;
      baseSizeRef.current = { w: baseW, h: baseH };
      setBaseSize({ w: baseW, h: baseH });

      if (strokesRef.current.length > 0) {
        const shiftedStrokes = strokesRef.current.map(stroke => ({
          ...stroke,
          points: stroke.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        }));
        setStrokes(shiftedStrokes);
        strokesRef.current = shiftedStrokes;
      }

      setHistory(prevHistory => prevHistory.map(hist =>
        hist.map(stroke => ({
          ...stroke,
          points: stroke.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        }))
      ));

      paintBackground();
      redrawAllStrokes(strokesRef.current);
    }

    setFitTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  }, [paintBackground, redrawAllStrokes, backgroundImage]);

  // Sync strokes to ref to avoid dependency cycles
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  // Auto-resize when baseSize changes (e.g. image loaded)
  useEffect(() => {
    if (baseSize.w > 0 && baseSize.h > 0) {
      handleResize();
    }
  }, [baseSize.w, baseSize.h, handleResize]);

  // Effect: Initialization & Resize Listener (Optimized with ResizeObserver to catch layout changes)
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = requestAnimationFrame(() => {
        handleResize();
      });
    };

    if (containerRef.current) {
      resizeObserverRef.current = new ResizeObserver(onResize);
      resizeObserverRef.current.observe(containerRef.current);
    }

    // Also keep window resize as fallback
    window.addEventListener('resize', onResize);
    handleResize(); // Initial call

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
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

      // 1. Compute expanded bounding box based on strokes
      const centerX = bgCanvas.width / 2;
      const centerY = bgCanvas.height / 2;
      let maxDistX = bgCanvas.width / 2;
      let maxDistY = bgCanvas.height / 2;

      strokesRef.current.forEach(s => {
        s.points.forEach(p => {
          const padding = (s.width || 10) / 2 + 5;
          const distFromCenterX = Math.abs(p.x - centerX) + padding;
          const distFromCenterY = Math.abs(p.y - centerY) + padding;
          if (distFromCenterX > maxDistX) maxDistX = distFromCenterX;
          if (distFromCenterY > maxDistY) maxDistY = distFromCenterY;
        });
      });

      const exportW = Math.ceil(maxDistX * 2);
      const exportH = Math.ceil(maxDistY * 2);
      const offsetX = (exportW - bgCanvas.width) / 2;
      const offsetY = (exportH - bgCanvas.height) / 2;

      // 2. Prepare Background (White + Optional backgroundImage)
      const tempBgCanvas = document.createElement('canvas');
      tempBgCanvas.width = exportW;
      tempBgCanvas.height = exportH;
      const bgCtx = tempBgCanvas.getContext('2d');
      if (!bgCtx) return null;

      bgCtx.fillStyle = '#FFFFFF';
      bgCtx.fillRect(0, 0, exportW, exportH);
      if (backgroundImage) {
        bgCtx.drawImage(bgCanvas, offsetX, offsetY);
      }

      // 3. Prepare Draw/Stroke layer (Transparent)
      const tempDrawCanvas = document.createElement('canvas');
      tempDrawCanvas.width = exportW;
      tempDrawCanvas.height = exportH;
      const drawCtx = tempDrawCanvas.getContext('2d');
      if (!drawCtx) return null;

      drawCtx.translate(offsetX, offsetY);
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';

      strokesRef.current.forEach(stroke => {
        if (stroke.points.length === 0) return;

        drawCtx.beginPath();
        drawCtx.moveTo(stroke.points[0].x, stroke.points[0].y);

        if (stroke.tool === 'eraser') {
          if (stroke.eraserMode === 'pixel') {
            for (let i = 1; i < stroke.points.length; i++) {
              drawCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            drawCtx.globalCompositeOperation = 'destination-out';
            drawCtx.lineWidth = stroke.width || 10;
            drawCtx.stroke();
          }
        } else if (stroke.tool === 'text' && stroke.text) {
          drawCtx.globalCompositeOperation = 'source-over';
          drawCtx.fillStyle = stroke.color || '#000000';
          const fontSize = stroke.fontSize || 27;
          drawCtx.font = `${fontSize}px Inter, sans-serif`;
          drawCtx.textAlign = 'left';
          drawCtx.textBaseline = 'top';
          const lines = stroke.text.split('\n');
          lines.forEach((line, index) => {
            drawCtx.fillText(line, stroke.points[0].x, stroke.points[0].y + (index * (fontSize * 1.2)));
          });
        } else if (stroke.tool === 'arrow' && stroke.points.length >= 2) {
          drawCtx.globalCompositeOperation = 'source-over';
          drawCtx.strokeStyle = stroke.color || '#000000';
          drawCtx.lineWidth = stroke.width || 2;
          if (stroke.arrowStyle === 'dotted') {
            drawCtx.setLineDash([10, 10]);
          } else {
            drawCtx.setLineDash([]);
          }

          const pt1 = stroke.points[0];
          const pt2 = stroke.points[stroke.points.length - 1];
          drawCtx.lineTo(pt2.x, pt2.y);
          drawCtx.stroke();

          drawCtx.setLineDash([]);
          const angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
          const headlen = 15;
          drawCtx.beginPath();
          drawCtx.moveTo(pt2.x, pt2.y);
          drawCtx.lineTo(pt2.x - headlen * Math.cos(angle - Math.PI / 6), pt2.y - headlen * Math.sin(angle - Math.PI / 6));
          drawCtx.moveTo(pt2.x, pt2.y);
          drawCtx.lineTo(pt2.x - headlen * Math.cos(angle + Math.PI / 6), pt2.y - headlen * Math.sin(angle + Math.PI / 6));
          drawCtx.stroke();
          drawCtx.setLineDash([]);
        } else if (stroke.tool !== 'eraser') {
          drawCtx.globalCompositeOperation = 'source-over';
          drawCtx.strokeStyle = stroke.color || '#000000';
          drawCtx.lineWidth = stroke.width || 2;
          for (let i = 1; i < stroke.points.length; i++) {
            drawCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          drawCtx.stroke();
        }
      });

      // 4. Merge Stroke Layer onto Background Layer and Export
      bgCtx.drawImage(tempDrawCanvas, 0, 0);
      return tempBgCanvas.toDataURL('image/png');
    },
    clear: handleFullClear,
    loadImage: (src: string) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        setBackgroundImage(img);

        // Clear drawing canvas when loading new background
        const bgCanvas = bgCanvasRef.current;
        const drawCanvas = drawCanvasRef.current;
        const ctx = drawCanvas?.getContext('2d');
        if (drawCanvas && ctx && bgCanvas) {
          bgCanvas.width = img.width;
          bgCanvas.height = img.height;
          drawCanvas.width = img.width;
          drawCanvas.height = img.height;
          setBaseSize({ w: img.width, h: img.height });

          ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
          setStrokes([]);
          setHistory([]); // Clear history as well since we are starting fresh
        }

        onImageChange(true);
        setTransform({ x: 0, y: 0, scale: 1 }); // Reset zoom
      };
      img.src = src;
    }
  }));

  const saveState = (currentStrokes = strokes) => {
    setHistory(prev => [...prev.slice(-10), currentStrokes]);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const previousState = newHistory.pop();
      setHistory(newHistory);
      if (previousState) {
        setStrokes(previousState);
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

  const distanceToLineSegment = (p: Point, v: Point, w: Point) => {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
  };

  const eraseStrokeAt = (x: number, y: number, shouldSaveState: boolean = true) => {
    const hitRadius = 15;
    const clickPoint = { x, y };

    // We do hit testing using strokesRef to run it purely synchronously.
    const current = strokesRef.current;
    let targetId: string | null = null;

    for (let i = current.length - 1; i >= 0; i--) {
      const stroke = current[i];
      if (stroke.tool === 'eraser') continue;

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        if (Math.hypot(clickPoint.x - p.x, clickPoint.y - p.y) <= (stroke.width / 2 + hitRadius)) {
          targetId = stroke.id;
          break;
        }
      }

      if (stroke.tool === 'text' && stroke.text) {
        // Approximate Bounding Box for Text
        const fontSize = stroke.fontSize || 27;
        const lines = stroke.text.split('\n');

        let maxWidth = 0;
        lines.forEach(line => {
          // Rough approximation: character width is usually ~0.6 of font size
          const lineWidth = line.length * (fontSize * 0.6);
          if (lineWidth > maxWidth) maxWidth = lineWidth;
        });

        const boxHeight = lines.length * (fontSize * 1.2);

        // Context fillText uses bottom-ish baseline by default, but here we estimate from top-left where point[0] is.
        // x is left. y + fontSize is approx the bottom of the first line. 
        // A wider hit-box is safer.
        const originX = stroke.points[0].x;
        const originY = stroke.points[0].y; // Starting Y coordinate

        if (
          clickPoint.x >= originX - hitRadius &&
          clickPoint.x <= originX + maxWidth + hitRadius &&
          clickPoint.y >= originY - hitRadius &&
          clickPoint.y <= originY + boxHeight + hitRadius
        ) {
          targetId = stroke.id;
          break;
        }
        continue;
      }

      let hit = false;
      for (let j = 0; j < stroke.points.length - 1; j++) {
        const d = distanceToLineSegment(clickPoint, stroke.points[j], stroke.points[j + 1]);
        if (d <= (stroke.width / 2 + hitRadius)) {
          hit = true;
          break;
        }
      }
      if (hit) {
        targetId = stroke.id;
        break;
      }
    }

    if (targetId) {
      if (shouldSaveState) saveState(current);
      setStrokes(prev => prev.filter(s => s.id !== targetId));
    }
  };

  const handleTextSubmit = () => {
    if (textInput.text.trim()) {
      saveState(strokes);
      const newStroke: Stroke = {
        id: Math.random().toString(36).substr(2, 9),
        tool: 'text',
        points: [{ x: textInput.x, y: textInput.y }],
        color: activeColor,
        width: PEN_SIZES[penLevel - 1],
        text: textInput.text,
        fontSize: 27
      };
      setStrokes(prev => [...prev, newStroke]);
    }
    setTextInput({ visible: false, x: 0, y: 0, text: '' });
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!tool) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    if (textInput.visible) {
      handleTextSubmit();
      return;
    }

    if (tool === 'text') {
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      setTextInput({ visible: true, x: offsetX, y: offsetY, text: '' });
      setTimeout(() => textInputRef.current?.focus(), 0);
      return;
    }

    if (tool === 'move') {
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      const hitRadius = 20;
      let clickedId: string | null = null;
      for (let i = strokes.length - 1; i >= 0; i--) {
        const stroke = strokes[i];

        if (stroke.tool === 'text' && stroke.text) {
          const fontSize = stroke.fontSize || 27;
          const lines = stroke.text.split('\n');
          let maxWidth = 0;
          lines.forEach(line => {
            const lineWidth = line.length * (fontSize * 0.6);
            if (lineWidth > maxWidth) maxWidth = lineWidth;
          });
          const boxHeight = lines.length * (fontSize * 1.2);
          const originX = stroke.points[0].x;
          const originY = stroke.points[0].y;

          if (
            offsetX >= originX - hitRadius &&
            offsetX <= originX + maxWidth + hitRadius &&
            offsetY >= originY - hitRadius &&
            offsetY <= originY + boxHeight + hitRadius
          ) {
            clickedId = stroke.id;
            break;
          }
          continue;
        }

        if (stroke.tool === 'arrow') {
          if (stroke.points.some(p => Math.abs(p.x - offsetX) < hitRadius && Math.abs(p.y - offsetY) < hitRadius)) {
            clickedId = stroke.id;
            break;
          }
        }
      }
      if (clickedId) {
        saveState(strokes);
        setSelectedMoveId(clickedId);
        moveStartPosRef.current = { x: offsetX, y: offsetY };
        setIsDrawing(true);
      }
      return;
    }

    if (tool === 'eraser' && eraserMode === 'stroke') {
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      saveState(strokes);
      eraseStrokeAt(offsetX, offsetY, false);
      setIsDrawing(true);
      return;
    }

    if (tool === 'arrow') {
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      saveState(strokes);
      const newStroke: Stroke = {
        id: Math.random().toString(36).substr(2, 9),
        tool: tool,
        points: [{ x: offsetX, y: offsetY }],
        color: activeColor,
        width: 2,
        arrowStyle: arrowStyle
      };
      currentStrokeRef.current = newStroke;
      setIsDrawing(true);
      return;
    }

    saveState(strokes);
    setIsDrawing(true);

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    const newStroke: Stroke = {
      id: Math.random().toString(36).substr(2, 9),
      tool: tool,
      eraserMode: tool === 'eraser' ? 'pixel' : undefined,
      points: [{ x: offsetX, y: offsetY }],
      color: tool === 'eraser' ? '#ffffff' : activeColor,
      width: tool === 'eraser' ? ERASER_SIZES[eraserLevel - 1] : PEN_SIZES[penLevel - 1],
    };
    currentStrokeRef.current = newStroke;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = ERASER_SIZES[eraserLevel - 1];
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = tool === 'arrow' ? 2 : PEN_SIZES[penLevel - 1];
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (tool === 'eraser' && canvas) {
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      setCursorPos({ x: offsetX, y: offsetY });
      setShowCursor(true);

      if (isDrawing && eraserMode === 'stroke') {
        eraseStrokeAt(offsetX, offsetY, false);
        return;
      }
    } else if (tool === 'pen') {
      const { offsetX, offsetY } = getCoordinates(e, canvas);
      setCursorPos({ x: offsetX, y: offsetY });
      setShowCursor(true);
    } else {
      setShowCursor(false);
    }

    if (!isDrawing || !tool || (tool === 'eraser' && eraserMode === 'stroke') || tool === 'text') return;
    const canvasEl = drawCanvasRef.current;
    const ctx = canvasEl?.getContext('2d');
    if (!canvasEl || !ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvasEl);

    if (tool === 'move' && selectedMoveId && moveStartPosRef.current) {
      const dx = offsetX - moveStartPosRef.current.x;
      const dy = offsetY - moveStartPosRef.current.y;

      const newStrokes = strokes.map(stroke => {
        if (stroke.id === selectedMoveId) {
          return {
            ...stroke,
            points: stroke.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
          };
        }
        return stroke;
      });
      setStrokes(newStrokes);
      moveStartPosRef.current = { x: offsetX, y: offsetY };
      redrawAllStrokes(newStrokes);
      return;
    }

    if (tool === 'arrow') {

      if (currentStrokeRef.current) {
        currentStrokeRef.current.points = [currentStrokeRef.current.points[0], { x: offsetX, y: offsetY }];
        redrawAllStrokes([...strokes, currentStrokeRef.current]);
      }
      return;
    }

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push({ x: offsetX, y: offsetY });
    }

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (tool === 'move') {
      setSelectedMoveId(null);
      moveStartPosRef.current = null;
      setIsDrawing(false);
      redrawAllStrokes(strokes);
      return;
    }

    if (tool === 'eraser' && eraserMode === 'stroke') {
      setIsDrawing(false);
      return;
    }
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.closePath();

    if (currentStrokeRef.current) {
      const strokeToAdd = currentStrokeRef.current;
      if (strokeToAdd.tool === 'arrow' && strokeToAdd.points.length < 2) {
        // don't add point-only arrow
      } else {
        setStrokes(prev => [...prev, strokeToAdd]);
      }
      currentStrokeRef.current = null;
    }

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
    const container = containerRef.current;

    if (bgCanvas && drawCanvas && container) {
      const bgCtx = bgCanvas.getContext('2d');
      const drawCtx = drawCanvas.getContext('2d');

      // Reset base size to container size
      const { clientWidth, clientHeight } = container;
      bgCanvas.width = clientWidth;
      bgCanvas.height = clientHeight;
      drawCanvas.width = clientWidth;
      drawCanvas.height = clientHeight;
      setBaseSize({ w: clientWidth, h: clientHeight });

      if (bgCtx && drawCtx) {
        bgCtx.fillStyle = '#FFFFFF';
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      }
    }
    setBackgroundImage(null);
    onImageChange(false);
    setStrokes([]);
    setHistory([]);
    setTransform({ x: 0, y: 0, scale: 1 }); // Reset zoom on clear
  }

  const handleSketchClear = () => {
    setStrokes([]);
    setHistory(prev => [...prev.slice(-10), strokes]);
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
    <div className="relative w-full h-full flex flex-col bg-white select-none touch-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Restored Toolbar: Gap-0 (Merged) & Thin borders */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-0 p-0 shadow-none">

        <div
          className={`flex flex-col gap-0 transition-all duration-300 ease-in-out origin-top ${isToolbarExpanded ? 'max-h-[500px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 pointer-events-none overflow-hidden'}`}
        >
          {/* Pen Tool */}
          <div className="relative group bg-white border border-black shadow-sm">
            <button
              onClick={() => {
                if (tool === 'pen') {
                  setIsPenMenuOpen(!isPenMenuOpen);
                } else {
                  setTool('pen');
                  setIsPenMenuOpen(true);
                  setIsEraserMenuOpen(false);
                  setIsArrowMenuOpen(false);
                }
              }}
              className={`p-2 transition-colors w-full flex items-center justify-center h-[34px] ${tool === 'pen' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}
              title="Pen"
            >
              <Pen size={16} />
            </button>

            {isPenMenuOpen && (
              <div className="absolute left-full top-0 ml-2 border border-black bg-white flex flex-col w-[160px] shadow-sm z-40">
                <div className="flex flex-row h-[34px] items-center px-3 gap-3 border-b border-black">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={penLevel}
                    onChange={(e) => setPenLevel(Number(e.target.value))}
                    className="flex-1 appearance-none h-2 bg-gray-200 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black cursor-pointer"
                    style={{ background: `linear-gradient(to right, #d1d5db 0%, #000000 ${((penLevel - 1) / 4) * 100}%, rgba(85, 85, 85, 0.5) ${((penLevel - 1) / 4) * 100}%, rgba(85, 85, 85, 0.5) 100%)` }}
                  />
                </div>
                <div className="flex flex-row h-[34px] items-center justify-center px-1 gap-1">
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
              </div>
            )}
          </div>

          {/* Eraser Tool (-mt-px for single border) */}
          <div className="relative group bg-white border border-black shadow-sm -mt-px">
            <button
              onClick={() => {
                if (tool === 'eraser') {
                  setIsEraserMenuOpen(!isEraserMenuOpen);
                } else {
                  setTool('eraser');
                  setIsEraserMenuOpen(true);
                  setIsPenMenuOpen(false);
                  setIsArrowMenuOpen(false);
                }
              }}
              className={`p-2 transition-colors w-full flex items-center justify-center h-[34px] ${tool === 'eraser' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}
              title="Eraser"
            >
              <Eraser size={16} />
            </button>

            {isEraserMenuOpen && (
              <div className="absolute left-full top-0 ml-2 border border-black bg-white flex flex-col w-[160px] shadow-sm z-40">
                <div className="flex flex-row h-[34px] w-full items-center px-3 gap-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={eraserLevel}
                    onChange={(e) => setEraserLevel(Number(e.target.value))}
                    className="flex-1 appearance-none h-2 bg-gray-200 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black cursor-pointer"
                    style={{ background: `linear-gradient(to right, #d1d5db 0%, #000000 ${((eraserLevel - 1) / 4) * 100}%, rgba(85, 85, 85, 0.5) ${((eraserLevel - 1) / 4) * 100}%, rgba(85, 85, 85, 0.5) 100%)` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Text Tool */}
          <div className="relative group bg-white border border-black shadow-sm -mt-px">
            <button
              onClick={() => {
                if (tool === 'text') {
                  setIsTextMenuOpen(!isTextMenuOpen);
                } else {
                  setTool('text');
                  setIsTextMenuOpen(true);
                  setIsPenMenuOpen(false);
                  setIsEraserMenuOpen(false);
                  setIsArrowMenuOpen(false);
                }
              }}
              className={`p-2 transition-colors w-full flex items-center justify-center h-[34px] ${tool === 'text' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}
              title="Text"
            >
              <Type size={16} />
            </button>


          </div>

          {/* Arrow Tool */}
          <div className="relative group bg-white border border-black shadow-sm -mt-px">
            <button
              onClick={() => {
                if (tool === 'arrow') {
                  setIsArrowMenuOpen(!isArrowMenuOpen);
                } else {
                  setTool('arrow');
                  setIsArrowMenuOpen(true);
                  setIsPenMenuOpen(false);
                  setIsEraserMenuOpen(false);
                }
              }}
              className={`p-2 transition-colors w-full flex items-center justify-center h-[34px] ${tool === 'arrow' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}
              title="Arrow"
            >
              <ArrowRight size={16} />
            </button>

            {isArrowMenuOpen && (
              <div className="absolute left-full top-0 ml-2 border border-black bg-white flex flex-col w-[160px] shadow-sm z-40">
                <div className="flex flex-row h-[34px]">
                  <button
                    onClick={(e) => { e.stopPropagation(); setArrowStyle('solid'); }}
                    className={`flex-1 flex px-3 items-center justify-center transition-colors border-r border-black ${arrowStyle === 'solid' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    title="Solid"
                  >
                    <div className={`w-6 border-b-2 ${arrowStyle === 'solid' ? 'border-white' : 'border-black'}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setArrowStyle('dotted'); }}
                    className={`flex-1 flex px-3 items-center justify-center transition-colors ${arrowStyle === 'dotted' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                    title="Dotted"
                  >
                    <div className={`w-6 border-b-2 border-dotted ${arrowStyle === 'dotted' ? 'border-white' : 'border-black'}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Move Tool */}
          <div className="bg-white border border-black shadow-sm -mt-px">
            <button
              onClick={() => {
                setTool(tool === 'move' ? null : 'move');
                setIsPenMenuOpen(false);
                setIsEraserMenuOpen(false);
                setIsArrowMenuOpen(false);
              }}
              className={`p-2 transition-colors w-full flex items-center justify-center h-[34px] ${tool === 'move' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}
              title="Move"
            >
              <Move size={16} />
            </button>
          </div>

          {/* Undo */}
          <div className="bg-white border border-black shadow-sm -mt-px">
            <button
              onClick={handleUndo}
              className="p-2 hover:bg-gray-100 text-black transition-colors flex items-center justify-center w-full h-[34px]"
              title="Undo"
            >
              <Undo size={16} />
            </button>
          </div>

          {/* Clear */}
          <div className="bg-white border border-black shadow-sm -mt-px">
            <button
              onClick={handleSketchClear}
              className="p-2 hover:bg-red-50 text-red-600 transition-colors flex items-center justify-center w-full h-[34px]"
              title="Clear Canvas"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Settings Toggle */}
        <div className={`bg-white border border-black shadow-sm transition-all duration-300 relative z-10 ${isToolbarExpanded ? '-mt-px' : ''}`}>
          <button
            onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
            className={`p-2 transition-colors flex items-center justify-center w-full h-[34px] ${!isToolbarExpanded ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}
            title="Toggle Toolbar"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Upload & Camera Buttons (Logged In Only, Top Right) */}
      {!backgroundImage && isLoggedIn && (
        <div className="absolute top-4 right-4 flex items-center justify-end gap-1.5 z-30 pointer-events-none">
          {/* UPLOAD Button */}
          <div className="bg-white border border-black shadow-sm dark:bg-black dark:border-white pointer-events-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 transition-colors flex items-center justify-center w-[34px] h-[34px] hover:bg-gray-100 text-black dark:text-white dark:hover:bg-gray-800"
              title="Upload Image"
            >
              <Upload size={16} />
            </button>
          </div>

          {/* CAMERA Button (태블릿/모바일 전용 표시, 데스크탑에서는 숨김) */}
          <div className="bg-white border border-black shadow-sm dark:bg-black dark:border-white pointer-events-auto hidden [@media(pointer:coarse)]:block">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="p-2 transition-colors flex items-center justify-center w-[34px] h-[34px] hover:bg-gray-100 text-black dark:text-white dark:hover:bg-gray-800"
              title="Take Photo"
            >
              <Camera size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      {
        !backgroundImage ? (
          <>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
          </>
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
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-black/2 border-4 border-dashed border-gray-100/50 z-50 pointer-events-none flex items-center justify-center"></div>
        )}

        {/* Transform Wrapper for Zoom/Pan and Fit Scale */}
        <div
          className="absolute origin-top-left will-change-transform shadow-none"
          style={{
            transform: `translate(${transform.x + fitTransform.offsetX}px, ${transform.y + fitTransform.offsetY}px) scale(${transform.scale * fitTransform.scale})`,
            width: baseSize.w > 0 ? baseSize.w : '100%',
            height: baseSize.h > 0 ? baseSize.h : '100%'
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
            style={{ pointerEvents: 'none' }}
          />

          {/* Layer 2: Interactive Overlay (Text Input) */}
          {textInput.visible && (
            <textarea
              ref={textInputRef}
              value={textInput.text}
              onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
              onBlur={handleTextSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                  setTool(null); // Return to default tool after finishing
                }
              }}
              className="absolute z-20 outline-none border border-black bg-transparent p-0 m-0 leading-tight resize-none whitespace-pre overflow-hidden text-left"
              style={{
                textAlign: 'left',
                left: textInput.x,
                top: textInput.y,
                color: activeColor,
                fontSize: `30px`,
                fontFamily: 'Inter, sans-serif',
                minWidth: '20px',
                minHeight: '44px',
                lineHeight: 1.2,
                // Auto-expand based on content
                width: `${Math.max(20, textInput.text.length * 20)}px`,
                height: `${Math.max(44, textInput.text.split('\n').length * 44)}px`
              }}
            />
          )}
        </div>

        {/* Custom Eraser/Pen Cursor - Positioned visually */}
        {
          (tool === 'eraser' || tool === 'pen') && showCursor && (
            <div
              className="pointer-events-none absolute rounded-full z-50 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: cursorPos.x * (transform.scale * fitTransform.scale) + (transform.x + fitTransform.offsetX),
                top: cursorPos.y * (transform.scale * fitTransform.scale) + (transform.y + fitTransform.offsetY),
                width: (tool === 'eraser' ? ERASER_SIZES[eraserLevel - 1] : PEN_SIZES[penLevel - 1]) * (transform.scale * fitTransform.scale),
                height: (tool === 'eraser' ? ERASER_SIZES[eraserLevel - 1] : PEN_SIZES[penLevel - 1]) * (transform.scale * fitTransform.scale),
                backgroundColor: tool === 'eraser' ? 'rgba(255, 255, 255, 0.2)' : activeColor,
                opacity: 0.5,
                borderColor: 'black',
                borderWidth: tool === 'eraser' ? '1px' : '0px'
              }}
            />
          )
        }

      </div>
    </div>
  );
});

export default CanvasBoard;