
import React, { useState, useEffect } from 'react';
import { User } from './types';
import { NodeLayer } from './services/processing.service';
import { logger, LogLevel, LogSource } from './lib/logger';
import { Header } from './components/layout/Header';
import { Dashboard } from './features/dashboard/Dashboard';
import { RecordingDetail } from './features/recordings/RecordingDetail';

export default function App() {
    const [user] = useState<User>({
        id: 'demo-user-1', name: 'Demo User dash', email: 'user@clueso.clone',
        avatarUrl: 'https://ui-avatars.com/api/?name=Demo+User&background=random'
    });
    const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // --- EXTENSION LISTENER START ---
    useEffect(() => {
        const handleExtensionMessage = async (event: MessageEvent) => {
            // 1. Handshake
            if (event.data.type === 'CLUESO_EXTENSION_HANDSHAKE') {
                logger.log(LogLevel.DEBUG, LogSource.EXTENSION, 'Handshake received from extension');
                // Acknowledge presence to the extension
                if (event.source && 'postMessage' in event.source) {
                    (event.source as Window).postMessage({ type: 'CLUESO_APP_READY' }, '*');
                    logger.log(LogLevel.DEBUG, LogSource.APP, 'Sent CLUESO_APP_READY ack');
                }
            }

            // 2. Data Receipt
            if (event.data.type === 'CLUESO_UPLOAD_DATA') {
                const { videoBase64, events, duration, url, viewport } = event.data.payload;
                logger.log(LogLevel.INFO, LogSource.EXTENSION, `Received Recording Data`, { duration, eventCount: events.length, url });

                // Convert Base64 back to Blob
                const res = await fetch(videoBase64);
                const blob = await res.blob();

                await NodeLayer.uploadRecording(blob, events, {
                    duration: duration,
                    startTime: Date.now() - (duration * 1000),
                    endTime: Date.now(),
                    url: url,
                    viewport: viewport
                }, user.id);

                alert('Recording received from Extension! Processing now...');
            }
        };

        window.addEventListener('message', handleExtensionMessage);
        return () => window.removeEventListener('message', handleExtensionMessage);
    }, []);
    // --- EXTENSION LISTENER END ---

    return (
        <div className="min-h-screen bg-gray-50 text-slate-900 font-sans relative">
            <Header userEmail={user.email} onLogoClick={() => setView('dashboard')} />
            <main className="max-w-6xl mx-auto px-6 py-8 pb-32">
                {view === 'dashboard' ? (
                    <Dashboard userId={user.id} onViewDetail={(id) => { setSelectedId(id); setView('detail'); }} />
                ) : (
                    <RecordingDetail id={selectedId!} onBack={() => { setSelectedId(null); setView('dashboard'); }} />
                )}
            </main>
        </div>
    );
}
