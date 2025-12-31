
// --- DATA MODELS ---

export type RecordingStatus = 'uploading' | 'processing' | 'completed' | 'failed';
export type AudioProcessingStatus = 'idle' | 'extracting' | 'transcribing' | 'cleaning' | 'synthesizing' | 'merging' | 'completed' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EventTargetDetail {
  tag: string;
  id: string | null;
  classes: string[];
  text: string;
  selector: string;
  bbox: BoundingBox;
  attributes: Record<string, string>;
}

export interface UserEvent {
  timestamp: number;
  type: 'click' | 'scroll' | 'input' | 'navigation';
  target: EventTargetDetail | string;
  x?: number;
  y?: number;
  windowWidth?: number;
  windowHeight?: number;
  inputValue?: string;
  url?: string;
  metadata?: {
    url: string;
    viewport: {
      width: number;
      height: number;
    }
  };
}

// --- NEW STRICT SCHEMA ---

export interface ZoomConfig {
  zoomInMs: number;
  zoomOutMs: number;
  focusCenter: {
    x: number;
    y: number;
  };
  scale: number;
}

export interface StepAudio {
  chunkId: string;
  rawTranscript: string;
  narrationText: string;
  audioUrl?: string; // Local blob URL for the generated TTS
}

export interface GeneratedStep {
  stepIndex: number;
  eventType: 'click' | 'navigation' | 'input' | 'scroll' | 'other';
  title: string;
  instruction: string; // The imperative instruction
  timestamp: {
    startMs: number;
    endMs: number;
  };
  audio: StepAudio;
  element?: {
    tag: string;
    text: string;
    selector: string;
  };
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  zoom?: ZoomConfig | null;
  screenshotUrl?: string; // Kept for UI compatibility
}

export interface GeneratedGuide {
  videoMeta: {
    durationMs: number;
    resolution: {
      width: number;
      height: number;
    };
    frameRate: number;
  };
  steps: GeneratedStep[];
  timelineIndex: {
    stepIndex: number;
    jumpToMs: number;
    label: string;
  }[];
  processedAt: string;
}

export interface Recording {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  status: RecordingStatus;
  createdAt: string;
  
  // Metadata
  startTime?: number;
  endTime?: number;
  url?: string;
  viewport?: {
    width: number;
    height: number;
  };
  
  events: UserEvent[]; 
  
  // The Main Data Object
  generatedGuide?: GeneratedGuide; 
  
  // Audio Pipeline Fields
  audioStatus: AudioProcessingStatus;
  audioUrl?: string; 
  originalTranscript?: string;
  cleanedTranscript?: string; // Deprecated in favor of step-based audio
  enhancedAudioUrl?: string; 
  selectedVoiceId?: string;

  playbackRange?: {
    start: number;
    end: number;
  };
}

export interface UploadResponse {
  success: boolean;
  recordingId?: string;
  error?: string;
}
