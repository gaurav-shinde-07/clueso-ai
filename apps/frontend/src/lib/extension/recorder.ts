
import { UserEvent, EventTargetDetail } from '../../types';

/**
 * REPO 2: Clueso_extension
 * This class simulates the Background Script and Content Script of the browser extension.
 * It manages the MediaRecorder API and DOM Event Listeners.
 */
export class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private events: UserEvent[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private clickListener: ((e: MouseEvent) => void) | null = null;
  private startUrl: string = '';

  // Navigation tracking
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;
  private popStateListener: ((e: PopStateEvent) => void) | null = null;
  private hashChangeListener: (() => void) | null = null;

  /**
   * Request screen access and start recording.
   */
  async start(): Promise<void> {
    try {
      this.startUrl = window.location.href;
      console.log('[Recorder] Requesting Display Media...');
      
      // 1. Get Screen Stream (Video Only first)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
        },
        audio: false // Requesting audio here often fails if mic is also needed
      });

      // 2. Get Microphone Stream (Audio) separately
      let audioStream: MediaStream | null = null;
      try {
        console.log('[Recorder] Requesting Microphone...');
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      } catch (err) {
        console.warn('[Recorder] Microphone access denied or failed. Proceeding with video only.', err);
      }

      // 3. Combine Tracks
      const tracks = [
        ...screenStream.getVideoTracks(),
        ...(audioStream ? audioStream.getAudioTracks() : [])
      ];
      this.stream = new MediaStream(tracks);

      // 4. Initialize MediaRecorder
      this.chunks = [];
      this.events = [];
      
      // Determine best supported MIME type
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm',
        'video/mp4'
      ];

      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      if (!selectedMimeType) selectedMimeType = 'video/webm';
      
      console.log(`[Recorder] Starting MediaRecorder with mimeType: ${selectedMimeType}`);
      this.mediaRecorder = new MediaRecorder(this.stream, { 
          mimeType: selectedMimeType,
          audioBitsPerSecond: 128000
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.onerror = (e) => {
        console.error('[Recorder] MediaRecorder Error:', e);
      };

      // Handle "Stop Sharing" from the browser native UI
      screenStream.getVideoTracks()[0].onended = () => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.stop();
        }
      };

      this.mediaRecorder.start(1000); // Collect 1s chunks
      this.startTime = Date.now();

      // 5. Inject Content Script (Event Listeners)
      this.attachEventListeners();
      console.log('[Recorder] Recording started successfully');

    } catch (err) {
      console.error('[Recorder] Error starting screen recorder:', err);
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
      }
      throw new Error('Failed to start recording. Please allow screen access.');
    }
  }

  /**
   * Stop recording and return the data bundle including Session Metadata.
   */
  async stop(): Promise<{ 
      blob: Blob; 
      events: UserEvent[]; 
      duration: number; 
      startTime: number;
      endTime: number;
      url: string;
      viewport: { width: number; height: number; }
  }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve({ 
            blob: new Blob([]), 
            events: [], 
            duration: 0,
            startTime: Date.now(),
            endTime: Date.now(),
            url: window.location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight }
        });
        return;
      }

      this.mediaRecorder.onstop = () => {
        console.log('[Recorder] Recorder stopped. Processing blob...');
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'video/webm' });
        const endTime = Date.now();
        const duration = (endTime - this.startTime) / 1000;
        
        // Cleanup
        this.cleanup();
        
        resolve({ 
            blob, 
            events: this.events, 
            duration,
            startTime: this.startTime,
            endTime,
            url: this.startUrl,
            viewport: { width: window.innerWidth, height: window.innerHeight }
        });
      };

      this.mediaRecorder.stop();
      this.stream?.getTracks().forEach(track => track.stop());
    });
  }

  /**
   * Extracts detailed element information.
   */
  private getTargetDetails(element: HTMLElement): EventTargetDetail {
      const rect = element.getBoundingClientRect();
      
      // Calculate CSS Selector
      let selector = element.tagName.toLowerCase();
      if (element.id) selector += `#${element.id}`;
      if (element.className && typeof element.className === 'string') {
          selector += `.${element.className.split(' ').join('.')}`;
      }

      const attributes: Record<string, string> = {};
      Array.from(element.attributes).forEach(attr => {
          attributes[attr.name] = attr.value;
      });

      return {
          tag: element.tagName,
          id: element.id || null,
          classes: element.className && typeof element.className === 'string' ? element.className.split(' ') : [],
          text: element.innerText?.slice(0, 50) || '',
          selector: selector,
          bbox: {
              x: rect.x + window.scrollX,
              y: rect.y + window.scrollY,
              width: rect.width,
              height: rect.height
          },
          attributes: attributes
      };
  }

  private attachEventListeners() {
    this.clickListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target.closest('.clueso-extension-widget')) return;

      const targetDetail = this.getTargetDetails(target);

      const eventData: UserEvent = {
        timestamp: (Date.now() - this.startTime), // ms
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        target: targetDetail, // Rich object
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        metadata: {
            url: window.location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight }
        }
      };
      
      console.log('[Recorder] Event Captured:', eventData);
      this.events.push(eventData);
    };

    window.addEventListener('click', this.clickListener, true);
    this.monitorNavigation();
  }

  private monitorNavigation() {
    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);
    // (Simplified navigation monitoring for brevity, logic remains similar)
  }

  private cleanup() {
    if (this.clickListener) {
      window.removeEventListener('click', this.clickListener, true);
      this.clickListener = null;
    }
    // Cleanup other listeners...
    this.stream = null;
    this.mediaRecorder = null;
  }
}
