# System Diagrams (UML)
This document contains the visual blueprints for the system.  

---

## 1. High-Level System Architecture
```mermaid
graph TD
    User[User]
    ChromeExtension[Chrome Extension]
    FrontendApp[React Frontend Dashboard]
    BackendServer[Node Express Backend]
    RecordingController[Recording Controller]
    AIOrchestrator[AI Orchestrator Service]
    FileStorage[Video and Guide Storage]
    DeepgramSTT[Deepgram Speech To Text]
    DeepgramTTS[Deepgram Text To Speech]
    GeminiLLM[Google Gemini LLM]
    
    User --> ChromeExtension
    User --> FrontendApp
    ChromeExtension --> BackendServer
    FrontendApp --> BackendServer
    BackendServer --> RecordingController
    RecordingController --> FileStorage
    RecordingController --> AIOrchestrator
    AIOrchestrator --> DeepgramSTT
    AIOrchestrator --> GeminiLLM
    AIOrchestrator --> DeepgramTTS
    AIOrchestrator --> BackendServer
```

---

## 2. Low-Level Interactions (Sequence Diagram)
The complete lifecycle of a single recording request.
```mermaid
sequenceDiagram
    participant U as User
    participant C as ContentScript (Ext)
    participant B as Background (Ext)
    participant S as Server (Backend)
    participant AI as AI Service
    
    Note over U,B: Recording Phase
    U->>B: Click "Start Recording"
    B->>C: Initialize Event Listeners
    
    loop User Actions
        U->>U: Clicks / Scrolls / Talks
        C->>C: Log Event {type, x, y, timestamp}
        B->>B: Record Video Chunks (WebM)
    end
    
    U->>B: Click "Stop Recording"
    C->>B: Send Event Log
    B->>B: Compile Blob (Video + Audio)
    
    Note over B,S: Upload Phase
    B->>S: POST /upload (formData)
    S->>S: Save video.webm to disk
    S-->>B: 200 OK { id: "123", status: "processing" }
    
    B->>U: Open localhost:3000/recording/123
    
    Note over S,AI: Processing Phase (Async)
    S->>AI: Transcribe(audioBuffer)
    AI-->>S: "User clicked the button..."
    
    S->>AI: GenerateGuide(events, transcript)
    AI-->>S: { steps: [{ title: "Click Btn", time: 1000 }] }
    
    Note over U,S: Consumption Phase
    U->>S: GET /recording/123
    S-->>U: Return Final JSON Guide
```

---

