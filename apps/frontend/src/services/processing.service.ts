
import { Recording, UserEvent, UploadResponse } from '../types';
import { ProductAI } from './ai.service';
import { logger, LogLevel, LogSource } from '../lib/logger';

const API_URL = 'http://localhost:3001/api/recordings';

export const NodeLayer = {

  // POLL for Updates
  // Since we don't have WebSockets in this lightweight MVP setup yet
  subscribe(cb: (r: Recording[]) => void) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(API_URL);
        if (res.ok) {
          const data = await res.json();
          cb(data);
        }
      } catch (e) {/* ignore poll errors */ }
    }, 2000);

    // Initial Fetch
    this.getRecordings().then(cb);

    return () => clearInterval(interval);
  },

  async getRecordings(): Promise<Recording[]> {
    const res = await fetch(API_URL);
    return res.json();
  },

  async getRecordingById(id: string): Promise<Recording | undefined> {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) return undefined;
    return res.json();
  },

  // --- UPLOAD ---
  async uploadRecording(
    videoBlob: Blob,
    events: UserEvent[],
    metadata: { duration: number, startTime: number, endTime: number, url: string, viewport: { width: number, height: number } },
    userId: string
  ): Promise<UploadResponse> {
    logger.log(LogLevel.INFO, LogSource.BACKEND, `Uploading Recording to Backend`, { userId, duration: metadata.duration });

    // 1. Pre-Process: Extract Screenshots Client-Side (Since we use Canvas)
    // We try to pick sensible timestamps for screenshots based on events or duration
    // For MVP transparency, let's grab 10 evenly spaced screenshots or use event timestamps?
    // Using event timestamps matches our logic best.
    const timestamps = events.filter(e => e.type === 'click' || e.type === 'navigation').map(e => e.timestamp);
    // If no events, grab every 2s
    if (timestamps.length === 0) {
      for (let i = 0; i < metadata.duration; i += 2) timestamps.push(i * 1000);
    }

    // Safety cap
    if (timestamps.length > 20) timestamps.length = 20;

    let screenshots: string[] = [];
    try {
      screenshots = await ProductAI.extractScreenshots(videoBlob, timestamps);
    } catch (e) {
      logger.log(LogLevel.WARN, LogSource.APP, 'Screenshot Extraction Failed', { error: e });
    }

    // 2. Prepare Form Data
    const formData = new FormData();
    formData.append('video', videoBlob, 'recording.webm');
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('events', JSON.stringify(events));
    formData.append('screenshots', JSON.stringify(screenshots));
    formData.append('userId', userId);

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upload Failed: ${err}`);
    }

    const data = await res.json();
    return data;
  },

  async updateRecordingVoice(id: string, voiceId: string) {
    // TODO: Implement backend endpoint for this
  },

  async splitRecording(id: string) { return false; }
};
