
import fetch from "node-fetch";

const getEnv = (key) => process.env[key];

export const DeepgramService = {
    /**
     * STT: Transcribe Video Audio using Deepgram Nova-2
     * @param {Buffer} audioBuffer - The raw audio buffer
     * @param {string} mimeType - The MIME type (e.g., 'audio/webm')
     * @returns {Promise<string>} - The transcript text
     */
    async transcribeAudio(audioBuffer, mimeType) {
        const apiKey = getEnv('DEEPGRAM_API_KEY');
        console.log(`[DeepgramService] Key Check: ${apiKey ? 'Found' : 'Missing'} (${apiKey ? apiKey.slice(0, 5) + '...' : ''})`);

        if (!apiKey) {
            console.warn('[DeepgramService] API Key Missing. Using Mock Transcript.');
            return "This is a simulated transcript because no Deepgram key was provided.";
        }

        try {
            const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
                method: 'POST',
                headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': mimeType },
                body: audioBuffer
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Deepgram STT failed: ${response.status} ${err}`);
            }

            const data = await response.json();
            return data.results?.channels[0]?.alternatives[0]?.transcript || "";
        } catch (error) {
            console.error('[DeepgramService] STT Error:', error);
            throw error;
        }
    },

    /**
     * TTS: Generate Audio for a Step using Deepgram Aura
     * @param {string} text - The text to speak
     * @param {string} voiceId - The voice model ID (default 'aura-asteria-en')
     * @returns {Promise<ArrayBuffer|null>} - The audio buffer or null on failure
     */
    async generateSpeech(text, voiceId = 'aura-asteria-en') {
        const apiKey = getEnv('DEEPGRAM_API_KEY');
        if (!apiKey) {
            console.warn('[DeepgramService] No API Key for TTS');
            return null;
        }

        try {
            const response = await fetch(`https://api.deepgram.com/v1/speak?model=${voiceId}`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`TTS failed: ${response.status} ${err}`);
            }
            return await response.arrayBuffer();
        } catch (e) {
            console.error('[DeepgramService] TTS Error:', e);
            return null;
        }
    }
};
