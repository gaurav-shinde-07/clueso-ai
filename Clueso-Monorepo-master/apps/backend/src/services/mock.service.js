
export const MockService = {
    /**
     * Generates a fallback guide when AI is unavailable.
     * @param {Array} events - List of recorded events
     * @param {number} videoDuration - Total duration in seconds
     * @returns {Object} - The Guide JSON
     */
    generateMockGuide(events, videoDuration) {
        if (!events || events.length === 0) return {
            videoMeta: { durationMs: videoDuration * 1000, resolution: { width: 1920, height: 1080 }, frameRate: 30 },
            steps: [], timelineIndex: [], processedAt: new Date().toISOString()
        };

        const eventSteps = events.filter(e => e.type === 'click' || e.type === 'navigation').map((e, i) => {
            const startMs = e.timestamp;
            const nextTimestamp = events[i + 1]?.timestamp || (videoDuration * 1000);
            const nominalEnd = Math.min(nextTimestamp, startMs + 5000);
            const endMs = startMs < nextTimestamp ? nominalEnd : nextTimestamp;

            return {
                stepIndex: i + 2, // Start from 2
                eventType: e.type,
                title: `Action: ${e.type}`,
                instruction: `${e.type === 'navigation' ? 'Navigate to' : 'Click on'} Item`,
                timestamp: { startMs, endMs },
                audio: {
                    chunkId: `audio_${i}`,
                    rawTranscript: "Mock transcript segment.",
                    narrationText: `Next, perform action ${i + 1}.`
                },
                coordinates: { x: 0, y: 0, width: 0, height: 0 },
                zoom: null
            };
        });

        const introStep = {
            stepIndex: 1,
            eventType: 'navigation',
            title: 'Introduction',
            instruction: 'Navigate to the starting URL.',
            timestamp: { startMs: 0, endMs: events[0]?.timestamp || 2000 },
            audio: {
                chunkId: 'audio_intro',
                rawTranscript: "",
                narrationText: "In this guide, we will walk through the recorded workflow. First, navigate to the application."
            },
            coordinates: { x: 0, y: 0, width: 0, height: 0 },
            zoom: null
        };

        const steps = [introStep, ...eventSteps];

        return {
            videoMeta: { durationMs: videoDuration * 1000, resolution: { width: 1920, height: 1080 }, frameRate: 30 },
            steps: steps,
            timelineIndex: [],
            processedAt: new Date().toISOString()
        };
    }
};
