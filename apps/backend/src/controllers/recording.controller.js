import { db } from "../db.js";
import { ProductAI } from "../services/ai.service.js";
import { RagService } from "../services/rag.service.js";
import fs from "fs";
import path from "path";

export const RecordingController = {
    // GET /api/recordings
    getAll: (req, res) => {
        res.json(db.getAll());
    },

    // GET /api/recordings/:id
    getOne: (req, res) => {
        const r = db.get(req.params.id);
        if (!r) return res.status(404).json({ error: "Not found" });
        res.json(r);
    },

    // POST /api/recordings
    upload: async (req, res) => {
        try {
            const file = req.file;
            const body = req.body;

            if (!file) {
                return res.status(400).json({ error: "No video file provided" });
            }

            const metadata = JSON.parse(body.metadata || "{}");
            const events = JSON.parse(body.events || "[]");
            const screenshots = JSON.parse(body.screenshots || "[]");
            const userId = body.userId || "anon";

            const id = `session_${Date.now()}`;

            const videoUrl = `http://localhost:3001/uploads/${file.filename}`;

            const newRec = {
                id,
                userId,
                videoUrl,
                thumbnailUrl:
                    screenshots[0] ||
                    "https://placehold.co/600x400?text=Processing...",
                duration: metadata.duration,
                status: "processing",
                audioStatus: "extracting",
                createdAt: new Date().toISOString(),
                startTime: metadata.startTime,
                endTime: metadata.endTime,
                url: metadata.url,
                viewport: metadata.viewport,
                events,
                generatedGuide: null
            };

            db.save(newRec);

            // 🔥 START ASYNC PIPELINE (NON-BLOCKING)
            RecordingController.runPipeline(
                id,
                file.path,
                file.mimetype, // ✅ REAL MIME TYPE
                events,
                metadata,
                screenshots
            ).catch((err) => console.error("[Pipeline Bg Error]", err));

            res.json({ success: true, recordingId: id });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: e.message });
        }
    },

    // Background Pipeline
    runPipeline: async (
        id,
        videoPath,
        mimeType,
        events,
        meta,
        screenshots
    ) => {
        console.log(`[Pipeline] Starting for ${id}`);

        const rec = db.get(id);

        // 1. Read file
        const videoBuffer = fs.readFileSync(videoPath);

        console.log(
            `[Pipeline] File read | MIME: ${mimeType} | Size: ${videoBuffer.length}`
        );

        // Normalize MIME (extra safety)
        const safeMimeType = mimeType.includes("webm")
            ? "video/webm"
            : mimeType.includes("mp4")
            ? "video/mp4"
            : "audio/webm";

        // 2. STT
        const transcript = await ProductAI.transcribeAudio(
            videoBuffer,
            safeMimeType
        );

        console.log(`[Pipeline] Transcript length: ${transcript.length}`);

        db.save({
            ...rec,
            audioStatus: "cleaning",
            originalTranscript: transcript
        });

        // 3. AI Guide Generation
        const guide = await ProductAI.processVideoToGuide(
            events,
            meta.duration,
            transcript,
            meta.viewport
        );

        console.log(
            `[Pipeline] Guide Generated: ${guide.steps.length} steps`
        );

        db.save({ ...rec, audioStatus: "synthesizing" });

        // 4. Screenshot Mapping
        guide.steps.forEach((step, i) => {
            step.screenshotUrl =
                screenshots[i] ||
                `https://placehold.co/600x400?text=Step+${i + 1}`;
        });

        // 5. TTS Generation (Parallel)
        await Promise.all(
            guide.steps.map(async (step) => {
                if (!step.audio?.narrationText) return;

                try {
                    console.log(
                        `[Pipeline] Generating TTS for Step ${step.stepIndex}`
                    );

                    const audioBuffer = await ProductAI.generateSpeech(
                        step.audio.narrationText
                    );

                    if (!audioBuffer) return;

                    const fileName = `audio_${id}_${step.stepIndex}.mp3`;
                    const absPath = path.join(
                        process.cwd(),
                        "uploads",
                        fileName
                    );

                    fs.writeFileSync(absPath, Buffer.from(audioBuffer));
                    step.audio.audioUrl = `http://localhost:3001/uploads/${fileName}`;
                } catch (e) {
                    console.error(
                        `[Pipeline] TTS Failed for step ${step.stepIndex}`,
                        e
                    );
                }
            })
        );

        console.log("[Pipeline] All TTS audio generated");

        // 6. Save Final Output
        db.save({
            ...rec,
            status: "completed",
            audioStatus: "completed",
            generatedGuide: guide
        });

        // 7. RAG Ingestion (Non-blocking)
        try {
            await RagService.addGuideToKnowledgeBase(id, guide);
        } catch (ragErr) {
            console.error(
                `[Pipeline] RAG ingestion failed for ${id}`,
                ragErr
            );
        }

        console.log(`[Pipeline] Completed for ${id}`);
    }
};
