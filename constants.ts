export const MODEL_ANALYSIS = 'gemini-3-pro-preview';
export const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview'; // Required for high quality

export const MODEL_ANALYSIS_FALLBACK = 'gemini-2.5-pro'; // Fallback for Analysis
export const MODEL_IMAGE_GEN_FALLBACK = 'gemini-flash-latest'; // Fallback for Image Gen

// Timeouts (Milliseconds)
export const TIMEOUT_ANALYSIS = 60000; // 60s
export const TIMEOUT_IMAGE_GEN = 60000; // 60s

// Camera Profiles (Unified Logic: AI Lens Selection + Strict Framing)
// Optical Scenarios (AI chooses 1 of 4 depending on context)
// NOTE: Viewpoint & Framing are ALWAYS locked to the sketch. Only Lens/Aperture physics change.
export const SCENARIO_PROFILES = {
    // Scenario A: Cinematic Wide (시네마틱 광각)
    A: {
        lens: "24mm Wide-Angle equivalent",
        effect: "Expands spatial depth within the fixed frame.",
        aperture: "f/8 (Clear Focus)"
    },
    // Scenario B: Compression / Telephoto (망원 압축)
    B: {
        lens: "85mm+ Telephoto equivalent",
        effect: "Compresses distance, flattens geometry.",
        aperture: "f/5.6"
    },
    // Scenario C: Macro Detail (초정밀 디테일)
    C: {
        lens: "100mm Macro equivalent",
        effect: "Extreme focus on texture grains, shallow depth.",
        aperture: "f/2.8 ~ f/4"
    },
    // Scenario D: Architectural Standard (건축 표준)
    D: {
        lens: "Tilt-Shift 35mm equivalent",
        effect: "Corrects all vertical lines. Zero distortion. Professional catalog look.",
        aperture: "f/11 (Deep Focus)"
    }
} as const;

export const metadata = {
    title: 'Sketch to Image',
    description: 'AI Drawing App',
};
