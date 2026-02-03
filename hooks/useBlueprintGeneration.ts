import { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeSketch, generateBlueprintImage } from '../services/geminiService';
import { parseAnalysisReport } from '../utils/reportParser';
import { HistoryItem, AnalysisReport, ImageResolution } from '../types';
import { CanvasRef } from '../components/CanvasBoard';

interface UseBlueprintGenerationProps {
    onComplete?: (item: HistoryItem) => void;
    onError?: (error: Error) => void;
}

export const useBlueprintGeneration = ({ onComplete, onError }: UseBlueprintGenerationProps = {}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);

    // UX State
    const [showPleaseWait, setShowPleaseWait] = useState(false);
    const [loadingSeconds, setLoadingSeconds] = useState(0);

    // Refs
    const generationIdRef = useRef(0);
    const pleaseWaitTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Loading Text Cycle Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isProcessing) {
            setLoadingSeconds(0);
            interval = setInterval(() => {
                setLoadingSeconds(prev => prev + 1);
            }, 1000);
        } else {
            setLoadingSeconds(0);
        }
        return () => clearInterval(interval);
    }, [isProcessing]);

    const generate = useCallback(async (
        canvasRef: React.RefObject<CanvasRef>,
        originalImage: string | null,
        userPrompt: string,
        resolution: ImageResolution,
        aspectRatio: string,
        vizMode: 'CONCEPT' | 'DETAIL',
        styleMode: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'NONE'
    ) => {
        if (!canvasRef.current && !originalImage) return;

        // 1. Get Image
        let currentImage = originalImage;
        if (canvasRef.current) {
            const exported = canvasRef.current.exportImage();
            if (exported) currentImage = exported;
        }

        if (!currentImage) return;

        // Start Processing
        const currentId = Date.now();
        generationIdRef.current = currentId;
        setIsProcessing(true);
        setGeneratedImage(null);
        setProgress(0);

        // Initial 3-second timer for "PLEASE WAIT" message
        if (pleaseWaitTimerRef.current) clearTimeout(pleaseWaitTimerRef.current);
        pleaseWaitTimerRef.current = setTimeout(() => {
            setShowPleaseWait(true);
        }, 3000);

        let progressTimer: NodeJS.Timeout;
        const startProgressInfo = (target: number, speed: number) => {
            clearInterval(progressTimer);
            progressTimer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= target) {
                        clearInterval(progressTimer);
                        return prev;
                    }
                    return prev + 1;
                });
            }, speed);
        };

        try {
            // --- PHASE 1: ANALYZING ---
            setProcessingStep('ANALYZING');
            startProgressInfo(40, 50);

            const analysisMarkdown = await analyzeSketch(currentImage, userPrompt, vizMode, styleMode);
            const parsedAnalysis = parseAnalysisReport(analysisMarkdown);

            if (generationIdRef.current !== currentId) return;
            setAnalysisReport(parsedAnalysis);

            // --- PHASE 2: STYLING (Conditional) ---
            if (styleMode !== 'NONE') {
                setProcessingStep('STYLING');
                clearInterval(progressTimer);
                setProgress(40);
                startProgressInfo(60, 30);
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                setProgress(50);
            }

            if (generationIdRef.current !== currentId) return;

            // --- PHASE 3: GENERATING ---
            setProcessingStep('GENERATING');
            clearInterval(progressTimer);
            startProgressInfo(95, 100);

            const prompt = parsedAnalysis.execution.prompt;
            const imageBase64 = await generateBlueprintImage(
                currentImage,
                prompt,
                resolution,
                aspectRatio
            );

            if (generationIdRef.current !== currentId) return;

            // Complete
            clearInterval(progressTimer);
            setProgress(100);
            setGeneratedImage(imageBase64);

            const newItem: HistoryItem = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                originalImage: currentImage,
                generatedImage: imageBase64,
                prompt: userPrompt || prompt,
                resolution: resolution,
                analysisReport: parsedAnalysis
            };

            onComplete?.(newItem);

        } catch (error) {
            if (generationIdRef.current === currentId) {
                console.error(error);
                const err = error instanceof Error ? error : new Error('Unknown error');
                if (onError) onError(err);
                else alert(`Transformation failed: ${err.message}`);
            }
        } finally {
            if (generationIdRef.current === currentId) {
                clearInterval(progressTimer);
                if (pleaseWaitTimerRef.current) clearTimeout(pleaseWaitTimerRef.current);
                setIsProcessing(false);
                setProcessingStep('');
                setShowPleaseWait(false);
            }
        }
    }, [onComplete, onError]);

    const cancel = useCallback(() => {
        generationIdRef.current = 0; // Invalidate
        if (pleaseWaitTimerRef.current) clearTimeout(pleaseWaitTimerRef.current);
        setIsProcessing(false);
        setProcessingStep('');
        setProgress(0);
        setShowPleaseWait(false);
    }, []);

    const reset = useCallback(() => {
        setGeneratedImage(null);
        setAnalysisReport(null);
        setIsProcessing(false);
        setProcessingStep('');
        setProgress(0);
        setShowPleaseWait(false);
    }, []);

    return {
        isProcessing,
        processingStep,
        progress,
        generatedImage,
        analysisReport,
        showPleaseWait,
        loadingSeconds,
        generate,
        cancel,
        reset,
        setGeneratedImage,
        setAnalysisReport
    };
};
