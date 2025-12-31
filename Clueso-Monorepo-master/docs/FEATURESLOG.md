# Features Log

> This document tracks the detailed implementation of features, including technical explanations, code locations, and behavior.


## [2025-12-20] Grounded Instruction Generation (v0.1.4)

### 1. Overview
Instead of the AI generating instructions purely from transcripts, it now retrieves the most relevant steps, timestamps, and UI events from the actual recording and then generates explanations **grounded in that data**. This makes step descriptions more accurate, avoids hallucinations, and sets up the foundation for features like semantic step search and in-video Q&A.

### 2. Why Grounded Generation? (The Problem vs. Solution)
*   **The Problem**: Generating instructions solely from audio transcripts can lead to "hallucinations" where the AI invents steps that didn't happen, or misses silent but critical UI interactions (like clicking a generic "Submit" button).
*   **The Solution**: By grounding the generation in the actual *Event Log* (clicks, navigation, inputs) captured by the extension, the AI creates a factual execution plan. It "sees" what you did, not just hears what you said.

### 3. Technical Implementation
*   **Data Fusion**: The `GeminiService` constructs a context that combines the `rawTranscript`, `videoDuration`, and a structured `DOM Events Log`.
*   **Strict Prompting**: The system prompt now explicitly instructs the AI to "Create a step for every meaningful DOM event" and ensures that `startMs` and `endMs` align with the actual event timestamps.
*   **Result**: A generated guide that is a 1:1 map of the user's physical actions on screen.

### 4. Strategic Benefit: Automated Diagrams
Because we now capture discrete, deterministic events (e.g., `Input 'Search'` -> `Enter` -> `Click 'Result'`), we have the exact data structures needed to generate **Mermaid.js Flowcharts** and **Sequence Diagrams** automatically. 
Unlike transcript-only generation which produces "fuzzy" narratives, Grounded Generation produces a directed graph of user actions, allowing us to visualize complex workflows with 100% accuracy.

> **Deep Dive**: For a detailed breakdown of the Old vs. New architecture with diagrams, see [../UPDATES.md](../UPDATES.md).

---

## [2025-12-18] RAG Knowledge Base (v0.1.3)

### 1. Overview
We have transformed Clueso from a simple "Guide Generator" into an intelligent **"Knowledge Base"**. 
By implementing **Retrieval-Augmented Generation (RAG)**, the system now possesses "Long-Term Memory". It stores not just the video, but the *meaning* of every guide you create. Users can ask questions like "How do I invite a user?" and the system will search its memory of past guides to provide an accurate, step-by-step answer.

