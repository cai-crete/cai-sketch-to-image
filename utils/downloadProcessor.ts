import { ImageResolution } from '../types';
import { upscaleImage } from '../services/stabilityService';

export type AspectRatio = '16:9' | '4:3' | '1:1';

export const RESOLUTION_MAP: Record<AspectRatio, Record<ImageResolution, { width: number; height: number }>> = {
    '16:9': {
        [ImageResolution.Normal]: { width: 2752, height: 1536 },
        [ImageResolution.High]: { width: 5504, height: 3072 },
    },
    '4:3': {
        [ImageResolution.Normal]: { width: 2400, height: 1792 },
        [ImageResolution.High]: { width: 4800, height: 3584 },
    },
    '1:1': {
        [ImageResolution.Normal]: { width: 2048, height: 2048 },
        [ImageResolution.High]: { width: 4096, height: 4096 },
    }
};

export const processAndDownloadImage = async (
    base64Original: string,
    ratio: string,
    quality: ImageResolution,
    filename: string = "CRETE_Blueprint"
) => {
    // Validate Aspect Ratio fallback to 16:9
    const validRatio = (['16:9', '4:3', '1:1'].includes(ratio) ? ratio : '16:9') as AspectRatio;
    const targetSize = RESOLUTION_MAP[validRatio][quality];

    return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetSize.width;
            canvas.height = targetSize.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                // If High quality, upscale the image via Stability API first
                if (quality === ImageResolution.High) {
                    try {
                        console.log("Upscaling image using Stability API...");

                        // 1. Ensure image is under 1,048,576 pixels for Stability API
                        const maxPixels = 1048000; // slightly under 1,048,576 for safety
                        let apiWidth = img.width;
                        let apiHeight = img.height;

                        if (apiWidth * apiHeight > maxPixels) {
                            const scaleInfo = Math.sqrt(maxPixels / (apiWidth * apiHeight));
                            apiWidth = Math.floor(apiWidth * scaleInfo);
                            apiHeight = Math.floor(apiHeight * scaleInfo);
                            console.log(`Original: ${img.width}x${img.height}, Downscaling for API to: ${apiWidth}x${apiHeight}`);
                        }

                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = apiWidth;
                        tempCanvas.height = apiHeight;
                        const tempCtx = tempCanvas.getContext('2d');
                        if (!tempCtx) throw new Error("Could not create temp canvas for API submission");

                        // Draw resized image
                        tempCtx.drawImage(img, 0, 0, apiWidth, apiHeight);

                        // Convert to Blob
                        const initialBlob = await new Promise<Blob>((res, rej) => {
                            tempCanvas.toBlob((b) => b ? res(b) : rej(new Error("Blob conversion failed")), 'image/png', 1.0);
                        });

                        // 2. Call Stability API
                        const upscaleBlob = await upscaleImage(initialBlob);

                        // 3. Create object URL and trigger download immediately (Stability handles resolution natively)
                        const objectUrl = URL.createObjectURL(upscaleBlob);
                        const a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = `${filename}_${validRatio.replace(':', 'by')}_${quality}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(objectUrl);
                        resolve();
                        return;
                    } catch (error) {
                        console.error("Upscale failed, falling back to local object-fit stretch:", error);
                        // Fallback to local stretch if upscale fails
                    }
                }

                // Local resize and crop logic (always used for Normal, and a fallback for High)
                // Determine scaling factor to cover the target box completely (object-fit: cover)
                const scale = Math.max(targetSize.width / img.width, targetSize.height / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;

                // Calculate offset to center the crop
                const offsetX = (targetSize.width - scaledWidth) / 2;
                const offsetY = (targetSize.height - scaledHeight) / 2;

                // Draw image scaled to cover the exact template dimensions
                ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

                // Convert to blob and download
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png', 1.0); // High quality PNG
                a.download = `${filename}_${validRatio.replace(':', 'by')}_${quality}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                resolve();
            } else {
                reject(new Error("Failed to initialize canvas context"));
            }
        };

        img.onerror = () => {
            reject(new Error("Failed to load generated image for resizing"));
        };

        img.src = base64Original;
    });
};
