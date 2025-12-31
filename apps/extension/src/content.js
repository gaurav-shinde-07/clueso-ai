
/**
 * Clueso Clone Content Script
 * This runs inside the web page you want to record.
 */

let mediaRecorder = null;
let chunks = [];
let events = [];
let startTime = 0;
let stream = null;
let isRecording = false;

// UI Elements


// --- 1. UI WIDGET LOGIC ---

// --- 1. MESSAGE LISTENER API (Controlled by Popup) ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'CHECK_STATUS') {
        sendResponse({ isRecording: isRecording, startTime: startTime });
    }
    else if (request.action === 'START_RECORDING') {
        startRecording().then(() => {
            sendResponse({ success: true });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true; // async response
    }
    else if (request.action === 'STOP_RECORDING') {
        stopRecording().then(() => {
            sendResponse({ success: true });
        });
        return true; // async response
    }
});


// --- 2. RECORDER LOGIC (From recorder.ts) ---

async function startRecording() {
    try {
        // A. Get Stream (Must happen after user interaction - click)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080 }
        });

        let audioStream = null;
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) { console.warn('Mic denied'); }

        const tracks = [...displayStream.getVideoTracks(), ...(audioStream ? audioStream.getAudioTracks() : [])];
        stream = new MediaStream(tracks);

        // B. Setup MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        mediaRecorder = new MediaRecorder(stream, { mimeType });

        chunks = [];
        events = [];
        startTime = Date.now();
        isRecording = true;

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        // Handle system "Stop sharing" button
        displayStream.getVideoTracks()[0].onended = () => {
            if (isRecording) stopRecording();
        };

        mediaRecorder.start(1000);

        // C. Start Event Listeners
        window.addEventListener('click', handleUserClick, true);
        window.addEventListener('input', handleInput, true);
        window.addEventListener('keydown', handleKeydown, true);

        console.log('Clueso Recorder Started');

    } catch (err) {
        console.error('Failed to start:', err);
        alert('Could not start recording: ' + err.message);
    }
}

async function stopRecording() {
    return new Promise((resolve) => {
        isRecording = false;

        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            window.removeEventListener('click', handleUserClick, true);
            window.removeEventListener('input', handleInput, true);
            window.removeEventListener('keydown', handleKeydown, true);
            stream.getTracks().forEach(t => t.stop());

            console.log('Recording finished. Events:', events.length);

            // D. SEND TO APP
            uploadToApp(blob, events);
            resolve();
        };

        mediaRecorder.stop();
    });
}

// --- 3. EVENT TRACKING (The "Spy" Logic) ---

function getTargetDetails(element) {
    const rect = element.getBoundingClientRect();
    let selector = element.tagName.toLowerCase();
    if (element.id) selector += `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
        selector += `.${element.className.split(' ').join('.')}`;
    }

    return {
        tag: element.tagName,
        text: element.innerText?.slice(0, 50) || '',
        selector: selector,
        bbox: {
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height
        }
    };
}


function handleUserClick(e) {
    if (!isRecording) return;
    const target = e.target;

    // Ignore clicks on Clueso UI if any (future proofing)

    const details = getTargetDetails(target);
    events.push({
        timestamp: Date.now() - startTime,
        type: 'click',
        target: details,
        x: e.clientX,
        y: e.clientY
    });
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Input Handler (Debounced to avoid flood)
const handleInput = debounce((e) => {
    if (!isRecording) return;
    const target = e.target;
    console.log('[Clueso Recorder] Input Captured:', target.value); // DEBUG

    events.push({
        timestamp: Date.now() - startTime,
        type: 'input',
        target: getTargetDetails(target),
        value: target.value ? target.value.slice(0, 100) : '' // Capture partial input for context
    });
}, 1000);

// Keydown (specifically for Enter)
function handleKeydown(e) {
    if (!isRecording) return;
    if (e.key === 'Enter') {
        console.log('[Clueso Recorder] Enter Key Captured'); // DEBUG
        events.push({
            timestamp: Date.now() - startTime,
            type: 'keydown_enter',
            target: getTargetDetails(e.target)
        });
    }
}

// --- 4. DATA BRIDGE TO LOCALHOST ---

function uploadToApp(blob, recordedEvents) {
    const APP_URL = 'http://localhost:3000'; // Assuming default Vite port

    // Convert Blob to Base64 to pass via postMessage (reliable for cross-origin if blob URL fails)
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
        const base64data = reader.result;

        // Open the app
        const win = window.open(APP_URL, '_blank');

        // Wait for it to be ready
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            // Send handshake
            win.postMessage({ type: 'CLUESO_EXTENSION_HANDSHAKE' }, '*');

            if (attempts > 50) { clearInterval(interval); alert('Could not connect to Clueso App'); }
        }, 500);

        // Listen for "READY" response from App
        const messageHandler = (event) => {
            if (event.data.type === 'CLUESO_APP_READY') {
                clearInterval(interval);
                console.log('App ready, sending data...');

                win.postMessage({
                    type: 'CLUESO_UPLOAD_DATA',
                    payload: {
                        videoBase64: base64data,
                        events: recordedEvents,
                        duration: (Date.now() - startTime) / 1000,
                        url: window.location.href,
                        viewport: { width: window.innerWidth, height: window.innerHeight }
                    }
                }, '*');

                window.removeEventListener('message', messageHandler);
            }
        };
        window.addEventListener('message', messageHandler);
    };
}

// --- LISTENER FOR POPUP ---

