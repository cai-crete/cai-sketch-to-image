export enum BlueprintMode {
  Concept = 'CONCEPT',
  Detail = 'DETAIL',
}

export enum ImageResolution {
  Res_1K = '1K',
  Res_2K = '2K',
  Res_4K = '4K',
}

export type ThemeMode = 'light' | 'dark';

export interface GenerationConfig {
  prompt: string;
  mode: BlueprintMode;
  resolution: ImageResolution;
  aspectRatio: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalImage: string; // Base64
  generatedImage: string; // Base64
  prompt: string;
  resolution: ImageResolution;
  analysisReport?: AnalysisReport;
}

// Window augmentation for AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

export interface AnalysisReport {
  metacognitive: {
    diagnosis: string;
    reasoning: string;
    designStrategy: string;
    sensorySpec: {
      abstract: string;
      techSpec: string;
    };
  };
  spatial: {
    geometry: string;
    materiality: string;
    spaceHierarchy: string;
  };
  execution: {
    prompt: string;
  };
  verification: {
    imperfection: string;
    optical: string;
  };
  refinement: {
    optionA: string;
    optionB: string;
  };
}
