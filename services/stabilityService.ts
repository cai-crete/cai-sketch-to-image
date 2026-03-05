// services/stabilityService.ts

const STABILITY_API_KEY = import.meta.env.VITE_STABILITY_API_KEY;
// Switching to Conservative engine to preserve forms exactly without hallucination
const API_URL = 'https://api.stability.ai/v2beta/stable-image/upscale/conservative';

export const upscaleImage = async (imageBlob: Blob): Promise<Blob> => {
    if (!STABILITY_API_KEY) {
        console.warn("VITE_STABILITY_API_KEY is not set. Falling back to local resize for High Quality.");
        return Promise.reject(new Error("Missing API Key"));
    }

    try {
        console.log("Submitting to Stability Conservative Upscaler...");
        const formData = new FormData();
        formData.append('image', imageBlob);
        formData.append('prompt', 'very clean, crisp, sharp, detailed'); // Conservative still accepts a prompt to guide noise reduction
        formData.append('output_format', 'png');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${STABILITY_API_KEY}`,
                Accept: 'image/*', // Conservative returns the image directly, not JSON
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Stability API Submit Error: ${response.status} - ${errorText}`);
        }

        // The response directly contains the upscaled image bytes
        return await response.blob();

    } catch (error) {
        console.error("Conservative Upscale pipeline failed:", error);
        throw error;
    }
};
