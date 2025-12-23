
// Simple image color extractor
export const analyzeImage = (file: File): Promise<{ colors: string[], originalUrl: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Resize for performance
                const MAX_SIZE = 100;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const imageData = ctx.getImageData(0, 0, width, height).data;
                const colorCounts: { [key: string]: number } = {};

                // Sample every 5th pixel
                for (let i = 0; i < imageData.length; i += 4 * 5) {
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];
                    const a = imageData[i + 3];

                    if (a < 128) continue; // Skip transparent

                    // Quantize (round to nearest 32 to group similar colors)
                    const qR = Math.round(r / 32) * 32;
                    const qG = Math.round(g / 32) * 32;
                    const qB = Math.round(b / 32) * 32;

                    const key = `${qR},${qG},${qB}`;
                    colorCounts[key] = (colorCounts[key] || 0) + 1;
                }

                // Sort by frequency
                const sortedColors = Object.entries(colorCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key]) => {
                        const [r, g, b] = key.split(',').map(Number);
                        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                    })
                    .slice(0, 5); // Take top 5

                // Fallback if not enough colors
                while (sortedColors.length < 3) {
                    sortedColors.push('#ffffff');
                }

                resolve({
                    colors: sortedColors,
                    originalUrl: event.target?.result as string
                });
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
