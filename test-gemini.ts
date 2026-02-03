import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyBFApZ9A4kLnfnkkhM9HP0h8NfSTuKaEHI";
const ai = new GoogleGenAI({ apiKey });

const MODEL_ANALYSIS = 'gemini-3-pro-preview';
const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';

const MODEL_FALLBACK = 'gemini-1.5-flash';

async function test() {
    console.log("--- Testing Configured Analysis Model: " + MODEL_ANALYSIS + " ---");
    try {
        const response = await ai.models.generateContent({
            model: MODEL_ANALYSIS,
            contents: { parts: [{ text: "Hello" }] }
        });
        console.log("SUCCESS: " + MODEL_ANALYSIS);
    } catch (e: any) {
        console.error("FAILED: " + MODEL_ANALYSIS + " -> " + e.message);
    }

    console.log("\n--- Testing Fallback Analysis Model: " + MODEL_FALLBACK + " ---");
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FALLBACK,
            contents: { parts: [{ text: "Hello" }] }
        });
        console.log("SUCCESS: " + MODEL_FALLBACK);
    } catch (e: any) {
        console.error("FAILED: " + MODEL_FALLBACK + " -> " + e.message);
    }

    console.log("\n--- Testing Configured Image Model: " + MODEL_IMAGE_GEN + " ---");
    try {
        // Just test connectivity, real image gen needs more props but simple text might error with "not supported" which is fine, 
        // we want to see if the MODEL exists.
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE_GEN,
            contents: { parts: [{ text: "Draw a cat" }] }
        });
        console.log("SUCCESS: " + MODEL_IMAGE_GEN);
    } catch (e: any) {
        console.error("FAILED: " + MODEL_IMAGE_GEN + " -> " + e.message);
    }
}

test();
