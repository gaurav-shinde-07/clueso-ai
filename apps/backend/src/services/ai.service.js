
import { DeepgramService } from './deepgram.service.js';
import { GeminiService } from './gemini.service.js';
import { MockService } from './mock.service.js';

export const ProductAI = {

    /**
     * ORCHESTRATOR: Facade for the underlying services.
     */

    async transcribeAudio(audioBuffer, mimeType) {
        return DeepgramService.transcribeAudio(audioBuffer, mimeType);
    },

    async generateSpeech(text, voiceId) {
        return DeepgramService.generateSpeech(text, voiceId);
    },

    async processVideoToGuide(events, videoDuration, rawTranscript, viewport) {
        console.log('[ProductAI] Orchestrating Guide Generation...');

        // 1. Try Gemini Real AI
        const aiGuide = await GeminiService.generateGuide(events, videoDuration, rawTranscript, viewport);

        if (aiGuide) {
            console.log('[ProductAI] Gemini Success.');
            return aiGuide;
        }

        // 2. Fallback to Mock
        console.warn('[ProductAI] Gemini Failed or No Key. Falling back to Mock.');
        return MockService.generateMockGuide(events, videoDuration);
    }
};
