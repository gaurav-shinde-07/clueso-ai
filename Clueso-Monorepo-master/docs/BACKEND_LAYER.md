# Backend Documentation (Layer: The Concierge)

## Overview
The Backend is the central orchestration node. It manages the delicate "Fusion" process between raw binary data (Video/Audio) and structured logical data (Events).
It serves as the secure gateway to AI services and the persistent storage for the Knowledge Base.

## Key Responsibilities

### 1. Ingestion & Storage
*   **Technique**: Stream-based implementation using `multer`.
*   **Path**: `apps/backend/uploads/`.
*   **Safety**: Validates MIME types (`video/webm`, `audio/wav`) before processing starts to prevent malformed injections.

### 2. The AI Pipeline (`ai.service.js`)

#### Step A: Transcoding (Deepgram)
*   **Input**: Audio Buffer.
*   **Output**: Timestamped Transcript.
*   **Model**: `nova-2` (Optimized for technical terminology).

#### Step B: Grounded Generation (Gemini)
This is the core differentiator.
*   **Input 1**: **Event Log** (The rigid skeleton of actions).
*   **Input 2**: **Transcript** (The "flesh" or context).
*   **Prompt**:
    > "You are an Editor. Use the Event Log as the absolute source of truth for actions and timestamps. Use the Transcript only to generate natural language explanations for those actions."
*   **Output**: A JSON object strictly adhering to the `Guide` schema.

### 3. The Knowledge Engine (RAG) (`rag.service.js`)
After a guide is generated, it is "read" into the long-term memory.
*   **Embedding**: The Guide's steps are concatenated and sent to `text-embedding-004`.
*   **Store**: Vectors are pushed to `knowledge_base.json` (Local Vector Store).
*   **Retrieval**: When a user queries `/api/rag/ask`, the backend performs a **Cosine Similarity Search** to find relevant guides.

## API Endpoints

### `/api/recordings`
*   `POST /upload`: The "Big Bang". Triggers the entire pipeline.
*   `GET /:id`: Retrieves the final Guide JSON.
*   `PUT /:id`: (Optional) Allows manual user edits to the Guide steps.

### `/api/rag`
*   `POST /ask`: Semantic search endpoint.
    *   Body: `{ "query": "How do I..." }`
    *   Returns: `{ "answer": "...", "sources": [...] }`

## Error Handling
*   **Retry Logic**: The Gemini service implements exponential backoff (2^n) handling for `503 Service Unavailable` errors.
*   **Fallback**: If strict grounding fails, the system can fallback to Transcript-only generation (though this is deprecated in favor of erroring out to preserve accuracy).
