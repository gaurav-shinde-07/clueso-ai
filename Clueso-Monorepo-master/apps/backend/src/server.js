
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { recordingRoutes } from './routes/recording.routes.js';
import { ragRoutes } from './routes/rag.routes.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from apps/backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('[Server] CWD:', process.cwd());
console.log('[Server] Env Loading...');

const app = express();
const PORT = process.env.PORT || 3001;
const LOG_FILE = path.join(__dirname, 'all_logs.txt');

// DEBUG: Verify Env Loaded
const hasGemini = !!process.env.GEMINI_API_KEY;
const hasDeepgram = !!process.env.DEEPGRAM_API_KEY;
console.log(`[Config] Env Loaded? Gemini: ${hasGemini}, Deepgram: ${hasDeepgram}`);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Serve Uploads (Video & Audio)
// apps/backend/uploads is relative to CWD usually, but let's be safe
// Serve form root/apps/backend/uploads. 
// __dirname is .../apps/backend/src. So we go up one level.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- LOGGING ---
// Clear log file on start
// fs.writeFileSync(LOG_FILE, `--- SESSION STARTED ${new Date().toISOString()} ---\n`);

app.post('/log', (req, res) => {
    const { level, source, message, data, timestamp } = req.body;
    const dataStr = data ? `\nData: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}` : '';
    const fileLine = `[${timestamp}] [${source}] [${level}] ${message}${dataStr}\n----------------------------------\n`;
    fs.appendFile(LOG_FILE, fileLine, () => { });

    let color = '\x1b[37m';
    if (level === 'ERROR') color = '\x1b[31m';
    if (level === 'WARN') color = '\x1b[33m';
    if (level === 'INFO') color = '\x1b[36m';
    if (level === 'DEBUG') color = '\x1b[90m';
    const sourceTag = `\x1b[1m\x1b[35m[${source}]\x1b[0m`;
    console.log(`${sourceTag} ${color}[${level}] ${message}\x1b[0m`);
    res.sendStatus(200);
});

// --- API ROUTES ---
app.use('/api/recordings', recordingRoutes);
app.use('/api/rag', ragRoutes);

app.listen(PORT, () => {
    console.log(`\n> Backend Server running on http://localhost:${PORT}`);
    console.log(`> Serving uploads at http://localhost:${PORT}/uploads`);
    console.log(`> Logging enabled\n`);
});
