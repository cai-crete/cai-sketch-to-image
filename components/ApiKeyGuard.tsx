import React, { useEffect, useState } from 'react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkKey = async () => {
    try {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        console.warn("AI Studio API Key selector not found in window.");
        setHasKey(true); 
      }
    } catch (e) {
      console.error("Error checking API key:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      }
    } catch (e) {
      console.error("Error selecting key:", e);
      alert("Failed to open key selector. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-black text-black dark:text-white">
        <div className="font-display text-2xl animate-pulse tracking-widest">INITIALIZING</div>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-8 text-center text-black">
        <div className="max-w-lg space-y-8 border border-black p-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-display leading-none tracking-tight">SKETCH TO IMAGE</h1>
            <p className="text-sm font-sans font-light">REALIZATION ENGINE</p>
          </div>
          
          <div className="space-y-4">
             <div className="h-px w-full bg-black"></div>
             <p className="text-xs font-mono leading-relaxed max-w-sm mx-auto">
              VALID API CREDENTIALS REQUIRED.
            </p>
            
            <button 
              onClick={handleSelectKey}
              className="w-full py-3 bg-black text-white font-display text-xl hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
            >
              <span className="pt-1">CONNECT KEY</span>
            </button>
            <p className="text-[10px] font-mono text-gray-500">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">
                BILLING INFO
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};