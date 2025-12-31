import React, { useRef, useEffect, useState } from 'react';
import { Loader2, Layout, FileText } from 'lucide-react';
import { Recording } from '../../types';
import { NodeLayer } from '../../services/processing.service';
import { useRecordingSync } from './hooks/useRecordingSync';
import { RecordingVideoPlayer } from './components/RecordingVideoPlayer';
import { RecordingGuide } from './components/RecordingGuide';
import { RecordingTranscript } from './components/RecordingTranscript';

interface RecordingDetailProps {
    id: string;
    onBack: () => void;
}

export function RecordingDetail({ id, onBack }: RecordingDetailProps) {
    const [rec, setRec] = useState<Recording | null>(null);
    const [activeTab, setActiveTab] = useState<'guide' | 'transcript'>('guide');
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1.0);
    const [audioMode, setAudioMode] = useState<'ai' | 'original'>('ai');

    const videoRef = useRef<HTMLVideoElement>(null);

    // Custom hook handles audio/video sync logic
    useRecordingSync({
        rec,
        videoRef,
        audioMode,
        isPlaying,
        volume,
        setIsPlaying
    });

    useEffect(() => {
        NodeLayer.getRecordingById(id).then(setRec);
        return NodeLayer.subscribe((all) => {
            const found = all.find(r => r.id === id);
            if (found) setRec(found);
        });
    }, [id]);

    const seekTo = (ms: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = ms / 1000;
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    if (!rec) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>;

    return (
        <div className="animate-in fade-in duration-500">
            <button onClick={onBack} className="mb-6 text-sm text-gray-500 hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors">
                ← Back to Library
            </button>

            <div className="flex flex-col gap-10">
                <RecordingVideoPlayer
                    rec={rec}
                    videoRef={videoRef}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    volume={volume}
                    setVolume={setVolume}
                    audioMode={audioMode}
                    setAudioMode={setAudioMode}
                    seekTo={seekTo}
                />

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="border-b border-gray-100 bg-gray-50/50 flex px-2 pt-2">
                        <button
                            onClick={() => setActiveTab('guide')}
                            className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'guide' ? 'bg-white text-indigo-600 border border-gray-100 border-b-white shadow-[0_-1px_2px_rgba(0,0,0,0.02)] -mb-px relative z-10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                            <Layout className="w-4 h-4" /> Step-by-Step Guide
                        </button>
                        <button
                            onClick={() => setActiveTab('transcript')}
                            className={`px-6 py-3 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'transcript' ? 'bg-white text-indigo-600 border border-gray-100 border-b-white shadow-[0_-1px_2px_rgba(0,0,0,0.02)] -mb-px relative z-10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                            <FileText className="w-4 h-4" /> Transcript
                        </button>
                    </div>

                    <div className="p-8 min-h-[500px]">
                        {activeTab === 'guide' ? (
                            <RecordingGuide guide={rec.generatedGuide} seekTo={seekTo} />
                        ) : (
                            <RecordingTranscript rec={rec} seekTo={seekTo} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
