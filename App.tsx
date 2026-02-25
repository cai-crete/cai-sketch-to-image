import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ApiKeyGuard } from './components/ApiKeyGuard';
import CanvasBoard, { CanvasRef } from './components/CanvasBoard';
import ResultViewer from './components/ResultViewer';
import Library from './components/Library';
import { saveToLibrary, getLibrary, deleteFromLibrary } from './utils/storage';
import { ImageResolution, HistoryItem, ThemeMode, AnalysisReport, BlueprintMode } from './types';
import { X, Sun, Moon, Zap, ImageIcon, Camera, Trash2, History } from 'lucide-react';
import { metadata } from './constants';
import { useBlueprintGeneration } from './hooks/useBlueprintGeneration';

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
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.Res_2K);
  const [aspectRatio, setAspectRatio] = useState<string>('4:3');
  const [vizMode, setVizMode] = useState<'CONCEPT' | 'DETAIL'>('CONCEPT');
  const [styleMode, setStyleMode] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NONE'>('NONE');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [hasCanvasContent, setHasCanvasContent] = useState(false);

  // Style View State
  const [viewingStyle, setViewingStyle] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NONE' | null>(null);

  // Feature State
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<HistoryItem[]>([]);
  const [theme, setTheme] = useState<ThemeMode>('light');

  const canvasRef = useRef<CanvasRef>(null);

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

  const handleDownload = () => {
    if (generatedImage) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const fileName = `Sketch to Image Generated ${year}, ${month}, ${day} - ${hours}_${minutes}.png`;

      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
      <div className="h-screen w-full flex flex-col bg-bw-white text-bw-black dark:bg-bw-black dark:text-bw-white transition-colors duration-300">
        <header className="h-16 short:h-12 flex items-center justify-between px-6 short:px-4 shrink-0 z-30 bg-bw-white dark:bg-bw-black">
          <div className="flex items-center gap-4">
            <span className="font-display text-3xl short:text-2xl pt-1">C</span>
            <h1
              className="font-display text-[1.575rem] tracking-wide pt-1 cursor-pointer hover:opacity-60 transition-opacity"
              onClick={handleReset}
            >
              {metadata.title.toUpperCase()}
            </h1>
          </div>
          <div className="flex items-center gap-8">
            <button
              onClick={() => setShowLibrary(true)}
              disabled={isProcessing}
              className={`font-display text-lg tracking-wide hover:opacity-60 transition-opacity pt-1 ${isProcessing ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              LIBRARY
            </button>
            <button
              onClick={toggleTheme}
              className="hover:opacity-60 transition-opacity"
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
              <div className={`w-full h-full ${activeTab === 'create' ? 'block' : 'hidden'}`}>
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
          {!showLibrary && (
            <div className="w-full landscape:w-[320px] bg-bw-white dark:bg-bw-black flex flex-col z-[200] border-t landscape:border-t-0 landscape:border-l border-black/10 dark:border-white/10 relative flex-1 landscape:flex-none landscape:h-full overflow-hidden">
              {isProcessing && (
                <div className="absolute inset-0 bg-white/95 dark:bg-black/95 z-40 pointer-events-none" />
              )}

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 short:p-3 flex flex-col gap-5 short:gap-3">
                {/* Conditional Rendering based on Tab */}
                {activeTab === 'create' ? (
                  <div className="flex flex-col gap-5 short:gap-3">
                    {/*
                    CONTENT AREA
                    Swaps between Main Form and Style View
                */}
                    {viewingStyle ? (
                      /* STYLE VIEW CONTENT */
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
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
                      </>
                    ) : (
                      /* MAIN FORM CONTENT */
                      <>
                        <div className="space-y-3 short:space-y-1.5">
                          <label className="font-display text-xl short:text-lg block">CODE</label>
                          <textarea
                            className="w-full h-24 short:h-20 p-3 short:p-2 font-mono text-xs bg-transparent border border-black dark:border-white focus:outline-none resize-none placeholder-gray-400 rounded-none"
                            placeholder="Describe materials, lighting..."
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            disabled={isProcessing}
                          />
                        </div>

                        <div className="space-y-3 short:space-y-1.5">
                          <label className="font-display text-xl short:text-lg block">RESOLUTION</label>
                          <div className="grid grid-cols-3 gap-0 border border-black dark:border-white">
                            {Object.values(ImageResolution).map((res, idx) => (
                              <button
                                key={res}
                                onClick={() => setResolution(res)}
                                disabled={isProcessing}
                                className={`py-2 short:py-1 font-display text-lg short:text-base transition-all ${resolution === res
                                  ? 'bg-black text-white dark:bg-white dark:text-black'
                                  : 'bg-transparent hover:bg-gray-100 dark:hover:bg-white dark:hover:text-black'
                                  } ${idx !== 0 ? 'border-l border-black dark:border-white' : ''}`}
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 short:space-y-1.5">
                          <label className="font-display text-xl short:text-lg block">ASPECT RATIO</label>
                          <div className="grid grid-cols-3 gap-0 border border-black dark:border-white">
                            {['1:1', '4:3', '16:9'].map((ratio, idx) => (
                              <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                disabled={isProcessing}
                                className={`py-2 short:py-1 font-display text-lg short:text-base transition-all ${aspectRatio === ratio
                                  ? 'bg-black text-white dark:bg-white dark:text-black'
                                  : 'bg-transparent hover:bg-gray-100 dark:hover:bg-white dark:hover:text-black'
                                  } ${idx !== 0 ? 'border-l border-black dark:border-white' : ''}`}
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 short:space-y-1.5">
                          <label className="font-display text-xl short:text-lg block">MODE</label>
                          <div className="grid grid-cols-2 gap-0 border border-black dark:border-white">
                            {['CONCEPT', 'DETAIL'].map((mode, idx) => (
                              <button
                                key={mode}
                                onClick={() => setVizMode(mode as 'CONCEPT' | 'DETAIL')}
                                disabled={isProcessing}
                                className={`py-2 short:py-1 font-display text-lg short:text-base transition-all ${vizMode === mode
                                  ? 'bg-black text-white dark:bg-white dark:text-black'
                                  : 'bg-transparent hover:bg-gray-100 dark:hover:bg-white dark:hover:text-black'
                                  } ${idx !== 0 ? 'border-l border-black dark:border-white' : ''}`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 short:space-y-1.5">
                          <label className="font-display text-xl short:text-lg block">CRE-TE STYLE</label>
                          <div className="grid grid-cols-4 gap-[1px] bg-black border border-black dark:border-white dark:bg-white overflow-hidden">
                            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'NONE'].map((style, idx) => (
                              <button
                                key={style}
                                onClick={() => {
                                  handleStyleSelect(style as any);
                                  // Also clear previous results via hook if needed, but styling just sets mode here
                                  resetGeneration(); // Clear result when changing style in Create tab
                                }}
                                className={`
                                h-12 flex items-center justify-center font-display text-lg short:text-base transition-colors
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




                  </div>
                ) : (
                  /* Result View - Analysis Report Sidebar */
                  <>
                    {analysisReport ? (
                      <>
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
                          <div className="border border-black dark:border-white p-3 font-mono text-xs space-y-2 flex-1 overflow-y-auto">
                            <p className="font-bold">▪ Metacognitive Analysis</p>
                            <p className="opacity-80">{analysisReport.metacognitive.diagnosis}</p>
                            <p className="opacity-60 text-[10px]">{analysisReport.metacognitive.reasoning}</p>


                            <p className="font-bold mt-2">▪ Spatial & Logic Decoding</p>
                            <p className="opacity-80">Geometry: {analysisReport.spatial.geometry}</p>
                            <p className="opacity-80">Material: {analysisReport.spatial.materiality}</p>
                          </div>
                        </div>

                        {/* VERIFICATION & OPTIONS */}
                        {/* VERIFICATION & OPTIONS */}
                        <div className="space-y-3 flex-1 flex flex-col min-h-0">
                          <label className="font-display text-xl block">VERIFICATION & OPTIONS</label>
                          <div className="border border-black dark:border-white p-3 font-mono text-xs space-y-2 flex-1 overflow-y-auto">
                            <p className="font-bold">▪ Iterative Refinement</p>
                            <ul className="list-disc pl-3 opacity-80">
                              <li>{analysisReport.refinement.optionA}</li>
                              <li>{analysisReport.refinement.optionB}</li>
                            </ul>
                            <p className="font-bold mt-2">▪ Reality Check</p>
                            <p className="opacity-80">{analysisReport.verification.imperfection}</p>
                          </div>
                        </div>

                        {/* EXECUTION CODE */}
                        <div className="space-y-3 flex-1 flex flex-col min-h-0">
                          <label className="font-display text-xl block">EXECUTION CODE</label>
                          <div className="border border-black dark:border-white p-3 font-mono text-[10px] overflow-y-auto flex-1 whitespace-pre-wrap">
                            {analysisReport.execution.prompt}
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

              <div className="shrink-0 pt-4 pb-6 px-6 short:pt-2 short:pb-3 short:px-3 bg-bw-white dark:bg-bw-black z-50">
                <div className="space-y-3 short:space-y-1.5 border border-black dark:border-white">
                  {activeTab === 'create' ? (
                    viewingStyle ? (
                      <button
                        onClick={() => {
                          setStyleMode(viewingStyle);
                          setViewingStyle(null);
                        }}
                        className="w-full py-3 short:py-2 font-display text-lg tracking-widest flex items-center justify-center gap-3 transition-all relative z-50 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                      >
                        <span className="pt-1">SELECT</span>
                      </button>
                    ) : (
                      isProcessing ? (
                        <button
                          onClick={cancel}
                          className="w-full py-3 short:py-2 font-display text-lg tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black bg-transparent text-black dark:text-white z-[201] relative"
                        >
                          <span className="pt-1">CANCEL</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleGenerateClick}
                          className="w-full py-3 short:py-2 font-display text-lg tracking-widest flex items-center justify-center gap-3 transition-all relative z-50 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                        >
                          <span className="pt-1">GENERATE</span>
                        </button>
                      )
                    )
                  ) : (
                    <button
                      onClick={handleEdit}
                      className="w-full py-2 font-display text-lg tracking-widest bg-black text-white dark:bg-white dark:text-black flex items-center justify-center gap-2 hover:opacity-80 transition-opacity relative z-50"
                    >
                      <span className="pt-1">EDIT</span>
                    </button>
                  )}
                </div>

                <div className="mt-4 short:mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-center flex justify-center">
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
    </ApiKeyGuard>
  );
}

export default App;