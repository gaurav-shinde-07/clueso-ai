# Frontend Documentation (Layer: The Presentation)

## Overview
The Frontend is a **React (Vite)** application tailored for high-fidelity playback. It is more than a video player; it is an **Interactive Documentation Reader**.

## Key Responsibilities
1.  **Sync Engine**: Maintains frame-perfect synchronization between `video.currentTime` and the `Active Step` in the sidebar.
2.  **Navigation**: Allows users to click a text step ("Click Submit") and immediately seek the video to that exact moment (`24.5s`).
3.  **Search Interface**: Provides the UI for the RAG Knowledge Base.

## Core Logic: The "Sync Engine"
The sync engine connects the fluid video stream with the discrete step blocks.

### The Algorithm
The backend provides steps with `timestamp: { startMs, endMs }`.
The video player provides `currentTime` in **Seconds**.

We bridge this using a `useEffect` hook or `onTimeUpdate` handler:

```typescript
// Conceptual Implementation in RecordingDetail.tsx
const handleTimeUpdate = (currentTimeSeconds: number) => {
  const currentTimeMs = currentTimeSeconds * 1000;

  const currentStep = guide.steps.find(step => 
    currentTimeMs >= step.timestamp.startMs && 
    currentTimeMs < step.timestamp.endMs
  );

  if (currentStep && currentStep.id !== activeStepId) {
    setActiveStep(currentStep.id);
    scrollSidebarToStep(currentStep.id);
  }
};
```

## Component Architecture

### `RecordingDetail.tsx` (The Controller)
*   **State**: `videoUrl`, `guideData`, `activeStepIndex`.
*   **Effect**: Fetches data from `/api/recordings/:id` on mount.
*   **Render**: Splits screen into `<VideoPlayer />` (Left) and `<StepList />` (Right).

### `VideoPlayer.tsx`
*   **Ref**: Holds the direct reference to the `<video>` HTML element.
*   **Events**: Emits `onTimeUpdate` to the parent.

### `StepList.tsx`
*   **Props**: `steps[]`, `activeStepIndex`.
*   **Behavior**: When `activeStepIndex` changes, it uses `scrollIntoView` to keep the context visible.

## Data Integration
The frontend is agnostic to *how* the guide was generated (Transcript vs Event). It simply consumes the JSON contract defined in `DATA_FLOW.md`.

*   **Endpoint**: `GET /api/recordings/:id`
*   **Contract**: Expects `steps` array with millisecond-precision timestamps.
