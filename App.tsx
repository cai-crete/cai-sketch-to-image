import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ApiKeyGuard } from './components/ApiKeyGuard';
import CanvasBoard, { CanvasRef } from './components/CanvasBoard';
import ResultViewer from './components/ResultViewer';
import Library from './components/Library';
import { saveToLibrary, getLibrary, deleteFromLibrary } from './utils/storage';
import { ImageResolution, HistoryItem, ThemeMode, AnalysisReport, BlueprintMode } from './types';
import { X, Sun, Moon, Zap, ImageIcon, Camera, Trash2, History, LogOut, User, ChevronRight, ChevronLeft, Lock } from 'lucide-react'; // Added LogOut, User, Lock
import { metadata } from './constants';
import { useBlueprintGeneration } from './hooks/useBlueprintGeneration';
import { processAndDownloadImage } from './utils/downloadProcessor';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './services/supabase';
import { AuthScreen } from './components/AuthScreen';

// Style Definitions constant remains the same
const STYLE_DEFINITIONS = {
  A: {
    architect: "장중한 메스의 규칙_Vitruvian Tectonics",
    stylePoints: [
      { title: "Fragment (분절)", desc: "" },
      { title: "Stagger (엇갈림)", desc: "" },
      { title: "Deep Set Recess (창호의 깊이감)", desc: "" },
      { title: "Contextual Material Derivation (맥락적 재료 파생)", desc: "" },
      { title: "Diffuse Timelessness (확산된 시간성)", desc: "" }
    ]
  },
  B: {
    architect: "순수한 기하학적형태_Geometric Purity",
    stylePoints: [
      { title: "Orthogonal Grid (직교 그리드)", desc: "" },
      { title: "Layered Transparency (레이어 투명성)", desc: "" },
      { title: "Elevated Massing (띄워진 매스)", desc: "" },
      { title: "Absolute Whiteness (절대 백색)", desc: "" },
      { title: "Hard Sunlight Chiaroscuro (강렬한 명암법)", desc: "" }
    ]
  },
  C: {
    architect: "가구식 구조_Particlization",
    stylePoints: [
      { title: "Divide (분할)", desc: "" },
      { title: "Kigumi Joinery (결구 접합)", desc: "" },
      { title: "Deep Eaves (깊은 처마)", desc: "" },
      { title: "Blurred Edge (흐릿한 경계)", desc: "" },
      { title: "Komorebi Lighting (목과 빛)", desc: "" }
    ]
  },
  D: {
    architect: "고지식한 조형성_Incised Geometry",
    stylePoints: [
      { title: "Platonic Extrusion (플라톤적 돌출)", desc: "" },
      { title: "Strategic Incision (전략적 절개)", desc: "" },
      { title: "Horizontal Striping (수평 줄무늬)", desc: "" },
      { title: "Brick Pattern Variation (벽돌 패턴 변주)", desc: "" },
      { title: "Grounded Solidity (접지된 견고함)", desc: "" }
    ]
  },
  E: {
    architect: "조형적인 유선형_Sculptural Fluidity",
    stylePoints: [
      { title: "Collide & Explode (충돌과 폭발)", desc: "" },
      { title: "Curve & Crumple (곡면과 구김)", desc: "" },
      { title: "Metallic Skin (금속 피부)", desc: "" },
      { title: "Asymmetric Fragmentation (비대칭 파편화)", desc: "" },
      { title: "Oblique Sunlight Drama (비스듬한 햇빛 드라마)", desc: "" }
    ]
  },
  F: {
    architect: "다이어그램의 구조화_Diagrammatic Formalism",
    stylePoints: [
      { title: "Dual Grid Superimposition (이중 그리드 중첩)", desc: "" },
      { title: "Transformation Sequence (변형 연산 시퀀스)", desc: "" },
      { title: "Indexical Trace (지표적 흔적)", desc: "" },
      { title: "Anti-Compositional Logic (반구성 논리)", desc: "" },
      { title: "White Neutrality (백색 중립성)", desc: "" }
    ]
  },
  G: {
    architect: "노출된 하이테크_Tectonic Transparency",
    stylePoints: [
      { title: "Kit of Parts (부품 조립)", desc: "" },
      { title: "Multi-Layered Facade (다층 입면)", desc: "" },
      { title: "Floating Roof (떠 있는 지붕)", desc: "" },
      { title: "Exposed Services (노출 설비)", desc: "" },
      { title: "Adaptive Permeability (적응적 투과성)", desc: "" }
    ]
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'result'>('create');

  // Input State
  const [userPrompt, setUserPrompt] = useState('');
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.Normal);
  const [aspectRatio, setAspectRatio] = useState<string>('4:3');
  const [vizMode, setVizMode] = useState<'CONCEPT' | 'DETAIL'>('CONCEPT');
  const [styleMode, setStyleMode] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NONE'>('NONE');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [hasCanvasContent, setHasCanvasContent] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Style View State
  const [viewingStyle, setViewingStyle] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NONE' | null>(null);

  // Feature State
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<HistoryItem[]>([]);
  const [theme, setTheme] = useState<ThemeMode>('light');

  const canvasRef = useRef<CanvasRef>(null);

  // Auth & Token State
  const { user, tier, counts, deductCount } = useAuth();

  // Auth Screen State
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [panelFlash, setPanelFlash] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Mouse-tracking tooltip state
  const [primedAction, setPrimedAction] = useState<string | null>(null);
  const primedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTwoTapAction = (e: React.MouseEvent, actionId: string, actionFn: () => void) => {
    if (!user || tier === 'ADMIN') {
      actionFn();
      return;
    }

    if (primedAction !== actionId) {
      e.preventDefault();
      e.stopPropagation();
      setPrimedAction(actionId);

      if (primedTimeoutRef.current) {
        clearTimeout(primedTimeoutRef.current);
      }

      primedTimeoutRef.current = setTimeout(() => {
        setPrimedAction((prev) => (prev === actionId ? null : prev));
      }, 5000); // 5 seconds display for all devices
      return;
    }

    if (primedTimeoutRef.current) {
      clearTimeout(primedTimeoutRef.current);
    }
    setPrimedAction(null);
    actionFn();
  };

  // Custom Hook for Generation Logic
  const {
    isProcessing,
    processingStep,
    progress,
    generatedImage,
    analysisReport,
    showPleaseWait,
    loadingSeconds,
    generate,
    cancel,
    reset: resetGeneration,
    setGeneratedImage,
    setAnalysisReport
  } = useBlueprintGeneration({
    onComplete: (newItem) => {
      setOriginalImage(newItem.originalImage); // Fix: Update originalImage state for ResultViewer
      setActiveTab('result');
      // Save to library
      saveToLibrary(newItem).then((updatedItems) => {
        setLibraryItems(updatedItems);
      });
    }
  });

  // Load Library & Theme on Mount
  useEffect(() => {
    const initData = async () => {
      const items = await getLibrary();
      setLibraryItems(items);
    };
    initData();
  }, []);

  // Update Metadata
  useEffect(() => {
    document.title = metadata.title;
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', metadata.description);
  }, []);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleStyleSelect = (style: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NONE') => {
    setStyleMode(style);
    setViewingStyle(style === 'NONE' ? null : style); // Fix: Open info tab for selected style
  };

  const handleGenerateClick = () => {
    if (!user) return; // Safeguard

    // Check tokens before proceeding
    if (counts <= 0 && tier !== 'ADMIN') {
      alert("You have run out of Counts. Please upgrade or contact the administrator.");
      return;
    }

    // Deduct count (only if not admin, handled internally by context)
    const success = deductCount();
    if (!success) return; // Failsafe

    generate(
      canvasRef,
      originalImage,
      userPrompt,
      resolution,
      aspectRatio,
      vizMode,
      styleMode
    );
  };

  const handleDownload = async () => {
    if (generatedImage) {
      // Apply correct deduction for High (5) / Normal (1) quality on download
      let deductionAmount = 0;
      if (resolution === 'NORMAL QUALITY') deductionAmount = 1;
      else if (resolution === 'HIGH QUALITY') deductionAmount = 5;

      if (deductionAmount > 0) {
        if (counts < deductionAmount && tier !== 'ADMIN') {
          alert(`다운로드를 위한 Count가 부족합니다. (필요 Count: ${deductionAmount})`);
          return;
        }
        const success = deductCount(deductionAmount);
        if (!success) return;
      }

      setIsDownloading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const fileName = `CRE-TE_SKETCH to IMAGE_${year}, ${month}, ${day} - ${hours}${minutes}`;

      try {
        await processAndDownloadImage(generatedImage, aspectRatio, resolution, fileName);
      } catch (error) {
        console.error("Download processing failed:", error);
        alert("Failed to process download image. Downloading original resolution.");
        // Fallback to original
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleReset = () => {
    setShowLibrary(false);
    resetGeneration(); // Use hook's reset
    setOriginalImage(null);
    setActiveTab('create');
    setUserPrompt('');
    setVizMode('CONCEPT');
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  };

  const handleLoadFromLibrary = (item: HistoryItem) => {
    setOriginalImage(item.originalImage);
    setGeneratedImage(item.generatedImage);
    setAnalysisReport(item.analysisReport || null);
    setUserPrompt(item.prompt);
    setResolution(item.resolution);
    setActiveTab('result');
    setShowLibrary(false);
  };

  const handleDeleteFromLibrary = async (id: string) => {
    const updated = await deleteFromLibrary(id);
    setLibraryItems(updated);
  };

  const handleEdit = () => {
    if (generatedImage && canvasRef.current) {
      canvasRef.current.loadImage(generatedImage);
      setOriginalImage(generatedImage); // Optional: treat generated result as the new "original"? Or keep original?
      // Actually per requirement: "generated image as background".
      // loadImage sets the background layer.
      setActiveTab('create');
    }
  };

  return (
    <ApiKeyGuard>
      <div className="h-[100dvh] w-full flex flex-col bg-bw-white text-bw-black dark:bg-bw-black dark:text-bw-white transition-colors duration-300">
        <header className="h-16 short:h-12 flex items-center justify-between px-6 short:px-4 shrink-0 z-30 bg-bw-white dark:bg-bw-black">
          <div className="flex items-center gap-4">
            <span className="font-display text-3xl short:text-2xl pt-1">C</span>
            <h1
              className={`font-display text-[1.575rem] tracking-wide pt-1 cursor-pointer hover:opacity-60 transition-opacity ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
              onClick={handleReset}
            >
              {metadata.title.toUpperCase()}
            </h1>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="font-mono text-sm opacity-80 flex items-center gap-2">
                    <User size={16} />
                    <span>Count: {tier === 'VIP' || tier === 'CUSTOMER' || tier === 'TEST' ? `${counts} (${tier === 'VIP' ? 'VIP' : tier === 'CUSTOMER' ? 'Customer' : 'Test'})` : tier === 'ADMIN' ? '∞ (CRE-TE)' : counts}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (isProcessing) return;
                      await supabase.auth.signOut();
                      handleReset();
                    }}
                    className={`hover:opacity-60 transition-opacity flex items-center gap-1 font-mono text-sm ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
                    title="Logout"
                    disabled={isProcessing}
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : null}
            </div>

            {user && (
              <button
                onClick={() => setShowLibrary(true)}
                disabled={isProcessing}
                className={`font-display text-lg tracking-wide hover:opacity-60 transition-opacity pt-1 ${isProcessing ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                LIBRARY
              </button>
            )}
            {!user && (
              <button
                onClick={() => setShowAuthScreen(true)}
                className="font-display text-lg tracking-wide hover:opacity-60 transition-opacity pt-1"
              >
                Sign in
              </button>
            )}
            <button
              onClick={toggleTheme}
              disabled={isProcessing}
              className={`hover:opacity-60 transition-opacity ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col landscape:flex-row overflow-hidden relative">
          {showLibrary && (
            <Library
              items={libraryItems}
              onSelect={handleLoadFromLibrary}
              onDelete={handleDeleteFromLibrary}
              onClose={() => {
                setShowLibrary(false);
                handleReset();
              }}
            />
          )}

          <div className="relative bg-white dark:bg-black flex flex-col min-w-0 h-[30vh] landscape:h-auto landscape:flex-1">
            <div className="w-full h-full relative">
              <div className={`w-full h-full ${activeTab === 'create' ? 'block' : 'hidden'} ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}>
                <CanvasBoard
                  ref={canvasRef}
                  onImageChange={setHasCanvasContent}
                />
              </div>
              {activeTab === 'result' && originalImage && generatedImage && (
                <ResultViewer
                  original={originalImage}
                  generated={generatedImage}
                  onDownload={handleDownload}
                  onEdit={handleEdit}
                />
              )}
            </div>
          </div>
          {!showLibrary && user && (
            <div className={`w-full ${isRightPanelOpen ? 'landscape:w-[320px]' : 'landscape:w-0'} ${panelFlash ? 'bg-gray-100 dark:bg-gray-900 invert' : 'bg-bw-white dark:bg-bw-black'} flex flex-col z-[200] border-t landscape:border-t-0 ${isRightPanelOpen ? 'landscape:border-l' : ''} border-black/10 dark:border-white/10 relative flex-1 landscape:flex-none landscape:h-full transition-all duration-300`}>
              {user && (
                <button
                  onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                  disabled={isProcessing}
                  className={`absolute top-1/2 -translate-y-1/2 -left-8 w-8 h-16 bg-bw-white dark:bg-bw-black border border-black/10 dark:border-white/10 dark:border-l-white/10 border-r-0 flex items-center justify-center z-[210] rounded-l-md hidden landscape:flex ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
                >
                  {isRightPanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
              )}
              {isProcessing && (
                <div className="absolute inset-0 bg-white/95 dark:bg-black/95 z-40 pointer-events-auto" />
              )}

              <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-5 ${isRightPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200 delay-100`}>
                {/* Conditional Rendering based on Tab */}
                {activeTab === 'create' ? (
                  <>
                    {/*
                    CONTENT AREA
                    Swaps between Main Form and Style View
                    */}
                    {viewingStyle ? (
                      /* STYLE VIEW CONTENT */
                      <div className="flex-1 flex flex-col min-h-0 space-y-3">
                        <div className="flex items-center justify-between shrink-0">
                          <label className="font-display text-xl block">CRE-TE STYLE</label>
                          <button
                            onClick={() => setViewingStyle(null)}
                            className="hover:opacity-60 transition-opacity"
                          >
                            <X size={24} />
                          </button>
                        </div>
                        <div className="w-full flex-1 px-0 py-0 font-mono text-xs leading-relaxed bg-transparent border-0 focus:outline-none resize-none overflow-y-auto custom-scrollbar min-h-0">
                          {viewingStyle && STYLE_DEFINITIONS[viewingStyle] && (
                            <div className="space-y-4">
                              <div>
                                <p className="font-bold text-xs mb-1 text-black dark:text-white uppercase">
                                  {STYLE_DEFINITIONS[viewingStyle].architect}
                                </p>
                              </div>

                              <div>
                                <p className="font-bold opacity-70 mb-2">STYLE</p>
                                <div className="space-y-3">
                                  {STYLE_DEFINITIONS[viewingStyle].stylePoints.map((point, i) => (
                                    <div key={i}>
                                      <p className="font-bold opacity-80 mb-0.5">* {point.title}</p>
                                      <p className="opacity-80 pl-2">{point.desc}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* MAIN FORM CONTENT */
                      <>
                        <div className="flex-1 flex flex-col min-h-0 space-y-3">
                          <div className="space-y-3 flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between">
                              <label className="font-display text-xl block">CODE</label>
                              <button className="invisible pointer-events-none" tabIndex={-1}>
                                <X size={24} strokeWidth={1.5} />
                              </button>
                            </div>
                            <textarea
                              className="w-full flex-1 p-3 font-mono text-xs bg-transparent border border-black dark:border-white focus:outline-none resize-none placeholder-gray-400 rounded-none min-h-[50%]"
                              placeholder="Describe materials, lighting..."
                              value={userPrompt}
                              onChange={(e) => setUserPrompt(e.target.value)}
                              disabled={isProcessing}
                            />
                          </div>
                        </div>

                        <div className="space-y-3 shrink-0">
                          <div className="relative flex justify-between items-end">
                            <label className="font-display text-xl block">MODE</label>
                            {(primedAction === 'mode-CONCEPT' || primedAction === 'mode-DETAIL') && (
                              <span className="absolute bottom-1 right-0 text-[11px] font-mono opacity-80 animate-fade-in text-right pointer-events-none">
                                {primedAction === 'mode-CONCEPT' ? '형태를 제안합니다.' : '형태를 보존합니다.'}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-0 border border-black dark:border-white">
                            {['CONCEPT', 'DETAIL'].map((mode, idx) => (
                              <button
                                key={mode}
                                onClick={(e) => handleTwoTapAction(
                                  e,
                                  `mode-${mode}`,
                                  () => setVizMode(mode as 'CONCEPT' | 'DETAIL')
                                )}
                                disabled={isProcessing}
                                className={`py-2 font-display text-lg transition-all ${vizMode === mode
                                  ? 'bg-black text-white dark:bg-white dark:text-black'
                                  : 'bg-transparent'
                                  } ${idx !== 0 ? 'border-l border-black dark:border-white' : ''}`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 shrink-0">
                          <label className="font-display text-xl block">CRE-TE STYLE</label>
                          <div className="grid grid-cols-4 gap-[1px] bg-black border border-black dark:border-white dark:bg-white overflow-hidden">
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NONE'].map((style, idx) => (
                              <button
                                key={style}
                                onClick={() => {
                                  handleStyleSelect(style as any);
                                  resetGeneration();
                                }}
                                disabled={isProcessing}
                                className={`
                                h-12 flex items-center justify-center font-display text-lg transition-colors
                                ${styleMode === style
                                    ? 'bg-black text-white dark:bg-white dark:text-black'
                                    : 'bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-800'
                                  }
                              `}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  /* Result View - Analysis Report Sidebar */
                  <>
                    {analysisReport ? (
                      <>
                        <div className="flex-1 flex flex-col min-h-0">
                          <div className="flex-[0.9] flex flex-col min-h-0 space-y-3">
                            {/* LOGIC & ANALYSIS */}
                            <div className="space-y-3 flex-1 flex flex-col min-h-0">
                              <div className="flex items-center justify-between">
                                <label className="font-display text-xl block">LOGIC & ANALYSIS</label>
                                <button
                                  onClick={() => setShowLibrary(true)}
                                  className="hover:opacity-60 transition-opacity"
                                >
                                  <X size={24} strokeWidth={1.5} />
                                </button>
                              </div>
                              <div className="border border-black dark:border-white p-3 font-mono text-xs space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                                <p className="font-bold">▪ CODE</p>
                                {userPrompt.trim() ? (
                                  <p className="opacity-80 pb-2">{userPrompt}</p>
                                ) : null}

                                <p className="font-bold mt-2">▪ Metacognitive Analysis</p>
                                <p className="opacity-80 text-[11px] font-sans">{analysisReport.metacognitive.diagnosis}</p>
                                <p className="opacity-60 text-[11px] font-sans">{analysisReport.metacognitive.reasoning}</p>

                                <p className="font-bold mt-2">▪ Spatial & Logic Decoding</p>
                                <p className="opacity-80">Geometry: {analysisReport.spatial.geometry}</p>
                                <p className="opacity-80">Material: {analysisReport.spatial.materiality}</p>
                              </div>
                            </div>

                            {/* EDIT BUTTON MOVED HERE */}
                            <div className="relative">
                              <button
                                onClick={(e) => handleTwoTapAction(e, 'edit', () => {
                                  if (user && counts <= 0 && tier !== 'ADMIN') {
                                    alert("You have run out of Counts. Please upgrade or contact the administrator.");
                                    return;
                                  }
                                  if (user && !deductCount()) return;
                                  handleEdit();
                                })}
                                className="w-full py-2 font-display text-lg tracking-widest bg-black text-white dark:bg-white dark:text-black transition-opacity relative z-50 shrink-0 border border-black dark:border-white"
                              >
                                <span className="pt-1">EDIT</span>
                              </button>
                              {primedAction === 'edit' && <div className="absolute top-full mt-1 left-0 text-[11px] font-mono text-left opacity-80 animate-fade-in pointer-events-none">COUNT 1회 차감됩니다.</div>}
                            </div>
                          </div>
                          <div className="flex-[0.1]" />
                        </div>

                        {/* RESOLUTION */}
                        <div className="space-y-3 shrink-0">
                          <div className="relative flex justify-between items-end">
                            <label className="font-display text-xl block">RESOLUTION</label>
                          </div>
                          <div className="grid grid-cols-2 gap-0 border border-black dark:border-white">
                            {Object.values(ImageResolution).map((res, idx) => {
                              const isRestricted = res === ImageResolution.High && tier !== 'ADMIN';
                              return (
                                <button
                                  key={res}
                                  onClick={() => {
                                    if (isRestricted) return;
                                    if (resolution === res) return;
                                    setResolution(res);
                                  }}
                                  disabled={isProcessing || isRestricted}
                                  className={`py-2 font-display text-lg transition-all relative flex items-center justify-center ${resolution === res && !isRestricted
                                    ? 'bg-black text-white dark:bg-white dark:text-black'
                                    : 'bg-transparent'
                                    } ${idx !== 0 ? 'border-l border-black dark:border-white' : ''} ${isRestricted ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                  {res}
                                  {isRestricted && (
                                    <Lock size={14} className="absolute top-2 right-2 opacity-50" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* ASPECT RATIO */}
                        <div className="space-y-3 shrink-0">
                          <label className="font-display text-xl block">ASPECT RATIO</label>
                          <div className="grid grid-cols-3 gap-0 border border-black dark:border-white">
                            {['1:1', '4:3', '16:9'].map((ratio, idx) => (
                              <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                disabled={isProcessing}
                                className={`py-2 font-display text-lg transition-all ${aspectRatio === ratio
                                  ? 'bg-black text-white dark:bg-white dark:text-black'
                                  : 'bg-transparent'
                                  } ${idx !== 0 ? 'border-l border-black dark:border-white' : ''}`}
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center opacity-50 font-mono text-xs">
                        No analysis report available.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className={`shrink-0 pt-4 pb-8 px-6 bg-bw-white dark:bg-bw-black z-50 transform-gpu ${isRightPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200 delay-100`}>
                <div className="space-y-3">
                  {activeTab === 'create' ? (
                    !user ? null : (
                      viewingStyle ? (
                        <button
                          onClick={() => {
                            setStyleMode(viewingStyle);
                            setViewingStyle(null);
                          }}
                          className="w-full py-2 font-display text-lg tracking-widest flex items-center justify-center gap-3 transition-all relative z-50 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-black dark:border-white"
                        >
                          <span className="pt-1">SELECT</span>
                        </button>
                      ) : (
                        <div className="mt-8 relative">
                          {primedAction === 'generate' && <div className="absolute bottom-full mb-1 left-0 text-[11px] font-mono text-left opacity-80 animate-fade-in pointer-events-none">COUNT 1회 차감됩니다.</div>}
                          {isProcessing ? (
                            <button
                              onClick={cancel}
                              className="w-full py-2 font-display text-lg tracking-widest flex items-center justify-center gap-3 transition-all border border-black dark:border-white bg-transparent text-black dark:text-white z-[201] relative"
                            >
                              <span className="pt-1">CANCEL</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleTwoTapAction(e, 'generate', handleGenerateClick)}
                              className="w-full py-2 font-display text-lg tracking-widest flex items-center justify-center gap-3 transition-all relative z-50 border border-black dark:border-white"
                            >
                              <span className="pt-1">GENERATE</span>
                            </button>
                          )}
                        </div>
                      )
                    )
                  ) : (
                    <div className="mt-8 relative">
                      {primedAction === 'download' && <div className="absolute bottom-full mb-1 left-0 text-[11px] font-mono text-left opacity-80 animate-fade-in pointer-events-none">COUNT {resolution === 'NORMAL QUALITY' ? '1' : '5'}회 차감됩니다.</div>}
                      {/* DOWNLOAD BUTTON */}
                      <button
                        onClick={(e) => handleTwoTapAction(
                          e,
                          'download',
                          handleDownload
                        )}
                        disabled={isDownloading || isProcessing}
                        className="w-full py-2 font-display text-lg tracking-widest bg-black text-white dark:bg-white dark:text-black flex items-center justify-center gap-2 transition-opacity relative z-50 disabled:opacity-50"
                      >
                        <span className="pt-1">{isDownloading ? 'PLEASE WAIT' : 'DOWNLOAD'}</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-black/10 dark:border-white/10 text-center flex justify-center">
                  <p className="font-mono text-[9px] opacity-40 tracking-widest whitespace-nowrap">
                    © CRETE CO.,LTD. 2026. ALL RIGHTS RESERVED.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Global Loading Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/95 dark:bg-black/95 z-[100] flex flex-col items-center justify-center">
              {/* 5 Bouncing Dots */}
              <div className="flex gap-4 mb-8">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-black dark:bg-white rounded-full animate-dot-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>

              {/* Text: Mono, Smaller, Blinking, 10s/5s cycle */}
              <div className="flex flex-col items-center gap-2">

                <h2 className="font-mono text-xl tracking-widest uppercase animate-blink">
                  {loadingSeconds % 15 < 10 ? processingStep : "PLEASE WAIT"}
                </h2>
              </div>
            </div>
          )}
        </main>
      </div>

      {showAuthScreen && (
        <AuthScreen onClose={() => setShowAuthScreen(false)} />
      )}
    </ApiKeyGuard>
  );
}

export default App;