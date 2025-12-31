import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';
import { db } from '../db.js';

ffmpeg.setFfmpegPath(ffmpegPath.path);

export const VideoService = {

    /**
     * Generates a new video file with AI narration overlaid.
     * @param {string} recordingId 
     * @returns {Promise<string>} Absolute path to the generated video file
     */
    async generateAiVoicedVideo(recordingId) {
        return new Promise((resolve, reject) => {
            const rec = db.get(recordingId);
            if (!rec || !rec.generatedGuide) {
                return reject(new Error('Recording or Guide not found'));
            }

            // 1. Locate Source Video
            // Extract filename from URL: http://localhost:3001/uploads/filename.mp4
            const videoFilename = rec.videoUrl.split('/').pop();
            const videoPath = path.join(process.cwd(), 'uploads', videoFilename);

            if (!fs.existsSync(videoPath)) {
                return reject(new Error(`Source video not found: ${videoPath}`));
            }

            // 2. Locate Audio Files & Prepare Inputs
            const audioInputs = [];
            const steps = rec.generatedGuide.steps;

            steps.forEach(step => {
                if (step.audio?.audioUrl) {
                    const audioFilename = step.audio.audioUrl.split('/').pop();
                    const audioPath = path.join(process.cwd(), 'uploads', audioFilename);

                    if (fs.existsSync(audioPath)) {
                        audioInputs.push({
                            path: audioPath,
                            startMs: step.timestamp.startMs
                        });
                    }
                }
            });

            if (audioInputs.length === 0) {
                return reject(new Error('No AI audio files found for this recording'));
            }

            // 3. Build FFmpeg Command
            const outputPath = path.join(process.cwd(), 'uploads', `ai_voiced_${videoFilename}`);

            // If cached, return immediately? (Optional, maybe later)
            // For now, overwrite.

            const command = ffmpeg(videoPath);

            // Add all audio inputs
            audioInputs.forEach(input => {
                command.input(input.path);
            });

            // Complex Filter
            // We want to delay each audio input by its start timestamp
            // And then mix them all together.
            // We do NOT include the original audio (user wanted AI voice).

            const filterComplex = [];
            const mixInputs = [];

            audioInputs.forEach((input, index) => {
                // Input 0 is video. Input 1..N are audios.
                const inputIndex = index + 1;
                const delay = input.startMs; // ms

                // adelay syntax: delays in ms. "delay|delay" for stereo.
                filterComplex.push(`[${inputIndex}:a]adelay=${delay}|${delay}[a${inputIndex}]`);
                mixInputs.push(`[a${inputIndex}]`);
            });

            // Mix all delayed audios
            // amix inputs=N. duration=first (video matches roughly). dropout_transition=0
            filterComplex.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest[outa]`);

            command
                .complexFilter(filterComplex)
                .outputOptions([
                    '-map 0:v',      // Map original video
                    '-map [outa]',   // Map mixed audio
                    '-c:v copy',     // Copy video stream (fast, no re-encode)
                    '-c:a aac'       // Encode audio
                ])
                .save(outputPath)
                .on('end', () => {
                    console.log(`[VideoService] Generated: ${outputPath}`);
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('[VideoService] FFmpeg Error:', err);
                    reject(err);
                });
        });
    }
};
