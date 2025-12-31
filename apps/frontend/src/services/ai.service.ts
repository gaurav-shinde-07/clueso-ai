
// Only contains Frontend specific logic (Screenshots using DOM)
export const ProductAI = {
    // SCREENSHOTS: Extract frames from video blob
    async extractScreenshots(videoBlob: Blob, timestampsMs: number[]): Promise<string[]> {
        console.log(`[ProductAI] Extracting ${timestampsMs.length} screenshots...`);

        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const results: string[] = new Array(timestampsMs.length).fill('');

            let currentIndex = 0;

            const processNext = () => {
                if (currentIndex >= timestampsMs.length) {
                    cleanup();
                    resolve(results);
                    return;
                }

                const ts = timestampsMs[currentIndex] / 1000; // convert to seconds
                // Clamp timestamp
                let seekTime = ts;
                if (!isFinite(seekTime) || seekTime < 0) seekTime = 0;
                if (video.duration && seekTime > video.duration) seekTime = video.duration - 0.1;

                video.currentTime = seekTime;
            };

            const capture = () => {
                if (!ctx) return;
                try {
                    // Resize canvas to match video (max 1280px width for performance)
                    const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
                    canvas.width = (video.videoWidth || 1280) * scale;
                    canvas.height = (video.videoHeight || 720) * scale;

                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    results[currentIndex] = canvas.toDataURL('image/jpeg', 0.7);
                } catch (e) {
                    console.error("Frame capture error", e);
                }
                currentIndex++;
                processNext();
            };

            const cleanup = () => {
                if (video.src) URL.revokeObjectURL(video.src);
                video.remove();
                canvas.remove();
            };

            video.onseeked = () => {
                capture();
            };

            video.onloadedmetadata = () => {
                processNext();
            };

            video.onerror = () => {
                console.error("Video load error during screenshot extraction");
                cleanup();
                resolve(results);
            };

            video.src = URL.createObjectURL(videoBlob);
        });
    }
};
