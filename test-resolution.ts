import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey });

const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';

async function test() {
    console.log("--- Testing Image Generation with '2K' resolution ---");
    try {
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE_GEN,
            contents: {
                parts: [{ text: "Draw a box" }]
            },
            config: {
                imageConfig: {
                    imageSize: '2K' as any, // Testing the value from the app
                    aspectRatio: '1:1',
                }
            }
        });

        console.log("Success with 2K!");

    } catch (e: any) {
        console.error("Failed with 2K:", e.message);
    }
}

test();
