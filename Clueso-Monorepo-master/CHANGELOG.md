# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [0.1.4] - 2025-12-20
### Improved
- **AI Instruction Generation**: 
    - Transformed the instruction generation engine to be **Event-Grounded**.
    - The AI now retrieves relevant steps, timestamps, and UI events from the recording data instead of relying purely on transcripts.
    - significantly reduced hallucinations and improved step accuracy.
    - **New Capability**: Enables the future generation of precise **Workflow Diagrams** (Flowcharts) by treating user actions as deterministic graph nodes.
    - [Read full explanation in Feature Log](docs/FEATURESLOG.md#2025-12-20-grounded-instruction-generation-v014)

## [0.1.3] - 2025-12-18
### Added
- **Feature**: **RAG (Retrieval-Augmented Generation) Knowledge Base**
    - Implemented a backend `RagService` to vectorize and store generated guides.
    - Added automatic "Ingestion" step to the video processing pipeline. Every new guide is now indexed for future search.
    - Added `/api/rag/ask` endpoint allowing users to ask natural language questions about their existing guides.
    - **Tech Stack**: Uses **Gemini Text-Embedding-004** for vectors and **Gemini 2.5 Flash** for answer generation.

## [0.1.2] - 2025-12-17
### Added
- **Feat**: Enhanced Video Player
    - Added professional timeline track with visual "Clips" for each step.
    - Implemented fine-grained Volume Control slider.
    - Added hover previews for steps on the timeline.
    - Polished UI with smooth gradients and better interactivity.

### Fixed
- **Application Crash**: Fixed `RangeError: Invalid time value` in video player by adding finite number checks before date formatting. See [BUG_FIXES_LOG.md#4-invalid-time-value-crash](docs/BUG_FIXES_LOG.md).

### Changed
- **UX/UI**: 
    - **Zoom Removal**: Removed the automatic "Zoom In/Out" visual effect from the video player to eliminate disruptive flickering and improve focus.
    - **Video Synchronization**: Implemented intelligent "Audio-Wait" logic. The video player now automatically asserts a pause at the end of a step if the AI narration is still active, ensuring the user hears the full explanation before the visual context changes.
- **Added**:
    - **AI Engineering**: 
        - Updated the **Gemini System Prompt** to enforce the generation of a dedicated "Introductory Step" (Step 1).
        - The AI now deduces the user's high-level goal and explicitly instructs them to navigate to the starting URL at the beginning of the guide.
    - **Mock Fallback**:
        - Updated the `MockService` to mirror the AI's behavior by prepending a standardized "Introduction" step to generated guides when the AI is unavailable.

## [0.1.1] - 2025-12-17
### Fixed

- **Critical AI Failure**: Resolved `404 Not Found` from Gemini API by upgrading model to `gemini-2.5-flash`. See [BUG_FIXES_LOG.md#1-gemini-model-access-error-404-not-found](docs/BUG_FIXES_LOG.md).
- **Port Stability**: Fixed random port binding issues by enforcing strict ports (`3000` for FE, `3001` for BE). See [BUG_FIXES_LOG.md#2-application-port-conflicts](docs/BUG_FIXES_LOG.md).

### Infrastructure
- **Documentation**: 
    - Added `docs/BUG_FIXES_LOG.md` to track error details and solutions.
    - Updated `docs/SYSTEM_DIAGRAMS.md` with new Class/Entity diagrams and refined Architecture charts.
- **Cleanup**: Removed sensitive/temporary debug files (`debug_gemini.js`, `alllogs.log`).

## [0.1.0] - 2025-12-16
### Added
- **Security**:
    - Hardened `.gitignore` to recursively exclude **all** environment files (`.env`, `.env.local`, `.env.production`) from every subdirectory (`apps/*/`).
    - Removed sensitive artifact files (`metadata.json`, `found_models.json`) and temporary debug scripts (`debug_keys.js`, `test_tts.js`) to prevent key leakage.

### Architecture & Codebase Cleanup
- **Organization**:
    - Removed empty directory clutter (`src/utils`, `src/components/ui`) to maintain a clean workspace.
    - Deleted redundant reference files (`ARCHITECTURE_REFERENCE.md`) in favor of the new canonical documentation.
- **Backend Service**:
    - Implemented `ProductAI` singleton in `src/services/ai.service.js`.
    - Integrated **Deepgram Nova-2** for high-speed Speech-to-Text.
    - Integrated **Deepgram Aura** for conversational Text-to-Speech generation.
    - Integrated **Google Gemini Flash 1.5** for intelligent "Event + Transcript" fusion to generate structured JSON guides.
- **Extension**:
    - Implemented a Chrome MVP extension capable of recording screen `.webm` blobs.
    - Implemented `content.js` to capture DOM `click` events with coordinates (x,y) and timestamps.
    - Built the `Multipart/Form-Data` upload strategy to send massive video files to the backend.

---
## [0.1.0] - 2025-12-16

### Initialized
- Project generated with TurboRepo structure.
- **Frontend**: Vite + React + Lucide Icons.
- **Backend**: Express + Multer (Uploads) + CORS.
- **Extension**: Manifest V3 + Scripting API.
