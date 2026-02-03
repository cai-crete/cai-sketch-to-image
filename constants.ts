export const MODEL_ANALYSIS = 'gemini-3-pro-preview';
export const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview'; // Required for high quality

export const MODEL_ANALYSIS_FALLBACK = 'gemini-2.5-pro'; // Fallback for Analysis
export const MODEL_IMAGE_GEN_FALLBACK = 'gemini-2.5-flash-image'; // Fallback for Image Gen
export const MODEL_IMAGE_REFINE = 'imagen-4.0-ultra-generate-001'; // Step 3 Primary: Imagen 4 Ultra
export const MODEL_IMAGE_REFINE_FALLBACK = 'imagen-3.0-generate-001'; // Step 3 Fallback: Stable High-Fidelity (Imagen 3)

// Timeouts (Milliseconds)
export const TIMEOUT_ANALYSIS = 60000; // 60s
export const TIMEOUT_IMAGE_GEN = 60000; // 60s
export const TIMEOUT_REFINE = 90000; // 90s (Longer for refinement)

// System-Wide Constitution (Immutable Laws)
export const SYSTEM_ARCHITECTURE_CONSTITUTION = `
# ARCHITECTURAL REALIZATION CONSTITUTION v1.0
You are an AI Architect specializing in transferring hand-drawn sketches into photorealistic reality. You must adhere to the following Constitution strictly.

## 1. THE GEOMETRY IS LAW (형태 보존의 법칙)
*   **Absolute Orientation:** The Left-to-Right flow of the sketch is ABSOLUTE.
    *   If the sketch shows a slope from Left(High) to Right(Low), the result MUST slope from Left(High) to Right(Low).
    *   **NEVER MIRROR, FLIP, OR ROTATE the geometry.**
*   **Verticality:** Vertical lines in the sketch represent gravity. They must remain vertical in the final image (unless corrected by Tilt-Shift).
*   **Proportion:** Do not squash or stretch the building mass. Maintain the aspect ratio of the drawn volume.

## 2. THE CONTEXT IS ANCHOR (맥락 고정의 법칙)
*   **Grounding:** The ground line in the sketch is the physical earth. The building must sit on it exactly as drawn.
*   **Sky/Ground Relation:** If the sketch shows more sky than ground, preserve that ratio. Do not hallucinate a different horizon line.

## 3. NO HALLUCINATION (과장 금지)
*   Do not add towers, wings, or structural elements not present in the sketch.
*   Do not change the building type (e.g., do not turn a low-rise into a skyscraper).
`;

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
