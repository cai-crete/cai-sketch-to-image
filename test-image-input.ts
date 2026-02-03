import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyBFApZ9A4kLnfnkkhM9HP0h8NfSTuKaEHI";
const ai = new GoogleGenAI({ apiKey });

const MODEL_ANALYSIS = 'gemini-3-pro-preview';
const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';

// 1x1 Red Pixel Base64 PNG
const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function test() {
    console.log("--- Testing Image Analysis (Multimodal) ---");
    try {
        const response = await ai.models.generateContent({
            model: MODEL_ANALYSIS,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: base64Image
                        }
                    },
                    { text: "What color is this?" }
                ]
            }
        });
        console.log("Analysis Result:", response.text);
    } catch (e: any) {
        console.error("Analysis Failed:", e.message);
    }

    console.log("\n--- Testing Image Generation ---");
    try {
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE_GEN,
            contents: {
                parts: [
                    { text: "Draw a red square" }
                ]
            },
            config: {
                imageConfig: {
                    imageSize: '1024x1024' as any,
                    aspectRatio: '1:1',
                }
            }
        });

        // Check if we got an image back
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            const imagePart = parts.find(p => p.inlineData);
            if (imagePart) {
                console.log("Generation Success: Got image data");
            } else {
                console.log("Generation Success (No Image?):", JSON.stringify(parts));
            }
        } else {
            console.log("Generation Empty Response");
        }

    } catch (e: any) {
        console.error("Generation Failed:", e.message);
    }
}

test();
