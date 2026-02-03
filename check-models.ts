import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!apiKey) {
    console.error("API Key not found in environment");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Fetching available models...");
        // Note: The GoogleGenAI SDK structure might differ slightly for listing models depending on version 
        // trying standard v1beta approach if possible or using raw fetch if SDK doesn't expose it easily in this version.
        // Actually, the node SDK usually has `getGenerativeModel` but listing might be on the referenced `GoogleAIFileManager` or similar, 
        // OR we can just try to generate with common names to see what fails?
        // Let's try to just hit the list endpoint directly if SDK is obscure, but for now let's try to assume common names.

        // Wait, the new @google/genai SDK (v0.x) has specific methods.
        // Let's rely on the error message suggestion: "Call ListModels".

        // Since I effectively want to check if gemini-2.0-pro-exp exists:
        const modelsToCheck = [
            'gemini-2.5-flash-image'
        ];

        for (const modelName of modelsToCheck) {
            try {
                const model = ai.models.generateContent({
                    model: modelName,
                    contents: { parts: [{ text: "ping" }] }
                });
                console.log(`Checking ${modelName}...`);
                await model;
                console.log(`✅ ${modelName} is AVAILABLE`);
            } catch (e: any) {
                if (e.message && e.message.includes("not found")) {
                    console.log(`❌ ${modelName} NOT FOUND`);
                } else {
                    console.log(`⚠️ ${modelName} Error (but might exist):`, e.message);
                }
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
