import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyBFApZ9A4kLnfnkkhM9HP0h8NfSTuKaEHI";
const ai = new GoogleGenAI({ apiKey });

const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';

// 1x1 Red Pixel Base64 PNG
const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function test() {
    console.log("--- Testing Image Generation with Image Input (Sketch-to-Image) ---");
    try {
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE_GEN,
            contents: {
                parts: [
                    { text: "Turn this red dot into a beautiful architectural rendering" },
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: base64Image
                        }
                    }
                ]
            },
            config: {
                imageConfig: {
                    imageSize: '1024x1024' as any,
                    aspectRatio: '1:1',
                }
            }
        });

        console.log("Generation Success!");
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts?.[0]?.inlineData) {
            console.log("Got Image Response");
        } else {
            console.log("Got Response but no image inline data:", JSON.stringify(parts));
        }

    } catch (e: any) {
        console.error("Generation Failed:", e.message);
        if (e.response) {
            console.error("Response Details:", JSON.stringify(e.response, null, 2));
        }
    }
}

test();
