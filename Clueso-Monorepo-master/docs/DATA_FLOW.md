# Data Flow: The "Grounded Generation" Pipeline

This document explains the lifecycle of a piece of knowledge in Clueso, from a user's physical click to a searchable answer in the Knowledge Base.

---

## 1. The Core Pipeline (Capture -> Synthesize)

The flow is unidirectional and deterministic.

```mermaid
sequenceDiagram
    participant U as User
    participant DOM as Browser DOM
    participant Ext as Extension
    participant BE as Backend API
    participant GEM as Gemini 2.5
    participant DB as Vector Store

    rect rgb(240, 248, 255)
    note over U, Ext: Phase 1: Capture
    U->>DOM: Clicks Button
    DOM->>Ext: Log Event { time: 500ms, target: '#submit' }
    DOM->>Ext: Stream Video Frames
    U->>Ext: "I am clicking submit" (Voice)
    end

    rect rgb(255, 248, 240)
    note over Ext, BE: Phase 2: Ingestion
    Ext->>BE: Upload Multipart (Video + Audio + Events)
    BE->>BE: Transcode Audio -> Text (Deepgram)
    end

    rect rgb(240, 255, 240)
    note over BE, GEM: Phase 3: Grounded Synthesis
    BE->>GEM: Prompt: "Here is the Event Log (Truth) + Transcript (Context)"
    GEM->>GEM: Map Events to Steps
    GEM-->>BE: Return JSON Guide
    end

    rect rgb(255, 240, 255)
    note over BE, DB: Phase 4: Indexing (RAG)
    BE->>DB: Embed Guide (Text-to-Vector)
    DB->>DB: Save to Knowledge Base
    end
```

---

## 2. Data Structures

### A. The Input: `EventLog`
A raw list of meaningful DOM interactions.
```json
[
  {
    "timestamp": 1050,
    "type": "input",
    "target": { "selector": "#search-bar", "tagName": "INPUT" },
    "value": "How to deploy"
  },
  {
    "timestamp": 2100,
    "type": "keydown",
    "key": "Enter"
  }
]
```

### B. The Output: `GuideJSON`
The synthesized instruction set.
```json
{
  "title": "How to deploy a project",
  "videoMeta": { "duration": 15.5 },
  "steps": [
    {
      "stepIndex": 1,
      "instruction": "Type 'How to deploy' into the search bar.",
      "timestamp": { "startMs": 1000, "endMs": 2100 },
      "eventType": "input",
      "element": { "selector": "#search-bar" }
    },
    {
      "stepIndex": 2,
      "instruction": "Press Enter to submit the search.",
      "timestamp": { "startMs": 2100, "endMs": 2500 },
      "eventType": "keydown"
    }
  ]
}
```

---

## 3. The "Grounding" Logic
**Why this matters**:
The Backend does *not* blindly trust the transcript.
1.  **Alignment**: It looks for an Event timestamp (`1050ms`) closely matching a Transcript phrase "I'll type this in" (`900ms-1200ms`).
2.  **Validation**: If the user says "Click delete" but the Event Log shows `Click #cancel`, the Event Log wins (it avoids the destructive hallucination).
3.  **Precision**: Timestamps in the Guide output come directly from the Event Log, ensuring the video player loops perfectly around the action.