### 2. Why RAG? (The Problem vs. Solution)
*   **The Problem**: Traditional documentation is static. Finding the right guide requires scrolling through lists or hoping keywords match.
*   **The Solution**: RAG allows "Semantic Search". You can ask vague questions, and the AI finds the *concept* (even if keywords don't match exactly) and synthesizes an answer.

### 3. Architecture & Data Flow

**The Pipeline:**
1.  **Ingestion (Write)**: `Recording Finished` -> `Generate Guide` -> `Vectorize (Embed)` -> `Save to Vector Store`.
2.  **Retrieval (Read)**: `User Query` -> `Vectorize Query` -> `Compare with Store (Cosine Similarity)` -> `Retrieve Top k Guides`.
3.  **Generation (Answer)**: `Top Guides + User Query` -> `LLM (Gemini)` -> `Final Answer`.

### 4. Step-by-Step Implementation

#### **Step 1: The Vector Store (`rag.service.js`)**
We created a dedicated service to handle the "Brain" of the operation.
*   **Model**: We use `text-embedding-004` (optimized for vector math) to turn text into numbers.
*   **Storage**: For this MVP, we use a local `knowledge_base.json` as our vector database.

**Key Code (Ingestion):**
```javascript
// apps/backend/src/services/rag.service.js

async addGuideToKnowledgeBase(guideId, guideContent) {
    // 1. Create a "Summary" string of the guide
    const textToEmbed = `Title: ${guideContent.title} \n Steps: ${guideContent.steps.map(s => s.instruction)}`;
    
    // 2. Convert to Vector (Embedding)
    const result = await model.embedContent(textToEmbed);
    const vector = result.embedding.values; // e.g., [0.12, -0.98, 0.44, ...]

    // 3. Save to JSON Store
    db.push({ guideId, vector, textToEmbed });
    saveDb(db);
}
```

#### **Step 2: Connecting the Pipeline (`recording.controller.js`)**
We hooked this service into the main processing pipeline. Now, the moment a video is processed, it's virtually "read" by the AI.

**Key Code:**
```javascript
// apps/backend/src/controllers/recording.controller.js

// ... after Guide Generation & TTS ...
db.save({ ...rec, status: 'completed' });

// NEW: Automatically ingest into RAG System
try {
    await RagService.addGuideToKnowledgeBase(id, guide);
    console.log(`[Pipeline] Guide ${id} indexed in Knowledge Base.`);
} catch (e) {
    console.error("Indexing failed", e);
}
```

#### **Step 3: The Search Algorithm (Cosine Similarity)**
To find the right guide, we don't just match words. We measure the "angle" between the User's Question Vector and every Guide Vector. A smaller angle means they are semantically similar.

**Key Code (Retrieval):**
```javascript
// apps/backend/src/services/rag.service.js

async search(userQuery) {
    const queryVector = await getEmbedding(userQuery);
    
    // Compare against all stored guides
    const matches = db.map(guide => ({
        ...guide,
        score: cosineSimilarity(queryVector, guide.vector) // Returns 0.0 to 1.0
    }));

    // Return top 3 most relevant
    return matches.sort((a,b) => b.score - a.score).slice(0, 3);
}
```

#### **Step 4: The API Endpoint (`rag.routes.js`)**
We exposed this logic via a simple API so the frontend (or other tools) can ask questions.

**Usage:**
```http
POST /api/rag/ask
Content-Type: application/json

{
    "query": "How do I reset my password?"
}
```

**Response:**
```json
{
    "answer": "To reset your password, navigate to the Settings page and click on the 'Security' tab. Then, select various...",
    "sources": ["session_173450000"]
}
```

---

## [2025-12-17] Enhanced Video Player (v0.1.2)

### 1. Overview
We have upgraded the video player in the dashboard to a "Professional" grade UI. It now includes independently controllable volume, a visual timeline track with step markers ("clips"), and a sleek gradient-based overlay for controls.

### 2. Functional Changes
-   **Fine-Grained Volume Control**: Users can now adjust the volume using a slider. This controls both the original video audio and the AI-generated voiceover simultaneously.
-   **Step-Track Timeline**: Instead of a simple progress bar, the timeline now visually represents "steps" as distinct clips. 
-   **Hover Previews**: Hovering over a specific "clip" on the timeline reveals the Step Number and its Instruction.
-   **Interactive UI**: Controls now appear on hover with smooth fade-in animations.

### 3. Technical Implementation Details

#### **Code Location**
-   **File**: `apps/frontend/src/features/recordings/RecordingDetail.tsx`
-   **Component**: `RecordingDetail` function.

#### **Key Logic Breakdown**

**A. Volume Synchronization**
We introduced a `volume` state (0.0 to 1.0) and a side-effect to sync it across two media sources:
1.  **Video Element** (`videoRef.current`): The recorded `.webm` screen capture.
2.  **Audio Element** (`currentAiAudioRef.current`): The AI Text-to-Speech audio track.

```typescript
// State definition
const [volume, setVolume] = useState(1.0);

// Synchronization Effect
useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
    if (currentAiAudioRef.current) currentAiAudioRef.current.volume = volume;
}, [volume]);
```

**B. Timeline "Clips" Calculation**
We strictly use `rec.duration` (server-provided metadata) for stability instead of relying solely on DOM `duration` events which can be flaky during load.

-   **Start Position**: `(step.startMs / totalDuration) * 100` (%)
-   **Clip Width**: `((step.endMs - step.startMs) / totalDuration) * 100` (%)

```typescript
{guide?.steps.map((step) => {
    const duration = rec.duration * 1000; // Convert to ms
    const startP = (step.timestamp.startMs / duration) * 100;
    const widthP = ((step.timestamp.endMs - step.timestamp.startMs) / duration) * 100;
    
    // Renders a div positioned absolutely on the timeline track
    return <div style={{ left: `${startP}%`, width: `${widthP}%` }} ... />
})}
```

**C. UI Styling (Tailwind)**
-   Used `group/timeline` and `group/volume` patterns to handle nested hover states (e.g., expanding the volume slider only when hovering the speaker icon).
-   Implemented `backdrop-blur` and `bg-gradient-to-t` for the control overlay to ensure text legibility against any video background.

---

## [2025-12-16] Core Features (MVP)

### Chrome Extension Recorder
-   **Function**: Captures screen video (`.webm`) and DOM events simultaneously.
-   **Code**: `apps/extension/src/background.ts` (MediaRecorder) and `content.js` (Event Listeners).

### Intelligent Processing Pipeline
-   **Stitching**: Backend receives chunks of video and JSON events.
-   **Gemini Flash**: Fuses click logs + transcripts to deduce "User Intent".
-   **Deepgram**: Handles fast STT (Speech-to-Text) and TTS (Text-to-Speech).

### Web Dashboard
-   **Sync Engine**: The sidebar automatically scrolls to the active step based on `video.currentTime`.
-   **Code**: `apps/frontend/src/features/recordings/RecordingDetail.tsx` (Logic for `useScroll` and `timeupdate` listeners).
