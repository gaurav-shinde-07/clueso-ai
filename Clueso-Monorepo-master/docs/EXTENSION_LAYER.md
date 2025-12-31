# Extension Documentation (Layer: The Interceptor)

## Overview
The Chrome Extension is the "Eyes and Ears" of the Clueso system. It is responsible for **Data Capture**.
Unlike traditional recorders that just capture pixels, this extension **intercepts the execution flow** of the user's browser interactions.

## Core Components

### 1. `content.js` (The DOM Interceptor)
This script acts as a "Spy" injected into the target page. It builds the **Event Log** which serves as the **Source of Truth** for the AI.

*   **Role**: Discrete Event Capture.
*   **Listeners**:
    *   `click`: Captures unique selectors (ID, Class hierarchy) and X/Y coordinates.
    *   `input`: Captures text entry (debounced).
    *   `keydown` (Enter): Captures submission intent.
    *   `navigation`: Detects URL changes.
*   **Output**: An Array of Event Objects (e.g., `[{ time: 1050, type: 'click', target: '#login-btn' }]`).

### 2. `background.js` (The Media Orchestrator)
This script manages the binary data streams.

*   **Role**: Video/Audio Capture.
*   **API**: `chrome.tabCapture` / `getDisplayMedia`.
*   **Format**: `video/webm; codecs=vp9` (Variable Bitrate).
*   **Audio**: Captures both System Audio (Tab sound) and Mic Audio (User voice).

---

## Data Handshake (The "Upload" Protocol)

When recording stops, the Extension performs a complex "Handshake" to ensure zero data loss:

1.  **Stop Signal**: User clicks "Stop".
2.  **Aggregation**:
    *   `content.js` sends the `EventLog[]` to `background.js`.
    *   `background.js` finalizes the `VideoBlob`.
3.  **Transmission**:
    *   Constructs a `FormData` object containing: `video`, `audio` (optional), and `events` (JSON string).
    *   POSTs to `http://localhost:3001/api/recordings/upload`.
4.  **Handoff**:
    *   Upon 200 OK, the Extension opens the Dashboard URL (`localhost:3000/recording/{uuid}`).
    *   The Extension's job is done.

## Security & Performance
*   **Passivity**: The extension *never* sends data to external servers directly. All data goes to the local Backend instance.
*   **Memory**: Large video chunks are streamed or blobbed immediately to avoid crashing the browser tab during long sessions.
