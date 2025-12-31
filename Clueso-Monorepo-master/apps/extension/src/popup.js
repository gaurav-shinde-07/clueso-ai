document.addEventListener('DOMContentLoaded', async () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusText = document.getElementById('statusText');
    const statusLine = document.getElementById('statusLine');

    // Helper: Get active tab
    async function getActiveTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    }

    // Helper: Send message to content script
    function sendMessage(tabId, msg) {
        return new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, msg, (response) => {
                if (chrome.runtime.lastError) {
                    // Content script might not be loaded or error
                    console.log('Error:', chrome.runtime.lastError.message);
                    resolve(null);
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Helper: Update UI based on state
    function updateUI(isRecording) {
        if (isRecording) {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            statusText.innerText = 'Recording...';
            statusLine.classList.add('recording');
        } else {
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            statusText.innerText = 'Ready to record';
            statusLine.classList.remove('recording');
        }
    }

    // 1. Check current status on load
    const tab = await getActiveTab();
    if (tab && tab.url && !tab.url.startsWith('chrome://')) {
        const response = await sendMessage(tab.id, { action: 'CHECK_STATUS' });
        if (response) {
            updateUI(response.isRecording);
        } else {
            statusText.innerText = 'Refresh page to enable.';
            startBtn.disabled = true;
        }
    } else {
        statusText.innerText = 'Cannot record this page.';
        startBtn.disabled = true;
    }

    // 2. Handle Start
    startBtn.addEventListener('click', async () => {
        const tab = await getActiveTab();
        if (!tab) return;

        statusText.innerText = 'Initializing...';

        const res = await sendMessage(tab.id, { action: 'START_RECORDING' });

        if (res && res.success) {
            updateUI(true);
            window.close(); // Close popup to let user interact with stream picker
        } else {
            statusText.innerText = 'Failed. Refresh page.';
            if (res && res.error) alert('Error: ' + res.error);
        }
    });

    // 3. Handle Stop
    stopBtn.addEventListener('click', async () => {
        const tab = await getActiveTab();
        if (!tab) return;

        const res = await sendMessage(tab.id, { action: 'STOP_RECORDING' });
        if (res && res.success) {
            updateUI(false);
            window.close();
        }
    });
});
