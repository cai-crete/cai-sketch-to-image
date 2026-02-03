import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyBFApZ9A4kLnfnkkhM9HP0h8NfSTuKaEHI";
const ai = new GoogleGenAI({ apiKey });

const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';

// 1x1 Red Pixel Base64 PNG
const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function test() {
    console.log("--- Testing Image Generation with Image Input + 2K + 4:3 ---");
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
                    imageSize: '2K' as any,
                    aspectRatio: '4:3',
                }
            }
        });

        console.log("Generation Success!");

    } catch (e: any) {
        console.error("Generation Failed:", e.message);
        if (e.response) {
            // console.error("Response:", JSON.stringify(e.response, null, 2));
        }
    }
}

test();
