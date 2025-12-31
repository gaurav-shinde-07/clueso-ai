
import { db } from '../db.js';
import { ProductAI } from '../services/ai.service.js';
import { RagService } from '../services/rag.service.js';
import fs from 'fs';
import path from 'path';

export const RecordingController = {

    // GET /api/recordings
    getAll: (req, res) => {
        res.json(db.getAll());
    },

    // GET /api/recordings/:id
    getOne: (req, res) => {
        const r = db.get(req.params.id);
        if (!r) return res.status(404).json({ error: 'Not found' });
        res.json(r);
    },

    // POST /api/recordings
    upload: async (req, res) => {
        try {
            const file = req.file; // From multer
            const body = req.body; // Metadata & Events

            if (!file) return res.status(400).json({ error: 'No video file provided' });

            const metadata = JSON.parse(body.metadata || '{}');
            const events = JSON.parse(body.events || '[]');
            const screenshots = JSON.parse(body.screenshots || '[]');
            const userId = body.userId || 'anon';

            const id = `session_${Date.now()}`;

            // Construct User Facing Object
            // In a real app we upload to S3 here. For now we serve static file from backend.
            const videoUrl = `http://localhost:3001/uploads/${file.filename}`;

            const newRec = {
                id, userId,
                videoUrl,
                thumbnailUrl: screenshots[0] || 'https://placehold.co/600x400?text=Processing...',
                duration: metadata.duration,
                status: 'processing',
                audioStatus: 'extracting',
                createdAt: new Date().toISOString(),
                startTime: metadata.startTime,
                endTime: metadata.endTime,
                url: metadata.url,
                viewport: metadata.viewport,
                events,
                generatedGuide: null
            };
            db.save(newRec);

            // START ASYNC PIPELINE
            // We don't await this so the client gets a fast response
            RecordingController.runPipeline(id, file.path, events, metadata, screenshots)
                .catch(err => console.error("Pipeline Bg Error", err));

            res.json({ success: true, recordingId: id });

        } catch (e) {
            console.error(e);
            res.status(500).json({ error: e.message });
        }
    },

    // Background Pipeline
    runPipeline: async (id, videoPath, events, meta, screenshots) => {
        console.log(`[Pipeline] Starting for ${id}`);
        const rec = db.get(id);

        // 1. STT
        // Read file into buffer for Deepgram
        const videoBuffer = fs.readFileSync(videoPath);
        // NOTE: Deepgram usually wants audio. Sending video works for many formats, or use ffmpeg to extract audio.
        // Deepgram supports mp4/webm.

        const transcript = await ProductAI.transcribeAudio(videoBuffer, 'video/mp4'); // Assuming mp4/webm
        console.log(`[Pipeline] Transcript length: ${transcript.length}`);

        // 2. AI Guide
        db.save({ ...rec, audioStatus: 'cleaning', originalTranscript: transcript });
        const guide = await ProductAI.processVideoToGuide(events, meta.duration, transcript, meta.viewport);
        console.log(`[Pipeline] Guide Generated: ${guide.steps.length} steps`);

        // 3. Asset Mapping (Screenshots)
        db.save({ ...rec, audioStatus: 'synthesizing' });

        // We assume frontend extracted screenshots and passed them in `screenshots` array
        // But guide steps need to mapped to them. 
        // Simplified: If frontend sent screenshots, use them by index or timestamp match?
        // Frontend sent raw screenshots array. Guide generation might change step count.
        // For MVP, if we reuse the indices, great. If not, we fallback.
        // Ideally Backend should extract exact timestamps.
        // Since we don't have backend ffmpeg extraction in this file yet, rely on passed screenshots or placehold.

        guide.steps.forEach((step, i) => {
            // If we have a screenshot at relative index
            step.screenshotUrl = screenshots[i] || `https://placehold.co/600x400?text=Step+${i + 1}`;
        });

        // 4. TTS
        // We need to save TTS files to disk to serve them.
        // 4. TTS with Parallel Execution
        const ttsPromises = guide.steps.map(async (step, index) => {
            if (step.audio.narrationText) {
                try {
                    console.log(`[Pipeline] Generating TTS for Step ${step.stepIndex}...`);
                    const audioBuffer = await ProductAI.generateSpeech(step.audio.narrationText);
                    if (audioBuffer) {
                        const fileName = `audio_${id}_${step.stepIndex}.mp3`;
                        // Fix: CWD is apps/backend. So we just need 'uploads'
                        const absPath = path.join(process.cwd(), 'uploads', fileName);
                        fs.writeFileSync(absPath, Buffer.from(audioBuffer));
                        step.audio.audioUrl = `http://localhost:3001/uploads/${fileName}`;
                    }
                } catch (e) {
                    console.error(`[Pipeline] TTS Failed for step ${step.stepIndex}`, e);
                }
            }
        });

        await Promise.all(ttsPromises);
        console.log(`[Pipeline] All TTS Audio Generated`);

        // 5. Save Final
        db.save({
            ...rec,
            status: 'completed',
            audioStatus: 'completed',
            generatedGuide: guide
        });

        // 6. RAG Ingestion (Async)
        try {
            await RagService.addGuideToKnowledgeBase(id, guide);
        } catch (ragErr) {
            console.error(`[Pipeline] RAG Ingestion failed for ${id}`, ragErr);
        }

        
    }
};
