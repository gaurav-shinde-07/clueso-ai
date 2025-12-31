
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

const getEnv = (key) => process.env[key];

export const GeminiService = {
  /**
   * MAIN AI: Events + Transcript -> Structured JSON Guide
   * @param {Array} events - DOM events
   * @param {number} videoDuration - In seconds
   * @param {string} rawTranscript - Full transcript
   * @param {Object} viewport - { width, height }
   * @returns {Promise<Object>} - The structured JSON Guide
   */
  async generateGuide(events, videoDuration, rawTranscript, viewport) {
    const apiKey = getEnv('GEMINI_API_KEY');
    if (!apiKey) {
      console.warn('[GeminiService] API Key Missing');
      return null; // Return null to signal fallback needed
    }

    // Prepare context
    const eventLog = events.map(e => {
      const t = (typeof e.target === 'string') ? e.target : (e.target?.text || e.target?.selector || 'element');
      if (e.type === 'input') {
        return `[${e.timestamp}ms] INPUT "${e.value}" into "${t}"`;
      }
      if (e.type === 'keydown_enter') {
        return `[${e.timestamp}ms] PRESSED ENTER on "${t}"`;
      }
      return `[${e.timestamp}ms] ${e.type} on "${t}"`;
    }).join('\n');

    console.log("\n--- [DEBUG] GROUNDED EVENT LOG (Sending to AI) ---");
    console.log(eventLog);
    console.log("--------------------------------------------------\n");

    const prompt = `
      You are an AI processing engine for a screen-recording product tutorial system.
      
      INPUTS:
      1. Video Metadata: Duration ${videoDuration}s, Resolution ${viewport.width}x${viewport.height}
      2. Raw Audio Transcript: "${rawTranscript}"
      3. DOM Events Log (The TRUTH of what happened):
      ${eventLog}

      CORE OBJECTIVE:
      Convert this into an event-driven instructional JSON.
      
      RULES for GROUNDED GENERATION:
      1. **Source of Truth**: The *DOM Events Log* is the primary source of truth for actions. The Transcript is context.
      2. **No Hallucinations**: Do NOT invent steps that are not in the Events Log. If the user clicked "Submit", there MUST be a "click" or "enter" event.
      3. **Intro Step**: Step 1 MUST be an Intro. Deduce the goal from the transcript context.
      4. **Inputs**: If you see an 'INPUT' event, the instruction should be "Type [value] into [element]". 
      5. **Grouping**: If an 'INPUT' is immediately followed by 'PRESSED ENTER' or 'CLICK', you can combine them if it flows naturally (e.g. "Search for X" implies typing and entering), BUT purely discreet steps are safer.
      6. **Timestamps**: Uses 'startMs' and 'endMs' from the strictly corresponding events.

      OUTPUT: Return ONLY valid JSON matching this schema:
      {
        "videoMeta": { "durationMs": number, "resolution": { "width": number, "height": number }, "frameRate": 30 },
        "steps": [
          {
            "stepIndex": number,
            "eventType": "click" | "navigation" | "input" | "other",
            "title": string,
            "instruction": string,
            "timestamp": { "startMs": number, "endMs": number },
            "audio": { "chunkId": string, "rawTranscript": string, "narrationText": string },
            "element": { "tag": string, "text": string, "selector": string },
            "coordinates": { "x": number, "y": number, "width": number, "height": number }
          }
        ],
        "timelineIndex": [{ "stepIndex": number, "jumpToMs": number, "label": string }]
      }
    `;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

      let result;
      let lastError;
      const MAX_RETRIES = 3;
      const BASE_DELAY = 2000;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          result = await model.generateContent(prompt);
          break; // Success
        } catch (e) {
          lastError = e;
          const isOverloaded = e.message?.includes('503') || e.message?.includes('overloaded');

          if (attempt < MAX_RETRIES && isOverloaded) {
            const delay = BASE_DELAY * Math.pow(2, attempt);
            console.warn(`[GeminiService] Model overloaded (503). Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw e; // Non-retriable or max retries reached
          }
        }
      }
      const response = result.response;

      if (response.text()) {
        const guide = JSON.parse(response.text());
        guide.processedAt = new Date().toISOString();
        return guide;
      }
      throw new Error('Gemini response was empty');
    } catch (e) {
      console.error('[GeminiService] Generation Failed:', e);
      // Log error to file
      try {
        fs.appendFileSync(path.resolve('gemini_error.log'), `[${new Date().toISOString()}] ${e.toString()} \nStack: ${e.stack}\n\n`);
      } catch (fsErr) {
        console.error('Could not write to error log:', fsErr);
      }
      return null; // Signals fallback needed
    }
  }
};
