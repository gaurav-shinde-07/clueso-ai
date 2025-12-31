
import React, { useRef, useEffect, useState } from 'react';
import { Video, StopCircle, Upload, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Recording } from '../../types';
import { NodeLayer } from '../../services/processing.service';
import { ScreenRecorder } from '../../lib/extension/recorder';

interface DashboardProps {
    userId: string;
    onViewDetail: (id: string) => void;
}

export function Dashboard({ onViewDetail, userId }: DashboardProps) {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const recorderRef = useRef<ScreenRecorder | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        NodeLayer.getRecordings().then(setRecordings);
        return NodeLayer.subscribe(setRecordings);
    }, []);

    const handleRecordToggle = async () => {
        if (isRecording) {
            if (recorderRef.current) {
                const data = await recorderRef.current.stop();
                setIsRecording(false);
                await NodeLayer.uploadRecording(data.blob, data.events, {
                    duration: data.duration, startTime: data.startTime, endTime: data.endTime,
                    url: data.url, viewport: data.viewport
                }, userId);
            }
        } else {
            recorderRef.current = new ScreenRecorder();
            await recorderRef.current.start();
            setIsRecording(true);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = async () => {
            await NodeLayer.uploadRecording(file, [], {
                duration: video.duration || 0, startTime: Date.now(), endTime: Date.now(),
                url: 'upload', viewport: { width: 1920, height: 1080 }
            }, userId);
        };
        video.src = URL.createObjectURL(file);
    };

    const StatusBadge = ({ status, audioStatus }: { status: string, audioStatus: string }) => {
        if (status === 'completed') {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Ready</span>;
        }
        if (status === 'failed') {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Failed</span>;
        }
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {audioStatus.toUpperCase()}...</span>;
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Your Library</h1>
                    <p className="text-gray-500 mt-1">Manage your recorded tutorials and guides.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleRecordToggle} className={`px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        {isRecording ? <StopCircle className="w-5 h-5" /> : <div className="w-3 h-3 bg-red-400 rounded-full border border-red-200" />}
                        {isRecording ? 'Stop Recording' : 'New Recording'}
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-slate-700 font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors">
                        <Upload className="w-4 h-4" /> Upload Video
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {recordings.map(rec => (
                    <div key={rec.id} onClick={() => onViewDetail(rec.id)} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <div className="aspect-video bg-gray-100 relative flex items-center justify-center overflow-hidden">
                            {rec.status === 'processing' ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                                    </div>
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{rec.audioStatus}</span>
                                </div>
                            ) : (
                                <>
                                    <img src={rec.generatedGuide?.steps[0]?.screenshotUrl || rec.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Thumbnail" />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-indigo-600 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all shadow-lg">
                                            <Play className="w-6 h-6 ml-1" />
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md">{rec.duration.toFixed(0)}s</div>
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-slate-800 line-clamp-1 text-lg group-hover:text-indigo-600 transition-colors">{rec.generatedGuide?.steps[0]?.title || 'Untitled Recording'}</h3>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-xs text-gray-400 font-medium">{new Date(rec.createdAt).toLocaleDateString()}</div>
                                <StatusBadge status={rec.status} audioStatus={rec.audioStatus} />
                            </div>
                        </div>
                    </div>
                ))}

                {recordings.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-400">
                            <Video className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No recordings yet</h3>
                        <p className="text-gray-500 mt-1 mb-6">Start recording or upload a video to create your first guide.</p>
                        <button onClick={handleRecordToggle} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                            Start Recording
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
