import React from 'react';
import { Play, Pause, Volume2, VolumeX, Sparkles, Mic } from 'lucide-react';
import { Recording } from '../../../types';

interface RecordingVideoPlayerProps {
    rec: Recording;
    videoRef: React.RefObject<HTMLVideoElement>;
    isPlaying: boolean;
    setIsPlaying: (isPlaying: boolean) => void;
    volume: number;
    setVolume: (vol: number) => void;
    audioMode: 'ai' | 'original';
    setAudioMode: (mode: 'ai' | 'original') => void;
    seekTo: (ms: number) => void;
}

export function RecordingVideoPlayer({
    rec,
    videoRef,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    audioMode,
    setAudioMode,
    seekTo
}: RecordingVideoPlayerProps) {
    const guide = rec.generatedGuide;

    const handleAudioModeToggle = (mode: 'ai' | 'original') => {
        setAudioMode(mode);
        if (mode === 'original') {
            if (videoRef.current) videoRef.current.muted = false;
        } else {
            if (videoRef.current) videoRef.current.muted = true;
        }
    };

    return (
        <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 relative group">
            <div className="aspect-video relative mx-auto max-w-5xl bg-black">
                <video
                    ref={videoRef}
                    src={rec.videoUrl}
                    className="w-full h-full object-contain"
                    controls={false}
                    muted={audioMode === 'ai'}
                    onClick={() => {
                        if (videoRef.current?.paused) { videoRef.current.play(); setIsPlaying(true); }
                        else { videoRef.current?.pause(); setIsPlaying(false); }
                    }}
                />

                <div className="absolute top-6 right-6 flex items-center bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10 z-20">
                    <button
                        onClick={() => handleAudioModeToggle('ai')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${audioMode === 'ai' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/70 hover:text-white'}`}
                    >
                        <Sparkles className="w-3 h-3" /> AI Voice
                    </button>
                    <button
                        onClick={() => handleAudioModeToggle('original')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all ${audioMode === 'original' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:text-white'}`}
                    >
                        <Mic className="w-3 h-3" /> Original
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-20 flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">

                    {/* TIMELINE TRACK */}
                    <div className="relative w-full h-8 group/timeline cursor-pointer flex items-center"
                        onClick={(e) => {
                            if (!videoRef.current) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const p = x / rect.width;
                            seekTo(p * videoRef.current.duration * 1000);
                        }}
                    >
                        {/* Track Background */}
                        <div className="absolute left-0 right-0 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm group-hover/timeline:h-2.5 transition-all">
                            {/* Progress Bar */}
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-0 relative"
                                style={{ width: videoRef.current ? `${(videoRef.current.currentTime / videoRef.current.duration) * 100}%` : '0%' }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/timeline:opacity-100 transition-opacity"></div>
                            </div>
                        </div>

                        {/* Clips / Steps Markers */}
                        {guide?.steps.map((step) => {
                            const duration = rec.duration * 1000;
                            const startP = (step.timestamp.startMs / duration) * 100;
                            const widthP = ((step.timestamp.endMs - step.timestamp.startMs) / duration) * 100;

                            return (
                                <div
                                    key={step.stepIndex}
                                    className="absolute top-1/2 -translate-y-1/2 h-1.5 hover:h-5 hover:z-30 group-hover/timeline:h-2.5 transition-all bg-white/30 hover:bg-indigo-500 border-l border-white/20 first:border-0 cursor-pointer shadow-sm"
                                    style={{ left: `${startP}%`, width: `${widthP}%` }}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent parent timeline click
                                        seekTo(step.timestamp.startMs);
                                    }}
                                >
                                    {/* Tooltip on Hover */}
                                    <div className="opacity-0 hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 text-white text-[10px] px-2 py-1 rounded shadow-xl pointer-events-none z-50 transition-opacity delay-75">
                                        Step {step.stepIndex}: {step.instruction.slice(0, 30)}{step.instruction.length > 30 ? '...' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* CONTROLS ROW */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => {
                                    if (videoRef.current?.paused) { videoRef.current.play(); setIsPlaying(true); }
                                    else { videoRef.current?.pause(); setIsPlaying(false); }
                                }}
                                className="text-white hover:text-indigo-400 transition-colors transform hover:scale-110 active:scale-95"
                            >
                                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                            </button>

                            {/* Volume Control */}
                            <div className="flex items-center gap-2 group/volume">
                                <button
                                    onClick={() => {
                                        const newMuted = videoRef.current ? !videoRef.current.muted : false;
                                        if (videoRef.current) videoRef.current.muted = newMuted;
                                        if (!newMuted && volume === 0) setVolume(0.5);
                                    }}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    {volume === 0 || (videoRef.current?.muted) ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                                <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 flex items-center">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Time Display */}
                            <div className="text-white/60 text-sm font-mono tracking-wider">
                                {videoRef.current && Number.isFinite(videoRef.current.currentTime) ? new Date(videoRef.current.currentTime * 1000).toISOString().substr(14, 5) : "00:00"}
                                <span className="opacity-50 mx-1">/</span>
                                {videoRef.current && Number.isFinite(videoRef.current.duration) ? new Date(videoRef.current.duration * 1000).toISOString().substr(14, 5) : "00:00"}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-white/80 text-sm font-medium">
                            <div className={`px-3 py-1 rounded-full text-xs border ${audioMode === 'ai' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' : 'bg-white/10 border-white/20'}`}>
                                {audioMode === 'ai' ? 'AI Voice Active' : 'Original Audio'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
